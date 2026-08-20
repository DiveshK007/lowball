// These are the numbers the chain already accepted, not fixtures we invented.
//
// Drop #001 on Preview (contract e5f6d470…f7c4fc11) was opened with a sealed
// commitment, then revealed with `revealReserve`, whose in-circuit assert only
// passes if hash(reserve, salt) == commitment. Since the reveal transaction was
// accepted (tx 001a55f2…be7ea5, block 224316), the triple below is known-good
// on-chain data. If reserveCommitmentHex ever stops reproducing it, the
// receipts page would be verifying against different maths than the contract.

import { describe, expect, it } from 'vitest'

import { bidCommitmentHex, reserveCommitmentHex } from './hashes'

/** hex → 32 bytes, the way the receipts page parses a pasted salt. */
const bytes32 = (hex: string): Uint8Array => {
  const out = new Uint8Array(32)
  for (let i = 0; i < 32; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

// Live Preview drop #001, revealed 2026-08-01.
const RESERVE_MINOR = 25_000_000n // 25 tDUST, 6 decimals
const SALT_HEX = '422eed16beefc0a33526c79a0b128ee88d39e1cdecffb03205ef1050e7546119'
const ONCHAIN_COMMITMENT =
  'e69a2875d952bc3efe324f3109c8f7f6ca48face518f261ef721e89fbddc138d'

describe('reserveCommitmentHex', () => {
  it('reproduces the commitment the contract accepted on chain', () => {
    expect(reserveCommitmentHex(RESERVE_MINOR, bytes32(SALT_HEX))).toBe(
      ONCHAIN_COMMITMENT,
    )
  })

  it('does not match when the reserve is altered', () => {
    expect(reserveCommitmentHex(RESERVE_MINOR + 1n, bytes32(SALT_HEX))).not.toBe(
      ONCHAIN_COMMITMENT,
    )
  })

  it('does not match when the salt is altered', () => {
    const tampered = bytes32(SALT_HEX)
    tampered[0] ^= 0xff
    expect(reserveCommitmentHex(RESERVE_MINOR, tampered)).not.toBe(
      ONCHAIN_COMMITMENT,
    )
  })
})

describe('bidCommitmentHex', () => {
  it('is deterministic for the same amount and secret', () => {
    const secret = bytes32(SALT_HEX)
    expect(bidCommitmentHex(30_000_000n, secret)).toBe(
      bidCommitmentHex(30_000_000n, secret),
    )
  })

  it('separates the bid domain from the reserve domain', () => {
    // lowball.compact prefixes each hash with its own domain tag, so the same
    // inputs must not collide across the two commitment schemes.
    const salt = bytes32(SALT_HEX)
    expect(bidCommitmentHex(RESERVE_MINOR, salt)).not.toBe(
      reserveCommitmentHex(RESERVE_MINOR, salt),
    )
  })
})
