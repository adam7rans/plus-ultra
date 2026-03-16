import { useEffect, useState, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import {
  subscribeToNotifications, markRead as markReadFn, markAllRead as markAllReadFn,
} from '../lib/notifications'
import { useIsGridUp } from './useIsGridUp'
import type { Notification } from '../lib/notifications'

export function useNotifications(tribeId: string | null, memberPub: string | null) {
  const gridUp = useIsGridUp()

  // Convex path (grid-up): handles direct + broadcast ('*') notifications in the query
  const convexData = useQuery(
    api.notifications.listByTribeAndTarget,
    gridUp && tribeId && memberPub ? { tribeId, targetPub: memberPub } : 'skip'
  )

  // Gun path (grid-down): existing subscription
  const [gunData, setGunData] = useState<Notification[]>([])
  useEffect(() => {
    if (gridUp || !tribeId || !memberPub) return
    const unsub = subscribeToNotifications(tribeId, memberPub, setGunData)
    return unsub
  }, [tribeId, memberPub, gridUp])

  const notifications = gridUp ? (convexData ?? []) as unknown as Notification[] : gunData
  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = useCallback(async (notificationId: string) => {
    if (!tribeId) return
    await markReadFn(tribeId, notificationId)
    if (!gridUp) {
      setGunData(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
    }
  }, [tribeId, gridUp])

  const markAllRead = useCallback(async () => {
    if (!tribeId || !memberPub) return
    await markAllReadFn(tribeId, memberPub)
    if (!gridUp) {
      setGunData(prev => prev.map(n => ({ ...n, read: true })))
    }
  }, [tribeId, memberPub, gridUp])

  return { notifications, unreadCount, markRead, markAllRead }
}
