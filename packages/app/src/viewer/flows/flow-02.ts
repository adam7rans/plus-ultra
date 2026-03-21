import type { Flow } from '../types'

export const flow: Flow = {
  id: 2,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'Identity Backup (QR Export)',
  summary:
    'The user exports their full keypair as a QR code to save offline. This is the only way to recover access on a new device.',
  steps: [
    {
      n: 1,
      screen: 'Identity Screen — main view',
      route: '/identity',
      desc: 'Public key card, display name, private key (masked), backup status card. "Back Up Now" and "Restore from QR Code" buttons.',
      action: 'Tap "Back Up Now" to enter the backup view.',
      note: 'Navigate to /identity — may redirect to home if no identity exists yet.',
    },
    {
      n: 2,
      screen: 'Identity Screen — backup view',
      route: '/identity',
      desc: 'QR code rendered from keypair JSON. Red danger card: "This QR contains your private key." "Done — I\'ve saved my backup" button.',
      action: 'Tap "Done — I\'ve saved my backup" to mark backedUp = true and return.',
      note: 'Tap "Back Up Now" on the identity screen to reach this state.',
    },
  ],
}
