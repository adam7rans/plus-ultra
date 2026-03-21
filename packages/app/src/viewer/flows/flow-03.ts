import type { Flow } from '../types'

export const flow: Flow = {
  id: 3,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Identity Restore (from Backup QR)',
  summary:
    'User scans a previously exported backup QR to restore their identity on a new or wiped device.',
  steps: [
    {
      n: 1,
      screen: 'Identity Screen — restore view',
      route: '/identity',
      desc: 'Live camera QR scanner. Success card with "Continue" button on valid scan. Error card on invalid QR.',
      action: 'Hold up the backup QR code to the camera scanner.',
      note: 'Tap "Restore from QR Code" on the identity screen to reach this state.',
    },
  ],
}
