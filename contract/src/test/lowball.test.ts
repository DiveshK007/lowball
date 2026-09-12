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

  it("keeps each drop's latest bid commitment separate", () => {
    const sim = new LowballSimulator();
    openA(sim);
    openB(sim);

    sim.setPrivateState(withBidder(150n));
    sim.placeBid(A);
    sim.setPrivateState(withBidder(600n));
    sim.placeBid(B);

    const l = sim.getLedger();
    expect(l.dropLatestBid.lookup(A)).toEqual(pureCircuits.bidHash(150n, BIDDER_SECRET));
    expect(l.dropLatestBid.lookup(B)).toEqual(pureCircuits.bidHash(600n, BIDDER_SECRET));
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
    expect(l.dropWinnerFound.lookup(A)).toBe(true);
    expect(l.dropWinnerFound.member(B)).toBe(false);
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
    expect(sim.getLedger().dropWinnerFound.member(A)).toBe(false);
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
    const sim = new LowballSimulator(withHouseSeed());
    openA(sim);
    sim.revealReserve(A);

    sim.setPrivateState(withBidder(150n));
    expect(() => sim.checkWin(A)).toThrow(/no bid recorded/);
  });
});
