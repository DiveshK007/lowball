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
// The heavy midnight-js + wallet-sdk imports live in ops/src/wallet.ts so
// contract/ doesn't need to duplicate the dep tree. This wrapper only
// imports the generated Contract + witnesses from contract/'s own tree.

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Contract } from "../src/managed/lowball/contract/index.js";
import { emptyLowballPrivateState, witnesses } from "../src/witnesses.js";
// eslint-disable-next-line import/no-relative-parent-imports
import { deployToNetwork } from "../../ops/src/wallet.js";

const here = dirname(fileURLToPath(import.meta.url));
const managedPath = resolve(here, "..", "src", "managed", "lowball");
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
