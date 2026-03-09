# Plus Ultra — Handoff Note
**Date:** 2026-03-09
**Session:** macOS Tauri validation spike — blank screen fixed, app rendering

---

## Status: App is rendering ✓

Both Tauri native window and Chrome at `localhost:5173` show:
- "PLUS ULTRA" header
- Identity ID generated (e.g. `6T4PYXFQ`)
- "Back up your identity" warning
- "MY TRIBES" empty state
- "+ Create New Tribe" button

---

## Root Cause of Blank Screen (fully resolved)

### The problem had two parts:

**Part 1 — Wrong value for `window.GUN`**

gun/sea.js (line ~808) bootstraps like this:
```js
Gun = SEA.window.GUN || { chain: {} }
User.prototype = (function(){ function F(){}; F.prototype = Gun.chain; return new F() }())
Gun.chain.user = function(pub){ ... }
```

It needs `Gun.chain`, which is `Gun.prototype` (set on the Gun constructor at line 256 of gun.js). The previous fix set `window.GUN = gun` (an instance). An instance's `.chain` is a *function* (the `gun.chain()` sub-graph method), not `Gun.prototype`. `User.prototype` and `Gun.chain.user` extension both broke silently.

**Correct value**: `window.GUN = Gun` (the Gun constructor class).

**Part 2 — ES module timing**

ES module static imports always execute before the importing module's body. So in gun.ts:
```ts
import Gun from 'gun'
import 'gun/sea'           // ← runs gun/sea.js NOW (window.GUN not set yet)

export const gun = Gun({}) // ← module body starts here — too late
;(window as any).GUN = gun // ← too late
```

Additionally, `identity.ts` (imported via IdentityContext → router.tsx) imports
`'gun/sea'` directly, and it comes earlier in the module graph than `gun.ts`
(which is only reached via messaging.ts → TribeChannelScreen → router.tsx).

### The Fix (committed as 851e69a)

Three file changes:

**`src/lib/gun-init.ts`** (new file — no gun/sea dependency):
```ts
import Gun from 'gun'
const relayUrl = import.meta.env.VITE_GUN_RELAY ?? 'http://localhost:8765/gun'
export const gun = Gun({ peers: [relayUrl], localStorage: false })
;(window as any).GUN = Gun  // ← Gun constructor, not instance
export { Gun }
```

**`src/lib/gun.ts`** (simplified — removed gun/sea side-effect):
```ts
export { gun, Gun } from './gun-init'
export type { IGunInstance } from 'gun'
```

**`src/main.tsx`** (gun-init as first import):
```ts
import './lib/gun-init'  // MUST be first — sets window.GUN before gun/sea bootstraps
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
```

Because `gun-init.ts` has only `gun.js` as a dependency (no gun/sea), and it's
declared before `App.tsx` in main.tsx, ES module evaluation order guarantees it
runs before any `import 'gun/sea'` or `import SEA from 'gun/sea'` anywhere in
the app's subtree.

---

## What Was Done This Session

### Bugs fixed (all committed)
| File | Change |
|------|--------|
| `src/lib/gun.ts` | Removed `gun/lib/radix`, `radisk`, `store`, `rindexed` (CJS-only, break Vite ESM). |
| `src/lib/gun-init.ts` | New file. Creates Gun instance, sets `window.GUN = Gun` (constructor). |
| `src/lib/gun.ts` | Re-exports from gun-init, removes gun/sea side-effect. |
| `src/main.tsx` | Imports gun-init first to guarantee window.GUN is set before gun/sea. |
| `vite.config.ts` | Removed vite-plugin-pwa (broke build). Added `global → globalThis` esbuild shim. |
| `src/styles/index.css` | Fixed `hover:text-forest-200` → `forest-300` (palette stops at 300). |
| `src-tauri/tauri.conf.json` | Correct identifier, mobile dimensions, CSP for dev + production. |
| `src-tauri/entitlements.plist` | macOS mic + camera entitlements. |
| `src/screens/DiagnosticsScreen.tsx` | New screen at `/diagnostics` showing MediaRecorder/IDB/WebCrypto status. |

### Build status
- `npm run build` (Vite + tsc): **PASSES**
- `cargo check`: **PASSES**
- `tauri build`: **PASSES** — produces `PrepNet.app` + `PrepNet_0.1.0_aarch64.dmg`
- `tauri dev` (runtime): **PASSES** — app renders, identity generated ✓

---

## Spike Tests (Next Steps)

### Test 1 — Gun.js P2P sync
- Open app via `tauri dev` (Device A) + browser tab at `http://localhost:5173` (Device B)
- Create tribe on A, join on B via invite link
- Send messages both directions — verify real-time sync
- Kill and reopen app — verify tribe data persists

### Test 2 — IndexedDB persistence
- Note the public key shown in the app
- Fully quit (Cmd+Q), reopen with `tauri dev`
- Same public key must appear — confirms IDB survives restart

### Test 3 — MediaRecorder (voice messages)
- Navigate to tribe channel in the Tauri window
- Hit the mic button, record a voice message, send it
- Navigate to `/diagnostics` to see which MIME types are supported
- Expected: `audio/webm;codecs=opus` supported on macOS WKWebView

### After spike tests: fill out findings report
Template is in the advisor's macOS validation spec.

---

## Next Sprint Scope (after findings reviewed)
- Android setup: install Android Studio, set `ANDROID_HOME`, run `tauri android init`
- Add Android permissions: microphone, camera, internet in `AndroidManifest.xml`
- iOS `NSMicrophoneUsageDescription`: not injectable via Tauri 2.0-rc config — needs post-build script
- Remove `vite-plugin-pwa` from `package.json` devDependencies (still listed, removed from vite.config.ts)
- Deep link handling for invite URLs (`prepper://join?tribe=...`)

---

## Key Files
| Path | Purpose |
|------|---------|
| `packages/app/src/lib/gun-init.ts` | Creates Gun instance + sets window.GUN — MUST be imported first |
| `packages/app/src/main.tsx` | Entry point — imports gun-init first |
| `packages/app/src/lib/identity.ts` | Uses `SEA.pair()` — now works because window.GUN is set before SEA bootstraps |
| `packages/app/src-tauri/tauri.conf.json` | Tauri config — CSP, identifier, entitlements |
| `packages/app/src-tauri/entitlements.plist` | macOS mic/camera permissions |
| `packages/app/src/screens/DiagnosticsScreen.tsx` | Validation tool at `/diagnostics` |
| `packages/app/src-tauri/target/release/bundle/macos/PrepNet.app` | Built macOS app |
| `packages/app/src-tauri/target/release/bundle/dmg/PrepNet_0.1.0_aarch64.dmg` | Built macOS installer |
