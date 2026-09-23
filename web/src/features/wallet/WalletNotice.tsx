// Every wallet failure mode from spec §6 gets its own recovery path here, so
// no screen has to invent copy for "no wallet" or "wrong network".

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
          href={config.oneAmInstallUrl}
          target="_blank"
          rel="noreferrer"
        >
          Install 1AM
        </a>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => connect()}>
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
            You need a Midnight wallet to sign a bid. <strong>1AM</strong> is the
            shorter path — it proves in your browser, so there is no proof server
            to install. <strong>Lace</strong> works too, but needs one running
            locally. Either way, set the network to{' '}
            {networkLabel[config.networkId]} and fund it from the faucet, then
            reload. Browsing works without a wallet.
          </>
        }
        action={
          <a
            className="btn"
            href={config.oneAmInstallUrl}
            target="_blank"
            rel="noreferrer"
          >
            Install 1AM
          </a>
        }
      />
    )
  }

  return null
}
