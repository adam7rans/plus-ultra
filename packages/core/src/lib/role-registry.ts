import type { SkillRole, SkillDomain, RoleSpec } from '../types/skills.js'

// ── The complete role registry ─────────────────────────────────────

export const ROLE_REGISTRY: RoleSpec[] = [
  // ── MEDICAL (Tier 1) ──────────────────────────────────────────
  { role: 'physician',       domain: 'medical',      tier: 1, label: 'Physician (MD/DO)',          description: 'Diagnosis, surgery, prescriptions',                  icon: '⚕️',  curve: 'linear', base: 1, ratio: 75,  minPop: 0,   cap: 0 },
  { role: 'nurse',           domain: 'medical',      tier: 1, label: 'Nurse (RN/LPN)',             description: 'Patient care, triage, wound management',             icon: '🏥', curve: 'linear', base: 1, ratio: 25,  minPop: 0,   cap: 0 },
  { role: 'paramedic',       domain: 'medical',      tier: 1, label: 'Paramedic / EMT',            description: 'Trauma care, field medicine, transport',              icon: '🚑', curve: 'linear', base: 1, ratio: 50,  minPop: 0,   cap: 0 },
  { role: 'dentist',         domain: 'medical',      tier: 1, label: 'Dentist',                    description: 'Oral health — infections kill without treatment',     icon: '🦷', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'midwife',         domain: 'medical',      tier: 1, label: 'Midwife',                    description: 'Childbirth, prenatal/postnatal care',                 icon: '👶', curve: 'log',    base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'veterinarian',    domain: 'medical',      tier: 1, label: 'Veterinarian',               description: 'Livestock health = food security',                    icon: '🐄', curve: 'log',    base: 1, ratio: 0,   minPop: 75,  cap: 0 },
  { role: 'pharmacist',      domain: 'medical',      tier: 1, label: 'Pharmacist / Herbalist',     description: 'Medication management, plant medicine',               icon: '💊', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },

  // ── FOOD & AGRICULTURE (Tier 1) ──────────────────────────────
  { role: 'farmer',          domain: 'food',         tier: 1, label: 'Farmer (Crops)',              description: 'Calorie staples: corn, wheat, potatoes, rice',        icon: '🌾', curve: 'linear', base: 1, ratio: 30,  minPop: 0,   cap: 0 },
  { role: 'livestock_handler', domain: 'food',       tier: 1, label: 'Livestock Handler',           description: 'Cattle, goats, chickens, pigs',                       icon: '🐔', curve: 'linear', base: 1, ratio: 50,  minPop: 0,   cap: 0 },
  { role: 'hunter',          domain: 'food',         tier: 1, label: 'Hunter',                      description: 'Wild game protein, trapping',                         icon: '🎯', curve: 'linear', base: 1, ratio: 40,  minPop: 0,   cap: 0 },
  { role: 'fisherman',       domain: 'food',         tier: 1, label: 'Fisherman',                   description: 'Fishing, aquaculture, protein diversity',             icon: '🐟', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'forager',         domain: 'food',         tier: 1, label: 'Forager / Botanist',          description: 'Wild edibles, medicinal plants identification',       icon: '🍄', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'beekeeper',       domain: 'food',         tier: 1, label: 'Beekeeper',                   description: 'Pollination, honey (calories + antiseptic)',          icon: '🐝', curve: 'log',    base: 1, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'butcher',         domain: 'food',         tier: 1, label: 'Butcher / Meat Processor',    description: 'Field dressing, processing, no waste',                icon: '🥩', curve: 'linear', base: 1, ratio: 75,  minPop: 30,  cap: 0 },
  { role: 'seed_saver',      domain: 'food',         tier: 1, label: 'Seed Saver / Agronomist',     description: 'Long-term food sovereignty, crop planning',           icon: '🌱', curve: 'log',    base: 1, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'food_preserver',  domain: 'food',         tier: 1, label: 'Canner / Food Preserver',     description: 'Canning, smoking, fermenting, drying',                icon: '🫙', curve: 'linear', base: 1, ratio: 50,  minPop: 0,   cap: 0 },

  // ── SECURITY & DEFENSE (Tier 1) ──────────────────────────────
  { role: 'tactical_shooter', domain: 'security',    tier: 1, label: 'Tactical Shooter',            description: 'Perimeter defense, patrols, fire team member',        icon: '🔫', curve: 'linear', base: 2, ratio: 8,   minPop: 0,   cap: 0 },
  { role: 'squad_leader',    domain: 'security',     tier: 1, label: 'Squad Leader',                description: 'Small unit leadership (4-person fire teams)',          icon: '⭐', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'strategic_commander', domain: 'security', tier: 1, label: 'Strategic Commander',         description: 'Operations planning, threat assessment',              icon: '🎖️', curve: 'log',    base: 1, ratio: 0,   minPop: 30,  cap: 10 },
  { role: 'sniper',          domain: 'security',     tier: 1, label: 'Sniper / Marksman',           description: 'Overwatch, long-range deterrence',                    icon: '🎯', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'combat_medic',    domain: 'security',     tier: 1, label: 'Combat Medic',                description: 'Treat under fire, cross-trained medical',             icon: '✚',  curve: 'linear', base: 1, ratio: 75,  minPop: 0,   cap: 0 },
  { role: 'intel_recon',     domain: 'security',     tier: 1, label: 'Intelligence / Recon',        description: 'Scouting, HUMINT, threat detection',                  icon: '🔍', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'armorer',         domain: 'security',     tier: 1, label: 'Armorer / Weaponsmith',       description: 'Weapons maintenance, repair, ammo reloading',         icon: '🔧', curve: 'log',    base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'k9_handler',      domain: 'security',     tier: 1, label: 'K9 Handler',                  description: 'Patrol dogs, detection, tracking',                    icon: '🐕', curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },

  // ── WATER (Tier 1) ───────────────────────────────────────────
  { role: 'well_driller',    domain: 'water',        tier: 1, label: 'Well Driller / Water Sourcing', description: 'Finding and accessing groundwater',                icon: '⛏️',  curve: 'fixed',  base: 1, ratio: 0,   minPop: 0,   cap: 5 },
  { role: 'water_treatment', domain: 'water',        tier: 1, label: 'Water Treatment',             description: 'Filtration, chemical treatment, testing',             icon: '💧', curve: 'linear', base: 1, ratio: 100, minPop: 0,   cap: 0 },
  { role: 'plumber',         domain: 'water',        tier: 1, label: 'Plumber / Distribution',      description: 'Pipes, gravity-fed systems, storage tanks',           icon: '🔩', curve: 'linear', base: 1, ratio: 75,  minPop: 0,   cap: 0 },

  // ── ENERGY & POWER (Tier 2) ──────────────────────────────────
  { role: 'electrician',     domain: 'energy',       tier: 2, label: 'Electrician',                  description: 'Wiring, panels, power distribution',                 icon: '⚡', curve: 'linear', base: 1, ratio: 50,  minPop: 0,   cap: 0 },
  { role: 'solar_tech',      domain: 'energy',       tier: 2, label: 'Solar Technician',             description: 'Panel install, charge controllers, batteries',        icon: '☀️',  curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'generator_mechanic', domain: 'energy',    tier: 2, label: 'Generator / Engine Mechanic',  description: 'Diesel, gas, propane generator maintenance',          icon: '🔌', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'battery_specialist', domain: 'energy',    tier: 2, label: 'Battery / Storage Specialist', description: 'Deep cycle, lithium, inverter systems',               icon: '🔋', curve: 'log',    base: 1, ratio: 0,   minPop: 50,  cap: 0 },

  // ── CONSTRUCTION & ENGINEERING (Tier 2) ──────────────────────
  { role: 'carpenter',       domain: 'construction', tier: 2, label: 'Carpenter / Framer',           description: 'Structures, fortifications, furniture',               icon: '🪚', curve: 'linear', base: 1, ratio: 40,  minPop: 0,   cap: 0 },
  { role: 'mason',           domain: 'construction', tier: 2, label: 'Mason / Concrete',             description: 'Foundations, walls, ovens, cisterns',                 icon: '🧱', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'welder',          domain: 'construction', tier: 2, label: 'Welder / Metalworker',         description: 'Fabrication, repair, gates, frames',                  icon: '🔥', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'heavy_equipment_operator', domain: 'construction', tier: 2, label: 'Heavy Equipment Operator', description: 'Earthmoving, trenching, road building',         icon: '🚜', curve: 'log',    base: 0, ratio: 0,   minPop: 100, cap: 0 },
  { role: 'structural_engineer', domain: 'construction', tier: 2, label: 'Structural Engineer',     description: 'Load calculations, bridge/building safety',           icon: '📐', curve: 'log',    base: 0, ratio: 0,   minPop: 100, cap: 0 },
  { role: 'blacksmith',      domain: 'construction', tier: 2, label: 'Blacksmith',                   description: 'Tools, hardware, blades when supply dies',            icon: '⚒️',  curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },
  { role: 'surveyor',        domain: 'construction', tier: 2, label: 'Surveyor / Land Planner',      description: 'Property layout, drainage, zoning',                   icon: '📏', curve: 'log',    base: 0, ratio: 0,   minPop: 100, cap: 0 },

  // ── COMMUNICATIONS & TECHNOLOGY (Tier 2) ─────────────────────
  { role: 'ham_radio_operator', domain: 'comms',     tier: 2, label: 'Ham Radio Operator',           description: 'Long-range comms, emergency nets, HF/VHF/UHF',       icon: '📻', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'network_engineer', domain: 'comms',       tier: 2, label: 'IT / Network Engineer',        description: 'Mesh networks, local servers, comms infrastructure',  icon: '🖥️',  curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'sigint',          domain: 'comms',        tier: 2, label: 'SIGINT / Electronic Warfare',  description: 'Monitor, detect, counter electronic threats',         icon: '📡', curve: 'log',    base: 0, ratio: 0,   minPop: 100, cap: 0 },
  { role: 'cryptographer',   domain: 'comms',        tier: 2, label: 'Cryptographer / OPSEC',        description: 'Secure comms, key management, operational security',  icon: '🔐', curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },
  { role: 'drone_pilot',     domain: 'comms',        tier: 2, label: 'Drone Pilot',                  description: 'Recon, perimeter monitoring, aerial mapping',         icon: '🚁', curve: 'sqrt',   base: 0, ratio: 0,   minPop: 50,  cap: 0 },

  // ── LOGISTICS & SUPPLY (Tier 2) ──────────────────────────────
  { role: 'cook',            domain: 'logistics',    tier: 2, label: 'Cook (Mess / Camp)',            description: 'Feeding the tribe, meal planning, field cooking',     icon: '🍳', curve: 'linear', base: 1, ratio: 30,  minPop: 0,   cap: 0 },
  { role: 'quartermaster',   domain: 'logistics',    tier: 2, label: 'Quartermaster / Inventory',    description: 'Supply tracking, rationing, distribution',            icon: '📦', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 0,   cap: 0 },
  { role: 'vehicle_mechanic', domain: 'logistics',   tier: 2, label: 'Vehicle Mechanic',             description: 'Keep trucks, ATVs, tractors running',                 icon: '🔧', curve: 'sqrt',   base: 1, ratio: 0,   minPop: 30,  cap: 0 },
  { role: 'fuel_specialist', domain: 'logistics',    tier: 2, label: 'Fuel Specialist',              description: 'Storage, biodiesel, ethanol production',              icon: '⛽', curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },

  // ── KNOWLEDGE & TRAINING (Tier 3) ────────────────────────────
  { role: 'teacher',         domain: 'knowledge',    tier: 3, label: 'Teacher / Educator',           description: 'Children education, adult literacy',                  icon: '📚', curve: 'sqrt',   base: 0, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'skills_trainer',  domain: 'knowledge',    tier: 3, label: 'Skills Trainer',               description: 'Cross-training members in critical skills',           icon: '🏋️', curve: 'sqrt',   base: 0, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'historian',       domain: 'knowledge',    tier: 3, label: 'Historian / Archivist',        description: 'Documenting knowledge, procedures, lessons learned',  icon: '📜', curve: 'log',    base: 0, ratio: 0,   minPop: 100, cap: 0 },
  { role: 'chaplain',        domain: 'knowledge',    tier: 3, label: 'Chaplain / Counselor',         description: 'Morale, conflict resolution, mental health support',  icon: '🕊️',  curve: 'sqrt',   base: 0, ratio: 0,   minPop: 30,  cap: 0 },

  // ── GOVERNANCE & ADMINISTRATION (Tier 3) ─────────────────────
  { role: 'strategic_planner', domain: 'governance', tier: 3, label: 'Strategic Planner',            description: 'Long-term vision, resource allocation',               icon: '🧭', curve: 'log',    base: 0, ratio: 0,   minPop: 50,  cap: 10 },
  { role: 'mediator',        domain: 'governance',   tier: 3, label: 'Mediator / Judge',             description: 'Dispute resolution, rule enforcement',                icon: '⚖️',  curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },
  { role: 'scribe',          domain: 'governance',   tier: 3, label: 'Scribe / Record Keeper',       description: 'Meeting minutes, census, legal records',              icon: '✍️',  curve: 'log',    base: 0, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'diplomat',        domain: 'governance',   tier: 3, label: 'Diplomat / Trade Liaison',     description: 'Inter-tribe relations, barter, alliances',            icon: '🤝', curve: 'log',    base: 0, ratio: 0,   minPop: 100, cap: 0 },

  // ── CRAFT & SUSTAINABILITY (Tier 3) ──────────────────────────
  { role: 'seamstress',      domain: 'craft',        tier: 3, label: 'Seamstress / Tailor',          description: 'Clothing repair, production, textile work',           icon: '🧵', curve: 'sqrt',   base: 0, ratio: 0,   minPop: 50,  cap: 0 },
  { role: 'cobbler',         domain: 'craft',        tier: 3, label: 'Cobbler / Leatherworker',      description: 'Footwear, leather goods, harness, saddles',           icon: '👢', curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },
  { role: 'potter',          domain: 'craft',        tier: 3, label: 'Potter / Ceramicist',          description: 'Storage vessels, cookware, building materials',       icon: '🏺', curve: 'log',    base: 0, ratio: 0,   minPop: 150, cap: 0 },
  { role: 'soapmaker',       domain: 'craft',        tier: 3, label: 'Soapmaker / Chemist',          description: 'Hygiene products, cleaning, disinfectants',           icon: '🧪', curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },
  { role: 'brewer',          domain: 'craft',        tier: 3, label: 'Brewer / Distiller',           description: 'Morale, antiseptic, barter goods',                    icon: '🍺', curve: 'log',    base: 0, ratio: 0,   minPop: 75,  cap: 0 },
]

// ── Lookup helpers ─────────────────────────────────────────────────

export const ROLE_BY_KEY: Record<SkillRole, RoleSpec> = Object.fromEntries(
  ROLE_REGISTRY.map(r => [r.role, r])
) as Record<SkillRole, RoleSpec>

export const ALL_ROLES: SkillRole[] = ROLE_REGISTRY.map(r => r.role)

export const ROLES_BY_TIER: Record<1 | 2 | 3, RoleSpec[]> = {
  1: ROLE_REGISTRY.filter(r => r.tier === 1),
  2: ROLE_REGISTRY.filter(r => r.tier === 2),
  3: ROLE_REGISTRY.filter(r => r.tier === 3),
}

export const ROLES_BY_DOMAIN: Record<SkillDomain, RoleSpec[]> = {
  medical:      ROLE_REGISTRY.filter(r => r.domain === 'medical'),
  food:         ROLE_REGISTRY.filter(r => r.domain === 'food'),
  security:     ROLE_REGISTRY.filter(r => r.domain === 'security'),
  water:        ROLE_REGISTRY.filter(r => r.domain === 'water'),
  energy:       ROLE_REGISTRY.filter(r => r.domain === 'energy'),
  construction: ROLE_REGISTRY.filter(r => r.domain === 'construction'),
  comms:        ROLE_REGISTRY.filter(r => r.domain === 'comms'),
  logistics:    ROLE_REGISTRY.filter(r => r.domain === 'logistics'),
  knowledge:    ROLE_REGISTRY.filter(r => r.domain === 'knowledge'),
  governance:   ROLE_REGISTRY.filter(r => r.domain === 'governance'),
  craft:        ROLE_REGISTRY.filter(r => r.domain === 'craft'),
}

export const DOMAIN_META: Record<SkillDomain, { label: string; icon: string; tier: 1 | 2 | 3 }> = {
  medical:      { label: 'Medical',                     icon: '🏥', tier: 1 },
  food:         { label: 'Food & Agriculture',          icon: '🌾', tier: 1 },
  security:     { label: 'Security & Defense',          icon: '🛡️', tier: 1 },
  water:        { label: 'Water',                       icon: '💧', tier: 1 },
  energy:       { label: 'Energy & Power',              icon: '⚡', tier: 2 },
  construction: { label: 'Construction & Engineering',  icon: '🔨', tier: 2 },
  comms:        { label: 'Communications & Technology', icon: '📡', tier: 2 },
  logistics:    { label: 'Logistics & Supply',          icon: '📦', tier: 2 },
  knowledge:    { label: 'Knowledge & Training',        icon: '📚', tier: 3 },
  governance:   { label: 'Governance & Administration', icon: '🧭', tier: 3 },
  craft:        { label: 'Craft & Sustainability',      icon: '🧵', tier: 3 },
}

// Domain ordering for display
export const DOMAINS_BY_TIER: SkillDomain[][] = [
  ['medical', 'food', 'security', 'water'],
  ['energy', 'construction', 'comms', 'logistics'],
  ['knowledge', 'governance', 'craft'],
]

// ── Scaling algorithm ──────────────────────────────────────────────

export function slotsNeeded(pop: number, spec: RoleSpec): number {
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

// Total slots needed for the entire tribe at a given population
export function totalSlotsNeeded(pop: number): number {
  return ROLE_REGISTRY.reduce((sum, spec) => sum + slotsNeeded(pop, spec), 0)
}

// All active roles (those with slots > 0) at a given population
export function activeRoles(pop: number): RoleSpec[] {
  return ROLE_REGISTRY.filter(spec => slotsNeeded(pop, spec) > 0)
}
