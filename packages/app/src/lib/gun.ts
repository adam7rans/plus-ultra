// Re-export from gun-init, which creates the Gun instance and sets window.GUN.
// gun/sea is NOT imported here — identity.ts, tribes.ts, and messaging.ts import it
// directly. By the time those modules load, main.tsx has already run gun-init.ts first,
// so window.GUN is set and gun/sea bootstraps correctly.
export { gun, Gun } from './gun-init'
export type { IGunInstance } from 'gun'
