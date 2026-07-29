// The ritual object. Everything the player feels about privacy hangs on this
// thing staying shut until reveal day.

export type EnvelopeState = 'empty' | 'proving' | 'sealed' | 'opening' | 'won' | 'lost'

const CAPTIONS: Record<EnvelopeState, string> = {
  empty: 'Nothing sealed yet',
  proving: 'Sealing — proof, signature, block',
  sealed: 'Sealed. Your amount never left this device.',
  opening: 'Opening against the revealed reserve…',
  won: 'Cleared the reserve',
  lost: 'Under the reserve — and it stays that way',
}

const GLYPHS: Record<EnvelopeState, string> = {
  empty: '✉️',
  proving: '🔒',
  sealed: '🔒',
  opening: '🔓',
  won: '🏆',
  lost: '🤫',
}

export const Envelope = ({ state }: { state: EnvelopeState }) => {
  const opened = state === 'opening' || state === 'won' || state === 'lost'
  const classes = [
    'envelope',
    opened ? 'envelope--open' : '',
    state === 'proving' || state === 'opening' ? 'envelope--proving' : '',
    state === 'won' ? 'envelope--won' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} role="img" aria-label={CAPTIONS[state]}>
      <div className="envelope__seal" aria-hidden>
        {GLYPHS[state]}
      </div>
      <div className="envelope__caption">{CAPTIONS[state]}</div>
    </div>
  )
}
