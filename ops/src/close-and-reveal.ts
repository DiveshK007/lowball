// close-and-reveal — reveal the sealed reserve on the deployed contract.
//
// Loads the (reserve, salt) preimage stored by create-drop and submits
// revealReserve(). The contract asserts reserveHash(reserve, salt) == the
// published commitment, so a tampered reveal cannot pass. After this, bidders
// can run checkWin from the app and get their verdict.
//
//   MIDNIGHT_NETWORK=preview npm run close-and-reveal
//
//   CONTRACT_ADDRESS   deployed contract (defaults to the L1 Preview deploy)

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Contract } from '../managed/lowball/contract/index.js'
import { emptyLowballPrivateState, witnesses } from './lowball-witnesses.js'
import { callOnNetwork } from './wallet.js'

const here = dirname(fileURLToPath(import.meta.url))
const managedPath = resolve(here, '..', 'managed', 'lowball')
const seedPath = resolve(here, '..', 'vault', 'preprod-seed')

const CONTRACT =
  process.env.CONTRACT_ADDRESS ??
  'e5f6d4704f3e47b3620ccfb01cc7e35aa491f127888a7a63c9f7db63f7c4fc11'

async function main() {
  const preimagePath = resolve(here, '..', 'vault', `drop-${CONTRACT.slice(0, 12)}.json`)
  const preimage = JSON.parse(readFileSync(preimagePath, 'utf-8')) as {
    reserveMinor: string
    saltHex: string
    reserveWhole: string
  }

  const reserve = BigInt(preimage.reserveMinor)
  const salt = new Uint8Array(Buffer.from(preimage.saltHex, 'hex'))

  console.log(`Revealing reserve ${preimage.reserveWhole} tDUST for ${CONTRACT}...`)

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
    invoke: (contract) => contract.callTx.revealReserve(),
  })

  console.log(`\nReserve revealed. Bidders can now open their envelopes.`)
  console.log(JSON.stringify({ ...result, blockHeight: result.blockHeight.toString() }, null, 2))
}

main().catch((e) => {
  console.error(e instanceof Error ? (e.stack ?? e.message) : e)
  process.exit(1)
})
