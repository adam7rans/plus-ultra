function getRelayUrl(): string {
  const gunRelay = import.meta.env.VITE_GUN_RELAY ?? 'http://localhost:8765/gun'
  return gunRelay.replace(/\/gun\/?$/, '')
}

/** Probe Gun's WebSocket endpoint. Returns true if a connection opens within 3s. */
function pingWS(baseUrl: string): Promise<boolean> {
  return new Promise(resolve => {
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/gun'
    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch {
      return resolve(false)
    }
    const timer = setTimeout(() => { ws.close(); resolve(false) }, 3000)
    ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(true) }
    ws.onerror = () => { clearTimeout(timer); resolve(false) }
  })
}

/** Ping the relay. Returns true only if both HTTP and WebSocket endpoints are reachable.
 *  HTTP fast-fails; WS verifies Gun's actual sync transport.
 */
export async function pingRelay(): Promise<boolean> {
  const relayUrl = getRelayUrl()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${relayUrl}/push/vapid-public-key`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    })
    // 200 (VAPID configured) or 503 (not configured) both mean relay is reachable
    if (res.status !== 200 && res.status !== 503) return false
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
  return pingWS(relayUrl)
}
