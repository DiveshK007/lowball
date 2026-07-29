// Orchestrates one drop's bid lifecycle: parse → seal → (reveal) → verdict,
// keeping the local bid record in step with what the chain has seen.
//
// The record is journalled *before* submission (architecture §5.2). If the tab
// dies during proving, the amount and secret survive, and the next load
// reconciles against the drop's latest bid commitment instead of guessing.

import { useCallback, useEffect, useState } from 'react'

import { parseDust } from '../../lib/format'
import { bidCommitmentHex, usePlaceBid, useVerdict } from '../../lib/midnight'
import type { DropState, LowballError } from '../../lib/midnight'
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
  readonly retry: () => void
  readonly openEnvelope: () => void
  readonly discard: () => void
}

export const useBidFlow = (
  dropId: string,
  address: string | null,
  state: DropState | null,
): BidFlow => {
  const [bid, setBid] = useState<StoredBid | null>(() => loadBid(dropId))
  const [amountText, setAmountText] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  const place = usePlaceBid(address)
  const verdict = useVerdict(address)

  // A journalled bid whose commitment is already the drop's latest one did
  // reach the chain — the confirmation just never got back to us.
  useEffect(() => {
    if (!bid || bid.verdict !== 'pending' || !state) return
    if (state.latestBidCommitmentHex !== bid.commitmentHex) return
    const settled: StoredBid = { ...bid, verdict: 'sealed' }
    saveBid(settled)
    setBid(settled)
  }, [bid, state])

  const submit = useCallback(
    (amount: bigint, secretHex: string) => {
      const journalled: StoredBid = {
        dropId,
        amount: amount.toString(),
        secretHex,
        commitmentHex: bidCommitmentHex(amount, hexToBytes(secretHex)),
        txId: '',
        sealedAt: Date.now(),
        verdict: 'pending',
      }
      saveBid(journalled)
      setBid(journalled)

      void place.seal(amount, hexToBytes(secretHex)).then((receipt) => {
        if (!receipt) return
        const sealed: StoredBid = {
          ...journalled,
          txId: receipt.txId,
          verdict: 'sealed',
        }
        saveBid(sealed)
        setBid(sealed)
      })
    },
    [dropId, place],
  )

  const seal = useCallback(() => {
    const parsed = parseDust(amountText)
    if (!parsed.ok) {
      setInputError(parsed.error)
      return
    }
    setInputError(null)
    submit(parsed.value, randomSecretHex())
  }, [amountText, submit])

  /** Re-submit a journalled bid — same amount, same secret, same commitment. */
  const retry = useCallback(() => {
    if (!bid) return
    submit(BigInt(bid.amount), bid.secretHex)
  }, [bid, submit])

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
    retry,
    openEnvelope,
    discard,
  }
}
