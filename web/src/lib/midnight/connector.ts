// Midnight wallet discovery + connection (CAIP-372 / DApp Connector v4).
//
// Supports any conformant wallet; Lace and 1AM are the two we name, because
// they are what the docs point browser DApps at. Wallets inject under their own
// key in `window.midnight` (`mnLace`, `1am`), so discovery scans the object
// rather than reaching for a fixed key.
//
// Two rules drive the shape of this module:
//   1. `connect()` must be reached from the click handler with no awaits in
//      between, or the browser eats the wallet's authorization pop-up. So
//      wallet selection is synchronous and only the connect itself is async.
//   2. Extensions inject `window.midnight` slightly after DOMContentLoaded, so
//      "not installed" is only true after we have watched for a moment.

import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import semver from 'semver'

import { COMPATIBLE_CONNECTOR_API_VERSION, config, networkLabel } from '../../config'
import { LowballError, asWalletError } from './errors'
import type { WalletSummary } from './types'

/** How long a wallet gets to answer `connect()` — the user reads a dialog. */
const CONNECT_TIMEOUT_MS = 120_000
/** How long we watch for an extension to inject itself before saying "absent". */
export const WALLET_DETECT_TIMEOUT_MS = 3_000

/**
 * Presentation metadata for wallets we can say something useful about. The
 * wallet's own `name`/`icon` still win — this only adds the one line that helps
 * a user choose, and is keyed by the `window.midnight` key each wallet injects
 * under (documented: Lace `mnLace`, 1AM `1am`).
 */
const KNOWN_WALLETS: Record<string, { blurb: string; provesInBrowser: boolean }> = {
  '1am': {
    blurb: 'Proves in your browser — no proof server to install.',
    provesInBrowser: true,
  },
  mnLace: {
    blurb: 'Needs a local proof server running on port 6300.',
    provesInBrowser: false,
  },
}

const isInitialAPI = (value: unknown): value is InitialAPI =>
  !!value &&
  typeof value === 'object' &&
  'apiVersion' in value &&
  typeof (value as InitialAPI).apiVersion === 'string'

/** A wallet as the picker needs it: the injected API plus how to re-find it. */
export type DetectedWallet = {
  /** The `window.midnight` key it injected under — the picker's stable id. */
  readonly key: string
  readonly api: InitialAPI
  readonly name: string
  readonly icon: string
  readonly apiVersion: string
  readonly compatible: boolean
  /** One line to help a user choose, when we know the wallet. */
  readonly blurb: string | null
  /** Whether this wallet proves in-browser, so no proof server is needed. */
  readonly provesInBrowser: boolean
}

/** Every Midnight wallet currently injected, compatible or not. */
export const detectWallets = (): DetectedWallet[] =>
  Object.entries(window.midnight ?? {})
    .filter((entry): entry is [string, InitialAPI] => isInitialAPI(entry[1]))
    .map(([key, api]) => ({
      key,
      api,
      name: api.name,
      icon: api.icon,
      apiVersion: api.apiVersion,
      compatible: isCompatible(api),
      blurb: KNOWN_WALLETS[key]?.blurb ?? null,
      provesInBrowser: KNOWN_WALLETS[key]?.provesInBrowser ?? false,
    }))

const isCompatible = (wallet: InitialAPI): boolean =>
  semver.validRange(COMPATIBLE_CONNECTOR_API_VERSION) !== null &&
  semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION, {
    includePrerelease: true,
  })

export const detectCompatibleWallets = (): DetectedWallet[] =>
  detectWallets().filter((w) => w.compatible)

/**
 * Poll for an injected wallet. Resolves with the wallets found, or an empty
 * array once the detection window closes. Returns a cancel function.
 */
export const watchForWallets = (
  onSettled: (wallets: DetectedWallet[]) => void,
): (() => void) => {
  const started = Date.now()
  const tick = () => {
    const wallets = detectWallets()
    if (wallets.length > 0 || Date.now() - started > WALLET_DETECT_TIMEOUT_MS) {
      window.clearInterval(timer)
      onSettled(wallets)
    }
  }
  const timer = window.setInterval(tick, 100)
  tick()
  return () => window.clearInterval(timer)
}

/**
 * Pick the wallet to connect. Synchronous — must stay reachable from a click
 * handler with no awaits before `connect()`, or the pop-up is blocked.
 *
 * With a `key` the user has chosen from the picker; without one we only auto
 * select when there is exactly one compatible wallet, so a user with both Lace
 * and 1AM is always asked rather than silently given one.
 */
export const selectWallet = (key?: string): DetectedWallet => {
  const compatible = detectCompatibleWallets()

  if (key) {
    const chosen = compatible.find((w) => w.key === key)
    if (chosen) return chosen
    throw new LowballError('wallet-not-installed', 'That wallet is no longer available.', {
      hint: 'Reload the page and pick again.',
    })
  }

  if (compatible.length === 1) return compatible[0]!
  if (compatible.length > 1) {
    throw new LowballError('wallet-not-installed', 'Choose which wallet to connect.', {
      hint: compatible.map((w) => w.name).join(' or ') + '.',
    })
  }

  const anyWallet = detectWallets()
  if (anyWallet.length > 0) {
    const found = anyWallet.map((w) => `${w.name} ${w.apiVersion}`).join(', ')
    throw new LowballError(
      'wallet-incompatible',
      `LOWBALL needs DApp Connector API ${COMPATIBLE_CONNECTOR_API_VERSION}; found ${found}.`,
      { hint: 'Update the extension, then reload this page.' },
    )
  }
  throw new LowballError('wallet-not-installed', 'No Midnight wallet found.', {
    hint:
      'Install 1AM or Lace, set it to ' +
      networkLabel[config.networkId] +
      ', then reload.',
  })
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      window.setTimeout(
        () => reject(new LowballError('wallet-unresponsive', 'The wallet did not respond in time.', {
          hint: 'Open the extension, unlock it, then try again.',
        })),
        ms,
      ),
    ),
  ])

export type WalletConnection = {
  readonly api: ConnectedAPI
  readonly summary: WalletSummary
}

/**
 * Connect to the user's wallet and verify it is on the network this build
 * targets. Throws a {@link LowballError} for every failure mode in spec §6.
 */
export const connectWallet = async (key?: string): Promise<WalletConnection> => {
  const wallet = selectWallet(key)

  let api: ConnectedAPI
  try {
    api = await withTimeout(wallet.api.connect(config.networkId), CONNECT_TIMEOUT_MS)
  } catch (e) {
    const err = asWalletError(e)
    // Only `mainnet` is a connector-standard network id; every other id is
    // wallet-defined, so a refusal here can be a naming mismatch rather than a
    // rejection. Name the possibility instead of making a tester guess.
    if (err.code === 'unknown' || err.code === 'tx-failed') {
      throw new LowballError(
        'network-mismatch',
        `${wallet.name} refused to connect on "${config.networkId}".`,
        {
          hint: `Check ${wallet.name} is set to ${networkLabel[config.networkId]}. Network ids are wallet-defined, so it may expect a different spelling.`,
          cause: e,
        },
      )
    }
    throw err
  }

  const status = await api.getConnectionStatus().catch((e: unknown) => {
    throw asWalletError(e)
  })

  if (status.status !== 'connected') {
    throw new LowballError('wallet-rejected', 'The wallet is not connected.', {
      hint: `Approve the LOWBALL connection request in ${wallet.name}.`,
    })
  }

  if (status.networkId.toLowerCase() !== config.networkId.toLowerCase()) {
    throw new LowballError(
      'network-mismatch',
      `${wallet.name} is on ${status.networkId}; LOWBALL is deployed on ${networkLabel[config.networkId]}.`,
      {
        hint: `Switch the network to ${networkLabel[config.networkId]} in ${wallet.name}, then reconnect.`,
      },
    )
  }

  const addresses = await api.getShieldedAddresses().catch((e: unknown) => {
    throw asWalletError(e)
  })

  return {
    api,
    summary: {
      key: wallet.key,
      name: wallet.name,
      icon: wallet.icon,
      apiVersion: wallet.apiVersion,
      networkId: status.networkId,
      shieldedAddress: addresses.shieldedAddress,
      provesInBrowser: wallet.provesInBrowser,
    },
  }
}
