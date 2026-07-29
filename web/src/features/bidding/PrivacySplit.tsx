// The observable privacy moment (program L2): the same instant, side by side —
// what this device knows versus everything the public ledger can show.

import { explorerContractUrl } from '../../config'
import { formatDust, shortHex } from '../../lib/format'
import type { DropState } from '../../lib/midnight'
import type { StoredBid } from '../../lib/persistence/bids'

type Props = {
  bid: StoredBid
  state: DropState | null
  contractAddress: string | null
}

export const PrivacySplit = ({ bid, state, contractAddress }: Props) => (
  <div className="split">
    <div className="split__pane">
      <span className="eyebrow">This device knows</span>
      <ul className="split__list">
        <li>
          <b>{formatDust(BigInt(bid.amount))} tDUST</b> — your bid
        </li>
        <li>
          <b>
            {bid.verdict === 'win'
              ? 'Won at your price'
              : bid.verdict === 'no-win'
                ? 'Under the reserve'
                : 'Awaiting the reveal'}
          </b>
        </li>
        <li>
          <span className="mono">{shortHex(bid.secretHex)}</span> — your bidder
          secret
        </li>
      </ul>
    </div>

    <div className="split__pane split__pane--public">
      <span className="eyebrow">The public ledger shows</span>
      <ul className="split__list">
        <li>
          <span className="sealed-value">•••••••</span> — no bid amount, anywhere
        </li>
        <li>
          <b>{state?.bidCount ?? '—'}</b> bids placed, none attributable to a
          number
        </li>
        <li>
          <span className="mono">{shortHex(bid.commitmentHex)}</span> — your bid
          commitment
        </li>
      </ul>
      {contractAddress ? (
        <a
          className="mono"
          href={explorerContractUrl(contractAddress)}
          target="_blank"
          rel="noreferrer"
        >
          Check it yourself on the explorer →
        </a>
      ) : null}
    </div>
  </div>
)
