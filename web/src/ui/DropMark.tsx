// Card art for a drop.
//
// Replaces an ✉️ emoji, which rendered as a different glyph on every platform
// and read as a placeholder next to the rest of the design. This is the same
// idea as the drop page's envelope — a sealed object catching light — reduced
// to a mark that survives at 64px: a plate, a flap, and a wax seal, drawn in
// the drop's accent over the petrol ground.
//
// Geometry is deterministic per drop id, so each card differs slightly but the
// same drop always looks the same.

type Props = {
  /** Drop slug — seeds the deterministic variation. */
  id: string
  accent: string
  size?: number
}

const seedOf = (id: string): number => {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return Math.abs(hash)
}

export const DropMark = ({ id, accent, size = 72 }: Props) => {
  const seed = seedOf(id)
  // Small, bounded variation: the flap angle and the seal's position on it.
  const flap = 26 + (seed % 9) // 26–34
  const gradientId = `dm-grad-${id.replace(/[^a-z0-9]/gi, '')}`
  const glowId = `dm-glow-${id.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      role="img"
      aria-label="Sealed envelope"
      className="drop-mark"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a3138" />
          <stop offset="100%" stopColor="#04191e" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="38%" r="55%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The dark gallery the object sits in. */}
      <rect x="2" y="6" width="68" height="60" rx="10" fill={`url(#${gradientId})`} />
      <rect x="2" y="6" width="68" height="60" rx="10" fill={`url(#${glowId})`} />

      {/* Frost hairline: depth on a dark field comes from light edges, not
          shadows — you cannot cast a shadow into the void. */}
      <rect
        x="2.5"
        y="6.5"
        width="67"
        height="59"
        rx="9.5"
        fill="none"
        stroke="rgb(214 240 245 / 0.22)"
        strokeWidth="1"
      />

      {/* Envelope flap. */}
      <path
        d={`M8 ${20} L36 ${20 + flap} L64 ${20} `}
        fill="none"
        stroke="rgb(214 240 245 / 0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M8 ${20} L36 ${20 + flap} L64 ${20}`}
        fill="rgb(214 240 245 / 0.05)"
      />

      {/* Wax seal, the one saturated element. */}
      <circle cx="36" cy={20 + flap + 6} r="8" fill={accent} />
      <circle
        cx="36"
        cy={20 + flap + 6}
        r="8"
        fill="none"
        stroke="rgb(255 255 255 / 0.45)"
        strokeWidth="0.75"
      />
      <circle cx="33.4" cy={20 + flap + 3.6} r="2.2" fill="rgb(255 255 255 / 0.3)" />
    </svg>
  )
}
