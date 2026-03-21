import type { Flow } from '../types'

export const flow: Flow = {
  id: 54,
  section: 'Grid Down Operations',
  mode: 'Grid Down',
  title: 'Offline Message Queue',
  summary: 'Messages sent while offline are queued locally and display a pending indicator. They sync when connectivity returns.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Channel — Offline Queue (1 hour offline)',
      route: '/tribe/{TRIBE}/channel',
      gridDown: true,
      gridDownKey: 'plusultra:offlineSince',
      gridDownValue: () => Date.now() - 60 * 60 * 1000,
      desc: 'Channel screen with offline indicator. Messages with "Queued" status badge (clock icon). "X messages pending sync" banner at top. Offline compose still works.',
      action: 'Inject 1-hour offline time. Type and send a message. Observe queued status badge.',
    },
  ],
}
