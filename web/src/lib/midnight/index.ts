// The SDK boundary's public surface. Nothing outside this directory imports
// @midnight-ntwrk/* — swap or upgrade the SDK here and features stay put
// (docs/architecture.md §5.1).

export { LowballError, isLowballError } from './errors'
export type { LowballErrorCode } from './errors'

export { bidCommitmentHex } from './client'

export {
  WalletProvider,
  useWallet,
  useDropState,
  usePlaceBid,
  useVerdict,
} from './react'
export type {
  BidPhase,
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
  SealedBid,
  TxReceipt,
  Verdict,
  WalletSummary,
} from './types'
