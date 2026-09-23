// Wallet chooser. Rendered only when more than one compatible wallet is
// injected — with a single wallet there is nothing to choose and the connect
// button goes straight through.
//
// Each row calls `connect(key)` from its own click handler. That matters: the
// wallet's authorization pop-up needs the user activation from *that* click, so
// the picker must not sit behind a promise.

import type { DetectedWallet } from '../../lib/midnight'

type Props = {
  wallets: readonly DetectedWallet[]
  onChoose: (walletKey: string) => void
  busy: boolean
}

export const WalletPicker = ({ wallets, onChoose, busy }: Props) => (
  <div className="wallet-picker" role="group" aria-label="Choose a wallet">
    {wallets.map((w) => (
      <button
        key={w.key}
        type="button"
        className="btn btn--ghost wallet-picker__option"
        onClick={() => onChoose(w.key)}
        disabled={busy}
      >
        {/* The wallet supplies this; render via <img>, never innerHTML. */}
        {w.icon ? <img src={w.icon} alt="" width={20} height={20} /> : null}
        <span className="wallet-picker__name">{w.name}</span>
        {w.blurb ? <span className="wallet-picker__blurb">{w.blurb}</span> : null}
      </button>
    ))}
  </div>
)
