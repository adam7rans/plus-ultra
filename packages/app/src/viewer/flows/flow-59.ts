import type { Flow } from '../types'

export const flow: Flow = {
  id: 59,
  section: 'Technical',
  mode: 'Both',
  title: 'Diagnostics',
  summary: 'Technical diagnostics screen showing IndexedDB status, Gun relay connection, Convex sync state, identity details, and version info.',
  steps: [
    {
      n: 1,
      screen: 'Diagnostics Screen',
      route: '/diagnostics',
      desc: 'IndexedDB: tribe count, message count, skill count. Gun relay: connection status + latency. Convex: sync status + last sync time. Identity: public key, backed up flag. App version. "Reset All Data" danger button.',
      action: 'Review diagnostics. Note connection statuses and sync states.',
    },
  ],
}
