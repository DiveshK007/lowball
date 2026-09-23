# L4 UI rejection — what was broken and what changed

L4 came back with **"work on the ui"**. This is the cause and the evidence.

## The cause: the gallery rendered invisible

`useReveal` snapshotted every `.reveal` element **once** on mount and observed
only those. The drop cards render *after* the async chain read resolves, so they
were never observed — and the 1.6s failsafe iterated the same stale snapshot, so
it never touched them either. They sat at `opacity: 0` permanently.

Measured on a local rebuild of the pre-fix commit (`56cb520`):

```
total .reveal: 12   stuck at opacity 0: 4   hero CTA opacity: 0
drop cards: 3       eyebrows: ["Drop #001", "Drop #000", "Drop #000"]
```

`12-before-gallery-desktop.png` shows the result: no "Open the drop" button and a
large empty void where all three drop cards should be.

## What changed

| # | Problem | Fix | Commit |
|---|---|---|---|
| 1 | Late-mounted cards never revealed | `MutationObserver` picks up late arrivals; failsafe sweeps the live DOM, not a snapshot | `9c32b97` |
| 1b | Hidden state outranked the revealed state | `[data-reveal-armed] .reveal` (0,2,0) beat `.reveal--in` (0,1,0), so *nothing* showed. Matched the specificity | `97f9ead` |
| 2 | Second and proof drops read "Drop #000" | Number parsed from the slug; unnumbered drops labelled by name | `9c32b97`, `4da06c9` |
| 3 | "1-of-1 collectible" while stock was 50 | Copy derived from chain stock via `describeStock()` | `9c32b97` |
| 4 | Sold-Out Proof sat in the product gallery | Moved to a labelled "Proofs — drops kept as evidence" section | `9c32b97` |
| 5 | ✉️ emoji card art and seal glyphs | Drawn SVG marks (`DropMark`, `SealGlyph`) in the design system's palette | `9c32b97`, `9669a48` |
| — | Tiles stretched, leaving dead space | Bento sizes tiles to content | `986129f` |
| — | "Connect Lace to seal" / "LOWBALL needs Lace" | Copy covers both wallets, 1AM first | `346ee1d`, `9669a48` |

## Verified on the deployed build, not locally

The reveal bug only appears against real async chain reads, so it was verified on
production rather than a local build:

```
total .reveal: 12   stuck at opacity 0: 0   hero CTA opacity: 1
product cards: 2    proof items: 1
eyebrows: ["Drop #001", "Drop #002"]
card copy: ["50 of 50 units still unclaimed.", "25 of 25 units still unclaimed."]
```

**Defence in depth:** the hidden state is scoped to `[data-reveal-armed]`, which
only JS applies. If the reveal hook never runs at all — bundle 404, hydration
failure — nothing is hidden in the first place. Invisible content is a far worse
failure than a missed animation.

## Screenshots

| File | What |
|---|---|
| `12-before-gallery-desktop.png` | Pre-fix: no CTA, cards invisible |
| `13-before-gallery-mobile.png` | Same at 375px |
| `14/15-after-gallery-*` | Fixed gallery, desktop + mobile |
| `16/17-after-drop-*` | Drop page |
| `18/19-after-receipts-*` | Public receipts |
