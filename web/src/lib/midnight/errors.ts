// One error vocabulary for everything the chain path can do to us. Each code
// maps to a specific piece of UI copy (see features/wallet + features/bidding),
// which is why the set is closed and the mapping from raw SDK/wallet errors
// happens here rather than in components.

export type LowballErrorCode =
  | 'wallet-not-installed'
  | 'wallet-incompatible'
  | 'wallet-rejected'
  | 'wallet-unresponsive'
  | 'network-mismatch'
  | 'contract-not-configured'
  | 'contract-not-found'
  | 'proof-server-unreachable'
  | 'drop-not-open'
  | 'bid-below-reserve'
  | 'reserve-not-revealed'
  | 'tx-failed'
  | 'unknown'

export class LowballError extends Error {
  readonly code: LowballErrorCode
  /** Short, actionable next step shown under the message. */
  readonly hint?: string

  constructor(
    code: LowballErrorCode,
    message: string,
    options?: { hint?: string; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'LowballError'
    this.code = code
    this.hint = options?.hint
  }
}

export const isLowballError = (e: unknown): e is LowballError =>
  e instanceof LowballError

const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : ''

/**
 * Wallet extensions report refusals as plain errors with prose messages, so
 * classification is necessarily textual. Anything we cannot place stays
 * `unknown` and is shown verbatim rather than guessed at.
 */
export const asWalletError = (e: unknown): LowballError => {
  if (isLowballError(e)) return e
  const raw = messageOf(e)

  if (/reject|declin|denied|not authoriz|unauthoriz/i.test(raw)) {
    return new LowballError('wallet-rejected', 'You declined the connection.', {
      hint: 'Nothing was sent. Reconnect whenever you are ready.',
      cause: e,
    })
  }
  if (/timeout|timed out|not respond/i.test(raw)) {
    return new LowballError('wallet-unresponsive', 'Lace did not respond.', {
      hint: 'Open the extension, unlock it, then try again.',
      cause: e,
    })
  }
  if (/network/i.test(raw)) {
    return new LowballError('network-mismatch', raw, { cause: e })
  }
  return new LowballError('unknown', raw || 'Wallet connection failed.', {
    cause: e,
  })
}

/**
 * Circuit `assert` failures surface as transaction errors carrying the assert
 * message from lowball.compact — that is how a verdict comes back to us.
 */
export const asCircuitError = (e: unknown): LowballError => {
  if (isLowballError(e)) return e
  const raw = messageOf(e)

  if (/bid below reserve/i.test(raw)) {
    return new LowballError('bid-below-reserve', 'Under the reserve.', {
      hint: 'Your amount stays sealed — nobody learns how close you were.',
      cause: e,
    })
  }
  if (/reserve not yet revealed/i.test(raw)) {
    return new LowballError(
      'reserve-not-revealed',
      'The reserve has not been revealed yet.',
      { hint: 'Verdicts land the moment the house reveals.', cause: e },
    )
  }
  if (/drop not open/i.test(raw)) {
    return new LowballError('drop-not-open', 'This drop is closed to bids.', {
      cause: e,
    })
  }
  if (/fetch|network error|ECONNREFUSED|failed to fetch/i.test(raw)) {
    return new LowballError(
      'proof-server-unreachable',
      'The proof server did not answer.',
      {
        hint: 'Start it with `docker start lowball-proof-server`, then retry — your bid is still typed in.',
        cause: e,
      },
    )
  }
  return new LowballError('tx-failed', raw || 'The transaction failed.', {
    cause: e,
  })
}
