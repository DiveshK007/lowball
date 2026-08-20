import { SEEDED_DROPS } from '../config/drops'
import { isContractConfigured } from '../config'
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

export const GalleryPage = () => {
  const root = useReveal<HTMLDivElement>()

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

      <div className="grid">
        {SEEDED_DROPS.map((drop) => (
          <div className="reveal" key={drop.id}>
            <LiveDropCard drop={drop} />
          </div>
        ))}
      </div>
    </div>
  )
}
