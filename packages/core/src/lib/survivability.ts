import type { SkillRole, ProficiencyLevel, MemberSkill, SkillDomain } from '../types/skills.js'
import type { Tribe, TribeMember } from '../types/tribe.js'
import { ROLE_REGISTRY, ROLE_BY_KEY, ROLES_BY_DOMAIN, DOMAINS_BY_TIER, slotsNeeded } from './role-registry.js'

// Re-export for backward compatibility
export const TIER_1_ROLES: SkillRole[] = ROLE_REGISTRY.filter(r => r.tier === 1).map(r => r.role)
export const TIER_2_ROLES: SkillRole[] = ROLE_REGISTRY.filter(r => r.tier === 2).map(r => r.role)
export const TIER_3_ROLES: SkillRole[] = ROLE_REGISTRY.filter(r => r.tier === 3).map(r => r.role)

const PROFICIENCY_WEIGHT: Record<ProficiencyLevel, number> = {
  basic: 0.5,
  intermediate: 0.75,
  expert: 1.0,
  verified_expert: 1.3,
}

// Score a single role (0.0 – 1.0)
export function roleScore(role: SkillRole, memberCount: number, skills: MemberSkill[]): number {
  const spec = ROLE_BY_KEY[role]
  if (!spec) return 0

  const needed = slotsNeeded(memberCount, spec)
  const qualified = skills.filter(s => s.role === role)

  // Role not yet needed at this population
  if (needed === 0) {
    return qualified.length > 0 ? Math.min(1, qualified.length / 3) : 1
  }

  if (qualified.length === 0) return 0

  const effectiveCount = qualified.reduce((sum, s) => sum + PROFICIENCY_WEIGHT[s.proficiency], 0)
  const ratio = effectiveCount / needed

  if (ratio === 0) return 0
  if (ratio < 1) return 0.6 * ratio
  if (ratio === 1) return 0.6
  return 0.6 + 0.4 * Math.min(1, (ratio - 1) / 2)
}

// Score an entire domain (average of its role scores)
export function domainScore(domain: SkillDomain, memberCount: number, skills: MemberSkill[]): number {
  const roles = ROLES_BY_DOMAIN[domain]
  if (!roles || roles.length === 0) return 0

  // Only score roles that are active at this population
  const active = roles.filter(r => slotsNeeded(memberCount, r) > 0)
  if (active.length === 0) return 1 // all roles below minPop — domain is "satisfied"

  const scores = active.map(r => roleScore(r.role, memberCount, skills))
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

// Keep backward-compatible bucketScore (now scores individual roles)
export function bucketScore(role: SkillRole, members: TribeMember[], skills: MemberSkill[]): number {
  return roleScore(role, members.length, skills)
}

export function survivabilityScore(_tribe: Tribe, members: TribeMember[], skills: MemberSkill[]): number {
  const n = members.length
  if (n === 0) return 0

  const tier1Domains = DOMAINS_BY_TIER[0] // medical, food, security, water
  const tier2Domains = DOMAINS_BY_TIER[1] // energy, construction, comms, logistics
  const tier3Domains = DOMAINS_BY_TIER[2] // knowledge, governance, craft

  const tier1Scores = tier1Domains.map(d => domainScore(d, n, skills))
  const tier2Scores = tier2Domains.map(d => domainScore(d, n, skills))
  const tier3Scores = tier3Domains.map(d => domainScore(d, n, skills))

  const tier1Min = Math.min(...tier1Scores)
  const tier1Avg = tier1Scores.reduce((a, b) => a + b, 0) / tier1Scores.length
  const tier2Avg = tier2Scores.reduce((a, b) => a + b, 0) / tier2Scores.length
  const tier3Avg = tier3Scores.reduce((a, b) => a + b, 0) / tier3Scores.length

  const raw = (tier1Avg * 0.6) + (tier2Avg * 0.3) + (tier3Avg * 0.1)
  const score = Math.round(raw * 100)

  // If any Tier 1 domain is at zero, cap the score
  return tier1Min === 0 ? Math.min(25, score) : score
}
