import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToNotifications, markRead as markReadFn, markAllRead as markAllReadFn,
} from '../lib/notifications'
import type { Notification } from '../lib/notifications'

export function useNotifications(tribeId: string | null, memberPub: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!tribeId || !memberPub) return
    const unsub = subscribeToNotifications(tribeId, memberPub, setNotifications)
    return unsub
  }, [tribeId, memberPub])

  const unreadCount = notifications.filter(n => !n.read).length

  const markRead = useCallback(async (notificationId: string) => {
    if (!tribeId) return
    await markReadFn(tribeId, notificationId)
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n))
  }, [tribeId])

  const markAllRead = useCallback(async () => {
    if (!tribeId || !memberPub) return
    await markAllReadFn(tribeId, memberPub)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [tribeId, memberPub])

  return { notifications, unreadCount, markRead, markAllRead }
}
