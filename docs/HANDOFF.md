# LOWBALL — Handoff

**Written 2026-09-05.** Baseline commit: `ae4cb0c` (2026-08-24).

For an assistant or contributor who has only this repository. Everything below was
verified against the working tree, GitHub, the deployed Vercel bundle, and the
Midnight indexers on 2026-09-05. Where a claim could not be verified, it says so.

---

## 1. What changed since `ae4cb0c`

**Nothing. This document is the first commit since `ae4cb0c`.**

That is not a summary of small changes — it is literally zero. Verified:

- `git diff HEAD` is empty; every tracked file is byte-identical to `ae4cb0c`.
- No stashes, no branches other than `main`, no worktrees, and the reflog's newest
  entry *is* `ae4cb0c` — nothing was reset, amended, or orphaned.
- The only uncommitted paths are git-ignored: `web/dist/`, `ops/dist/`,
  `contract/midnight-level-db/`, `.claude/settings.local.json`, `.DS_Store`.
- The newest file anywhere in the repo is dated **2026-08-25 09:17**, and every
  file with that timestamp is a build output. `README.md` and
  `web/scripts/sync-contract.mjs` carry newer mtimes but identical content —
  touched by a rebuild, not edited.

Working sessions did take place between Aug 24 and Aug 30. They produced no code,
no docs, and no commits. **Do not assume undocumented work exists somewhere.** The
repository at `ae4cb0c` is the complete state of the project.

Consequence for the program: the L4 commit window currently contains **0 commits**.

---

## 2. L4 status against its checklist

| Requirement | Status | Evidence |
|---|---|---|
| MVP live on Preprod (verifiable address) | ⚠️ **Partial** | Address `1e7b6dee…6263272` deploys and verifies, but has **zero contract calls** — no drop exists on it, and the live app does not target it. See §3. |
| README + setup docs | ✅ | `README.md` has Prerequisites, Setup & Run Locally, Run Tests, CI/CD, Repo layout. |
| Usage docs (`docs/USAGE.md`) | ❌ **Missing** | File does not exist. |
| CI/CD passing | ⚠️ **Green but stale** | Two jobs (`compile + test contract`, `build + test web`), last run `32689123691`, success, **2026-08-24**. Nothing since. |
| X product profile linked | ❌ **Does not exist** | `docs/traction.md` names a *planned* handle `@lowballdrops` (fallbacks `@lowball_xyz`, `@playlowball`). No profile is live and nothing links to one. |
| 15+ commits | ❌ **0 in window** | 88 commits total, none since 2026-08-24. |
| Demo video | ✅ | https://youtu.be/om0mTpbdXiU (unlisted), linked from README. |
| Live Preprod demo link | ❌ | The live link is a **Preview** deployment, not Preprod. See §3. |

Tests: 3 test files — `contract/src/test/lowball.test.ts`,
`web/src/lib/format.test.ts`, `web/src/lib/midnight/hashes.test.ts`.

---

## 3. Which network the deployed app actually targets

**Preview. Not Preprod.**

Verified by fetching the live bundle from https://lowball-orpin.vercel.app and
grepping the deployed JS chunks (`index-ByxWSzgZ.js`, `providers-DD_G4Aeh.js`):

- `indexer.preview.midnight.network` — present
- contract `ae971dc989e4…343c48408` — present
- Preprod indexer or the Preprod address — **absent**

This comes from `web/.env`, which is committed and pins
`VITE_NETWORK_ID=preview` plus the Preview contract address.

### Is there a live drop on that network?

**A drop exists, but it is closed.** Three contracts are in play:

| Contract | Network | Latest on-chain action | Meaning |
|---|---|---|---|
| `ae971dc9…343c48408` | Preview | `ContractCall` → entryPoint **`checkWin`** | Drop **"Genesis Envelope"** exists; reserve revealed and a **win already claimed**. Not open. |
| `e5f6d470…3f7c4fc11` | Preview | `ContractCall` → entryPoint **`revealReserve`** | Reserve revealed; no successful `checkWin`. |
| `1e7b6dee…6263272` | Preprod | **`ContractDeploy`** | **Never called.** No drop was ever created on Preprod. |

`checkWin` asserts `status == DropStatus.REVEALED`, so its presence on `ae971dc9`
proves that drop is past OPEN. The contract holds one drop for its lifetime
(`createDrop` asserts the slot is unset), so **a new drop requires a new deployment.**

---

## 4. Broken, half-finished, or blocked

**Broken — the README makes two false claims about live state.**

1. `README.md` §Live Demo says the Preview contract has a **"drop open now"**. It
   does not; `checkWin` has been called. A visitor following the README's
   60-second walkthrough cannot place a bid — steps 3 through 5 are dead.
2. `README.md` §Contract Address attributes the completed end-to-end loop
   ("verdict win at 30 over a 25 tDUST reserve") to the **Preview L1 record**
   contract `e5f6d470…`. On-chain, that contract's last action is `revealReserve`
   — the win was claimed on `ae971dc9…` instead. The two contracts' descriptions
   appear to be swapped.

**Half-finished.**

3. `docs/USAGE.md` does not exist (L4 requirement).
4. Preprod is a bare deploy. To make "MVP live on Preprod" true, a drop must be
   created there **and** `web/.env` repointed at Preprod — currently neither.
5. The X product profile is planned only. `docs/traction.md` has the handle
   candidates, three post formats, and a 2–3/week drop calendar, with a hard rule
   never to publish any bid amount, including the winner's. None of it is executed.

**Blocked on the repo owner (cannot be resolved from the repo).**

6. Creating a new drop needs the house CLI in `ops/` and its vault, which is
   git-ignored and never committed. No assistant working from the repo alone can
   deploy a contract or open a drop.
7. Registering the X handle and posting.
8. Whether to redeploy on Preprod (satisfies L4 literally, costs the multi-hour
   genesis sync unless the checkpoint cache in `ops/vault/wallet-cache-preprod.json`
   still resumes) or stay on Preview (fast, but fails the L4 wording).

---

## 5. Open questions

1. **Was the L3 idea proposal approved at The Turn?** The repo owner stated on
   2026-09-05 that it was approved and that **L4 and L5 are now open**. No
   artifact in this repository records the approval; treat the owner's word as
   the source and file the confirmation somewhere durable.
2. L2/L3 drew a **"no commits in August"** response. That is wrong about this
   repo — 47 commits carry August 2026 dates (Aug 8–24) and GitHub attributes
   every one to `DiveshK007`. The likeliest mechanism is a window that opened
   after Aug 24, since there are **zero commits Aug 25–31**. Unresolved with the
   program.
3. Should the L4 submission target Preview or Preprod? This decides items 4 and 8
   above and is the largest single blocker.
4. Which X handle is actually registered, once one is?
5. Does the Preprod wallet checkpoint still resume from the tip, or has it aged
   out into a full genesis replay?

---

## Quick reference

- Repo: https://github.com/DiveshK007/lowball (public) · App: https://lowball-orpin.vercel.app
- Read `docs/superpowers/specs/2026-07-19-lowball-design.md` (what) and
  `docs/architecture.md` (how) before writing code; decisions log is spec §10.
- Never commit reserve preimages/salts, private keys, `ops/` vault files, or `.env` files
  beyond the already-committed `web/.env`.
