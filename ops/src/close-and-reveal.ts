// close-and-reveal — reveal the sealed reserve on the deployed contract.
//
// Loads the (reserve, salt) preimage stored by create-drop and submits
// revealReserve(). The contract asserts reserveHash(reserve, salt) == the
// published commitment, so a tampered reveal cannot pass. After this, bidders
// can run checkWin from the app and get their verdict.
//
//   MIDNIGHT_NETWORK=preprod DROP_ID=drop-002 npm run close-and-reveal
//
//   CONTRACT_ADDRESS   deployed contract (defaults to the L1 Preview deploy)
//   DROP_ID            drop slug to reveal (default "drop-001")

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Contract } from '../managed/lowball/contract/index.js'
import { dropIdBytes } from './drop-id.js'
import { emptyLowballPrivateState, witnesses } from './lowball-witnesses.js'
import { callOnNetwork } from './wallet.js'

const here = dirname(fileURLToPath(import.meta.url))
const managedPath = resolve(here, '..', 'managed', 'lowball')
const seedPath = resolve(here, '..', 'vault', 'preprod-seed')

const CONTRACT =
  process.env.CONTRACT_ADDRESS ??
  'e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11'

const DROP_ID = process.env.DROP_ID ?? 'drop-001'
const dropId = dropIdBytes(DROP_ID)

/**
 * Preimages are now stored per contract *and* drop. Fall back to the old
 * single-drop path so reveals still work for drops opened before multi-drop.
 */
const findPreimage = (): string => {
  const vault = resolve(here, '..', 'vault')
  const perDrop = resolve(vault, `drop-${CONTRACT.slice(0, 12)}-${DROP_ID}.json`)
  if (existsSync(perDrop)) return perDrop
  const legacy = resolve(vault, `drop-${CONTRACT.slice(0, 12)}.json`)
  if (existsSync(legacy)) return legacy
  throw new Error(
    `No reserve preimage for drop "${DROP_ID}" on ${CONTRACT.slice(0, 12)}. ` +
      `Looked in ${perDrop} and ${legacy}.`,
  )
}

async function main() {
  const preimagePath = findPreimage()
  const preimage = JSON.parse(readFileSync(preimagePath, 'utf-8')) as {
    reserveMinor: string
    saltHex: string
    reserveWhole: string
  }

  const reserve = BigInt(preimage.reserveMinor)
  const salt = new Uint8Array(Buffer.from(preimage.saltHex, 'hex'))

  console.log(`Revealing reserve for drop "${DROP_ID}" on ${CONTRACT}...`)

  const result = await callOnNetwork({
    name: 'lowball',
    contractAddress: CONTRACT,
    seedPath,
    contractClass: Contract,
    witnesses,
    privateStateId: 'lowballPrivateState',
    // The reveal witnesses read reserve + salt from private state.
    initialPrivateState: { ...emptyLowballPrivateState(), reserve, salt },
    zkConfigPath: managedPath,
    invoke: (contract) => contract.callTx.revealReserve(dropId),
  })

  console.log(`\nReserve revealed. Bidders can now open their envelopes.`)
  console.log(JSON.stringify({ ...result, blockHeight: result.blockHeight.toString() }, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e)
  process.exit(1)
})
