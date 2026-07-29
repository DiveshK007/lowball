// Local custody of the two things only this device knows: the bid amount and
// the bidder secret. Losing them means losing the ability to prove a win
// (docs/architecture.md §5.2), so they are written before the transaction is
// sent, not after it confirms.

const KEY_PREFIX = 'lowball.bid.'

/**
 * `pending` is the journal state from docs/architecture.md §5.2: written
 * *before* the transaction is submitted, so a tab that dies mid-proof still
 * has the secret needed to reconcile or retry.
 */
export type BidVerdict = 'pending' | 'sealed' | 'win' | 'no-win'

export type StoredBid = {
  readonly dropId: string
  /** Decimal string — bigint does not survive JSON. */
  readonly amount: string
  readonly secretHex: string
  readonly commitmentHex: string
  /** Empty until the submission comes back. */
  readonly txId: string
  readonly sealedAt: number
  readonly verdict: BidVerdict
}

const keyFor = (dropId: string) => `${KEY_PREFIX}${dropId}`

export const randomSecretHex = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export const loadBid = (dropId: string): StoredBid | null => {
  try {
    const raw = window.localStorage.getItem(keyFor(dropId))
    return raw ? (JSON.parse(raw) as StoredBid) : null
  } catch {
    return null
  }
}

export const saveBid = (bid: StoredBid): void => {
  try {
    window.localStorage.setItem(keyFor(bid.dropId), JSON.stringify(bid))
  } catch {
    // Private browsing / quota. The bid still stands onchain; the user just
    // needs their downloaded backup to claim it.
  }
}

export const recordVerdict = (dropId: string, verdict: BidVerdict): void => {
  const bid = loadBid(dropId)
  if (bid) saveBid({ ...bid, verdict })
}

export const forgetBid = (dropId: string): void => {
  try {
    window.localStorage.removeItem(keyFor(dropId))
  } catch {
    // nothing to do
  }
}

/** The "download backup" payload nudged on every seal. */
export const backupFileFor = (bid: StoredBid): { name: string; body: string } => ({
  name: `lowball-${bid.dropId}-bid-backup.json`,
  body: JSON.stringify(
    {
      warning:
        'Keep this private. It is the only proof of what you bid — anyone holding it can claim this bid.',
      ...bid,
    },
    null,
    2,
  ),
})
