# LOWBALL — Claude Code Prompt Pack

Paste these into Claude Code **in order**, one per session/phase. Prereqs: install the Superpowers plugin in Claude Code too (`/plugin marketplace add obra/superpowers` → `/plugin install superpowers@superpowers-marketplace`) so the referenced skills exist there. Put `2026-07-19-lowball-design.md` at `docs/superpowers/specs/` in the repo first.

**Commit discipline (program requirement):** L1 needs 5+, L2 8+, L3 10+ meaningful commits. Every prompt below ends with "commit in small meaningful units" — don't let Claude Code batch everything into one commit.

---

## P0 — Environment + repo bootstrap

```
Set up my Midnight development environment and scaffold the LOWBALL repo.

Context: I'm building LOWBALL, a sealed-bid mystery-drop dApp on Midnight for the Rise In "New Moon to Full" program. The design spec is at docs/superpowers/specs/2026-07-19-lowball-design.md — read it fully first.

Tasks:
1. Verify/install toolchain: Node 22, Docker, Compact compiler, Midnight proof server (run via Docker). Cite the official Midnight docs (docs.midnight.network) for current install commands — do not guess versions.
2. Scaffold monorepo: contract/ (Compact), web/ (React+TS+Vite), ops/ (TS CLI), docs/. Add README.md with the one-liner, setup instructions, and an "initial product idea" paragraph from the spec.
3. Init git, sensible .gitignore (never commit reserve preimages, keys, managed/ artifacts per Midnight conventions — check docs).
4. Smoke-test: compile a hello-world Compact contract and run the proof server successfully.

Use the superpowers verification-before-completion skill before claiming anything works — show me actual command output. Commit in small meaningful units.
```

## P1 — L1: First contract + escrow spike (New Moon)

```
Read docs/superpowers/specs/2026-07-19-lowball-design.md. Use the superpowers writing-plans skill to turn spec §5.1 + §9.1 into an implementation plan for Level 1, then execute it with the test-driven-development skill.

Scope (L1 only):
1. Minimal contract: createDrop (stores hash commitment, stock, closeTime), placeBid skeleton (private witness for bidAmount, compare against commitment — verdict only, no escrow yet), revealReserve (assert hash(reserve,salt)==commitment).
2. SPIKE (timebox it): can current Midnight SDK do shielded tDUST escrow with refund from a circuit? Write findings to docs/spikes/escrow-feasibility.md. If no → adopt the spec's fallback (commitment-based bids, pay-on-claim) and note the decision.
3. Tests for: commitment verified on reveal, tampered reveal rejected, bid verdict correct for above/below reserve.
4. Deploy to Preprod. Capture: compile output screenshot (circuits listed), deploy address screenshot.
5. README: add "public ledger state vs private witness" section explaining our model, per spec §4.

Deliverables checklist = program L1 submission checklist in spec §7. Minimum 5 meaningful commits. Use verification-before-completion before declaring done.
```

## P2 — L2: Frontend + Lace (Waxing Crescent)

```
Read the spec (docs/superpowers/specs/2026-07-19-lowball-design.md) §5.2. Use writing-plans, then TDD where testable.

Scope (L2):
1. web/: React+TS+Vite + Midnight.js SDK + Lace DApp connector. Screens: Gallery (can be one seeded drop), Drop page with sealed-bid flow, wallet connect/disconnect.
2. Call the placeBid circuit from the UI end-to-end on Preprod; handle proof-server-down, Lace-absent, tx-timeout states per spec §6.
3. The observable privacy behavior demo: after a winning bid, show side-by-side that the app knows the win but the public explorer shows no bid amount. Make this a demo-able moment.
4. Deploy web to Vercel (live link). Record demo video: connect wallet + successful circuit call.
5. README: document the privacy claim.

Program L2 checklist in spec §7. Minimum 8 meaningful commits.
```

## P3 — L3: Production grade (First Quarter)

```
Spec §3, §5, §6. Use writing-plans, then TDD.

Scope (L3):
1. Complete the loop: instant verdict, refund path (or pay-on-claim fallback), claimItem, close + revealReserve, /receipts/:dropId public verification page.
2. Test suite ≥ the 6 cases in spec §6 (win, refund, reveal-tamper, stock exhaustion, double-claim, bid-after-close).
3. GitHub Actions CI: compact compile + tests on every push. Badge in README.
4. ops/ CLI: create-drop (reserve+salt generation, redundant preimage storage, commitment submit), close-and-reveal.
5. Polish the Drop page ritual (envelope → verdict reveal). Use the frontend-design skill for this screen only — it should feel like a product, not a hackathon demo.
6. README "privacy model" section: the can-see / can-never-see table from spec §4. 1-minute demo video of full functionality.

Program L3 checklist in spec §7. Minimum 10 meaningful commits. Then I'll submit the idea (Sealed-Bid Auction / Consumer focus) to the program.
```

## P4 — L4: MVP live (Waxing Gibbous)

```
Scope (L4): make LOWBALL a public product on Preprod.
1. Onboarding page: Lace install → faucet → first bid, under 5 minutes, hand-held (spec §5.2).
2. Docs: user guide + architecture doc (use the superpowers documentation-adjacent skills if present, else write clean markdown).
3. Seed 3 launch drops via ops CLI. 
4. Shareable win flex-card (image generation client-side is fine) and receipts thread template.
5. Anything on the spec §6 failure-state list not yet handled.
I'll create the X profile and start posting drops — generate 5 example drop-announcement posts and 1 receipts-thread template for me.
```

## P5 — L5: Users + feedback loop (Full Moon)

```
Scope (L5) — NOTE: program requires mentor market-fit signoff BEFORE user onboarding; I'll confirm that's done first.
1. In-app 1-question feedback widget after each verdict; responses stored simply (no backend — consider a lightweight approach, even a labeled onchain record or export file, justify choice).
2. Drop-calendar tooling in ops CLI (schedule 2-3 drops/week).
3. Unique-bidder counter surfaced on the site (progress to 50, provable onchain).
4. Iterate top 2 friction points from feedback — plan with writing-plans, keep scope tight.
```

## P6 — L6: Mainnet (Supermoon)

```
Scope (L6):
1. Mainnet deployment path: config split preprod/mainnet, deploy contract, migrate web env. Use the deploy-checklist-style discipline: verify CI green, tests pass, rollback plan documented before deploying.
2. Brand pass: name collision-check for "LOWBALL", logo, OG images, flex-card polish.
3. Launch-week drop plan (target: 20 real users).
4. Post-launch: monitor, fix, iterate on feedback.
```

---

## Working agreements for every session

- Read the spec before writing code; if code and spec conflict, update the spec deliberately (decisions log §10).
- superpowers skills: writing-plans before each level, TDD during, systematic-debugging on any bug, verification-before-completion before any "done" claim.
- Screenshots/videos required by the program: capture them the moment they're achievable, store in docs/submissions/L<n>/.
- Small meaningful commits, always.
