# L4 — The Turn · submission checklist

## Gate: idea approval

**The Sealed-Bid Auction product proposal was APPROVED at The Turn.** Confirmed by the
program on or before **2026-09-05**; L4 and L5 are both open from that date. The proposal
was accepted on its second pass, after a "re-ideate" note on the first — the rewrite led
with the hook and with the two-directional argument for why the product is impossible on
any other chain (transparent chains can lock the reserve but cannot hide the bid; fully
private chains hide the bid but leave nothing to hold the house to).

Recorded here because no other artifact in this repository captured it. See also
decisions log §10 in `docs/superpowers/specs/2026-07-19-lowball-design.md`.

## Requirements

| Requirement | Status | Evidence |
|---|---|---|
| MVP live on Preprod (verifiable address) | ✅ | `3fac6305…2120b446` — deploy block 2,419,510, drop open at block 2,419,536 |
| `docs/USAGE.md` | ❌ | Not yet written |
| README + setup docs | ✅ | README → *Prerequisites*, *Setup & Run Locally*, *Run Tests* |
| CI/CD passing | ✅ | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), two jobs |
| X product profile posting every drop | ❌ | Handle candidates only, in [`docs/traction.md`](../../traction.md) |
| 15+ commits in the L4 window | ⏳ | In progress; window opened 2026-09-05 |
| Demo video | ✅ | https://youtu.be/om0mTpbdXiU |
| Live Preprod demo link | ✅ | https://lowball-orpin.vercel.app — deployed bundle verified against the Preprod indexer |

## Preview → Preprod consolidation — done 2026-09-05

L1–L3 ran on **Preview** because Preprod's genesis sync was infeasible on the available
hardware until checkpointing landed. The Preprod address submitted for L2/L3
(`1e7b6dee…6263272`) was a **bare deploy with zero contract calls** — no drop was ever
created on it, and the deployed web app still read Preview. The project is now on **one
network, Preprod**.

| | |
|---|---|
| **Contract** | `3fac6305e4d70a1e8e16c9ea2c480d1456e05c043b9150e5b97f46cd2120b446` |
| **Deploy** | block 2,419,510 · tx `79061bfb…3565bc78` · 2026-09-05 17:34 UTC |
| **Drop opened** | block 2,419,536 · tx `1a34b5cd…fbaabba3` · `createDrop` |
| **Drop** | Genesis Envelope · 25 tDUST sealed reserve · stock 1 · closes 2026-09-19 17:35 UTC |

Verify the drop is open, no wallet needed:

```bash
curl -s -X POST https://indexer.preprod.midnight.network/api/v3/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{contractAction(address:\"3fac6305e4d70a1e8e16c9ea2c480d1456e05c043b9150e5b97f46cd2120b446\"){__typename ... on ContractCall{entryPoint}}}"}'
```

`entryPoint: "createDrop"` means the drop is open and unbid. The deployed app was
verified by fetching its JS chunks: 1 occurrence of the Preprod address, 2 of the
Preprod indexer, 0 of the Preview indexer. See decisions log §10, entries dated
2026-09-05.

## Still outstanding for L4

- **`docs/USAGE.md`** — not written.
- **X product profile** — not created; handle candidates only, in `docs/traction.md`.
- **Commit count** — the 15+ in-window commits are accumulating from 2026-09-05.
