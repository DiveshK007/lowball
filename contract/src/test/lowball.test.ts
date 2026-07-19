import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, expect, it } from "vitest";
import { DropStatus } from "../managed/lowball/contract/index.js";
import { emptyLowballPrivateState } from "../witnesses.js";
import { LowballSimulator, pureCircuits } from "./lowball-simulator.js";

setNetworkId("undeployed");

// Test fixtures — deterministic seeds so tests are reproducible.
const SALT = new Uint8Array(32).fill(0x11);
const BIDDER_SECRET = new Uint8Array(32).fill(0x22);
const RESERVE = 100n;
const STOCK = 1n;
const CLOSE_TIME = 1_000_000n;
const META_REF = "drop-001";

const withHouseSeed = () => ({
  ...emptyLowballPrivateState(),
  reserve: RESERVE,
  salt: SALT,
});

const withBidder = (amount: bigint) => ({
  ...emptyLowballPrivateState(),
  bidAmount: amount,
  bidderSecret: BIDDER_SECRET,
});

describe("LOWBALL contract — L1 skeleton", () => {
  it("initializes with UNSET status and zeroed fields", () => {
    const sim = new LowballSimulator();
    const l = sim.getLedger();
    expect(l.status).toEqual(DropStatus.UNSET);
    expect(l.stock).toEqual(0n);
    expect(l.bidCount).toEqual(0n);
    expect(l.winnerFound).toBe(false);
  });

  it("createDrop stores the sealed commitment and moves status to OPEN", () => {
    const commitment = pureCircuits.reserveHash(RESERVE, SALT);
    const sim = new LowballSimulator();
    const l = sim.createDrop(commitment, STOCK, CLOSE_TIME, META_REF);
    expect(l.status).toEqual(DropStatus.OPEN);
    expect(l.commitment).toEqual(commitment);
    expect(l.stock).toEqual(STOCK);
    expect(l.closeTime).toEqual(CLOSE_TIME);
    expect(l.metaRef).toEqual(META_REF);
  });

  it("revealReserve accepts the matching preimage and discloses the reserve", () => {
    const commitment = pureCircuits.reserveHash(RESERVE, SALT);
    const sim = new LowballSimulator(withHouseSeed());
    sim.createDrop(commitment, STOCK, CLOSE_TIME, META_REF);

    const l = sim.revealReserve();

    expect(l.status).toEqual(DropStatus.REVEALED);
    expect(l.revealedReserve).toEqual(RESERVE);
  });

  it("revealReserve rejects a tampered preimage", () => {
    const commitment = pureCircuits.reserveHash(RESERVE, SALT);
    const sim = new LowballSimulator({
      ...withHouseSeed(),
      // House claims the reserve was 1 instead of 100 — should fail.
      reserve: 1n,
    });
    sim.createDrop(commitment, STOCK, CLOSE_TIME, META_REF);

    expect(() => sim.revealReserve()).toThrow(
      /reveal does not match commitment/,
    );
    expect(sim.getLedger().status).toEqual(DropStatus.OPEN);
    expect(sim.getLedger().revealedReserve).toEqual(0n);
  });

  it("checkWin marks winnerFound when bidAmount >= revealed reserve", () => {
    const commitment = pureCircuits.reserveHash(RESERVE, SALT);
    const winningBid = RESERVE + 50n;
    const sim = new LowballSimulator(withHouseSeed());
    sim.createDrop(commitment, STOCK, CLOSE_TIME, META_REF);

    // Bidder places a winning sealed bid.
    sim.setPrivateState(withBidder(winningBid));
    sim.placeBid();
    expect(sim.getLedger().bidCount).toEqual(1n);
    expect(sim.getLedger().latestBidCommitment).toEqual(
      pureCircuits.bidHash(winningBid, BIDDER_SECRET),
    );

    // House reveals the reserve.
    sim.setPrivateState(withHouseSeed());
    sim.revealReserve();

    // Bidder opens their bid and claims the win.
    sim.setPrivateState(withBidder(winningBid));
    sim.checkWin();

    expect(sim.getLedger().winnerFound).toBe(true);
  });

  it("checkWin refuses to mark a winner when bidAmount < revealed reserve", () => {
    const commitment = pureCircuits.reserveHash(RESERVE, SALT);
    const losingBid = RESERVE - 1n;
    const sim = new LowballSimulator(withHouseSeed());
    sim.createDrop(commitment, STOCK, CLOSE_TIME, META_REF);

    sim.setPrivateState(withBidder(losingBid));
    sim.placeBid();

    sim.setPrivateState(withHouseSeed());
    sim.revealReserve();

    sim.setPrivateState(withBidder(losingBid));
    expect(() => sim.checkWin()).toThrow(/bid below reserve/);
    expect(sim.getLedger().winnerFound).toBe(false);
  });
});
