import type { Flow } from '../types'

export const flow: Flow = {
  id: 44,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Create Bug-Out Plan',
  summary:
    'Tribe creates a structured bug-out plan with rally points, routes, supply caches, and member assignments.',
  steps: [
    {
      n: 1,
      screen: 'Bug-Out Screen',
      route: '/tribe/{TRIBE}/bugout',
      desc: 'Bug-out plan builder: rally point locations (map pins), primary/alternate routes, supply cache locations, member vehicle/role assignments, activation condition. "Save Plan" button.',
      action: 'Define rally points and route. Assign members. Tap "Save Plan".',
      prefillForm: [
        {
          selector: 'input[placeholder*="plan" i], input[name="planName"]',
          value: 'Blue Ridge Fallback',
        },
        {
          selector: 'input[placeholder*="rally" i], input[name="rallyPointA"]',
          value: 'Skyline Gap — mile marker 42',
        },
      ],
    },
  ],
}
