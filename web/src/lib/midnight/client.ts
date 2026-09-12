// The contract surface, in app terms. Everything above this file talks in
// DropState / SealedBid / Verdict; everything below it is Midnight.js.

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import { findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js'
import { toHex } from '@midnight-ntwrk/midnight-js-utils'

import { config } from '../../config'
import { dropIdBytes, dropIdSlug } from './drop-id'
import { LowballError, asCircuitError } from './errors'
import * as Lowball from './generated/lowball/index.js'
import { PRIVATE_STATE_ID, buildProviders } from './providers'
import type {
  DropPhase,
  DropListing,
  DropState,
  TxReceipt,
  Verdict,
} from './types'
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

/**
 * Decode one drop out of the ledger. Every map read is guarded: on Midnight a
 * `lookup` of a missing key is a runtime error rather than an empty value, and
 * the later-stage maps (revealed reserve, latest bid, winner) are genuinely
 * absent until the drop reaches that stage.
 */
const decodeDrop = (ledger: Lowball.Ledger, key: Uint8Array): DropState => {
  if (!ledger.dropStatus.member(key)) {
    throw new LowballError('drop-not-found', 'No such drop on this contract.', {
      hint: 'The link may be for a drop on an older deployment.',
    })
  }
  const status = ledger.dropStatus.lookup(key)
  // Sets are iterable from TypeScript; a drop carries tens of commitments, so
  // reading them all is cheaper than a second round trip to test membership.
  const bids = ledger.dropBids.member(key)
    ? Array.from(ledger.dropBids.lookup(key), (c) => toHex(c))
    : []
  const winners = ledger.dropWinners.member(key)
    ? Number(ledger.dropWinners.lookup(key).size())
    : 0
  return {
    phase: PHASES[status] ?? 'unset',
    commitmentHex: toHex(ledger.dropCommitment.lookup(key)),
    stock: Number(ledger.dropStock.lookup(key)),
    closeTime: toDate(ledger.dropCloseTime.lookup(key)),
    metaRef: ledger.dropMetaRef.lookup(key),
    // A Counter nested in a Map comes back as its ADT, not a bigint.
    bidCount: ledger.dropBidCount.member(key)
      ? Number(ledger.dropBidCount.lookup(key).read())
      : 0,
    bidCommitmentsHex: bids,
    distinctBids: bids.length,
    revealedReserve:
      status === Lowball.DropStatus.REVEALED && ledger.dropRevealed.member(key)
        ? ledger.dropRevealed.lookup(key)
        : null,
    winnerCount: winners,
    winnerFound: winners > 0,
  }
}

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

const readLedger = async (address: string | null): Promise<Lowball.Ledger> => {
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
  return Lowball.ledger(state.data)
}

/**
 * Read one drop's public ledger state. No wallet required — this is the path
 * the drop page and the receipts page use.
 */
export const readDropState = async (
  address: string | null,
  dropId: string,
): Promise<DropState> =>
  decodeDrop(await readLedger(address), dropIdBytes(dropId))

/**
 * Every drop on the contract. One contract read, not one per drop: the ledger
 * maps are iterable, so the gallery costs the same whether the deployment holds
 * one drop or fifty.
 */
export const readDropList = async (
  address: string | null,
): Promise<readonly DropListing[]> => {
  const ledger = await readLedger(address)
  const listings: DropListing[] = []
  for (const [key] of ledger.dropStatus) {
    listings.push({ dropId: dropIdSlug(key), ...decodeDrop(ledger, key) })
  }
  // Map iteration order is deterministic but unspecified, so impose one the UI
  // can rely on: open drops first, then by slug.
  return listings.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === 'open' ? -1 : 1
    return a.dropId.localeCompare(b.dropId)
  })
}

import { bidCommitmentHex } from './hashes'

export { bidCommitmentHex, reserveCommitmentHex } from './hashes'

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
  /** Drop slug; encoded to its 32-byte ledger key before the call. */
  readonly dropId: string
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
    const result = await contract.callTx.placeBid(dropIdBytes(args.dropId))
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
    const result = await contract.callTx.checkWin(dropIdBytes(args.dropId))
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
