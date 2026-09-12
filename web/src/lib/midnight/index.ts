// The SDK boundary's public surface. Nothing outside this directory imports
// @midnight-ntwrk/* — swap or upgrade the SDK here and features stay put
// (docs/architecture.md §5.1).

export { LowballError, isLowballError } from './errors'
export type { LowballErrorCode } from './errors'

export { bidCommitmentHex, reserveCommitmentHex } from './hashes'

export {
  WalletProvider,
  useWallet,
  useDropList,
  useDropState,
  usePlaceBid,
  useVerdict,
} from './react'
export type {
  BidPhase,
  DropListResult,
  DropStateResult,
  PlaceBidResult,
  VerdictPhase,
  VerdictResult,
  WalletContextValue,
  WalletStatus,
} from './react'

export type {
  DropPhase,
  DropState,
  DropListing,
  SealedBid,
  TxReceipt,
  Verdict,
  WalletSummary,
} from './types'
