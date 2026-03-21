import type { Flow } from '../types'

export const flow: Flow = {
  id: 42,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Send Emergency Alert',
  summary:
    'Tribe admin sends an emergency alert to all members with severity level and message.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Dashboard — Send Alert',
      route: '/tribe/{TRIBE}',
      desc: '"Send Alert" button in dashboard header. Modal: message input, severity selector (Info/Warning/Critical/Emergency). Send button.',
      action: 'Tap "Send Alert" in the dashboard header. Select severity. Enter message. Send.',
      note: 'Tap the "Send Alert" (lightning bolt) button in the dashboard header to open the alert modal.',
    },
  ],
}
