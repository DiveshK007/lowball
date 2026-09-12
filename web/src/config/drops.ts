// The drop catalogue. Item metadata is presentation-only: stock, close time,
// bid count and the reserve commitment all come from the chain (see
// lib/midnight).
//
// One contract now holds many drops (spec §10, 2026-09-12), and the chain is
// the source of truth for *which* drops exist. This file only supplies the
// art direction. A drop opened on chain without an entry here still renders —
// `dropMetaFor` synthesises a presentable fallback from its ledger metaRef —
// so the house can open a drop without shipping a web build.

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

const ACCENTS = ['#7c5cff', '#00636b', '#b7263a', '#c9a227'] as const

/** Stable per-id accent, so an uncatalogued drop still looks deliberate. */
const accentFor = (id: string): string => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return ACCENTS[Math.abs(hash) % ACCENTS.length]
}

export const findDrop = (id: string): DropMeta | undefined =>
  SEEDED_DROPS.find((drop) => drop.id === id)

/**
 * Presentation metadata for a drop, catalogued or not. `metaRef` is the label
 * the house wrote to the ledger at createDrop, and is the best name we have for
 * a drop this build has never heard of.
 */
export const dropMetaFor = (id: string, metaRef?: string): DropMeta => {
  const seeded = findDrop(id)
  if (seeded) return seeded
  const name = metaRef && metaRef.trim() ? metaRef : id
  return {
    id,
    contractAddress: config.contractAddress,
    number: 0,
    name,
    tagline: 'Sealed drop on Midnight',
    blurb:
      'The reserve for this drop was committed onchain before bidding opened. The house cannot move it now, and cannot see what you bid.',
    glyph: '✉️',
    accent: accentFor(id),
    srp: '—',
  }
}
