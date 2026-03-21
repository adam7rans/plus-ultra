import type { Flow } from '../types'

export const flow: Flow = {
  id: 60,
  section: 'Technical',
  mode: 'Grid Up',
  title: 'Enable Push Notifications',
  summary: 'Enable browser or native push notifications so members receive alerts, muster calls, and proposal notifications when the app is in the background.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Dashboard — Push Toggle',
      route: '/tribe/{TRIBE}',
      desc: 'Push notifications toggle card on the tribe dashboard. Browser permission prompt on enable. Status shows: enabled with expiry, or disabled. "Test Notification" button.',
      action: 'Tap the push notifications toggle. Grant browser permission. Tap "Test Notification".',
      note: 'Scroll to the bottom of the tribe dashboard to find the push notifications toggle card.',
    },
  ],
}
