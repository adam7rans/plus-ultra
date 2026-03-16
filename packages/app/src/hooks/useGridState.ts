import { useState, useEffect, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useIdentity } from '../contexts/IdentityContext'
import {
  subscribeToGridState,
  setGridState as libSetGridState,
  clearGridState as libClearGridState,
} from '../lib/grid-state'
import { useIsGridUp } from './useIsGridUp'
import type { GridState } from '@plus-ultra/core'

export function useGridState(tribeId: string, memberName?: string) {
  const { identity } = useIdentity()
  const gridUp = useIsGridUp()

  // Convex path (grid-up): real-time, no polling
  const convexData = useQuery(
    api.gridState.get,
    gridUp && tribeId ? { tribeId } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunState, setGunState] = useState<GridState | null>(null)
  const [gunLoading, setGunLoading] = useState(true)

  useEffect(() => {
    if (gridUp || !tribeId) return
    let cancelled = false
    const unsub = subscribeToGridState(tribeId, (state) => {
      if (cancelled) return
      setGunState(state)
      setGunLoading(false)
    })
    // If no state arrives within 500ms, mark done loading
    const timeout = setTimeout(() => { if (!cancelled) setGunLoading(false) }, 500)
    return () => {
      cancelled = true
      unsub()
      clearTimeout(timeout)
    }
  }, [tribeId, gridUp])

  const gridState = gridUp
    ? (convexData ?? null) as unknown as GridState | null
    : gunState
  const loading = gridUp ? convexData === undefined : gunLoading

  // Auto-clear if expired on every render
  const now = Date.now()
  const isExpired = gridState !== null && gridState.expiresAt > 0 && gridState.expiresAt < now
  const isGridDown = gridState?.mode === 'down' && !isExpired
  const isSimulation = gridState?.isSimulation ?? false

  // Clear expired state from IDB/Gun
  useEffect(() => {
    if (isExpired) {
      libClearGridState(tribeId).then(() => {
        if (!gridUp) setGunState(null)
      })
    }
  }, [isExpired, tribeId, gridUp])

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
    if (!gridUp) setGunState(null)
  }, [tribeId, gridUp])

  return {
    gridState: isExpired ? null : gridState,
    isGridDown,
    isSimulation,
    setGridDown,
    clearGridDown,
    loading,
  }
}
