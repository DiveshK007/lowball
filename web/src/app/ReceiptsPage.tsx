// Public verification page (spec §5.2). No wallet, no connection, no bid — just
// the three public facts that make a drop provably fair, in the order the chain
// recorded them, plus a box that recomputes the commitment locally so a visitor
// can check the house's arithmetic instead of trusting it.

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { explorerContractUrl, networkLabel, config } from '../config'
import { findDrop } from '../config/drops'
import { formatDust, shortHex } from '../lib/format'
import { reserveCommitmentHex, useDropState } from '../lib/midnight'

const HEX_32 = /^[0-9a-fA-F]{64}$/

type SaltCheck =
  | { readonly kind: 'invalid' }
  | { readonly kind: 'checked'; readonly computed: string; readonly matches: boolean }

const parseSalt = (input: string): Uint8Array | null => {
  const text = input.trim().replace(/^0x/, '')
  if (!HEX_32.test(text)) return null
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i += 1) {
    bytes[i] = Number.parseInt(text.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export const ReceiptsPage = () => {
  const { dropId = '' } = useParams()
  const drop = findDrop(dropId)
  const { state, loading } = useDropState(drop?.contractAddress ?? null)
  const [saltText, setSaltText] = useState('')

  const revealed = state?.phase === 'revealed'
  const reserve = state?.revealedReserve ?? null

  // Recompute hash(reserve, salt) in the browser, with the same pure circuit
  // the contract runs. Null until there is a revealed reserve and typed input.
  const check = useMemo((): SaltCheck | null => {
    if (reserve === null || saltText.trim() === '') return null
    const salt = parseSalt(saltText)
    if (!salt) return { kind: 'invalid' }
    const computed = reserveCommitmentHex(reserve, salt)
    return {
      kind: 'checked',
      computed,
      matches: computed === state?.commitmentHex,
    }
  }, [reserve, saltText, state?.commitmentHex])

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

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link className="faint" to={`/drop/${drop.id}`} style={{ textDecoration: 'none' }}>
        ← Drop #{String(drop.number).padStart(3, '0')}
      </Link>

      <header className="stack" style={{ gap: '0.6rem' }}>
        <span className="eyebrow">Public receipts · no wallet needed</span>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.8rem)' }}>
          {drop.name}
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: '46rem' }}>
          Everything below is read from {networkLabel[config.networkId]} chain state by
          anyone who opens this page. No bid amount appears here, because no bid
          amount was ever published — not even the winner's.
        </p>
      </header>

      <ol className="receipt-chain">
        <li className="card receipt-step">
          <span className="eyebrow">Step 1 · before any bid existed</span>
          <h3>The reserve was sealed</h3>
          <p className="muted">
            The house published <b>hash(reserve, salt)</b> when it opened the drop.
            From that moment the reserve is fixed: any later reveal must hash to
            exactly this value or the contract rejects it.
          </p>
          <div className="mono">
            {loading ? '…' : (state?.commitmentHex ?? 'awaiting chain read')}
          </div>
        </li>

        <li className="card receipt-step">
          <span className="eyebrow">Step 2 · while bids were open</span>
          <h3>
            {loading ? '…' : (state?.bidCount ?? 0)} sealed{' '}
            {state?.bidCount === 1 ? 'bid' : 'bids'}
          </h3>
          <p className="muted">
            The ledger counts bids. It does not store their amounts — those are
            Compact witnesses, consumed inside the proof and never written down.
            A losing bid produces no transaction at all.
          </p>
          <div className="mono">
            latest bid commitment{' '}
            {state ? shortHex(state.latestBidCommitmentHex, 12) : '—'}
          </div>
        </li>

        <li className="card receipt-step">
          <span className="eyebrow">Step 3 · after close</span>
          <h3>{revealed ? 'The reserve was revealed' : 'Reserve not yet revealed'}</h3>
          {revealed ? (
            <>
              <p className="muted">
                The contract recomputed the hash against the sealed commitment
                before disclosing this number. It matched — that check is what the
                transaction proves.
              </p>
              <div className="reveal-clock reveal-clock--revealed">
                <span className="reveal-clock__label">Revealed reserve</span>
                <span className="reveal-clock__value">
                  {reserve !== null ? `${formatDust(reserve)} tDUST` : '✓'}
                </span>
              </div>
            </>
          ) : (
            <p className="muted">
              Until the house reveals, nobody — including the house — can change
              the sealed reserve. Come back after close.
            </p>
          )}
        </li>
      </ol>

      {revealed ? (
        <section className="card stack">
          <span className="eyebrow">Verify it yourself</span>
          <h3>Recompute the commitment</h3>
          <p className="muted" style={{ margin: 0 }}>
            Paste the drop's salt (the house publishes it after close). Your
            browser runs the same hash the contract runs and compares the result
            to the commitment above. Nothing is sent anywhere.
          </p>

          <div className="field">
            <label className="field__label" htmlFor="salt">
              Salt — 32 bytes of hex
            </label>
            <div className="field__control">
              <input
                id="salt"
                autoComplete="off"
                spellCheck={false}
                placeholder="64 hex characters"
                value={saltText}
                onChange={(event) => setSaltText(event.target.value)}
                style={{ fontSize: '0.9rem' }}
              />
            </div>
            {check?.kind === 'invalid' ? (
              <div className="field__error">
                That is not 32 bytes of hex (64 characters, 0-9 a-f).
              </div>
            ) : null}
          </div>

          {check?.kind === 'checked' ? (
            <div
              className={`verdict ${check.matches ? 'verdict--win' : 'verdict--loss'}`}
            >
              <div className="verdict__stamp">
                {check.matches ? 'Hashes match' : 'Does not match'}
              </div>
              <h2>
                {check.matches
                  ? 'The house told the truth.'
                  : 'That salt does not produce this commitment.'}
              </h2>
              <p className="flex-line">{shortHex(check.computed, 16)}</p>
              <p>
                {check.matches
                  ? `hash(${formatDust(reserve!)} tDUST, your salt) equals the commitment published before bidding opened.`
                  : 'Either the salt is wrong for this drop, or it belongs to a different drop.'}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {drop.contractAddress ? (
        <section className="card stack">
          <span className="eyebrow">Check the chain directly</span>
          <p className="muted" style={{ margin: 0 }}>
            None of this needs to be taken on faith — the contract's state is
            public.
          </p>
          <a
            className="mono"
            href={explorerContractUrl(drop.contractAddress)}
            target="_blank"
            rel="noreferrer"
          >
            contract {shortHex(drop.contractAddress, 12)} →
          </a>
        </section>
      ) : null}
    </div>
  )
}
