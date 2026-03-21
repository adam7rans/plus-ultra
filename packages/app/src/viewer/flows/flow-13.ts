import type { Flow } from '../types'

const BASE_RECORDS = [
  {
    store: 'my-tribes', key: '{TRIBE}',
    data: { tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', tribePub: 'dummy_tribe_pub', tribePriv: 'dummy_tribe_priv', tribeEpub: 'dummy_tribe_epub', tribeEpriv: 'dummy_tribe_epriv', name: 'Mountain Watch', location: 'Blue Ridge, VA' },
  },
  {
    store: 'tribe-cache', key: '{TRIBE}',
    data: { id: '{TRIBE}', tribeId: '{TRIBE}', name: 'Mountain Watch', location: 'Blue Ridge, VA', region: 'appalachia', governance: 'council', founderId: '{SELF_PUB}', foundedAt: '{NOW-30d}' },
  },
  {
    store: 'identity', key: 'keypair',
    data: { pub: '{SELF_PUB}', priv: 'dummy_priv_key', epub: 'dummy_epub_key', epriv: 'dummy_epriv_key', createdAt: '{NOW-30d}', backedUp: true, displayName: 'Alex Rivera' },
  },
  {
    store: 'members', key: '{TRIBE}:{SELF_PUB}',
    data: { pubkey: '{SELF_PUB}', tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 1.0, memberType: 'adult', authorityRole: 'founder', displayName: 'Alex Rivera', epub: 'dummy_epub_key', availability: 'full_time' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_2',
    data: { pubkey: 'PUB_2', tribeId: '{TRIBE}', joinedAt: '{NOW-25d}', lastSeen: '{NOW-1d}', status: 'active', attachmentScore: 0.9, memberType: 'adult', authorityRole: 'member', displayName: 'Sam Chen', epub: 'dummy_epub_2', availability: 'part_time' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_3',
    data: { pubkey: 'PUB_3', tribeId: '{TRIBE}', joinedAt: '{NOW-20d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 0.85, memberType: 'adult', authorityRole: 'lead', displayName: 'Jordan Blake', epub: 'dummy_epub_3', availability: 'on_call' },
  },
]

const MY_PEOPLE_RECORD = {
  store: 'my-people', key: '{TRIBE}:{SELF_PUB}',
  // Value is an array of PersonLink objects
  data: [
    { pubkey: 'PUB_2', relationship: 'family', addedAt: '{NOW-20d}' },
    { pubkey: 'PUB_3', relationship: 'friend', addedAt: '{NOW-10d}' },
  ],
}

export const flow: Flow = {
  id: 13,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'My People (Member Roster)',
  summary:
    'Designate family and friends within the tribe for quick access, DMs, and priority visibility during emergencies.',
  steps: [
    {
      n: '1a',
      screen: 'My People — empty',
      route: '/tribe/{TRIBE}/people',
      desc: 'Family (0) and Friends (0) sections both show empty state cards: "No family members added yet" and "No friends added yet" with "Add →" links.',
      action: 'Observe both empty sections. Tap "Add family members →" to see the add member modal.',
      injectIDB: BASE_RECORDS,
    },
    {
      n: '1b',
      screen: 'My People — populated',
      route: '/tribe/{TRIBE}/people',
      desc: 'Family (1): Sam Chen — Active · part-time — with DM bubble icon and remove ✕ button. Friends (1): Jordan Blake — Active · on-call — same controls.',
      action: 'Tap 💬 to open a DM with Sam. Tap ✕ to remove Jordan from friends.',
      injectIDB: [...BASE_RECORDS, MY_PEOPLE_RECORD],
    },
  ],
}
