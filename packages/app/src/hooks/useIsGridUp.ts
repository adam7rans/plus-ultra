import { useEffect, useState } from 'react'
import { getConvexClient } from '../lib/convex-client'
import { getOfflineSince } from '../lib/offline-tracker'

/**
 * Reactive version of isGridUp() from sync-adapter.
 * Returns true when Convex is configured, browser is online, and not in offline-since state.
 * Re-renders on online/offline events.
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
