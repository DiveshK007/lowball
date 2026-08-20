import { Link, useParams } from 'react-router-dom'

import { explorerContractUrl } from '../config'
import { findDrop } from '../config/drops'
import { formatDust, shortHex } from '../lib/format'
import { useDropState, useWallet } from '../lib/midnight'
import { Banner } from '../ui/Banner'
import { Stat } from '../ui/Stat'
import { BidForm } from '../features/bidding/BidForm'
import { Envelope } from '../features/bidding/Envelope'
import type { EnvelopeState } from '../features/bidding/Envelope'
import { PrivacySplit } from '../features/bidding/PrivacySplit'
import { VerdictPanel } from '../features/bidding/VerdictPanel'
import { useBidFlow } from '../features/bidding/useBidFlow'
import { Countdown } from '../features/drops/Countdown'
import { PhasePill } from '../features/drops/PhasePill'
import { WalletNotice } from '../features/wallet/WalletNotice'

export const DropPage = () => {
  const { dropId = '' } = useParams()
  const drop = findDrop(dropId)
  const wallet = useWallet()
  const { state, loading, error, refresh } = useDropState(drop?.contractAddress ?? null)
  const flow = useBidFlow(dropId, drop?.contractAddress ?? null, state)

  if (!drop) {
    return (
      <div className="center-note">
        <h2>No such drop.</h2>
        <Link className="btn btn--ghost" to="/">
          Back to the gallery
        </Link>
      </div>
    )
  }

  const envelopeState: EnvelopeState = flow.sealing
    ? 'proving'
    : flow.opening
      ? 'opening'
      : flow.bid?.verdict === 'win'
        ? 'won'
        : flow.bid?.verdict === 'no-win'
          ? 'lost'
          : flow.bid?.verdict === 'pending'
            ? 'proving'
            : flow.bid
              ? 'sealed'
              : 'empty'

  const blockedReason =
    drop.contractAddress === null
      ? 'Awaiting contract deploy'
      : state?.phase === 'revealed'
        ? 'Bidding closed'
        : state && state.phase === 'open' && state.stock === 0
          ? 'Sold out'
          : state?.phase === 'unset'
            ? 'Drop not opened yet'
            : null

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link className="faint" to="/" style={{ textDecoration: 'none' }}>
        ← All drops
      </Link>

      <WalletNotice />

      {error ? (
        <Banner
          tone="error"
          title={error.message}
          hint={error.hint}
          action={
            <button type="button" className="btn btn--ghost" onClick={refresh}>
              Retry
            </button>
          }
        />
      ) : null}

      {flow.error ? (
        <Banner tone="error" title={flow.error.message} hint={flow.error.hint} />
      ) : null}

      <header className="stack" style={{ gap: '0.6rem' }}>
        <div className="row">
          <span className="eyebrow">
            Drop #{String(drop.number).padStart(3, '0')}
          </span>
          <PhasePill state={state} loading={loading} />
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)' }}>{drop.name}</h1>
        <p className="muted" style={{ margin: 0, maxWidth: '46rem' }}>
          {drop.blurb}
        </p>
      </header>

      <div className="drop-layout">
        <section className="tray">
          <div className="card__core ritual">
          <Envelope state={envelopeState} />

          {flow.bid ? (
            <VerdictPanel
              bid={flow.bid}
              state={state}
              flow={flow}
              dropNumber={drop.number}
            />
          ) : (
            <BidForm
              flow={flow}
              srp={drop.srp}
              blockedReason={blockedReason}
              walletConnected={wallet.status === 'connected'}
              onConnect={wallet.connect}
            />
          )}
          </div>
        </section>

        <section className="card stack">
          <span className="eyebrow">Onchain right now</span>
          <div className="stat-row">
            <Stat label="Stock" value={state?.stock ?? '—'} />
            <Stat label="Sealed bids" value={state?.bidCount ?? '—'} />
          </div>

          {state?.phase === 'revealed' && state.revealedReserve !== null ? (
            <div className="reveal-clock reveal-clock--revealed">
              <span className="reveal-clock__label">Reserve</span>
              <span className="reveal-clock__value">
                {formatDust(state.revealedReserve)} tDUST
              </span>
            </div>
          ) : (
            <Countdown variant="clock" label="Closes in" to={state?.closeTime ?? null} />
          )}

          <div className="stack" style={{ gap: '0.4rem' }}>
            <span className="stat__label">Reserve commitment</span>
            <span className="mono">
              {state ? shortHex(state.commitmentHex, 16) : 'awaiting chain read'}
            </span>
            <span className="faint" style={{ fontSize: '0.82rem' }}>
              Published before bidding opened. The reveal must hash to exactly
              this, or the contract rejects it.
            </span>
          </div>

          {drop.contractAddress ? (
            <a
              className="mono"
              href={explorerContractUrl(drop.contractAddress)}
              target="_blank"
              rel="noreferrer"
            >
              contract {shortHex(drop.contractAddress, 10)} →
            </a>
          ) : null}

          <Link className="mono" to={`/receipts/${drop.id}`}>
            public receipts — verify this drop →
          </Link>
        </section>
      </div>

      {flow.bid ? (
        <PrivacySplit
          bid={flow.bid}
          state={state}
          contractAddress={drop.contractAddress}
        />
      ) : null}
    </div>
  )
}
