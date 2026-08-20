# Traction engine — X profile, post formats, drop calendar

L4 requires a public product X profile that posts every drop; L5 requires a
2–3/week drop calendar and 50 unique bidding wallets. This is the content
scaffolding for both. Spec §8 is the strategy; this is the executable version.

The unit of growth is **the drop as content**. Every drop produces three posts,
and each one is generated from data the chain already made public — so posting
never leaks a bid.

## Account setup (one-time, human)

- Handle: `@lowballdrops` (fallback: `@lowball_xyz`, `@playlowball`)
- Bio: `Name your price on a mystery drop. Reserve sealed onchain before you bid — your number stays sealed forever. Built on @MidnightNtwrk.`
- Link: https://lowball-orpin.vercel.app
- Pinned: the drop-01 receipts thread (proves fairness before asking for a bid)

## The three post formats

### 1. Drop opens

```
🎰 Drop #001: Genesis Envelope

Reserve sealed onchain — I can't move it, and I can't see what you bid.

Lowball it: lowball-orpin.vercel.app/drop/drop-001

commitment e69a2875…dc138d
```

Rules: always include the commitment hash (that is the trust anchor), always
link the drop, never state or hint at the reserve.

### 2. Reveal / receipts thread

```
Drop #001 closed. Reserve was 25 tDUST.

Sealed before the first bid: e69a2875…dc138d
Revealed after close: 25 tDUST
The contract checked the hash itself — a tampered reveal can't pass.

Recompute it yourself (no wallet):
lowball-orpin.vercel.app/receipts/drop-001
```

This is the highest-credibility post type: it invites verification rather than
asking for trust. Post it every close, win or no win.

### 3. Winner flex card

```
Someone stole Drop #001 for a number nobody will ever see 🤫

Bid amounts are Compact witnesses — they never touch the ledger.
The explorer shows a bid happened. It does not show what it was.
```

Rules: never post the winning amount, even when the winner shares it publicly —
the product promise is that *we* cannot and do not disclose it. If a winner wants
to flex their number, they quote-tweet; the house account stays silent on amounts.

## Drop calendar (L5 target: 2–3/week)

Keep drops small and frequent — the appointment matters more than the prize.

| Slot | Day (UTC) | Reveal window | Notes |
|---|---|---|---|
| A | Mon 18:00 | 24 h | opens the week; heaviest promo |
| B | Wed 18:00 | 24 h | mid-week; experiment with item type |
| C | Sat 16:00 | 24 h | weekend; best for higher-value items |

Running one costs two commands (see `ops/README.md`):

```bash
# open a drop (stores the reserve preimage in the git-ignored vault)
MIDNIGHT_NETWORK=preview DROP_RESERVE=25 DROP_STOCK=1 DROP_CLOSE_MINUTES=1440 \
  npm --prefix ops run create-drop

# after close: reveal, which unlocks every bidder's verdict
MIDNIGHT_NETWORK=preview npm --prefix ops run close-and-reveal
```

Post format 1 goes out when `create-drop` returns; formats 2 and 3 when
`close-and-reveal` returns.

## What never gets posted

- Any bid amount, including the winner's.
- Any reserve before its reveal.
- Any hint of how close a losing bid was — the whole point is that this is
  unknowable, and implying otherwise would be a lie about the product.
