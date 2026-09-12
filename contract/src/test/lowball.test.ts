import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { DropStatus } from "../managed/lowball/contract/index.js";
import { dropIdBytes, dropIdSlug } from "../drop-id.js";
import { emptyLowballPrivateState } from "../witnesses.js";
import { LowballSimulator, pureCircuits } from "./lowball-simulator.js";

setNetworkId("undeployed");

// Test fixtures — deterministic seeds so tests are reproducible.
const SALT = new Uint8Array(32).fill(0x11);
const SALT_B = new Uint8Array(32).fill(0x33);
const BIDDER_SECRET = new Uint8Array(32).fill(0x22);
const OTHER_SECRET = new Uint8Array(32).fill(0x44);
// Three distinct bidders for the accumulator tests — the L5 case.
const SECRET_1 = new Uint8Array(32).fill(0xa1);
const SECRET_2 = new Uint8Array(32).fill(0xa2);
const SECRET_3 = new Uint8Array(32).fill(0xa3);
const RESERVE = 100n;
const RESERVE_B = 500n;
const STOCK = 1n;
const CLOSE_TIME = 1_000_000n;

const A = dropIdBytes("drop-001");
const B = dropIdBytes("drop-002");

const withHouseSeed = (reserve = RESERVE, salt = SALT) => ({
  ...emptyLowballPrivateState(),
  reserve,
  salt,
});

const withBidder = (amount: bigint, secret = BIDDER_SECRET) => ({
  ...emptyLowballPrivateState(),
  bidAmount: amount,
  bidderSecret: secret,
});

/** Open drop A with the standard fixture reserve. */
const openA = (sim: LowballSimulator) =>
  sim.createDrop(A, pureCircuits.reserveHash(RESERVE, SALT), STOCK, CLOSE_TIME, "drop-001");

const openB = (sim: LowballSimulator) =>
  sim.createDrop(B, pureCircuits.reserveHash(RESERVE_B, SALT_B), 2n, CLOSE_TIME, "drop-002");

/** Open drop A with an explicit stock — the claim-order tests need headroom. */
const openAWithStock = (sim: LowballSimulator, stock: bigint) =>
  sim.createDrop(A, pureCircuits.reserveHash(RESERVE, SALT), stock, CLOSE_TIME, "drop-001");

/** Distinct bidder secrets, as many as a test needs. */
const secretN = (n: number) => new Uint8Array(32).fill(0xb0 + n);

describe("drop ids", () => {
  it("round-trips a slug through its 32-byte ledger key", () => {
    const key = dropIdBytes("drop-002");
    expect(key.length).toEqual(32);
    expect(dropIdSlug(key)).toEqual("drop-002");
  });

  it("rejects a slug too long for the key", () => {
    expect(() => dropIdBytes("x".repeat(33))).toThrow(/holds 32/);
  });
});

describe("LOWBALL contract — multi-drop", () => {
  it("initializes with no drops", () => {
    const sim = new LowballSimulator();
    const l = sim.getLedger();
    expect(l.dropCount).toEqual(0n);
    expect(l.dropStatus.isEmpty()).toBe(true);
  });

  it("createDrop stores the sealed commitment under its own id", () => {
    const commitment = pureCircuits.reserveHash(RESERVE, SALT);
    const sim = new LowballSimulator();
    const l = sim.createDrop(A, commitment, STOCK, CLOSE_TIME, "drop-001");

    expect(l.dropCount).toEqual(1n);
    expect(l.dropStatus.lookup(A)).toEqual(DropStatus.OPEN);
    expect(l.dropCommitment.lookup(A)).toEqual(commitment);
    expect(l.dropStock.lookup(A)).toEqual(STOCK);
    expect(l.dropCloseTime.lookup(A)).toEqual(CLOSE_TIME);
    expect(l.dropMetaRef.lookup(A)).toEqual("drop-001");
  });

  it("holds two independent drops in one deployment", () => {
    const sim = new LowballSimulator();
    openA(sim);
    const l = openB(sim);

    expect(l.dropCount).toEqual(2n);
    expect(l.dropStatus.lookup(A)).toEqual(DropStatus.OPEN);
    expect(l.dropStatus.lookup(B)).toEqual(DropStatus.OPEN);
    expect(l.dropStock.lookup(A)).toEqual(1n);
    expect(l.dropStock.lookup(B)).toEqual(2n);
    expect(l.dropMetaRef.lookup(A)).toEqual("drop-001");
    expect(l.dropMetaRef.lookup(B)).toEqual("drop-002");
    expect(l.dropCommitment.lookup(A)).not.toEqual(l.dropCommitment.lookup(B));
  });

  it("refuses to create the same drop id twice", () => {
    const sim = new LowballSimulator();
    openA(sim);
    expect(() => openA(sim)).toThrow(/drop already exists/);
    expect(sim.getLedger().dropCount).toEqual(1n);
  });

  it("refuses any circuit on an unknown drop id", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    expect(() => sim.placeBid(B)).toThrow(/no such drop/);
    expect(() => sim.revealReserve(B)).toThrow(/no such drop/);
    expect(() => sim.checkWin(B)).toThrow(/no such drop/);
  });

  it("counts bids per drop, not globally", () => {
    const sim = new LowballSimulator();
    openA(sim);
    openB(sim);

    sim.setPrivateState(withBidder(150n));
    sim.placeBid(A);
    sim.placeBid(A);
    sim.placeBid(B);

    // A nested Counter comes back as its ADT, not a bigint — hence .read().
    const l = sim.getLedger();
    expect(l.dropBidCount.lookup(A).read()).toEqual(2n);
    expect(l.dropBidCount.lookup(B).read()).toEqual(1n);
  });

  it("keeps each drop's bid set separate", () => {
    const sim = new LowballSimulator();
    openA(sim);
    openB(sim);

    sim.setPrivateState(withBidder(150n));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(600n));
    sim.placeBid(B);

    const l = sim.getLedger();
    expect(l.dropBids.lookup(A).member(pureCircuits.bidHash(150n, BIDDER_SECRET))).toBe(true);
    expect(l.dropBids.lookup(B).member(pureCircuits.bidHash(600n, BIDDER_SECRET))).toBe(true);
    // A bid on A is not a member of B's set, and vice versa.
    expect(l.dropBids.lookup(B).member(pureCircuits.bidHash(150n, BIDDER_SECRET))).toBe(false);
    expect(l.dropBids.lookup(A).member(pureCircuits.bidHash(600n, BIDDER_SECRET))).toBe(false);
  });

  it("revealReserve accepts the matching preimage and discloses that drop's reserve", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    openB(sim);

    const l = sim.revealReserve(A);

    expect(l.dropStatus.lookup(A)).toEqual(DropStatus.REVEALED);
    expect(l.dropRevealed.lookup(A)).toEqual(RESERVE);
    // B is untouched by A's reveal.
    expect(l.dropStatus.lookup(B)).toEqual(DropStatus.OPEN);
    expect(l.dropRevealed.member(B)).toBe(false);
  });

  it("revealReserve rejects a tampered preimage", () => {
    const sim = new LowballSimulator(withHouseSeed(1n, SALT));
    sim.createDrop(A, pureCircuits.reserveHash(RESERVE, SALT), STOCK, CLOSE_TIME, "drop-001");

    expect(() => sim.revealReserve(A)).toThrow(/reveal does not match commitment/);
    expect(sim.getLedger().dropStatus.lookup(A)).toEqual(DropStatus.OPEN);
    expect(sim.getLedger().dropRevealed.member(A)).toBe(false);
  });

  it("refuses a bid once that drop is revealed, while others stay open", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    openB(sim);
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(150n));
    expect(() => sim.placeBid(A)).toThrow(/drop not open/);
    expect(() => sim.placeBid(B)).not.toThrow();
  });

  it("checkWin marks only the drop that was won", () => {
    const winningBid = RESERVE + 50n;
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    openB(sim);

    sim.setPrivateState(withBidder(winningBid));
    sim.placeBid(A);

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(winningBid));
    sim.checkWin(A);

    const l = sim.getLedger();
    expect(l.dropWinners.lookup(A).size()).toEqual(1n);
    expect(l.dropWinners.lookup(A).member(pureCircuits.bidHash(winningBid, BIDDER_SECRET))).toBe(true);
    expect(l.dropWinners.lookup(B).isEmpty()).toBe(true);
  });

  it("checkWin refuses to mark a winner when the bid is under that drop's reserve", () => {
    const losingBid = RESERVE - 1n;
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);

    sim.setPrivateState(withBidder(losingBid));
    sim.placeBid(A);

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(losingBid));
    expect(() => sim.checkWin(A)).toThrow(/bid below reserve/);
    expect(sim.getLedger().dropWinners.lookup(A).isEmpty()).toBe(true);
  });

  it("refuses checkWin before that drop's reserve is revealed", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    sim.setPrivateState(withBidder(150n));
    sim.placeBid(A);

    expect(() => sim.checkWin(A)).toThrow(/reserve not yet revealed/);
  });

  it("a bid on one drop cannot be opened against another", () => {
    const sim = new LowballSimulator();
    openA(sim);
    openB(sim);

    // Our bidder bids only on A; somebody else bids on B.
    sim.setPrivateState(withBidder(600n));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(600n, OTHER_SECRET));
    sim.placeBid(B);

    // House reveals B, whose reserve our bidder's amount would have cleared.
    sim.setPrivateState(withHouseSeed(RESERVE_B, SALT_B));
    sim.revealReserve(B);

    // Opening against B must fail: the commitment recorded there is not theirs.
    sim.setPrivateState(withBidder(600n));
    expect(() => sim.checkWin(B)).toThrow(/bid preimage mismatch/);
  });

  it("refuses checkWin on a drop that has no bids", () => {
    // An empty bid set and a commitment that is not in it are the same
    // condition: membership cannot be proved. One message, not two.
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(150n));
    expect(() => sim.checkWin(A)).toThrow(/bid preimage mismatch/);
    expect(sim.getLedger().dropBids.lookup(A).isEmpty()).toBe(true);
  });

  it("lets three distinct bidders all pass checkWin on the same drop", () => {
    // The L5 case: 50 bidders on one drop, every one of whom must be able to
    // open their own envelope. Before the accumulator, only the last could.
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, 3n);

    const bids: readonly [Uint8Array, bigint][] = [
      [SECRET_1, RESERVE + 1n],
      [SECRET_2, RESERVE + 40n],
      [SECRET_3, RESERVE + 900n],
    ];

    for (const [secret, amount] of bids) {
      sim.setPrivateState(withBidder(amount, secret));
      sim.placeBid(A);
    }

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    for (const [secret, amount] of bids) {
      sim.setPrivateState(withBidder(amount, secret));
      sim.checkWin(A);
    }

    const l = sim.getLedger();
    expect(l.dropWinners.lookup(A).size()).toEqual(3n);
    for (const [secret, amount] of bids) {
      expect(l.dropWinners.lookup(A).member(pureCircuits.bidHash(amount, secret))).toBe(true);
    }
  });

  it("lets the FIRST bidder win after later bids land", () => {
    // The regression that motivated this: an earlier bid used to be overwritten.
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, 3n);

    sim.setPrivateState(withBidder(RESERVE + 5n, SECRET_1));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(RESERVE + 6n, SECRET_2));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(RESERVE + 7n, SECRET_3));
    sim.placeBid(A);

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    // The first bidder, two bids later, still opens their own envelope.
    sim.setPrivateState(withBidder(RESERVE + 5n, SECRET_1));
    expect(() => sim.checkWin(A)).not.toThrow();
    expect(
      sim.getLedger().dropWinners.lookup(A).member(pureCircuits.bidHash(RESERVE + 5n, SECRET_1)),
    ).toBe(true);
  });

  it("counts submissions and distinct commitments separately", () => {
    const sim = new LowballSimulator();
    openA(sim);

    sim.setPrivateState(withBidder(200n, SECRET_1));
    sim.placeBid(A);
    sim.placeBid(A); // identical amount + secret → same commitment
    sim.setPrivateState(withBidder(300n, SECRET_2));
    sim.placeBid(A);

    const l = sim.getLedger();
    expect(l.dropBidCount.lookup(A).read()).toEqual(3n); // submissions
    expect(l.dropBids.lookup(A).size()).toEqual(2n); // distinct commitments
  });

  it("refuses a second claim on an already-claimed win", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    sim.setPrivateState(withBidder(RESERVE + 10n, SECRET_1));
    sim.placeBid(A);
    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(RESERVE + 10n, SECRET_1));
    sim.checkWin(A);
    expect(() => sim.checkWin(A)).toThrow(/win already claimed/);
    // The winner count must not inflate — L5 evidence rests on it.
    expect(sim.getLedger().dropWinners.lookup(A).size()).toEqual(1n);
  });

  it("refuses a bidder who never bid on this drop", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    sim.setPrivateState(withBidder(RESERVE + 1n, SECRET_1));
    sim.placeBid(A);
    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    // SECRET_2 never placed a bid here.
    sim.setPrivateState(withBidder(RESERVE + 1n, SECRET_2));
    expect(() => sim.checkWin(A)).toThrow(/bid preimage mismatch/);
    expect(sim.getLedger().dropWinners.lookup(A).isEmpty()).toBe(true);
  });

  it("records only the clearing bidders when some are under the reserve", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, 3n);

    sim.setPrivateState(withBidder(RESERVE + 5n, SECRET_1));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(RESERVE - 5n, SECRET_2)); // loses
    sim.placeBid(A);
    sim.setPrivateState(withBidder(RESERVE, SECRET_3)); // exactly clears
    sim.placeBid(A);

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(RESERVE + 5n, SECRET_1));
    sim.checkWin(A);
    sim.setPrivateState(withBidder(RESERVE - 5n, SECRET_2));
    expect(() => sim.checkWin(A)).toThrow(/bid below reserve/);
    sim.setPrivateState(withBidder(RESERVE, SECRET_3));
    sim.checkWin(A);

    const l = sim.getLedger();
    expect(l.dropWinners.lookup(A).size()).toEqual(2n);
    expect(l.dropWinners.lookup(A).member(pureCircuits.bidHash(RESERVE - 5n, SECRET_2))).toBe(false);
  });

  it("caps winners at stock and sells out in claim order", () => {
    // Five clearing bidders, stock of three: the first three to CLAIM win.
    const STOCK_M = 3n;
    const N = 5;
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, STOCK_M);

    const bidders = Array.from({ length: N }, (_, i) => ({
      secret: secretN(i),
      amount: RESERVE + BigInt(i + 1),
    }));

    for (const b of bidders) {
      sim.setPrivateState(withBidder(b.amount, b.secret));
      sim.placeBid(A);
    }

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    // The first three claims succeed.
    for (const b of bidders.slice(0, 3)) {
      sim.setPrivateState(withBidder(b.amount, b.secret));
      expect(() => sim.checkWin(A)).not.toThrow();
    }

    // Bidder 4 cleared the reserve and still cannot win: the drop is sold out.
    sim.setPrivateState(withBidder(bidders[3].amount, bidders[3].secret));
    expect(() => sim.checkWin(A)).toThrow(/drop sold out/);
    sim.setPrivateState(withBidder(bidders[4].amount, bidders[4].secret));
    expect(() => sim.checkWin(A)).toThrow(/drop sold out/);

    const l = sim.getLedger();
    expect(l.dropWinners.lookup(A).size()).toEqual(STOCK_M);
    expect(l.dropBids.lookup(A).size()).toEqual(BigInt(N));
    // The losers of the race are not recorded as winners.
    for (const b of bidders.slice(3)) {
      expect(l.dropWinners.lookup(A).member(pureCircuits.bidHash(b.amount, b.secret))).toBe(false);
    }
  });

  it("sells out a stock-1 drop after its first claim", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, 1n);

    for (const i of [0, 1]) {
      sim.setPrivateState(withBidder(RESERVE + 10n, secretN(i)));
      sim.placeBid(A);
    }
    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(RESERVE + 10n, secretN(0)));
    sim.checkWin(A);
    sim.setPrivateState(withBidder(RESERVE + 10n, secretN(1)));
    expect(() => sim.checkWin(A)).toThrow(/drop sold out/);
    expect(sim.getLedger().dropWinners.lookup(A).size()).toEqual(1n);
  });

  it("still tells an under-reserve bidder they lost, not that it sold out", () => {
    // Order of asserts matters: a losing bidder learns they lost. Only a bidder
    // who actually cleared is told the drop sold out.
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, 1n);

    sim.setPrivateState(withBidder(RESERVE + 10n, secretN(0)));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(RESERVE - 10n, secretN(1)));
    sim.placeBid(A);

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(RESERVE + 10n, secretN(0)));
    sim.checkWin(A); // sells out the drop

    sim.setPrivateState(withBidder(RESERVE - 10n, secretN(1)));
    expect(() => sim.checkWin(A)).toThrow(/bid below reserve/);
  });

  it("never records more winners than stock across repeated claims", () => {
    const sim = new LowballSimulator(withHouseSeed());
    openAWithStock(sim, 2n);

    for (const i of [0, 1, 2]) {
      sim.setPrivateState(withBidder(RESERVE + BigInt(i + 1), secretN(i)));
      sim.placeBid(A);
    }
    sim.setPrivateState(withHouseSeed());
    sim.revealReserve(A);

    for (const i of [0, 1, 2, 0, 1, 2]) {
      sim.setPrivateState(withBidder(RESERVE + BigInt(i + 1), secretN(i)));
      try {
        sim.checkWin(A);
      } catch {
        // sold out, or already claimed — both are expected here
      }
    }
    expect(sim.getLedger().dropWinners.lookup(A).size()).toEqual(2n);
  });
});
