import type { Flow } from '../types'

export const flow: Flow = {
  id: 7,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Navigate the Tribe Dashboard',
  summary:
    'The central hub of tribe life. Shows survivability score, upcoming events, resources, member roster, alerts, and navigation to all tribe features.',
  steps: [
    {
      n: '1a',
      screen: 'Tribe Dashboard — empty',
      route: '/tribe/{TRIBE}',
      desc: 'Empty dashboard state. No members yet seeded, score shows 0. Campfire illustration. "Invite Members" CTA.',
      action: 'Observe the empty dashboard state.',
    },
    {
      n: '1b',
      screen: 'Tribe Dashboard — populated',
      route: '/tribe/{TRIBE}',
      desc: 'Survivability score card (0-100 + ring), Now & Up Next events, Resource Readiness bar, Critical Gaps panel, Members section, Tribe Channel card, Proposals badge, Federation card.',
      action:
        'Explore the dashboard cards. Tap the survivability score to expand the 6-bucket breakdown.',
      injectIDB: [
        {
          store: 'my-tribes',
          key: '{TRIBE}',
          data: {
            id: '{TRIBE}',
            name: 'Mountain Watch',
            location: 'Blue Ridge, VA',
            region: 'appalachia',
            joinedAt: '{NOW}',
            founderId: '{SELF_PUB}',
            governanceModel: 'council',
          },
        },
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
            availability: 'part_time',
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
            availability: 'on_call',
            joinedAt: '{NOW-6d}',
          },
        },
        {
          store: 'inventory',
          key: '{TRIBE}:food_reserve',
          data: {
            tribeId: '{TRIBE}',
            asset: 'food_reserve',
            quantity: 45,
            unit: 'days',
            updatedAt: '{NOW}',
          },
        },
        {
          store: 'inventory',
          key: '{TRIBE}:water_reserve',
          data: {
            tribeId: '{TRIBE}',
            asset: 'water_reserve',
            quantity: 30,
            unit: 'days',
            updatedAt: '{NOW}',
          },
        },
        {
          store: 'proposals',
          key: '{TRIBE}:prop001',
          data: {
            id: 'prop001',
            tribeId: '{TRIBE}',
            title: 'Purchase 3-month food reserve',
            status: 'open',
            authorPub: '{SELF_PUB}',
            createdAt: '{NOW-2d}',
            deadline: '{NOW+5d}',
          },
        },
      ],
    },
  ],
}
