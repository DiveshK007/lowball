import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import { config, networkLabel } from './config'
import { WalletProvider } from './lib/midnight'
import { ConnectButton } from './features/wallet/ConnectButton'
import { GalleryPage } from './app/GalleryPage'
import { DropPage } from './app/DropPage'
import { ReceiptsPage } from './app/ReceiptsPage'

const Masthead = () => (
  <header className="masthead">
    <nav className="wrap masthead__inner" aria-label="Primary">
      <Link to="/" className="wordmark" aria-label="LOWBALL — home">
        LOW<span>BALL</span>
      </Link>
      <span className="pill" title="Midnight network this build targets">
        <span className="dot" aria-hidden="true" />
        {networkLabel[config.networkId]}
      </span>
      <div className="masthead__spacer" />
      <ConnectButton />
    </nav>
  </header>
)

const Footer = () => (
  <footer className="footer">
    <div className="wrap">
      Sealed-bid mystery drops on Midnight. The reserve is committed before bids
      open and revealed after close, hash-verified onchain. Bids stay sealed
      forever.{' '}
      <a href={config.faucetUrl} target="_blank" rel="noreferrer">
        {networkLabel[config.networkId]} faucet
      </a>
    </div>
  </footer>
)

const NotFound = () => (
  <div className="center-note">
    <span className="eyebrow">404</span>
    <h2>Nothing sealed here.</h2>
    <p className="muted" style={{ margin: 0, maxWidth: '32rem' }}>
      This address holds no drop. The gallery lists everything the house has
      opened.
    </p>
    <Link className="btn btn--ghost" to="/">
      Back to the gallery
    </Link>
  </div>
)

const App = () => (
  <WalletProvider>
    <BrowserRouter>
      <div className="shell">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Masthead />
        <main id="main">
          <div className="wrap">
            <Routes>
              <Route path="/" element={<GalleryPage />} />
              <Route path="/drop/:dropId" element={<DropPage />} />
              <Route path="/receipts/:dropId" element={<ReceiptsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  </WalletProvider>
)

export default App
