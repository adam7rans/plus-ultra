import type { Flow } from '../types'

export const flow: Flow = {
  id: 4,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Create a Tribe',
  summary:
    'The founding member sets up a new tribe with a name, location, region, governance model, and optional coordinates. After founding, the app navigates to the new tribe dashboard.',
  steps: [
    {
      n: 1,
      screen: 'Create Tribe Screen',
      route: '/create-tribe',
      desc: 'Tribe Name (max 60), Location, Region fields. Expandable "Set Coordinates" section with GPS button and manual lat/lng. Governance Model selector (Council / Direct Democracy / Hybrid) as radio cards. "Found This Tribe" button (disabled until required fields filled).',
      action: 'Fill in Tribe Name, Location, Region. Select a governance model. Tap "Found This Tribe".',
      prefillForm: [
        { selector: 'input[placeholder*="Tribe Name"], input[name="name"]', value: 'Mountain Watch' },
        { selector: 'input[placeholder*="Location"], input[name="location"]', value: 'Blue Ridge, VA' },
        { selector: 'input[placeholder*="region" i], input[name="region"]', value: 'appalachia' },
      ],
    },
    {
      n: 2,
      screen: 'Tribe Dashboard — newly founded',
      route: '/tribe/{TRIBE}',
      desc: 'Fresh tribe dashboard immediately after founding. Survivability score at baseline. No members besides founder. Empty resource bars. "Invite Members" CTA. Tribe name and location shown in header.',
      action: 'Explore the newly created tribe dashboard. Tap "Invite Members" to generate the first invite link.',
      injectIDB: [
        {
          store: 'my-tribes',
          key: '{TRIBE}',
          data: {
            id: '{TRIBE}',
            name: 'Mountain Watch',
            location: 'Blue Ridge, VA',
            region: 'appalachia',
            founderId: '{SELF_PUB}',
            governanceModel: 'council',
            joinedAt: '{NOW}',
            createdAt: '{NOW}',
          },
        },
        {
          store: 'tribe-cache',
          key: '{TRIBE}',
          data: {
            id: '{TRIBE}',
            name: 'Mountain Watch',
            location: 'Blue Ridge, VA',
            region: 'appalachia',
            founderId: '{SELF_PUB}',
            constitutionTemplate: 'council',
            createdAt: '{NOW}',
          },
        },
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
            joinedAt: '{NOW}',
          },
        },
      ],
    },
  ],
}
