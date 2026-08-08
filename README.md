# LOWBALL 🎰

[![CI](https://github.com/DiveshK007/lowball/actions/workflows/ci.yml/badge.svg)](https://github.com/DiveshK007/lowball/actions/workflows/ci.yml)

**Live demo → https://lowball-orpin.vercel.app**

Provably-fair mystery drops on [Midnight](https://midnight.network). A drop's reserve price is committed onchain before any bid. Bids are sealed forever. Bid at or above the hidden reserve and you win at your price; below, instant refund and nobody ever learns how close you were.

## Initial product idea

Name-your-price gacha, single-player vs the house. Priceline × blind-box mania × degen flex content. Each drop is one item (or 1-of-N stock) with a hidden reserve committed onchain before bids open. Players sealed-bid in tDUST from Lace; a ZK circuit compares the bid to the committed reserve and issues an instant verdict — win at your price, or auto-refund with no near-miss information leaked. When a drop closes, the house reveals `(reserve, salt)` and the contract verifies it matches the original commitment; a public receipts page shows the proof.

The only things ever made public are the things that keep the house honest: the reserve commitment before bids open, and the reserve reveal (hash-verified) after close. Built for the Rise In "New Moon to Full" program — list primitive: Sealed-Bid Auction; category: Consumer focus.

## Live Demo

| | |
|---|---|
| **App** | **https://lowball-orpin.vercel.app** |
| **Contract (Preview)** | [`e5f6d470…f7c4fc11`](https://lowball-orpin.vercel.app/drop/drop-001) — live drop, reads Preview chain state |

Before you click anything: install [Lace](https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk), switch it to **Preview**, and fund it at the [Preview faucet](https://faucet.preview.midnight.network/). Fees are paid in **DUST**, generated from holding NIGHT — in Lace, register your tNIGHT for DUST generation and give it a minute to accrue before bidding. Browsing needs none of this; bidding does.

The 60-second walkthrough:

1. Open the gallery, click **Genesis Envelope**.
2. **Connect Lace** — the app checks the extension is present, on the right network, and answering.
3. Type an amount and hit **Seal this bid**. The proof is built locally, Lace signs, the chain records a commitment.
4. Scroll to the **side-by-side panel**: your amount on the left, the public ledger's view on the right. The right side never contains a number.
5. After the house reveals, **Open your envelope** for the verdict.

## Contract Address

| Network | Address |
|---|---|
| Preview | `e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11` |
| Preprod | — (not deployed; see [`docs/spikes/preprod-sync-memory.md`](docs/spikes/preprod-sync-memory.md)) |

L1 deployed to **Preview** (deploy tx `004a60c4…b64d29`, block 215085). Preview's dust-generation history syncs in minutes versus Preprod's ~1.35M-event genesis replay. Full evidence: [`docs/submissions/L1/02-deploy.md`](docs/submissions/L1/02-deploy.md).

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

## Repo layout

- `contract/` — Compact contract sources and build artifacts (`managed/` git-ignored).
- `web/` — React + TypeScript + Vite dApp. SDK imports confined to `web/src/lib/midnight/`.
- `ops/` — house-side TypeScript CLI (create-drop, close-and-reveal). Vault git-ignored.
- `docs/` — design spec, architecture, spikes, submissions.

## Setup

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

- [Design spec](docs/superpowers/specs/2026-07-19-lowball-design.md)
- [Architecture](docs/architecture.md)
- [Prompt pack (per-level)](docs/prompts.md)

## Program roadmap

Levels L1 → L6 in the design spec §7. Commit discipline: L1 ≥ 5, L2 ≥ 8, L3 ≥ 10 meaningful commits.
