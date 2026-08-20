// The gallery is a bento of unequal tiles, not a row of matching cards: the
// live drop dominates, and the tiles around it carry the facts a first-time
// visitor needs before they'd trust a sealed bid — how it works, what the
// ledger can and cannot see, and where to verify it independently.

import { Link } from 'react-router-dom'

import { SEEDED_DROPS } from '../config/drops'
import { config, isContractConfigured, networkLabel } from '../config'
import { useDropState } from '../lib/midnight'
import type { DropMeta } from '../config/drops'
import { Banner } from '../ui/Banner'
import { useReveal } from '../ui/useReveal'
import { DropCard } from '../features/drops/DropCard'
import { WalletNotice } from '../features/wallet/WalletNotice'

const LiveDropCard = ({ drop }: { drop: DropMeta }) => {
  const { state, loading } = useDropState(drop.contractAddress)
  return <DropCard drop={drop} state={state} loading={loading} />
}

/** Bid count is public; amounts never are. That contrast is the product. */
const LedgerTile = ({ drop }: { drop: DropMeta }) => {
  const { state } = useDropState(drop.contractAddress)
  return (
    <div className="tile tile--signal">
      <span className="eyebrow">What the ledger shows</span>
      <div className="tile__figure">{state?.bidCount ?? 0} bids</div>
      <p className="tile__note">
        …and zero bid amounts. Not one, ever — including the winner's. Amounts
        are Compact witnesses, consumed inside the proof.
      </p>
    </div>
  )
}

export const GalleryPage = () => {
  const root = useReveal<HTMLDivElement>()
  const featured = SEEDED_DROPS[0]

  return (
    <div className="stack" ref={root}>
      <section className="hero">
        <span className="eyebrow reveal">Provably-fair mystery drops</span>
        <h1 className="reveal">Name your price. The house already named theirs.</h1>
        <div className="hero__rule reveal" aria-hidden="true" />
        <p className="reveal">
          Every drop's reserve is committed onchain before the first bid exists.
          Bid what you think it's worth — your number is sealed forever, even from
          the house. Clear the reserve and you win at your price.
        </p>
      </section>

      <WalletNotice />

      {isContractConfigured() ? null : (
        <Banner
          tone="info"
          title="Contract address not configured for this build."
          hint="Drops render from local metadata; live stock, bid counts and bidding switch on once VITE_CONTRACT_ADDRESS points at a deploy."
        />
      )}

      <div className="bento">
        {featured ? (
          <div className="bento__tile bento__tile--feature reveal">
            <LiveDropCard drop={featured} />
          </div>
        ) : null}

        <div className="bento__tile reveal">
          <div className="tile">
            <span className="eyebrow">How it works</span>
            <ol className="tile__steps">
              <li>House seals the reserve onchain.</li>
              <li>You bid — sealed, never published.</li>
              <li>Reserve is revealed; your verdict lands.</li>
            </ol>
          </div>
        </div>

        <div className="bento__tile reveal">
          {featured ? <LedgerTile drop={featured} /> : null}
        </div>

        {SEEDED_DROPS.slice(1).map((drop) => (
          <div className="bento__tile reveal" key={drop.id}>
            <LiveDropCard drop={drop} />
          </div>
        ))}

        <div className="bento__tile bento__tile--wide reveal">
          <div className="tile tile--sunk">
            <span className="eyebrow">Don't trust us</span>
            <p className="tile__note" style={{ color: 'var(--slate-2)' }}>
              Every drop has a public receipts page: the commitment, the bid
              count, the revealed reserve, and a box that recomputes the hash in
              your own browser. No wallet needed.
            </p>
            {featured ? (
              <Link className="mono" to={`/receipts/${featured.id}`}>
                open receipts →
              </Link>
            ) : null}
          </div>
        </div>

        <div className="bento__tile reveal">
          <div className="tile tile--sunk">
            <span className="eyebrow">Network</span>
            <div className="tile__figure" style={{ fontSize: '1.35rem' }}>
              {networkLabel[config.networkId]}
            </div>
            <p className="tile__note">
              Reads are live from the {networkLabel[config.networkId]} indexer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
