import type { Flow } from '../types'

export const flow: Flow = {
  id: 14,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Add / Update Inventory',
  summary:
    'Members add, edit, or remove inventory items — food stores, water, medical supplies, tools — contributing to the resource readiness score.',
  steps: [
    {
      n: '1a',
      screen: 'Inventory Screen — empty',
      route: '/tribe/{TRIBE}/inventory',
      desc: 'Empty inventory list. "Add Item" button. Resource readiness at 0%.',
      action: 'Observe the empty inventory state.',
    },
    {
      n: '1b',
      screen: 'Inventory Screen — populated',
      route: '/tribe/{TRIBE}/inventory',
      desc: 'Categorized item list (Food/Water/Medical/Tools/Other). Quantity, unit, expiry date per item. Add Item button. Resource readiness percentage. Edit/delete per row.',
      action: 'Tap "Add Item", fill in details, save.',
      injectIDB: [
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
        {
          store: 'inventory',
          key: '{TRIBE}:generator',
          data: {
            tribeId: '{TRIBE}',
            asset: 'generator',
            quantity: 1,
            unit: 'units',
            category: 'tools',
            updatedAt: '{NOW}',
          },
        },
      ],
    },
  ],
}
