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
]

export const flow: Flow = {
  id: 11,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Psych Assessment',
  summary:
    'Members complete a psychological readiness assessment covering stress responses, conflict style, decision-making, and team role preferences. Results generate a PsychArchetype and radar profile.',
  steps: [
    {
      n: 1,
      screen: 'Psych Assessment — question form',
      route: '/tribe/{TRIBE}/psych/assessment',
      desc: 'Multi-question form grouped by dimension: Decision Speed, Stress Tolerance, Leadership Style, Conflict Approach, Risk Appetite, Social Energy. Each question offers 4 options (A–D). Progress indicator at top. "Submit Assessment" button appears after all questions are answered.',
      action: 'Answer each question. Tap "Submit Assessment" to generate your PsychArchetype.',
      injectIDB: BASE_RECORDS,
    },
  ],
}
