import type { BidFlow } from './useBidFlow'

type Props = {
  flow: BidFlow
  srp: string
  /** Why bidding is off right now, or null when it is live. */
  blockedReason: string | null
  walletConnected: boolean
  onConnect: () => void
}

export const BidForm = ({
  flow,
  srp,
  blockedReason,
  walletConnected,
  onConnect,
}: Props) => (
  <form
    className="stack"
    onSubmit={(event) => {
      event.preventDefault()
      if (walletConnected) flow.seal()
      else onConnect()
    }}
  >
    <div className="field">
      <label className="field__label" htmlFor="bid-amount">
        Your bid — the house says it's worth {srp}
      </label>
      <div className="field__control">
        <input
          id="bid-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={flow.amountText}
          onChange={(event) => flow.setAmountText(event.target.value)}
          disabled={blockedReason !== null || flow.sealing}
        />
        <span className="field__suffix">tDUST</span>
      </div>
      {flow.inputError ? (
        <div className="field__error">{flow.inputError}</div>
      ) : (
        <div className="faint" style={{ fontSize: '0.84rem' }}>
          Sealed as a commitment. Nobody — not other bidders, not the house —
          ever learns this number.
        </div>
      )}
    </div>

    <button
      type="submit"
      className="btn btn--wide"
      disabled={blockedReason !== null || flow.sealing}
    >
      {flow.sealing
        ? 'Sealing…'
        : blockedReason
          ? blockedReason
          : walletConnected
            ? 'Seal this bid'
            : 'Connect Lace to seal'}
    </button>

    {flow.sealing ? (
      <p className="faint" style={{ margin: 0, fontSize: '0.84rem' }}>
        Building the ZK proof locally, then Lace signs and submits. The proof
        step is the slow one — leave this tab open.
      </p>
    ) : null}
  </form>
)
