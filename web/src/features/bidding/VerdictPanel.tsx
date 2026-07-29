// Post-seal states: waiting for the reveal, opening the envelope, and the two
// verdicts. A loss shows nothing measurable — that is the product promise.

import { explorerTxUrl } from '../../config'
import { formatDust, shortHex } from '../../lib/format'
import type { DropState } from '../../lib/midnight'
import { backupFileFor } from '../../lib/persistence/bids'
import type { StoredBid } from '../../lib/persistence/bids'
import { Countdown } from '../drops/Countdown'
import type { BidFlow } from './useBidFlow'

const downloadBackup = (bid: StoredBid) => {
  const { name, body } = backupFileFor(bid)
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

type Props = {
  bid: StoredBid
  state: DropState | null
  flow: BidFlow
  dropNumber: number
}

export const VerdictPanel = ({ bid, state, flow, dropNumber }: Props) => {
  if (bid.verdict === 'pending') {
    return (
      <div className="stack">
        <div className="stat-row">
          <div className="stat">
            <div className="stat__label">Bid being sealed</div>
            <div className="stat__value">
              {formatDust(BigInt(bid.amount))} tDUST
            </div>
          </div>
        </div>
        {flow.sealing ? (
          <p className="muted" style={{ margin: 0 }}>
            Proving, signing, submitting. Your amount and secret are already
            saved on this device, so closing this tab cannot lose them.
          </p>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              This bid was written down but never confirmed — the tab closed, or
              the submission failed. Retrying re-sends the same sealed amount, so
              it cannot double-count: if it already landed, the drop's commitment
              matches and this resolves itself on the next chain read.
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={flow.retry}>
                Retry submission
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => downloadBackup(bid)}
              >
                Download backup
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={flow.discard}
              >
                Discard
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  if (bid.verdict === 'win') {
    return (
      <div className="verdict verdict--win">
        <h2>You won it at your price.</h2>
        <p className="muted">
          The drop is yours at {formatDust(BigInt(bid.amount))} tDUST. That
          number is still not public anywhere.
        </p>
        <p className="flex-line">
          stole Drop #{String(dropNumber).padStart(3, '0')} for{' '}
          {formatDust(BigInt(bid.amount))} tDUST 🤫
        </p>
        <a className="mono" href={explorerTxUrl(bid.txId)} target="_blank" rel="noreferrer">
          {shortHex(bid.txId, 10)} →
        </a>
      </div>
    )
  }

  if (bid.verdict === 'no-win') {
    return (
      <div className="verdict">
        <h2>Under the reserve.</h2>
        <p className="muted">
          Nothing was submitted and nothing was disclosed — not your amount, not
          how close it was. The next drop is a fresh guess.
        </p>
      </div>
    )
  }

  const revealed = state?.phase === 'revealed'

  return (
    <div className="stack">
      <div className="stat-row">
        <div className="stat">
          <div className="stat__label">Your sealed bid</div>
          <div className="stat__value">
            {formatDust(BigInt(bid.amount))} tDUST
            <span className="faint" style={{ fontSize: '0.78rem' }}>
              {' '}
              (this device only)
            </span>
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">
            {revealed ? 'Reserve revealed' : 'Reveal in'}
          </div>
          <div className="stat__value">
            {revealed ? (
              state?.revealedReserve !== null && state?.revealedReserve !== undefined ? (
                `${formatDust(state.revealedReserve)} tDUST`
              ) : (
                '✓'
              )
            ) : (
              <Countdown to={state?.closeTime ?? null} />
            )}
          </div>
        </div>
      </div>

      <div className="mono">commitment {shortHex(bid.commitmentHex, 12)}</div>

      {revealed ? (
        <button
          type="button"
          className="btn btn--gold btn--wide"
          onClick={flow.openEnvelope}
          disabled={flow.opening}
        >
          {flow.opening ? 'Opening…' : 'Open your envelope'}
        </button>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Come back when the house reveals. Your verdict is computed then —
          against a reserve that was locked before you bid.
        </p>
      )}

      <div className="row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => downloadBackup(bid)}
        >
          Download bid backup
        </button>
        <span className="faint" style={{ fontSize: '0.82rem' }}>
          Lose this device and you lose the ability to prove the bid.
        </span>
      </div>
    </div>
  )
}
