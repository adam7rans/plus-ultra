import type { Flow } from '../types'

const IDENTITY_RECORD = {
  store: 'identity', key: 'keypair',
  data: { pub: '{SELF_PUB}', priv: 'dummy_priv_key', epub: 'dummy_epub_key', epriv: 'dummy_epriv_key', createdAt: '{NOW-30d}', backedUp: true, displayName: 'Alex Rivera' },
}

const TRIBE_RECORDS = [
  {
    store: 'my-tribes', key: '{TRIBE}',
    data: { tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', tribePub: 'dummy_tribe_pub', tribePriv: 'dummy_tribe_priv', tribeEpub: 'dummy_tribe_epub', tribeEpriv: 'dummy_tribe_epriv', name: 'Mountain Watch', location: 'Blue Ridge, VA' },
  },
  {
    store: 'tribe-cache', key: '{TRIBE}',
    data: { id: '{TRIBE}', tribeId: '{TRIBE}', name: 'Mountain Watch', location: 'Blue Ridge, VA', region: 'appalachia', governance: 'council', founderId: '{SELF_PUB}', foundedAt: '{NOW-30d}' },
  },
]

const MEMBER_RECORDS = [
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
  {
    store: 'members', key: '{TRIBE}:PUB_4',
    data: { pubkey: 'PUB_4', tribeId: '{TRIBE}', joinedAt: '{NOW-18d}', lastSeen: '{NOW-2d}', status: 'away_declared', attachmentScore: 0.75, memberType: 'adult', authorityRole: 'member', displayName: 'Maria Santos', epub: 'dummy_epub_4', availability: 'on_call' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_5',
    data: { pubkey: 'PUB_5', tribeId: '{TRIBE}', joinedAt: '{NOW-15d}', lastSeen: '{NOW-4h}', status: 'active', attachmentScore: 0.8, memberType: 'adult', authorityRole: 'member', displayName: 'Kai Nakamura', epub: 'dummy_epub_5', availability: 'full_time' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_6',
    data: { pubkey: 'PUB_6', tribeId: '{TRIBE}', joinedAt: '{NOW-12d}', lastSeen: '{NOW-6h}', status: 'active', attachmentScore: 0.7, memberType: 'child', authorityRole: 'dependent', displayName: 'Mia Rivera', epub: 'dummy_epub_6', availability: 'part_time' },
  },
]

const BASE_RECORDS = [...TRIBE_RECORDS, IDENTITY_RECORD, ...MEMBER_RECORDS]

// 3 family, 2 friends
const MY_PEOPLE_RECORD = {
  store: 'my-people', key: '{TRIBE}:{SELF_PUB}',
  data: [
    { pubkey: 'PUB_2', relationship: 'family', addedAt: '{NOW-20d}' },
    { pubkey: 'PUB_4', relationship: 'family', addedAt: '{NOW-18d}' },
    { pubkey: 'PUB_6', relationship: 'family', addedAt: '{NOW-12d}' },
    { pubkey: 'PUB_3', relationship: 'friend', addedAt: '{NOW-10d}' },
    { pubkey: 'PUB_5', relationship: 'friend', addedAt: '{NOW-7d}' },
  ],
}

// Empty my-people overwrites any stale IDB data from a previous seed
const EMPTY_MY_PEOPLE = {
  store: 'my-people', key: '{TRIBE}:{SELF_PUB}',
  data: [],
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
      injectIDB: [...BASE_RECORDS, EMPTY_MY_PEOPLE],
      seedHint: null,  // auto-injects on load, no manual hint needed
    },
    {
      n: '1b',
      screen: 'My People — populated',
      route: '/tribe/{TRIBE}/people',
      desc: 'Family (3): Sam Chen (Active · 1d ago), Maria Santos (Away · 2d ago), Mia Rivera (Active · 6h ago) — each row tappable to view profile, with 💬 DM icon. Friends (2): Jordan Blake (Active · just now), Kai Nakamura (Active · 4h ago).',
      action: 'Tap a name to view their member profile. Tap 💬 to open a DM. Tap ✕ to remove someone.',
      injectIDB: [...BASE_RECORDS, MY_PEOPLE_RECORD],
    },
  ],
}
