import type { Flow } from '../types'

export const flow: Flow = {
  id: 51,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'Manage Tribe Settings',
  summary: 'Configure tribe settings: invite permissions, admin roles, notification preferences, relay configuration.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Settings Screen',
      route: '/tribe/{TRIBE}/settings',
      desc: 'General settings (tribe name, location, region edit), Admin roster, Invite permissions (admin-only vs all members), Notification settings, Relay/sync config, Danger zone (delete tribe).',
      action: 'Review and update tribe settings. Tap Save Changes.',
    },
  ],
}
