// House-side copy of the LOWBALL witnesses. Mirrors contract/src/witnesses.ts
// (kept local so ops/ typechecks without reaching across the package root).
// The contract is frozen at L1; if its witness set changes, update both.

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime'

import type { Ledger } from '../managed/lowball/contract/index.js'

export type LowballPrivateState = {
  readonly bidAmount: bigint
  readonly bidderSecret: Uint8Array
  readonly reserve: bigint
  readonly salt: Uint8Array
}

export const emptyLowballPrivateState = (): LowballPrivateState => ({
  bidAmount: 0n,
  bidderSecret: new Uint8Array(32),
  reserve: 0n,
  salt: new Uint8Array(32),
})

export const witnesses = {
  bidAmountWitness: ({
    privateState,
  }: WitnessContext<Ledger, LowballPrivateState>): [LowballPrivateState, bigint] => [
    privateState,
    privateState.bidAmount,
  ],
  bidderSecretWitness: ({
    privateState,
  }: WitnessContext<Ledger, LowballPrivateState>): [LowballPrivateState, Uint8Array] => [
    privateState,
    privateState.bidderSecret,
  ],
  reserveWitness: ({
    privateState,
  }: WitnessContext<Ledger, LowballPrivateState>): [LowballPrivateState, bigint] => [
    privateState,
    privateState.reserve,
  ],
  saltWitness: ({
    privateState,
  }: WitnessContext<Ledger, LowballPrivateState>): [LowballPrivateState, Uint8Array] => [
    privateState,
    privateState.salt,
  ],
}
