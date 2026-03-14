import { nanoid } from 'nanoid'
import { gun } from './gun'
import { getDB } from './db'
import { triggerPush } from './push'

// ── Notification types ──────────────────────────────────────────────

export type NotificationType =
  | 'event_starting'
  | 'event_assigned'
  | 'alert_broadcast'
  | 'role_change'
  | 'new_member'
  | 'vouch_received'
  | 'resource_warning'
  | 'resource_critical'
  | 'federated_alert'
  | 'trade_proposal'
  | 'trade_response'
  | 'trade_fulfilled'
  | 'federation_contact'

export interface Notification {
  id: string
  tribeId: string
  type: NotificationType
  title: string
  body: string
  createdAt: number
  /** pubkey of the member this notification is relevant to (or '*' for all) */
  targetPub: string
  /** pubkey of the member who triggered it */
  actorPub?: string
  /** optional navigation context */
  linkTo?: string
  read: boolean
}

// ── Alert types ─────────────────────────────────────────────────────

export type AlertType = 'emergency' | 'perimeter_breach' | 'medical' | 'rally_point' | 'all_clear'

export const ALERT_META: Record<AlertType, { label: string; icon: string; color: string }> = {
  emergency:       { label: 'Emergency',       icon: '🚨', color: 'bg-red-700' },
  perimeter_breach:{ label: 'Perimeter Breach', icon: '🔴', color: 'bg-red-800' },
  medical:         { label: 'Medical',          icon: '🏥', color: 'bg-red-600' },
  rally_point:     { label: 'Rally Point',      icon: '📍', color: 'bg-orange-700' },
  all_clear:       { label: 'All Clear',        icon: '✅', color: 'bg-green-700' },
}

export interface TribeAlert {
  id: string
  tribeId: string
  alertType: AlertType
  message: string
  senderPub: string
  senderName: string
  createdAt: number
  dismissed?: boolean
}

// ── Write notification ──────────────────────────────────────────────

export async function notify(
  tribeId: string,
  notification: Omit<Notification, 'id' | 'createdAt' | 'read'>
): Promise<void> {
  const entry: Notification = {
    ...notification,
    id: nanoid(),
    createdAt: Date.now(),
    read: false,
  }

  const db = await getDB()
  await db.put('notifications', entry, `${tribeId}:${entry.id}`)

  gun
    .get('tribes')
    .get(tribeId)
    .get('notifications')
    .get(entry.id)
    .put(entry as unknown as Record<string, unknown>)
}

// ── Mark read ───────────────────────────────────────────────────────

export async function markRead(tribeId: string, notificationId: string): Promise<void> {
  const db = await getDB()
  const key = `${tribeId}:${notificationId}`
  const existing = (await db.get('notifications', key)) as Notification | undefined
  if (!existing) return

  const updated = { ...existing, read: true }
  await db.put('notifications', updated, key)
}

export async function markAllRead(tribeId: string, memberPub: string): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('notifications')
  for (const raw of all) {
    const n = raw as Notification
    if (n.tribeId === tribeId && !n.read && (n.targetPub === memberPub || n.targetPub === '*')) {
      await db.put('notifications', { ...n, read: true }, `${tribeId}:${n.id}`)
    }
  }
}

// ── Subscribe ───────────────────────────────────────────────────────

export function subscribeToNotifications(
  tribeId: string,
  memberPub: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const notifMap = new Map<string, Notification>()

  // Seed from IDB
  getDB().then(db => db.getAll('notifications')).then(all => {
    for (const raw of all) {
      const n = raw as Notification
      if (n.tribeId === tribeId && n.id && (n.targetPub === memberPub || n.targetPub === '*')) {
        notifMap.set(n.id, n)
      }
    }
    if (notifMap.size > 0) callback(sorted(notifMap))
  })

  const ref = gun.get('tribes').get(tribeId).get('notifications')

  function handleNotif(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') {
      notifMap.delete(key)
    } else {
      const d = data as Record<string, unknown>
      if (d.id && d.type && d.title) {
        const n: Notification = {
          id: d.id as string,
          tribeId: (d.tribeId as string) ?? tribeId,
          type: d.type as NotificationType,
          title: d.title as string,
          body: (d.body as string) ?? '',
          createdAt: (d.createdAt as number) ?? 0,
          targetPub: (d.targetPub as string) ?? '*',
          actorPub: d.actorPub as string | undefined,
          linkTo: d.linkTo as string | undefined,
          read: false, // Gun-received are unread locally until user reads them
        }
        // Only include notifications relevant to this member
        if (n.targetPub === memberPub || n.targetPub === '*') {
          // Preserve local read state
          const existing = notifMap.get(n.id)
          if (existing?.read) n.read = true
          notifMap.set(n.id, n)
          getDB().then(db => db.put('notifications', n, `${tribeId}:${n.id}`))
        }
      }
    }
    callback(sorted(notifMap))
  }

  ref.map().once(handleNotif)
  ref.map().on(handleNotif)

  return () => { ref.map().off() }
}

function sorted(map: Map<string, Notification>): Notification[] {
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt)
}

// ── Alerts ──────────────────────────────────────────────────────────

export async function sendAlert(
  tribeId: string,
  alertType: AlertType,
  message: string,
  senderPub: string,
  senderName: string
): Promise<TribeAlert> {
  const alert: TribeAlert = {
    id: nanoid(),
    tribeId,
    alertType,
    message,
    senderPub,
    senderName,
    createdAt: Date.now(),
  }

  const db = await getDB()
  await db.put('alerts', alert, `${tribeId}:${alert.id}`)

  gun
    .get('tribes')
    .get(tribeId)
    .get('alerts')
    .get(alert.id)
    .put(alert as unknown as Record<string, unknown>)

  // Also create a notification for all members
  const alertTitle = `${ALERT_META[alertType].icon} ${ALERT_META[alertType].label}`
  const alertBody = message || `Alert from ${senderName}`
  await notify(tribeId, {
    tribeId,
    type: 'alert_broadcast',
    title: alertTitle,
    body: alertBody,
    targetPub: '*',
    actorPub: senderPub,
  })

  // Fire PWA push notification (grid-up only, fire and forget)
  void triggerPush(tribeId, '*', alertTitle, alertBody, { tag: `alert-${alert.id}` })

  return alert
}

export function subscribeToAlerts(
  tribeId: string,
  callback: (alert: TribeAlert) => void
): () => void {
  const seen = new Set<string>()

  // Don't seed old alerts from IDB — only live ones matter for the overlay

  const ref = gun.get('tribes').get(tribeId).get('alerts')

  function handleAlert(data: unknown, key: string) {
    if (key === '_') return
    if (!data || typeof data !== 'object') return
    const d = data as Record<string, unknown>
    if (!d.id || !d.alertType) return
    if (seen.has(key)) return
    seen.add(key)

    const alert: TribeAlert = {
      id: d.id as string,
      tribeId: (d.tribeId as string) ?? tribeId,
      alertType: d.alertType as AlertType,
      message: (d.message as string) ?? '',
      senderPub: (d.senderPub as string) ?? '',
      senderName: (d.senderName as string) ?? '',
      createdAt: (d.createdAt as number) ?? 0,
    }

    // Only show alerts from the last 5 minutes (ignore stale ones on initial load)
    if (Date.now() - alert.createdAt < 5 * 60 * 1000) {
      callback(alert)
    }
  }

  ref.map().on(handleAlert)

  return () => { ref.map().off() }
}
