# LOWBALL — Handoff

**Updated 2026-09-12** (bid accumulator).

For an assistant or contributor who has only this repository. Everything below was
verified against the working tree, GitHub, the deployed Vercel bundle, and the Midnight
indexers. Where a claim could not be verified, it says so.

---

## 1. Current state

**The app runs on Preprod, on a multi-drop contract with two drops open, and every
bidder on a drop can prove their own win.** Preview → Preprod on 2026-09-05; multi-drop
on 2026-09-12; bid accumulation the same day.

| | |
|---|---|
| **App** | https://lowball-orpin.vercel.app |
| **Contract** | `72dfe0295bb744874f6b5a7ed961f2b5dd4b883666f7dd87d4fd2260f169a4b1` (multi-drop + bid accumulator) |
| **Deploy** | block 2,520,320 |
| **Drops open** | `drop-001` Genesis Envelope, stock 1 · `drop-002` Second Envelope, stock 2 |
| **Both close** | **2026-11-01** — deliberately past the end-of-September judging window |
| **Proof drop** | `drop-proof` — closed; 3 distinct bidders, 3 sealed bids, **3 winners** |

Reserves are sealed; only their commitments are public. **Never publish a live drop's
reserve.** It was leaked into the README once and went unnoticed for a week (fixed
2026-09-12); publishing it defeats the entire sealed-bid mechanic.

Verify without a wallet — `entryPoint: "createDrop"` means open and unbid:

```bash
curl -s -X POST https://indexer.preprod.midnight.network/api/v3/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{contractAction(address:\"72dfe0295bb744874f6b5a7ed961f2b5dd4b883666f7dd87d4fd2260f169a4b1\"){__typename ... on ContractCall{entryPoint}}}"}'
```

Superseded addresses, kept in the README because they are the evidence earlier levels
were judged on: `edae3255…` (Preprod, multi-drop but single-bid-slot),
`3fac6305…` (Preprod, single-drop, one drop closing 2026-09-19),
`1e7b6dee…` (Preprod, bare deploy, never had a drop), `ae971dc9…`
(Preview, full loop, win claimed), `e5f6d470…` (Preview, L1 record, reveal only).

## 2. L4 status

| Requirement | Status |
|---|---|
| MVP live on Preprod (verifiable address) | ✅ |
| Live Preprod demo link | ✅ verified in the deployed bundle |
| README + setup docs | ✅ |
| CI/CD passing | ✅ |
| Demo video | ✅ https://youtu.be/om0mTpbdXiU |
| `docs/USAGE.md` | ✅ first-time bidder guide, linked from the README |
| **X product profile** | ❌ **does not exist** — handle candidates only, in `docs/traction.md` |
| **15+ commits in window** | ⏳ accumulating since 2026-09-05 |

The idea proposal was **approved at The Turn** (confirmed on or before 2026-09-05),
which opened L4 and L5. Recorded in `docs/submissions/L4/00-checklist.md` and
decisions log §10, because nothing else in the repo captured it.

## 3. Traps this repo has already sprung

Read these before changing networks or touching the wallet scripts.

1. **`web/.env` is git-ignored and has never been committed.** The deployed app takes
   its configuration from the **defaults in `web/src/config/index.ts`**, never from
   `.env`. This is exactly how the app silently kept reading Preview: local runs looked
   right because `.env` supplied the right values. Keep the defaults and
   `web/.env.example` in step, and **verify the built artefact, not the source**.
2. **The house scripts print a `txId` that is not the transaction hash.** It is a
   69-character *identifier*; the indexer and explorers key on a 64-character hash.
   A wrong hash sat in the README and the L3 checklist for weeks because of this.
3. **A wedged dust sync does not fail — it freezes.** The SDK swallows the replay error,
   so nothing throws and no retry is logged; the `applied` counter simply stops. Judge
   progress by the counter, never by waiting for an exit.
4. **Preprod wallet sync needs a raised heap.** The default 4 GB V8 limit OOMs during a
   dust replay. `deploy:preprod`, `create-drop` and `close-and-reveal` set
   `--max-old-space-size=9216`.
5. **Recompiling the contract is not enough — `ops/managed/` must be re-synced.**
   `contract/scripts/deploy.ts` imports the `Contract` class from `ops/managed/` on
   purpose (one runtime tree), so a deploy after a recompile without
   `npm --prefix ops run sync:contract` ships the **previous** contract, silently. This
   happened once and only surfaced as a puzzling `bid preimage mismatch` on chain.
   `predeploy:preprod` and the ops `pre*` hooks now run the sync automatically.
6. **Run wallet sessions strictly sequentially.** Two overlapping sessions produced
   `key (segment_id) collision during intents merge`; re-running alone succeeded.
7. **A new drop no longer needs a deployment.** Since 2026-09-12 one contract holds many
   drops, keyed by a 32-byte id (the slug, UTF-8 zero-padded); `create-drop` takes
   `DROP_ID`. Three Compact traps came with it: a `lookup` of a missing key is a
   *dynamic error*, so guard every read with `member()`; nested ledger values need
   `default<…>` initialising before first use; and a `Counter` nested in a `Map` reads
   back as its ADT, so it needs `.read()`.

## 4. Operational notes

- **Node 22 required**: `PATH="/Users/bond/.nvm/versions/node/v22.18.0/bin:$PATH"`.
- **Proof server**: `docker run -d --name lowball-proof-server -p 6300:6300 midnightntwrk/proof-server:latest midnight-proof-server -v`, expect HTTP 200 on `127.0.0.1:6300`.
- **Long syncs**: `ops/sync-preprod.sh` supervises a Preprod sync to completion —
  it restarts to reset the working set early on (throughput decays as the dust state
  grows), stops cycling past 60% because a large restore then costs more than it saves,
  and restarts on a genuine stall. Checkpoints land every 5 minutes and are resumable.
- **Never commit**: reserve preimages/salts (`ops/vault/drop-*.json`), private keys,
  anything under `ops/vault/`, or `.env` files.

## 5. Open questions

1. **Stock is not enforced on a win.** Every bidder clearing the reserve wins, so a
   stock-1 drop can record many winners. Architecture §3.3 specifies `stock -= 1` on a
   win, which needs a rule for which clearing bidders win when there are more of them
   than stock (bid-order priority, per decisions log §10, 2026-07-19). This is the next
   open question and a product decision, not a mechanical fix.
2. L2/L3 drew a **"no commits in August"** response that is wrong about this repo — 47
   commits carry August 2026 dates and GitHub attributes all of them. There are zero
   commits Aug 25–31, which is the likeliest mechanism. Unresolved with the program.
3. Which X handle will actually be registered.
