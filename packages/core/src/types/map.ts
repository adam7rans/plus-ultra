export interface LatLng { lat: number; lng: number }

// 13 fixed infrastructure asset types eligible for map pins
export const PINNABLE_ASSET_TYPES = [
  'guard_post', 'water_storage', 'water_source_access', 'food_storage',
  'medical_facility', 'armory', 'comms_post', 'fuel_depot',
  'community_hall', 'workshop', 'radio_base_station',
  'kitchen_mess', 'sanitation_facility',
] as const
export type PinAssetType = typeof PINNABLE_ASSET_TYPES[number]

export interface TribeMapPin {
  id: string
  tribeId: string
  assetType: PinAssetType
  label: string          // defaults to asset registry label, user-overridable
  notes: string          // '' if none (Gun drops undefined)
  lat: number
  lng: number
  createdBy: string
  createdAt: number
}

export interface PatrolRoute {
  id: string
  tribeId: string
  name: string
  waypointsJson: string  // JSON.stringify(LatLng[]) — Gun can't store arrays
  notes: string
  assignedTo: string     // member pubkey, '' if unassigned
  scheduleEventId: string // ScheduledEvent.id, '' if not linked
  createdBy: string
  createdAt: number
}

export interface TribeTerritory {
  tribeId: string
  polygonJson: string    // JSON.stringify(LatLng[]) — empty string = no territory set
  updatedAt: number
  updatedBy: string
}
