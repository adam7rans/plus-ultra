import type { Flow } from '../types'

export const flow: Flow = {
  id: 33,
  section: 'Communication',
  mode: 'Both',
  title: 'Send Message — Tribe Channel',
  summary:
    'All tribe members can send and receive messages in the main tribe channel. Gun p2p relay in Grid Up; queued in Grid Down.',
  steps: [
    {
      n: '1a',
      screen: 'Tribe Channel — empty',
      route: '/tribe/{TRIBE}/channel',
      desc: 'Empty channel. "No messages yet" state. Message input at bottom.',
      action: 'Observe the empty channel state.',
    },
    {
      n: '1b',
      screen: 'Tribe Channel — populated',
      route: '/tribe/{TRIBE}/channel',
      desc: 'Message list (newest at bottom). Message input with send button. Attachment button. Member avatars beside messages. Unread badge in header.',
      action: 'Type a message. Tap send. Observe the message appear in the list.',
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
            text: 'Count me in. Should we review the PACE plan before we go?',
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
            text: 'Good call Jordan. Training drill the following Saturday at 0900.',
            sentAt: '{NOW-1d}',
            type: 'tribe',
          },
        },
        {
          store: 'messages',
          key: 'msg005',
          data: {
            id: 'msg005',
            tribeId: '{TRIBE}',
            senderPub: 'dummy_pub_2_sam_chen',
            senderName: 'Sam Chen',
            text: 'Confirmed. Bringing First Aid kit for training review.',
            sentAt: '{NOW}',
            type: 'tribe',
          },
        },
      ],
    },
  ],
}
