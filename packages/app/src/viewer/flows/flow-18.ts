import type { Flow } from '../types'

export const flow: Flow = {
  id: 18,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Manage Finances',
  summary:
    'Track tribe funds, expenses, income, and resource transactions. Supports both fiat and barter accounting.',
  steps: [
    {
      n: '1a',
      screen: 'Finance Screen — empty',
      route: '/tribe/{TRIBE}/finance',
      desc: 'Balance at $0. Empty transaction list. "Add Transaction" button.',
      action: 'Observe the empty finance state.',
    },
    {
      n: '1b',
      screen: 'Finance Screen — populated',
      route: '/tribe/{TRIBE}/finance',
      desc: 'Balance summary card. Transaction list (income/expense, barter items). Add Transaction button. Category filter. Running totals.',
      action: 'Tap "Add Transaction", fill in details (amount, type, category, note), save.',
      injectIDB: [
        {
          store: 'tribe-contributions',
          key: '{TRIBE}:contrib001',
          data: {
            id: 'contrib001',
            tribeId: '{TRIBE}',
            memberPub: '{SELF_PUB}',
            amount: 200,
            currency: 'USD',
            category: 'monthly_dues',
            note: 'March dues',
            createdAt: '{NOW-3d}',
          },
        },
        {
          store: 'tribe-contributions',
          key: '{TRIBE}:contrib002',
          data: {
            id: 'contrib002',
            tribeId: '{TRIBE}',
            memberPub: 'dummy_pub_2_sam_chen',
            amount: 150,
            currency: 'USD',
            category: 'monthly_dues',
            note: 'March dues',
            createdAt: '{NOW-2d}',
          },
        },
        {
          store: 'tribe-expenses',
          key: '{TRIBE}:exp001',
          data: {
            id: 'exp001',
            tribeId: '{TRIBE}',
            amount: 80,
            currency: 'USD',
            category: 'medical',
            description: 'Medical supplies restock',
            createdAt: '{NOW-5d}',
            paidBy: '{SELF_PUB}',
          },
        },
        {
          store: 'tribe-expenses',
          key: '{TRIBE}:exp002',
          data: {
            id: 'exp002',
            tribeId: '{TRIBE}',
            amount: 120,
            currency: 'USD',
            category: 'fuel',
            description: 'Generator fuel',
            createdAt: '{NOW-4d}',
            paidBy: 'dummy_pub_2_sam_chen',
          },
        },
        {
          store: 'tribe-expenses',
          key: '{TRIBE}:exp003',
          data: {
            id: 'exp003',
            tribeId: '{TRIBE}',
            amount: 45,
            currency: 'USD',
            category: 'comms',
            description: 'Radio batteries',
            createdAt: '{NOW-1d}',
            paidBy: '{SELF_PUB}',
          },
        },
      ],
    },
  ],
}
