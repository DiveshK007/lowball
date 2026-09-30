// Runtime configuration. Everything the app needs to talk to a network lives
// here — no other module reads import.meta.env.
//
// Per docs/architecture.md §8 the contract address is env-supplied, so the same
// bundle can point at a Preprod deploy today and a mainnet deploy at L6.

export type NetworkId = 'preprod' | 'preview' | 'mainnet' | 'undeployed'

const PREVIEW_INDEXER = 'https://indexer.preview.midnight.network/api/v3/graphql'
const PREVIEW_INDEXER_WS = 'wss://indexer.preview.midnight.network/api/v3/graphql/ws'

const env = import.meta.env

const trimmed = (value: string | undefined): string | null => {
  const v = value?.trim()
  return v ? v : null
}

/** The connector API versions this app is built against (semver range). */
export const COMPATIBLE_CONNECTOR_API_VERSION = '4.x'

const networkId = (trimmed(env.VITE_NETWORK_ID) ?? 'preview') as NetworkId

/**
 * The live LOWBALL contract on **Preview** (deployed at block 1,094,435).
 *
 * The app ran on Preprod until 2026-09-30. Midnight's Preprod indexer went down
 * on 2026-09-29 (v3 and v4 both 503), which makes every chain read fail and the
 * gallery unreadable — nothing to do with the contract, which is intact. Per
 * mentor guidance the live demo and user onboarding run on Preview; the Preprod
 * deploy `f81e44ea…` stays in the README as deployed and verifiable.
 */
const PREVIEW_CONTRACT =
  '11da2b5b4906e4d23d5ad61e294c83d09861035971feed84e6a45210a628d530'

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
  contractAddress: trimmed(env.VITE_CONTRACT_ADDRESS) ?? PREVIEW_CONTRACT,

  indexerUri: trimmed(env.VITE_INDEXER_URI) ?? PREVIEW_INDEXER,
  indexerWsUri: trimmed(env.VITE_INDEXER_WS_URI) ?? PREVIEW_INDEXER_WS,

  /** Used only when the connected wallet reports no prover of its own. */
  proofServerUri: trimmed(env.VITE_PROOF_SERVER_URI) ?? 'http://127.0.0.1:6300',

  laceInstallUrl:
    'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk',
  /**
   * 1AM proves in-browser, so its users need no proof server. It does NOT
   * sponsor fees — DUST still comes from the user's own NIGHT (Midnight docs,
   * "do not assume sponsored fees"; 1AM's own FAQ says the same).
   */
  oneAmInstallUrl:
    'https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp',
  /**
   * Where a tester reports their bid for the L5 user count. Empty until set —
   * the UI hides the link rather than pointing at a dead URL.
   * Set VITE_FEEDBACK_FORM_URL, or paste it here.
   */
  feedbackFormUrl: trimmed(env.VITE_FEEDBACK_FORM_URL) ?? '',
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
