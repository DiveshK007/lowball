# Second UI rejection — overflow and the contract link

Feedback: *"work on the ui overflow"* and *"the contract address link redirects to
your website instead of the explorer, and work more on the ui"*.

## 1. The contract address link went to our own site

`README.md` line 20 hyperlinked the contract address to
`https://lowball-orpin.vercel.app/drop/drop-001` — our own drop page, not the
explorer. A reviewer clicking the address to verify it on chain landed back on
the thing they were trying to verify.

**Fixed.** The address now links to
`https://explorer.preprod.midnight.network/contracts/f81e44ea…` (verified **200**),
with a separate "open the drop" link beside it. Every address mention in the L2,
L3 and L4 checklists is now a clickable explorer link too.

The app was already correct: `explorerContractUrl` uses the plural
`/contracts/` form. Confirmed both formats directly —
`/contracts/<addr>` → **200**, `/contract/<addr>` → **404** — and confirmed the
live drop and receipts pages emit the 200 form.

## 2. The wallet picker overflowed the masthead

With both 1AM and Lace injected, the old picker rendered an icon, a name and a
full description *per wallet, inline in the header*. Measured on a rebuild of the
pre-fix commit with both wallets stubbed:

| Width | Page overflow | Masthead overflow | Bleeding elements |
|---|---|---|---|
| 1440 | 0 | **80px** | — |
| 375 | **219px** | **231px** | `wallet-picker`, `wallet-picker__option`, `wallet-picker__blurb` |

`21-before-picker-overflow-1440.png` shows the result: *"Lace Needs a local proof
server running on p**1AM**3**0**oves in your browser…"* — the two wallets' labels
overlapping each other and running off the header, exactly as reported.

**Fixed** by replacing the inline picker with a single **Connect wallet** button
that opens a menu (`WalletPicker.tsx`). The header is now a fixed width no matter
how many wallets are installed, and the descriptions have room to be read. The
menu closes on Escape and on outside click, and each item calls `connect(key)`
straight from its own click handler so the wallet pop-up keeps its user
activation.

**Measured on the deployed build, both wallets stubbed, menu closed and open:**

| Width | 1440 | 1280 | 1024 | 768 | 375 |
|---|---|---|---|---|---|
| Page overflow | 0 | 0 | 0 | 0 | 0 |
| Masthead overflow | 0 | 0 | 0 | 0 | 0 |
| Menu inside viewport | ✅ | ✅ | ✅ | ✅ | ✅ |

> The wallet icons render as grey circles in these captures because the test stub
> supplies an empty `icon`. Real wallets provide one and it renders via `<img>`.

## 3. Everything else the sweep found

An audit ran on **every page × 1440/1280/1024/768/375**, checking for elements
bleeding past the viewport, horizontally clipped text, anything left at opacity 0,
broken images, and sub-32px tap targets on touch widths.

| Problem | Where | Fix |
|---|---|---|
| Masthead overflowed by 61px | all pages @375 | Narrow-width rules; the network pill (also shown on the gallery and in the footer) drops below 560px |
| Banner 443px wide inside a 351px column — **37 elements** dragged off-screen | drop pages @375 | `min-width: 0` on `.banner`; grid/flex children default to `min-width: auto` and refuse to shrink below their content |
| Bid field and its `tDUST` suffix pushed 43px off-screen | drop pages @375 | `min-width: 0` on `.field`, `.field__control` and the input |
| Tap targets 19–25px | gallery and receipts @375 | Padding to a 34px minimum, type scale untouched |
| `▾` rendered as a stray dot; menu toggle wore an external-link arrow | all | Drawn SVG chevron; `::after` arrow suppressed on the toggle |

**Final audit, deployed build — 0 issues on every page at every width.** Console
clean. Gallery @1024 flagged 5 once during a rapid loop and 0 on three settled
re-runs; it was the page not having finished its chain read, not a layout bug.

**One honest note on method.** The first masthead fix included
`body { overflow-x: hidden }`, which would have *hidden* the overflow rather than
fixed it — and made every measurement read 0 regardless. It was removed and the
numbers above were re-measured without it, so they reflect a real layout fix.

## Screenshots

| File | What |
|---|---|
| `21-before-picker-overflow-1440.png` | Pre-fix: wallet labels overlapping, running off the header |
| `22-before-picker-overflow-375.png` | Pre-fix at 375px |
| `23-after-wallet-menu-1440.png` | Menu open, contained |
| `24-after-wallet-menu-375.png` | Menu open at 375px |
| `25-after-drop-375.png` | Drop page at 375px, no overflow |
