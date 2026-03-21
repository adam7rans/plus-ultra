import type { Flow } from '../types'

export const flow: Flow = {
  id: 4,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Create a Tribe',
  summary:
    'The founding member sets up a new tribe with a name, location, region, governance model, and optional coordinates.',
  steps: [
    {
      n: 1,
      screen: 'Create Tribe Screen',
      route: '/create-tribe',
      desc: 'Tribe Name (max 60), Location, Region fields. Expandable "Set Coordinates" section with GPS button and manual lat/lng. Governance Model selector (Council / Direct Democracy / Hybrid) as radio cards. "Found This Tribe" button (disabled until required fields filled).',
      action:
        'Fill in Tribe Name, Location, Region. Select a governance model. Tap "Found This Tribe".',
      prefillForm: [
        {
          selector: 'input[placeholder*="Tribe Name"], input[name="name"]',
          value: 'Mountain Watch',
        },
        {
          selector: 'input[placeholder*="Location"], input[name="location"]',
          value: 'Blue Ridge, VA',
        },
        {
          selector: 'input[placeholder*="region" i], input[name="region"]',
          value: 'appalachia',
        },
      ],
    },
  ],
}
