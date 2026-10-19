/**
 * platform/init.ts — native shell bootstrap (Phases 3+5).
 *
 * NOTE: intentionally NOT re-exported from `platform/index.ts` — it imports
 * the app router, and index is imported by screens (import cycle otherwise).
 * Import directly: `import { initNative } from './lib/platform/init'`.
 *
 * Web: no-op. Safe to call unconditionally from main.tsx.
 *
 * - StatusBar: light-content style for the dark neutral theme.
 * - Keyboard: resize the WebView body so MessageInput stays visible.
 * - Back button (Android): step back in TanStack Router instead of exiting.
 * - Deep links: `plusultra://...` or universal-link URLs route in-app
 *   (invite `/join?...` and contact `/connect?...` links).
 */

import { isNative } from './types'
import { router } from '../../router'

let _initialized = false

function handleDeepLinkUrl(url: string): void {
  try {
    // Accept both `plusultra:///join?...` and `https://...` forms.
    const path = url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/, '')
    if (!path || path === '/') return
    if (path.startsWith('/join') || path.startsWith('/connect')) {
      router.history.push(path)
    }
  } catch {
    // malformed URL — ignore
  }
}

export async function initNative(): Promise<void> {
  if (_initialized || !isNative()) return
  _initialized = true

  // StatusBar — light text on the dark neutral theme.
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#111417' })
  } catch {
    // plugin unavailable — system defaults stand
  }

  // Keyboard — shrink the WebView so inputs aren't covered.
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
  } catch {
    // plugin unavailable — default resize behavior stands
  }

  // Android back button + deep links + local-notification taps.
  try {
    const { App: CapApp } = await import('@capacitor/app')
    await CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        router.history.back()
      } else {
        void CapApp.exitApp()
      }
    })
    await CapApp.addListener('appUrlOpen', ({ url }) => handleDeepLinkUrl(url))
  } catch {
    // plugin unavailable — no native chrome wiring
  }

  // Tapping a local notification deep-links into the relevant screen.
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.requestPermissions()
    await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const path = (event.notification.extra as { path?: string } | undefined)?.path
      if (path) router.history.push(path)
    })
  } catch {
    // plugin unavailable — alerts still show in-app
  }
}
