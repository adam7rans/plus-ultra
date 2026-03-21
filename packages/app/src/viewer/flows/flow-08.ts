import type { Flow } from '../types'

export const flow: Flow = {
  id: 8,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Update Member Profile',
  summary:
    'Members can edit their display name, photo, bio, member type, availability, and physical limitations at any time.',
  steps: [
    {
      n: 1,
      screen: 'Member Profile Screen',
      route: '/tribe/{TRIBE}/member/{TRIBE}',
      desc: 'Avatar, name field (inline edit), member type selector, bio textarea, availability selector, physical limitations input, Save button.',
      action: 'Edit a field, tap Save.',
      note: "The second {TRIBE} in the route is a placeholder — the actual route uses the member's pubkey. Set Tribe ID and open the dashboard to navigate to your profile from there.",
    },
  ],
}
