// create-drop — open a drop on the deployed LOWBALL contract (house side).
//
// Generates a secret reserve + salt, publishes only their hash as the onchain
// commitment (the house cannot move the reserve afterwards), and stores the
// (reserve, salt) preimage in the git-ignored vault for the later reveal.
//
//   MIDNIGHT_NETWORK=preview npm run create-drop
//
// Env knobs (all optional):
//   CONTRACT_ADDRESS   deployed contract (defaults to the L1 Preview deploy)
//   DROP_RESERVE       hidden reserve in whole tDUST (default 25)
//   DROP_STOCK         units available (default 1)
//   DROP_CLOSE_MINUTES minutes until reveal (default 60)
//   DROP_META          item label (default "Genesis Envelope")

import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Contract, pureCircuits } from '../managed/lowball/contract/index.js'
import { emptyLowballPrivateState, witnesses } from './lowball-witnesses.js'
import { callOnNetwork } from './wallet.js'

const DUST_MINOR = 1_000_000n // tDUST has 6 decimals; ledger values are minor units

const here = dirname(fileURLToPath(import.meta.url))
const managedPath = resolve(here, '..', 'managed', 'lowball')
const seedPath = resolve(here, '..', 'vault', 'preprod-seed')

const CONTRACT =
  process.env.CONTRACT_ADDRESS ??
  'e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11'
const reserveWhole = BigInt(process.env.DROP_RESERVE ?? '25')
const reserve = reserveWhole * DUST_MINOR
const stock = BigInt(process.env.DROP_STOCK ?? '1')
const closeMinutes = Number(process.env.DROP_CLOSE_MINUTES ?? '60')
const closeTime = BigInt(Math.floor(Date.now() / 1000) + closeMinutes * 60)
const meta = process.env.DROP_META ?? 'Genesis Envelope'

const toHex = (b: Uint8Array) => Buffer.from(b).toString('hex')

async function main() {
  const salt = new Uint8Array(randomBytes(32))
  const commitment = pureCircuits.reserveHash(reserve, salt)

  // Persist the preimage FIRST — losing it means losing the ability to reveal.
  const vaultDir = resolve(here, '..', 'vault')
  mkdirSync(vaultDir, { recursive: true })
  const preimagePath = resolve(vaultDir, `drop-${CONTRACT.slice(0, 12)}.json`)
  writeFileSync(
    preimagePath,
    JSON.stringify(
      {
        contractAddress: CONTRACT,
        reserveMinor: reserve.toString(),
        reserveWhole: reserveWhole.toString(),
        saltHex: toHex(salt),
        commitmentHex: toHex(commitment),
        stock: stock.toString(),
        closeTime: closeTime.toString(),
        meta,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  )
  console.log(`Reserve preimage stored: ${preimagePath}`)
  console.log(`  reserve:    ${reserveWhole} tDUST (hidden)`)
  console.log(`  commitment: ${toHex(commitment)}`)
  console.log(`  stock:      ${stock}`)
  console.log(`  closes:     ${new Date(Number(closeTime) * 1000).toISOString()}`)

  const result = await callOnNetwork({
    name: 'lowball',
    contractAddress: CONTRACT,
    seedPath,
    contractClass: Contract,
    witnesses,
    privateStateId: 'lowballPrivateState',
    initialPrivateState: emptyLowballPrivateState(),
    zkConfigPath: managedPath,
    invoke: (contract) =>
      contract.callTx.createDrop(commitment, stock, closeTime, meta),
  })

  console.log(`\nDrop opened.`)
  console.log(JSON.stringify({ ...result, blockHeight: result.blockHeight.toString() }, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e)
  process.exit(1)
})
