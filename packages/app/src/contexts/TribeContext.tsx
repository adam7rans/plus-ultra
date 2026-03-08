import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getMyTribes, subscribeToMembers, updateLastSeen } from '../lib/tribes'
import { useIdentity } from './IdentityContext'
import type { TribeMember } from '@plus-ultra/core'

interface LocalTribeRef {
  tribeId: string
  name: string
  location: string
  joinedAt: number
}

interface TribeContextValue {
  myTribes: LocalTribeRef[]
  activeTribeId: string | null
  setActiveTribeId: (id: string) => void
  members: TribeMember[]
  loadingTribes: boolean
}

const TribeContext = createContext<TribeContextValue | null>(null)

export function TribeProvider({ children }: { children: ReactNode }) {
  const { identity } = useIdentity()
  const [myTribes, setMyTribes] = useState<LocalTribeRef[]>([])
  const [activeTribeId, setActiveTribeIdState] = useState<string | null>(null)
  const [members, setMembers] = useState<TribeMember[]>([])
  const [loadingTribes, setLoadingTribes] = useState(true)

  // Load tribe list from IndexedDB on mount
  useEffect(() => {
    getMyTribes().then(tribes => {
      setMyTribes(tribes)
      if (tribes.length > 0 && !activeTribeId) {
        setActiveTribeIdState(tribes[0].tribeId)
      }
      setLoadingTribes(false)
    })
  }, [])

  // Subscribe to members when active tribe changes
  useEffect(() => {
    if (!activeTribeId) return
    const unsub = subscribeToMembers(activeTribeId, setMembers)
    return unsub
  }, [activeTribeId])

  // Update last seen every 5 minutes while app is open
  useEffect(() => {
    if (!activeTribeId || !identity) return
    void updateLastSeen(activeTribeId, identity.pub)
    const interval = setInterval(() => {
      void updateLastSeen(activeTribeId, identity.pub)
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [activeTribeId, identity])

  const setActiveTribeId = useCallback((id: string) => {
    setActiveTribeIdState(id)
  }, [])

  // Expose a refresh function for after joining/creating a tribe
  useEffect(() => {
    const refresh = () => {
      getMyTribes().then(tribes => {
        setMyTribes(tribes)
      })
    }
    window.addEventListener('tribe-joined', refresh)
    return () => window.removeEventListener('tribe-joined', refresh)
  }, [])

  return (
    <TribeContext.Provider value={{ myTribes, activeTribeId, setActiveTribeId, members, loadingTribes }}>
      {children}
    </TribeContext.Provider>
  )
}

export function useTribe(): TribeContextValue {
  const ctx = useContext(TribeContext)
  if (!ctx) throw new Error('useTribe must be used within TribeProvider')
  return ctx
}
