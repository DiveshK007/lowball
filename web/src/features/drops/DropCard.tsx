import { Link } from 'react-router-dom'

import type { DropMeta } from '../../config/drops'
import type { DropState } from '../../lib/midnight'
import { Stat } from '../../ui/Stat'
import { Countdown } from './Countdown'
import { PhasePill } from './PhasePill'

type Props = {
  drop: DropMeta
  state: DropState | null
  loading: boolean
}

export const DropCard = ({ drop, state, loading }: Props) => (
  <Link className="card drop-card" to={`/drop/${drop.id}`}>
    <div className="drop-card__art" style={{ color: drop.accent }} aria-hidden>
      {drop.glyph}
    </div>

    <div className="row">
      <span className="eyebrow">Drop #{String(drop.number).padStart(3, '0')}</span>
      <div className="masthead__spacer" />
      <PhasePill state={state} loading={loading} />
    </div>

    <div>
      <h3>{drop.name}</h3>
      <p className="muted" style={{ margin: '0.3rem 0 0' }}>
        {drop.tagline}
      </p>
    </div>

    <div className="stat-row">
      <Stat
        label="Stock"
        value={
          loading ? <span className="skeleton">00</span> : (state?.stock ?? '—')
        }
      />
      <Stat
        label="Sealed bids"
        value={
          loading ? <span className="skeleton">00</span> : (state?.bidCount ?? '—')
        }
      />
      <Stat
        label={state?.phase === 'revealed' ? 'Revealed' : 'Reveal in'}
        value={
          state?.phase === 'revealed' ? '✓' : <Countdown to={state?.closeTime ?? null} />
        }
      />
    </div>
  </Link>
)
