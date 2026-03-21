import type { Flow } from '../types'

export const flow: Flow = {
  id: 55,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'Mesh mDNS Discovery',
  summary: 'On Tauri desktop, the app broadcasts and discovers peers on the local network via mDNS. Discovered peers appear in the mesh panel.',
  steps: [
    {
      n: 1,
      screen: 'mDNS Discovery',
      route: '/tribe/{TRIBE}',
      manual: true,
      manualDesc: 'Requires Tauri desktop build. Run the app via "cargo tauri dev" or the compiled binary. The mDNS service starts automatically. Peers on the same LAN are discovered within 30 seconds. The mesh panel on the dashboard shows discovered peers with IP and last-seen time.',
      desc: 'Mesh panel on dashboard. Discovered LAN peers list. mDNS service status indicator.',
      action: 'Run two Tauri desktop instances on the same network. Observe peer discovery in mesh panel.',
    },
  ],
}
