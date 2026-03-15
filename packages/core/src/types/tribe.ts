import type { SkillRole } from './skills.js'

export type MemberType = 'adult' | 'dependent' | 'child' | 'elder'

export type HealthStatus = 'well' | 'minor_injury' | 'major_injury' | 'critical' | 'deceased'

// Organizational authority — separate from skill roles (capabilities)
export type AuthorityRole = 'founder' | 'elder_council' | 'lead' | 'member' | 'restricted'

export interface Tribe {
  id: string
  pub: string             // tribe's Gun SEA public key
  priv: string            // tribe's private key — stored only on founder's device initially
  epub?: string           // tribe's encryption public key — shared in contact cards for federation
  name: string
  location: string        // city / region, plain text
  region: string          // e.g. "texas", "california" — for tier 2 grouping later
  createdAt: number
  constitutionTemplate: 'direct_democracy' | 'council' | 'hybrid'
  founderId: string       // public key of the founder
  lat?: number            // optional home coordinate
  lng?: number
}

export interface TribeMember {
  pubkey: string          // member's Gun SEA public key
  tribeId: string
  joinedAt: number
  lastSeen: number
  status: 'active' | 'away_declared' | 'away_undeclared' | 'departed'
  attachmentScore: number // 0.0 to 1.0
  declaredReturnAt?: number
  memberType: MemberType  // adult, child, elder, dependent
  authorityRole?: AuthorityRole  // organizational authority (default: 'member')
  role?: SkillRole
  displayName: string
  epub?: string
  isDiplomat?: boolean         // can initiate/participate in inter-tribe federation
  // Profile fields (collected during onboarding)
  bio?: string
  photo?: string               // base64 data URL — stored in IDB only, not synced via Gun
  availability?: 'full_time' | 'part_time' | 'on_call'
  physicalLimitations?: string
  // Health / medical fields
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown'
  allergies?: string[]
  medications?: string[]        // critical ongoing medications
  medicalConditions?: string[]  // relevant to emergency response
  currentHealthStatus?: HealthStatus
  healthStatusUpdatedAt?: number
  healthStatusUpdatedBy?: string  // memberPub (self, medic, or elder_council)
}
