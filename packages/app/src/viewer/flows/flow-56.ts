import type { Flow } from '../types'

export const flow: Flow = {
  id: 56,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'WiFi Direct Phone-to-Phone',
  summary: 'On Android (Tauri), enable WiFi Direct for device-to-device sync without a router or internet connection.',
  steps: [
    {
      n: 1,
      screen: 'WiFi Direct',
      route: '/tribe/{TRIBE}',
      manual: true,
      manualDesc: 'Requires Android Tauri build with WiFi Direct plugin. Two Android devices needed. Enable WiFi Direct in the mesh settings panel. One device acts as group owner; the other connects. Tribe data syncs over the direct WiFi link without internet.',
      desc: 'WiFi Direct panel. Group Owner / Client mode toggle. Connected device list. Sync status.',
      action: 'Enable WiFi Direct on both Android devices. One selects Group Owner. Other connects.',
    },
  ],
}
