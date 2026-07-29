// Orchestrates one drop's bid lifecycle: parse → seal → (reveal) → verdict,
// keeping the local bid record in step with what the chain has seen.

import { useCallback, useState } from 'react'

import { parseDust } from '../../lib/format'
import { usePlaceBid, useVerdict } from '../../lib/midnight'
import type { LowballError } from '../../lib/midnight'
import {
  forgetBid,
  hexToBytes,
  loadBid,
  randomSecretHex,
  recordVerdict,
  saveBid,
} from '../../lib/persistence/bids'
import type { StoredBid } from '../../lib/persistence/bids'

export type BidFlow = {
  readonly bid: StoredBid | null
  readonly amountText: string
  readonly setAmountText: (value: string) => void
  readonly inputError: string | null
  readonly sealing: boolean
  readonly opening: boolean
  readonly error: LowballError | null
  readonly seal: () => void
  readonly openEnvelope: () => void
  readonly discard: () => void
}

export const useBidFlow = (dropId: string, address: string | null): BidFlow => {
  const [bid, setBid] = useState<StoredBid | null>(() => loadBid(dropId))
  const [amountText, setAmountText] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const place = usePlaceBid(address)
  const verdict = useVerdict(address)

  const seal = useCallback(() => {
    const parsed = parseDust(amountText)
    if (!parsed.ok) {
      setInputError(parsed.error)
      return
    }
    setInputError(null)

    const secretHex = randomSecretHex()
    void place.seal(parsed.value, hexToBytes(secretHex)).then((receipt) => {
      if (!receipt) return
      const stored: StoredBid = {
        dropId,
        amount: parsed.value.toString(),
        secretHex,
        commitmentHex: receipt.commitmentHex,
        txId: receipt.txId,
        sealedAt: Date.now(),
        verdict: 'sealed',
      }
      saveBid(stored)
      setBid(stored)
    })
  }, [amountText, dropId, place])

  const openEnvelope = useCallback(() => {
    if (!bid) return
    void verdict
      .open(BigInt(bid.amount), hexToBytes(bid.secretHex))
      .then((result) => {
        if (!result) return
        const settled = result.kind === 'win' ? 'win' : 'no-win'
        recordVerdict(dropId, settled)
        setBid((current) => (current ? { ...current, verdict: settled } : current))
      })
  }, [bid, dropId, verdict])

  /** Only for a device that wants its local trace gone; the chain keeps the commitment. */
  const discard = useCallback(() => {
    forgetBid(dropId)
    setBid(null)
    place.reset()
    verdict.reset()
  }, [dropId, place, verdict])

  return {
    bid,
    amountText,
    setAmountText,
    inputError,
    sealing: place.phase === 'proving',
    opening: verdict.phase === 'opening',
    error: place.error ?? verdict.error,
    seal,
    openEnvelope,
    discard,
  }
}
