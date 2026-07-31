# LOWBALL — L1 deploy evidence
Captured: 2026-07-31T14:02:20Z

## Deployed contract (Midnight Preview)

| Field | Value |
|---|---|
| Network | Preview |
| Contract address | `e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11` |
| Deploy tx | `004a60c412ed07b55500830d343e1f60eb2f879866cbcb66aadb7008d62fb64d29` |
| Block height | 215085 |
| House unshielded addr | `mn_addr_preview1d0zv2wqrmwqwjlzdljduzpks6p65exqkn30sme0hy5c4rvgyppcs4lhhcw` |

## `npm run deploy:preprod` (MIDNIGHT_NETWORK=preview) — output
```
Starting wallet + syncing to preview...
Unshielded balance: 5,00,00,00,000 tNight
Dust already available: 1154775894999999999
Pre-compiling contract with ZK assets...
Building midnight-js providers...
Submitting deploy transaction...

Deployed!
  contract:    e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11
  tx:          004a60c412ed07b55500830d343e1f60eb2f879866cbcb66aadb7008d62fb64d29
  block:       215085
```

## On-chain verification (Preview indexer)
```
POST https://indexer.preview.midnight.network/api/v3/graphql
{ contractAction(address:"e5f6d470…f7c4fc11"){ __typename address } }

→ { "data": { "contractAction": {
      "__typename": "ContractDeploy",
      "address": "e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11" } } }
```

## Notes
- Deployed to **Preview** rather than Preprod: L1 accepts either network, and Preview's
  dust-generation history (~26k events) syncs in minutes, versus Preprod's ~1.35M events
  (~10-20h in-memory) — see `docs/spikes/preprod-sync-memory.md`.
- The deploy loads the compiled `Contract` from `ops/managed/lowball` (synced via
  `npm --prefix ops run sync:contract`) so the managed contract and `compact-js` share a
  single `@midnight-ntwrk/onchain-runtime-v3` copy; two physical copies fail the
  `ContractMaintenanceAuthority` class-identity check during deploy-tx assembly.
