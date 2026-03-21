import type { Flow } from '../types'

export const flow: Flow = {
  id: 50,
  section: 'Federation',
  mode: 'Both',
  title: 'Share Intel / PACE Plan',
  summary:
    "Share the tribe's PACE comms plan or intel reports with allied tribes through the federation.",
  steps: [
    {
      n: 1,
      screen: 'PACE Comms Screen — Share',
      route: '/tribe/{TRIBE}/comms',
      desc: 'PACE plan display with "Share with Allies" button. Generates a read-only shareable version for allied tribes. Intel sharing form below.',
      action: 'Tap "Share with Allies". Select allied tribes. Confirm share.',
    },
  ],
}
