import type { Flow } from '../types'

export const flow: Flow = {
  id: 6,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Onboarding Wizard',
  summary:
    'After joining or creating a tribe, new members complete a 5-step wizard: profile, skill domains, individual roles, availability, and review.',
  steps: [
    {
      n: 1,
      screen: 'Step 1 — Profile',
      route: '/tribe/{TRIBE}/onboarding?step=profile',
      desc: 'Progress dots (5 total). Display name input (required), 2x2 member type grid (Adult/Elder/Child/Dependent), optional photo upload (max 200KB), bio textarea.',
      action: 'Enter display name, select member type, tap Next.',
      prefillForm: [
        {
          selector: 'input[placeholder*="name" i], input[name="displayName"]',
          value: 'Alex Rivera',
        },
      ],
    },
    {
      n: 2,
      screen: 'Step 2 — Domains',
      route: '/tribe/{TRIBE}/onboarding?step=domains',
      desc: '2-column grid of skill domain cards (icon + label). Toggle-select style. At least one domain required.',
      action: 'Select applicable skill domains, tap Next.',
    },
    {
      n: 3,
      screen: 'Step 3 — Skills',
      route: '/tribe/{TRIBE}/onboarding?step=skills&domains=medical,comms,security',
      desc: 'For each selected domain: domain header, list of role cards. Tap to select; tap again to expand proficiency picker (Basic/Intermediate/Expert/Verified Expert), sub-specialties, experience range.',
      action: 'Select roles and set proficiencies. Tap "Next Domain" until all covered.',
    },
    {
      n: 4,
      screen: 'Step 4 — Availability',
      route: '/tribe/{TRIBE}/onboarding?step=availability',
      desc: '3 large option buttons (Full-time / Part-time / On-call), optional physical limitations input, optional notes for tribe.',
      action: 'Select availability, tap Next.',
    },
    {
      n: 5,
      screen: 'Step 5 — Review',
      route: '/tribe/{TRIBE}/onboarding?step=review&name=Alex Rivera&memberType=adult&availability=full-time&domains=medical,comms,security',
      desc: 'Summary card: photo/name/member type, all selected skills by domain, availability. "Join Tribe" button submits and navigates to tribe dashboard.',
      action: 'Review and tap "Join Tribe".',
    },
  ],
}
