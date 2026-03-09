import Gun from 'gun'

// This module MUST be imported before any module that imports 'gun/sea'.
// gun/sea.js checks SEA.window.GUN at module evaluation time (line ~808):
//   Gun = SEA.window.GUN || { chain: {} }
// If window.GUN is not set, SEA falls back to a dummy object and SEA.pair() silently fails.
//
// Because ES module imports are evaluated before the importing module's body,
// we cannot set window.GUN inside gun.ts after importing gun/sea there.
// Instead this file sets window.GUN as its own module body (no gun/sea dependency),
// and main.tsx imports it FIRST so it runs before any gun/sea import in the app.

const relayUrl = import.meta.env.VITE_GUN_RELAY ?? 'http://localhost:8765/gun'

export const gun = Gun({
  peers: [relayUrl],
  localStorage: false,
})

// Set window.GUN to the Gun constructor so gun/sea can find and extend it.
;(window as any).GUN = Gun

export { Gun }
