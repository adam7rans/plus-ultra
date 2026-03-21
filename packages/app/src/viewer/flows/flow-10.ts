import type { Flow } from '../types'

export const flow: Flow = {
  id: 10,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'View My Station',
  summary:
    "Shows the member's assigned station, responsibilities, domain coverage, and contribution to the tribe survivability score.",
  steps: [
    {
      n: 1,
      screen: 'My Station Screen',
      route: '/tribe/{TRIBE}/station',
      desc: 'Station assignment card, role responsibilities, domain coverage percentage, contribution to tribe survivability. Links to update skills.',
      action: 'Review station assignment and tap "Update Skills" if changes needed.',
    },
  ],
}
