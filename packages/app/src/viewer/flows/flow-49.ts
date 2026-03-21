import type { Flow } from '../types'

export const flow: Flow = {
  id: 49,
  section: 'Federation',
  mode: 'Both',
  title: 'Create Trade Proposal',
  summary: 'Create a trade proposal to exchange resources with an allied tribe.',
  steps: [
    {
      n: 1,
      screen: 'New Proposal Screen — Trade',
      route: '/tribe/{TRIBE}/proposals/new',
      desc: 'Proposal type set to "Trade". Offering: item, quantity. Requesting: item, quantity. Allied tribe selector. Terms and delivery notes.',
      action: 'Select proposal type "Trade". Fill in offer and request details. Submit.',
    },
  ],
}
