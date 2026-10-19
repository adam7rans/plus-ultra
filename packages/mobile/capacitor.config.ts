import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Plus Ultra — Capacitor native shell.
 *
 * Wraps `packages/app/dist` (the standard Vite web build). The web/PWA and
 * Tauri desktop builds are unaffected by anything in this directory.
 *
 * Flow:
 *   1. `npx vite build` in packages/app  (produces ../app/dist)
 *   2. `npm run sync` here               (copies dist into ios/ + android/)
 *   3. `npm run open:ios|open:android`    (opens Xcode / Android Studio)
 */
const config: CapacitorConfig = {
  appId: 'network.prepper.app',
  appName: 'Plus Ultra',
  webDir: '../app/dist',
  android: {
    // https scheme required for modern WebView APIs (crypto, geolocation).
    scheme: 'https',
  },
  ios: {
    // Honor the notch / Dynamic Island; app CSS already uses viewport-fit=cover
    // + safe-area insets (see index.html).
    contentInset: 'always',
  },
}

export default config
