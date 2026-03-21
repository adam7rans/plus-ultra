import type { Flow } from '../types'

const OFFLINE_LS: Record<string, () => string> = {
  'plusultra:offlineSince': () => String(Date.now() - 2 * 3600 * 1000),
}

const BASE_RECORDS = [
  {
    store: 'my-tribes', key: '{TRIBE}',
    data: { tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', tribePub: 'dummy_tribe_pub', tribePriv: 'dummy_tribe_priv', tribeEpub: 'dummy_tribe_epub', tribeEpriv: 'dummy_tribe_epriv', name: 'Mountain Watch', location: 'Blue Ridge, VA' },
  },
  {
    store: 'tribe-cache', key: '{TRIBE}',
    data: { id: '{TRIBE}', tribeId: '{TRIBE}', name: 'Mountain Watch', location: 'Blue Ridge, VA', region: 'appalachia', governance: 'council', founderId: '{SELF_PUB}', foundedAt: '{NOW-30d}' },
  },
  {
    store: 'identity', key: 'keypair',
    data: { pub: '{SELF_PUB}', priv: 'dummy_priv_key', epub: 'dummy_epub_key', epriv: 'dummy_epriv_key', createdAt: '{NOW-30d}', backedUp: true, displayName: 'Alex Rivera' },
  },
  {
    store: 'members', key: '{TRIBE}:{SELF_PUB}',
    data: { pubkey: '{SELF_PUB}', tribeId: '{TRIBE}', joinedAt: '{NOW-30d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 1.0, memberType: 'adult', authorityRole: 'founder', displayName: 'Alex Rivera', epub: 'dummy_epub_key' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_2',
    data: { pubkey: 'PUB_2', tribeId: '{TRIBE}', joinedAt: '{NOW-25d}', lastSeen: '{NOW-1d}', status: 'active', attachmentScore: 0.9, memberType: 'adult', authorityRole: 'member', displayName: 'Sam Chen', epub: 'dummy_epub_2' },
  },
  {
    store: 'members', key: '{TRIBE}:PUB_3',
    data: { pubkey: 'PUB_3', tribeId: '{TRIBE}', joinedAt: '{NOW-20d}', lastSeen: '{NOW}', status: 'active', attachmentScore: 0.85, memberType: 'adult', authorityRole: 'lead', displayName: 'Jordan Blake', epub: 'dummy_epub_3' },
  },
  // quartermaster skill → canEdit all 5 categories (land/structures/equipment/vehicles/stores)
  {
    store: 'skills', key: '{TRIBE}:{SELF_PUB}__quartermaster',
    data: { memberId: '{SELF_PUB}', tribeId: '{TRIBE}', role: 'quartermaster', proficiency: 'expert', declaredAt: '{NOW-60d}', vouchedBy: ['PUB_3'] },
  },
]

const INVENTORY_RECORDS = [
  // Stores
  { store: 'inventory', key: '{TRIBE}:food_reserve',     data: { tribeId: '{TRIBE}', asset: 'food_reserve',     quantity: 45, notes: 'Freeze-dried + canned goods', updatedAt: '{NOW-2d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:water_reserve',    data: { tribeId: '{TRIBE}', asset: 'water_reserve',    quantity: 30, notes: 'Barrels + filtration capacity', updatedAt: '{NOW-2d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:medical_supplies', data: { tribeId: '{TRIBE}', asset: 'medical_supplies', quantity: 90, notes: 'Trauma kit + antibiotics',     updatedAt: '{NOW-1d}', updatedBy: 'PUB_2' } },
  { store: 'inventory', key: '{TRIBE}:fuel_reserve',     data: { tribeId: '{TRIBE}', asset: 'fuel_reserve',     quantity: 20, notes: 'Diesel + treated gasoline',    updatedAt: '{NOW-3d}', updatedBy: '{SELF_PUB}' } },
  // Equipment
  { store: 'inventory', key: '{TRIBE}:solar_panel_kit',  data: { tribeId: '{TRIBE}', asset: 'solar_panel_kit',  quantity: 2,  notes: '400W panels + battery bank',  updatedAt: '{NOW-7d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:generator',        data: { tribeId: '{TRIBE}', asset: 'generator',        quantity: 1,  notes: '6500W propane generator',     updatedAt: '{NOW-7d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:firearm',          data: { tribeId: '{TRIBE}', asset: 'firearm',          quantity: 4,  notes: 'Rifles + handguns',           updatedAt: '{NOW-4d}', updatedBy: 'PUB_3' } },
  { store: 'inventory', key: '{TRIBE}:radio_handheld',   data: { tribeId: '{TRIBE}', asset: 'radio_handheld',   quantity: 6,  notes: 'Baofeng UV-5R',              updatedAt: '{NOW-3d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:medical_kit',      data: { tribeId: '{TRIBE}', asset: 'medical_kit',      quantity: 3,  notes: 'IFAK packs',                 updatedAt: '{NOW-1d}', updatedBy: 'PUB_2' } },
  // Vehicles
  { store: 'inventory', key: '{TRIBE}:truck_suv',        data: { tribeId: '{TRIBE}', asset: 'truck_suv',        quantity: 2,  notes: 'F-250 + Suburban, 4WD',      updatedAt: '{NOW-5d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:trailer',          data: { tribeId: '{TRIBE}', asset: 'trailer',          quantity: 1,  notes: '16ft flatbed',               updatedAt: '{NOW-5d}', updatedBy: '{SELF_PUB}' } },
  // Land
  { store: 'inventory', key: '{TRIBE}:residential_land', data: { tribeId: '{TRIBE}', asset: 'residential_land', quantity: 2,  notes: 'Main property + adjacent lot', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:agricultural_land',data: { tribeId: '{TRIBE}', asset: 'agricultural_land',quantity: 3,  notes: 'South field, garden beds',     updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:water_source_access', data: { tribeId: '{TRIBE}', asset: 'water_source_access', quantity: 1, notes: 'Creek + hand-dug well', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  // Structures
  { store: 'inventory', key: '{TRIBE}:shelter_housing',  data: { tribeId: '{TRIBE}', asset: 'shelter_housing',  quantity: 2,  notes: 'Main house + guest cabin', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:food_storage',     data: { tribeId: '{TRIBE}', asset: 'food_storage',     quantity: 1,  notes: 'Root cellar',             updatedAt: '{NOW-20d}', updatedBy: '{SELF_PUB}' } },
]

export const flow: Flow = {
  id: 15,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Log Consumption',
  summary:
    'Members log daily consumption of tracked resources — reducing current quantities and flagging items below threshold.',
  steps: [
    {
      n: 1,
      screen: 'Inventory — Log Consumption',
      route: '/tribe/{TRIBE}/inventory',
      desc: 'All 5 categories (Land, Structures, Equipment, Vehicles, Stores) show +/− quantity controls (quartermaster role grants full access). Tap any asset row to expand — shows notes field, Log Consumption button, and burn-rate badge. Tap +/− to adjust quantity; changes persist to IDB and reflect in readiness score.',
      action: 'Tap an asset row to expand. Tap +/− to change quantity. Tap "Log Consumption" to record daily usage.',
      injectIDB: [...BASE_RECORDS, ...INVENTORY_RECORDS],
      injectLocalStorage: OFFLINE_LS,
    },
  ],
}
