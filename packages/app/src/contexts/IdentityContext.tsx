import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadIdentity, generateIdentity, restoreIdentity as restoreIdentityLib, saveDisplayName as saveDisplayNameLib } from '../lib/platform/identity'
import type { Identity } from '@plus-ultra/core'

interface IdentityContextValue {
  identity: Identity | null
  loading: boolean
  /** Last completed init step — surfaced when init stalls or fails. */
  initStep: string
  initError: string | null
  restoreIdentity: (raw: string) => Promise<void>
  saveDisplayName: (name: string) => Promise<void>
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)
  const [initStep, setInitStep] = useState('starting')
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Safety net: if init stalls (e.g. a native bridge never resolves),
    // surface the last completed step instead of pulsing forever.
    const watchdog = setTimeout(() => {
      if (!cancelled) {
        setInitError(`Init stalled at step: ${stepRef.current}`)
        setLoading(false)
      }
    }, 40000)
    const stepRef = { current: 'starting' }
    const step = (s: string) => {
      stepRef.current = s
      console.info('[identity] init step:', s)
      if (!cancelled) setInitStep(s)
    }

    async function init() {
      try {
        step('loadIdentity')
        let id = await loadIdentity()
        if (cancelled) return
        if (!id) {
          step('generateIdentity')
          id = await generateIdentity()
          if (cancelled) return
        }
        step('done')
        setIdentity(id)
      } catch (err) {
        console.error('[identity] init failed:', err)
        if (!cancelled) {
          setInitError(err instanceof Error ? err.message : String(err))
        }
      } finally {
        clearTimeout(watchdog)
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
      clearTimeout(watchdog)
    }
  }, [])

  async function restoreIdentity(raw: string) {
    const id = await restoreIdentityLib(raw)
    setIdentity(id)
  }

  async function saveDisplayName(name: string) {
    await saveDisplayNameLib(name)
    setIdentity(prev => prev ? { ...prev, displayName: name.trim() || undefined } : prev)
  }

  return (
    <IdentityContext.Provider value={{ identity, loading, initStep, initError, restoreIdentity, saveDisplayName }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
