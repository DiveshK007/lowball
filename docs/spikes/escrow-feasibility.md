# Spike: shielded escrow feasibility

**Question (spec §9 #2):** can a Compact circuit hold shielded tDUST from
the caller and refund it later, all from inside `placeBid`?

**Answer: yes, technically supported; not yet stable enough for L1.**

## Evidence

The Compact standard library exposes `receiveShielded`, `sendShielded`,
`sendImmediateShielded`, `mintShieldedToken`, plus the `ShieldedCoinInfo` /
`QualifiedShieldedCoinInfo` / `ShieldedSendResult` types. Ground truth
is the midnight-js e2e test contract:

- [midnight-js/testkit-js/testkit-js-e2e/src/contract/shielded.compact](https://raw.githubusercontent.com/midnightntwrk/midnight-js/main/testkit-js/testkit-js-e2e/src/contract/shielded.compact)
  (26 lines, full API surface)

A working reference for the hold-then-refund/kept pattern lives in the
Passport experiments repo:

- [passport/experiments/contract-custody-feasibility/contracts/custody.compact](https://raw.githubusercontent.com/midnightntwrk/passport/main/experiments/contract-custody-feasibility/contracts/custody.compact)
  — 3× `sendShielded` calls, 1× `sendImmediateShielded` for refunds/change
- [passport/experiments/stateless-shielded-custody/contracts/stateless.compact](https://raw.githubusercontent.com/midnightntwrk/passport/main/experiments/stateless-shielded-custody/contracts/stateless.compact)
  — `receiveShielded(disclose(coin))` intake pattern with an extended
  commentary block explaining the Merkle-tree `insertCoin` /
  `mergeCoinImmediate` / refund choreography the runtime demands

## Ecosystem readiness

None of the 8 stable Midnight dApp examples I searched (counter, bboard,
battleship, kitties, kitties-nft, zkloan, leaderboard, midnight-hello-world)
uses the shielded API surface. It's not in
`docs.midnight.network`'s language reference either. Only the midnight-js
e2e testkit and the Passport experiments touch it. In practice this is
"experimentally supported" — copy the Passport pattern, expect API
friction, budget time.

## Decision for L1 (New Moon)

**Adopt the spec's fallback path:** `placeBid` records a bid commitment
only; no shielded value moves at bid time. Winner pays out-of-band on
`claimItem` after the reserve is revealed, or the stock returns via a
grace-period expiry (`REVEAL_GRACE` in spec §3.3).

Rationale: P1's L1 scope explicitly says "verdict only, no escrow yet",
and the surrounding ecosystem hasn't blessed the shielded flow yet.
Committing to it now would force the whole schedule against an
undocumented API surface for L2 gains. Better to ship L1/L2 on the
fallback and revisit shielded escrow at L3–L4 once we have observed
behavior on Preprod.

## Follow-ups (deferred)

- L2 spike: run the Passport `receiveShielded` intake pattern against
  the current SDK on Preprod. If the flow works end-to-end, upgrade
  `placeBid` to hold shielded tDUST; if not, keep the fallback.
- L3 will need `claimItem` (winner-side) and `expireDrop`
  (permissionless refund) regardless of which funds path we take.

Spec §10 log entry:

> L1: adopted spec §3.4 fallback funds path. Shielded escrow deferred
> to a later spike (currently experimental / no stable dApp precedent).
