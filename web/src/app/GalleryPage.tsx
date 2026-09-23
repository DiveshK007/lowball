// The gallery is a bento of unequal tiles, not a row of matching cards: the
// live drop dominates, and the tiles around it carry the facts a first-time
// visitor needs before they'd trust a sealed bid — how it works, what the
// ledger can and cannot see, and where to verify it independently.

import { Link } from 'react-router-dom'

import { dropMetaFor, isProductDrop } from '../config/drops'
import { config, isContractConfigured, networkLabel } from '../config'
import { useDropList } from '../lib/midnight'
import type { DropListing } from '../lib/midnight'
import { Banner } from '../ui/Banner'
import { useReveal } from '../ui/useReveal'
import { DropCard } from '../features/drops/DropCard'
import { WalletNotice } from '../features/wallet/WalletNotice'

const LiveDropCard = ({
  listing,
  loading,
}: {
  listing: DropListing
  loading: boolean
}) => (
  <DropCard
    drop={dropMetaFor(listing.dropId, listing.metaRef)}
    state={listing}
    loading={loading}
  />
)

/** Bid count is public; amounts never are. That contrast is the product. */
const LedgerTile = ({ state }: { state: DropListing | null }) => {
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
  // The contract is the catalogue: every drop it holds shows up here, so the
  // house can open one without shipping a web build.
  const { drops, loading } = useDropList(config.contractAddress)
  // Proof drops are evidence, not product. They belong under their own heading,
  // not mixed into the gallery where they read as broken or sold-out stock.
  const productDrops = drops.filter((d) => isProductDrop(d.dropId))
  const proofDrops = drops.filter((d) => !isProductDrop(d.dropId))
  const featured = productDrops[0] ?? null
  const rest = productDrops.slice(1)

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
        {featured ? (
          <Link className="hero__cta reveal" to={`/drop/${featured.dropId}`}>
            Open the drop
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
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
            <LiveDropCard listing={featured} loading={loading} />
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
          <LedgerTile state={featured} />
        </div>

        {rest.map((listing) => (
          <div className="bento__tile reveal" key={listing.dropId}>
            <LiveDropCard listing={listing} loading={loading} />
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
              <Link className="mono" to={`/receipts/${featured.dropId}`}>
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

      {proofDrops.length > 0 ? (
        <section className="stack proofs reveal">
          <div className="stack" style={{ gap: '0.3rem' }}>
            <span className="eyebrow">Proofs</span>
            <h2 style={{ margin: 0 }}>Drops kept as evidence</h2>
            <p className="muted" style={{ margin: 0, maxWidth: '46rem' }}>
              These are not for sale. They are closed drops that demonstrate the
              contract's guarantees on chain — every bidder able to open their own
              envelope, and stock enforced so a drop can genuinely sell out. Each
              has a public receipts page that needs no wallet.
            </p>
          </div>
          <div className="proofs__list">
            {proofDrops.map((listing) => (
              <article className="tile tile--sunk proofs__item" key={listing.dropId}>
                <div className="row">
                  <span className="mono">{listing.dropId}</span>
                  <div className="masthead__spacer" />
                  <span className="pill">closed</span>
                </div>
                <p className="tile__note" style={{ margin: 0 }}>
                  {listing.metaRef || listing.dropId} — {listing.bidCount} sealed
                  bid{listing.bidCount === 1 ? '' : 's'}, {listing.winnerCount} winner
                  {listing.winnerCount === 1 ? '' : 's'}, stock {listing.stock}.
                </p>
                <Link className="mono" to={`/receipts/${listing.dropId}`}>
                  verify on chain →
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
