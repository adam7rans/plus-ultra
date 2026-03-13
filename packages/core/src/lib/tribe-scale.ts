import { totalSlotsNeeded } from './role-registry.js'
import { ASSET_REGISTRY, assetsNeeded } from './asset-registry.js'

// ── Scale levels ───────────────────────────────────────────────────

export type TribeScale = 'fireteam' | 'cell' | 'tribe' | 'village' | 'town' | 'settlement'

export interface ScaleLevel {
  scale: TribeScale
  label: string
  description: string
  icon: string
  minPop: number
  maxPop: number
  roleSlots: number       // total role slots at midpoint
  assetCount: number      // total unique assets needed at midpoint
}

function midpoint(min: number, max: number): number {
  return Math.round((min + max) / 2)
}

function countAssets(pop: number): number {
  return ASSET_REGISTRY.filter(a => assetsNeeded(pop, a) > 0).length
}

export const SCALE_LEVELS: ScaleLevel[] = [
  {
    scale: 'fireteam',
    label: 'Fireteam',
    description: 'Extended family or close-knit group. Everyone wears multiple hats.',
    icon: '🔥',
    minPop: 1,
    maxPop: 12,
    roleSlots: totalSlotsNeeded(midpoint(1, 12)),
    assetCount: countAssets(midpoint(1, 12)),
  },
  {
    scale: 'cell',
    label: 'Cell',
    description: 'Core operational unit. Enough people for 24/7 security rotation and basic specialization.',
    icon: '⚡',
    minPop: 13,
    maxPop: 30,
    roleSlots: totalSlotsNeeded(midpoint(13, 30)),
    assetCount: countAssets(midpoint(13, 30)),
  },
  {
    scale: 'tribe',
    label: 'Tribe',
    description: 'Dunbar-number community. Full role coverage, self-sustaining food and security.',
    icon: '🛡️',
    minPop: 31,
    maxPop: 150,
    roleSlots: totalSlotsNeeded(midpoint(31, 150)),
    assetCount: countAssets(midpoint(31, 150)),
  },
  {
    scale: 'village',
    label: 'Village',
    description: 'Multiple families, craft specialization, formal governance, trade capability.',
    icon: '🏘️',
    minPop: 151,
    maxPop: 500,
    roleSlots: totalSlotsNeeded(midpoint(151, 500)),
    assetCount: countAssets(midpoint(151, 500)),
  },
  {
    scale: 'town',
    label: 'Town',
    description: 'Institutional structures — hospital, school, court, market. Inter-tribe diplomacy.',
    icon: '🏛️',
    minPop: 501,
    maxPop: 2000,
    roleSlots: totalSlotsNeeded(midpoint(501, 2000)),
    assetCount: countAssets(midpoint(501, 2000)),
  },
  {
    scale: 'settlement',
    label: 'Settlement',
    description: 'Small city. Manufacturing, advanced infrastructure, regional governance.',
    icon: '🏙️',
    minPop: 2001,
    maxPop: 100000,
    roleSlots: totalSlotsNeeded(midpoint(2001, 10000)),
    assetCount: countAssets(midpoint(2001, 10000)),
  },
]

// Get the current scale level for a given population
export function getTribeScale(pop: number): ScaleLevel {
  for (let i = SCALE_LEVELS.length - 1; i >= 0; i--) {
    if (pop >= SCALE_LEVELS[i].minPop) return SCALE_LEVELS[i]
  }
  return SCALE_LEVELS[0]
}

// Get the next scale level (or null if at max)
export function getNextScale(pop: number): ScaleLevel | null {
  const current = getTribeScale(pop)
  const idx = SCALE_LEVELS.findIndex(s => s.scale === current.scale)
  return idx < SCALE_LEVELS.length - 1 ? SCALE_LEVELS[idx + 1] : null
}

// Progress toward the next scale level (0.0 – 1.0)
export function scaleProgress(pop: number): number {
  const current = getTribeScale(pop)
  const next = getNextScale(pop)
  if (!next) return 1

  const range = next.minPop - current.minPop
  const progress = pop - current.minPop
  return Math.min(1, progress / range)
}
