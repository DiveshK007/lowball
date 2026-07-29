// The app-facing shapes of chain data. Components consume these; they never
// see SDK types (docs/architecture.md §5.1).

/** Circuits in lowball.compact, as the ZK config provider keys them. */
export type LowballCircuitId =
  | 'createDrop'
  | 'placeBid'
  | 'revealReserve'
  | 'checkWin'

/** Ledger `status`, widened into app vocabulary. */
export type DropPhase = 'unset' | 'open' | 'revealed'

/** Decoded public ledger state for one drop. Nothing private is derivable. */
export type DropState = {
  readonly phase: DropPhase
  /** hash(reserve, salt) — published before bids opened. */
  readonly commitmentHex: string
  readonly stock: number
  readonly closeTime: Date | null
  readonly metaRef: string
  readonly bidCount: number
  readonly latestBidCommitmentHex: string
  /** Only after the house reveals and the hash check passes. */
  readonly revealedReserve: bigint | null
  readonly winnerFound: boolean
}

export type WalletSummary = {
  readonly name: string
  readonly icon: string
  readonly apiVersion: string
  readonly networkId: string
  readonly shieldedAddress: string
}

/** A sealed bid, as it exists on this device. The amount never leaves it. */
export type SealedBid = {
  readonly dropId: string
  readonly amount: bigint
  /** hex-encoded 32-byte secret binding this wallet to the bid */
  readonly secretHex: string
  readonly commitmentHex: string
  readonly txId: string
  readonly sealedAt: number
}

export type TxReceipt = {
  readonly txId: string
  readonly blockHeight: number | null
}

export type Verdict =
  | { readonly kind: 'win'; readonly receipt: TxReceipt }
  | { readonly kind: 'no-win' }
