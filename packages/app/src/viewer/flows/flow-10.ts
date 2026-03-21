import type { Flow } from '../types'

const RECORDS = [
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
    data: { pubkey: 'PUB_3', tribeId: '{TRIBE}', joinedAt: '{NOW-20d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 0.85, memberType: 'adult', authorityRole: 'lead', displayName: 'Jordan Blake', epub: 'dummy_epub_3' },
  },
  // Self skills — drives station assignment
  {
    store: 'skills', key: '{TRIBE}:{SELF_PUB}__paramedic',
    data: { memberId: '{SELF_PUB}', tribeId: '{TRIBE}', role: 'paramedic', proficiency: 'expert', declaredAt: '{NOW-60d}', vouchedBy: ['PUB_3'], yearsExperience: '3–7 years' },
  },
  {
    store: 'skills', key: '{TRIBE}:{SELF_PUB}__ham_radio_operator',
    data: { memberId: '{SELF_PUB}', tribeId: '{TRIBE}', role: 'ham_radio_operator', proficiency: 'intermediate', declaredAt: '{NOW-45d}', vouchedBy: [], yearsExperience: '1–3 years' },
  },
  // Other members' skills (for gap/coverage calculations)
  {
    store: 'skills', key: '{TRIBE}:PUB_2__farmer',
    data: { memberId: 'PUB_2', tribeId: '{TRIBE}', role: 'farmer', proficiency: 'expert', declaredAt: '{NOW-50d}', vouchedBy: ['{SELF_PUB}'] },
  },
  {
    store: 'skills', key: '{TRIBE}:PUB_3__tactical_shooter',
    data: { memberId: 'PUB_3', tribeId: '{TRIBE}', role: 'tactical_shooter', proficiency: 'intermediate', declaredAt: '{NOW-40d}', vouchedBy: [] },
  },
]

export const flow: Flow = {
  id: 10,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'View My Station',
  summary:
    "Shows the member's assigned station based on declared skills, with domain coverage, team members, gaps, and cross-training recommendations.",
  steps: [
    {
      n: 1,
      screen: 'My Station — populated',
      route: '/tribe/{TRIBE}/station',
      desc: 'Station card shows Alex Rivera\'s roles: Paramedic (Expert) in Medical domain, HAM Radio Operator (Intermediate) in Comms domain. Domain coverage bars for Medical and Comms. Team section shows members sharing these domains. Gaps section lists unfilled critical roles. Cross-training recommendations at the bottom.',
      action: 'Scroll to see domain coverage, team members, gaps, and cross-training suggestions.',
      injectIDB: RECORDS,
    },
  ],
}
