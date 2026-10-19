import { RouterProvider } from '@tanstack/react-router'
import { ConvexProvider } from 'convex/react'
import { router } from './router'
import { getConvexClient, getDummyConvexClient } from './lib/convex-client'

export default function App() {
  // Always render inside a ConvexProvider: dual-mode hooks call `useQuery`
  // unconditionally, which throws without one — even for skipped queries.
  // Grid-down (no CONVEX_URL) uses a dummy client; every query skips and the
  // Gun + IndexedDB path serves data. Grid-up uses the real client.
  const convexClient = getConvexClient() ?? getDummyConvexClient()

  return (
    <ConvexProvider client={convexClient}>
      <RouterProvider router={router} />
    </ConvexProvider>
  )
}
