import type { Flow } from '../types'

export const flow: Flow = {
  id: 9,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Declare Skills',
  summary:
    'Members update their skill declarations at any time from the dedicated Skills screen. Skills organized in 3 tiers and domains.',
  steps: [
    {
      n: 1,
      screen: 'Skills Declaration Screen',
      route: '/tribe/{TRIBE}/skills',
      desc: 'Roles grouped by Tier (Critical/Essential/Multipliers) and Domain. Tap to select/expand; proficiency picker (Basic/Intermediate/Expert/Verified Expert). Pending sync indicator. "Save Skills" fixed bar with count badge.',
      action: 'Select roles and set proficiencies. Tap "Save Skills".',
    },
  ],
}
