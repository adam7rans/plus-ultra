import type { Flow } from '../types'

export const flow: Flow = {
  id: 20,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Create a Proposal',
  summary:
    'Any member can create a proposal for the tribe to vote on. Governance model determines voting window and threshold.',
  steps: [
    {
      n: 1,
      screen: 'New Proposal Screen',
      route: '/tribe/{TRIBE}/proposals/new',
      desc: 'Title input, description textarea, proposal type selector (Policy/Resource/Emergency/Other), voting deadline (auto-set by governance model). "Submit Proposal" button.',
      action: 'Fill in title and description. Select proposal type. Tap "Submit Proposal".',
      prefillForm: [
        {
          selector: 'input[placeholder*="title" i], input[name="title"]',
          value: 'Purchase 3-month food reserve',
        },
        {
          selector: 'textarea[placeholder*="description" i], textarea[name="body"]',
          value:
            'We should allocate $800 from tribe funds to purchase a 3-month emergency food reserve for all 3 members. Recommended supplier: FoodCo Supply (contact list). Council vote required per charter.',
        },
      ],
    },
  ],
}
