# LOWBALL — L1 contract evidence
Captured: 2026-07-19T17:38:07Z

## `npm run compact` — Compact 0.31.1 output
```

> @lowball/contract@0.0.0 compact
> compact compile src/lowball.compact src/managed/lowball

Compiling 4 circuits:

circuits generated:
src/managed/lowball/keys/checkWin.prover
src/managed/lowball/keys/checkWin.verifier
src/managed/lowball/keys/createDrop.prover
src/managed/lowball/keys/createDrop.verifier
src/managed/lowball/keys/placeBid.prover
src/managed/lowball/keys/placeBid.verifier
src/managed/lowball/keys/revealReserve.prover
src/managed/lowball/keys/revealReserve.verifier
```

## `npm test` — Vitest run
```

 RUN  v4.1.10 /Users/bond/lowball/contract

Sourcemap for "/Users/bond/lowball/contract/src/managed/lowball/contract/index.js" points to missing source files
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > initializes with UNSET status and zeroed fields 49ms
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > createDrop stores the sealed commitment and moves status to OPEN 31ms
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > revealReserve accepts the matching preimage and discloses the reserve 32ms
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > revealReserve rejects a tampered preimage 29ms
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > checkWin marks winnerFound when bidAmount >= revealed reserve 43ms
 ✓ src/test/lowball.test.ts > LOWBALL contract — L1 skeleton > checkWin refuses to mark a winner when bidAmount < revealed reserve 38ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  23:08:16
   Duration  465ms (transform 83ms, setup 0ms, import 128ms, tests 223ms, environment 0ms)

```

## Contract source: contract/src/lowball.compact
See file. Circuits: createDrop, placeBid, revealReserve, checkWin (impure);
bidHash, reserveHash (pure, exported for ops + tests).
