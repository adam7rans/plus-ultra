import type { Flow } from '../types'

export const flow: Flow = {
  id: 1,
  section: 'Setup & Identity',
  mode: 'Both',
  title: 'First Launch & Identity Creation',
  summary:
    'On first launch, the app auto-generates a Gun/SEA cryptographic keypair and stores it in IndexedDB. No accounts, no servers required.',
  steps: [
    {
      n: 1,
      screen: 'Home Screen',
      route: '/',
      desc: 'Auto-generated cryptographic identity. Yellow backup warning banner if not backed up. "My Tribes" empty state. "Create New Tribe" and "Scan QR to Join" buttons.',
      action:
        'Observe the identity chip (top-right) and backup banner. Note the campfire empty state.',
    },
  ],
}
