import type { DropState } from '../../lib/midnight'

export const PhasePill = ({
  state,
  loading,
}: {
  state: DropState | null
  loading: boolean
}) => {
  if (loading) return <span className="pill skeleton">loading</span>
  if (!state || state.phase === 'unset') {
    return (
      <span className="pill pill--off">
        <span className="dot" />
        Not opened
      </span>
    )
  }
  if (state.phase === 'revealed') {
    return (
      <span className="pill pill--revealed">
        <span className="dot" />
        Revealed
      </span>
    )
  }
  return (
    <span className="pill pill--live">
      <span className="dot" />
      Bids open
    </span>
  )
}
