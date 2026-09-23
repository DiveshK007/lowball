import { config } from '../../config'
import { useWallet } from '../../lib/midnight'
import { WalletPicker } from './WalletPicker'

const truncate = (address: string) =>
  address.length > 16 ? `${address.slice(0, 10)}…${address.slice(-5)}` : address

export const ConnectButton = () => {
  const { status, wallet, available, connect, disconnect } = useWallet()

  if (status === 'detecting') {
    return (
      <button type="button" className="btn btn--ghost" disabled>
        Looking for a wallet…
      </button>
    )
  }

  if (status === 'absent') {
    // 1AM first: it proves in-browser, so it is the shorter path to a bid.
    return (
      <div className="row">
        <a className="btn" href={config.oneAmInstallUrl} target="_blank" rel="noreferrer">
          Install 1AM
        </a>
        <a
          className="btn btn--ghost"
          href={config.laceInstallUrl}
          target="_blank"
          rel="noreferrer"
        >
          or Lace
        </a>
      </div>
    )
  }

  if (status === 'connected' && wallet) {
    return (
      <div className="row">
        <span className="pill pill--live" title={wallet.shieldedAddress}>
          <span className="dot" />
          {truncate(wallet.shieldedAddress)}
        </span>
        <span className="faint mono" title={`Connector API ${wallet.apiVersion}`}>
          {wallet.name}
        </span>
        <button type="button" className="btn btn--ghost" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    )
  }

  // More than one wallet installed: make the user choose rather than guessing
  // for them — the two behave differently enough to matter (proving, fees).
  if (available.length > 1) {
    return (
      <WalletPicker
        wallets={available}
        onChoose={connect}
        busy={status === 'connecting'}
      />
    )
  }

  const only = available[0]
  return (
    <button
      type="button"
      className="btn"
      onClick={() => connect(only?.key)}
      disabled={status === 'connecting'}
    >
      {status === 'connecting'
        ? 'Check your wallet…'
        : only
          ? `Connect ${only.name}`
          : 'Connect wallet'}
    </button>
  )
}
