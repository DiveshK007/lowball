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
| MVP live on Preprod (verifiable address) | ✅ | `f81e44ea…d9ec66dc` — deploy block 2,520,844, two drops open |
| `docs/USAGE.md` | ✅ | [`docs/USAGE.md`](../../USAGE.md) — first-time bidder guide, linked from the README |
| README + setup docs | ✅ | README → *Prerequisites*, *Setup & Run Locally*, *Run Tests* |
| CI/CD passing | ✅ | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml), two jobs |
| X product profile posting every drop | ✅ | **[@lowballdrops](https://x.com/lowballdrops)** — formats and drop calendar in [`docs/traction.md`](../../traction.md) |
| 15+ commits in the L4 window | ✅ | **50 commits** since the window opened 2026-09-05 |
| Demo video | ⚠️ | [Existing video](https://youtu.be/om0mTpbdXiU) is **stale** — filmed against the Preview single-drop build. Re-shoot needed against the current Preprod MVP; shot list in [`docs/demo-video-script.md`](../../demo-video-script.md) |
| Live Preprod demo link | ✅ | https://lowball-orpin.vercel.app — deployed bundle verified against the Preprod indexer |

## Preview → Preprod consolidation — done 2026-09-05

L1–L3 ran on **Preview** because Preprod's genesis sync was infeasible on the available
hardware until checkpointing landed. The Preprod address submitted for L2/L3
(`1e7b6dee…6263272`) was a **bare deploy with zero contract calls** — no drop was ever
created on it, and the deployed web app still read Preview. The project is now on **one
network, Preprod**.

| | |
|---|---|
| **Contract** | `f81e44eaf0acc9f92c80aba03c6ac822c38004d09b9c4d5d5ba330b4d9ec66dc` (multi-drop + accumulator + stock) |
| **Deploy** | block 2,520,844 · 2026-09-12 |
| **Drops opened** | `drop-001` (stock 50) · `drop-002` (stock 25) · `drop-soldout` (stock evidence) |
| **Drops** | Genesis Envelope (stock 50) · Second Envelope (stock 25) · reserves sealed · both close 2026-12-31. `drop-soldout` closed: stock 2, 3 bids, 2 winners |

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

- **Demo video re-shoot.** The linked video predates multi-drop, the bid accumulator and
  stock enforcement — it shows a single-drop Preview build. Everything it demonstrates is
  still true, but it no longer shows what the MVP actually is. Shot list ready at
  [`docs/demo-video-script.md`](../../demo-video-script.md); this is the one L4 item left.
