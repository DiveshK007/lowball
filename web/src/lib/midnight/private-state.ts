// In-memory private state store.
//
// The SDK's level-backed provider does not run in a browser (its abstract-level
// dependency extends node's EventEmitter). We do not want a persisted copy
// anyway: the bid amount and bidder secret are handed to a circuit for the
// duration of one call, and the durable record lives in lib/persistence under
// the user's own control. Nothing here outlives the tab.

import type {
  ContractAddress,
  SigningKey,
} from '@midnight-ntwrk/midnight-js-protocol/ledger'
import type {
  PrivateStateId,
  PrivateStateProvider,
} from '@midnight-ntwrk/midnight-js-types'

const unsupported = (operation: string): never => {
  throw new Error(
    `${operation} is not available in the browser build — export your bid backup from the drop page instead.`,
  )
}

export const inMemoryPrivateStateProvider = <
  PSI extends PrivateStateId,
  PS,
>(): PrivateStateProvider<PSI, PS> => {
  const states = new Map<string, PS>()
  const signingKeys = new Map<ContractAddress, SigningKey>()
  let contractAddress: ContractAddress | null = null

  // States are scoped per contract, mirroring the level provider's semantics
  // so a second drop cannot read the first drop's witnesses.
  const scoped = (privateStateId: PSI): string => {
    if (!contractAddress) {
      throw new Error('setContractAddress must be called before private state access')
    }
    return `${contractAddress}:${String(privateStateId)}`
  }

  return {
    setContractAddress: (address: ContractAddress) => {
      contractAddress = address
    },
    set: async (privateStateId: PSI, state: PS) => {
      states.set(scoped(privateStateId), state)
    },
    get: async (privateStateId: PSI) => states.get(scoped(privateStateId)) ?? null,
    remove: async (privateStateId: PSI) => {
      states.delete(scoped(privateStateId))
    },
    clear: async () => {
      states.clear()
    },
    setSigningKey: async (address: ContractAddress, signingKey: SigningKey) => {
      signingKeys.set(address, signingKey)
    },
    getSigningKey: async (address: ContractAddress) =>
      signingKeys.get(address) ?? null,
    removeSigningKey: async (address: ContractAddress) => {
      signingKeys.delete(address)
    },
    clearSigningKeys: async () => {
      signingKeys.clear()
    },
    exportPrivateStates: async () => unsupported('Private state export'),
    importPrivateStates: async () => unsupported('Private state import'),
    exportSigningKeys: async () => unsupported('Signing key export'),
    importSigningKeys: async () => unsupported('Signing key import'),
  }
}
