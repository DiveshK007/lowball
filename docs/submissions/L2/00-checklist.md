# L2 — Waxing Crescent · submission checklist

| Requirement | Status | Evidence |
|---|---|---|
| Lace wallet connect **and** disconnect | ✅ | demo video; `web/src/features/wallet/ConnectButton.tsx` |
| Circuit called successfully from the frontend | ✅ | real Lace-signed `placeBid`, tx `9263db6b…cb3f3` on Preview |
| Observable privacy behavior (proven without being shown) | ✅ | side-by-side panel: bid amount on the left, ledger view on the right with no amount; won at 30 tDUST with the amount published nowhere |
| Contract deployed to Preprod with a verifiable address | ✅ | `1e7b6deedf3a04adb877416b845b8039c3cc5caf7b214cdaa532a8fce6263272`, block 2,202,228 — verified on the Preprod indexer as `ContractDeploy` (`docs/submissions/L1/03-preprod-deploy.md`) |
| Public GitHub repo with README | ✅ | https://github.com/DiveshK007/lowball |
| Live demo link | ✅ | https://lowball-orpin.vercel.app |
| Demo video: wallet connect + successful circuit call | ✅ | https://youtu.be/om0mTpbdXiU |
| README documents the privacy claim | ✅ | README → *Privacy Claim* and *Privacy Model* |
| Minimum 8 meaningful commits | ✅ | 87+ on `main` |

## The loop, exercised on live chain

| Step | Transaction |
|---|---|
| House opens drop (`createDrop`) | `000666ff…d570` · block 217931 |
| Player seals bid from Lace (`placeBid`) | `9263db6b…cb3f3` |
| House reveals reserve (`revealReserve`) | `007428701f…8640` · block 523932 |
| Verdict (`checkWin`) | won — bid 30 tDUST vs revealed reserve 25 tDUST |

The winning amount appears nowhere in public state. `bidCount` increments; no amount is ever written.
