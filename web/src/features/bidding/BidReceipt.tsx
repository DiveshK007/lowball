// What a tester needs after a bid lands: the transaction hash, in one click,
// and somewhere to report it.
//
// This is the L5/L6 evidence path — a tester pastes their wallet address and
// this hash into the feedback form, and ops/src/verify-users.ts confirms each
// one really is a placeBid on our contract. So the hash has to be trivially
// copyable; asking a tester to select a truncated monospace string by hand is
// how you lose half your evidence.

import { useState } from 'react'

import { config, explorerTxUrl } from '../../config'
import { shortHex } from '../../lib/format'

type Props = {
  txId: string
  /** Shown above the row; the two call sites word it differently. */
  label?: string
}

export const BidReceipt = ({ txId, label = 'Transaction' }: Props) => {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(txId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (permissions, insecure context). The full
      // hash is in the link's title, so there is still a way to get it.
      setCopied(false)
    }
  }

  return (
    <div className="stack" style={{ gap: '0.5rem' }}>
      <div className="stat__label">{label}</div>
      <div className="row">
        <a
          className="mono"
          href={explorerTxUrl(txId)}
          target="_blank"
          rel="noreferrer"
          title={txId}
        >
          {shortHex(txId, 10)} →
        </a>
        <button type="button" className="btn btn--ghost" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy tx hash'}
        </button>
      </div>
      {config.feedbackFormUrl ? (
        <a
          className="btn btn--ghost"
          href={config.feedbackFormUrl}
          target="_blank"
          rel="noreferrer"
        >
          Tell us how that went →
        </a>
      ) : null}
    </div>
  )
}
