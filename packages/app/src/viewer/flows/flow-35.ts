import type { Flow } from '../types'

export const flow: Flow = {
  id: 35,
  section: 'Communication',
  mode: 'Both',
  title: 'React & Reply to Message',
  summary: 'Members react to messages with emoji reactions and reply in thread.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Channel — reactions',
      route: '/tribe/{TRIBE}/channel',
      desc: 'Long-press or hover on a message to see reaction picker (emoji grid). Existing reactions shown as badges with count. Reply button opens thread view.',
      action: 'Long-press a message. Select an emoji reaction. Tap Reply to thread.',
      note: 'Long-press (or right-click on desktop) a message to open the reaction/reply context menu.',
      injectIDB: [
        {
          store: 'messages',
          key: 'msg001',
          data: {
            id: 'msg001',
            tribeId: '{TRIBE}',
            senderPub: '{SELF_PUB}',
            senderName: 'Alex Rivera',
            text: 'Supply run planned for Saturday — who can help load?',
            sentAt: '{NOW-2d}',
            type: 'tribe',
          },
        },
        {
          store: 'messages',
          key: 'msg002',
          data: {
            id: 'msg002',
            tribeId: '{TRIBE}',
            senderPub: 'dummy_pub_2_sam_chen',
            senderName: 'Sam Chen',
            text: 'I can be there by 0800. Bringing the truck.',
            sentAt: '{NOW-2d}',
            type: 'tribe',
          },
        },
        {
          store: 'messages',
          key: 'msg003',
          data: {
            id: 'msg003',
            tribeId: '{TRIBE}',
            senderPub: 'dummy_pub_3_jordan_blake',
            senderName: 'Jordan Blake',
            text: 'Count me in! 💪',
            sentAt: '{NOW-1d}',
            type: 'tribe',
          },
        },
        {
          store: 'messages',
          key: 'msg004',
          data: {
            id: 'msg004',
            tribeId: '{TRIBE}',
            senderPub: '{SELF_PUB}',
            senderName: 'Alex Rivera',
            text: 'Great team. See everyone at 0800.',
            sentAt: '{NOW}',
            type: 'tribe',
          },
        },
      ],
    },
  ],
}
