// The mark inside the wax seal, per envelope state.
//
// Was an emoji (✉️ 🔒 🔓 🏆 🤫), which rendered as a different picture on every
// platform and read as a placeholder inside an otherwise drawn interface. These
// are monoline SVGs in `currentColor`, so the existing seal CSS still colours
// and animates them.

import type { EnvelopeState } from './Envelope'

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PATHS: Record<EnvelopeState, React.ReactNode> = {
  // Envelope, flap down.
  empty: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" {...STROKE} />
      <path d="M3.5 7.5 L12 13.5 L20.5 7.5" {...STROKE} />
    </>
  ),
  // Padlock, shackle closed.
  proving: (
    <>
      <rect x="5" y="10.5" width="14" height="9" rx="2" {...STROKE} />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...STROKE} />
    </>
  ),
  sealed: (
    <>
      <rect x="5" y="10.5" width="14" height="9" rx="2" {...STROKE} />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...STROKE} />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" />
    </>
  ),
  // Padlock, shackle swung open.
  opening: (
    <>
      <rect x="5" y="10.5" width="14" height="9" rx="2" {...STROKE} />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 6.8-1.2" {...STROKE} />
    </>
  ),
  // A check, not a trophy: the claim is verified, not awarded.
  won: <path d="M5 12.5 L10 17.5 L19 7" {...STROKE} strokeWidth={2} />,
  // Kept shut: a single closed line.
  lost: <path d="M6 12h12" {...STROKE} strokeWidth={2} />,
}

export const SealGlyph = ({ state }: { state: EnvelopeState }) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden focusable="false">
    {PATHS[state]}
  </svg>
)
