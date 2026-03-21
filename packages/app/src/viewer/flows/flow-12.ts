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
    data: { pubkey: '{SELF_PUB}', tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 1.0, memberType: 'adult', authorityRole: 'founder', displayName: 'Alex Rivera', epub: 'dummy_epub_key' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_2',
    data: { pubkey: 'PUB_2', tribeId: '{TRIBE}', joinedAt: '{NOW-25d}', lastSeen: '{NOW-1d}', status: 'active', attachmentScore: 0.9, memberType: 'adult', authorityRole: 'member', displayName: 'Sam Chen', epub: 'dummy_epub_2' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_3',
    data: { pubkey: 'PUB_3', tribeId: '{TRIBE}', joinedAt: '{NOW-20d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 0.85, memberType: 'adult', authorityRole: 'lead', displayName: 'Jordan Blake', epub: 'dummy_epub_3' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_4',
    data: { pubkey: 'PUB_4', tribeId: '{TRIBE}', joinedAt: '{NOW-15d}', lastSeen: '{NOW-2d}', status: 'active', attachmentScore: 0.75, memberType: 'adult', authorityRole: 'member', displayName: 'Maria Santos', epub: 'dummy_epub_4' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_5',
    data: { pubkey: 'PUB_5', tribeId: '{TRIBE}', joinedAt: '{NOW-10d}', lastSeen: '{NOW-3d}', status: 'active', attachmentScore: 0.7, memberType: 'adult', authorityRole: 'member', displayName: 'Kai Nakamura', epub: 'dummy_epub_5' },
  },
]

// Psych profiles use the serialized format (d_ prefix) so deserializeProfile() can read them
const PSYCH_RECORDS = [
  {
    store: 'psych-profiles', key: '{TRIBE}:{SELF_PUB}',
    data: {
      memberId: '{SELF_PUB}', tribeId: '{TRIBE}', archetype: 'Commander',
      quizCompletedAt: '{NOW-14d}', lastUpdatedAt: '{NOW-14d}', peerRatingCount: 3,
      d_decisionSpeed: 82, d_stressTolerance: 78, d_leadershipStyle: 30,
      d_conflictApproach: 70, d_riskAppetite: 75, d_socialEnergy: 60,
      pd_stressTolerance: 74, pd_leadershipStyle: 35, pd_conflictApproach: 65, pd_decisionSpeed: -1, pd_riskAppetite: -1, pd_socialEnergy: -1,
    },
  },
  {
    store: 'psych-profiles', key: '{TRIBE}:PUB_2',
    data: {
      memberId: 'PUB_2', tribeId: '{TRIBE}', archetype: 'Sustainer',
      quizCompletedAt: '{NOW-12d}', lastUpdatedAt: '{NOW-12d}', peerRatingCount: 2,
      d_decisionSpeed: 40, d_stressTolerance: 72, d_leadershipStyle: 65,
      d_conflictApproach: 35, d_riskAppetite: 30, d_socialEnergy: 55,
      pd_stressTolerance: 70, pd_leadershipStyle: 60, pd_conflictApproach: -1, pd_decisionSpeed: -1, pd_riskAppetite: -1, pd_socialEnergy: -1,
    },
  },
  {
    store: 'psych-profiles', key: '{TRIBE}:PUB_3',
    data: {
      memberId: 'PUB_3', tribeId: '{TRIBE}', archetype: 'Strategist',
      quizCompletedAt: '{NOW-10d}', lastUpdatedAt: '{NOW-10d}', peerRatingCount: 4,
      d_decisionSpeed: 65, d_stressTolerance: 80, d_leadershipStyle: 55,
      d_conflictApproach: 60, d_riskAppetite: 55, d_socialEnergy: 45,
      pd_stressTolerance: 78, pd_leadershipStyle: 52, pd_conflictApproach: 58, pd_decisionSpeed: -1, pd_riskAppetite: -1, pd_socialEnergy: -1,
    },
  },
  {
    store: 'psych-profiles', key: '{TRIBE}:PUB_4',
    data: {
      memberId: 'PUB_4', tribeId: '{TRIBE}', archetype: 'Connector',
      quizCompletedAt: '{NOW-8d}', lastUpdatedAt: '{NOW-8d}', peerRatingCount: 1,
      d_decisionSpeed: 50, d_stressTolerance: 62, d_leadershipStyle: 70,
      d_conflictApproach: 45, d_riskAppetite: 48, d_socialEnergy: 88,
      pd_stressTolerance: 60, pd_leadershipStyle: -1, pd_conflictApproach: -1, pd_decisionSpeed: -1, pd_riskAppetite: -1, pd_socialEnergy: -1,
    },
  },
  {
    store: 'psych-profiles', key: '{TRIBE}:PUB_5',
    data: {
      memberId: 'PUB_5', tribeId: '{TRIBE}', archetype: 'Scout',
      quizCompletedAt: '{NOW-5d}', lastUpdatedAt: '{NOW-5d}', peerRatingCount: 0,
      d_decisionSpeed: 75, d_stressTolerance: 68, d_leadershipStyle: 48,
      d_conflictApproach: 72, d_riskAppetite: 80, d_socialEnergy: 62,
      pd_stressTolerance: -1, pd_leadershipStyle: -1, pd_conflictApproach: -1, pd_decisionSpeed: -1, pd_riskAppetite: -1, pd_socialEnergy: -1,
    },
  },
]

const ALL_RECORDS = [...BASE_RECORDS, ...PSYCH_RECORDS]

// Force offline mode so the hook reads from IDB (not Convex)
const OFFLINE_LS: Record<string, () => string> = {
  'plusultra:offlineSince': () => String(Date.now() - 2 * 3600 * 1000),
}

export const flow: Flow = {
  id: 12,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Tribe Psych Overview',
  summary:
    'Tribe-level view of psychological profiles — archetype distribution, compatibility scores, and leadership psychology.',
  steps: [
    {
      n: 1,
      screen: 'Tribe Psychology — populated',
      route: '/tribe/{TRIBE}/psych',
      desc: 'Archetype distribution bar: Commander (1), Strategist (1), Connector (1), Sustainer (1), Scout (1). Members by archetype list with colored badges — Alex Rivera/Commander, Jordan Blake/Strategist, Maria Santos/Connector, Sam Chen/Sustainer, Kai Nakamura/Scout. Leadership psychology section shows Commander profile. Compatibility matrix links between members.',
      action: 'Scroll to see archetype distribution, member list, and compatibility scores. Tap a member to view their psych profile.',
      injectIDB: ALL_RECORDS,
      injectLocalStorage: OFFLINE_LS,
      note: 'Psych data reads from Gun/IDB when offline. The "Seed Data" button sets offline mode and injects profiles automatically.',
    },
  ],
}
