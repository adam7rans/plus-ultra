/**
 * platform/index.ts — public surface of the Phase 1 platform layer.
 *
 * Screens, hooks, and components import native-touching APIs from
 * `@/lib/platform` (or `../lib/platform/*`) instead of `navigator.*`,
 * `window.__TAURI__`, or lib internals directly. Web behavior is unchanged;
 * native (Capacitor, Phase 2+) and desktop (Tauri) branches live behind
 * these modules.
 */
export * from './types'
export * from './storage'
export * from './identity'
export * from './push'
export * from './notify'
export * from './ble'
export * from './media'
export * from './scan'
export * from './geo'
export * from './share'
export * from './mesh'
