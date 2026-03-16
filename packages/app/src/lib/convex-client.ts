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
