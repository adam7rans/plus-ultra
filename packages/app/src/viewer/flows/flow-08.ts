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
]

const SELF_MEMBER = {
  store: 'members', key: '{TRIBE}:{SELF_PUB}',
  data: {
    pubkey: '{SELF_PUB}', tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', lastSeen: '{NOW}',
    status: 'active', attachmentScore: 1.0, memberType: 'adult', authorityRole: 'founder',
    displayName: 'Alex Rivera', epub: 'dummy_epub_key',
    bio: 'Wilderness medic and former EMT. Building resilient systems for community health.',
    availability: 'full_time', physicalLimitations: 'None',
    healthStatus: 'well', bloodType: 'O+', allergies: ['Penicillin'], medications: [], medicalConditions: [],
  },
}

const OTHER_MEMBERS = [
  {
    store: 'members', key: '{TRIBE}:PUB_2',
    data: { pubkey: 'PUB_2', tribeId: '{TRIBE}', joinedAt: '{NOW-25d}', lastSeen: '{NOW-1d}', status: 'active', attachmentScore: 0.9, memberType: 'adult', authorityRole: 'member', displayName: 'Sam Chen', epub: 'dummy_epub_2', bio: 'Third-generation farmer with permaculture training.', availability: 'part_time' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_3',
    data: { pubkey: 'PUB_3', tribeId: '{TRIBE}', joinedAt: '{NOW-20d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 0.85, memberType: 'adult', authorityRole: 'lead', displayName: 'Jordan Blake', epub: 'dummy_epub_3' },
  },
]

const SKILL_RECORDS = [
  {
    store: 'skills', key: '{TRIBE}:{SELF_PUB}__paramedic',
    data: { memberId: '{SELF_PUB}', tribeId: '{TRIBE}', role: 'paramedic', proficiency: 'expert', declaredAt: '{NOW-60d}', vouchedBy: ['PUB_3'], yearsExperience: '3–7 years', notes: 'Certified paramedic, 5 years EMS' },
  },
  {
    store: 'skills', key: '{TRIBE}:{SELF_PUB}__ham_radio_operator',
    data: { memberId: '{SELF_PUB}', tribeId: '{TRIBE}', role: 'ham_radio_operator', proficiency: 'intermediate', declaredAt: '{NOW-45d}', vouchedBy: [], yearsExperience: '1–3 years' },
  },
  {
    store: 'skills', key: '{TRIBE}:{SELF_PUB}__tactical_shooter',
    data: { memberId: '{SELF_PUB}', tribeId: '{TRIBE}', role: 'tactical_shooter', proficiency: 'basic', declaredAt: '{NOW-20d}', vouchedBy: [] },
  },
  {
    store: 'skills', key: '{TRIBE}:PUB_2__farmer',
    data: { memberId: 'PUB_2', tribeId: '{TRIBE}', role: 'farmer', proficiency: 'expert', declaredAt: '{NOW-50d}', vouchedBy: ['{SELF_PUB}', 'PUB_3'], yearsExperience: '7+ years' },
  },
]

const IDENTITY_RECORD = {
  store: 'identity', key: 'keypair',
  data: { pub: '{SELF_PUB}', priv: 'dummy_priv_key', epub: 'dummy_epub_key', epriv: 'dummy_epriv_key', createdAt: '{NOW-30d}', backedUp: true, displayName: 'Alex Rivera' },
}

const ALL_RECORDS = [...BASE_RECORDS, IDENTITY_RECORD, SELF_MEMBER, ...OTHER_MEMBERS, ...SKILL_RECORDS]

export const flow: Flow = {
  id: 8,
  section: 'Daily Ops — Profile & People',
  mode: 'Both',
  title: 'Update Member Profile',
  summary:
    'Members can view and edit their bio, availability, health info, and skills. Leaders can view other members\' profiles and manage authority roles.',
  steps: [
    {
      n: 1,
      screen: 'My Profile — populated view',
      route: '/tribe/{TRIBE}/member/{SELF_PUB}',
      desc: 'Full profile card for Alex Rivera (Founder). Shows authority badge, health status (Well · O+), skills list (Paramedic · Expert · vouched, HAM Radio Operator · Intermediate, Tactical Shooter · Basic), bio, and availability. "Edit Profile" button visible because this is your own profile.',
      action: 'Scroll to see all profile sections. Tap "Edit Profile" to open edit mode.',
      injectIDB: ALL_RECORDS,
    },
    {
      n: 2,
      screen: 'My Profile — edit mode',
      route: '/tribe/{TRIBE}/member/{SELF_PUB}',
      desc: 'Edit mode active (tap "Edit Profile" from step 1). Bio textarea, availability dropdown, physical limitations field, blood type selector, and allergy/medication chip inputs all become editable. "Save" and "Cancel" buttons appear.',
      action: 'Modify the bio or availability. Tap "Save" to persist changes.',
      injectIDB: ALL_RECORDS,
      note: 'Edit mode is triggered by tapping "Edit Profile" — the iframe loads with populated data; click the button to see the edit form.',
    },
    {
      n: 3,
      screen: 'Other Member Profile — Sam Chen',
      route: '/tribe/{TRIBE}/member/PUB_2',
      desc: 'Profile for Sam Chen (member). No "Edit Profile" button (not your profile). Shows Farmer · Expert skill (vouched by 2 members). Peer rating sliders visible at the bottom (stress resilience, leadership, conflict resolution). Vouch button on unverified skills.',
      action: 'Scroll to peer rating section. Adjust sliders and tap "Submit Rating".',
      injectIDB: ALL_RECORDS,
    },
  ],
}
