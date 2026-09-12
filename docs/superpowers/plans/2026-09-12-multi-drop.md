# Plan — multi-drop support

**Written 2026-09-12.** Reverses the L1 single-drop shortcut so one deployment can
carry many drops. Blocks L5/L6 until done.

## Why now

`createDrop` asserts the slot is unset, so a contract holds exactly one drop for its
lifetime. Two consequences, both fatal for L5/L6:

1. **Every new drop needs a new deployment**, and each deployment costs a full Preprod
   wallet sync — hours of work (decisions log §10, 2026-09-05).
2. **On-chain user evidence fragments across contracts.** L5 needs 50 users and L6
   needs 70, bidding over weeks. Spread across a dozen addresses, there is no single
   contract that demonstrates the userbase.

The original design already called for this: architecture §3.1 specifies
`drops: Map<DropId, …>`. L1 collapsed it to single-drop deliberately, to get the
verdict machinery tested without paying map-syntax cost twice. That debt is now due.

## Ledger shape

Compact rules that constrain the design (all from docs.midnight.network, checked
2026-09-12):

- `Map` keys must be regular Compact types; values may be regular types **or**
  ledger-state types (except `Kernel`). So `Map<Bytes<32>, Counter>` is legal.
- Nested ledger values **must be initialised before first use** (`default<Counter>`);
  operating on an uninitialised one is a dynamic error.
- `lookup` on a missing key is a **dynamic error**, not an empty value. Every read
  needs a `member()` guard first.
- A `Cell` read-modify-write **commits the transaction to the field's current value**;
  `Counter.increment` does not. Under concurrent bids that difference decides whether
  two bidders in one block both succeed.

Given those, the state is **flattened sibling maps keyed by `dropId`** rather than one
`Map<Bytes<32>, DropRecord>`:

```
export ledger dropStatus:      Map<Bytes<32>, DropStatus>;
export ledger dropCommitment:  Map<Bytes<32>, Bytes<32>>;
export ledger dropStock:       Map<Bytes<32>, Uint<32>>;
export ledger dropCloseTime:   Map<Bytes<32>, Uint<64>>;
export ledger dropMetaRef:     Map<Bytes<32>, Opaque<"string">>;
export ledger dropBidCount:    Map<Bytes<32>, Counter>;
export ledger dropLatestBid:   Map<Bytes<32>, Bytes<32>>;
export ledger dropRevealed:    Map<Bytes<32>, Uint<64>>;
export ledger dropWinnerFound: Map<Bytes<32>, Boolean>;
export ledger dropCount:       Counter;
```

A single struct-valued map would be tidier to read but forces a whole-struct
read-modify-write on every bid, which is exactly the transaction-rejection risk the
`Counter` type exists to avoid — and the risk only shows up under the concurrency L5
is meant to demonstrate. Flattening also keeps the ledger readable by indexers that
cannot decode structs.

**`dropId` is `Bytes<32>`**: the drop's slug (`drop-002`) as UTF-8, zero-padded to 32
bytes. Computable identically in Compact, ops and the browser with no circuit call,
readable in hex, and it keeps `/drop/drop-002` URLs working.

## Circuits

Each takes `dropId` as its first argument; each guards with `member()` before any
`lookup()`.

```
createDrop(dropId, commitment, stock, closeTime, metaRef)
  assert !dropStatus.member(dropId)        "drop already exists"
  insert config; dropBidCount.insert(dropId, default<Counter>); dropCount += 1

placeBid(dropId)
  assert dropStatus.member(dropId)          "no such drop"
  assert dropStatus.lookup(dropId) == OPEN  "drop not open"
  dropLatestBid.insert(dropId, bidHash(witnesses))
  dropBidCount.lookup(dropId).increment(1)

revealReserve(dropId)      — as today, but per-drop; hash check unchanged
checkWin(dropId)           — as today, but per-drop
```

`bidHash` and `reserveHash` are **unchanged**. Architecture §3.3 specifies binding
`dropId` into the reserve commitment (`H(reserve || salt || dropId)`), which would stop
a careless house reusing one `(reserve, salt)` across drops. It is deliberately **not**
in this pass: changing `reserveHash` invalidates the fixture in
`web/src/lib/midnight/hashes.test.ts`, which is currently checked against a commitment
the chain has already accepted — and that cross-check is the receipts page's guarantee.
Rebinding needs a new chain-accepted commitment to re-anchor against, so it follows the
first multi-drop deploy rather than preceding it. Tracked as a follow-up.

## Known limitation, unchanged and now load-bearing

`dropLatestBid` holds only the **most recent** bid commitment, so only the latest bidder
can ever pass `checkWin`. That is pre-existing L1 behaviour and out of scope here, but
multi-drop makes it the next blocker: L5's 50 bidders on one drop means 49 of them
cannot win. Fixing it needs a set or Merkle accumulator of bid commitments plus a
membership proof in `checkWin`. **This should be the next piece of work after this
plan lands.**

## Phases

Each phase is independently committable and leaves `main` green.

**Phase 0 — check the deploy path is still open.** Confirm the Preprod wallet cache
still restores (it is a week old; the dust ledger may have drifted). This gates
Phase 4, so it runs first — discovering a broken cache after writing the contract
wastes nothing but discovering it at deploy time wastes a day.

**Phase 1 — contract, TDD.** Write failing tests against the multi-drop simulator
first, then the Compact. Tests to add on top of the existing six:
- two drops coexist, independent status/stock/metaRef
- `createDrop` twice with the same id → "drop already exists"
- any circuit on an unknown id → "no such drop"
- bid on drop A does not move drop B's bid count
- reveal on A leaves B `OPEN`
- win on A does not set `winnerFound` on B
- per-drop `bidCount` increments independently
- the existing six, re-expressed per-drop

**Phase 2 — ops CLI.** `create-drop` takes `DROP_ID` (slug), derives the 32-byte key,
and writes the preimage to `ops/vault/drop-<contract>-<slug>.json`. `close-and-reveal`
takes the same slug. Vault layout changes, so old preimage files keep working by path
fallback.

**Phase 3 — web.** `readDropState` gains a `dropId`; add `readDropList` that iterates
the ledger `Map` (iteration is available from TypeScript) and returns a summary per
drop. Gallery renders the list from chain instead of a single hardcoded drop. Drop and
receipts pages key off the slug in the URL, which already exists as `:dropId`.

**Phase 4 — deploy and cut over.** Deploy the multi-drop contract, create a drop whose
close time is **well past end of September** (L4/L5 judging runs to month end and the
current drop closes 2026-09-19), verify on the indexer, verify the deployed bundle,
then repoint. The existing single-drop contract keeps running untouched until that
verification passes — it is immutable on chain, so "keeping it working" means not
repointing the app early, and not shipping a web change that cannot read it.

**Phase 5 — docs.** Decisions log §10 entry, README contract table, handoff,
architecture §3.1 reconciled with what was built.

## Risks

- **The deploy needs a Preprod wallet sync.** Phase 0 exists to find out early. If the
  cache is dead, budget hours and use `ops/sync-preprod.sh`.
- **Phase 3 and Phase 4 are coupled**: a web build that reads the new ledger shape
  cannot read the live single-drop contract. Phase 3 lands but is only repointed in
  Phase 4, and the config default is the switch.
- **Compact version drift.** CI pins toolchain 0.31.1 against `compact-runtime ^0.16.0`;
  these move together or not at all.
