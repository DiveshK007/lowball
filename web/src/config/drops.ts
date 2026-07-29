// The drop catalogue. Item metadata is presentation-only: stock, close time,
// bid count and the reserve commitment all come from the chain (see
// lib/midnight). L1 ships one drop per deployed contract (spec §10), so the
// seeded drop points at the single configured contract address.

import { config } from './index'

export type DropMeta = {
  readonly id: string
  /** Contract holding this drop's ledger state; null until deployed. */
  readonly contractAddress: string | null
  readonly number: number
  readonly name: string
  readonly tagline: string
  readonly blurb: string
  /** Item art. A glyph keeps the mystery — nobody sees the item until claim. */
  readonly glyph: string
  readonly accent: string
  /** What the house says the item is worth, for lowball framing only. */
  readonly srp: string
}

export const SEEDED_DROPS: readonly DropMeta[] = [
  {
    id: 'drop-001',
    contractAddress: config.contractAddress,
    number: 1,
    name: 'Genesis Envelope',
    tagline: 'First sealed drop on Midnight',
    blurb:
      'A 1-of-1 collectible record minted to the first wallet that clears the hidden reserve. The reserve was committed onchain before this page existed — the house cannot move it now, and cannot see what you bid.',
    glyph: '✉️',
    accent: '#7c5cff',
    srp: '40 tDUST',
  },
]

export const findDrop = (id: string): DropMeta | undefined =>
  SEEDED_DROPS.find((drop) => drop.id === id)
