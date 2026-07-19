# LOWBALL — Project Rules

Provably-fair sealed-bid mystery drops on Midnight. Read `docs/superpowers/specs/2026-07-19-lowball-design.md` (what) and `docs/architecture.md` (how) before writing any code. Prompt sequence for each build phase: `docs/prompts.md`.

## Hard rules

- Never add AI attribution anywhere: no Co-Authored-By trailers, no "Generated with Claude Code" lines, no AI mentions in commit messages, PRs, code comments, or docs.
- Commit in small meaningful units — the program counts commits per level (L1: 5+, L2: 8+, L3: 10+).
- Never commit: reserve preimages/salts, private keys, `ops/` vault files, `.env`.
- If code and spec conflict, update the spec deliberately (decisions log in spec §10) — don't silently drift.
- Capture program screenshots into `docs/submissions/L<n>/` the moment a milestone first works.
- Consult docs.midnight.network for exact Compact/Midnight.js APIs — do not guess syntax or versions.

## Structure

- `contract/` — Compact contract + tests
- `web/` — React + TS + Vite app (SDK imports confined to `web/src/lib/midnight/`)
- `ops/` — house CLI (create-drop, close-and-reveal); its vault never enters git
- `docs/` — spec, architecture, prompts, spikes, submissions
