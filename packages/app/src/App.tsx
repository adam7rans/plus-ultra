import { RouterProvider } from '@tanstack/react-router'
import { ConvexProvider } from 'convex/react'
import { router } from './router'
import { getConvexClient } from './lib/convex-client'

export default function App() {
  const convexClient = getConvexClient()

  // If Convex is configured (grid-up), wrap in ConvexProvider for real-time queries.
  // If not (grid-down / no CONVEX_URL), render without it — app falls back to Gun + IDB.
  if (convexClient) {
    return (
      <ConvexProvider client={convexClient}>
        <RouterProvider router={router} />
      </ConvexProvider>
    )
  }

  return <RouterProvider router={router} />
}
