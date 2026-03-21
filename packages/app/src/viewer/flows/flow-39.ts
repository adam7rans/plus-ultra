import type { Flow } from '../types'

export const flow: Flow = {
  id: 39,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Initiate Roll Call / Muster',
  summary: "Tribe admin initiates a roll call to verify all members' status and location in an emergency or drill.",
  steps: [
    {
      n: '1a',
      screen: 'Roll Call — no active muster',
      route: '/tribe/{TRIBE}/rollcall',
      desc: 'Roll Call screen with no active muster. "Initiate Muster" button. History of past musters.',
      action: 'Observe the default state. Tap "Initiate Muster" to begin.',
    },
    {
      n: '1b',
      screen: 'Roll Call — active muster',
      route: '/tribe/{TRIBE}/rollcall',
      desc: 'Active muster with reason input and optional message. Member response status grid (acknowledged / pending / absent).',
      action: 'Tap "Initiate Muster". Enter reason. Send. Observe member status grid.',
      injectIDB: [
        {
          store: 'muster-calls',
          key: '{TRIBE}:muster001',
          data: {
            id: 'muster001',
            tribeId: '{TRIBE}',
            reason: 'Emergency drill — all members respond',
            initiatedBy: '{SELF_PUB}',
            initiatedAt: '{NOW}',
            status: 'active',
          },
        },
        {
          store: 'muster-responses',
          key: '{TRIBE}:muster001:{SELF_PUB}',
          data: {
            musterId: 'muster001',
            tribeId: '{TRIBE}',
            memberPub: '{SELF_PUB}',
            status: 'present',
            locationNote: 'Home base',
            respondedAt: '{NOW}',
          },
        },
        {
          store: 'muster-responses',
          key: '{TRIBE}:muster001:dummy_pub_2_sam_chen',
          data: {
            musterId: 'muster001',
            tribeId: '{TRIBE}',
            memberPub: 'dummy_pub_2_sam_chen',
            status: 'present',
            locationNote: 'En route to rally point',
            respondedAt: '{NOW}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:{SELF_PUB}',
          data: { pubkey: '{SELF_PUB}', tribeId: '{TRIBE}', displayName: 'Alex Rivera', memberType: 'adult', status: 'active', authorityRole: 'founder', availability: 'full_time', joinedAt: '{NOW-7d}' },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_2_sam_chen',
          data: { pubkey: 'dummy_pub_2_sam_chen', tribeId: '{TRIBE}', displayName: 'Sam Chen', memberType: 'adult', status: 'active', authorityRole: 'member', joinedAt: '{NOW-5d}' },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_3_jordan_blake',
          data: { pubkey: 'dummy_pub_3_jordan_blake', tribeId: '{TRIBE}', displayName: 'Jordan Blake', memberType: 'adult', status: 'active', authorityRole: 'lead', joinedAt: '{NOW-6d}' },
        },
      ],
    },
  ],
}
