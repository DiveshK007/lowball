// Sync the compiled LOWBALL contract into web/ so the app can be built and
// deployed without the Compact toolchain present (Vercel has no compactc, and
// contract/src/managed/ is git-ignored).
//
//   npm run sync:contract     # from web/, after `npm run compact` in contract/
//
// What lands where:
//   contract/                      web/
//     managed/lowball/contract/  →  src/lib/midnight/generated/lowball/   (TS bindings)
//     managed/lowball/keys/      →  public/keys/     (prover + verifier keys)
//     managed/lowball/zkir/      →  public/zkir/     (circuit IR)
//
// public/keys + public/zkir are what FetchZkConfigProvider reads at runtime
// (it expects {origin}/keys/{circuit}.prover and {origin}/zkir/{circuit}.bzkir).
// The outputs of this script are committed on purpose — they are the build
// inputs Vercel needs.

import { copyFileSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const web = resolve(here, '..')
const managed = resolve(web, '..', 'contract', 'src', 'managed', 'lowball')

// Every circuit needs a verifier key: findDeployedContract checks the deployed
// contract's verifier keys against the local ones for all provable circuits.
const ALL_CIRCUITS = ['createDrop', 'placeBid', 'revealReserve', 'checkWin']
// Only the circuits the web app actually proves need the (multi-MB) prover key.
// createDrop and revealReserve are house-side — they run from ops/, not here.
const WEB_CIRCUITS = ['placeBid', 'checkWin']

const copies = [
  ['contract/index.js', 'src/lib/midnight/generated/lowball/index.js'],
  ['contract/index.d.ts', 'src/lib/midnight/generated/lowball/index.d.ts'],
  // index.js ends with a //# sourceMappingURL=index.js.map comment, so the map
  // has to come along or every vitest run logs an ENOENT for the missing file.
  ['contract/index.js.map', 'src/lib/midnight/generated/lowball/index.js.map'],
  ...ALL_CIRCUITS.flatMap((c) => [
    [`keys/${c}.verifier`, `public/keys/${c}.verifier`],
    [`zkir/${c}.bzkir`, `public/zkir/${c}.bzkir`],
  ]),
  ...WEB_CIRCUITS.map((c) => [`keys/${c}.prover`, `public/keys/${c}.prover`]),
]

try {
  statSync(managed)
} catch {
  console.error(
    `No compiled contract at ${managed}\n` +
      `Run \`npm run compact\` in contract/ first.`,
  )
  process.exit(1)
}

let bytes = 0
for (const [from, to] of copies) {
  const src = resolve(managed, from)
  const dest = resolve(web, to)
  mkdirSync(dirname(dest), { recursive: true })
  copyFileSync(src, dest)
  bytes += statSync(dest).size
  console.log(`  ${to}`)
}
console.log(`Synced ${copies.length} files (${(bytes / 1e6).toFixed(1)} MB).`)
