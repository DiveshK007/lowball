import { describe, expect, it } from 'vitest'

import { formatCountdown, formatDust, groupHex, parseDust, shortHex } from './format'

describe('parseDust', () => {
  it('converts whole and fractional amounts to minor units', () => {
    expect(parseDust('12')).toEqual({ ok: true, value: 12_000_000n })
    expect(parseDust('12.5')).toEqual({ ok: true, value: 12_500_000n })
    expect(parseDust('0.000001')).toEqual({ ok: true, value: 1n })
  })

  it('trims surrounding whitespace', () => {
    expect(parseDust('  7.25 ')).toEqual({ ok: true, value: 7_250_000n })
  })

  it('rejects anything that is not a plain positive decimal', () => {
    for (const input of ['', 'abc', '-5', '1e6', '1,5', '1.2.3']) {
      expect(parseDust(input).ok, input).toBe(false)
    }
  })

  it('rejects zero — a bid has to be a bid', () => {
    expect(parseDust('0')).toEqual({ ok: false, error: 'Bid something above zero.' })
  })

  it('rejects precision the ledger cannot hold rather than truncating', () => {
    const result = parseDust('1.1234567')
    expect(result.ok).toBe(false)
  })
})

describe('formatDust', () => {
  it('round-trips parsed amounts and trims trailing zeros', () => {
    expect(formatDust(12_500_000n)).toBe('12.5')
    expect(formatDust(12_000_000n)).toBe('12')
    expect(formatDust(1n)).toBe('0.000001')
  })
})

describe('formatCountdown', () => {
  it('shows days once past 24h and seconds inside a day', () => {
    expect(formatCountdown((2 * 86_400 + 4 * 3600 + 13 * 60) * 1000)).toBe('2d 04h 13m')
    expect(formatCountdown((4 * 3600 + 13 * 60 + 6) * 1000)).toBe('04h 13m 06s')
  })

  it('collapses to "now" once elapsed', () => {
    expect(formatCountdown(0)).toBe('now')
    expect(formatCountdown(-1000)).toBe('now')
  })
})

describe('shortHex', () => {
  it('keeps both ends so hashes stay comparable by eye', () => {
    expect(shortHex('0123456789abcdef0123456789abcdef', 4)).toBe('0123…cdef')
  })

  it('leaves short values alone', () => {
    expect(shortHex('0123', 4)).toBe('0123')
  })
})

describe('groupHex', () => {
  it('splits a 64-char hash into eight readable blocks', () => {
    const hash = 'e69a2875d952bc3efe324f3109c8f7f6ca48face518f261ef721e89fbddc138d'
    const out = groupHex(hash)
    expect(out.split(' ')).toHaveLength(8)
    expect(out.replace(/ /g, '')).toBe(hash)
  })

  it('strips a 0x prefix so the blocks align', () => {
    expect(groupHex('0xdeadbeefcafe', 4)).toBe('dead beef cafe')
  })

  it('leaves anything shorter than one block alone', () => {
    expect(groupHex('abc', 8)).toBe('abc')
  })
})
