import type { ReactNode } from 'react'

export const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="stat">
    <div className="stat__label">{label}</div>
    <div className="stat__value">{value}</div>
  </div>
)
