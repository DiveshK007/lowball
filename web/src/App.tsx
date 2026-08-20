import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import { config, networkLabel } from './config'
import { WalletProvider } from './lib/midnight'
import { ConnectButton } from './features/wallet/ConnectButton'
import { GalleryPage } from './app/GalleryPage'
import { DropPage } from './app/DropPage'
import { ReceiptsPage } from './app/ReceiptsPage'

const Masthead = () => (
  <header className="masthead">
    <div className="wrap masthead__inner">
      <Link to="/" className="wordmark">
        LOW<span>BALL</span>
      </Link>
      <span className="pill">
        <span className="dot" />
        {networkLabel[config.networkId]}
      </span>
      <div className="masthead__spacer" />
      <ConnectButton />
    </div>
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
    <h2>Nothing sealed here.</h2>
    <Link className="btn btn--ghost" to="/">
      Back to the gallery
    </Link>
  </div>
)

const App = () => (
  <WalletProvider>
    <BrowserRouter>
      <div className="shell">
        <Masthead />
        <main>
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
