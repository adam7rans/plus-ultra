function getRelayUrl(): string {
  const gunRelay = import.meta.env.VITE_GUN_RELAY ?? 'http://localhost:8765/gun'
  return gunRelay.replace(/\/gun\/?$/, '')
}

/** Ping the relay. Returns true if reachable within 5s. */
export async function pingRelay(): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${getRelayUrl()}/health`, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}
