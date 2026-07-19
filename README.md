# LOWBALL 🎰

Provably-fair mystery drops on [Midnight](https://midnight.network). A drop's reserve price is committed onchain before any bid. Bids are sealed forever. Bid at or above the hidden reserve and you win at your price; below, instant refund and nobody ever learns how close you were.

## Initial product idea

Name-your-price gacha, single-player vs the house. Priceline × blind-box mania × degen flex content. Each drop is one item (or 1-of-N stock) with a hidden reserve committed onchain before bids open. Players sealed-bid in tDUST from Lace; a ZK circuit compares the bid to the committed reserve and issues an instant verdict — win at your price, or auto-refund with no near-miss information leaked. When a drop closes, the house reveals `(reserve, salt)` and the contract verifies it matches the original commitment; a public receipts page shows the proof.

The only things ever made public are the things that keep the house honest: the reserve commitment before bids open, and the reserve reveal (hash-verified) after close. Built for the Rise In "New Moon to Full" program — list primitive: Sealed-Bid Auction; category: Consumer focus.

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
cd web && npm install && npm run dev
```

Ops CLI (scaffold):

```
cd ops && npm install && npm run build && node dist/index.js --help
```

## Docs

- [Design spec](docs/superpowers/specs/2026-07-19-lowball-design.md)
- [Architecture](docs/architecture.md)
- [Prompt pack (per-level)](docs/prompts.md)

## Program roadmap

Levels L1 → L6 in the design spec §7. Commit discipline: L1 ≥ 5, L2 ≥ 8, L3 ≥ 10 meaningful commits.
