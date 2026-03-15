export const INFRA_ITEMS = [
  'water',
  'power',
  'stores',
  'tv_broadcast',
  'radio',
  'cell_service',
  'gas_fuel',
  'banks_atms',
  'hospitals',
  'police_fire',
  'roads',
] as const

export type InfraItem = typeof INFRA_ITEMS[number]

export const INFRA_ITEM_LABELS: Record<InfraItem, string> = {
  water:        'Water',
  power:        'Power / Electricity',
  stores:       'Stores / Grocery',
  tv_broadcast: 'TV / Broadcast',
  radio:        'Radio',
  cell_service: 'Cell Service',
  gas_fuel:     'Gas / Fuel',
  banks_atms:   'Banks / ATMs',
  hospitals:    'Hospitals / Emergency',
  police_fire:  'Police / Fire',
  roads:        'Roads / Transportation',
}

export interface MemberInfraStatus {
  memberPub: string
  tribeId: string
  failingItemsJson: string  // JSON.stringify(InfraItem[]) — Gun-safe array storage
  updatedAt: number
  displayName: string
}
