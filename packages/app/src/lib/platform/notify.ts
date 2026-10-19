/**
 * platform/notify.ts — Phase 3 local-notification abstraction.
 *
 * Web: no-op (in-app AlertOverlay + Web Push cover it).
 * Native: `@capacitor/local-notifications` schedules a heads-up notification
 * so musters and tribe alerts surface even when the app is backgrounded —
 * critical for grid-down roll calls where FCM/APNs can't reach the device.
 */

import { isNative } from './types'

export interface LocalAlert {
  title: string
  body: string
  /** Deep-link path opened on tap (e.g. `/tribe/abc/rollcall`). */
  path?: string
}

/** Request notification permission on native. Web: always false. */
export async function requestLocalNotifyPermission(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const res = await LocalNotifications.requestPermissions()
    return res.display === 'granted'
  } catch {
    return false
  }
}

/** Fire an immediate local notification on native. Web: no-op. */
export async function fireLocalAlert(alert: LocalAlert): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        {
          title: alert.title,
          body: alert.body,
          id: Date.now() % 2147483647,
          schedule: { at: new Date(Date.now() + 500) },
          extra: alert.path ? { path: alert.path } : undefined,
        },
      ],
    })
  } catch {
    // notifications unavailable — in-app overlay still shows
  }
}
