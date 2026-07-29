import { useEffect, useState } from 'react'

import { formatCountdown } from '../../lib/format'

/**
 * The reveal countdown. Per spec §3 this is the appointment moment — the whole
 * product asks people to come back for it, so it ticks live.
 */
export const Countdown = ({ to }: { to: Date | null }) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!to) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [to])

  if (!to) return <span className="faint">—</span>

  const remaining = to.getTime() - now
  return (
    <span>
      {remaining > 0 ? formatCountdown(remaining) : 'closed'}
    </span>
  )
}
