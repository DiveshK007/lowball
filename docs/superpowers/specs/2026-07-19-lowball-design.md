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

1. **Drop created** (admin): item (digital collectible record), stock (1 of N), hidden reserve price, close time. Only `hash(reserve, salt)` goes onchain, before any bid is possible.
2. **Player bids (sealed):** opens drop page → connects Lace → submits sealed bid. Bid amount is a private witness recorded as a commitment; no funds move at bid time (fallback funds path, §3.4/§10). Bids stay sealed for the whole window — nobody, including the house, learns any amount.
3. **The Reveal (drop closes):** house reveals `(reserve, salt)`; contract verifies it matches the original commitment. This is the appointment moment — countdown on the drop page, everyone comes back for it.
4. **Verdicts at reveal:** each bidder runs `checkWin` against the now-revealed reserve — proving bid ≥ reserve *without disclosing their amount*:
   - Cleared the reserve → **WIN at your price** (still never shown publicly). Pay on `claimItem`; unpaid claims expire (`CLAIM_GRACE`) and stock returns.
   - Under the reserve → nothing to do, nothing revealed. Losing amounts and near-misses stay sealed forever (comeback hook).
5. **Receipts:** public page shows commitment → reveal verification for anyone.

Rules: one bid per wallet per drop; if more bids clear the reserve than stock, **bid-order priority** (earlier sealed bids win — first-come spirit preserved). No highest-bidder ranking in v1 — YAGNI.

> **Changed at L1** (was: instant verdict at bid time). A bidder-side circuit cannot compare against a hash commitment without knowing the preimage, so a truly-blind instant verdict isn't achievable — verdicts land at reveal. Product upside: the reveal becomes a shared suspense moment (blind-box mechanics). See §10.

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
- **2026-07-19 (L1):** Adopted spec §3.4 fallback funds path — `placeBid` records a bid commitment only; no shielded value moves at bid time. Shielded escrow deferred pending an L2 spike against Preprod. Reason: shielded primitives exist in stdlib but no stable dApp examples use them yet (see `docs/spikes/escrow-feasibility.md`).
- **2026-07-19 (L1):** `closeTime` stored on drop but *not enforced in-circuit* yet — deadline guards (`blockTimeLt`) land at L3 alongside claim + expiry paths. Reason: keeps L1 minimal per P1 scope; primitive availability already verified (see `docs/spikes/circuit-time.md`).
- **2026-07-19 (L1):** Single-drop-per-contract for L1 skeleton — no `drops: Map<DropId, …>` yet. Multi-drop support lands with L2/L3. Reason: keeps the L1 skeleton small enough to fully test the verdict machinery without paying map-syntax cost twice.
- **2026-07-19 (L1):** Verdict is computed at `checkWin` (post-reveal), not at `placeBid`. Reason: no known primitive gives a truly-blind verdict against a hash commitment without leaking the reserve to the bidder. **Product consequence accepted:** §3 rewritten from instant-verdict to reveal-day verdicts — the reveal countdown becomes the core engagement moment (blind-box mechanics). Frontend calls `checkWin` the instant the reveal lands so verdicts feel immediate *at* the reveal.
- **2026-07-19 (L1, spec):** Winner selection when multiple bids clear the reserve: bid-order priority while stock lasts (earlier sealed bid wins). Keeps first-come spirit; simplest to prove; no ranking.
- **2026-07-29 (L2):** Web uses an in-memory `PrivateStateProvider` (`web/src/lib/midnight/private-state.ts`) instead of the SDK's level-backed one, which cannot run in a browser (its `abstract-level` dependency extends node's `EventEmitter`). Consequence: witnesses live only for the duration of a call; the durable record is the user-owned bid journal in `lib/persistence`. No effect on the privacy table — less is persisted, not more.
- **2026-07-29 (L2):** The compiled contract bindings and ZK prover/verifier keys are committed under `web/src/lib/midnight/generated/` and `web/public/{keys,zkir}/` via `npm run sync:contract`. Reason: `contract/src/managed/` is git-ignored and the Vercel build has no Compact compiler, so the web deploy needs its own copies. Only `placeBid` and `checkWin` prover keys ship (~5.7 MB); `createDrop`/`revealReserve` are house-side.
- **2026-07-29 (L2):** Bids are journalled to local storage *before* submission, not after confirmation (architecture §5.2 pending journal). A pending record reconciles against the drop's `latestBidCommitment` on the next chain read, so a tab that dies mid-proof neither loses the secret nor risks a double bid.
- **2026-07-30 (L1):** L1 contract deploys to **Preview**, not Preprod. Reason: Preprod's full in-memory genesis sync of the shielded ledger (~1.35M coins) needs ~8 GB+ *live* heap and OOMs on this 16 GB machine (GC frees nothing at the 8 GB ceiling); Preview's ~18k-event ledgers sync in seconds with a megabyte-scale footprint. L1's testnet checkbox accepts either network. Fixed a wallet-SDK version skew en route (`ledger-v8` 8.1.0 vs `wallet-sdk-shielded` 2.1.0 → `pendingOutputs.values().map` crash) and hardened sync against transient `Wallet.Sync` blips with a bounded retry. See `docs/spikes/preprod-sync-memory.md`. **Consequence:** README `## Contract Address` table carries both networks (Preprod row deferred); a real-tDUST Preprod/mainnet deploy at L4+ needs a checkpoint sync or a 32–64 GB host.
- **2026-07-31 (L2):** Web restyled to **"quiet catalogue, loud reveal"** (serving spec §5.2's "the drop page carries the product feel"). The 90% is ink on cool porcelain — *Instrument Serif* display + *IBM Plex Mono* for all data — an auction-catalogue register, chosen deliberately against the cream+serif / near-black+acid-green AI-default clusters. Saturated colour is spent in exactly one place, the reveal moment: electric violet `#6A2BFF` while the envelope waits, a hot-rose flood `#FF2E63` on a win, an ink blackout on a loss (the page goes dark; the secret stays sealed). The countdown is promoted from an inline stat to a full loud reveal-clock block; the verdict floods its whole card. Re-skin only — the component/hook contract and the `lib/midnight` SDK boundary are unchanged.
- **2026-08-20 (L4):** Web identity replaced: **"quiet catalogue, loud reveal" → "Sealed Wax"** (auction house after hours). Warm bitumen ground `#14100E` (never pure black), parchment type, `#C9A227` gilt used exactly once as the wordmark/rule hairline, and sealing-wax `#B7263A` as the single saturated accent — still spent only at the reveal (countdown, verdict, seal). Type is Bodoni Moda display + IBM Plex Sans/Mono. **Reason:** the previous violet `#6A2BFF` sat squarely in the "purple/blue AI-gradient" fingerprint that the `redesign-existing-projects` audit names as the most common AI design tell, and the design was pure-flat with generic card treatment. Sealed Wax is literal to the envelope metaphor and reads as physical stock. Mechanics adopted from `high-end-visual-design`: nested bezels with inset highlights, ground-tinted (never black) shadows, one weighted easing `cubic-bezier(.32,.72,0,1)`, fixed film-grain overlay, `IntersectionObserver` staggered entry, `100dvh`, GPU-only animation. Audited against the Vercel web-interface-guidelines: added skip link, `aria-live` status region, semantic `nav`/`main`, focus-visible rings, `prefers-reduced-motion` blanket, tabular numerals, `text-wrap: balance`, branded 404, theme-color, og/twitter cards, apple-touch-icon and web manifest. Verified with Playwright at 1440px and 390px. **Consequence:** the L2 "quiet catalogue" entry (2026-07-31) is superseded; `docs/submissions/L2/*.jpg` show the old skin, `docs/submissions/L4/*.png` show the current one.
- **2026-08-20 (L4, supersedes the Sealed Wax entry above):** Web rebuilt as **"Ice & Petrol"** — a verification instrument rather than a storefront. Cool light ground `#F4F6F8`, slate ink `#1A2024`, and deep petrol `#00636B` as the single signal colour, still spent only where the chain reveals something. Type is Space Grotesk (tight geometric display) + IBM Plex Sans/Mono, with every data-bearing value in mono and tabular. **This pass changed structure, not just tokens** — the previous Sealed Wax attempt was a palette swap on an unchanged layout, which is the "everything centred and symmetrical / three equal card columns" pattern the audit skill flags: floating **island nav** detached from the top edge (was an edge-to-edge sticky bar); **asymmetric bento** gallery with a dominant feature tile and information tiles carrying real chain data (was equal card columns); **asymmetric drop page** at 1.45fr/1fr (was two equal columns); opt-in **tray + core** nesting where depth carries meaning; a faint fixed blueprint grid instead of flat fill; magnetic buttons with a nested trailing disc; one weighted easing plus a spring for presses; an ambient sweep on the live countdown. **Bug found and fixed in the same pass:** the first attempt hid `.reveal` elements with `clip-path: inset(0 0 100% 0)`, which collapses the element's intersection area to zero so `IntersectionObserver` never fires — the hero and entire bento rendered invisible. Hidden state is now opacity/transform only, threshold dropped to 0, and `useReveal` has a 1.6s failsafe that force-reveals anything still hidden. Verified with Playwright at 1440px and 390px; evidence in `docs/submissions/L4/`.
- **2026-08-21 (L4):** Ice & Petrol **refined against Apple's craft** — palette kept, discipline borrowed (per the `design-system` skill's own rule: base one reference, take accents from another; never copy a reference's colours wholesale). Adopted: **SF Pro via `-apple-system`** for all UI text (the real face, OS-licensed, with optical sizing handled by the system — Space Grotesk is retained only for the wordmark); **negative tracking at every size** rather than headlines alone (-0.045em display → -0.022em body, Apple's universal tightness); headline line-height compressed to **1.07**; weights held to **400/600**; **borderless surfaces** — elevation now comes from background contrast plus a *single* soft diffused shadow (`3px 5px 30px / 10%`, tinted with the ground's hue) replacing the previous layered inset+shadow stack; radius collapsed to Apple's **8 / 12 / 980px-pill** scale; nav glass switched to Apple's exact `saturate(180%) blur(20px)`; the blueprint grid dialled from 0.5 → 0.18 opacity (Apple's grounds are solid); vertical rhythm widened ("compression within, expansion between"). Petrol remains the sole accent reserved for interactive/reveal elements — structurally the same rule Apple applies to Apple Blue. Verified: build clean, 15/15 web tests, Playwright at 1440px. Evidence `docs/submissions/L4/05-apple-gallery.png`, `06-apple-drop.png`.
- **2026-08-21 (L4):** Added a **luxury layer over the Apple refinement** (base Ice & Petrol, accent Superhuman — per the `design-system` skill's rule of one base plus accents, never a wholesale colour copy). The Apple pass had become *too* reductive: correct but bland, because Apple's restraint depends on product photography we don't have to carry the visual weight. Superhuman's core gesture — *"opening a luxury envelope"*: one dramatic gradient hero against an otherwise quiet page — is almost literally our product, so it was adopted in petrol rather than their purple. Changes: the hero is now a deep **petrol-to-abyss gradient panel** (`#0a3138 → #06232a → #04191e`) with a blurred radial **atmospheric bloom** and translucent-white type, sitting on the quiet ice ground; display line-height compressed further to **0.96** (Superhuman's architectural compression) at the **off-stop weight 540** — deliberately between Medium and Semibold; the primary hero CTA is **warm bone `#ECE7DE`**, understated rather than saturated (Superhuman's "luxury not aggression" rule); radius simplified to Superhuman's **binary 8/16**; surfaces gained a whisper of vertical gradient so they read as material rather than flat fill (a deliberate break from Apple's flat-ground rule, which was the main source of the blandness); signal tile, reveal clock and win verdict gained a highlight sweep plus hairline translucent border for depth. Petrol remains the only accent. Two bugs fixed in the same pass: the hero CTA stretched full-width (grid children stretch — needed `justify-self: start`, not just `align-self`), and the banner crowded its action button under 768px (now stacks). Verified: build clean, 15/15 web tests, Playwright at 1440px and 390px. Evidence `docs/submissions/L4/07-luxury-hero.png`, `08-luxury-drop.png`, `09-luxury-mobile.png`.
