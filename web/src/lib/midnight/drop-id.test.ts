import { describe, expect, it } from 'vitest'
import { DROP_ID_BYTES, dropIdBytes, dropIdSlug } from './drop-id'

describe('drop id encoding', () => {
  it('encodes a slug to a fixed 32-byte ledger key', () => {
    const key = dropIdBytes('drop-002')
    expect(key.length).toEqual(DROP_ID_BYTES)
    expect(key[0]).toEqual('d'.charCodeAt(0))
    // Everything past the slug is zero padding.
    expect(Array.from(key.slice(8))).toEqual(new Array(24).fill(0))
  })

  it('round-trips slug → key → slug', () => {
    for (const slug of ['drop-001', 'drop-002', 'a', 'x'.repeat(32)]) {
      expect(dropIdSlug(dropIdBytes(slug))).toEqual(slug)
    }
  })

  it('gives different keys to different slugs', () => {
    expect(dropIdBytes('drop-001')).not.toEqual(dropIdBytes('drop-002'))
  })

  it('rejects a slug that will not fit the key', () => {
    expect(() => dropIdBytes('x'.repeat(33))).toThrow(/holds 32/)
  })

  it('matches the encoding the contract tests pin', () => {
    // Same fixture as contract/src/test/lowball.test.ts, so a drift in either
    // copy shows up as a failing test rather than an unreadable drop.
    const key = dropIdBytes('drop-001')
    expect(Buffer.from(key).toString('hex')).toEqual(
      '64726f702d303031000000000000000000000000000000000000000000000000',
    )
  })
})
