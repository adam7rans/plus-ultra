/**
 * registry-icons.ts — AppIcon mappings for core registry data (Track 2).
 *
 * Core registries (@plus-ultra/core) carry emoji `icon` fields as DATA.
 * Those stay untouched. Every place the app RENDERS a registry icon as UI
 * chrome must resolve through these maps instead of `{meta.icon}`.
 *
 * Coverage: all SkillDomains, all SkillRoles, AuthorityRoles, MusterStatus,
 * MusterReason, EventTypes, AssetTypes. If a key is ever missing, render
 * sites fall back to the registry emoji and log once (never blank UI).
 */
import type { AppIconName } from './AppIcon'
import type {
  SkillDomain,
  SkillRole,
  AuthorityRole,
  MusterStatus,
  MusterReason,
  EventType,
  AssetType,
  AssetCategory,
} from '@plus-ultra/core'

export const DOMAIN_APP_ICONS: Record<SkillDomain, AppIconName> = {
  medical: 'firstAid',
  food: 'carrot',
  security: 'shield',
  water: 'drop',
  energy: 'bolt',
  construction: 'hardHat',
  comms: 'radio',
  logistics: 'box',
  knowledge: 'book',
  governance: 'scales',
  craft: 'hammer',
}

export const ROLE_APP_ICONS: Record<SkillRole, AppIconName> = {
  // Medical
  physician: 'stethoscope',
  nurse: 'firstAid',
  paramedic: 'ambulance',
  dentist: 'tooth',
  midwife: 'baby',
  veterinarian: 'paw',
  pharmacist: 'pill',
  // Food
  farmer: 'carrot',
  livestock_handler: 'cow',
  hunter: 'binoculars',
  fisherman: 'fish',
  forager: 'basket',
  beekeeper: 'hexagon',
  butcher: 'knife',
  seed_saver: 'grains',
  food_preserver: 'archive',
  // Security
  tactical_shooter: 'crosshair',
  k9_handler: 'dog',  squad_leader: 'medal',
  strategic_commander: 'flag',
  sniper: 'target',
  combat_medic: 'cross',
  intel_recon: 'eye',
  armorer: 'wrench',
  // Water
  well_driller: 'shovel',
  water_treatment: 'testTube',
  plumber: 'drop',
  // Energy
  electrician: 'plug',
  solar_tech: 'solar',
  generator_mechanic: 'battery',
  battery_specialist: 'plugCharge',
  // Construction
  carpenter: 'hammer',
  mason: 'hardHat',
  welder: 'flame',
  heavy_equipment_operator: 'tractor',
  structural_engineer: 'blueprint',
  blacksmith: 'fire',
  surveyor: 'ruler',
  // Comms
  ham_radio_operator: 'radio',
  network_engineer: 'wifi',
  sigint: 'ear',
  cryptographer: 'fingerprint',
  drone_pilot: 'sendPlane',
  // Logistics
  cook: 'pot',
  quartermaster: 'clipboard',
  vehicle_mechanic: 'gauge',
  fuel_specialist: 'gas',
  // Knowledge
  teacher: 'graduation',
  skills_trainer: 'star',
  historian: 'scroll',
  // Governance
  chaplain: 'heart',
  strategic_planner: 'compass',
  mediator: 'handshake',
  scribe: 'note',
  diplomat: 'globe',
  // Craft
  seamstress: 'scissors',
  cobbler: 'boot',
  potter: 'archive',
  soapmaker: 'drop',
  brewer: 'beer',
}

export const AUTHORITY_APP_ICONS: Record<AuthorityRole, AppIconName> = {
  founder: 'crown',
  elder_council: 'bank',
  lead: 'star',
  member: 'user',
  restricted: 'lock',
}

export const MUSTER_STATUS_APP_ICONS: Record<MusterStatus, AppIconName> = {
  present: 'check',
  away_authorized: 'clock',
  away_unplanned: 'help',
  injured: 'cross',
  need_help: 'siren',
  unknown: 'info',
}

export const MUSTER_REASON_APP_ICONS: Record<MusterReason, AppIconName> = {
  emergency: 'siren',
  security: 'shield',
  routine_drill: 'clipboard',
  check_in: 'check',
  grid_down_drill: 'bolt',
  other: 'megaphone',
}

export const EVENT_TYPE_APP_ICONS: Record<EventType, AppIconName> = {  meal: 'apple',
  watch: 'eye',
  duty: 'shield',
  medical: 'firstAid',
  training: 'graduation',
  social: 'users',
  maintenance: 'wrench',
  comms: 'radio',
  alert: 'siren',
  personal: 'user',
}

export const ASSET_APP_ICONS: Record<AssetType, AppIconName> = {
  residential_land: 'home',
  agricultural_land: 'leaf',
  defensive_perimeter: 'shield',
  water_source_access: 'pin',
  shelter_housing: 'tent',
  medical_facility: 'firstAid',
  food_storage: 'box',
  water_storage: 'drop',
  armory: 'lock',
  workshop: 'hammer',
  comms_post: 'radio',
  guard_post: 'flag',
  community_hall: 'users',
  kitchen_mess: 'pot',
  sanitation_facility: 'trash',
  school: 'book',
  fuel_depot: 'gas',
  firearm: 'crosshair',
  radio_handheld: 'mic',
  radio_base_station: 'broadcast',
  solar_panel_kit: 'solar',
  generator: 'battery',
  water_filter_system: 'funnel',
  medical_kit: 'briefcase',
  surgical_kit: 'syringe',
  drone: 'sendPlane',
  night_vision: 'moon',
  hand_tools_set: 'wrench',
  power_tools_set: 'plug',
  smartphone: 'phone',
  mesh_network_node: 'wifi',
  binoculars_optics: 'binoculars',
  chainsaw: 'axe',
  welding_rig: 'flame',
  truck_suv: 'truck',
  atv_utv: 'moto',
  trailer: 'archive',
  bicycle: 'bike',
  horse: 'horse',
  boat: 'boat',
  food_reserve: 'basket',
  seed_stock: 'grains',
  clothing_reserve: 'shirt',
  building_materials: 'barn',
  water_reserve: 'rain',
  fuel_reserve: 'gas',
  ammo_reserve: 'target',
  medical_supplies: 'pill',
}

export const CATEGORY_APP_ICONS: Record<AssetCategory, AppIconName> = {
  land: 'map',
  structures: 'hardHat',
  equipment: 'toolbox',
  vehicles: 'truck',
  stores: 'archive',
}

/** Keyed by scale label (Fireteam … Settlement) — the scale objects carry no stable key. */
export const SCALE_APP_ICONS: Record<string, AppIconName> = {
  Fireteam: 'flame',
  Cell: 'bolt',
  Tribe: 'shield',
  Village: 'house',
  Town: 'bank',
  Settlement: 'globe',
}
