import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// The Midnight SDK ships wasm-bindgen modules (ledger, onchain runtime) that
// need `wasm` + `topLevelAwait` and an esnext build target.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  define: {
    // level/superjson and friends still reach for the node `global`.
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/onchain-runtime-v3', '@midnight-ntwrk/ledger-v8'],
  },
  worker: {
    format: 'es',
  },
})
