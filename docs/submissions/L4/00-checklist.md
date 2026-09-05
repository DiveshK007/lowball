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
| MVP live on Preprod (verifiable address) | ⏳ | Consolidating onto Preprod — see *Preview → Preprod* below |
| `docs/USAGE.md` | ❌ | Not yet written |
| README + setup docs | ✅ | README → *Prerequisites*, *Setup & Run Locally*, *Run Tests* |
| CI/CD passing | ✅ | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), two jobs |
| X product profile posting every drop | ❌ | Handle candidates only, in [`docs/traction.md`](../../traction.md) |
| 15+ commits in the L4 window | ⏳ | In progress; window opened 2026-09-05 |
| Demo video | ✅ | https://youtu.be/om0mTpbdXiU |
| Live Preprod demo link | ⏳ | Blocked on the consolidation below |

## Preview → Preprod consolidation

L1–L3 ran on **Preview** because Preprod's genesis sync was infeasible on the available
hardware until checkpointing landed. The Preprod address submitted for L2/L3
(`1e7b6dee…6263272`) was a **bare deploy with zero contract calls** — no drop was ever
created on it, and the deployed web app still read Preview. L4 requires a live Preprod
MVP, so the project is consolidating onto **one network, Preprod**, rather than
maintaining two.

This document is updated with the new address, drop and verification once that lands.
