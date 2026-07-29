import type { ReactNode } from 'react'

export type BannerTone = 'info' | 'warn' | 'error'

type Props = {
  tone?: BannerTone
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
}

export const Banner = ({ tone = 'info', title, hint, action }: Props) => (
  <div className={`banner banner--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <div className="banner__body">
      <div className="banner__title">{title}</div>
      {hint ? <div className="banner__hint">{hint}</div> : null}
    </div>
    {action}
  </div>
)
