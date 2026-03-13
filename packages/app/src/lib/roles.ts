import type { SkillRole, SkillDomain, RoleSpec } from '@plus-ultra/core'
import { ROLE_BY_KEY, ROLES_BY_DOMAIN, DOMAINS_BY_TIER, DOMAIN_META } from '@plus-ultra/core'

// Re-export for convenience
export type { RoleSpec }
export { ROLE_BY_KEY, ROLES_BY_DOMAIN, DOMAINS_BY_TIER, DOMAIN_META }

// Backward-compat alias
export type RoleMeta = RoleSpec

export const ROLE_META = ROLE_BY_KEY

export function getRoleMeta(role: SkillRole): RoleSpec {
  return ROLE_BY_KEY[role]
}

// Group all roles by domain, organized by tier (for the skills declaration screen)
export function getRolesByDomainByTier(): { tier: 1 | 2 | 3; domains: { domain: SkillDomain; label: string; icon: string; roles: RoleSpec[] }[] }[] {
  return DOMAINS_BY_TIER.map((domains, tierIdx) => ({
    tier: (tierIdx + 1) as 1 | 2 | 3,
    domains: domains.map(d => ({
      domain: d,
      label: DOMAIN_META[d].label,
      icon: DOMAIN_META[d].icon,
      roles: ROLES_BY_DOMAIN[d],
    })),
  }))
}
