import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadIdentity, generateIdentity, restoreIdentity as restoreIdentityLib, saveDisplayName as saveDisplayNameLib } from '../lib/identity'
import type { Identity } from '@plus-ultra/core'

interface IdentityContextValue {
  identity: Identity | null
  loading: boolean
  restoreIdentity: (raw: string) => Promise<void>
  saveDisplayName: (name: string) => Promise<void>
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        let id = await loadIdentity()
        if (!id) {
          id = await generateIdentity()
        }
        setIdentity(id)
      } finally {
        setLoading(false)
      }
    }
    void init()
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
    <IdentityContext.Provider value={{ identity, loading, restoreIdentity, saveDisplayName }}>
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity(): IdentityContextValue {
  const ctx = useContext(IdentityContext)
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider')
  return ctx
}
