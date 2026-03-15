import { useState, useEffect, useCallback } from 'react'
import { useIdentity } from '../contexts/IdentityContext'
import {
  subscribeToGridState,
  setGridState as libSetGridState,
  clearGridState as libClearGridState,
} from '../lib/grid-state'
import type { GridState } from '@plus-ultra/core'

export function useGridState(tribeId: string, memberName?: string) {
  const { identity } = useIdentity()
  const [gridState, setGridState] = useState<GridState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tribeId) return
    const unsub = subscribeToGridState(tribeId, (state) => {
      setGridState(state)
      setLoading(false)
    })
    // If no state arrives within 500ms, mark done loading
    const timeout = setTimeout(() => setLoading(false), 500)
    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [tribeId])

  // Auto-clear if expired on every render
  const now = Date.now()
  const isExpired = gridState !== null && gridState.expiresAt > 0 && gridState.expiresAt < now
  const isGridDown = gridState?.mode === 'down' && !isExpired
  const isSimulation = gridState?.isSimulation ?? false

  // Clear expired state from IDB/Gun
  useEffect(() => {
    if (isExpired) {
      libClearGridState(tribeId).then(() => setGridState(null))
    }
  }, [isExpired, tribeId])

  const setGridDown = useCallback(async (opts: {
    days: number          // 0 = until cleared (no expiry)
    message?: string
    isSimulation?: boolean
  }) => {
    if (!identity) return
    const now = Date.now()
    const state: GridState = {
      tribeId,
      mode: 'down',
      isSimulation: opts.isSimulation ?? false,
      setBy: identity.pub,
      setByName: memberName ?? identity.pub.slice(0, 8),
      setAt: now,
      expiresAt: opts.days > 0 ? now + opts.days * 24 * 60 * 60 * 1000 : 0,
      message: opts.message || undefined,
    }
    await libSetGridState(state)
  }, [tribeId, identity, memberName])

  const clearGridDown = useCallback(async () => {
    await libClearGridState(tribeId)
    setGridState(null)
  }, [tribeId])

  return {
    gridState: isExpired ? null : gridState,
    isGridDown,
    isSimulation,
    setGridDown,
    clearGridDown,
    loading,
  }
}
