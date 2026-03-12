import type { SkillRole } from './skills.js'

export type MemberType = 'adult' | 'dependent' | 'child' | 'elder'

// Organizational authority — separate from skill roles (capabilities)
export type AuthorityRole = 'founder' | 'elder_council' | 'lead' | 'member' | 'restricted'

export interface Tribe {
  id: string
  pub: string             // tribe's Gun SEA public key
  priv: string            // tribe's private key — stored only on founder's device initially
  name: string
  location: string        // city / region, plain text
  region: string          // e.g. "texas", "california" — for tier 2 grouping later
  createdAt: number
  constitutionTemplate: 'direct_democracy' | 'council' | 'hybrid'
  founderId: string       // public key of the founder
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
}
