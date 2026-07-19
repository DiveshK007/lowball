# LOWBALL — Design Spec
**Date:** 2026-07-19 · **Program:** New Moon to Full: Monthly Moonshots on Midnight (Rise In)
**List primitive:** Sealed-Bid Auction (private bids, verifiable winner) · **Category:** Consumer focus
**Author:** Bond (solo, full-stack) · **Status:** Approved design, pre-implementation

> When you scaffold the repo, move this file to `docs/superpowers/specs/2026-07-19-lowball-design.md` and commit it as the first meaningful commit.

## 1. One-liner

Provably-fair mystery drops: name-your-price gacha where the reserve price is committed onchain before any bid, bids are sealed forever, and winners pay exactly what they offered. Priceline × blind-box mania × degen flex content — single-player vs the house.

## 2. Why this wins the program

- **Traction-shaped:** one user + one device. No coordination, no counterparty. 50 Preprod users = 50 strangers clicking a challenge link independently.
- **Primitive nobody else picks:** cohort-mates skip sealed-bid because "auctions need crowds." The house-as-counterparty (smart contract) removes the crowd requirement.
- **Privacy is load-bearing:** the game cannot exist without sealed bids and a committed hidden reserve. Not decoration — mechanic.
- **Content engine:** every drop is a post, every win is a flex card, every close is a receipts thread. Feeds the required X product profile.

## 3. Core loop

1. **Drop created** (admin): item (digital collectible record), stock (1 of N), hidden reserve price. Only `hash(reserve, salt)` goes onchain, before any bid is possible.
2. **Player bids:** opens drop page → connects Lace → submits sealed bid in tDUST. Bid amount is a private witness; escrow is shielded.
3. **Instant verdict** (ZK circuit compares bid vs committed reserve):
   - Bid ≥ reserve → **WIN at your price.** Item ownership recorded, escrow kept by house.
   - Bid < reserve → **auto-refund.** No information revealed about how close the bid was (near-miss mystery = comeback hook).
4. **Drop closes** (sold out or deadline): house reveals `(reserve, salt)`; contract verifies it matches the original commitment. Public receipts page shows the verification.

Rules: one active bid per wallet per drop; re-bid allowed after a refund; first-valid-bid-wins per unit of stock (no highest-bidder ranking in v1 — YAGNI).

## 4. Privacy model (README "privacy model" section, verbatim target)

| Observer can see | Observer can NEVER see |
|---|---|
| Drop exists, item metadata, stock remaining | Any bid amount (including losing bids) |
| Reserve **commitment** (hash) | What a winner actually paid |
| Number of bids placed | How close a losing bid was |
| Winner claim proofs (item ownership) | Which wallet bid vs. merely browsed |
| Revealed reserve **after** close + match proof | House's reserve before close |

**Even the house cannot** see bids pre-verdict → cannot selectively accept or front-run. `disclose()` appears exactly twice in the codebase: (a) winner's item claim, (b) post-close reserve reveal. Narrative: *the only public things are the things that keep the house honest.*

## 5. Architecture

Three units, one repo (monorepo folders: `contract/`, `web/`, `ops/`).

### 5.1 Contract (Compact) — `contract/`
Single contract, circuits:
- `createDrop(commitment: Bytes32, stock: Uint, closeTime: Uint, metaRef: Bytes)` — admin-only.
- `placeBid(dropId)` — witnesses: `bidAmount`, `bidderSecret`. Inside circuit: check drop open + stock > 0; compare `bidAmount` against reserve via commitment scheme; on win decrement stock and record claim right; on loss trigger refund path. Shielded tDUST escrow in, kept (win) or returned (loss).
- `claimItem(dropId)` — winner discloses claim; item record assigned.
- `revealReserve(dropId, reserve, salt)` — post-close only; contract asserts `hash(reserve, salt) == commitment`; discloses reserve.

Ledger (public) state: drops map (commitment, stock, closeTime, metaRef, bidCount, revealed reserve), claims. Private state: bid amounts, bidder↔drop linkage.

### 5.2 Web app — `web/`
React + TypeScript + Vite + Midnight.js SDK + Lace DApp connector. Static hosting (Vercel). No backend server in v1 — the chain is the backend.

Screens: **Gallery** (live/past drops) · **Drop page** (the ritual: sealed-envelope bid animation → verdict reveal moment; this screen carries the entire product feel) · **My Shelf** (won items) · **/receipts/:dropId** (public verification page, no wallet needed) · **Onboarding** (Lace install → faucet → first bid in under 5 minutes, hand-held).

### 5.3 Ops — `ops/`
TS CLI: `create-drop` (generates reserve + salt, stores preimage in local encrypted file, submits commitment), `close-and-reveal` (submits reveal, posts receipts data). House keys never in the web app.

## 6. Testing & failure posture

Contract tests (L3 gate minimum, aim higher): win path · refund path · reveal-tamper rejection (wrong preimage must fail) · stock exhaustion · double-claim rejection · bid-after-close rejection.

App failure states handled explicitly: proof server down (retry + banner) · Lace absent (guided install) · tx timeout (persisted pending state, resume on reload) · drop closes mid-bid (graceful refund path).

CI: GitHub Actions — `compact compile` + full test suite on every push, badge in README.

## 7. Program roadmap (level = shippable slice)

| Level | Ship | Program checkboxes |
|---|---|---|
| **L1 New Moon** | Toolchain; minimal contract (`createDrop`/`placeBid` skeleton/`revealReserve`) compiling + deployed to Preprod; README with idea paragraph + public-state-vs-witness section | compile screenshot, deploy address screenshot, managed/ dir, tests passing, **5+ meaningful commits** |
| **L2 Waxing Crescent** | Lace connect/disconnect; first sealed bid from UI; live demo link. Observable privacy behavior: **win a drop while the explorer shows no amount anywhere** | demo video (connect + circuit call), Preprod address, privacy claim in README, **8+ commits** |
| **L3 First Quarter** | Full loop polished; 3+ tests; CI running; submit idea (Sealed-Bid Auction / Consumer focus) | test-output screenshot, CI badge, 1-min demo video, privacy-model README section, proposal submitted, **10+ commits** |
| **The Turn** | Idea approval → commit | — |
| **L4 Waxing Gibbous** | MVP live on Preprod; docs site/README complete; X profile live, posting every drop | public product X profile |
| **L5 Full Moon** | Mentor market-fit checkpoint **before onboarding** (hard program rule); drop calendar 2–3/week; in-app 1-question feedback widget after each verdict; **50 unique bidding wallets** (provable onchain) | living feedback loop evidence |
| **L6 Supermoon** | Mainnet deploy; brand assets (logo, flex-card template, site polish); launch-week drops; **20 real users** | iterate on feedback |

## 8. Traction engine

Unit of growth = **the drop as content**. Post format: "🎰 Drop #N: [item]. Reserve sealed onchain. Lowball it." Win flow ends on a shareable flex card ("stole Drop #N for 12 tDUST 🤫"). Close flow ends on a receipts thread (reveal + verification link). Seed channels: Midnight/Cardano Discords, the program cohort itself (mutual-testing economy — LOWBALL is the easiest cohort dApp to try), CT replies on Midnight posts. Onboarding page owns faucet friction end-to-end.

## 9. Risks & mitigations

1. **Shielded escrow feasibility** — sealed-bid escrow assumes shielded tDUST transfer callable from a circuit with refund. **L1 includes a spike to verify this in the current SDK.** Fallback v1: commit-based bidding without real escrow (bid recorded as commitment; winner pays on claim; non-payment = claim expires and stock returns). Loop and privacy story survive intact.
2. **Reserve-preimage loss** — losing salt bricks a drop's reveal. Ops CLI stores preimages redundantly (local + encrypted backup); `closeTime` auto-expiry refunds bids on unrevealed drops so users are never stuck.
3. **Gambling optics** — losing bids always fully refund; no rake on losses in program version; items are collectibles, not wagers. State this in README.
4. **Solo-builder scope** — v1 cuts: no multi-bidder ranked auctions, no creator self-serve, no indexer, no accounts. Startup features come after L6.

## 10. Decisions log

- First-valid-bid-wins (not highest-bidder ranking) — instant verdicts beat auction-close suspense for single-player feel.
- Near-miss information never revealed — mystery drives re-bids; also simplest privacy story.
- Category: Consumer focus (Gaming defensible; Consumer chosen for startup framing).
- No backend server in v1 — chain + static hosting only.
- Name LOWBALL is a working title; collision-check before mainnet branding (L6).
