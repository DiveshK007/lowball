# contract/

LOWBALL Compact contract sources + Vitest tests. Layout mirrors
[midnightntwrk/example-counter](https://github.com/midnightntwrk/example-counter).

```
contract/
  src/
    lowball.compact        # main contract (arrives with L1)
    hello-world.compact    # toolchain smoke test
    test/                  # Vitest + simulator tests
    managed/               # generated build artifacts (git-ignored)
```

Compile + test:

```
cd contract
npm install
npm run compact          # or: npm run compact:hello for the smoke test
npm test                 # vitest run
npm run test:compile     # compile then run tests
```

`managed/` (prover/verifier keys, generated JS, ZK IR) is regenerated on
every compile and never committed.
