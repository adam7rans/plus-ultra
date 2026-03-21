import type { Flow } from '../types'

export const flow: Flow = {
  id: 19,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Add External Contacts',
  summary:
    'Maintain a contact list of non-member allies, suppliers, medical contacts, and local authority liaisons.',
  steps: [
    {
      n: '1a',
      screen: 'Contacts Screen — empty',
      route: '/tribe/{TRIBE}/contacts',
      desc: 'Empty contacts list. "Add Contact" button. Filter tabs: All / Medical / Supply / Authority / Ally.',
      action: 'Observe the empty contacts state.',
    },
    {
      n: '1b',
      screen: 'Contacts Screen — populated',
      route: '/tribe/{TRIBE}/contacts',
      desc: 'Contact list with name, role/type, phone, notes. "Add Contact" button. Filter by type (Ally/Medical/Supplier/Authority). Tap to expand contact details.',
      action: 'Tap "Add Contact", fill in name and role, save.',
      injectIDB: [
        {
          store: 'external-contacts',
          key: '{TRIBE}:contact001',
          data: {
            id: 'contact001',
            tribeId: '{TRIBE}',
            name: 'Dr. Sarah Kim',
            role: 'Medical',
            type: 'medical',
            phone: '540-555-0101',
            notes: 'ER physician, 15min away. Can consult remotely.',
            createdAt: '{NOW-10d}',
          },
        },
        {
          store: 'external-contacts',
          key: '{TRIBE}:contact002',
          data: {
            id: 'contact002',
            tribeId: '{TRIBE}',
            name: 'W5MRC — Harold Simms',
            role: 'HAM Operator',
            type: 'comms',
            phone: 'HAM: 146.520 MHz',
            notes: 'Licensed HAM, county emergency net coordinator.',
            createdAt: '{NOW-8d}',
          },
        },
        {
          store: 'external-contacts',
          key: '{TRIBE}:contact003',
          data: {
            id: 'contact003',
            tribeId: '{TRIBE}',
            name: 'FoodCo Supply',
            role: 'Bulk Food Supplier',
            type: 'supply',
            phone: '540-555-0202',
            notes: 'Wholesale prices, 48h lead time. Prepper-friendly.',
            createdAt: '{NOW-6d}',
          },
        },
        {
          store: 'external-contacts',
          key: '{TRIBE}:contact004',
          data: {
            id: 'contact004',
            tribeId: '{TRIBE}',
            name: 'Dep. Mike Torres',
            role: 'County Sheriff Liaison',
            type: 'authority',
            phone: '540-555-0303',
            notes: 'Sympathetic to prepper community. Good channel.',
            createdAt: '{NOW-4d}',
          },
        },
      ],
    },
  ],
}
