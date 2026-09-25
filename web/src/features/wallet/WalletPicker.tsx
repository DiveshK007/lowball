// Wallet chooser — a single button that opens a menu.
//
// It used to render one inline button per wallet, each carrying an icon, a name
// and a description. With both 1AM and Lace installed that is far too wide for a
// masthead and it overflowed, colliding with the Lace logo. The menu keeps the
// header a fixed width no matter how many wallets are injected, and moves the
// descriptions somewhere they have room to be read.
//
// Each menu item calls `connect(key)` directly from its own click handler: the
// wallet's authorization pop-up depends on that click's user activation, so the
// picker must never sit behind a promise.

import { useEffect, useRef, useState } from 'react'

import type { DetectedWallet } from '../../lib/midnight'

type Props = {
  wallets: readonly DetectedWallet[]
  onChoose: (walletKey: string) => void
  busy: boolean
}

export const WalletPicker = ({ wallets, onChoose, busy }: Props) => {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement | null>(null)

  // Close on outside click and on Escape — a menu that traps the page is worse
  // than no menu.
  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (key: string) => {
    setOpen(false)
    onChoose(key)
  }

  return (
    <div className="wallet-menu" ref={root}>
      <button
        type="button"
        className="btn"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {busy ? 'Check your wallet…' : 'Connect wallet'}
        <span className="wallet-menu__caret" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open ? (
        <div className="wallet-menu__sheet" role="menu">
          {wallets.map((w) => (
            <button
              key={w.key}
              type="button"
              role="menuitem"
              className="wallet-menu__option"
              onClick={() => choose(w.key)}
            >
              {/* Wallet-supplied; render via <img>, never innerHTML. */}
              {w.icon ? (
                <img src={w.icon} alt="" width={22} height={22} loading="lazy" />
              ) : (
                <span className="wallet-menu__dot" aria-hidden="true" />
              )}
              <span className="wallet-menu__text">
                <span className="wallet-menu__name">{w.name}</span>
                {w.blurb ? (
                  <span className="wallet-menu__blurb">{w.blurb}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
