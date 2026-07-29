// Lace (and any CAIP-372 compatible wallet) discovery + connection.
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

const isInitialAPI = (value: unknown): value is InitialAPI =>
  !!value &&
  typeof value === 'object' &&
  'apiVersion' in value &&
  typeof (value as InitialAPI).apiVersion === 'string'

/** Every Midnight wallet currently injected, compatible or not. */
export const detectWallets = (): InitialAPI[] =>
  Object.values(window.midnight ?? {}).filter(isInitialAPI)

const isCompatible = (wallet: InitialAPI): boolean =>
  semver.validRange(COMPATIBLE_CONNECTOR_API_VERSION) !== null &&
  semver.satisfies(wallet.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION, {
    includePrerelease: true,
  })

export const detectCompatibleWallets = (): InitialAPI[] =>
  detectWallets().filter(isCompatible)

/**
 * Poll for an injected wallet. Resolves with the wallets found, or an empty
 * array once the detection window closes. Returns a cancel function.
 */
export const watchForWallets = (
  onSettled: (wallets: InitialAPI[]) => void,
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

/** Synchronous — safe to call inside a click handler. */
export const selectWallet = (): InitialAPI => {
  const compatible = detectCompatibleWallets()
  if (compatible.length > 0) return compatible[0]!

  const anyWallet = detectWallets()
  if (anyWallet.length > 0) {
    const found = anyWallet.map((w) => `${w.name} ${w.apiVersion}`).join(', ')
    throw new LowballError(
      'wallet-incompatible',
      `LOWBALL needs DApp Connector API ${COMPATIBLE_CONNECTOR_API_VERSION}; found ${found}.`,
      { hint: 'Update the Lace extension, then reload this page.' },
    )
  }
  throw new LowballError('wallet-not-installed', 'No Midnight wallet found.', {
    hint: 'Install Lace, set it to ' + networkLabel[config.networkId] + ', then reload.',
  })
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      window.setTimeout(
        () => reject(new LowballError('wallet-unresponsive', 'Lace did not respond in time.', {
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
export const connectWallet = async (): Promise<WalletConnection> => {
  const wallet = selectWallet()

  let api: ConnectedAPI
  try {
    api = await withTimeout(wallet.connect(config.networkId), CONNECT_TIMEOUT_MS)
  } catch (e) {
    throw asWalletError(e)
  }

  const status = await api.getConnectionStatus().catch((e: unknown) => {
    throw asWalletError(e)
  })

  if (status.status !== 'connected') {
    throw new LowballError('wallet-rejected', 'The wallet is not connected.', {
      hint: 'Approve the LOWBALL connection request in Lace.',
    })
  }

  if (status.networkId.toLowerCase() !== config.networkId.toLowerCase()) {
    throw new LowballError(
      'network-mismatch',
      `Lace is on ${status.networkId}; LOWBALL is deployed on ${networkLabel[config.networkId]}.`,
      { hint: `Switch the network to ${networkLabel[config.networkId]} in Lace, then reconnect.` },
    )
  }

  const addresses = await api.getShieldedAddresses().catch((e: unknown) => {
    throw asWalletError(e)
  })

  return {
    api,
    summary: {
      name: wallet.name,
      icon: wallet.icon,
      apiVersion: wallet.apiVersion,
      networkId: status.networkId,
      shieldedAddress: addresses.shieldedAddress,
    },
  }
}
