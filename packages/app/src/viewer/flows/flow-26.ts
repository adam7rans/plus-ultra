import type { Flow } from '../types'

export const flow: Flow = {
  id: 26,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Assign Members to Events',
  summary:
    'After creating an event, assign specific tribe members as required attendees or role-based participants.',
  steps: [
    {
      n: 1,
      screen: 'Schedule Screen — New Event',
      route: '/tribe/{TRIBE}/schedule',
      desc: 'Event creation form with "Assign Members" section — multi-select member chips, role assignment, required vs optional toggle.',
      action: 'Tap "New Event", fill details, expand "Assign Members", select members, save.',
      note: 'Tap "New Event" to open the event creation form which includes the member assignment section.',
      injectIDB: [
        {
          store: 'members',
          key: '{TRIBE}:{SELF_PUB}',
          data: {
            pubkey: '{SELF_PUB}',
            tribeId: '{TRIBE}',
            displayName: 'Alex Rivera',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'founder',
            availability: 'full_time',
            joinedAt: '{NOW-7d}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_2_sam_chen',
          data: {
            pubkey: 'dummy_pub_2_sam_chen',
            tribeId: '{TRIBE}',
            displayName: 'Sam Chen',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'member',
            joinedAt: '{NOW-5d}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_3_jordan_blake',
          data: {
            pubkey: 'dummy_pub_3_jordan_blake',
            tribeId: '{TRIBE}',
            displayName: 'Jordan Blake',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'lead',
            joinedAt: '{NOW-6d}',
          },
        },
      ],
    },
  ],
}
