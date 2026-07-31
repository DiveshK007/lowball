// contract/scripts/deploy.ts
// Deploys the LOWBALL contract to Midnight Preprod.
//
// Preconditions:
//   1. `ops/vault/preprod-seed` exists (64 hex chars).
//   2. That seed's Preprod unshielded address has non-zero tNight (fund
//      via https://midnight.network/test-faucet — see docs/L1-deploy-setup.md).
//   3. Local proof server responds on http://127.0.0.1:6300
//      (docker ps | grep lowball-proof-server).
//   4. Contract has been compiled: `npm run compact`.
//
// Usage: `npm run deploy:preprod` from contract/.
//
// The heavy midnight-js + wallet-sdk imports live in ops/src/wallet.ts. Deploy
// tx assembly checks the class identity of onchain-runtime types (e.g.
// ContractMaintenanceAuthority), which fails if the managed Contract and
// compact-js resolve two physical copies of @midnight-ntwrk/onchain-runtime-v3.
// So we import the Contract from ops's own copy of the compiled managed dir
// (synced via `npm --prefix ../ops run sync:contract`) — then Contract and
// compact-js share ops's single runtime tree. `witnesses` is safe to import
// from contract/ (its @midnight imports are type-only, erased at runtime).

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// eslint-disable-next-line import/no-relative-parent-imports
import { Contract } from "../../ops/managed/lowball/contract/index.js";
import { emptyLowballPrivateState, witnesses } from "../src/witnesses.js";
// eslint-disable-next-line import/no-relative-parent-imports
import { deployToNetwork } from "../../ops/src/wallet.js";

const here = dirname(fileURLToPath(import.meta.url));
const managedPath = resolve(here, "..", "..", "ops", "managed", "lowball");
const seedPath = resolve(here, "..", "..", "ops", "vault", "preprod-seed");

async function main() {
  const result = await deployToNetwork({
    name: "lowball",
    seedPath,
    contractClass: Contract,
    witnesses,
    privateStateId: "lowballPrivateState",
    initialPrivateState: emptyLowballPrivateState(),
    zkConfigPath: managedPath,
  });
  console.log(
    "\n" +
      JSON.stringify(
        {
          contractAddress: result.contractAddress,
          txId: result.txId,
          blockHeight: result.blockHeight.toString(),
        },
        null,
        2,
      ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : e);
  process.exit(1);
});
