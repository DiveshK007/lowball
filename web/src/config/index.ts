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

const networkId = (trimmed(env.VITE_NETWORK_ID) ?? 'preprod') as NetworkId

/**
 * The live LOWBALL contract on Preprod (deployed at block 2,520,320). Baked as
 * the default so a fresh clone or a Vercel build with no env vars still points
 * at the live drops; VITE_CONTRACT_ADDRESS overrides it for other deploys.
 *
 * Preview -> Preprod on 2026-09-05, multi-drop on 2026-09-12, and bid
 * accumulation the same day: bids now land in a per-drop Set, so every bidder
 * can open their own envelope rather than only the most recent one.
 */
const PREPROD_CONTRACT =
  '72dfe0295bb744874f6b5a7ed961f2b5dd4b883666f7dd87d4fd2260f169a4b1'

/** Per-network faucet + explorer roots. The app runs on Preprod (see README). */
const FAUCET: Record<NetworkId, string> = {
  preview: 'https://faucet.preview.midnight.network/',
  preprod: 'https://midnight-tmnight-preprod.nethermind.dev/',
  mainnet: '',
  undeployed: 'https://faucet.preview.midnight.network/',
}

const EXPLORER: Record<NetworkId, string> = {
  preview: 'https://explorer.preview.midnight.network',
  preprod: 'https://explorer.preprod.midnight.network',
  mainnet: 'https://explorer.midnight.network',
  undeployed: 'https://explorer.preview.midnight.network',
}

export const config = {
  networkId,

  /**
   * Address of the deployed LOWBALL contract. `null` until the deploy lands —
   * the UI stays browsable and every bid affordance explains why it is off.
   */
  contractAddress: trimmed(env.VITE_CONTRACT_ADDRESS) ?? PREPROD_CONTRACT,

  indexerUri: trimmed(env.VITE_INDEXER_URI) ?? PREPROD_INDEXER,
  indexerWsUri: trimmed(env.VITE_INDEXER_WS_URI) ?? PREPROD_INDEXER_WS,

  /** Used only when the connected wallet reports no prover of its own. */
  proofServerUri: trimmed(env.VITE_PROOF_SERVER_URI) ?? 'http://127.0.0.1:6300',

  laceInstallUrl:
    'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk',
  faucetUrl: FAUCET[networkId],
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
  `${EXPLORER[config.networkId]}/contracts/${address}`

/** Block explorer link for a transaction on the configured network. */
export const explorerTxUrl = (txId: string): string =>
  `${EXPLORER[config.networkId]}/transactions/${txId}`
