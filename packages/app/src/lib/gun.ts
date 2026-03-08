import Gun from 'gun'
import 'gun/sea'
import 'gun/lib/radix'
import 'gun/lib/radisk'
import 'gun/lib/store'
import 'gun/lib/rindexed'

const relayUrl = import.meta.env.VITE_GUN_RELAY ?? 'http://localhost:8765/gun'

export const gun = Gun({
  peers: [relayUrl],
  localStorage: false,  // use IndexedDB via gun/lib/rindexed instead
  radisk: true,
})

export { Gun }
export type { IGunInstance } from 'gun'
