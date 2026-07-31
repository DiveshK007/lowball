// React bindings for the SDK boundary. Components get typed hooks and never
// an SDK object: `useWallet`, `useDropState`, `usePlaceBid`, `useVerdict`.

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

import { connectWallet, watchForWallets } from './connector'
import { LowballError, asWalletError, isLowballError } from './errors'
import { checkVerdict, placeSealedBid, readDropState } from './client'
import type { DropState, TxReceipt, Verdict, WalletSummary } from './types'

const toLowballError = (e: unknown): LowballError =>
  isLowballError(e) ? e : asWalletError(e)

/* -------------------------------------------------------------- wallet -- */

export type WalletStatus =
  | 'detecting'
  | 'absent'
  | 'disconnected'
  | 'connecting'
  | 'connected'

export type WalletContextValue = {
  readonly status: WalletStatus
  readonly wallet: WalletSummary | null
  readonly error: LowballError | null
  /** Present only while connected; passed straight back into the hooks. */
  readonly api: ConnectedAPI | null
  readonly connect: () => void
  readonly disconnect: () => void
  readonly dismissError: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<WalletStatus>('detecting')
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [api, setApi] = useState<ConnectedAPI | null>(null)
  const [error, setError] = useState<LowballError | null>(null)

  // Extensions inject after load, so "absent" is a conclusion, not a first read.
  useEffect(
    () =>
      watchForWallets((found) => {
        setStatus((current) =>
          current === 'detecting'
            ? found.length > 0
              ? 'disconnected'
              : 'absent'
            : current,
        )
      }),
    [],
  )

  const connect = useCallback(() => {
    setError(null)
    setStatus('connecting')
    // connectWallet() reaches wallet.connect() synchronously, so the
    // authorization pop-up keeps the click's user activation.
    connectWallet().then(
      ({ api: connected, summary }) => {
        setApi(connected)
        setWallet(summary)
        setStatus('connected')
      },
      (e: unknown) => {
        const err = toLowballError(e)
        setError(err)
        setApi(null)
        setWallet(null)
        setStatus(err.code === 'wallet-not-installed' ? 'absent' : 'disconnected')
      },
    )
  }, [])

  const disconnect = useCallback(() => {
    // The connector API has no revoke; dropping the handle is the disconnect.
    setApi(null)
    setWallet(null)
    setError(null)
    setStatus('disconnected')
  }, [])

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      wallet,
      api,
      error,
      connect,
      disconnect,
      dismissError: () => setError(null),
    }),
    [status, wallet, api, error, connect, disconnect],
  )

  return <WalletContext value={value}>{children}</WalletContext>
}

export const useWallet = (): WalletContextValue => {
  const value = useContext(WalletContext)
  if (!value) throw new Error('useWallet must be used inside <WalletProvider>')
  return value
}

/* ------------------------------------------------------------ drop read -- */

const POLL_INTERVAL_MS = 10_000

export type DropStateResult = {
  readonly state: DropState | null
  readonly loading: boolean
  readonly error: LowballError | null
  readonly refresh: () => void
}

/** Wallet-free read of a drop's public state, polled while mounted. */
export const useDropState = (address: string | null): DropStateResult => {
  const [state, setState] = useState<DropState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<LowballError | null>(null)
  const [nonce, setNonce] = useState(0)
  const live = useRef(true)

  useEffect(() => {
    live.current = true
    let cancelled = false

    const read = () => {
      readDropState(address).then(
        (next) => {
          if (!cancelled) {
            setState(next)
            setError(null)
            setLoading(false)
          }
        },
        (e: unknown) => {
          if (!cancelled) {
            setError(toLowballError(e))
            setLoading(false)
          }
        },
      )
    }

    read()
    const timer = window.setInterval(read, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      live.current = false
      window.clearInterval(timer)
    }
  }, [address, nonce])

  const refresh = useCallback(() => {
    setLoading(true)
    setNonce((n) => n + 1)
  }, [])

  return { state, loading, error, refresh }
}

/* --------------------------------------------------------- circuit calls -- */

/** Where a bid is in the ritual. Drives the envelope animation states. */
export type BidPhase = 'idle' | 'proving' | 'sealed' | 'failed'

export type PlaceBidResult = {
  readonly phase: BidPhase
  readonly receipt: (TxReceipt & { commitmentHex: string }) | null
  readonly error: LowballError | null
  readonly seal: (
    amount: bigint,
    secret: Uint8Array,
  ) => Promise<(TxReceipt & { commitmentHex: string }) | null>
  readonly reset: () => void
}

export const usePlaceBid = (address: string | null): PlaceBidResult => {
  const { api } = useWallet()
  const [phase, setPhase] = useState<BidPhase>('idle')
  const [receipt, setReceipt] = useState<
    (TxReceipt & { commitmentHex: string }) | null
  >(null)
  const [error, setError] = useState<LowballError | null>(null)

  const seal = useCallback(
    async (amount: bigint, secret: Uint8Array) => {
      if (!api) {
        setError(
          new LowballError('wallet-rejected', 'Connect a wallet to bid.', {
            hint: 'Your typed amount is kept while you connect.',
          }),
        )
        setPhase('failed')
        return null
      }

      // Preflight: fees are paid in DUST, generated from registered NIGHT. A
      // wallet with zero DUST only fails at submit — after a slow proof and a
      // signing prompt — so catch it up front with an actionable message.
      try {
        const { balance } = await api.getDustBalance()
        if (balance <= 0n) {
          setError(
            new LowballError(
              'insufficient-dust',
              'Your wallet has no DUST to pay the network fee yet.',
              {
                hint: 'In Lace, register your NIGHT for DUST generation and wait for DUST to accrue, then seal again. Your amount stays typed in.',
              },
            ),
          )
          setPhase('failed')
          return null
        }
      } catch {
        // If the wallet cannot report a DUST balance, fall through to the
        // normal path rather than blocking a bid on a preflight quirk.
      }

      setPhase('proving')
      setError(null)
      try {
        const result = await placeSealedBid({ api, address, amount, secret })
        setReceipt(result)
        setPhase('sealed')
        return result
      } catch (e) {
        setError(toLowballError(e))
        setPhase('failed')
        return null
      }
    },
    [api, address],
  )

  const reset = useCallback(() => {
    setPhase('idle')
    setError(null)
    setReceipt(null)
  }, [])

  return { phase, receipt, error, seal, reset }
}

export type VerdictPhase = 'idle' | 'opening' | 'settled' | 'failed'

export type VerdictResult = {
  readonly phase: VerdictPhase
  readonly verdict: Verdict | null
  readonly error: LowballError | null
  readonly open: (amount: bigint, secret: Uint8Array) => Promise<Verdict | null>
  readonly reset: () => void
}

/**
 * Reveal-day verdict. A loss never leaves the device: the in-circuit assert
 * fails locally, so no transaction is built and nothing is disclosed.
 */
export const useVerdict = (address: string | null): VerdictResult => {
  const { api } = useWallet()
  const [phase, setPhase] = useState<VerdictPhase>('idle')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [error, setError] = useState<LowballError | null>(null)

  const open = useCallback(
    async (amount: bigint, secret: Uint8Array) => {
      if (!api) {
        setError(
          new LowballError('wallet-rejected', 'Connect a wallet to open your envelope.'),
        )
        setPhase('failed')
        return null
      }
      setPhase('opening')
      setError(null)
      try {
        const result = await checkVerdict({ api, address, amount, secret })
        setVerdict(result)
        setPhase('settled')
        return result
      } catch (e) {
        setError(toLowballError(e))
        setPhase('failed')
        return null
      }
    },
    [api, address],
  )

  const reset = useCallback(() => {
    setPhase('idle')
    setVerdict(null)
    setError(null)
  }, [])

  return { phase, verdict, error, open, reset }
}
