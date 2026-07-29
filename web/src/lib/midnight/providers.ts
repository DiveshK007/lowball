// Midnight.js provider wiring for the browser.
//
// The wallet is the source of truth for service URIs (spec: respect the user's
// configured indexer/prover for privacy); app config is only the fallback for
// the wallet-free read path.

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider'
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider'
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider'
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger'
import type {
  FinalizedTransaction,
  MidnightProviders,
  PublicDataProvider,
  TransactionId,
  UnboundTransaction,
} from '@midnight-ntwrk/midnight-js-types'
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils'

import { config } from '../../config'
import { LowballError } from './errors'
import type { LowballCircuitId } from './types'
import type { LowballPrivateState } from './witnesses'

export const PRIVATE_STATE_ID = 'lowballPrivateState'
export type LowballPrivateStateId = typeof PRIVATE_STATE_ID

export type LowballProviders = MidnightProviders<
  LowballCircuitId,
  LowballPrivateStateId,
  LowballPrivateState
>

/**
 * Encryption password for the local private-state store. Derived from the
 * wallet's coin public key so it is stable per account and never typed by a
 * user, and shaped to satisfy the SDK's password policy (16+ chars, 3+
 * character classes, no long runs or sequences — hence the grouping).
 */
const storagePasswordFor = (coinPublicKey: string): string =>
  `Lowball!${coinPublicKey.slice(0, 24).replace(/(.{3})/g, '$1-')}`

/** Read-only chain access. Works with no wallet installed (receipts, gallery). */
export const publicDataProvider = (): PublicDataProvider =>
  indexerPublicDataProvider(config.indexerUri, config.indexerWsUri)

export const zkConfigProvider = (): FetchZkConfigProvider<LowballCircuitId> =>
  // Prover/verifier keys and ZKIR are served from this origin — see
  // web/scripts/sync-contract.mjs for how they get into public/.
  new FetchZkConfigProvider<LowballCircuitId>(
    window.location.origin,
    fetch.bind(window),
  )

/**
 * Liveness probe for the proof server. `no-cors` gives us an opaque response,
 * which is enough: a reachable server resolves, an absent one rejects.
 */
export const probeProofServer = async (uri: string): Promise<boolean> => {
  try {
    await fetch(uri, { method: 'GET', mode: 'no-cors' })
    return true
  } catch {
    return false
  }
}

export type ProviderBundle = {
  readonly providers: LowballProviders
  readonly proofServerUri: string
  readonly coinPublicKey: string
}

/** Assemble every provider a circuit call needs from a connected wallet. */
export const buildProviders = async (
  api: ConnectedAPI,
): Promise<ProviderBundle> => {
  const [walletConfig, addresses] = await Promise.all([
    api.getConfiguration(),
    api.getShieldedAddresses(),
  ])

  const proofServerUri = walletConfig.proverServerUri ?? config.proofServerUri
  if (!(await probeProofServer(proofServerUri))) {
    throw new LowballError(
      'proof-server-unreachable',
      `No proof server at ${proofServerUri}.`,
      {
        hint: 'Start it with `docker start lowball-proof-server` (port 6300), then retry.',
      },
    )
  }

  const zkConfig = zkConfigProvider()
  const coinPublicKey = addresses.shieldedCoinPublicKey

  const providers: LowballProviders = {
    privateStateProvider: levelPrivateStateProvider<
      LowballPrivateStateId,
      LowballPrivateState
    >({
      privateStateStoreName: 'lowball-private-state',
      signingKeyStoreName: 'lowball-signing-keys',
      accountId: coinPublicKey,
      privateStoragePasswordProvider: () => storagePasswordFor(coinPublicKey),
    }),
    publicDataProvider: indexerPublicDataProvider(
      walletConfig.indexerUri,
      walletConfig.indexerWsUri,
    ),
    zkConfigProvider: zkConfig,
    proofProvider: httpClientProofProvider(proofServerUri, zkConfig),
    walletProvider: {
      getCoinPublicKey: () => coinPublicKey,
      getEncryptionPublicKey: () => addresses.shieldedEncryptionPublicKey,
      // Lace balances the proven-but-unbound transaction: it pays the DUST
      // fee and adds its own Zswap proofs, then hands it back sealed.
      balanceTx: async (tx: UnboundTransaction): Promise<FinalizedTransaction> => {
        const balanced = await api.balanceUnsealedTransaction(toHex(tx.serialize()))
        return Transaction.deserialize(
          'signature',
          'proof',
          'binding',
          fromHex(balanced.tx),
        )
      },
    },
    midnightProvider: {
      submitTx: async (tx: FinalizedTransaction): Promise<TransactionId> => {
        await api.submitTransaction(toHex(tx.serialize()))
        return tx.identifiers()[0] as TransactionId
      },
    },
  }

  return { providers, proofServerUri, coinPublicKey }
}
