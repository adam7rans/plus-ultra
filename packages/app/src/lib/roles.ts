import type { SkillRole } from '@plus-ultra/core'
import { TIER_1_ROLES, TIER_2_ROLES, TIER_3_ROLES } from '@plus-ultra/core'

export interface RoleMeta {
  role: SkillRole
  label: string
  description: string
  tier: 1 | 2 | 3
  icon: string
}

export const ROLE_META: Record<SkillRole, RoleMeta> = {
  medical: {
    role: 'medical',
    label: 'Medical',
    description: 'Doctors, nurses, EMTs, paramedics',
    tier: 1,
    icon: '🏥',
  },
  food_production: {
    role: 'food_production',
    label: 'Food Production',
    description: 'Farmers, gardeners, hunters, foragers',
    tier: 1,
    icon: '🌱',
  },
  security_tactical: {
    role: 'security_tactical',
    label: 'Security / Tactical',
    description: 'Ex-military, law enforcement, marksmen',
    tier: 1,
    icon: '🛡️',
  },
  water_plumbing: {
    role: 'water_plumbing',
    label: 'Water / Plumbing',
    description: 'Plumbers, well drillers, water treatment',
    tier: 1,
    icon: '💧',
  },
  electrical_solar: {
    role: 'electrical_solar',
    label: 'Electrical / Solar',
    description: 'Electricians, solar installers, power systems',
    tier: 2,
    icon: '⚡',
  },
  construction: {
    role: 'construction',
    label: 'Construction',
    description: 'Carpenters, builders, structural engineers',
    tier: 2,
    icon: '🔨',
  },
  cooking_preservation: {
    role: 'cooking_preservation',
    label: 'Cooking / Preservation',
    description: 'Cooks, food preservation, canning, fermentation',
    tier: 2,
    icon: '🍳',
  },
  comms_tech: {
    role: 'comms_tech',
    label: 'Comms / Tech',
    description: 'Ham radio operators, IT, network engineers',
    tier: 2,
    icon: '📡',
  },
  teaching: {
    role: 'teaching',
    label: 'Teaching / Training',
    description: 'Educators, trainers, skill transmitters',
    tier: 3,
    icon: '📚',
  },
  strategy_leadership: {
    role: 'strategy_leadership',
    label: 'Strategy / Leadership',
    description: 'Planners, strategists, organizers',
    tier: 3,
    icon: '🧭',
  },
  drone_surveillance: {
    role: 'drone_surveillance',
    label: 'Drone / Surveillance',
    description: 'Drone pilots, reconnaissance, surveillance',
    tier: 3,
    icon: '🚁',
  },
  hardware_repair: {
    role: 'hardware_repair',
    label: 'Hardware Repair',
    description: 'Electronics repair, mechanical engineering',
    tier: 3,
    icon: '🔧',
  },
}

export const ALL_ROLES_BY_TIER: RoleMeta[][] = [
  TIER_1_ROLES.map(r => ROLE_META[r]),
  TIER_2_ROLES.map(r => ROLE_META[r]),
  TIER_3_ROLES.map(r => ROLE_META[r]),
]

export function getRoleMeta(role: SkillRole): RoleMeta {
  return ROLE_META[role]
}
