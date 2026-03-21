import type { Flow } from '../types'

export const flow: Flow = {
  id: 46,
  section: 'Federation',
  mode: 'Both',
  title: 'Generate Federation Contact Card',
  summary:
    'Generate a shareable federation contact card (QR + link) for your tribe so allied tribes can connect.',
  steps: [
    {
      n: '1a',
      screen: 'Federation Screen — empty',
      route: '/tribe/{TRIBE}/federation',
      desc: 'Federation panel with no allies. "Generate Contact Card" button. "No allied tribes yet" empty state.',
      action: 'Observe the empty federation state.',
    },
    {
      n: '1b',
      screen: 'Federation Screen — with ally',
      route: '/tribe/{TRIBE}/federation',
      desc: 'Federation panel. "Generate Contact Card" button. QR code with tribe name, location, public key, relay address. Share link. List of existing allied tribes.',
      action: 'Tap "Generate Contact Card". Share the QR or link with an allied tribe.',
      injectIDB: [
        {
          store: 'federation-relationships',
          key: '{TRIBE}:fed001',
          data: {
            id: 'fed001',
            localTribeId: '{TRIBE}',
            alliedTribeName: 'Cedar Valley Collective',
            alliedTribeLocation: 'Shenandoah Valley, VA',
            alliedTribeRegion: 'appalachia',
            status: 'active',
            connectedAt: '{NOW-14d}',
            lastSyncAt: '{NOW-1d}',
          },
        },
      ],
    },
  ],
}
