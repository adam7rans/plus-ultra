import type { Flow } from '../types'

export const flow: Flow = {
  id: 25,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Create Schedule Event',
  summary:
    'Tribe admins and members create scheduled events — drills, meetings, foraging runs, watch rotations.',
  steps: [
    {
      n: 1,
      screen: 'Schedule Screen',
      route: '/tribe/{TRIBE}/schedule',
      desc: 'Calendar view (week/month toggle) with existing events. "New Event" button. Upcoming events list. Tap event to view details.',
      action: 'Tap "New Event". Fill in title, date/time, location, type. Save.',
      prefillForm: [
        {
          selector: 'input[placeholder*="title" i], input[name="title"]',
          value: 'Wednesday Training Drill',
        },
        {
          selector: 'input[placeholder*="location" i], input[name="location"]',
          value: 'Ridge Trail Head, Blue Ridge VA',
        },
      ],
    },
  ],
}
