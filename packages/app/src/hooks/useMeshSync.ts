import { useCallback, useEffect, useState } from 'react'
import {
  startMeshMode,
  stopMeshMode,
  getMeshPeers,
  isMeshActive,
  isWifiDirectUp,
  isBleUp,
} from '../lib/mesh'
import { getBlePeers } from '../lib/ble-discovery'

export interface MeshSyncState {
  // Phase A — mDNS relay
  meshActive: boolean
  peerCount: number
  peerUrls: string[]
  // Phase B — WiFi Direct
  wifiDirectActive: boolean
  // Phase C — BLE background discovery
  bleActive: boolean
  blePeerCount: number
  // Control
  startMesh: (port?: number, tribeId?: string) => Promise<void>
  stopMesh: () => Promise<void>
}

/**
 * React hook for mesh P2P sync state (Phase 15A/B/C).
 *
 * - `meshActive`       — mDNS relay is running (Phase A)
 * - `peerCount`        — number of mDNS-discovered Gun peers
 * - `wifiDirectActive` — WiFi Direct has a live P2P connection (Phase B)
 * - `bleActive`        — BLE advertising + scanning is running (Phase C)
 * - `blePeerCount`     — nearby tribe members detected via BLE
 *
 * All values are inert (false/0) in browser/PWA context.
 */
export function useMeshSync(): MeshSyncState {
  const [peerUrls, setPeerUrls] = useState<string[]>(getMeshPeers)
  const [meshActive, setMeshActive] = useState(isMeshActive)
  const [wifiDirectActive, setWifiDirectActive] = useState(isWifiDirectUp)
  const [bleActive, setBleActive] = useState(isBleUp)
  const [blePeerCount, setBlePeerCount] = useState(() => getBlePeers().length)

  useEffect(() => {
    // Phase A — mDNS peer changes
    const onMeshChanged = (e: Event) => {
      const peers = (e as CustomEvent<string[]>).detail ?? []
      setPeerUrls(peers)
      setMeshActive(isMeshActive())
    }

    // Phase B — WiFi Direct state changes
    const onWifiDirectChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ connected: boolean }>).detail
      setWifiDirectActive(detail?.connected ?? false)
    }

    // Phase C — BLE peer changes
    const onBleChanged = (e: Event) => {
      const peers = (e as CustomEvent<unknown[]>).detail ?? []
      setBlePeerCount(peers.length)
      setBleActive(isBleUp())
    }

    window.addEventListener('mesh-peers-changed', onMeshChanged)
    window.addEventListener('wifi-direct-state-changed', onWifiDirectChanged)
    window.addEventListener('ble-peers-changed', onBleChanged)

    return () => {
      window.removeEventListener('mesh-peers-changed', onMeshChanged)
      window.removeEventListener('wifi-direct-state-changed', onWifiDirectChanged)
      window.removeEventListener('ble-peers-changed', onBleChanged)
    }
  }, [])

  const startMesh = useCallback(async (port?: number, tribeId?: string) => {
    await startMeshMode(port, tribeId)
    setMeshActive(isMeshActive())
    setPeerUrls(getMeshPeers())
    setWifiDirectActive(isWifiDirectUp())
    setBleActive(isBleUp())
  }, [])

  const stopMesh = useCallback(async () => {
    await stopMeshMode()
    setMeshActive(false)
    setPeerUrls([])
    setWifiDirectActive(false)
    setBleActive(false)
    setBlePeerCount(0)
  }, [])

  return {
    meshActive,
    peerCount: peerUrls.length,
    peerUrls,
    wifiDirectActive,
    bleActive,
    blePeerCount,
    startMesh,
    stopMesh,
  }
}
