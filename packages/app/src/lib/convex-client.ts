import { ConvexReactClient } from 'convex/react'

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined

let _client: ConvexReactClient | null = null

export function getConvexClient(): ConvexReactClient | null {
  if (!CONVEX_URL) return null
  if (!_client) {
    _client = new ConvexReactClient(CONVEX_URL)
  }
  return _client
}

export function getConvexUrl(): string | undefined {
  return CONVEX_URL
}

let _dummy: ConvexReactClient | null = null

/**
 * Placeholder client for grid-down mode (no CONVEX_URL configured).
 *
 * All dual-mode hooks call convex `useQuery` unconditionally — `useQuery`
 * throws without an ancestor ConvexProvider, even for skipped queries.
 * Wrapping the app in this dummy keeps every hook mounted; because
 * `useIsGridUp()` is false without a real URL, every query passes 'skip',
 * so the dummy never opens a socket. The Gun + IndexedDB path serves data.
 */
export function getDummyConvexClient(): ConvexReactClient {
  if (!_dummy) {
    _dummy = new ConvexReactClient('http://127.0.0.1:1')
  }
  return _dummy
}
