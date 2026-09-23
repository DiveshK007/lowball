import { describe, expect, it } from 'vitest'
import { describeStock, dropLabel, dropMetaFor, dropNumberFromId } from './drops'

describe('drop numbering', () => {
  it('reads the number from the slug', () => {
    expect(dropNumberFromId('drop-001')).toEqual(1)
    expect(dropNumberFromId('drop-002')).toEqual(2)
    expect(dropNumberFromId('drop-050')).toEqual(50)
  })

  it('does not render an uncatalogued drop as #000', () => {
    // The bug: every non-seeded drop fell back to number 0.
    expect(dropMetaFor('drop-002').number).toEqual(2)
    expect(dropMetaFor('drop-002', 'Second Envelope').number).not.toEqual(0)
  })

  it('falls back to 0 only when the slug carries no number', () => {
    expect(dropNumberFromId('drop-soldout')).toEqual(0)
  })
})

describe('stock copy', () => {
  it('describes a single unit as 1-of-1', () => {
    expect(describeStock(1)).toMatch(/1-of-1/)
  })

  it('never claims 1-of-1 for a stocked drop', () => {
    // The stale-copy bug: the page said "1-of-1 collectible" at stock 50.
    expect(describeStock(50)).not.toMatch(/1-of-1/)
    expect(describeStock(50)).toMatch(/50/)
  })

  it('counts down as units are claimed', () => {
    expect(describeStock(50, 3)).toMatch(/47 of 50/)
    expect(describeStock(2, 2)).toMatch(/All 2 units claimed/)
  })
})

describe('drop labels', () => {
  it('labels numbered drops as Drop #NNN', () => {
    expect(dropLabel({ number: 1, name: 'Genesis Envelope' })).toEqual('Drop #001')
    expect(dropLabel({ number: 12, name: 'x' })).toEqual('Drop #012')
  })

  it('never renders an unnumbered drop as Drop #000', () => {
    // The receipts back-link read "← Drop #000" for drop-soldout.
    expect(dropLabel({ number: 0, name: 'Sold-Out Proof' })).toEqual('Sold-Out Proof')
    expect(dropLabel({ number: 0, name: 'Sold-Out Proof' })).not.toMatch(/#000/)
  })
})
