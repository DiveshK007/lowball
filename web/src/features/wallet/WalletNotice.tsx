// Every wallet failure mode from spec §6 gets its own recovery path here, so
// no screen has to invent copy for "Lace is missing" or "wrong network".

import { config, networkLabel } from '../../config'
import { useWallet } from '../../lib/midnight'
import { Banner } from '../../ui/Banner'
import type { BannerTone } from '../../ui/Banner'

export const WalletNotice = () => {
  const { status, error, connect, dismissError } = useWallet()

  if (error) {
    const tone: BannerTone = error.code === 'wallet-rejected' ? 'warn' : 'error'
    const retry =
      error.code === 'wallet-not-installed' ? (
        <a
          className="btn btn--ghost"
          href={config.laceInstallUrl}
          target="_blank"
          rel="noreferrer"
        >
          Install
        </a>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={connect}>
          Try again
        </button>
      )

    return (
      <div className="row" style={{ alignItems: 'stretch' }}>
        <Banner tone={tone} title={error.message} hint={error.hint} action={retry} />
        <button
          type="button"
          className="btn btn--ghost"
          onClick={dismissError}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    )
  }

  if (status === 'absent') {
    return (
      <Banner
        tone="warn"
        title="No Midnight wallet detected."
        hint={
          <>
            LOWBALL needs Lace to sign a bid. Install it, set the network to{' '}
            {networkLabel[config.networkId]}, fund it from the faucet, then reload
            this page. Browsing works without a wallet.
          </>
        }
        action={
          <a
            className="btn"
            href={config.laceInstallUrl}
            target="_blank"
            rel="noreferrer"
          >
            Install Lace
          </a>
        }
      />
    )
  }

  return null
}
