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
      screen: 'Identity Screen — not backed up',
      route: '/identity',
      desc: 'Public key card, display name, private key (masked). Pulsing orange "Not backed up — do this now" warning card. "⚠ Back Up Now" primary button and "Restore from QR Code" secondary button.',
      action: 'Tap "⚠ Back Up Now" to open the backup QR view.',
    },
    {
      n: 2,
      screen: 'Identity Screen — backup QR view',
      route: '/identity?view=backup',
      desc: 'QR code rendered from the full keypair JSON (pub, priv, epub, epriv). Instruction to print and store offline. Red danger card: "This QR contains your private key. Guard it like cash." "Done — I\'ve saved my backup" button.',
      action: 'Print or photograph the QR code. Tap "Done — I\'ve saved my backup" to mark identity as backed up.',
    },
    {
      n: 3,
      screen: 'Identity Screen — backed up state',
      route: '/identity',
      desc: 'Same identity screen but backup status card now shows green "Identity backed up" indicator. Button changes to "View Backup QR Code". No more orange warning.',
      action: 'Observe the green backup confirmation. Tap "View Backup QR Code" to view it again at any time.',
      note: 'This state appears after tapping "Done — I\'ve saved my backup" in the previous step. The iframe shows the not-backed-up state by default; click through step 2 to see this state.',
    },
  ],
}
