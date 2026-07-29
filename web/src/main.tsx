import { Buffer } from 'buffer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/styles.css'
import App from './App.tsx'

// The Midnight SDK (and its level/superjson deps) assume a node-ish global.
globalThis.Buffer ??= Buffer

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
