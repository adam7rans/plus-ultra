/**
 * platform/push.ts — Phase 3 push abstraction.
 *
 * Web: existing Web Push implementation (`../push` — VAPID + service worker
 * + relay `/push/*`). Behavior unchanged.
 *
 * Native (Capacitor): FCM (Android) / APNs (iOS) via
 * `@capacitor/push-notifications`. `subscribeToNativePush()` requests
 * permission, registers, and POSTs the device token to the relay
 * (`/push/register-device`, alongside the Web Push subscriptions).
 * Actual FCM/APNs server-side fan-out requires Firebase/APNs credentials
 * on the relay — until then the relay logs and counts native targets in
 * `/push/send` responses as `nativeTargets` without delivering.
 */

export {
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  triggerPush,
} from '../push'

import { isNative } from './types'

function getRelayUrl(): string {
  const gunRelay =
    (import.meta.env.VITE_GUN_RELAY as string | undefined) ?? 'http://localhost:8765/gun'
  return gunRelay.replace(/\/gun\/?$/, '')
}

function pushAuthHeader(): HeadersInit {
  const secret = import.meta.env.VITE_RELAY_PUSH_SECRET as string | undefined
  return secret
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` }
    : { 'Content-Type': 'application/json' }
}

/** True when native FCM/APNs push can be used (native shell only). */
export function isNativePushAvailable(): boolean {
  return isNative()
}

let _nativeToken: string | null = null
let _listenersWired = false

async function wireListeners(): Promise<void> {
  if (_listenersWired) return
  _listenersWired = true
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push-native] registration failed:', err.error)
    })
    await PushNotifications.addListener('pushNotificationReceived', (n) => {
      console.info('[push-native] foreground notification:', n.title)
      window.dispatchEvent(
        new CustomEvent('native-push-received', { detail: { title: n.title, body: n.body } }),
      )
    })
  } catch {
    _listenersWired = false
  }
}

/**
 * Register for native push and report the device token to the relay.
 * Returns true when the token was accepted. Web: always false (use the
 * VAPID flow in `../push` instead).
 */
export async function subscribeToNativePush(
  tribeId: string,
  memberPub: string,
): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await wireListeners()

    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') return false

    const token: string = await new Promise((resolve, reject) => {
      void PushNotifications.addListener('registration', (t) => resolve(t.value)).then(
        (handle) => {
          setTimeout(() => {
            void handle.remove()
            reject(new Error('registration timeout'))
          }, 15000)
        },
      )
      void PushNotifications.register()
    })
    _nativeToken = token

    const platform = (window as unknown as { Capacitor?: { getPlatform?: () => string } })
      .Capacitor?.getPlatform?.() ?? 'unknown'
    const res = await fetch(`${getRelayUrl()}/push/register-device`, {
      method: 'POST',
      headers: pushAuthHeader(),
      body: JSON.stringify({ tribeId, memberPub, token, platform }),
    })
    return res.ok
  } catch (err) {
    console.warn('[push-native] subscribe failed:', err)
    return false
  }
}

/** Currently-registered native device token, if any. */
export function getNativePushToken(): string | null {
  return _nativeToken
}
