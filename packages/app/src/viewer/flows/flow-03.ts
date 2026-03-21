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
      screen: 'Identity Screen — main',
      route: '/identity',
      desc: 'Full identity screen. "Restore from QR Code" secondary button at the bottom. This is the entry point for restore on a new or wiped device.',
      action: 'Tap "Restore from QR Code" to open the QR scanner.',
    },
    {
      n: 2,
      screen: 'Identity Screen — restore / scanner active',
      route: '/identity?view=restore',
      desc: 'Live camera QR scanner fills the screen. Instruction: "Scan your backup QR code to restore your identity on this device." Scanner awaits a valid keypair QR.',
      action: 'Hold the printed backup QR code up to the camera. The app decodes and restores the keypair automatically.',
    },
    {
      n: 3,
      screen: 'Identity Screen — restore success',
      route: '/identity?view=restore&success=true',
      desc: 'Green success card: "✓ Identity restored — Your identity has been restored successfully." "Continue" button navigates to the home screen.',
      action: 'Tap "Continue" to go home. The restored identity is now active in IndexedDB.',
    },
    {
      n: 4,
      screen: 'Identity Screen — restore error',
      route: '/identity?view=restore',
      desc: 'If the scanned QR is not a valid keypair (wrong format, corrupted data), a red error card appears below the scanner: "Failed to restore identity." Scanner remains active to retry.',
      action: 'Scan an invalid QR. Observe the error card. Try again with the correct backup QR.',
      manual: true,
      manualDesc: 'Trigger by scanning any non-identity QR code while the restore scanner is active. The error state renders inline below the scanner without leaving the view.',
    },
  ],
}
