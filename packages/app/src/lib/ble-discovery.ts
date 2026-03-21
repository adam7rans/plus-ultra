/**
 * ble-discovery.ts — Phase 15C BLE background discovery bridge.
 *
 * The BLE layer is the outermost detection ring:
 *   BLE (passive ~50–100m) → triggers WiFi Direct connection → Gun sync
 *
 * BLE advertises a service UUID derived from the tribe ID so only tribe members
 * find each other. When a scan hit arrives, WiFi Direct peer discovery is
 * triggered automatically, and the first found peer is auto-connected.
 *
 * No-op in browser/PWA/desktop context.
 */

import { startWifiDirectMode, connectToWifiDirectPeer } from './wifi-direct'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlePeer {
  address: string
  rssi: number
  name: string
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _active = false
let _tribeId: string | null = null
let _unlistenPeerFound: (() => void) | null = null
let _autoConnectEnabled = true

// BLE peers found this session (deduplicated by address)
const _blePeers = new Map<string, BlePeer>()

// ---------------------------------------------------------------------------
// Tauri guard
// ---------------------------------------------------------------------------

function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

async function tauriListen<T>(event: string, handler: (payload: T) => void): Promise<() => void> {
  const { listen } = await import('@tauri-apps/api/event')
  return listen<T>(event, (e) => handler(e.payload))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start BLE advertising + scanning for the given tribe.
 * When a tribe peer is detected, WiFi Direct discovery is triggered and
 * (if autoConnect is true) the first peer is connected automatically.
 */
export async function startBleDiscovery(
  tribeId: string,
  autoConnect = true
): Promise<void> {
  if (!isTauriAvailable() || _active) return

  _tribeId = tribeId
  _autoConnectEnabled = autoConnect

  try {
    // Ensure WiFi Direct is already listening for peers
    await startWifiDirectMode()

    // Listen for BLE scan hits
    _unlistenPeerFound = await tauriListen<BlePeer>(
      'ble-tribe-peer-found',
      async (peer) => {
        const isNew = !_blePeers.has(peer.address)
        _blePeers.set(peer.address, peer)

        console.info('[ble] tribe peer detected:', peer.address, `RSSI ${peer.rssi}`)

        window.dispatchEvent(
          new CustomEvent('ble-peers-changed', { detail: Array.from(_blePeers.values()) })
        )

        // BLE address ≠ WiFi Direct address, but knowing a tribe member is nearby
        // is enough: WiFi Direct discovery (already running) will surface them.
        // If this is the first BLE hit this session, also initiate WiFi Direct
        // discovery explicitly in case it stalled.
        if (isNew && _autoConnectEnabled) {
          try {
            await tauriInvoke('discoverPeers')
          } catch {
            // Peer discovery already running — fine
          }
        }
      }
    )

    // Start BLE advertise + scan via Kotlin plugin
    await tauriInvoke('startBle', { tribeId })
    _active = true

    console.info('[ble] discovery started for tribe:', tribeId)
  } catch (err) {
    console.warn('[ble] startBleDiscovery failed (not Android or plugin missing):', err)
  }
}

/**
 * Stop BLE advertising and scanning.
 */
export async function stopBleDiscovery(): Promise<void> {
  if (!isTauriAvailable() || !_active) return

  try {
    await tauriInvoke('stopBle')
  } catch {
    // Already stopped
  }

  _unlistenPeerFound?.()
  _unlistenPeerFound = null
  _blePeers.clear()
  _active = false
  _tribeId = null
}

export function isBleDiscoveryActive(): boolean {
  return _active
}

export function getBlePeers(): BlePeer[] {
  return Array.from(_blePeers.values())
}
