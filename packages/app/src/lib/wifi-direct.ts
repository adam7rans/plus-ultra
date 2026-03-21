/**
 * wifi-direct.ts — Phase 15B JS bridge for the WifiDirectPlugin Kotlin plugin.
 *
 * Only active on Android Tauri. No-op in browser/PWA/desktop contexts.
 * When a WiFi Direct connection forms, the group owner is already running the
 * Phase 15A embedded relay on port 8766. The non-group-owner connects Gun to
 * ws://<groupOwnerAddress>:8766/gun automatically.
 */

import { gun } from './gun-init'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WifiDirectPeer {
  address: string  // MAC address (WiFi Direct)
  name: string
  status: number
}

export interface WifiDirectConnectionInfo {
  groupOwnerAddress: string
  isGroupOwner: boolean
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const RELAY_PORT = 8766

let _active = false
let _connectedUrl: string | null = null
let _unlistenPeerFound: (() => void) | null = null
let _unlistenConnected: (() => void) | null = null
let _unlistenDisconnected: (() => void) | null = null

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
 * Start WiFi Direct peer discovery and wire discovered connections into Gun.
 *
 * When a device connects as non-group-owner, Gun automatically connects to
 * the group owner's relay at ws://<ip>:8766/gun.
 * When this device is the group owner, the Phase 15A relay is already listening
 * and the peer will connect to us.
 */
export async function startWifiDirectMode(): Promise<void> {
  if (!isTauriAvailable() || _active) return

  try {
    // Register event listeners before calling discoverPeers
    _unlistenPeerFound = await tauriListen<WifiDirectPeer>(
      'wifi-direct-peer-found',
      (peer) => {
        window.dispatchEvent(
          new CustomEvent('wifi-direct-peers-changed', { detail: { peer } })
        )
        console.info('[wifi-direct] peer found:', peer.address, peer.name)
      }
    )

    _unlistenConnected = await tauriListen<WifiDirectConnectionInfo>(
      'wifi-direct-connected',
      ({ groupOwnerAddress, isGroupOwner }) => {
        if (!isGroupOwner && groupOwnerAddress) {
          // Connect Gun to the group owner's embedded relay
          const url = `ws://${groupOwnerAddress}:${RELAY_PORT}/gun`
          if (_connectedUrl !== url) {
            _connectedUrl = url
            gun.opt({ peers: [url] } as any)
            console.info('[wifi-direct] connected — added Gun peer:', url)
          }
        } else {
          console.info('[wifi-direct] we are group owner — relay already listening')
        }
        _active = true
        window.dispatchEvent(new CustomEvent('wifi-direct-state-changed', {
          detail: { connected: true, isGroupOwner, groupOwnerAddress }
        }))
      }
    )

    _unlistenDisconnected = await tauriListen<void>(
      'wifi-direct-disconnected',
      () => {
        _connectedUrl = null
        _active = false
        window.dispatchEvent(new CustomEvent('wifi-direct-state-changed', {
          detail: { connected: false }
        }))
        console.info('[wifi-direct] disconnected')
      }
    )

    await tauriInvoke('discoverPeers')
    _active = true
  } catch (err) {
    console.warn('[wifi-direct] startWifiDirectMode failed (not Android or plugin missing):', err)
  }
}

/**
 * Attempt to connect to a specific WiFi Direct peer by MAC address.
 * Call this after receiving a wifi-direct-peer-found event.
 */
export async function connectToWifiDirectPeer(deviceAddress: string): Promise<void> {
  if (!isTauriAvailable()) return
  await tauriInvoke('connectToPeer', { deviceAddress })
}

/**
 * Disconnect from the current WiFi Direct group and clean up listeners.
 */
export async function stopWifiDirectMode(): Promise<void> {
  if (!isTauriAvailable()) return

  try {
    await tauriInvoke('disconnect')
  } catch {
    // Already disconnected
  }

  _unlistenPeerFound?.()
  _unlistenConnected?.()
  _unlistenDisconnected?.()
  _unlistenPeerFound = null
  _unlistenConnected = null
  _unlistenDisconnected = null
  _connectedUrl = null
  _active = false
}

export function isWifiDirectActive(): boolean {
  return _active
}

export function getWifiDirectPeerUrl(): string | null {
  return _connectedUrl
}
