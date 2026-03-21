import type { Flow } from '../types'

export const flow: Flow = {
  id: 17,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Resource Readiness Dashboard',
  summary:
    'Tribe-wide view of all resource categories, days-of-supply calculations, gap analysis, and per-category progress bars.',
  steps: [
    {
      n: '1a',
      screen: 'Resource Readiness — empty',
      route: '/tribe/{TRIBE}/readiness',
      desc: 'Overall readiness score at 0. "Not enough data" message. Categories show empty bars.',
      action: 'Observe the empty readiness state.',
    },
    {
      n: '1b',
      screen: 'Resource Readiness — populated',
      route: '/tribe/{TRIBE}/readiness',
      desc: 'Overall readiness score + ring. Category breakdown (Food/Water/Medical/Tools) with progress bars and days-of-supply. Critical gaps highlighted in red. Recommendations.',
      action: 'Review resource categories. Tap a category to see per-item breakdown.',
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
          store: 'inventory',
          key: '{TRIBE}:food_reserve',
          data: {
            tribeId: '{TRIBE}',
            asset: 'food_reserve',
            quantity: 45,
            unit: 'days',
            category: 'food',
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
            category: 'water',
            updatedAt: '{NOW}',
          },
        },
        {
          store: 'inventory',
          key: '{TRIBE}:medical_supplies',
          data: {
            tribeId: '{TRIBE}',
            asset: 'medical_supplies',
            quantity: 90,
            unit: 'days',
            category: 'medical',
            updatedAt: '{NOW}',
          },
        },
        {
          store: 'inventory',
          key: '{TRIBE}:solar_panel_kit',
          data: {
            tribeId: '{TRIBE}',
            asset: 'solar_panel_kit',
            quantity: 2,
            unit: 'units',
            category: 'tools',
            updatedAt: '{NOW}',
          },
        },
      ],
    },
  ],
}
