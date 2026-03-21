import type { Flow } from '../types'

// Dummy invite params — tribe ID + token + embedded tribe metadata
const INVITE = 'tribe=dummy_tribe_id_mountain_watch&token=dummy_invite_token_abc&name=Mountain+Watch&loc=Blue+Ridge%2C+VA&pub=dummy_founder_pub_key'

export const flow: Flow = {
  id: 5,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Join a Tribe (via Invite QR/Link)',
  summary:
    'A non-member receives an invite QR code or shareable link, scans or taps it, and is taken to the join screen to confirm and enroll.',
  steps: [
    {
      n: 1,
      screen: 'Home Screen',
      route: '/',
      desc: '"Scan QR to Join" button. Tapping it activates the inline camera QR scanner. Alternatively, opening a tribe invite link directly bypasses the scanner.',
      action: 'Tap "Scan QR to Join" to activate the inline camera scanner.',
    },
    {
      n: 2,
      screen: 'QR Scanner (inline on Home Screen)',
      route: '/',
      manual: true,
      manualDesc:
        'The QR scanner activates as an overlay on the Home Screen after tapping "Scan QR to Join". It requires camera access and a physical QR code to scan. The scanned URL is decoded and the app navigates to the Join screen automatically.',
      desc: 'Live camera viewfinder. "Cancel Scan" button. Decodes invite URL and navigates to the join screen on success.',
      action: 'Hold the tribe invite QR code up to the camera.',
    },
    {
      n: 3,
      screen: 'Join Tribe Screen — populated (via link)',
      route: `/join?${INVITE}`,
      desc: 'Tribe preview card: name, location, governance model. "Join Mountain Watch" button. Reached via QR scan or tapping a direct invite link.',
      action: 'Review the tribe info. Tap "Join Mountain Watch" to enroll and proceed to onboarding.',
    },
    {
      n: 4,
      screen: 'Join Tribe Screen — offline / no Gun data',
      route: `/join?${INVITE}`,
      gridDown: true,
      gridDownKey: 'plusultra:offlineSince',
      gridDownValue: () => Date.now() - 2 * 60 * 60 * 1000,
      desc: 'Same join screen when the relay is unreachable. Falls back to the name/loc/pub embedded in the invite URL — still shows the tribe card and join button.',
      action: 'Inject offline state. Observe that the join card still renders from URL-embedded data.',
    },
  ],
}
