// The contract surface, in app terms. Everything above this file talks in
// DropState / SealedBid / Verdict; everything below it is Midnight.js.

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import { findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js'
import { toHex } from '@midnight-ntwrk/midnight-js-utils'

import { config } from '../../config'
import { LowballError, asCircuitError } from './errors'
import * as Lowball from './generated/lowball/index.js'
import { PRIVATE_STATE_ID, buildProviders } from './providers'
import type { DropPhase, DropState, TxReceipt, Verdict } from './types'
import { emptyLowballPrivateState, witnesses } from './witnesses'
import type { LowballPrivateState } from './witnesses'

// Every Midnight.js package reads this; set it before any provider exists.
setNetworkId(config.networkId)

type LowballContract = Lowball.Contract<LowballPrivateState>

const compiledContract = CompiledContract.make<LowballContract>(
  'lowball',
  Lowball.Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  // Assets are fetched over HTTP in the browser (see zkConfigProvider); this
  // path only matters to filesystem-backed callers such as ops/.
  CompiledContract.withCompiledFileAssets('.'),
)

const PHASES: Record<number, DropPhase> = {
  [Lowball.DropStatus.UNSET]: 'unset',
  [Lowball.DropStatus.OPEN]: 'open',
  [Lowball.DropStatus.REVEALED]: 'revealed',
}

/** Ledger `closeTime` is seconds since epoch; 0 means "never set". */
const toDate = (seconds: bigint): Date | null =>
  seconds > 0n ? new Date(Number(seconds) * 1000) : null

const decode = (ledger: Lowball.Ledger): DropState => ({
  phase: PHASES[ledger.status] ?? 'unset',
  commitmentHex: toHex(ledger.commitment),
  stock: Number(ledger.stock),
  closeTime: toDate(ledger.closeTime),
  metaRef: ledger.metaRef,
  bidCount: Number(ledger.bidCount),
  latestBidCommitmentHex: toHex(ledger.latestBidCommitment),
  revealedReserve:
    ledger.status === Lowball.DropStatus.REVEALED ? ledger.revealedReserve : null,
  winnerFound: ledger.winnerFound,
})

const requireAddress = (address: string | null): string => {
  if (!address) {
    throw new LowballError(
      'contract-not-configured',
      'No LOWBALL contract is configured for this build.',
      { hint: 'Set VITE_CONTRACT_ADDRESS to the deployed Preprod address.' },
    )
  }
  return address
}

/**
 * Read a drop's public ledger state. No wallet required — this is the path the
 * gallery and the receipts page use.
 */
export const readDropState = async (
  address: string | null,
): Promise<DropState> => {
  const contractAddress = requireAddress(address)
  // Imported lazily so a wallet-free page never pulls the provider tree until
  // it actually reads.
  const { publicDataProvider } = await import('./providers')
  const state = await publicDataProvider().queryContractState(contractAddress)
  if (!state) {
    throw new LowballError(
      'contract-not-found',
      `No contract found at ${contractAddress}.`,
      { hint: 'Check VITE_CONTRACT_ADDRESS matches the deploy output.' },
    )
  }
  return decode(Lowball.ledger(state.data))
}

/** The commitment a given (amount, secret) pair produces — computed locally. */
export const bidCommitmentHex = (amount: bigint, secret: Uint8Array): string =>
  toHex(Lowball.pureCircuits.bidHash(amount, secret))

const connect = async (
  api: ConnectedAPI,
  address: string,
  privateState: LowballPrivateState,
) => {
  const { providers } = await buildProviders(api)
  return findDeployedContract(providers, {
    contractAddress: address,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    // Overwrites the locally stored witnesses with the ones this call proves
    // against. The values stay on this device.
    initialPrivateState: privateState,
  })
}

export type BidArgs = {
  readonly api: ConnectedAPI
  readonly address: string | null
  readonly amount: bigint
  readonly secret: Uint8Array
}

/**
 * Seal a bid: prove knowledge of (amount, secret) and publish only the
 * resulting commitment. The amount is a witness — it never reaches the chain.
 */
export const placeSealedBid = async (
  args: BidArgs,
): Promise<TxReceipt & { commitmentHex: string }> => {
  const address = requireAddress(args.address)
  try {
    const contract = await connect(args.api, address, {
      ...emptyLowballPrivateState(),
      bidAmount: args.amount,
      bidderSecret: args.secret,
    })
    const result = await contract.callTx.placeBid()
    return {
      txId: String(result.public.txId),
      blockHeight: result.public.blockHeight ?? null,
      commitmentHex: bidCommitmentHex(args.amount, args.secret),
    }
  } catch (e) {
    throw asCircuitError(e)
  }
}

/**
 * Run the reveal-day verdict. A win submits a transaction claiming the drop; a
 * loss fails the in-circuit assert locally, so nothing is sent and nothing is
 * disclosed — not even that a verdict was run (spec §3).
 */
export const checkVerdict = async (args: BidArgs): Promise<Verdict> => {
  const address = requireAddress(args.address)
  try {
    const contract = await connect(args.api, address, {
      ...emptyLowballPrivateState(),
      bidAmount: args.amount,
      bidderSecret: args.secret,
    })
    const result = await contract.callTx.checkWin()
    return {
      kind: 'win',
      receipt: {
        txId: String(result.public.txId),
        blockHeight: result.public.blockHeight ?? null,
      },
    }
  } catch (e) {
    const error = asCircuitError(e)
    if (error.code === 'bid-below-reserve') return { kind: 'no-win' }
    throw error
  }
}
