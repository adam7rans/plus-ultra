import type { Flow } from '../types'

export const flow: Flow = {
  id: 37,
  section: 'Communication',
  mode: 'Both',
  title: 'Training — Record Certification',
  summary:
    'Members record external certifications (First Aid, HAM Radio, etc.) which increase their proficiency tier.',
  steps: [
    {
      n: 1,
      screen: 'Training Screen — Certifications',
      route: '/tribe/{TRIBE}/training',
      desc: 'Certifications tab or section. "Add Certification" button. Form: cert name, issuing body, date earned, expiry, related skill domain, photo upload.',
      action: 'Tap the "Cert" tab. Tap "Add Certification". Fill in details. Save.',
      note: 'Tap the "Cert" tab or button on the training screen to see the certifications section.',
      injectIDB: [
        {
          store: 'certifications',
          key: '{TRIBE}:cert001',
          data: {
            id: 'cert001',
            tribeId: '{TRIBE}',
            memberPub: '{SELF_PUB}',
            name: 'CPR/AED Certification',
            issuingBody: 'American Red Cross',
            domain: 'medical',
            earnedAt: '{NOW-60d}',
            expiresAt: '{NOW+730d}',
            verified: true,
            verifiedBy: 'dummy_pub_3_jordan_blake',
          },
        },
        {
          store: 'certifications',
          key: '{TRIBE}:cert002',
          data: {
            id: 'cert002',
            tribeId: '{TRIBE}',
            memberPub: 'dummy_pub_3_jordan_blake',
            name: 'Wilderness First Responder',
            issuingBody: 'NOLS',
            domain: 'medical',
            earnedAt: '{NOW-365d}',
            expiresAt: '{NOW+1095d}',
            verified: false,
          },
        },
        {
          store: 'certifications',
          key: '{TRIBE}:cert003',
          data: {
            id: 'cert003',
            tribeId: '{TRIBE}',
            memberPub: 'dummy_pub_2_sam_chen',
            name: 'HAM Technician License',
            issuingBody: 'FCC/ARRL',
            domain: 'comms',
            earnedAt: '{NOW-90d}',
            expiresAt: '{NOW+3650d}',
            verified: true,
            verifiedBy: '{SELF_PUB}',
          },
        },
      ],
    },
  ],
}
