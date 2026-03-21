import type { Flow } from '../types'

const INVITE = 'tribe=dummy_tribe_id_mountain_watch&token=dummy_invite_token_abc&name=Mountain+Watch&loc=Blue+Ridge%2C+VA&pub=dummy_founder_pub_key'

export const flow: Flow = {
  id: 61,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Join a Tribe (via Paste Link)',
  summary:
    'A non-member receives an invite link via text or email, taps "Paste Invite Link" on the home screen, pastes the URL, and is taken directly to the join confirmation screen.',
  steps: [
    {
      n: 1,
      screen: 'Home Screen — paste link input',
      route: '/',
      desc: '"Paste Invite Link" button below the QR scan button. Tapping it reveals a URL text input and a "Go →" button. Pressing Enter or tapping Go navigates to the join screen.',
      action: 'Tap "Paste Invite Link". Paste the invite URL. Tap "Go →".',
      prefillForm: [
        {
          selector: 'input[type="url"], input[placeholder*="invite" i]',
          value: `http://localhost:5174/join?${INVITE}`,
        },
      ],
    },
    {
      n: 2,
      screen: 'Join Tribe Screen — populated',
      route: `/join?${INVITE}`,
      desc: 'Tribe preview card showing name "Mountain Watch", location "Blue Ridge, VA", governance model. "Join Mountain Watch" button. Same screen reached via QR scan or paste link.',
      action: 'Review the tribe info. Tap "Join Mountain Watch" to enroll.',
    },
    {
      n: 3,
      screen: 'Home Screen — invalid link error',
      route: '/',
      desc: 'If the pasted URL is not a valid invite link, an inline error appears: "Not a valid tribe invite link." The input remains open for correction.',
      action: 'Paste a malformed URL. Observe the error message. Correct and resubmit.',
      prefillForm: [
        {
          selector: 'input[type="url"], input[placeholder*="invite" i]',
          value: 'https://example.com/not-a-tribe-link',
        },
      ],
    },
  ],
}
