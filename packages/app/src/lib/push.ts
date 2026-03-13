// PWA Push Notification client — grid-up only, degrades gracefully

function getRelayUrl(): string {
  const gunRelay = import.meta.env.VITE_GUN_RELAY ?? 'http://localhost:8765/gun'
  // Strip /gun path to get base URL
  return gunRelay.replace(/\/gun\/?$/, '')
}

/** Check if push notifications are supported and available */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

/** Get the VAPID public key from the relay server */
async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch(`${getRelayUrl()}/push/vapid-public-key`)
    if (!res.ok) return null
    const { publicKey } = await res.json()
    return publicKey ?? null
  } catch {
    return null
  }
}

/** Convert VAPID key from base64 URL-safe to Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/** Subscribe to push notifications. Returns true on success. */
export async function subscribeToPush(
  tribeId: string,
  memberPub: string,
): Promise<boolean> {
  if (!pushSupported()) return false

  try {
    // Request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    // Get VAPID key
    const vapidKey = await fetchVapidKey()
    if (!vapidKey) {
      console.warn('[push] Could not fetch VAPID key from relay — push unavailable')
      return false
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })

    // Send subscription to relay
    const res = await fetch(`${getRelayUrl()}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tribeId, memberPub, subscription: subscription.toJSON() }),
    })

    return res.ok
  } catch (err) {
    console.warn('[push] Failed to subscribe:', err)
    return false
  }
}

/** Unsubscribe from push notifications */
export async function unsubscribeFromPush(
  tribeId: string,
  memberPub: string,
): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) await subscription.unsubscribe()

    await fetch(`${getRelayUrl()}/push/subscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tribeId, memberPub }),
    })
  } catch {
    // Silently fail — grid-down or relay unavailable
  }
}

/** Check if currently subscribed */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

/** Send a push notification via the relay server */
export async function triggerPush(
  tribeId: string,
  targetPub: string, // specific pubkey or '*' for all tribe members
  title: string,
  body: string,
  data?: { url?: string; tag?: string },
): Promise<boolean> {
  try {
    const res = await fetch(`${getRelayUrl()}/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tribeId, targetPub, title, body, data }),
    })
    return res.ok
  } catch {
    return false
  }
}
