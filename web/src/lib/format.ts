// Pure formatting + parsing. No SDK, no React — safe to unit test.

/** tDUST is quoted with 6 decimals; ledger values are minor units. */
export const DUST_DECIMALS = 6
const MINOR = 10n ** BigInt(DUST_DECIMALS)

export type ParseResult =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly error: string }

/**
 * Parse a typed tDUST amount into ledger minor units. Deliberately strict: a
 * bid is money, and a silently truncated one is worse than a rejected one.
 */
export const parseDust = (input: string): ParseResult => {
  const text = input.trim()
  if (text === '') return { ok: false, error: 'Enter an amount.' }
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return { ok: false, error: 'Numbers only, e.g. 12.5' }
  }

  const [whole, fraction = ''] = text.split('.')
  if (fraction.length > DUST_DECIMALS) {
    return { ok: false, error: `At most ${DUST_DECIMALS} decimal places.` }
  }

  const value =
    BigInt(whole ?? '0') * MINOR +
    BigInt(fraction.padEnd(DUST_DECIMALS, '0') || '0')

  if (value <= 0n) return { ok: false, error: 'Bid something above zero.' }
  return { ok: true, value }
}

/** Minor units → display string, trailing zeros trimmed. */
export const formatDust = (value: bigint): string => {
  const whole = value / MINOR
  const fraction = (value % MINOR).toString().padStart(DUST_DECIMALS, '0').replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : `${whole}`
}

/** Milliseconds → "2d 04h 13m" / "04h 13m 06s" once inside a day. */
export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'now'
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')

  return days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m`
    : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

export const shortHex = (hex: string, keep = 8): string =>
  hex.length <= keep * 2 + 1 ? hex : `${hex.slice(0, keep)}…${hex.slice(-keep)}`

/**
 * Group a hex string into fixed-width blocks.
 *
 * A 64-character hash is unreadable as one run and impossible to compare by
 * eye. Chunking it lets someone verify a commitment against an explorer by
 * scanning block-by-block, which is the whole point of publishing it.
 */
export const groupHex = (hex: string, size = 8): string => {
  const clean = hex.replace(/^0x/, '')
  if (clean.length <= size) return clean
  return (clean.match(new RegExp(`.{1,${size}}`, 'g')) ?? [clean]).join(' ')
}
