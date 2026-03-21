import type { Flow } from '../types'

export const flow: Flow = {
  id: 22,
  section: 'Governance & Planning',
  mode: 'Both',
  title: 'Create Goal from Proposal',
  summary:
    'After a proposal passes, a tribe admin converts it into a trackable Goal with milestones and assigned tasks.',
  steps: [
    {
      n: 1,
      screen: 'Goals Screen',
      route: '/tribe/{TRIBE}/goals',
      desc: 'Active goals list with title, progress bar, milestone count, task count, assigned members. "New Goal" button. Tap to expand goal details.',
      action: 'Tap "New Goal". Link to passed proposal (optional). Set title, milestones. Save.',
      prefillForm: [
        {
          selector: 'input[placeholder*="goal" i], input[name="title"]',
          value: 'Build 3-month food cache',
        },
        {
          selector: 'select[name="horizon"], select[name="timeHorizon"]',
          value: 'short_term',
        },
      ],
    },
  ],
}
