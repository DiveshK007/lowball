# Plan — bid-commitment accumulator

**Written 2026-09-12.** Removes the single-bid limitation so every bidder on a drop can
independently prove they cleared the reserve. Critical path for L5 (50 users) and L6 (70).

## The bug, precisely

`placeBid` writes into `dropLatestBid: Map<DropId, Bytes<32>>` — **one slot per drop**,
overwritten by each new bid. `checkWin` then asserts:

```
bidHash(amount, secret) == dropLatestBid.lookup(dropId)
```

So only the most recent bidder can ever pass. With 50 bidders on one drop, 49 are told
"bid preimage mismatch" — not because they lost, but because their bid was overwritten.
Worse, it is silent: a losing bidder and an overwritten bidder see the same message.

It also breaks the web's crash-recovery. `useBidFlow` reconciles a journalled bid by
comparing it to `state.latestBidCommitmentHex`; for any bidder who is not the latest,
that comparison never matches and their sealed bid stays "pending" forever.

## Set, not Merkle

Both were considered. **A `Set<Bytes<32>>` per drop is the right accumulator here**, and
the deciding argument is not simplicity — it is correctness under concurrency.

A plain `MerkleTree<n, T>` root **changes on every insert**, and Compact's `MerkleTree`
"does not permit proofs against past states". So a bidder who computes their path, then
waits for a proof and a signature, races every other bid submitted meanwhile: by the time
their transaction lands the root has moved and their path is stale. At 50 bidders that is
not an edge case, it is the normal case. `HistoricMerkleTree` exists precisely to fix
this — but it means carrying historic roots, tracking a leaf index per bidder, computing
paths off-chain, and shipping all of that into the browser.

A `Set` has none of those properties. Insertion is order-independent, membership is
checked directly in-circuit with `member()`, and nothing a bidder holds goes stale.

The usual reason to prefer Merkle — keeping the set off-chain, or hidden — does not apply:

- **Nothing new is disclosed.** Bid commitments are *already* public: `dropLatestBid` is
  a public ledger field today. A set is the plural of what already exists. Each element
  is `hash("lowball:bid:v1", secret, amount)`, which reveals neither amount nor bidder.
- **The set size is already public** via `dropBidCount`.
- **The volume is trivial.** 50–70 entries of 32 bytes.

The zero-knowledge property is unchanged and lives where it always did: `amount` and
`secret` are witnesses, so the proof shows *"the commitment I can open is in this drop's
bid set, and the amount inside it is ≥ the revealed reserve"* without disclosing either
number. Set membership is the public half of that statement; it is supposed to be public.

## Ledger changes

```
- dropLatestBid:   Map<Bytes<32>, Bytes<32>>        // removed: one slot, overwritten
- dropWinnerFound: Map<Bytes<32>, Boolean>          // removed: derivable, and redundant
+ dropBids:        Map<Bytes<32>, Set<Bytes<32>>>   // every bid commitment on the drop
+ dropWinners:     Map<Bytes<32>, Set<Bytes<32>>>   // commitments that claimed a win
```

`Set` nested in a `Map` value is legal under the same rule that already allows
`Map<Bytes<32>, Counter>`, and like the Counter it must be initialised with
`default<Set<Bytes<32>>>` at `createDrop` before first use.

`dropWinnerFound` goes because `dropWinners.size() > 0` says the same thing and cannot
drift out of step with it. `dropBidCount` stays: it counts *submissions*, whereas
`dropBids.size()` counts *distinct* commitments, and the gap between them is real
information (a bidder re-submitting the identical amount+secret).

## Circuit changes

```
createDrop  + dropBids.insert(dropId, default<Set<Bytes<32>>>)
            + dropWinners.insert(dropId, default<Set<Bytes<32>>>)

placeBid    dropBids.lookup(dropId).insert(bidHash(amount, secret))   // was: overwrite

checkWin    assert dropBids.lookup(dropId).member(commitment)   "bid preimage mismatch"
            assert !dropWinners.lookup(dropId).member(commitment) "win already claimed"
            assert amount >= dropRevealed.lookup(dropId)         "bid below reserve"
            dropWinners.lookup(dropId).insert(commitment)
```

The **"win already claimed"** guard is new and load-bearing: without it a winner could
call `checkWin` repeatedly and inflate the winner count, which is the number L5/L6
evidence rests on. It also makes the call idempotent in the only sense that matters —
a second attempt fails loudly rather than double-counting.

**Deliberately not in this pass:** stock is still not decremented on a win, so every
bidder clearing the reserve wins. Architecture §3.3 specifies `on WIN: stock -= 1`, and
enforcing it needs a rule for *which* clearing bidders win when there are more of them
than stock — bid-order priority, per spec §10 (2026-07-19). That is a separate decision
with product consequences, and it is in tension with this pass's own acceptance test
(three bidders all winning one drop). Recorded as the next question, not silently chosen.

## Phases

**Phase 0 — wallet probe.** `npm run derive-address -- --full`. Gates Phase 4; cheap.

**Phase 1 — contract, TDD.** Failing tests first. On top of the existing 17:
- three distinct bidders all pass `checkWin` on one drop *(the headline case)*
- a non-latest bidder still passes after later bids land
- `dropBids.size()` counts distinct commitments; `dropBidCount` counts submissions
- `checkWin` twice with the same commitment → "win already claimed"
- a bidder who never bid → "bid preimage mismatch"
- a losing bidder among winners → "bid below reserve", and no winner recorded for them
- bids on drop A are not members of drop B's set

**Phase 2 — ops.** `callManyOnNetwork`: run several circuit calls in **one** wallet
session, re-binding private state per bidder. Six calls today means six wallet syncs;
at L5 scale that is unworkable. Then `simulate-bidders.ts`, which places N bids with
distinct secrets and opens N envelopes, writing each bidder's secret to the git-ignored
vault so runs are reproducible and auditable.

**Phase 3 — web.** `DropState` gains `bidCommitmentsHex`, `distinctBids`, `winnerCount`;
`latestBidCommitmentHex` goes. `useBidFlow` reconciles by **membership in the bid set**
rather than equality with the latest bid — which fixes the stuck-pending bug for every
non-latest bidder as a side effect.

**Phase 4 — deploy and prove it.** Deploy, open a drop, run **three distinct bidders**
through `placeBid`, reveal, then `checkWin` for each, and verify on chain that
`dropWinners` holds three commitments. This is the acceptance test; nothing is claimed
until the indexer shows it.

**Phase 5 — docs.** Decisions log §10, README, handoff, architecture §3.1.

## Risks

- **Breaking ledger change.** The live contract cannot be upgraded; this needs a fresh
  deployment, and the web build that reads the new shape must not ship before it. Last
  time that ordering was got wrong and briefly broke production. **Deploy first, repoint
  second.**
- **Six on-chain calls.** Phase 2's single-session runner is what keeps this tractable.
- **Compact traps already known:** guard every `lookup` with `member()`; initialise
  nested ledger values with `default<…>`; a nested `Counter` reads back via `.read()`.
