import type { Flow } from '../types'

export const flow: Flow = {
  id: 5,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Join a Tribe (via Invite QR/Link)',
  summary:
    'A non-member receives an invite link or QR code, scans it, and is enrolled as a tribe member.',
  steps: [
    {
      n: 1,
      screen: 'Home Screen — scanner active',
      route: '/',
      desc: 'Inline camera QR scanner. "Cancel Scan" button. The scanner decodes the invite URL and navigates to the join screen.',
      action: 'Tap "Scan QR to Join" to activate the scanner.',
    },
    {
      n: 2,
      screen: 'Join Tribe Screen',
      route: '/join',
      desc: 'Tribe preview card showing name, location, governance model (fetched from relay or URL params). "Join [Tribe Name]" button. Error/warning cards for offline or bad data.',
      action: 'Tap "Join [Tribe Name]".',
      note: 'For a realistic preview, provide ?tribe=ID&name=Name&loc=Location in the URL params.',
    },
  ],
}
