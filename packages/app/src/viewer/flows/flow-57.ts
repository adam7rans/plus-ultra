import type { Flow } from '../types'

export const flow: Flow = {
  id: 57,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'BLE Peer Discovery',
  summary: 'On Tauri mobile (iOS/Android), use Bluetooth Low Energy to discover nearby tribe members and exchange minimal sync packets.',
  steps: [
    {
      n: 1,
      screen: 'BLE Discovery',
      route: '/tribe/{TRIBE}',
      manual: true,
      manualDesc: 'Requires Tauri mobile build with BLE plugin on iOS or Android. Two devices needed within BLE range (typically 10-30m). BLE discovery advertises tribe membership tokens. Discovered peers appear in the mesh panel with signal strength (RSSI).',
      desc: 'BLE panel. Scan button. Discovered peers with RSSI signal strength. Mini sync transfer.',
      action: 'Enable BLE scan on both devices. Bring within 20m. Observe peer discovery and mini-sync.',
    },
  ],
}
