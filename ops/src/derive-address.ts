// Print the Preprod unshielded Bech32m address for the seed at
// ops/vault/preprod-seed. Address print is offline; --balance opens a
// wallet connection to Preprod to read the on-chain balance.
//
//   npm run derive-address              # address only, no network
//   npm run derive-address -- --balance # + fetch on-chain balance
//
// Fund the printed address at https://midnight.network/test-faucet.

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  deriveUnshieldedAddress,
  preprodConfig,
  readSeed,
  startWallet,
  unshieldedBalanceOf,
  waitForUnshieldedSync,
} from "./wallet.js";

const SEED_PATH = "vault/preprod-seed";
const NETWORK = "preprod";
const FAUCET = "https://midnight.network/test-faucet";

async function main() {
  const args = process.argv.slice(2);
  const wantBalance = args.includes("--balance");
  const seed = readSeed(SEED_PATH);

  const address = deriveUnshieldedAddress(seed, NETWORK);
  console.log(`\nPreprod unshielded address:`);
  console.log(`  ${address}`);

  if (!wantBalance) {
    console.log(
      `\nFund at: ${FAUCET}` +
        `\nThen re-run with --balance to confirm the on-chain balance is non-zero.\n`,
    );
    return;
  }

  setNetworkId(NETWORK);
  console.log(`\nConnecting to Preprod (this can take ~10s)...`);
  const ctx = await startWallet(preprodConfig, seed);
  try {
    const state = await waitForUnshieldedSync(ctx.wallet);
    const balance = unshieldedBalanceOf(state);
    console.log(`Unshielded balance: ${balance.toLocaleString()} tNight`);
    if (balance === 0n) {
      console.log(`→ Not funded yet. Request at ${FAUCET}`);
    } else {
      console.log(`→ Ready to deploy. Run \`npm run deploy:preprod\` from contract/.`);
    }
  } finally {
    await ctx.wallet.stop();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
