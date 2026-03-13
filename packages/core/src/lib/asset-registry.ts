import type { AssetType, AssetCategory, AssetSpec } from '../types/assets.js'

// ── The complete asset registry ────────────────────────────────────

export const ASSET_REGISTRY: AssetSpec[] = [
  // ── LAND ─────────────────────────────────────────────────────────
  { asset: 'residential_land',    category: 'land',       label: 'Residential Land',            description: 'Housing area — ~0.25 acres per household',           icon: '🏘️', unit: 'acres',      curve: 'linear', base: 1,   ratio: 16,  minPop: 0,   cap: 0, critical: true },
  { asset: 'agricultural_land',   category: 'land',       label: 'Agricultural Land',           description: 'Cropland — ~1 acre per 4 people for food sovereignty', icon: '🌾', unit: 'acres',      curve: 'linear', base: 2,   ratio: 4,   minPop: 0,   cap: 0, critical: true },
  { asset: 'defensive_perimeter', category: 'land',       label: 'Defensive Perimeter',         description: 'Controlled perimeter around the settlement',         icon: '🛡️', unit: 'acres',      curve: 'sqrt',   base: 5,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'water_source_access', category: 'land',       label: 'Water Source Access',         description: 'Well, spring, river, or lake access on/near land',   icon: '💧', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },

  // ── STRUCTURES ───────────────────────────────────────────────────
  { asset: 'shelter_housing',     category: 'structures', label: 'Shelter / Housing',           description: 'Permanent or semi-permanent dwelling units',         icon: '🏠', unit: 'units',      curve: 'linear', base: 1,   ratio: 4,   minPop: 0,   cap: 0, critical: true },
  { asset: 'medical_facility',    category: 'structures', label: 'Medical Facility',            description: 'Clinic, aid station, or field hospital',             icon: '🏥', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'food_storage',        category: 'structures', label: 'Food Storage',                description: 'Root cellar, pantry, cold storage, grain silo',      icon: '🏚️', unit: 'units',      curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'water_storage',       category: 'structures', label: 'Water Storage',               description: 'Cistern, tank, or reservoir — 1 gal/person/day min', icon: '🪣', unit: 'units',      curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'armory',              category: 'structures', label: 'Armory / Weapons Storage',    description: 'Secured weapons, ammo, and gear storage',            icon: '🔒', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'workshop',            category: 'structures', label: 'Workshop / Forge',            description: 'Tool repair, fabrication, blacksmithing',            icon: '🔨', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 30,  cap: 0, critical: false },
  { asset: 'comms_post',          category: 'structures', label: 'Communications Post',         description: 'Radio room, antenna mast, network hub',              icon: '📡', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'guard_post',          category: 'structures', label: 'Guard Post / Watchtower',     description: 'Perimeter observation and access control points',     icon: '🗼', unit: 'units',      curve: 'sqrt',   base: 2,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'community_hall',      category: 'structures', label: 'Community Hall',              description: 'Meeting space, governance, community events',         icon: '🏛️', unit: 'units',      curve: 'log',    base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },
  { asset: 'kitchen_mess',        category: 'structures', label: 'Kitchen / Mess Hall',         description: 'Communal cooking and meal service facility',          icon: '🍽️', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'sanitation_facility', category: 'structures', label: 'Sanitation Facility',         description: 'Latrines, composting toilets, wash stations',         icon: '🚻', unit: 'units',      curve: 'linear', base: 1,   ratio: 10,  minPop: 0,   cap: 0, critical: true },
  { asset: 'school',              category: 'structures', label: 'School / Training Facility',  description: 'Education and skills training space',                 icon: '🏫', unit: 'units',      curve: 'log',    base: 0,   ratio: 0,   minPop: 50,  cap: 0, critical: false },
  { asset: 'fuel_depot',          category: 'structures', label: 'Fuel Depot',                  description: 'Secure fuel storage — gas, diesel, propane',          icon: '⛽', unit: 'units',      curve: 'log',    base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },

  // ── EQUIPMENT ────────────────────────────────────────────────────
  { asset: 'firearm',             category: 'equipment',  label: 'Firearms',                    description: 'Rifles, shotguns, sidearms for defense',              icon: '🔫', unit: 'units',      curve: 'linear', base: 2,   ratio: 3,   minPop: 0,   cap: 0, critical: true },
  { asset: 'radio_handheld',      category: 'equipment',  label: 'Handheld Radio',              description: 'VHF/UHF walkie-talkies for patrol and coordination',  icon: '📻', unit: 'units',      curve: 'linear', base: 2,   ratio: 5,   minPop: 0,   cap: 0, critical: true },
  { asset: 'radio_base_station',  category: 'equipment',  label: 'Base Station Radio',          description: 'HF/VHF base for long-range and emergency comms',      icon: '📡', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'solar_panel_kit',     category: 'equipment',  label: 'Solar Panel Kit',             description: '100-400W panel + charge controller + battery',        icon: '☀️', unit: 'units',      curve: 'linear', base: 1,   ratio: 10,  minPop: 0,   cap: 0, critical: false },
  { asset: 'generator',           category: 'equipment',  label: 'Generator',                   description: 'Portable or standby generator (gas/diesel/propane)',   icon: '🔌', unit: 'units',      curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'water_filter_system', category: 'equipment',  label: 'Water Filtration System',     description: 'Gravity filter, UV, or reverse-osmosis system',       icon: '💧', unit: 'units',      curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'medical_kit',         category: 'equipment',  label: 'Medical Kit (Field)',         description: 'Trauma kit, first aid, basic meds',                   icon: '🩺', unit: 'units',      curve: 'linear', base: 2,   ratio: 15,  minPop: 0,   cap: 0, critical: true },
  { asset: 'surgical_kit',        category: 'equipment',  label: 'Surgical Kit',                description: 'Advanced surgical tools for field surgery',            icon: '🔪', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 30,  cap: 0, critical: false },
  { asset: 'drone',               category: 'equipment',  label: 'Drone',                       description: 'Recon/surveillance UAV with camera',                  icon: '🚁', unit: 'units',      curve: 'sqrt',   base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },
  { asset: 'night_vision',        category: 'equipment',  label: 'Night Vision Device',         description: 'NVG monocular or binocular for night ops',            icon: '🌙', unit: 'units',      curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'hand_tools_set',      category: 'equipment',  label: 'Hand Tools Set',              description: 'Hammers, saws, axes, shovels, wrenches',              icon: '🧰', unit: 'sets',       curve: 'sqrt',   base: 2,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'power_tools_set',     category: 'equipment',  label: 'Power Tools Set',             description: 'Drill, circular saw, angle grinder',                  icon: '🔧', unit: 'sets',       curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'smartphone',          category: 'equipment',  label: 'Smartphone / Tablet',         description: 'For Plus Ultra app, comms, reference materials',       icon: '📱', unit: 'units',      curve: 'linear', base: 2,   ratio: 4,   minPop: 0,   cap: 0, critical: false },
  { asset: 'mesh_network_node',   category: 'equipment',  label: 'Mesh Network Node',           description: 'Meshtastic, goTenna, or WiFi mesh repeater',          icon: '🔗', unit: 'units',      curve: 'sqrt',   base: 2,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'binoculars_optics',   category: 'equipment',  label: 'Binoculars / Optics',         description: 'Observation, hunting, perimeter surveillance',         icon: '🔭', unit: 'units',      curve: 'sqrt',   base: 2,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'chainsaw',            category: 'equipment',  label: 'Chainsaw',                    description: 'Land clearing, firewood, construction',                icon: '🪚', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'welding_rig',         category: 'equipment',  label: 'Welding Rig',                 description: 'Stick/MIG welder for fabrication and repair',          icon: '⚡', unit: 'units',      curve: 'log',    base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },

  // ── VEHICLES ─────────────────────────────────────────────────────
  { asset: 'truck_suv',           category: 'vehicles',   label: 'Truck / SUV',                 description: 'Cargo and personnel transport (fuel-dependent)',       icon: '🚛', unit: 'units',      curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'atv_utv',             category: 'vehicles',   label: 'ATV / UTV',                   description: 'Off-road utility vehicle for patrol and hauling',      icon: '🏎️', unit: 'units',      curve: 'sqrt',   base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },
  { asset: 'trailer',             category: 'vehicles',   label: 'Trailer',                     description: 'Cargo, livestock, or equipment trailer',               icon: '🚛', unit: 'units',      curve: 'log',    base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
  { asset: 'bicycle',             category: 'vehicles',   label: 'Bicycle',                     description: 'No-fuel transport, patrol, courier',                   icon: '🚲', unit: 'units',      curve: 'linear', base: 2,   ratio: 5,   minPop: 0,   cap: 0, critical: false },
  { asset: 'horse',               category: 'vehicles',   label: 'Horse',                       description: 'No-fuel transport, patrol, hauling — needs feed',      icon: '🐎', unit: 'units',      curve: 'sqrt',   base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },
  { asset: 'boat',                category: 'vehicles',   label: 'Boat / Canoe',                description: 'Water transport, fishing, river crossing',             icon: '🚣', unit: 'units',      curve: 'log',    base: 0,   ratio: 0,   minPop: 30,  cap: 0, critical: false },

  // ── STORES (consumable reserves) ─────────────────────────────────
  { asset: 'food_reserve',        category: 'stores',     label: 'Food Reserve',                description: 'Days of stored food for the whole tribe',              icon: '🥫', unit: 'days_supply', curve: 'fixed',  base: 90,  ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'water_reserve',       category: 'stores',     label: 'Water Reserve',               description: 'Days of stored water (1 gal/person/day)',              icon: '🚰', unit: 'days_supply', curve: 'fixed',  base: 14,  ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'fuel_reserve',        category: 'stores',     label: 'Fuel Reserve',                description: 'Gallons of fuel — gas, diesel, propane combined',      icon: '🛢️', unit: 'gallons',     curve: 'linear', base: 50,  ratio: 2,   minPop: 0,   cap: 0, critical: false },
  { asset: 'ammo_reserve',        category: 'stores',     label: 'Ammunition Reserve',          description: 'Rounds per firearm — minimum training + defense',      icon: '🎯', unit: 'units',      curve: 'linear', base: 200, ratio: 3,   minPop: 0,   cap: 0, critical: true },
  { asset: 'medical_supplies',    category: 'stores',     label: 'Medical Supplies',            description: 'Antibiotics, bandages, painkillers, IV kits',          icon: '💊', unit: 'days_supply', curve: 'fixed',  base: 90,  ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'seed_stock',          category: 'stores',     label: 'Seed Stock',                  description: 'Heirloom seed varieties for planting seasons',         icon: '🌰', unit: 'sets',       curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: true },
  { asset: 'clothing_reserve',    category: 'stores',     label: 'Clothing Reserve',            description: 'Spare clothing, boots, cold weather gear',             icon: '👕', unit: 'sets',       curve: 'linear', base: 2,   ratio: 5,   minPop: 0,   cap: 0, critical: false },
  { asset: 'building_materials',  category: 'stores',     label: 'Building Materials',          description: 'Lumber, fasteners, tarps, concrete, roofing',          icon: '🪵', unit: 'sets',       curve: 'sqrt',   base: 1,   ratio: 0,   minPop: 0,   cap: 0, critical: false },
]

// ── Lookup helpers ─────────────────────────────────────────────────

export const ASSET_BY_KEY: Record<AssetType, AssetSpec> = Object.fromEntries(
  ASSET_REGISTRY.map(a => [a.asset, a])
) as Record<AssetType, AssetSpec>

export const ALL_ASSETS: AssetType[] = ASSET_REGISTRY.map(a => a.asset)

export const ASSETS_BY_CATEGORY: Record<AssetCategory, AssetSpec[]> = {
  land:       ASSET_REGISTRY.filter(a => a.category === 'land'),
  structures: ASSET_REGISTRY.filter(a => a.category === 'structures'),
  equipment:  ASSET_REGISTRY.filter(a => a.category === 'equipment'),
  vehicles:   ASSET_REGISTRY.filter(a => a.category === 'vehicles'),
  stores:     ASSET_REGISTRY.filter(a => a.category === 'stores'),
}

export const CATEGORY_META: Record<AssetCategory, { label: string; icon: string }> = {
  land:       { label: 'Land & Territory',     icon: '🗺️' },
  structures: { label: 'Structures',           icon: '🏗️' },
  equipment:  { label: 'Equipment & Gear',     icon: '🧰' },
  vehicles:   { label: 'Vehicles & Transport', icon: '🚛' },
  stores:     { label: 'Stores & Reserves',    icon: '🏪' },
}

export const CATEGORY_ORDER: AssetCategory[] = ['land', 'structures', 'equipment', 'vehicles', 'stores']

// ── Scaling algorithm (same pattern as role scaling) ────────────────

export function assetsNeeded(pop: number, spec: AssetSpec): number {
  if (pop < spec.minPop) return 0

  let n: number
  switch (spec.curve) {
    case 'linear':
      n = Math.max(spec.base, Math.ceil(pop / spec.ratio))
      break
    case 'sqrt':
      n = Math.max(spec.base, Math.round(Math.sqrt(pop / 5)))
      break
    case 'log':
      n = Math.max(spec.base, Math.round(Math.log2(Math.max(1, pop / 10))))
      break
    case 'fixed':
      n = spec.base
      break
  }

  return spec.cap > 0 ? Math.min(n, spec.cap) : n
}

// Total assets needed by category at a given population
export function assetsSummary(pop: number): Record<AssetCategory, { total: number; critical: number; specs: { spec: AssetSpec; needed: number }[] }> {
  const result = {} as Record<AssetCategory, { total: number; critical: number; specs: { spec: AssetSpec; needed: number }[] }>

  for (const cat of CATEGORY_ORDER) {
    const specs = ASSETS_BY_CATEGORY[cat]
    const items = specs.map(spec => ({ spec, needed: assetsNeeded(pop, spec) })).filter(s => s.needed > 0)
    result[cat] = {
      total: items.length,
      critical: items.filter(i => i.spec.critical).length,
      specs: items,
    }
  }

  return result
}

// Asset readiness score (0.0 - 1.0) — how prepared is the tribe materially?
export function assetReadiness(pop: number, inventory: { asset: AssetType; quantity: number }[]): number {
  const invMap = new Map(inventory.map(i => [i.asset, i.quantity]))

  let totalWeight = 0
  let weightedScore = 0

  for (const spec of ASSET_REGISTRY) {
    const needed = assetsNeeded(pop, spec)
    if (needed === 0) continue

    const weight = spec.critical ? 2 : 1
    totalWeight += weight

    const have = invMap.get(spec.asset) ?? 0
    const ratio = Math.min(1, have / needed)
    weightedScore += ratio * weight
  }

  if (totalWeight === 0) return 1
  return weightedScore / totalWeight
}
