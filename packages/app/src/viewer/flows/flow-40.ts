import type { Flow } from '../types'

export const flow: Flow = {
  id: 40,
  section: 'Emergency & Accountability',
  mode: 'Both',
  title: 'Respond to Roll Call',
  summary: "Members receive a muster notification and respond with their status and location.",
  steps: [
    {
      n: 1,
      screen: 'Roll Call Response',
      route: '/tribe/{TRIBE}/rollcall',
      manual: true,
      manualDesc:
        'Requires an active muster. First initiate a roll call (Flow 39) from one account, then open the app on a second device or account. The response screen shows a status selector (Safe / At Risk / Need Help) and optional location note. Tap "Send Response" to acknowledge.',
      desc: 'Status selector: Safe / At Risk / Need Help. Optional location note. Send Response button.',
      action: 'Select status. Add location note. Tap "Send Response".',
    },
  ],
}
