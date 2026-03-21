import type { Flow } from '../types'

export const flow: Flow = {
  id: 41,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Report Infrastructure Status',
  summary:
    'Members check off the 11-item infrastructure status checklist (power, water, comms, food, shelter, etc.) from the tribe dashboard.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Dashboard — Infra Checklist',
      route: '/tribe/{TRIBE}',
      desc: '11-item infrastructure checklist card on the dashboard. Each item has a status toggle (OK / Issue / Unknown). Overall infra health score updates live.',
      action: 'Scroll to the Infra Checklist card. Toggle a few items. Observe health score update.',
      note: 'The Infra Checklist card appears on the tribe dashboard — scroll down to find it.',
    },
  ],
}
