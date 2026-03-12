import type { MemberType } from './tribe.js'

// ── Domains ────────────────────────────────────────────────────────
export type SkillDomain =
  | 'medical'
  | 'food'
  | 'security'
  | 'water'
  | 'energy'
  | 'construction'
  | 'comms'
  | 'logistics'
  | 'knowledge'
  | 'governance'
  | 'craft'

// ── Every specific role ────────────────────────────────────────────
export type SkillRole =
  // Medical
  | 'physician'
  | 'nurse'
  | 'paramedic'
  | 'dentist'
  | 'midwife'
  | 'veterinarian'
  | 'pharmacist'
  // Food & Agriculture
  | 'farmer'
  | 'livestock_handler'
  | 'hunter'
  | 'fisherman'
  | 'forager'
  | 'beekeeper'
  | 'butcher'
  | 'seed_saver'
  | 'food_preserver'
  // Security & Defense
  | 'tactical_shooter'
  | 'squad_leader'
  | 'strategic_commander'
  | 'sniper'
  | 'combat_medic'
  | 'intel_recon'
  | 'armorer'
  | 'k9_handler'
  // Water
  | 'well_driller'
  | 'water_treatment'
  | 'plumber'
  // Energy & Power
  | 'electrician'
  | 'solar_tech'
  | 'generator_mechanic'
  | 'battery_specialist'
  // Construction & Engineering
  | 'carpenter'
  | 'mason'
  | 'welder'
  | 'heavy_equipment_operator'
  | 'structural_engineer'
  | 'blacksmith'
  | 'surveyor'
  // Communications & Technology
  | 'ham_radio_operator'
  | 'network_engineer'
  | 'sigint'
  | 'cryptographer'
  | 'drone_pilot'
  // Logistics & Supply
  | 'cook'
  | 'quartermaster'
  | 'vehicle_mechanic'
  | 'fuel_specialist'
  // Knowledge & Training
  | 'teacher'
  | 'skills_trainer'
  | 'historian'
  | 'chaplain'
  // Governance & Administration
  | 'strategic_planner'
  | 'mediator'
  | 'scribe'
  | 'diplomat'
  // Craft & Sustainability
  | 'seamstress'
  | 'cobbler'
  | 'potter'
  | 'soapmaker'
  | 'brewer'

export type ProficiencyLevel = 'basic' | 'intermediate' | 'expert' | 'verified_expert'

export type ScalingCurve = 'linear' | 'sqrt' | 'log' | 'fixed'

export interface RoleSpec {
  role: SkillRole
  domain: SkillDomain
  tier: 1 | 2 | 3
  label: string
  description: string
  icon: string
  curve: ScalingCurve
  base: number         // minimum regardless of population
  ratio: number        // for linear: 1 per ratio people (ignored for other curves)
  minPop: number       // role not needed below this population
  cap: number          // 0 = no cap
}

export interface MemberSkill {
  memberId: string      // pubkey
  tribeId: string
  role: SkillRole
  proficiency: ProficiencyLevel
  declaredAt: number
  vouchedBy: string[]   // pubkeys of vouching members
}

// ── Specialization registry types ──────────────────────────────────

export interface Specialization {
  key: string
  label: string
  description?: string
}

export interface RoleSpecializations {
  role: SkillRole
  specializations: Specialization[]
  experienceOptions?: string[]  // custom experience labels if different from default
}

export interface MemberProfile {
  displayName: string
  photo?: string              // base64 data URL or blob URL
  memberType: MemberType      // 'adult' | 'dependent' | 'child' | 'elder'
  availability: 'full_time' | 'part_time' | 'on_call'
  physicalLimitations?: string
  bio?: string
}

export interface SkillDeclaration {
  role: SkillRole
  proficiency: ProficiencyLevel
  specializations: string[]    // keys from Specialization
  yearsExperience: number
  notes?: string
}
