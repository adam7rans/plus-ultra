// ── Asset categories ───────────────────────────────────────────────
export type AssetCategory =
  | 'land'
  | 'structures'
  | 'equipment'
  | 'vehicles'
  | 'stores'

// ── Every specific asset ──────────────────────────────────────────
export type AssetType =
  // Land (measured in acres)
  | 'residential_land'
  | 'agricultural_land'
  | 'defensive_perimeter'
  | 'water_source_access'
  // Structures (counted)
  | 'shelter_housing'
  | 'medical_facility'
  | 'food_storage'
  | 'water_storage'
  | 'armory'
  | 'workshop'
  | 'comms_post'
  | 'guard_post'
  | 'community_hall'
  | 'kitchen_mess'
  | 'sanitation_facility'
  | 'school'
  | 'fuel_depot'
  // Equipment (counted)
  | 'firearm'
  | 'radio_handheld'
  | 'radio_base_station'
  | 'solar_panel_kit'
  | 'generator'
  | 'water_filter_system'
  | 'medical_kit'
  | 'surgical_kit'
  | 'drone'
  | 'night_vision'
  | 'hand_tools_set'
  | 'power_tools_set'
  | 'smartphone'
  | 'mesh_network_node'
  | 'binoculars_optics'
  | 'chainsaw'
  | 'welding_rig'
  // Vehicles (counted)
  | 'truck_suv'
  | 'atv_utv'
  | 'trailer'
  | 'bicycle'
  | 'horse'
  | 'boat'
  // Stores (measured in days-of-supply or units)
  | 'food_reserve'
  | 'water_reserve'
  | 'fuel_reserve'
  | 'ammo_reserve'
  | 'medical_supplies'
  | 'seed_stock'
  | 'clothing_reserve'
  | 'building_materials'

export type AssetUnit = 'acres' | 'units' | 'days_supply' | 'gallons' | 'sets'

export type AssetScalingCurve = 'linear' | 'sqrt' | 'log' | 'fixed'

export interface AssetSpec {
  asset: AssetType
  category: AssetCategory
  label: string
  description: string
  icon: string
  unit: AssetUnit
  curve: AssetScalingCurve
  base: number         // minimum regardless of population
  ratio: number        // for linear: 1 per ratio people
  minPop: number       // asset not needed below this population
  cap: number          // 0 = no cap
  critical: boolean    // tribe survivability depends on this
}

// ── Tribe inventory entry ──────────────────────────────────────────
export interface TribeAsset {
  tribeId: string
  asset: AssetType
  quantity: number
  notes: string        // e.g. "2x Honda EU2200i" or "north well, 40ft deep"
  updatedAt: number
  updatedBy: string    // pubkey of member who updated
}
