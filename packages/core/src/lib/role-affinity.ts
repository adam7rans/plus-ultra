import type { SkillRole, SkillDomain } from '../types/skills.js'
import type { AssetType, AssetCategory } from '../types/assets.js'
import { ROLE_BY_KEY } from './role-registry.js'

// Which domains are related to each domain (for "My Team" view)
const DOMAIN_AFFINITY: Record<SkillDomain, SkillDomain[]> = {
  medical:      ['medical', 'logistics'],
  food:         ['food', 'logistics'],
  security:     ['security', 'comms'],
  water:        ['water', 'construction'],
  energy:       ['energy', 'construction'],
  construction: ['construction', 'energy'],
  comms:        ['comms', 'security'],
  logistics:    ['logistics', 'food'],
  knowledge:    ['knowledge', 'governance'],
  governance:   ['governance', 'knowledge', 'security'],
  craft:        ['craft', 'logistics'],
}

// Which asset types are relevant to each domain (for "My Inventory" view)
const DOMAIN_ASSETS: Record<SkillDomain, AssetType[]> = {
  medical:      ['medical_facility', 'medical_kit', 'surgical_kit', 'medical_supplies'],
  food:         ['agricultural_land', 'food_storage', 'kitchen_mess', 'food_reserve', 'seed_stock'],
  security:     ['defensive_perimeter', 'guard_post', 'armory', 'firearm', 'ammo_reserve', 'radio_handheld', 'night_vision', 'binoculars_optics', 'drone'],
  water:        ['water_source_access', 'water_storage', 'water_filter_system', 'water_reserve'],
  energy:       ['solar_panel_kit', 'generator', 'fuel_depot', 'fuel_reserve'],
  construction: ['workshop', 'hand_tools_set', 'power_tools_set', 'chainsaw', 'welding_rig', 'building_materials'],
  comms:        ['comms_post', 'radio_handheld', 'radio_base_station', 'smartphone', 'mesh_network_node', 'drone'],
  logistics:    ['kitchen_mess', 'food_storage', 'food_reserve', 'fuel_reserve', 'clothing_reserve', 'truck_suv', 'trailer'],
  knowledge:    ['school', 'community_hall'],
  governance:   ['community_hall'],
  craft:        ['workshop', 'hand_tools_set', 'clothing_reserve', 'building_materials'],
}

// Which asset categories each role can edit inventory for
const INVENTORY_PERMISSIONS: Record<SkillRole, AssetCategory[]> = {
  // Quartermasters can edit everything
  quartermaster: ['land', 'structures', 'equipment', 'vehicles', 'stores'],

  // Domain specialists
  physician:           ['equipment', 'stores'],
  nurse:               ['equipment', 'stores'],
  paramedic:           ['equipment', 'stores'],
  pharmacist:          ['stores'],
  armorer:             ['equipment', 'stores'],
  tactical_shooter:    ['equipment'],
  cook:                ['stores'],
  food_preserver:      ['stores'],
  farmer:              ['land', 'stores'],
  electrician:         ['equipment'],
  solar_tech:          ['equipment'],
  generator_mechanic:  ['equipment'],
  battery_specialist:  ['equipment'],
  carpenter:           ['equipment', 'stores'],
  welder:              ['equipment'],
  blacksmith:          ['equipment'],
  ham_radio_operator:  ['equipment'],
  network_engineer:    ['equipment'],
  drone_pilot:         ['equipment'],
  vehicle_mechanic:    ['vehicles'],
  fuel_specialist:     ['stores'],
  surveyor:            ['land'],

  // Roles with no inventory permissions
  dentist: [], midwife: [], veterinarian: [],
  livestock_handler: [], hunter: [], fisherman: [],
  forager: [], beekeeper: [], butcher: [], seed_saver: [],
  squad_leader: [], strategic_commander: [], sniper: [],
  combat_medic: [], intel_recon: [], k9_handler: [],
  well_driller: [], water_treatment: [], plumber: [],
  heavy_equipment_operator: [], structural_engineer: [],
  mason: [], sigint: [], cryptographer: [],
  teacher: [], skills_trainer: [], historian: [], chaplain: [],
  strategic_planner: [], mediator: [], scribe: [], diplomat: [],
  seamstress: [], cobbler: [], potter: [], soapmaker: [], brewer: [],
}

// Get related domains for a member's declared roles
export function getAffinityDomains(memberRoles: SkillRole[]): SkillDomain[] {
  const domains = new Set<SkillDomain>()
  for (const role of memberRoles) {
    const spec = ROLE_BY_KEY[role]
    if (!spec) continue
    for (const d of DOMAIN_AFFINITY[spec.domain]) domains.add(d)
  }
  return Array.from(domains)
}

// Get relevant asset types for a member's declared roles
export function getAffinityAssets(memberRoles: SkillRole[]): AssetType[] {
  const assets = new Set<AssetType>()
  for (const role of memberRoles) {
    const spec = ROLE_BY_KEY[role]
    if (!spec) continue
    for (const a of DOMAIN_ASSETS[spec.domain]) assets.add(a)
  }
  return Array.from(assets)
}

// Check if a member can edit a given asset category
export function canEditInventory(memberRoles: SkillRole[], category: AssetCategory): boolean {
  for (const role of memberRoles) {
    const perms = INVENTORY_PERMISSIONS[role]
    if (perms && perms.includes(category)) return true
  }
  return false
}

// Get all asset categories a member can edit
export function getEditableCategories(memberRoles: SkillRole[]): AssetCategory[] {
  const cats = new Set<AssetCategory>()
  for (const role of memberRoles) {
    const perms = INVENTORY_PERMISSIONS[role]
    if (perms) for (const c of perms) cats.add(c)
  }
  return Array.from(cats)
}
