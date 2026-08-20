# LOWBALL — L3 tests + CI evidence
Captured: 2026-08-20T11:18:39Z

## `npm test` (contract) — Vitest, 6 tests passing

L3 requires 3+ tests; the suite covers both verdict paths, the reveal-tamper
rejection, and the state machine.

```
 RUN  v4.1.10 /Users/bond/lowball/contract

 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > initializes with UNSET status and zeroed fields
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > createDrop stores the sealed commitment and moves status to OPEN
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > revealReserve accepts the matching preimage and discloses the reserve
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > revealReserve rejects a tampered preimage
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > checkWin marks winnerFound when bidAmount >= revealed reserve
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > checkWin refuses to mark a winner when bidAmount < revealed reserve

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  225ms
```

## CI — GitHub Actions, green on every push to `main`

Workflow: [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) —
triggers on push to `main` and on `pull_request`; steps: checkout → Node 22 →
install Compact compiler → `npm install` → `compact compile` → `vitest run`.

Badge is at the top of the root README.

| Result | Commit | Run |
|---|---|---|
| success | `f8781e4` | https://github.com/DiveshK007/lowball/actions/runs/31256796474 |
| success | `323b4cd` | https://github.com/DiveshK007/lowball/actions/runs/31256743784 |
| success | `199a9b3` | https://github.com/DiveshK007/lowball/actions/runs/31255576525 |

CI compiles the Compact contract from source on a clean runner, so a green run
also proves the committed contract compiles with the pinned toolchain.

## Commit count

54 commits on `main` (L3 requires 10+).

## Live loop, exercised end to end on Preview

Not a mock — the full ritual ran against the deployed contract
`e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11`:

| Step | Evidence |
|---|---|
| House opens drop (`createDrop`) | tx `000666ff…d570`, block 217931 |
| Player seals bid from Lace (`placeBid`) | tx `7a5179ff…dc45` (ContractCall on indexer) |
| House reveals reserve (`revealReserve`) | tx `001a55f2…be7ea5`, block 224316 — reserve 25 tDUST |
| Verdict (`checkWin`) | bid 30 ≥ reserve 25 → win |

Screenshots of the UI at each stage are in `docs/submissions/L2/`.
