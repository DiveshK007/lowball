# LOWBALL — Preprod deploy evidence
Captured: 2026-08-21

## Deployed contract (Midnight Preprod)

| Field | Value |
|---|---|
| Network | **Preprod** |
| Contract address | `1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272` |
| Deploy tx | `0018b5305ed9367ae96e1c7d7b7d01ecb98ed3031d97feb8b4c4d70b8e96a6f632` |
| Block height | 2,202,228 |
| Dust registration tx | `000bb8a28faa7de0e95dc3e895790a62c31bbc60767a5a6f5bced3bbd178def925` |
| House unshielded addr | `mn_addr_preprod1d0zv2wqrmwqwjlzdljduzpks6p65exqkn30sme0hy5c4rvgyppcs47f8tn` |

## On-chain verification

```
POST https://indexer.preprod.midnight.network/api/v3/graphql
{ contractAction(address:"1e7b6dee…6263272"){ __typename address transaction { hash } } }

→ { "data": { "contractAction": {
      "__typename": "ContractDeploy",
      "address": "1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272" } } }
```

## Deploy output

```
Registering 3 NIGHT UTXO(s) for dust...
Dust registration submitted: 000bb8a28faa7de0e95dc3e895790a62c31bbc60767a5a6f5bced3bbd178def925
Waiting for dust to generate (1-2 min)...
Dust ready.
Pre-compiling contract with ZK assets...
Building midnight-js providers...
Submitting deploy transaction...

Deployed!
  contract:    1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272
  tx:          0018b5305ed9367ae96e1c7d7b7d01ecb98ed3031d97feb8b4c4d70b8e96a6f632
  block:       2202228
```

## How it was actually done

Preprod requires replaying the full dust-generation ledger (~1.45M events) plus the
shielded ledger (~1.45M coins) before the wallet can compute a fee, and the wallet
SDK holds that state in memory with no way to shard or parallelise it — the apply
loop is single-threaded and inherently serial.

Two independent walls came out of that:

- **Memory.** A 16 GB machine OOM'd twice (`exit 134`, inside V8's
  `CollectGarbage` on *external* wasm/ArrayBuffer memory, so a heap cap could not
  prevent it), and separately drove swap to 92% with throughput collapsing to
  220/min.
- **Throughput decay.** Rates fell as the in-memory Merkle structures grew —
  19,000/min early, a few hundred per minute later — on every machine tried.

What made it finishable was **checkpointing the wallet state to disk every 5
minutes** (`checkpointWhileSyncing`, `ops/src/wallet.ts`) rather than only at the
end. That turned an all-or-nothing multi-hour job into a resumable one and, as a
side effect, a *portable* one: the serialized snapshot moves between machines, so
the sync was migrated four times — laptop → Mac → laptop → Mac — always resuming
from the last checkpoint instead of genesis.

Two things learned that are worth keeping:

1. **Restoring from a checkpoint yields a far leaner working set than replaying.**
   Post-restore RSS was ~1.9 GB against 10–11 GB while replaying, so the
   checkpoint doubles as a memory reset. That is why a 16 GB machine ultimately
   outran a 30 GB one.
2. **The dust subscription can freeze silently** — the process stays alive and
   keeps emitting state ticks while the applied counter never advances (observed
   stalled ~8 min at 1,229,756). A restart from checkpoint clears it; monitoring
   must watch for a frozen counter, not just for crashes.

Total cost: one restart for the stall, ~20k events (~7 minutes) lost. No cloud
spend.
