import { useEffect, useState } from 'react'
import { getConvexClient } from '../lib/convex-client'
import { getOfflineSince } from '../lib/offline-tracker'
import { isMeshUp } from '../lib/sync-adapter'
import type { SyncTier } from '../lib/sync-adapter'

/**
 * Reactive version of isGridUp() from sync-adapter.
 * Returns true when Convex is configured, browser is online, and not in offline-since state.
 * Re-renders on online/offline and mesh-peers-changed events.
 */
export function useIsGridUp(): boolean {
  const hasConvex = !!getConvexClient()
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [offlineSince, setOfflineSince] = useState(getOfflineSince())

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setOfflineSince(getOfflineSince()) }
    const handleOffline = () => { setOnline(false); setOfflineSince(getOfflineSince()) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return hasConvex && online && offlineSince === null
}

/**
 * Returns the current three-tier sync state:
 *   'grid-up'    — Convex cloud connected
 *   'mesh'       — mDNS peer or WiFi Direct connection active (Phase A/B)
 *   'local-only' — no remote connectivity
 *
 * Re-renders on online/offline, mDNS peer changes, and WiFi Direct state changes.
 */
export function useSyncTier(): SyncTier {
  const gridUp = useIsGridUp()
  const [meshPeerCount, setMeshPeerCount] = useState(0)
  const [wifiDirectUp, setWifiDirectUp] = useState(false)

  useEffect(() => {
    const onMesh = (e: Event) => {
      const peers = (e as CustomEvent<string[]>).detail ?? []
      setMeshPeerCount(peers.length)
    }
    const onWifiDirect = (e: Event) => {
      const detail = (e as CustomEvent<{ connected: boolean }>).detail
      setWifiDirectUp(detail?.connected ?? false)
    }
    window.addEventListener('mesh-peers-changed', onMesh)
    window.addEventListener('wifi-direct-state-changed', onWifiDirect)
    return () => {
      window.removeEventListener('mesh-peers-changed', onMesh)
      window.removeEventListener('wifi-direct-state-changed', onWifiDirect)
    }
  }, [])

  if (gridUp) return 'grid-up'
  if (meshPeerCount > 0 || wifiDirectUp || isMeshUp()) return 'mesh'
  return 'local-only'
}
