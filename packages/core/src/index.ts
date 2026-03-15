// Types
export type { LatLng, TribeMapPin, PatrolRoute, TribeTerritory, PinAssetType } from './types/map.js'
export { PINNABLE_ASSET_TYPES } from './types/map.js'
export type { Identity } from './types/identity.js'
export type { Tribe, TribeMember, MemberType, AuthorityRole, HealthStatus } from './types/tribe.js'
export type { SkillRole, SkillDomain, ScalingCurve, ProficiencyLevel, MemberSkill, RoleSpec, Specialization, RoleSpecializations, MemberProfile, SkillDeclaration } from './types/skills.js'
export type { Message, QueuedMessage, MessageType } from './types/messaging.js'
export type { AssetCategory, AssetType, AssetUnit, AssetScalingCurve, AssetSpec, TribeAsset } from './types/assets.js'
export type { EventType, RecurrenceFrequency, RecurrenceRule, ScheduledEvent } from './types/events.js'
export type { Proposal, Vote, ProposalComment, ProposalScope, ProposalStatus, ProposalOutcome, VoteChoice } from './types/proposals.js'
export type { TrainingSession, MemberCertification } from './types/training.js'
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

// Governance & voting
export {
  proposalDuration, isExpired, canVote, eligibleVoters, quorumRequired, computeOutcome,
} from './lib/governance.js'

// Authority & permissions
export {
  AUTHORITY_META, ALL_AUTHORITY_ROLES,
  getAuthority, outranks, hasAuthority,
  getLeadDomains, canCreateEvent, canCreateAnyEvent,
  canEditEvent, canManageRoles, canSetAuthority, assignableRoles,
  canViewFullHealth,
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

// Training & skill progression
export { LEVEL_UP_CRITERIA, getTrainingHoursForSkill, checkLevelUpEligibility } from './lib/training-criteria.js'
export type { LevelUpEligibilityResult } from './lib/training-criteria.js'

// Federation
export type {
  FederationRelationship, FederationRelationshipStatus,
  FederatedMessage, FederatedTradeProposal, FederatedAlert,
  TradeItem, TradeStatus,
} from './types/federation.js'
export { canDiplomatize } from './lib/permissions.js'

// Consumption tracking
export type { ConsumptionEntry } from './types/consumption.js'
export {
  computeBurnRate, computeDaysRemaining,
  getDepletionStatus, DEPLETION_THRESHOLDS,
} from './lib/consumption-rate.js'
export type { DepletionStatus } from './lib/consumption-rate.js'

// Production tracking
export type { ProductionEntry } from './types/production.js'
export { computeProductionRate, computeNetRate, computeNetDaysRemaining } from './lib/production-rate.js'

// Roll call / muster
export type { MusterCall, MusterResponse, MusterStatus, MusterReason } from './types/rollcall.js'
export { MUSTER_STATUS_META, MUSTER_REASON_META } from './types/rollcall.js'

// External contacts
export type { ExternalContact, ContactCategory } from './types/contacts.js'

// Comms / PACE plan
export type {
  CommsLevel, CommsMethod, PaceMethod, CheckInSchedule, RallyPoint, TribePacePlan,
} from './types/comms.js'

// Psychological profiling
export type { PsychDimensions, PsychArchetype, PsychProfile, PeerRating } from './types/psych.js'
export {
  scoreQuiz, computeArchetype, mergeProfileDimensions,
  toBigFive, roleFitScore, compatibilityScore,
} from './lib/psych-engine.js'
export type { BigFiveScores } from './lib/psych-engine.js'

// Goals & Tasks
export type {
  GoalHorizon, GoalStatus, TaskStatus, TaskPriority,
  TribeGoal, GoalMilestone, TribeTask,
} from './types/goals.js'
export { TASK_STATUS_META, TASK_PRIORITY_META, GOAL_STATUS_META } from './types/goals.js'

// Bug-Out Planning
export type { BugOutStatus, BugOutVehicle, LoadPriority, BugOutPlan } from './types/bugout.js'

// Knowledge Base / Docs
export type { DocCategory, DocStatus, TribeDoc } from './types/docs.js'

// Finance
export type { ExpenseCategory, TribeExpense, FundContribution } from './types/finance.js'

// Readiness
export type { ReadinessFactor, ReadinessDimensionResult, CompositeReadinessReport, ReadinessInput } from './types/readiness.js'
export { computeCompositeReadiness } from './lib/readiness.js'

// Grid-Down operational mode
export type { GridMode, GridState } from './types/grid-state.js'
