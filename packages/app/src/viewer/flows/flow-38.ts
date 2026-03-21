import type { Flow } from '../types'

export const flow: Flow = {
  id: 38,
  section: 'Communication',
  mode: 'Both',
  title: 'Training — Approve Level-Up',
  summary: 'Tribe admin reviews member certification submissions and approves or rejects skill level upgrades.',
  steps: [
    {
      n: 1,
      screen: 'Training Screen — Pending Approvals',
      route: '/tribe/{TRIBE}/training',
      desc: 'Pending approvals section (admin only). Cert submission card with member name, cert details, photo. Approve / Reject buttons.',
      action: 'Review pending certification submission. Tap Approve.',
      note: 'The pending approvals section is visible to admins only when there are submissions awaiting review.',
      injectIDB: [
        {
          store: 'certifications',
          key: '{TRIBE}:cert004',
          data: {
            id: 'cert004',
            tribeId: '{TRIBE}',
            memberPub: 'dummy_pub_2_sam_chen',
            name: 'Emergency Medical Technician (EMT-Basic)',
            issuingBody: 'Virginia OEMS',
            domain: 'medical',
            earnedAt: '{NOW-14d}',
            expiresAt: '{NOW+730d}',
            verified: false,
            submittedForReview: true,
            submittedAt: '{NOW-2d}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:{SELF_PUB}',
          data: {
            pubkey: '{SELF_PUB}',
            tribeId: '{TRIBE}',
            displayName: 'Alex Rivera',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'founder',
            availability: 'full_time',
            joinedAt: '{NOW-7d}',
          },
        },
        {
          store: 'members',
          key: '{TRIBE}:dummy_pub_2_sam_chen',
          data: {
            pubkey: 'dummy_pub_2_sam_chen',
            tribeId: '{TRIBE}',
            displayName: 'Sam Chen',
            memberType: 'adult',
            status: 'active',
            authorityRole: 'member',
            availability: 'part_time',
            joinedAt: '{NOW-5d}',
          },
        },
      ],
    },
  ],
}
