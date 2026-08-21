# Demo video shot lists (L2 and L3)

Two videos are required. They share most footage, so **record one long take, then
cut it twice**. Film against the live Preview drop while it is open.

- App: https://lowball-orpin.vercel.app
- Drop: `/drop/drop-001` · Receipts: `/receipts/drop-001`
- Contract: `ae971dc989e4f3a8b6c28f9e3145c8e853b6e51f09bb423610f678e343c48408`

## Before you hit record

- [ ] Lace on **Preview**, wallet has tDUST accrued (register tNIGHT for DUST
      generation and let it accrue — otherwise the seal fails at submit)
- [ ] Local proof server running: `docker start lowball-proof-server`
- [ ] Close other tabs; browser zoom ~110% so text is readable when compressed
- [ ] Screen recorder: **Cmd+Shift+5** on macOS. Record audio only if you want
      narration; captions in the edit are fine too
- [ ] Have `README.md` and a terminal ready in other windows for the L3 shots

## L2 — Waxing Crescent (under 2 min)

Checklist wording: *wallet connect + a successful circuit call.*

| # | Shot | What must be visible |
|---|---|---|
| 1 | Gallery loads | the app, network pill reading **PREVIEW** |
| 2 | Open **Genesis Envelope** | drop page, **BIDS OPEN**, the live countdown ticking |
| 3 | Click **Connect Lace** → approve | the Lace popup, then **the connected address appearing in the header** |
| 4 | Type a bid (e.g. `30`) | the amount in the field — say aloud that this number is *never* published |
| 5 | Click **Seal this bid** | the **loading/proving state** — this is the proof being built locally. Don't cut it short; the wait is the point |
| 6 | Approve in Lace → confirmation | the sealed state / tx id on screen |
| 7 | Scroll to the **side-by-side panel** | left = your amount, right = what the ledger shows. **Right side has no number** |
| 8 | Open the explorer link | the transaction exists, `bidCount` incremented, **no amount anywhere** |
| 9 | Disconnect | the header returning to disconnected — proves connect **and** disconnect |

Say this line somewhere: *"The bid amount is a Compact witness — it never
touches the ledger. The explorer shows that a bid happened, not what it was."*

## L3 — First Quarter (1 min, tighter)

Checklist wording: *full functionality + test output + green CI.*

| # | Shot | What must be visible |
|---|---|---|
| 1 | Fast recap of the flow | connect → seal → sealed state (reuse L2 footage, sped up) |
| 2 | **Receipts page** `/receipts/drop-001` | the three numbered steps read from chain state |
| 3 | Paste the salt into the verify box | the **hashes-match panel**. Emphasise: recomputed *in your browser*, no wallet, no trust in us |
| 4 | Terminal: `npm test --prefix contract` | **6 passed**. Then `npm test --prefix web` → **15 passed** |
| 5 | GitHub Actions tab | both jobs green (`compile + test contract`, `build + test web`) |
| 6 | README top | the **CI badge green** + Contract Address table |

For step 3, the salt for the *revealed* L1 drop is in
`ops/vault/drop-e5f6d4704f3e.json` (`saltHex`) — that drop is revealed, so its
salt is public and safe to show on camera.

> ⚠️ **Never show the salt of an OPEN drop on camera** — that would disclose the
> hidden reserve before reveal and break the fairness claim.

## After recording

1. Upload (YouTube unlisted, or Drive with link sharing)
2. Send me the links and I'll add them to the README and the submission docs

## If the seal fails on camera

Almost always DUST: the app now shows *"no DUST to pay the network fee yet"*
before the slow proof rather than failing after it. Register tNIGHT for DUST
generation in Lace, wait a few minutes, retry. Nothing is lost — the bid is
journalled locally before submission.
