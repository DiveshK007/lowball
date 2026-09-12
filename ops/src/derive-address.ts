// Print the unshielded Bech32m address for the seed at ops/vault/preprod-seed.
// Address print is offline; --balance opens a wallet connection to read the
// on-chain balance. Target network is chosen by MIDNIGHT_NETWORK
// (preprod|preview, default preprod) — the seed is network-agnostic; only the
// address prefix differs.
//
//   npm run derive-address                          # address only, no network
//   npm run derive-address -- --balance             # + fetch on-chain balance
//   npm run derive-address -- --full                # + wait for a FULL sync
//   MIDNIGHT_NETWORK=preview npm run derive-address -- --balance
//
// --balance waits only on the unshielded ledger, which completes in seconds.
// --full waits on all three, which is what deploying and calling actually need:
// it is the cheapest way to find out whether the dust cache still replays before
// committing to a deploy that would otherwise wedge half way (decisions log §10,
// 2026-09-05).
//
// Fund the printed address at https://midnight.network/test-faucet.

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import {
  deriveUnshieldedAddress,
  readSeed,
  resolveNetwork,
  startWallet,
  unshieldedBalanceOf,
  waitForSync,
  waitForUnshieldedSync,
} from "./wallet.js";

const SEED_PATH = "vault/preprod-seed";
const FAUCET = "https://midnight.network/test-faucet";

async function main() {
  const args = process.argv.slice(2);
  const wantFull = args.includes("--full");
  const wantBalance = args.includes("--balance") || wantFull;
  const { name: network, config } = resolveNetwork();
  const seed = readSeed(SEED_PATH);

  const address = deriveUnshieldedAddress(seed, network);
  console.log(`\n${network} unshielded address:`);
  console.log(`  ${address}`);

  if (!wantBalance) {
    console.log(
      `\nFund at: ${FAUCET}` +
        `\nThen re-run with --balance to confirm the on-chain balance is non-zero.\n`,
    );
    return;
  }

  setNetworkId(network);
  console.log(`\nConnecting to ${network} (this can take ~10s)...`);
  const ctx = await startWallet(config, seed);
  try {
    const state = wantFull
      ? await waitForSync(ctx.wallet)
      : await waitForUnshieldedSync(ctx.wallet);
    if (wantFull) console.log(`Full sync complete — all three ledgers.`);
    const balance = unshieldedBalanceOf(state);
    console.log(`Unshielded balance: ${balance.toLocaleString()} tNight`);
    if (balance === 0n) {
      console.log(`→ Not funded yet. Request at ${FAUCET}`);
    } else {
      console.log(
        `→ Ready to deploy. Run \`npm run deploy:preprod\` from contract/` +
          (network === "preprod" ? "." : ` with MIDNIGHT_NETWORK=${network}.`),
      );
    }
  } finally {
    await ctx.wallet.stop();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
