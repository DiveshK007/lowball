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
  /** Every bid commitment on this drop. Public on chain; reveals no amounts. */
  readonly bidCommitmentsHex: readonly string[]
  /** Distinct commitments. `bidCount` counts submissions, which can repeat. */
  readonly distinctBids: number
  /** How many bidders have opened a winning envelope. */
  readonly winnerCount: number
  /** Only after the house reveals and the hash check passes. */
  readonly revealedReserve: bigint | null
  /** Derived from `winnerCount`; kept because the UI asks the question this way. */
  readonly winnerFound: boolean
}

/** A drop's state plus the id it lives under — what the gallery lists. */
export type DropListing = DropState & { readonly dropId: string }

export type WalletSummary = {
  /** The `window.midnight` key this wallet injected under. */
  readonly key: string
  readonly name: string
  readonly icon: string
  readonly apiVersion: string
  readonly networkId: string
  readonly shieldedAddress: string
  /** True when the wallet proves in-browser, so no proof server is needed. */
  readonly provesInBrowser: boolean
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
