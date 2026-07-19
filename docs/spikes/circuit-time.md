# Spike: in-circuit block time

**Question (spec §9 #4):** can a Compact circuit read the current
block time, so `placeBid` can enforce `now < drop.closeTime`?

**Answer: yes, via `blockTimeLt/Lte/Gt/Gte(time: Uint<64>) -> Boolean`.**

There is no raw `now()` / `blockTime()` accessor in the sources I
searched. Only the four comparison primitives. That's enough for
LOWBALL's deadline guards.

## Evidence

Comparison signatures (all four, `Uint<64> -> Boolean`):

- [midnight-js/testkit-js/testkit-js-e2e/src/contract/block-time.compact](https://raw.githubusercontent.com/midnightntwrk/midnight-js/main/testkit-js/testkit-js-e2e/src/contract/block-time.compact)

Usage sketch (adapted from the testkit):

```compact
export circuit placeBid(closeTime: Uint<64>): [] {
  assert(blockTimeLt(disclose(closeTime)), "drop closed");
  // ...
}
```

## Ecosystem readiness

Not used in any stable Midnight dApp example I searched. Present in the
midnight-js e2e testkit and referenced by strings in the compactc
binary. Treat as beta-supported — verify against the installed compiler
by writing a probe test before relying on it in shipped tests.

## Decision for L1

**Defer the deadline guard to a later level.** L1 scope is
`createDrop` / `placeBid` skeleton / `revealReserve`, plus the three
verdict tests. Adding an in-circuit deadline is out of P1 scope and
buys us little for the skeleton — the tests can synthesize any
"before-close" state without a real clock.

`closeTime` is *stored* on the drop at `createDrop` time (spec §3.1),
because L2/L3 will need it. But no circuit yet consumes it.

L3 or earlier will add:
- `placeBid` guard: `assert(blockTimeLt(disclose(drop.closeTime)), "closed")`
- `expireDrop` guard: `assert(blockTimeGte(disclose(drop.closeTime + REVEAL_GRACE)), "grace not over")`

Spec §10 log entry:

> L1: `closeTime` stored on drop but not enforced in-circuit yet.
> In-circuit deadline guards land at L3 alongside claim + expiry paths.
> Primitive available (`blockTimeLt/Gte`), verified against docs.
