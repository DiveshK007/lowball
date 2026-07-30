// Shared wallet + deploy helpers for LOWBALL house-ops scripts.
// The heavy Midnight.js/wallet-sdk deps live here (installed in ops/) so
// contract/scripts/deploy.ts can stay a thin wrapper.

import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as ledger from "@midnight-ntwrk/ledger-v8";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v8";
import {
  getNetworkId,
  setNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { deployContract } from "@midnight-ntwrk/midnight-js/contracts";
import { assertIsContractAddress, toHex } from "@midnight-ntwrk/midnight-js/utils";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { HDWallet, Roles } from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
  type UnshieldedKeystore,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import * as Rx from "rxjs";
import { WebSocket } from "ws";

// The wallet SDK's GraphQL subscription client needs a WebSocket in Node.
// @ts-expect-error assigning to globalThis
globalThis.WebSocket = WebSocket;

const HEX_64 = /^[0-9a-fA-F]{64}$/;

export type NetworkConfig = {
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
};

export const preprodConfig: NetworkConfig = {
  indexer: "https://indexer.preprod.midnight.network/api/v3/graphql",
  indexerWS: "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
  node: "https://rpc.preprod.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

// Preview is a much younger chain than Preprod (~180k blocks vs ~1.9M), so its
// dust-generation history — which the wallet must replay from genesis to sync —
// is ~100x smaller. Deploying here syncs in minutes instead of hours.
export const previewConfig: NetworkConfig = {
  indexer: "https://indexer.preview.midnight.network/api/v3/graphql",
  indexerWS: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
  node: "https://rpc.preview.midnight.network",
  proofServer: "http://127.0.0.1:6300",
};

export type NetworkName = "preprod" | "preview";

const networkConfigs: Record<NetworkName, NetworkConfig> = {
  preprod: preprodConfig,
  preview: previewConfig,
};

// Select the target network from MIDNIGHT_NETWORK (default preprod). The seed
// file is network-agnostic; only the derived address prefix differs.
export function resolveNetwork(): { name: NetworkName; config: NetworkConfig } {
  const name = (process.env.MIDNIGHT_NETWORK ?? "preprod") as NetworkName;
  const config = networkConfigs[name];
  if (!config) {
    throw new Error(`Unknown MIDNIGHT_NETWORK "${name}" (use preprod|preview).`);
  }
  return { name, config };
}

export type WalletContext = {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
  unshieldedAddress: string;
};

export function readSeed(path: string): string {
  const raw = readFileSync(resolve(path), "utf-8").trim();
  if (!HEX_64.test(raw)) {
    throw new Error(
      `Seed at ${path} must be 64 hex characters (openssl rand -hex 32).`,
    );
  }
  return raw;
}

export function deriveKeys(seedHex: string) {
  const hd = HDWallet.fromSeed(Buffer.from(seedHex, "hex"));
  if (hd.type !== "seedOk") {
    throw new Error(`HDWallet.fromSeed failed: ${hd.type}`);
  }
  const derived = hd.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (derived.type !== "keysDerived") {
    throw new Error(`HD key derivation failed: ${derived.type}`);
  }
  hd.hdWallet.clear();
  return derived.keys;
}

/**
 * Derive the unshielded Bech32m address without opening any network
 * connections — safe to call before the wallet is funded.
 */
export function deriveUnshieldedAddress(
  seedHex: string,
  networkId: string,
): string {
  try {
    getNetworkId();
  } catch {
    setNetworkId(networkId);
  }
  const keys = deriveKeys(seedHex);
  const keystore = createKeystore(keys[Roles.NightExternal], getNetworkId());
  return keystore.getBech32Address().toString();
}

const buildShieldedConfig = (c: NetworkConfig) => ({
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: c.indexer,
    indexerWsUrl: c.indexerWS,
  },
  provingServerUrl: new URL(c.proofServer),
  relayURL: new URL(c.node.replace(/^http/, "ws")),
});

const buildUnshieldedConfig = (c: NetworkConfig) => ({
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: c.indexer,
    indexerWsUrl: c.indexerWS,
  },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
});

const buildDustConfig = (c: NetworkConfig) => ({
  networkId: getNetworkId(),
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
  indexerClientConnection: {
    indexerHttpUrl: c.indexer,
    indexerWsUrl: c.indexerWS,
  },
  provingServerUrl: new URL(c.proofServer),
  relayURL: new URL(c.node.replace(/^http/, "ws")),
});

/**
 * Start all three sub-wallets and block until network sync.
 * setNetworkId(...) must have been called beforehand.
 */
export async function startWallet(
  cfg: NetworkConfig,
  seedHex: string,
): Promise<WalletContext> {
  const keys = deriveKeys(seedHex);
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(
    keys[Roles.NightExternal],
    getNetworkId(),
  );

  const walletConfig = {
    ...buildShieldedConfig(cfg),
    ...buildUnshieldedConfig(cfg),
    ...buildDustConfig(cfg),
  };

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: (c) => ShieldedWallet(c).startWithSecretKeys(shieldedSecretKeys),
    unshielded: (c) =>
      UnshieldedWallet(c).startWithPublicKey(
        PublicKey.fromKeyStore(unshieldedKeystore),
      ),
    dust: (c) =>
      DustWallet(c).startWithSecretKey(
        dustSecretKey,
        ledger.LedgerParameters.initialParameters().dust,
      ),
  });
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return {
    wallet,
    shieldedSecretKeys,
    dustSecretKey,
    unshieldedKeystore,
    unshieldedAddress: unshieldedKeystore.getBech32Address().toString(),
  };
}

// Set LOWBALL_SYNC_DEBUG=1 to log per-tick sync progress while a wallet
// catches up to the network tip (quiet by default).
const SYNC_DEBUG = process.env.LOWBALL_SYNC_DEBUG === "1";

const logSyncProgress = (s: any) => {
  if (!SYNC_DEBUG) return;
  const fmt = (label: string, p: any) => {
    if (!p) return `${label}=<none>`;
    const done = typeof p.isStrictlyComplete === "function"
      ? p.isStrictlyComplete()
      : "?";
    return `${label}[conn=${p.isConnected} applied=${p.appliedIndex}/${p.highestRelevantWalletIndex} complete=${done}]`;
  };
  console.log(
    `  sync: synced=${s.isSynced} ` +
      `${fmt("shielded", s.shielded?.state?.progress)} ` +
      `${fmt("unshielded", s.unshielded?.progress)} ` +
      `${fmt("dust", s.dust?.state?.progress)}`,
  );
};

// Transient node/indexer blips surface as a thrown Wallet.Sync error that would
// otherwise abort a long in-memory sync and lose all progress. Re-subscribe on
// error (the wallet keeps its internal sync state) with a bounded backoff.
// Placed before the completion filter so each throttled progress tick resets the
// counter — we tolerate many transient errors as long as we keep making progress.
const retryTransientSync = <T>() =>
  Rx.retry<T>({
    count: 12,
    resetOnSuccess: true,
    delay: (err: any, n: number) => {
      console.log(
        `  sync stream error (retry ${n}/12): ${err?._tag ?? err?.message ?? err}`,
      );
      return Rx.timer(10_000);
    },
  });

// Full sync: all three ledgers strictly complete. Required before building a
// transaction (dust fees + shielded coins must be fully applied). Cold sync of
// the dust ledger from genesis can take ~1-2h since sync state is in-memory.
export const waitForSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap(logSyncProgress),
      retryTransientSync(),
      Rx.filter((s) => s.isSynced),
    ),
  );

// Fast path for read-only funding checks: the tNight balance lives in the
// unshielded ledger, which completes in seconds — no need to wait out the
// slow shielded/dust cold sync just to confirm the wallet is funded.
export const waitForUnshieldedSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap(logSyncProgress),
      retryTransientSync(),
      Rx.filter((s: any) => s.unshielded?.progress?.isStrictlyComplete?.()),
    ),
  );

export function unshieldedBalanceOf(state: any): bigint {
  return state.unshielded.balances[unshieldedToken().raw] ?? 0n;
}

/**
 * Fees on Midnight are paid in dust, which NIGHT only generates once its UTXOs
 * are registered. A freshly funded wallet has NIGHT but no dust, so before any
 * fee-bearing tx we register unregistered NIGHT UTXOs (the registration tx pays
 * its own fee from back-dated dust — see the ledger dust spec) and wait for a
 * spendable dust coin to appear (~1-2 min).
 */
async function ensureDustRegistered(ctx: WalletContext): Promise<void> {
  const hasSpendableDust = (s: any) =>
    (s.dust?.availableCoins?.length ?? 0) > 0 && s.dust.balance(new Date()) > 0n;

  const state: any = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(retryTransientSync(), Rx.filter((s: any) => s.isSynced)),
  );
  if (hasSpendableDust(state)) {
    console.log(`Dust already available: ${state.dust.balance(new Date())}`);
    return;
  }

  const unregistered = state.unshielded.availableCoins.filter(
    (c: any) => c.meta?.registeredForDustGeneration === false,
  );
  if (unregistered.length === 0) {
    console.log(`All NIGHT already registered; waiting for dust to generate...`);
  } else {
    console.log(`Registering ${unregistered.length} NIGHT UTXO(s) for dust...`);
    const recipe = await ctx.wallet.registerNightUtxosForDustGeneration(
      unregistered,
      ctx.unshieldedKeystore.getPublicKey(),
      (payload) => ctx.unshieldedKeystore.signData(payload),
    );
    const finalized = await ctx.wallet.finalizeRecipe(recipe);
    const txId = await ctx.wallet.submitTransaction(finalized);
    console.log(`Dust registration submitted: ${txId}`);
  }

  console.log(`Waiting for dust to generate (1-2 min)...`);
  await Rx.firstValueFrom(
    ctx.wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.tap(logSyncProgress),
      retryTransientSync(),
      Rx.filter((s: any) => s.isSynced && hasSpendableDust(s)),
    ),
  );
  console.log(`Dust ready.`);
}

// --- Deploy ---------------------------------------------------------------

/**
 * Deploy a compiled Compact contract using the funded seed. Target network is
 * chosen by MIDNIGHT_NETWORK (preprod|preview, default preprod) — see
 * resolveNetwork(). `contractClass` is the generated `Contract` class from
 * `contract/src/managed/<name>/contract/index.js`.
 * `zkConfigPath` is the absolute path to the same `managed/<name>` dir.
 */
export async function deployToNetwork<Ledger, PrivateState>(args: {
  name: string;
  seedPath: string;
  contractClass: new (witnesses: any) => any;
  witnesses: any;
  privateStateId: string;
  initialPrivateState: PrivateState;
  zkConfigPath: string;
}): Promise<{ contractAddress: string; txId: string; blockHeight: bigint }> {
  const { name: network, config } = resolveNetwork();
  setNetworkId(network);
  const seed = readSeed(args.seedPath);

  console.log(`Starting wallet + syncing to ${network}...`);
  const ctx = await startWallet(config, seed);
  try {
    console.log(`Unshielded address: ${ctx.unshieldedAddress}`);
    const state = await waitForSync(ctx.wallet);
    const balance = unshieldedBalanceOf(state);
    console.log(`Unshielded balance: ${balance.toLocaleString()} tNight`);
    if (balance === 0n) {
      throw new Error(
        "Wallet has 0 tNight. Fund it at https://midnight.network/test-faucet and retry.",
      );
    }

    await ensureDustRegistered(ctx);

    console.log(`Pre-compiling contract with ZK assets...`);
    const compiled = CompiledContract.make(args.name, args.contractClass).pipe(
      CompiledContract.withVacantWitnesses,
      CompiledContract.withCompiledFileAssets(args.zkConfigPath),
    );

    console.log(`Building midnight-js providers...`);
    const providers = await buildProviders(
      ctx,
      config,
      args.privateStateId,
      args.zkConfigPath,
    );

    console.log(`Submitting deploy transaction...`);
    const deployed = await deployContract(providers, {
      compiledContract: compiled,
      privateStateId: args.privateStateId,
      initialPrivateState: args.initialPrivateState,
    });

    const contractAddress = deployed.deployTxData.public.contractAddress;
    assertIsContractAddress(contractAddress);
    const txId = String(deployed.deployTxData.public.txId);
    const blockHeight = BigInt(deployed.deployTxData.public.blockHeight ?? 0);

    console.log(`\nDeployed!`);
    console.log(`  contract:    ${contractAddress}`);
    console.log(`  tx:          ${txId}`);
    console.log(`  block:       ${blockHeight}`);
    return { contractAddress, txId, blockHeight };
  } finally {
    await ctx.wallet.stop();
  }
}

async function buildProviders(
  ctx: WalletContext,
  cfg: NetworkConfig,
  privateStateId: string,
  zkConfigPath: string,
) {
  const walletProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<string>(zkConfigPath);
  const accountId = walletProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, "hex").toString("base64")}!`;
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `lowball-${privateStateId}`,
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(cfg.indexer, cfg.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(cfg.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

async function createWalletAndMidnightProvider(ctx: WalletContext) {
  const state = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  return {
    getCoinPublicKey() {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        {
          shieldedSecretKeys: ctx.shieldedSecretKeys,
          dustSecretKey: ctx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx: any) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
}
