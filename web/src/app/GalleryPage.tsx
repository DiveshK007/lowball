import { SEEDED_DROPS } from '../config/drops'
import { isContractConfigured } from '../config'
import { useDropState } from '../lib/midnight'
import type { DropMeta } from '../config/drops'
import { Banner } from '../ui/Banner'
import { DropCard } from '../features/drops/DropCard'
import { WalletNotice } from '../features/wallet/WalletNotice'

const LiveDropCard = ({ drop }: { drop: DropMeta }) => {
  const { state, loading } = useDropState(drop.contractAddress)
  return <DropCard drop={drop} state={state} loading={loading} />
}

export const GalleryPage = () => (
  <div className="stack">
    <section className="hero">
      <span className="eyebrow">Provably-fair mystery drops</span>
      <h1>Name your price. The house already named theirs.</h1>
      <p>
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
        hint="Drops render from local metadata; live stock, bid counts and bidding switch on once VITE_CONTRACT_ADDRESS points at the Preprod deploy."
      />
    )}

    <div className="grid">
      {SEEDED_DROPS.map((drop) => (
        <LiveDropCard key={drop.id} drop={drop} />
      ))}
    </div>
  </div>
)
