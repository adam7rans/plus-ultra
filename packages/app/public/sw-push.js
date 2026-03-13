// Push notification handler — imported by the generated service worker
// via workbox's importScripts option in vite.config.ts

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Plus Ultra', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    tag: payload.data?.tag || 'plus-ultra-notification',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Plus Ultra', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const url = data.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if one is open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (url !== '/') client.navigate(url)
          return
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url)
    })
  )
})
