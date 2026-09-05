# L3 — First Quarter · submission checklist

| Requirement | Status | Evidence |
|---|---|---|
| Fully functional dApp using Midnight's privacy model | ✅ | live at https://lowball-orpin.vercel.app; full loop run on chain (see L2 checklist) |
| Minimum 3 tests passing | ✅ | **24 passing** — 6 contract + 18 web (`02-test-output.png`) |
| CI/CD pipeline running (workflow + passing runs) | ✅ | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml); two jobs green on every push |
| Idea from the provided list | ✅ | **Sealed-Bid Auction** — private bids, verifiable winner |
| Product proposal submitted for approval | ⏳ | drafted in [`PROPOSAL.md`](../../../PROPOSAL.md) — submit on Rise In |
| Public GitHub repo with complete README | ✅ | https://github.com/DiveshK007/lowball |
| Live demo link | ✅ | https://lowball-orpin.vercel.app |
| Screenshot: test output (3+ passing) | ✅ | `02-test-output.png` |
| CI badge / workflow with passing runs | ✅ | badge at the top of the README |
| Demo video (1 min) showing full functionality | ✅ | https://youtu.be/om0mTpbdXiU |
| README "privacy model" section | ✅ | README → *Privacy Model* (PUBLIC / PRIVATE / PROVED without revealing) |
| Minimum 10 meaningful commits | ✅ | 87+ on `main` |

## Contract address (mandatory)

**Preprod:** `1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272`
Deploy tx `87611f96…a301025` · block 2,202,228 · verified on the Preprod indexer as `ContractDeploy`.
(The tx hash previously recorded here, `0018b530…a6f632`, does not match the chain; the deploy
transaction's hash at block 2,202,228 is `87611f96983aa39029dc4778d6b2688726d41d0b4c35e784b5b96df83a301025`.)

## Beyond the minimum

- **Public receipts page** (`/receipts/:dropId`) — no wallet needed. Reads the three public facts in chain order and recomputes the commitment hash **in the visitor's own browser**, so fairness is verifiable rather than asserted.
- `reserveCommitmentHex` is unit-tested against a commitment the chain has already accepted, so the page's maths cannot silently drift from the contract's.
- The suite covers both verdict paths and the **reveal-tamper rejection** — a wrong preimage must fail.
