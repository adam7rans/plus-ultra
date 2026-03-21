import type { Flow } from '../types'

export const flow: Flow = {
  id: 15,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Log Consumption',
  summary:
    'Members log daily consumption of tracked resources, reducing current quantities and flagging items below threshold.',
  steps: [
    {
      n: 1,
      screen: 'Inventory Screen — Log Consumption',
      route: '/tribe/{TRIBE}/inventory',
      desc: 'Same inventory screen. "Log Consumption" action per item. Quantity consumed input. Auto-deducts from inventory.',
      action: 'Tap "Log Consumption" on an item. Enter quantity used. Confirm.',
      note: 'Tap the "Log Consumption" action on an inventory item to trigger the log form.',
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
      ],
    },
  ],
}
