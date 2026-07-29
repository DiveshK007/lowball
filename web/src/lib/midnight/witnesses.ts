// Browser-side witness implementations, mirroring contract/src/witnesses.ts.
// These functions are the only place a bid amount is handed to a circuit, and
// they hand it over locally — the value is proved against, never transmitted.

import type { WitnessContext } from '@midnight-ntwrk/compact-runtime'
import type { Ledger } from './generated/lowball/index.js'

export type LowballPrivateState = {
  readonly bidAmount: bigint
  readonly bidderSecret: Uint8Array
  readonly reserve: bigint
  readonly salt: Uint8Array
}

export const emptyLowballPrivateState = (): LowballPrivateState => ({
  bidAmount: 0n,
  bidderSecret: new Uint8Array(32),
  // The house holds the reserve preimage in ops/vault; the web app never has
  // it, so these stay zeroed. revealReserve is not callable from here.
  reserve: 0n,
  salt: new Uint8Array(32),
})

type Ctx = WitnessContext<Ledger, LowballPrivateState>

export const witnesses = {
  bidAmountWitness: ({ privateState }: Ctx): [LowballPrivateState, bigint] => [
    privateState,
    privateState.bidAmount,
  ],

  bidderSecretWitness: ({
    privateState,
  }: Ctx): [LowballPrivateState, Uint8Array] => [
    privateState,
    privateState.bidderSecret,
  ],

  reserveWitness: ({ privateState }: Ctx): [LowballPrivateState, bigint] => [
    privateState,
    privateState.reserve,
  ],

  saltWitness: ({ privateState }: Ctx): [LowballPrivateState, Uint8Array] => [
    privateState,
    privateState.salt,
  ],
}
