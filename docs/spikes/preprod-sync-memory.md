# Spike: Preprod wallet-sync memory ceiling

**Question:** can the house wallet sync Preprod and deploy the L1 contract
from this dev machine (16 GB RAM)?

**Answer: no — the in-memory genesis sync exceeds the machine's heap
ceiling. Deploy L1 to Preview instead (L1 accepts either network).**

## What happened

Repeated attempts to run `npm run deploy:preprod` failed at the wallet
**sync** step, before any contract transaction. Three distinct issues,
in the order they surfaced:

### 1. Wallet-SDK version skew (fixed)

`derive-address --balance` and the deploy both threw
`pendingOutputs.values.map is not iterable` from
`wallet-sdk-shielded` `CoreWallet.pickAllCoins`
(`[...state.coins, ...state.pendingOutputs.values().map(...)]`).

Root cause: `@midnight-ntwrk/ledger-v8` floated to **8.1.0** via a
`^8.0.3` caret, while `wallet-sdk-shielded@2.1.0` was built for ledger
**8.0.x** (shielded `3.0.1` was the first release to support 8.1.0 —
its changelog says consumers "must resolve ledger-v8 to >=8.1.0"). In
8.1.0 `pendingOutputs.values()` returns a bare iterator with no `.map`.

Fix (commit `e174294`): pin `ledger-v8` to exact `8.0.3`,
`wallet-sdk-address-format` to `3.1.0`, add an `overrides` block forcing
`ledger-v8` 8.0.3 + `wallet-sdk-prover-client` 1.2.1, clean reinstall →
a single, coherent ledger 8.0.3. After the fix both networks read
balances cleanly (preprod 1.5 B tNight, preview 0). The bug was
survivable on preprod (the unshielded balance read is a separate
subsystem, so 1.5 B came through despite the shielded crash) but that
made an unfunded reading indistinguishable from a corrupted one — hence
the fix was needed before trusting any balance.

### 2. Transient sync abort (mitigated)

A single `Wallet.Sync` error (node/indexer connectivity blip) from
`wallet-sdk-unshielded-wallet` aborted the whole sync at ~38 % dust,
losing ~35 min of in-memory progress (no checkpoint). Mitigated with a
bounded `Rx.retry` (12 tries, resets on each progress tick, 10 s
backoff) around the sync streams (commit `5482330`) so a blip
re-subscribes and resumes instead of aborting. This does **not** address
issue #3.

### 3. The hard wall — memory (not fixable here)

With the versions aligned, the deploy OOM-crashed during the **shielded**
sync (87 % done, coin index ~1.18 M of ~1.35 M):

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Scavenge ... 8076.7 -> 8076.0 MB ... allocation failure
```

GC reclaimed nothing (8076 → 8076 MB) — that ~8 GB is **live** state, not
garbage. The shielded wallet's `CoinHashesMap` holds a commitment +
nullifier per coin for the whole ~1.35 M-coin history, and sync state is
in-memory (`InMemoryTransactionHistoryStorage`, no persistence). The dust
ledger (~1.35 M generation events) is comparably heavy. Full genesis
sync of both therefore needs **> 8 GB live heap**, which is at/over a
16 GB machine's practical ceiling once OS + Docker + browser are
accounted for. Raising `--max-old-space-size` to 8 GB only moved the OOM
to the shielded phase; a larger heap would swap-thrash and still risks
exceeding RAM.

## Why Preview does not hit this

Preview is a much younger chain (~180 k blocks vs Preprod ~1.86 M). Its
per-wallet ledger histories are ~100× smaller:

| Ledger index (at tip) | Preprod | Preview |
|---|---|---|
| dust generation | 353 k | **2.7 k** |
| dust commitment | 998 k | **9.7 k** |
| shielded / dust events the wallet replays | ~1.35 M | **~18 k** |

An ~18 k-event sync has a megabyte-scale live set — it completes in
minutes with no memory pressure. Preview infra was healthy (node +
indexer at tip, block timestamps ~60 s fresh; no error-171 indexer lag).

## Decision for L1

**Deploy the L1 contract to Preview, not Preprod.** L1's program
checkbox is "deployed to a testnet" and accepts either. The house seed's
Preview address needs one-time funding from the Preview faucet
(`https://faucet.preview.midnight.network/`, real captcha — the
`/api/drips` API rejects the CI dummy token, so a human must do it).

Supporting code already landed: Preview network target selectable via
`MIDNIGHT_NETWORK=preview` (commit `d3c3600`); `ensureDustRegistered`
registers NIGHT for dust generation before the fee-bearing deploy tx
(commit `0d6654f`); fast unshielded-only funding check (commit
`05c3d21`).

## Follow-ups (deferred)

- **Preprod deploy** revisit needs one of: (a) the SDK's
  `serialize()`/`WalletBuilder.restore()` state cache — but that still
  requires one full (memory-bound) sync to create the checkpoint, so it
  doesn't help the first run here; (b) a checkpoint/fast-sync that skips
  genesis replay, if the SDK adds one; or (c) running the sync on a
  32–64 GB host. Preprod is where real tDUST and the mainnet-shaped dust
  flow live, so L4+ will need one of these.
- If Preview is later reset/retired, re-evaluate against whichever
  testnet core engineering points at.

Spec §10 log entry:

> L1: deploy to Preview, not Preprod — Preprod's ~1.35 M-coin in-memory
> shielded sync needs ~8 GB+ live heap and OOMs on a 16 GB machine;
> Preview's ~18 k-event ledgers sync in seconds. Wallet-SDK version skew
> (ledger 8.1.0 vs shielded 2.1.0) fixed en route.
