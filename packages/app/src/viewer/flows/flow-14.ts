import type { Flow } from '../types'

// Force offline so useInventory reads from IDB not Convex
const OFFLINE_LS: Record<string, () => string> = {
  'plusultra:offlineSince': () => String(Date.now() - 2 * 3600 * 1000),
}

const TRIBE_RECORDS = [
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
]

// Zero-quantity records to clear any stale IDB inventory from step 1b
const CLEAR_INVENTORY = [
  { store: 'inventory', key: '{TRIBE}:food_reserve',     data: { tribeId: '{TRIBE}', asset: 'food_reserve',     quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:water_reserve',    data: { tribeId: '{TRIBE}', asset: 'water_reserve',    quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:medical_supplies', data: { tribeId: '{TRIBE}', asset: 'medical_supplies', quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:solar_panel_kit',  data: { tribeId: '{TRIBE}', asset: 'solar_panel_kit',  quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:generator',        data: { tribeId: '{TRIBE}', asset: 'generator',        quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:firearm',          data: { tribeId: '{TRIBE}', asset: 'firearm',          quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:radio_handheld',   data: { tribeId: '{TRIBE}', asset: 'radio_handheld',   quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:medical_kit',      data: { tribeId: '{TRIBE}', asset: 'medical_kit',      quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:truck_suv',        data: { tribeId: '{TRIBE}', asset: 'truck_suv',        quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:residential_land', data: { tribeId: '{TRIBE}', asset: 'residential_land', quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:agricultural_land',data: { tribeId: '{TRIBE}', asset: 'agricultural_land',quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:shelter_housing',  data: { tribeId: '{TRIBE}', asset: 'shelter_housing',  quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:fuel_reserve',     data: { tribeId: '{TRIBE}', asset: 'fuel_reserve',     quantity: 0, notes: '', updatedAt: '{NOW}', updatedBy: '{SELF_PUB}' } },
]

// Populated inventory — good coverage across categories
const POPULATED_INVENTORY = [
  // Stores
  { store: 'inventory', key: '{TRIBE}:food_reserve',     data: { tribeId: '{TRIBE}', asset: 'food_reserve',     quantity: 45, notes: 'Freeze-dried + canned goods', updatedAt: '{NOW-2d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:water_reserve',    data: { tribeId: '{TRIBE}', asset: 'water_reserve',    quantity: 30, notes: 'Barrels + filtration capacity', updatedAt: '{NOW-2d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:medical_supplies', data: { tribeId: '{TRIBE}', asset: 'medical_supplies', quantity: 90, notes: 'Trauma kit + antibiotics', updatedAt: '{NOW-1d}', updatedBy: 'PUB_2' } },
  { store: 'inventory', key: '{TRIBE}:fuel_reserve',     data: { tribeId: '{TRIBE}', asset: 'fuel_reserve',     quantity: 20, notes: 'Diesel + treated gasoline', updatedAt: '{NOW-3d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:ammo_reserve',     data: { tribeId: '{TRIBE}', asset: 'ammo_reserve',     quantity: 8,  notes: 'Mixed calibers', updatedAt: '{NOW-5d}', updatedBy: 'PUB_3' } },
  // Equipment
  { store: 'inventory', key: '{TRIBE}:solar_panel_kit',  data: { tribeId: '{TRIBE}', asset: 'solar_panel_kit',  quantity: 2,  notes: '400W panels + battery bank', updatedAt: '{NOW-7d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:generator',        data: { tribeId: '{TRIBE}', asset: 'generator',        quantity: 1,  notes: '6500W propane generator', updatedAt: '{NOW-7d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:firearm',          data: { tribeId: '{TRIBE}', asset: 'firearm',          quantity: 4,  notes: 'Rifles + handguns', updatedAt: '{NOW-4d}', updatedBy: 'PUB_3' } },
  { store: 'inventory', key: '{TRIBE}:radio_handheld',   data: { tribeId: '{TRIBE}', asset: 'radio_handheld',   quantity: 6,  notes: 'Baofeng UV-5R', updatedAt: '{NOW-3d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:medical_kit',      data: { tribeId: '{TRIBE}', asset: 'medical_kit',      quantity: 3,  notes: 'IFAK packs', updatedAt: '{NOW-1d}', updatedBy: 'PUB_2' } },
  { store: 'inventory', key: '{TRIBE}:water_filter_system', data: { tribeId: '{TRIBE}', asset: 'water_filter_system', quantity: 2, notes: 'Berkey + Sawyer', updatedAt: '{NOW-6d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:hand_tools_set',   data: { tribeId: '{TRIBE}', asset: 'hand_tools_set',   quantity: 2,  notes: 'Axes, saws, shovels', updatedAt: '{NOW-10d}', updatedBy: 'PUB_3' } },
  // Vehicles
  { store: 'inventory', key: '{TRIBE}:truck_suv',        data: { tribeId: '{TRIBE}', asset: 'truck_suv',        quantity: 2,  notes: 'F-250 + Suburban, 4WD', updatedAt: '{NOW-5d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:trailer',          data: { tribeId: '{TRIBE}', asset: 'trailer',          quantity: 1,  notes: '16ft flatbed', updatedAt: '{NOW-5d}', updatedBy: '{SELF_PUB}' } },
  // Land
  { store: 'inventory', key: '{TRIBE}:residential_land', data: { tribeId: '{TRIBE}', asset: 'residential_land', quantity: 2,  notes: 'Main property + adjacent lot', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:agricultural_land',data: { tribeId: '{TRIBE}', asset: 'agricultural_land',quantity: 3,  notes: 'South field, garden beds', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:water_source_access', data: { tribeId: '{TRIBE}', asset: 'water_source_access', quantity: 1, notes: 'Creek access + hand-dug well', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  // Structures
  { store: 'inventory', key: '{TRIBE}:shelter_housing',  data: { tribeId: '{TRIBE}', asset: 'shelter_housing',  quantity: 2,  notes: 'Main house + guest cabin', updatedAt: '{NOW-30d}', updatedBy: '{SELF_PUB}' } },
  { store: 'inventory', key: '{TRIBE}:food_storage',     data: { tribeId: '{TRIBE}', asset: 'food_storage',     quantity: 1,  notes: 'Root cellar', updatedAt: '{NOW-20d}', updatedBy: '{SELF_PUB}' } },
]

export const flow: Flow = {
  id: 14,
  section: 'Resources & Logistics',
  mode: 'Both',
  title: 'Add / Update Inventory',
  summary:
    'Members log tribe assets and supplies — land, structures, equipment, vehicles, stores — to track resource readiness against population-based needs.',
  steps: [
    {
      n: '1a',
      screen: 'Inventory Screen — empty',
      route: '/tribe/{TRIBE}/inventory',
      desc: 'Asset Readiness shows 0%. All categories (Land & Territory, Structures, Equipment & Gear, Vehicles, Stores) show 0/X tracked. Tap any category to expand and see individual asset rows with ▲/▼ quantity controls.',
      action: 'Observe the empty inventory. Tap "Land & Territory" to expand and see asset rows.',
      injectIDB: [...TRIBE_RECORDS, ...CLEAR_INVENTORY],
      injectLocalStorage: OFFLINE_LS,
      seedHint: null,  // auto-injects on load, no manual button
    },
    {
      n: '1b',
      screen: 'Inventory Screen — populated',
      route: '/tribe/{TRIBE}/inventory',
      desc: 'Asset Readiness ~65%. Stores: food (45d), water (30d), medical (90d), fuel (20d), ammo (8d). Equipment: solar panels (2), generator (1), firearms (4), radios (6), medical kits (3). Vehicles: trucks (2), trailer (1). Land: residential (2ac), agricultural (3ac), water source (1). Structures: shelter (2), food storage (1).',
      action: 'Scroll through all categories. Tap an asset row to expand notes. Tap ▲ to increase quantity.',
      injectIDB: [...TRIBE_RECORDS, ...POPULATED_INVENTORY],
      injectLocalStorage: OFFLINE_LS,
    },
  ],
}
