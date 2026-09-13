# Demo video shot lists

## L4 — the current MVP (target: 2–3 min)

**Why re-shoot.** The existing video (<https://youtu.be/om0mTpbdXiU>) is still honest
about what it shows, but it films the **Preview single-drop build**. Since then the
product changed in three ways that are the whole point of L4/L5: one contract now holds
**many drops**, **every bidder** can open their own envelope (not just the most recent),
and **stock is enforced** so a drop can sell out. None of that is on camera anywhere.

### What to film against

| | |
|---|---|
| App | <https://lowball-orpin.vercel.app> |
| Network | **Preprod** |
| Contract | `f81e44eaf0acc9f92c80aba03c6ac822c38004d09b9c4d5d5ba330b4d9ec66dc` |
| Open drops | `drop-001` Genesis Envelope (stock 50) · `drop-002` Second Envelope (stock 25) |
| Closed proof drop | `drop-soldout` — stock 2, 3 bids, **2 winners** |

### Before you hit record

- [ ] Lace on **Preprod**, with tDUST actually accrued — register tNIGHT for DUST
      generation and wait. See [`USAGE.md`](USAGE.md); this is the step that wastes
      afternoons.
- [ ] Proof server up: `docker start lowball-proof-server` → expect HTTP 200 on `:6300`
- [ ] Browser zoom ~110%, other tabs closed, notifications off
- [ ] A terminal ready for the test/CI shots
- [ ] **Film the gallery shot before creating the demo drops below**, if you want it to
      read as a tidy three. Five drops is fine too — arguably better evidence of
      multi-drop.

### Set up two throwaway drops for the verdict and sold-out shots

`drop-001` and `drop-002` stay open until 2026-12-31, so you cannot film a reveal on
them. Make two disposable drops instead. From `ops/`, with
`C=f81e44eaf0acc9f92c80aba03c6ac822c38004d09b9c4d5d5ba330b4d9ec66dc`:

```bash
# A drop you will win on camera.
MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=$C DROP_ID=drop-demo-win \
  DROP_RESERVE=5 DROP_STOCK=1 DROP_CLOSE_MINUTES=2880 DROP_META='Demo Envelope' \
  npm run create-drop

# A drop that will sell out from under you on camera.
MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=$C DROP_ID=drop-demo-soldout \
  DROP_RESERVE=5 DROP_STOCK=1 DROP_CLOSE_MINUTES=2880 DROP_META='Last One' \
  npm run create-drop
```

Then, **between takes**:

1. In the browser, place a sealed bid on **both** demo drops (shots 3–5 below).
2. Add a rival bidder to the sold-out drop and let them take the only unit:
   ```bash
   MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=$C DROP_ID=drop-demo-soldout BIDDERS=1 \
     npm run simulate-bidders -- bid
   MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=$C DROP_ID=drop-demo-soldout \
     npm run close-and-reveal
   MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=$C DROP_ID=drop-demo-soldout \
     npm run simulate-bidders -- open      # rival claims the single unit
   ```
3. Reveal the win drop so your own envelope can be opened:
   ```bash
   MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=$C DROP_ID=drop-demo-win \
     npm run close-and-reveal
   ```

Run wallet commands **one at a time** — overlapping sessions produce
`key (segment_id) collision during intents merge`.

### The shots

| # | Shot | What must be visible | Why it earns its place |
|---|---|---|---|
| 1 | **Gallery** | Several drops on one page, network pill reading **PREPROD**, each tile showing its own stock and bid count | One contract, many drops — the L5/L6 unlock |
| 2 | **Connect Lace** | The Lace popup, then the connected address in the header | Wallet connect on Preprod |
| 3 | Open **drop-demo-win**, type an amount | The number in the field | Say aloud: this number is never published |
| 4 | Click **Seal this bid** | The **"Sealing — proof, signature, block"** state. Do not cut the wait — that is the proof being built on your machine | The ZK work is the product |
| 5 | Approve in Lace → sealed | The sealed state and tx id | A circuit call landed |
| 6 | **Side-by-side privacy panel** | Left: your amount. Right: what the ledger shows — **no number on the right** | The single most important frame in the video |
| 7 | Reveal lands → **Open your envelope** | The revealed reserve appearing, then the **win** verdict | Reveal-day verdict, end to end |
| 8 | Switch to **drop-demo-soldout** → **Open your envelope** | **"This drop sold out."** and the hint that your bid cleared but the last unit went first | Stock enforcement, and that a sold-out bidder is told something different from a losing one |
| 9 | **Receipts** `/receipts/drop-soldout` | The three public facts in chain order; paste that drop's salt into the verify box and show the **hashes match** | Fairness is recomputed in the viewer's browser, not asserted |
| 10 | Terminal | `npm test --prefix contract` → **27 passed**; `npm test --prefix web` → **23 passed** | |
| 11 | GitHub Actions | Both jobs green | |

Lines worth saying out loud:

- Over shot 6: *"The amount is a Compact witness. It never touches the ledger — not for
  other bidders, not for a block explorer, not for us."*
- Over shot 8: *"Their bid cleared the reserve. They still didn't get it, because
  someone claimed the last one first — and the contract enforced that, not our server."*

### Two things you must not film

> ⚠️ **Never show the salt of an OPEN drop.** That discloses its hidden reserve before
> reveal and breaks the fairness claim outright. `drop-001` and `drop-002` are open
> until 2026-12-31 — their salts stay off camera, and so do their preimage files in
> `ops/vault/`.
>
> For shot 9 use **`drop-soldout`**, which is revealed, so its reserve is already public
> and its salt is safe to show. It lives in
> `ops/vault/drop-f81e44eaf0ac-drop-soldout.json` (`saltHex`).

> ⚠️ **Keep `ops/vault/` off screen** generally — it also holds the house seed and
> bidder secrets.

### After recording

1. Upload unlisted, then **check the link in an incognito window** before submitting.
2. Update the **Demo video** rows in [`README.md`](../README.md) and
   [`docs/submissions/L4/00-checklist.md`](submissions/L4/00-checklist.md), both of
   which currently carry a ⚠️ stale-video flag.

### If the seal fails on camera

Almost always DUST. The app pre-checks and says *"no DUST to pay the network fee yet"*
before the slow proof rather than after it. Register tNIGHT for DUST generation in Lace,
wait, retry — the bid is journalled locally before submission, so nothing is lost.

---

## Historical — L2 and L3 shot lists (Preview build)

> These produced <https://youtu.be/om0mTpbdXiU>. Kept because they describe the
> footage L2 and L3 were judged on. **Superseded for L4 by the list above** — they
> film the Preview single-drop build, which no longer reflects the product.

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
