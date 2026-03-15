import { useEffect, useRef, useState } from 'react'
import type { OfflineStage } from '@plus-ultra/core'
import { pingRelay } from '../lib/relay-ping'
import {
  getOfflineSince,
  setOfflineSince,
  clearOfflineSince,
  computeOfflineStage,
} from '../lib/offline-tracker'
import { flushQueue } from '../lib/messaging'
import { flushPendingSyncs } from '../lib/sync-queue'

const PING_INTERVAL_MS = 15 * 1000 // 15s

export function useOfflineStage(): {
  offlineStage: OfflineStage
  offlineSince: number | null
} {
  const [offlineSince, setOfflineSinceState] = useState<number | null>(() => getOfflineSince())
  const [offlineStage, setOfflineStage] = useState<OfflineStage>(() =>
    computeOfflineStage(getOfflineSince()),
  )
  const pingRunning = useRef(false)

  async function doPing() {
    if (pingRunning.current) return
    pingRunning.current = true
    try {
      const reachable = await pingRelay()
      if (reachable) {
        const wasOffline = getOfflineSince() !== null
        clearOfflineSince()
        setOfflineSinceState(null)
        setOfflineStage(0)
        if (wasOffline) {
          void flushQueue()
          void flushPendingSyncs()
        }
      } else {
        const current = getOfflineSince()
        if (current === null) {
          const now = Date.now()
          setOfflineSince(now)
          setOfflineSinceState(now)
          setOfflineStage(computeOfflineStage(now))
        } else {
          setOfflineStage(computeOfflineStage(current))
        }
      }
    } finally {
      pingRunning.current = false
    }
  }

  useEffect(() => {
    void doPing()
    const interval = setInterval(() => { void doPing() }, PING_INTERVAL_MS)

    const handleOnline = () => { void doPing() }
    const handleOffline = () => { void doPing() }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-compute stage once per minute so banners advance without requiring a ping
  useEffect(() => {
    const interval = setInterval(() => {
      setOfflineStage(computeOfflineStage(getOfflineSince()))
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { offlineStage, offlineSince }
}
