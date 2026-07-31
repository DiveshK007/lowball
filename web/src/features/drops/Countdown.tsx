import { useEffect, useState } from 'react'

import { formatCountdown } from '../../lib/format'

/**
 * The reveal countdown. Per spec §3 this is the appointment moment — the whole
 * product asks people to come back for it, so it ticks live.
 *
 * `inline` is the quiet form (a mono span inside a stat); `clock` is the loud
 * form — a saturated field that is the one loud element on the drop page.
 */
type Props = {
  to: Date | null
  variant?: 'inline' | 'clock'
  label?: string
}

export const Countdown = ({ to, variant = 'inline', label = 'Reveal in' }: Props) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!to) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [to])

  const remaining = to ? to.getTime() - now : 0
  const text = !to ? '—' : remaining > 0 ? formatCountdown(remaining) : 'closed'

  if (variant === 'clock') {
    const closed = !to || remaining <= 0
    return (
      <div className={`reveal-clock${closed ? ' reveal-clock--revealed' : ''}`}>
        <span className="reveal-clock__label">{closed ? 'Reveal' : label}</span>
        <span className="reveal-clock__value">{closed ? 'now' : text}</span>
      </div>
    )
  }

  return <span className="clock">{text}</span>
}
