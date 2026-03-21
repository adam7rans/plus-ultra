import type { Flow } from '../types'

export const flow: Flow = {
  id: 43,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Receive Emergency Alert',
  summary:
    'Members receive an incoming emergency alert notification and acknowledge it.',
  steps: [
    {
      n: 1,
      screen: 'Emergency Alert — Received',
      route: '/tribe/{TRIBE}',
      manual: true,
      manualDesc:
        'Requires a second user or device to send the alert (Flow 42). The receiving device shows a full-screen alert overlay with severity color coding, message text, sender name, and timestamp. Members tap "Acknowledge" to confirm receipt.',
      desc: 'Full-screen alert overlay with severity color. Message, sender, timestamp. "Acknowledge" button.',
      action: 'Tap "Acknowledge" to confirm receipt of the alert.',
    },
  ],
}
