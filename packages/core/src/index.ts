// Types
export type { Identity } from './types/identity.js'
export type { Tribe, TribeMember, MemberType, AuthorityRole } from './types/tribe.js'
export type { SkillRole, SkillDomain, ScalingCurve, ProficiencyLevel, MemberSkill, RoleSpec, Specialization, RoleSpecializations, MemberProfile, SkillDeclaration } from './types/skills.js'
export type { Message, QueuedMessage, MessageType } from './types/messaging.js'
export type { AssetCategory, AssetType, AssetUnit, AssetScalingCurve, AssetSpec, TribeAsset } from './types/assets.js'
export type { EventType, RecurrenceFrequency, RecurrenceRule, ScheduledEvent } from './types/events.js'
export type { TribeScale, ScaleLevel } from './lib/tribe-scale.js'

// Role registry & scaling
export {
  ROLE_REGISTRY, ROLE_BY_KEY, ALL_ROLES,
  ROLES_BY_TIER, ROLES_BY_DOMAIN, DOMAINS_BY_TIER, DOMAIN_META,
  slotsNeeded, totalSlotsNeeded, activeRoles,
} from './lib/role-registry.js'

// Specialization registry
export {
  DEFAULT_EXPERIENCE_OPTIONS,
  SPECIALIZATION_REGISTRY, SPECIALIZATIONS_BY_ROLE,
  getSpecializationsForRole,
} from './lib/specialization-registry.js'

// Asset registry & scaling
export {
  ASSET_REGISTRY, ASSET_BY_KEY, ALL_ASSETS,
  ASSETS_BY_CATEGORY, CATEGORY_META, CATEGORY_ORDER,
  assetsNeeded, assetsSummary, assetReadiness,
} from './lib/asset-registry.js'

// Tribe scale
export {
  SCALE_LEVELS,
  getTribeScale, getNextScale, scaleProgress,
} from './lib/tribe-scale.js'

// Role affinity & inventory permissions
export {
  getAffinityDomains, getAffinityAssets,
  canEditInventory, getEditableCategories,
} from './lib/role-affinity.js'

// Authority & permissions
export {
  AUTHORITY_META, ALL_AUTHORITY_ROLES,
  getAuthority, outranks, hasAuthority,
  getLeadDomains, canCreateEvent, canCreateAnyEvent,
  canEditEvent, canManageRoles, canSetAuthority, assignableRoles,
} from './lib/permissions.js'

// Event registry & helpers
export {
  EVENT_TYPE_META, ALL_EVENT_TYPES,
  expandOccurrences, getNowAndUpcoming,
  relativeTimeLabel, formatTime,
  dayBounds, weekBounds, monthBounds,
} from './lib/event-registry.js'
export type { EventTypeMeta } from './lib/event-registry.js'

// Algorithms
export { survivabilityScore, bucketScore, roleScore, domainScore, TIER_1_ROLES, TIER_2_ROLES, TIER_3_ROLES } from './lib/survivability.js'
export { currentAttachmentScore } from './lib/membership.js'
