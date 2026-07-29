// Runtime configuration. Everything the app needs to talk to a network lives
// here — no other module reads import.meta.env.
//
// Per docs/architecture.md §8 the contract address is env-supplied, so the same
// bundle can point at a Preprod deploy today and a mainnet deploy at L6.

export type NetworkId = 'preprod' | 'preview' | 'mainnet' | 'undeployed'

const PREPROD_INDEXER = 'https://indexer.preprod.midnight.network/api/v3/graphql'
const PREPROD_INDEXER_WS = 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws'

const env = import.meta.env

const trimmed = (value: string | undefined): string | null => {
  const v = value?.trim()
  return v ? v : null
}

/** The connector API versions this app is built against (semver range). */
export const COMPATIBLE_CONNECTOR_API_VERSION = '4.x'

export const config = {
  networkId: (trimmed(env.VITE_NETWORK_ID) ?? 'preprod') as NetworkId,

  /**
   * Address of the deployed LOWBALL contract. `null` until the deploy lands —
   * the UI stays browsable and every bid affordance explains why it is off.
   */
  contractAddress: trimmed(env.VITE_CONTRACT_ADDRESS),

  indexerUri: trimmed(env.VITE_INDEXER_URI) ?? PREPROD_INDEXER,
  indexerWsUri: trimmed(env.VITE_INDEXER_WS_URI) ?? PREPROD_INDEXER_WS,

  /** Used only when the connected wallet reports no prover of its own. */
  proofServerUri: trimmed(env.VITE_PROOF_SERVER_URI) ?? 'http://127.0.0.1:6300',

  laceInstallUrl:
    'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk',
  faucetUrl: 'https://midnight-tmnight-preprod.nethermind.dev/',
} as const

/** Human label for the target network, for banners and the footer. */
export const networkLabel: Record<NetworkId, string> = {
  preprod: 'Preprod',
  preview: 'Preview',
  mainnet: 'Mainnet',
  undeployed: 'Local',
}

export const isContractConfigured = (): boolean => config.contractAddress !== null

/** Block explorer link for a contract address on the configured network. */
export const explorerContractUrl = (address: string): string =>
  `https://explorer.preprod.midnight.network/contracts/${address}`

/** Block explorer link for a transaction on the configured network. */
export const explorerTxUrl = (txId: string): string =>
  `https://explorer.preprod.midnight.network/transactions/${txId}`
