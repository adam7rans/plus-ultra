import type { Flow } from '../types'

export const flow: Flow = {
  id: 48,
  section: 'Federation',
  mode: 'Grid Up',
  title: 'Message in Federation Channel',
  summary:
    "Send messages to an allied tribe's shared federation channel — visible to all members of both tribes.",
  steps: [
    {
      n: 1,
      screen: 'Federation Channel',
      route: '/tribe/{TRIBE}/federation',
      manual: true,
      manualDesc:
        'Requires an established alliance with another tribe (Flow 47). Both tribes must have connected and accepted the alliance. The federation channel appears in the federation screen after connection. Messages are visible to members of both allied tribes.',
      desc: 'Federation channel message list. Cross-tribe member avatars with tribe badge. Message input. Send button.',
      action: 'Type a message. Send. Observe cross-tribe message delivery.',
    },
  ],
}
