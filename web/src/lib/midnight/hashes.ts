// The two commitment hashes, as pure functions over the generated bindings.
//
// Kept apart from client.ts on purpose: that module opens providers and sets the
// network id at import time, while these are deterministic arithmetic. Isolating
// them means the receipts page can verify a commitment with no wallet, no
// network, and no browser — and that the maths can be unit-tested directly
// against values the chain has already accepted.

import { toHex } from '@midnight-ntwrk/midnight-js-utils'

import * as Lowball from './generated/lowball/index.js'

/** The commitment a given (amount, secret) pair produces — computed locally. */
export const bidCommitmentHex = (amount: bigint, secret: Uint8Array): string =>
  toHex(Lowball.pureCircuits.bidHash(amount, secret))

/**
 * The commitment a given (reserve, salt) pair produces — the same pure circuit
 * the contract runs inside `revealReserve`. The receipts page uses it so anyone
 * can recompute the published commitment themselves instead of trusting us.
 */
export const reserveCommitmentHex = (reserve: bigint, salt: Uint8Array): string =>
  toHex(Lowball.pureCircuits.reserveHash(reserve, salt))
