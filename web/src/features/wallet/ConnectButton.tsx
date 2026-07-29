import { config } from '../../config'
import { useWallet } from '../../lib/midnight'

const truncate = (address: string) =>
  address.length > 16 ? `${address.slice(0, 10)}…${address.slice(-5)}` : address

export const ConnectButton = () => {
  const { status, wallet, connect, disconnect } = useWallet()

  if (status === 'detecting') {
    return (
      <button type="button" className="btn btn--ghost" disabled>
        Looking for Lace…
      </button>
    )
  }

  if (status === 'absent') {
    return (
      <a
        className="btn"
        href={config.laceInstallUrl}
        target="_blank"
        rel="noreferrer"
      >
        Install Lace
      </a>
    )
  }

  if (status === 'connected' && wallet) {
    return (
      <div className="row">
        <span className="pill pill--live" title={wallet.shieldedAddress}>
          <span className="dot" />
          {truncate(wallet.shieldedAddress)}
        </span>
        <button type="button" className="btn btn--ghost" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="btn"
      onClick={connect}
      disabled={status === 'connecting'}
    >
      {status === 'connecting' ? 'Check Lace…' : 'Connect Lace'}
    </button>
  )
}
