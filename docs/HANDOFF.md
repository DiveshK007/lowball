# LOWBALL — Handoff

**Updated 2026-09-05** (supersedes the 2026-09-05 morning version written at `ae4cb0c`).

For an assistant or contributor who has only this repository. Everything below was
verified against the working tree, GitHub, the deployed Vercel bundle, and the Midnight
indexers. Where a claim could not be verified, it says so.

---

## 1. Current state

**The app runs on Preprod, with a live open drop.** The project consolidated off Preview
on 2026-09-05; before that, the shipped app read Preview while a Preprod address with no
drop on it was being submitted to the program.

| | |
|---|---|
| **App** | https://lowball-orpin.vercel.app |
| **Contract** | `3fac6305e4d70a1e8e16c9ea2c480d1456e05c043b9150e5b97f46cd2120b446` |
| **Deploy** | block 2,419,510 · tx `79061bfb…3565bc78` |
| **Drop opened** | block 2,419,536 · tx `1a34b5cd…fbaabba3` (`createDrop`) |
| **Drop** | Genesis Envelope · 25 tDUST sealed reserve · stock 1 · closes **2026-09-19 17:35 UTC** |

Verify without a wallet — `entryPoint: "createDrop"` means open and unbid:

```bash
curl -s -X POST https://indexer.preprod.midnight.network/api/v3/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{contractAction(address:\"3fac6305e4d70a1e8e16c9ea2c480d1456e05c043b9150e5b97f46cd2120b446\"){__typename ... on ContractCall{entryPoint}}}"}'
```

Superseded addresses, kept in the README because they are the evidence earlier levels
were judged on: `1e7b6dee…` (Preprod, bare deploy, never had a drop), `ae971dc9…`
(Preview, full loop, win claimed), `e5f6d470…` (Preview, L1 record, reveal only).

## 2. L4 status

| Requirement | Status |
|---|---|
| MVP live on Preprod (verifiable address) | ✅ |
| Live Preprod demo link | ✅ verified in the deployed bundle |
| README + setup docs | ✅ |
| CI/CD passing | ✅ |
| Demo video | ✅ https://youtu.be/om0mTpbdXiU |
| **`docs/USAGE.md`** | ❌ **not written** |
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
5. **A new drop means a new deployment.** `createDrop` asserts the slot is unset, so the
   contract holds exactly one drop for its lifetime.

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

1. Should the next drop reuse this contract? It cannot — a new drop requires a new
   deployment, and each deployment currently costs a full Preprod wallet sync unless the
   checkpoint at `ops/vault/wallet-cache-preprod.json` is still restorable.
2. L2/L3 drew a **"no commits in August"** response that is wrong about this repo — 47
   commits carry August 2026 dates and GitHub attributes all of them. There are zero
   commits Aug 25–31, which is the likeliest mechanism. Unresolved with the program.
3. Which X handle will actually be registered.
