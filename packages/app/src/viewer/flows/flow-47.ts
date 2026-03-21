import type { Flow } from '../types'

export const flow: Flow = {
  id: 47,
  section: 'Federation',
  mode: 'Both',
  title: 'Connect with Allied Tribe',
  summary: "Scan another tribe's federation contact card QR to establish an alliance.",
  steps: [
    {
      n: 1,
      screen: 'Connect Screen',
      route: '/connect',
      desc: 'QR scanner for federation contact cards. On scan: shows allied tribe preview (name, location, region, governance). "Connect" button sends alliance request.',
      action: "Scan an allied tribe's federation QR. Tap \"Connect\".",
    },
  ],
}
