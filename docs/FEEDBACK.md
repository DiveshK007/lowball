# Feedback loop

How feedback reaches us, what testers keep saying, and what actually changed
because of it.

## Where the feedback lives

**Google Sheet (primary artifact):** _not yet created — paste the link here._

The Sheet is the source of truth: timestamped, raw, and viewable by anyone with
the link. This file summarises it and links to it. It does not replace it, and a
submission that offers only this file is rejected.

The same URL goes in `VITE_FEEDBACK_FORM_URL` so the app links to the form
straight after a bid lands, next to the copyable transaction hash — the moment a
tester has something to say and the evidence to attach.

## How a response becomes evidence

1. A tester bids, then follows the form link shown with their transaction hash.
2. They paste their **wallet address** and **transaction hash** into the form.
3. We export the Sheet to CSV and run:
   ```bash
   cd ops && MIDNIGHT_NETWORK=preprod \
     npm run verify-users -- <export.csv> --markdown ../docs/USERS.md
   ```
4. `verify-users.ts` asks the Preprod indexer whether each hash really is a
   `placeBid` on the live contract, and regenerates [`USERS.md`](USERS.md) from
   what survives. Rows that fail are reported with a reason and are not listed.

**[`USERS.md`](USERS.md) is generated, never hand-written.** That is the point: a
hand-maintained table proves nothing.

## Recurring themes

_Nothing here yet — no tester responses have been collected._

This section fills in once the Sheet has responses. Themes are written in our
words and clearly marked as our summary; **individual quotes are reproduced
verbatim**, including typos, confusion and criticism. Feedback that has been
tidied into one smooth voice is the thing reviewers look for, so nothing here
gets smoothed.

## What we changed

Real changes, each tied to the feedback that caused it and the commit that made
it. Nothing in this table is aspirational.

| What changed | What triggered it | Source | Commit |
|---|---|---|---|
| Wrote [`docs/USAGE.md`](USAGE.md), leading with the tDUST step and the non-retroactive registration trap | *"DUST accrual — the thing that confused me for hours"* | Builder, first-run testing | `68d6135` |
| Fixed the homepage: drop cards and the hero CTA were rendering at opacity 0, so the gallery looked empty | L4 review: **"work on the ui"** | Program review | `97f9ead`, `9c32b97` |
| README now leads with one live contract address; superseded deploys moved into a collapsed history block | L2/L3 review: **"invalid CA"** — the cited address was a bare deploy with no drop on it | Program review | `52205a0` |
| Bid commitments accumulate in a per-drop set, so every bidder can open their own envelope | Only the most recent bidder could ever win; at 50 testers, 49 would be told "bid preimage mismatch" | Builder, pre-launch review | `1e4081d` |
| Stock enforced by claim order, with a "this drop sold out" message distinct from losing | A stock-1 drop could record unlimited winners | Builder, pre-launch review | `362552d` |
| Added 1AM alongside Lace, using its in-browser prover | Lace requires a local proof server, which is a hard stop for non-technical testers | Builder, onboarding friction | `0142b54`, `65e3eae` |
| Copyable transaction hash and a form link shown right after a bid | Testers cannot report a hash they have to select by hand out of truncated monospace | Builder, evidence-path design | `56cb520` |

**Source column is deliberate.** Program review and builder testing are not the
same as tester feedback, and labelling them honestly matters more than making the
table look fuller. Tester-driven rows appear here once the Sheet has responses.

## Open, not yet acted on

- The demo video predates multi-drop, the accumulator and stock enforcement.
  Shot list ready at [`demo-video-script.md`](demo-video-script.md).
- 1AM does **not** sponsor fees, so testers still need NIGHT registered for DUST
  generation. That is the single biggest onboarding cost and has no fix on our
  side; the usage guide explains it instead.
