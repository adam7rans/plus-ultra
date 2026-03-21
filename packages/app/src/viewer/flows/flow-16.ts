import type { Flow } from '../types'

export const flow: Flow = {
  id: 16,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Log Production',
  summary:
    'Members log produced goods (harvested food, purified water, fabricated items), increasing inventory quantities.',
  steps: [
    {
      n: '1a',
      screen: 'Production Log — empty',
      route: '/tribe/{TRIBE}/production',
      desc: 'Empty production log. "Log Production" button. No history.',
      action: 'Observe the empty production log.',
    },
    {
      n: '1b',
      screen: 'Production Log — populated',
      route: '/tribe/{TRIBE}/production',
      desc: 'Log form: item type selector (existing inventory or new), quantity produced, unit, date. Production history list below.',
      action: 'Select item, enter quantity produced, tap "Log Production".',
      injectIDB: [
        {
          store: 'production-log',
          key: '{TRIBE}:prod001',
          data: {
            id: 'prod001',
            tribeId: '{TRIBE}',
            asset: 'water_reserve',
            quantity: 50,
            unit: 'liters',
            loggedAt: '{NOW-1d}',
            loggedBy: '{SELF_PUB}',
            notes: 'Purified via gravity filter',
          },
        },
        {
          store: 'production-log',
          key: '{TRIBE}:prod002',
          data: {
            id: 'prod002',
            tribeId: '{TRIBE}',
            asset: 'food_reserve',
            quantity: 24,
            unit: 'eggs',
            loggedAt: '{NOW-2d}',
            loggedBy: 'dummy_pub_2_sam_chen',
            notes: 'Harvested from backyard hens',
          },
        },
        {
          store: 'production-log',
          key: '{TRIBE}:prod003',
          data: {
            id: 'prod003',
            tribeId: '{TRIBE}',
            asset: 'solar_panel_kit',
            quantity: 8,
            unit: 'kWh',
            loggedAt: '{NOW}',
            loggedBy: '{SELF_PUB}',
            notes: 'Solar generation today',
          },
        },
      ],
    },
  ],
}
