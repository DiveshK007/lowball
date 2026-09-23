# LOWBALL 🎰

[![CI](https://github.com/DiveshK007/lowball/actions/workflows/ci.yml/badge.svg)](https://github.com/DiveshK007/lowball/actions/workflows/ci.yml)

**Live demo → https://lowball-orpin.vercel.app**

Provably-fair mystery drops on [Midnight](https://midnight.network). A drop's reserve price is committed onchain before any bid. Bids are sealed forever. Bid at or above the hidden reserve and you win at your price; below, instant refund and nobody ever learns how close you were.

## What This Does (initial product idea)

Name-your-price gacha, single-player vs the house. Priceline × blind-box mania × degen flex content. Each drop is one item (or 1-of-N stock) with a hidden reserve committed onchain before bids open. Players sealed-bid in tDUST from Lace; a ZK circuit compares the bid to the committed reserve and issues an instant verdict — win at your price, or auto-refund with no near-miss information leaked. When a drop closes, the house reveals `(reserve, salt)` and the contract verifies it matches the original commitment; a public receipts page shows the proof.

The only things ever made public are the things that keep the house honest: the reserve commitment before bids open, and the reserve reveal (hash-verified) after close. Built for the Rise In "New Moon to Full" program — list primitive: Sealed-Bid Auction; category: Consumer focus.

## Live Demo

| | |
|---|---|
| **App** | **https://lowball-orpin.vercel.app** |
| **Contract (Preprod)** | [`f81e44ea…d9ec66dc`](https://lowball-orpin.vercel.app/drop/drop-001) — **two drops open now** (stock 50 and 25), closing 2026-12-31 |
| **Public receipts** | [/receipts/drop-001](https://lowball-orpin.vercel.app/receipts/drop-001) — verify the drop, no wallet needed |
| **X** | [@lowballdrops](https://x.com/lowballdrops) — every drop posted, with its commitment hash |
| **Demo video** | ⚠️ [https://youtu.be/om0mTpbdXiU](https://youtu.be/om0mTpbdXiU) — **out of date**: filmed against the Preview single-drop build. It shows connect, sealed bid, verdict, tests and CI, but not multi-drop, stock or the sold-out path. Re-shoot pending ([shot list](docs/demo-video-script.md)) |

> **Current chain state.** One contract holds every drop; every bidder on a drop can
> open their own envelope, and the first `stock` bidders to claim take the units.
> **`drop-001` (Genesis Envelope, stock 50)** and **`drop-002` (Second Envelope,
> stock 25)** are **open on Preprod** until **2026-12-31** — stocked generously and
> priced low so most bidders win. A third drop, `drop-soldout`, is closed and carries
> the evidence for stock enforcement: **stock 2, three sealed bids, two winners**, with
> the third bidder told the drop sold out. Browsing needs no wallet. Check what is on
> chain right now:
>
> ```bash
> curl -s -X POST https://indexer.preprod.midnight.network/api/v3/graphql \
>   -H 'content-type: application/json' \
>   -d '{"query":"{contractAction(address:\"f81e44eaf0acc9f92c80aba03c6ac822c38004d09b9c4d5d5ba330b4d9ec66dc\"){__typename ... on ContractCall{entryPoint}}}"}'
> ```

Before you click anything: install [Lace](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk), switch it to **Preprod**, and fund it at the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/). Fees are paid in **DUST**, generated from holding NIGHT — in Lace, register your tNIGHT for DUST generation and give it a minute to accrue before bidding. Browsing needs none of this; bidding does.

New to Midnight wallets? The **[usage guide](docs/USAGE.md)** walks the whole thing
end to end, including the tDUST step that catches everyone.

The 60-second walkthrough:

1. Open the gallery, click **Genesis Envelope**.
2. **Connect Lace** — the app checks the extension is present, on the right network, and answering.
3. Type an amount and hit **Seal this bid**. The proof is built locally, Lace signs, the chain records a commitment.
4. Scroll to the **side-by-side panel**: your amount on the left, the public ledger's view on the right. The right side never contains a number.
5. After the house reveals, **Open your envelope** for the verdict.
6. Open **[public receipts](https://lowball-orpin.vercel.app/receipts/drop-001)** — no wallet, no connection. It lays out the three public facts in the order the chain recorded them (reserve sealed → bids counted → reserve revealed) and lets you paste the salt to **recompute the commitment in your own browser**. Don't trust the house; recompute the hash. The maths is unit-tested against a commitment the chain already accepted (`web/src/lib/midnight/hashes.test.ts`).

## Contract Address

**Live contract — this is the only address a reviewer needs:**

```
f81e44eaf0acc9f92c80aba03c6ac822c38004d09b9c4d5d5ba330b4d9ec66dc
```

Preprod, deployed at block **2,520,844**. Holds three drops: **`drop-001`**
(Genesis Envelope, stock 50) and **`drop-002`** (Second Envelope, stock 25), both
open until **2026-12-31**, plus **`drop-soldout`**, closed, which is the on-chain
evidence for stock enforcement — stock 2, three sealed bids, two winners, the
third bidder rejected by the contract.

Verify it in one call, no wallet:

```bash
curl -s -X POST https://indexer.preprod.midnight.network/api/v3/graphql \
  -H 'content-type: application/json' \
  -d '{"query":"{contractAction(address:\"f81e44eaf0acc9f92c80aba03c6ac822c38004d09b9c4d5d5ba330b4d9ec66dc\"){__typename ... on ContractCall{entryPoint}}}"}'
```

Each drop's reserve is **sealed** — only its commitment is public, and the amount
is disclosed at reveal.

<details>
<summary><strong>Superseded addresses</strong> — history only, do not use</summary>

Every one of these is a real deploy that an earlier level was judged on. They are
kept for auditability and are **not** the live contract.

| Address | Network | Why it was replaced |
|---|---|---|
| `72dfe0295bb744874f6b5a7ed961f2b5dd4b883666f7dd87d4fd2260f169a4b1` | Preprod | Every bidder could win, but stock was unenforced |
| `edae325517131cd6dbfdf953cf87cf3ef337191b1ef50f12a9f1a57dab468dc7` | Preprod | Many drops, but only the most recent bidder could win |
| `3fac6305e4d70a1e8e16c9ea2c480d1456e05c043b9150e5b97f46cd2120b446` | Preprod | One drop per deployment |
| `1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272` | Preprod | Bare deploy — no drop was ever created on it |
| `ae971dc989e4f3a8b6c28f9e3145c8e853b6e51f09bb423610f678e343c48408` | Preview | Pre-Preprod; carried the first full loop, win claimed |
| `e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11` | Preview | The original L1 deploy; reserve revealed, no win claimed |

> A note on transaction ids: the house scripts print a `txId` (a 69-character
> transaction *identifier*) which is **not** the 64-character hash the indexer and
> explorers key on. Hashes quoted in this README are the indexer's.

</details>

L1 first deployed to **Preview** (deploy tx `004a60c4…b64d29`, block 215085), because Preprod's ~1.45M-event dust genesis replay is a multi-hour, memory-hungry job ([`docs/spikes/preprod-sync-memory.md`](docs/spikes/preprod-sync-memory.md)). Preprod was reached in the end **without a cloud VM**, by checkpointing the wallet state every 5 minutes and migrating the resulting snapshot between machines — see [`docs/preprod-deploy-cloud.md`](docs/preprod-deploy-cloud.md) for both routes. That cache (`ops/vault/wallet-cache-preprod.json`, git-ignored) is retained, so later Preprod deploys resume from the tip instead of replaying genesis. Full evidence: [`docs/submissions/L1/02-deploy.md`](docs/submissions/L1/02-deploy.md), [`03-preprod-deploy.md`](docs/submissions/L1/03-preprod-deploy.md).

## Privacy Claim

**A bid amount placed through LOWBALL is never disclosed to anyone — not to other bidders, not to the house, not to a block explorer — whether it wins or loses.**

Concretely, for one bid:

| Where | What exists there |
|---|---|
| Your device | the amount, your 32-byte bidder secret, the resulting commitment |
| The ZK proof | a proof that *some* amount and secret hash to the published commitment |
| The ledger | `latestBidCommitment` (a hash), `bidCount` (a number of bids) — no amount, ever |
| The explorer | the transaction, its circuit, its commitment. No amount, no reserve pre-close |

The mechanism is Compact's witness/ledger split: `bidAmount` and `bidderSecret` are **witnesses** — private inputs consumed inside the circuit — while `commitment`, `stock`, `closeTime`, `bidCount` and (post-close) `revealedReserve` are ledger fields. `disclose()` appears exactly twice in the contract: the winner's claim and the post-close reserve reveal. A losing verdict fails an in-circuit assert on the bidder's own machine, so a loss produces no transaction at all — nothing is published, including the fact that a verdict was run.

Verify it yourself: place a bid, then open the contract on the explorer. `bidCount` increments; no amount appears anywhere. The app's side-by-side panel shows both views at the same instant.

Scope, stated honestly at L2: bids are commitments, not escrowed funds — the shielded-escrow path is deferred (spec §10, `docs/spikes/escrow-feasibility.md`), so a winner pays on claim. `bidCount` is deliberately public. Transaction timing is observable; bid amounts are not.

## Privacy Model

Every value in LOWBALL falls into one of three buckets — the Midnight PUBLIC / PRIVATE / PROVED split:

**PUBLIC** — on the ledger, readable by anyone (explorer, other players, the house):
- Reserve **commitment** (a hash) published before bids open
- Stock remaining, close time, item metadata reference
- `bidCount` — how many bids exist (never the amounts)
- After close: the revealed `reserve` and its hash-match proof
- Winner claim records (item ownership)

**PRIVATE** — Compact **witnesses**; consumed inside the circuit, never written to the ledger, never leaving the bidder's device:
- `bidAmount` — every bid, winning or losing
- `bidderSecret` — the 32-byte claim secret
- Which wallet actually bid vs. merely browsed
- The house's `reserve` and `salt`, before the post-close reveal

**PROVED without revealing** — the ZK circuit asserts these hold while disclosing neither operand:
- The bid was compared against the committed reserve and a verdict issued — **without revealing the bid or the reserve**
- The revealed `(reserve, salt)` hashes to the original commitment — proving the house never moved the goalposts
- A claimant knows the `bidderSecret` behind a winning claim — proving the right to claim without exposing the secret

`disclose()` appears exactly twice in the contract: the winner's claim and the post-close reserve reveal. Everything else about a bid stays private, forever.

## Tech Stack

| Layer | What |
|---|---|
| Contract | Compact (`compact` 0.5.x / compiler 0.31.x), compiled to `contract/src/managed/` |
| Chain | Midnight — **Preprod** ([runbook](docs/preprod-deploy-cloud.md)) |
| dApp | React 19 + TypeScript + Vite, Midnight.js SDK, DApp Connector API (Lace) |
| Proving | Local proof server in Docker (`midnightntwrk/proof-server`, port 6300) |
| House ops | Node 22 + TypeScript CLI (`ops/`) — `create-drop`, `close-and-reveal` |
| Tests / CI | Vitest (contract + web), GitHub Actions on every push and PR |
| Hosting | Vercel (static; no backend — the chain is the backend) |

## Prerequisites

- **Node.js v22** (pinned by `.nvmrc`)
- **Docker Desktop** — runs the local proof server
- **[Lace](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk)** set to **Preprod**, funded from the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/)
- tDUST for fees: register your tNIGHT for **DUST generation** in Lace and let it accrue (NIGHT does not pay fees directly)
- **Compact compiler** — only needed to recompile the contract (see Setup)

## Setup & Run Locally

Prereqs (macOS; Windows needs WSL):

- Node.js **v22+** (this repo pins v22 via `.nvmrc`)
- Docker Desktop
- Lace Midnight wallet extension (needed from L2 onward)

Install the Compact compiler ([docs](https://docs.midnight.network/getting-started/installation)):

```
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
export PATH="$HOME/.local/bin:$PATH"
compact update           # installs the compactc toolchain
compact --version        # expect: compact 0.5.x
compact compile --version # expect: 0.31.x
```

Run the Midnight proof server locally on port 6300:

```
docker run -d --name lowball-proof-server -p 6300:6300 \
  midnightntwrk/proof-server:latest midnight-proof-server -v
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://localhost:6300/
# expect: HTTP 200
```

Smoke-test the Compact toolchain against `contract/hello-world.compact`:

```
cd contract
compact compile hello-world.compact managed/hello-world
# expect: managed/hello-world/{contract,keys,zkir,compiler}
```

Web dev server:

```
cd web
cp .env.example .env.local     # paste the deployed contract address into it
npm install
npm run sync:contract          # copy compiled contract + ZK keys out of contract/
npm run dev
```

`sync:contract` copies the generated TypeScript bindings into `web/src/lib/midnight/generated/` and the prover/verifier keys into `web/public/{keys,zkir}/`. Those copies are committed, because `contract/src/managed/` is git-ignored and the Vercel build has no Compact compiler — re-run it after any contract recompile.

Deploying the web app: `vercel.json` at the repo root builds `web/` and serves `web/dist`, so a Vercel project pointed at the repo root needs no further configuration beyond the `VITE_*` environment variables from `.env.example`.

Ops CLI (scaffold):

```
cd ops && npm install && npm run build && node dist/index.js --help
```

## Run Tests

```
npm test --prefix contract   # 27 tests — circuits, multi-drop, accumulator, stock
npm test --prefix web        # 29 tests — formatting, commitment hashes, drop ids
```

The web suite includes `web/src/lib/midnight/hashes.test.ts`, which asserts the
receipts page reproduces a commitment the chain has **already accepted** — so the
verification maths cannot silently drift from the contract's.

## CI/CD

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push to
`main` and on every pull request, in two jobs:

| Job | Steps |
|---|---|
| `compile + test contract` | checkout → Node 22 → install Compact compiler → `npm install` → `compact compile` → `vitest run` |
| `build + test web` | checkout → Node 22 → `npm install` → `vitest run` → production `vite build` |

Because CI compiles the Compact source on a clean runner, a green badge also
proves the committed contract still compiles with the pinned toolchain — not just
that the tests pass. Status badge is at the top of this file.

## Product Proposal

See **[PROPOSAL.md](PROPOSAL.md)** — the product, why Midnight specifically, the
full public/private data model, and an honest mainnet-feasibility assessment.

## Repo layout

- `contract/` — Compact contract sources and build artifacts (`managed/` git-ignored).
- `web/` — React + TypeScript + Vite dApp. SDK imports confined to `web/src/lib/midnight/`.
- `ops/` — house-side TypeScript CLI (create-drop, close-and-reveal). Vault git-ignored.
- `docs/` — design spec, architecture, spikes, submissions.

## Public ledger state vs private witness

The whole trust story compresses into one asymmetry: **the only public things are the things that keep the house honest.** Reserve is committed onchain *before* any bid; reserve is revealed onchain *after* close — and the contract verifies the reveal against the original commitment. Everything else about bids stays private, forever.

| Observer can see | Observer can NEVER see |
|---|---|
| Drop exists, item metadata, stock remaining | Any bid amount (including losing bids) |
| Reserve **commitment** (hash) | What a winner actually paid |
| Number of bids placed | How close a losing bid was |
| Winner claim proofs (item ownership) | Which wallet bid vs. merely browsed |
| Revealed reserve **after** close + hash-match proof | House's reserve before close |

Concretely: `bidAmount` and `bidderSecret` are Compact **witnesses** — private inputs consumed inside the ZK circuit and never written to ledger state. `commitment`, `stock`, `closeTime`, `metaRef`, `bidCount`, and (post-close) `revealedReserve` are ledger fields — public. `disclose()` appears exactly twice: (a) at winner claim, (b) at post-close reserve reveal.

Even the house cannot see bids pre-verdict, so the house cannot selectively accept or front-run.

## Docs

- **[Usage guide](docs/USAGE.md)** — how to bid, written for a first-time wallet user
  (including why your tDUST reads zero)
- [Design spec](docs/superpowers/specs/2026-07-19-lowball-design.md)
- [Architecture](docs/architecture.md)
- [Prompt pack (per-level)](docs/prompts.md)
- [Traction engine — X formats + drop calendar](docs/traction.md)
- [Demo video shot lists (L2 + L3)](docs/demo-video-script.md)
- [Preprod deploy from a cloud VM](docs/preprod-deploy-cloud.md)
- [Spikes](docs/spikes/) — escrow feasibility, in-circuit time, Preprod sync memory ceiling
- [Submissions evidence](docs/submissions/) — per-level screenshots and logs

## Program roadmap

Levels L1 → L6 in the design spec §7. Commit discipline: L1 ≥ 5, L2 ≥ 8, L3 ≥ 10 meaningful commits.
