import type { AuthorityRole, Tribe, TribeMember } from '../types/tribe.js'
import type { SkillDomain } from '../types/skills.js'
import type { EventType, ScheduledEvent } from '../types/events.js'
import { ROLE_BY_KEY } from './role-registry.js'

// ── Authority hierarchy ────────────────────────────────────────────

const AUTHORITY_RANK: Record<AuthorityRole, number> = {
  founder:       4,
  elder_council: 3,
  lead:          2,
  member:        1,
  restricted:    0,
}

export const AUTHORITY_META: Record<AuthorityRole, { label: string; icon: string; description: string }> = {
  founder:       { label: 'Founder',       icon: '👑', description: 'Created the tribe. Cannot be revoked.' },
  elder_council: { label: 'Elder Council', icon: '🏛️', description: 'Full admin — can appoint/revoke, create all events.' },
  lead:          { label: 'Lead',          icon: '⭐', description: 'Domain lead — can create events and manage their area.' },
  member:        { label: 'Member',        icon: '👤', description: 'Can create personal events.' },
  restricted:    { label: 'Restricted',    icon: '🔒', description: 'Probationary — read-only until promoted.' },
}

export const ALL_AUTHORITY_ROLES: AuthorityRole[] = ['founder', 'elder_council', 'lead', 'member', 'restricted']

/** Get the effective authority role for a member (defaults to 'member') */
export function getAuthority(member: TribeMember, tribe?: Tribe): AuthorityRole {
  // Founder is always founder, regardless of what's stored
  if (tribe && member.pubkey === tribe.founderId) return 'founder'
  return member.authorityRole ?? 'member'
}

/** Check if one authority outranks another */
export function outranks(a: AuthorityRole, b: AuthorityRole): boolean {
  return AUTHORITY_RANK[a] > AUTHORITY_RANK[b]
}

/** Check if authority is at least the given level */
export function hasAuthority(role: AuthorityRole, minLevel: AuthorityRole): boolean {
  return AUTHORITY_RANK[role] >= AUTHORITY_RANK[minLevel]
}

// ── Event type → domain mapping ────────────────────────────────────

const EVENT_TYPE_DOMAINS: Record<EventType, SkillDomain | null> = {
  meal:        'food',
  watch:       'security',
  duty:        null,          // generic — no single domain
  medical:     'medical',
  training:    'knowledge',
  social:      null,
  maintenance: 'construction',
  comms:       'comms',
  alert:       'security',
  personal:    null,
}

// ── Permission checks ──────────────────────────────────────────────

/** Get the domains a lead is responsible for (based on their skill roles) */
export function getLeadDomains(member: TribeMember, skills: { memberId: string; role: string }[]): SkillDomain[] {
  const mySkills = skills.filter(s => s.memberId === member.pubkey)
  const domains = new Set<SkillDomain>()
  for (const s of mySkills) {
    const spec = ROLE_BY_KEY[s.role as keyof typeof ROLE_BY_KEY]
    if (spec) domains.add(spec.domain)
  }
  return Array.from(domains)
}

/** Can this member create events of a given type? */
export function canCreateEvent(
  member: TribeMember,
  eventType: EventType,
  tribe: Tribe,
  skills: { memberId: string; role: string }[],
): boolean {
  const auth = getAuthority(member, tribe)

  // Restricted can't create anything
  if (auth === 'restricted') return false

  // Founder + elder_council can create any event
  if (hasAuthority(auth, 'elder_council')) return true

  // Personal events: any member can create
  if (eventType === 'personal') return true

  // Leads can create events in their domain (or domain-less types like duty/social)
  if (auth === 'lead') {
    const eventDomain = EVENT_TYPE_DOMAINS[eventType]
    if (eventDomain === null) return true  // generic types
    const leadDomains = getLeadDomains(member, skills)
    return leadDomains.includes(eventDomain)
  }

  // Regular members can only create personal events (handled above)
  return false
}

/** Can this member create any tribe-wide event? (for showing/hiding the + button) */
export function canCreateAnyEvent(
  member: TribeMember,
  tribe: Tribe,
  _skills: { memberId: string; role: string }[],
): boolean {
  const auth = getAuthority(member, tribe)
  if (auth === 'restricted') return false
  // Members can at least create personal events
  return true
}

/** Can this member edit/cancel a specific event? */
export function canEditEvent(
  member: TribeMember,
  event: ScheduledEvent,
  tribe: Tribe,
  skills: { memberId: string; role: string }[],
): boolean {
  const auth = getAuthority(member, tribe)

  // Restricted can't edit anything
  if (auth === 'restricted') return false

  // Founder + elder_council can edit any event
  if (hasAuthority(auth, 'elder_council')) return true

  // Anyone can edit their own events
  if (event.createdBy === member.pubkey) return true

  // Leads can edit events in their domain
  if (auth === 'lead') {
    const eventDomain = EVENT_TYPE_DOMAINS[event.type]
    if (eventDomain === null) return true
    const leadDomains = getLeadDomains(member, skills)
    return leadDomains.includes(eventDomain)
  }

  return false
}

/** Can this member appoint/revoke authority roles on others? */
export function canManageRoles(
  actor: TribeMember,
  tribe: Tribe,
): boolean {
  const auth = getAuthority(actor, tribe)
  return hasAuthority(auth, 'elder_council')
}

/** Can this member set a target to a specific authority role? */
export function canSetAuthority(
  actor: TribeMember,
  target: TribeMember,
  newRole: AuthorityRole,
  tribe: Tribe,
): boolean {
  // Can't change the founder's role
  if (target.pubkey === tribe.founderId) return false

  // Can't set someone to founder
  if (newRole === 'founder') return false

  const actorAuth = getAuthority(actor, tribe)
  const targetAuth = getAuthority(target, tribe)

  // Must be elder_council+ to manage roles
  if (!hasAuthority(actorAuth, 'elder_council')) return false

  // Can't promote someone to your own level or above (unless you're founder)
  if (actorAuth !== 'founder' && AUTHORITY_RANK[newRole] >= AUTHORITY_RANK[actorAuth]) return false

  // Can't demote someone at your own level or above (unless you're founder)
  if (actorAuth !== 'founder' && AUTHORITY_RANK[targetAuth] >= AUTHORITY_RANK[actorAuth]) return false

  return true
}

/** Can this member view full health data (blood type, allergies, medications, conditions)? */
export function canViewFullHealth(authority: AuthorityRole, memberRole?: import('../types/skills.js').SkillRole): boolean {
  if (hasAuthority(authority, 'elder_council')) return true
  if (memberRole) {
    const spec = ROLE_BY_KEY[memberRole as keyof typeof ROLE_BY_KEY]
    if (spec?.domain === 'medical') return true
  }
  return false
}

/** Can this member initiate or participate in inter-tribe federation? */
export function canDiplomatize(member: TribeMember, tribe: Tribe): boolean {
  const auth = getAuthority(member, tribe)
  // Founders are always able to diplomatize
  if (auth === 'founder') return true
  // Explicitly designated diplomats can too
  return member.isDiplomat === true
}

/** Which roles can an actor assign to a target? */
export function assignableRoles(
  actor: TribeMember,
  target: TribeMember,
  tribe: Tribe,
): AuthorityRole[] {
  return ALL_AUTHORITY_ROLES.filter(role =>
    role !== 'founder' && canSetAuthority(actor, target, role, tribe)
  )
}
