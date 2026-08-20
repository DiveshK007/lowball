# Product Proposal

**Product:** LOWBALL — provably-fair sealed-bid mystery drops
**Primitive (from the provided list):** Sealed-Bid Auction — private bids, verifiable winner
**Category:** Consumer focus

> Drafted from what the contract actually does today. Review and adjust the
> wording before submitting — the facts and addresses are verified onchain.

## What is the product, and who uses it?

LOWBALL is name-your-price gacha played against the house. Each drop is one item
with a hidden reserve price. The house publishes `hash(reserve, salt)` onchain
*before any bid can exist*, so the reserve is locked and cannot be moved later.
A player names their own price; that amount is a private witness, never written
to the ledger. When the drop closes the house reveals `(reserve, salt)`, the
contract verifies the hash against its own earlier commitment, and each bidder
proves whether their bid cleared the reserve — without disclosing the amount.
Clear it and you win at your price.

The user is a consumer, not a trader: someone who would buy a blind box or roll
a gacha, who enjoys the guess and the reveal. Crucially it is **single-player**
— one wallet against a smart contract, no counterparty and no crowd needed for
the mechanic to work. That is what makes it viable on a young network where you
cannot assume liquidity or simultaneous participants.

A losing bid discloses nothing at all — not the amount, not how close it came.
That is the retention loop: you never learn how near you were, so you come back
for the next drop.

## Why Midnight specifically?

The game is impossible on a transparent chain, in both directions:

- **If bids were public**, players would simply read each other's numbers and
  undercut, and the house could see every bid before deciding — the sealed-bid
  premise collapses into an open auction.
- **If the reserve were not committed in advance**, the house could set it after
  seeing the bids and always extract the maximum. Players would have to take
  fairness on trust.

LOWBALL needs *both halves at once*: private witnesses for the bids, and a
public commitment that binds the house before any bid exists. Midnight is the
only place both exist in one execution model. A transparent chain can do the
commitment half (a hash) but has nowhere to put a private bid; a fully private
system can hide bids but gives observers nothing to verify the house against.

Selective disclosure is the mechanic, not a feature bolted on: `disclose()`
appears exactly twice in the contract — the winner's claim and the post-close
reserve reveal. The only public things are the things that keep the house honest.

## Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| `commitment` — `hash(reserve, salt)` | Public ledger | Everyone, before bids open |
| `stock` — units available | Public ledger | Everyone |
| `closeTime` — reveal appointment | Public ledger | Everyone |
| `bidCount` — how many bids exist | Public ledger | Everyone (a count, never amounts) |
| `latestBidCommitment` — `hash(bid, secret)` | Public ledger | Everyone (a hash, not a value) |
| `revealedReserve` | Public ledger, **after close only** | Everyone, once the hash check passes |
| `winnerFound` | Public ledger | Everyone |
| `bidAmount` | Private witness | **No one** — not other bidders, not the house |
| `bidderSecret` (32 bytes) | Private witness | **No one** — only the bidder's device |
| `reserve` before close | Private witness (house side) | No one until reveal |
| `salt` | Private witness (house side) | No one until reveal |
| Bidder ↔ drop linkage | Private / off-ledger | No one |

What the user **proves without revealing**:

1. Their bid cleared the revealed reserve — without disclosing the bid amount
   (`checkWin` asserts `bidAmount >= revealedReserve` in-circuit).
2. They are the author of the recorded bid — without disclosing the secret
   (`bidHash(amount, secret) == latestBidCommitment`).
3. The house's revealed reserve matches what it sealed before bidding — the
   contract asserts `reserveHash(reserve, salt) == commitment`, so a tampered
   reveal cannot be accepted.

## Mainnet Feasibility

**Realistic by Level 6, with one known dependency.**

What is already built and running: the full loop is live onchain, not mocked —
`createDrop`, a Lace-signed `placeBid`, `revealReserve`, and a `checkWin` win
verdict have all executed against a deployed contract, with a public receipts
page that recomputes the commitment hash in the visitor's own browser. Tests and
CI are in place. There is no backend to operate — the chain is the backend and
the frontend is static hosting, so running cost at launch is near zero.

The honest dependency is **shielded escrow**. Today a bid is a commitment, not
locked funds: a winner pays on claim, and an unpaid claim expires so stock
returns (spec §3.4). That is acceptable for testnet and for small drops, but for
mainnet with real value the bid should escrow shielded funds at bid time. Whether
that is straightforward depends on shielded-token primitives being callable from
a circuit with a refund path — spiked but not yet proven end to end
(`docs/spikes/escrow-feasibility.md`).

Two smaller items before mainnet: deadlines are stored but not yet enforced
in-circuit (`blockTimeLt` verified as available), and the contract currently
holds one drop per deployment, which needs to become a drops map for a
2–3/week calendar. Both are scoped work, not open research.

**Verdict:** the privacy mechanic — the part that must be right — is done and
demonstrable. Mainnet readiness rests on escrow; if the shielded path does not
land, the commitment-based model still ships a coherent product, just with
pay-on-claim rather than locked bids.
