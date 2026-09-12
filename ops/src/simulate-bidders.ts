// simulate-bidders — drive N distinct bidders through one drop, house-side.
//
// Exists to prove the bid accumulator end to end on a real network: every
// bidder must be able to open their own envelope, not just the most recent one
// (docs/superpowers/plans/2026-09-12-bid-accumulator.md). It is also the
// harness L5/L6 need, where 50 and 70 bidders have to show up on chain.
//
// A "bidder" is a distinct bidderSecret, not a distinct wallet — the contract
// binds a bid to its secret, never to who paid the fee. One funded wallet can
// therefore stand in for many bidders, which is what makes this runnable.
//
// Two phases, because the house must reveal the reserve in between:
//
//   MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=… DROP_ID=drop-001 \
//     BIDDERS=3 npm run simulate-bidders -- bid
//   …then `npm run close-and-reveal`, then:
//   MIDNIGHT_NETWORK=preprod CONTRACT_ADDRESS=… DROP_ID=drop-001 \
//     npm run simulate-bidders -- open
//
// Secrets are written to the git-ignored vault so `open` can reproduce exactly
// the bids `bid` placed. They are bidder secrets: never commit them.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Contract, pureCircuits } from '../managed/lowball/contract/index.js'
import { dropIdBytes } from './drop-id.js'
import { emptyLowballPrivateState, witnesses } from './lowball-witnesses.js'
import { callManyOnNetwork } from './wallet.js'
import type { NetworkCall } from './wallet.js'

const DUST_MINOR = 1_000_000n

const here = dirname(fileURLToPath(import.meta.url))
const managedPath = resolve(here, '..', 'managed', 'lowball')
const seedPath = resolve(here, '..', 'vault', 'preprod-seed')
const vaultDir = resolve(here, '..', 'vault')

const CONTRACT = process.env.CONTRACT_ADDRESS ?? ''
const DROP_ID = process.env.DROP_ID ?? 'drop-001'
const BIDDERS = Number(process.env.BIDDERS ?? '3')
const phase = (process.argv[2] ?? 'bid') as 'bid' | 'open'

if (!CONTRACT) throw new Error('Set CONTRACT_ADDRESS.')
if (phase !== 'bid' && phase !== 'open') {
  throw new Error(`Unknown phase "${phase}" (use: bid | open).`)
}

const short = CONTRACT.slice(0, 12)
const biddersPath = resolve(vaultDir, `bidders-${short}-${DROP_ID}.json`)
const preimagePath = resolve(vaultDir, `drop-${short}-${DROP_ID}.json`)

type Bidder = { readonly index: number; readonly secretHex: string; readonly amountMinor: string }

const toHex = (b: Uint8Array) => Buffer.from(b).toString('hex')
const fromHex = (h: string) => new Uint8Array(Buffer.from(h, 'hex'))

/**
 * Bids are derived from the drop's own sealed reserve so the run actually
 * demonstrates multiple winners. Amounts are never logged — the reserve stays
 * sealed until the house reveals it.
 */
const generateBidders = (): Bidder[] => {
  if (!existsSync(preimagePath)) {
    throw new Error(`No reserve preimage at ${preimagePath}; run create-drop first.`)
  }
  const { reserveMinor } = JSON.parse(readFileSync(preimagePath, 'utf-8')) as {
    reserveMinor: string
  }
  const reserve = BigInt(reserveMinor)
  return Array.from({ length: BIDDERS }, (_, i) => ({
    index: i + 1,
    secretHex: toHex(new Uint8Array(randomBytes(32))),
    // Spread the bids above the reserve so every simulated bidder clears it.
    amountMinor: (reserve + BigInt(i + 1) * DUST_MINOR).toString(),
  }))
}

const loadBidders = (): Bidder[] => {
  if (!existsSync(biddersPath)) {
    throw new Error(`No bidders at ${biddersPath}. Run the "bid" phase first.`)
  }
  return JSON.parse(readFileSync(biddersPath, 'utf-8')) as Bidder[]
}

const privateStateFor = (b: Bidder) => ({
  ...emptyLowballPrivateState(),
  bidAmount: BigInt(b.amountMinor),
  bidderSecret: fromHex(b.secretHex),
})

async function main() {
  const dropId = dropIdBytes(DROP_ID)

  const bidders = phase === 'bid' ? generateBidders() : loadBidders()
  if (phase === 'bid') {
    mkdirSync(vaultDir, { recursive: true })
    writeFileSync(biddersPath, JSON.stringify(bidders, null, 2), { mode: 0o600 })
    console.log(`Bidder secrets stored: ${biddersPath}`)
  }

  console.log(
    `\n${phase === 'bid' ? 'Placing' : 'Opening'} ${bidders.length} bid(s) on ` +
      `"${DROP_ID}" @ ${short}…\n`,
  )

  const calls: NetworkCall<ReturnType<typeof privateStateFor>>[] = bidders.map((b) => ({
    label:
      phase === 'bid'
        ? `bidder ${b.index}: placeBid`
        : `bidder ${b.index}: checkWin`,
    privateState: privateStateFor(b),
    invoke: (contract) =>
      phase === 'bid'
        ? contract.callTx.placeBid(dropId)
        : contract.callTx.checkWin(dropId),
  }))

  const results = await callManyOnNetwork({
    name: 'lowball',
    contractAddress: CONTRACT,
    seedPath,
    contractClass: Contract,
    witnesses,
    privateStateId: 'lowballPrivateState',
    zkConfigPath: managedPath,
    calls,
  })

  console.log(`\n${phase === 'bid' ? 'Bids placed' : 'Envelopes opened'}:`)
  for (const [i, r] of results.entries()) {
    const commitment = toHex(
      pureCircuits.bidHash(
        BigInt(bidders[i].amountMinor),
        fromHex(bidders[i].secretHex),
      ),
    )
    console.log(`  bidder ${bidders[i].index}  commitment ${commitment}`)
    console.log(`             block ${r.blockHeight}`)
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e)
  process.exit(1)
})
