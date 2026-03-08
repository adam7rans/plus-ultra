export type SkillRole =
  | 'medical'
  | 'food_production'
  | 'security_tactical'
  | 'water_plumbing'
  | 'electrical_solar'
  | 'construction'
  | 'cooking_preservation'
  | 'comms_tech'
  | 'teaching'
  | 'strategy_leadership'
  | 'drone_surveillance'
  | 'hardware_repair'

export type ProficiencyLevel = 'basic' | 'intermediate' | 'expert' | 'verified_expert'

export interface MemberSkill {
  memberId: string      // pubkey
  tribeId: string
  role: SkillRole
  proficiency: ProficiencyLevel
  declaredAt: number
  vouchedBy: string[]   // pubkeys of vouching members
}
