import type { Flow } from '../types'

export const flow: Flow = {
  id: 34,
  section: 'Communication',
  mode: 'Both',
  title: 'Send Direct Message',
  summary: 'Members send encrypted direct messages to another tribe member.',
  steps: [
    {
      n: 1,
      screen: 'DM Screen',
      route: '/tribe/{TRIBE}/dm/dummy_pub_2_sam_chen',
      desc: 'Private message thread with Sam Chen. Message input. Encrypted indicator. Message history.',
      action: 'Type a message and send.',
      note: 'This uses a hardcoded dummy pubkey. Navigate from the member roster for a real DM.',
      injectIDB: [
        {
          store: 'messages',
          key: 'dm001',
          data: {
            id: 'dm001',
            tribeId: '{TRIBE}',
            senderPub: '{SELF_PUB}',
            recipientPub: 'dummy_pub_2_sam_chen',
            senderName: 'Alex Rivera',
            text: 'Hey Sam, can you check the water filter before Saturday?',
            sentAt: '{NOW-3d}',
            type: 'dm',
          },
        },
        {
          store: 'messages',
          key: 'dm002',
          data: {
            id: 'dm002',
            tribeId: '{TRIBE}',
            senderPub: 'dummy_pub_2_sam_chen',
            recipientPub: '{SELF_PUB}',
            senderName: 'Sam Chen',
            text: 'Already on it. Changed the filter yesterday, good for 6 months.',
            sentAt: '{NOW-3d}',
            type: 'dm',
          },
        },
        {
          store: 'messages',
          key: 'dm003',
          data: {
            id: 'dm003',
            tribeId: '{TRIBE}',
            senderPub: '{SELF_PUB}',
            recipientPub: 'dummy_pub_2_sam_chen',
            senderName: 'Alex Rivera',
            text: 'Perfect. Thanks for staying on top of it.',
            sentAt: '{NOW-2d}',
            type: 'dm',
          },
        },
      ],
    },
  ],
}
