import type { SkillRole, RoleSpecializations } from '../types/skills.js'

export const DEFAULT_EXPERIENCE_OPTIONS = ['< 1 year', '1–3 years', '3–7 years', '7–15 years', '15+ years']

export const SPECIALIZATION_REGISTRY: RoleSpecializations[] = [
  // ── MEDICAL ────────────────────────────────────────────────────
  { role: 'physician', specializations: [
    { key: 'general_practice', label: 'General Practice / Family Medicine' },
    { key: 'surgery', label: 'Surgery' },
    { key: 'emergency', label: 'Emergency Medicine' },
    { key: 'internal', label: 'Internal Medicine' },
    { key: 'orthopedic', label: 'Orthopedic' },
    { key: 'pediatric', label: 'Pediatric' },
    { key: 'ob_gyn', label: 'OB/GYN' },
    { key: 'anesthesiology', label: 'Anesthesiology' },
    { key: 'psychiatry', label: 'Psychiatry' },
  ]},
  { role: 'nurse', specializations: [
    { key: 'er_trauma', label: 'ER / Trauma' },
    { key: 'icu', label: 'ICU / Critical Care' },
    { key: 'surgical', label: 'Surgical' },
    { key: 'pediatric', label: 'Pediatric' },
    { key: 'ob', label: 'OB / Labor & Delivery' },
    { key: 'home_health', label: 'Home Health' },
    { key: 'nurse_practitioner', label: 'Nurse Practitioner (NP)' },
  ]},
  { role: 'paramedic', specializations: [
    { key: 'als', label: 'ALS (Advanced Life Support)' },
    { key: 'bls', label: 'BLS (Basic Life Support)' },
    { key: 'flight_medic', label: 'Flight Medic' },
    { key: 'tactical_ems', label: 'Tactical EMS' },
    { key: 'wilderness', label: 'Wilderness Medicine' },
  ]},
  { role: 'dentist', specializations: [
    { key: 'general', label: 'General Dentistry' },
    { key: 'oral_surgery', label: 'Oral Surgery' },
    { key: 'endodontics', label: 'Endodontics (Root Canal)' },
    { key: 'prosthodontics', label: 'Prosthodontics' },
  ]},
  { role: 'midwife', specializations: [
    { key: 'certified_nurse_midwife', label: 'Certified Nurse Midwife (CNM)' },
    { key: 'certified_professional', label: 'Certified Professional Midwife (CPM)' },
    { key: 'traditional', label: 'Traditional / Lay Midwife' },
    { key: 'home_birth', label: 'Home Birth Specialist' },
  ]},
  { role: 'veterinarian', specializations: [
    { key: 'large_animal', label: 'Large Animal (Livestock)' },
    { key: 'small_animal', label: 'Small Animal' },
    { key: 'equine', label: 'Equine' },
    { key: 'poultry', label: 'Poultry' },
    { key: 'vet_surgery', label: 'Veterinary Surgery' },
  ]},
  { role: 'pharmacist', specializations: [
    { key: 'clinical', label: 'Clinical Pharmacy' },
    { key: 'compounding', label: 'Compounding' },
    { key: 'herbalist', label: 'Herbalist / Plant Medicine' },
    { key: 'pharm_tech', label: 'Pharmacy Technician' },
  ]},

  // ── FOOD & AGRICULTURE ─────────────────────────────────────────
  { role: 'farmer', specializations: [
    { key: 'row_crops', label: 'Row Crops (Corn, Wheat, Soy)' },
    { key: 'vegetables', label: 'Vegetable Gardening' },
    { key: 'orchard', label: 'Orchard / Fruit Trees' },
    { key: 'greenhouse', label: 'Greenhouse / Indoor' },
    { key: 'permaculture', label: 'Permaculture' },
    { key: 'arid_climate', label: 'Arid / Dryland Farming' },
    { key: 'aquaponics', label: 'Aquaponics / Hydroponics' },
  ]},
  { role: 'livestock_handler', specializations: [
    { key: 'cattle', label: 'Cattle' },
    { key: 'goats_sheep', label: 'Goats / Sheep' },
    { key: 'poultry', label: 'Poultry (Chickens, Ducks, Turkey)' },
    { key: 'pigs', label: 'Pigs / Swine' },
    { key: 'horses', label: 'Horses / Mules' },
    { key: 'rabbits', label: 'Rabbits' },
  ]},
  { role: 'hunter', specializations: [
    { key: 'rifle', label: 'Rifle Hunting' },
    { key: 'bow', label: 'Bow Hunting' },
    { key: 'trapping', label: 'Trapping / Snaring' },
    { key: 'small_game', label: 'Small Game' },
    { key: 'big_game', label: 'Big Game' },
    { key: 'waterfowl', label: 'Waterfowl' },
  ]},
  { role: 'fisherman', specializations: [
    { key: 'freshwater', label: 'Freshwater Fishing' },
    { key: 'saltwater', label: 'Saltwater / Ocean' },
    { key: 'fly_fishing', label: 'Fly Fishing' },
    { key: 'netting', label: 'Netting / Trawling' },
    { key: 'aquaculture', label: 'Aquaculture / Fish Farming' },
  ]},
  { role: 'forager', specializations: [
    { key: 'wild_edibles', label: 'Wild Edible Plants' },
    { key: 'mushrooms', label: 'Mushroom Identification' },
    { key: 'medicinal_plants', label: 'Medicinal Plants' },
    { key: 'insects', label: 'Edible Insects' },
    { key: 'regional_flora', label: 'Regional Flora Expert' },
  ]},
  { role: 'beekeeper', specializations: [
    { key: 'langstroth', label: 'Langstroth Hive Management' },
    { key: 'top_bar', label: 'Top Bar / Natural Beekeeping' },
    { key: 'queen_rearing', label: 'Queen Rearing' },
    { key: 'honey_processing', label: 'Honey Processing & Extraction' },
  ]},
  { role: 'butcher', specializations: [
    { key: 'field_dressing', label: 'Field Dressing / Game' },
    { key: 'livestock_slaughter', label: 'Livestock Processing' },
    { key: 'curing_smoking', label: 'Curing & Smoking' },
    { key: 'sausage_making', label: 'Sausage / Charcuterie' },
  ]},
  { role: 'seed_saver', specializations: [
    { key: 'heirloom', label: 'Heirloom Varieties' },
    { key: 'seed_banking', label: 'Seed Banking & Storage' },
    { key: 'crop_rotation', label: 'Crop Rotation Planning' },
    { key: 'soil_science', label: 'Soil Science / Composting' },
  ]},
  { role: 'food_preserver', specializations: [
    { key: 'canning', label: 'Canning (Pressure & Water Bath)' },
    { key: 'dehydrating', label: 'Dehydrating / Freeze Drying' },
    { key: 'smoking', label: 'Smoking' },
    { key: 'fermenting', label: 'Fermenting (Sauerkraut, Kimchi)' },
    { key: 'root_cellar', label: 'Root Cellar / Cold Storage' },
  ]},

  // ── SECURITY & DEFENSE ─────────────────────────────────────────
  { role: 'tactical_shooter', specializations: [
    { key: 'infantry', label: 'Infantry' },
    { key: 'special_forces', label: 'Special Forces / SOF' },
    { key: 'law_enforcement', label: 'Law Enforcement' },
    { key: 'civilian_training', label: 'Civilian Tactical Training' },
    { key: 'cqb', label: 'CQB / Close Quarters' },
    { key: 'armor', label: 'Armor / Mechanized' },
  ]},
  { role: 'squad_leader', specializations: [
    { key: 'military_nco', label: 'Military NCO' },
    { key: 'military_officer', label: 'Military Officer' },
    { key: 'leo_supervisor', label: 'LEO Supervisor / Sergeant' },
    { key: 'militia_leader', label: 'Militia / Civilian Team Lead' },
  ]},
  { role: 'strategic_commander', specializations: [
    { key: 'military_planning', label: 'Military Operations Planning' },
    { key: 'logistics_command', label: 'Logistics / Supply Chain Command' },
    { key: 'intelligence_officer', label: 'Intelligence Officer' },
    { key: 'civil_defense', label: 'Civil Defense / FEMA' },
  ]},
  { role: 'sniper', specializations: [
    { key: 'military_sniper', label: 'Military Sniper School' },
    { key: 'leo_marksman', label: 'LEO Marksman / SWAT' },
    { key: 'competition', label: 'Competition / Long Range' },
    { key: 'spotter', label: 'Spotter / Observer' },
  ]},
  { role: 'combat_medic', specializations: [
    { key: 'army_68w', label: 'Army 68W / Combat Medic' },
    { key: 'navy_corpsman', label: 'Navy Corpsman' },
    { key: 'tccc', label: 'TCCC Certified' },
    { key: 'stop_the_bleed', label: 'Stop the Bleed / Civilian TECC' },
  ]},
  { role: 'intel_recon', specializations: [
    { key: 'military_recon', label: 'Military Recon' },
    { key: 'humint', label: 'HUMINT' },
    { key: 'osint', label: 'OSINT / Open Source Intelligence' },
    { key: 'counter_intel', label: 'Counter-Intelligence' },
    { key: 'surveillance', label: 'Surveillance / Counter-Surveillance' },
  ]},
  { role: 'armorer', specializations: [
    { key: 'gunsmithing', label: 'Gunsmithing' },
    { key: 'reloading', label: 'Ammo Reloading' },
    { key: 'weapons_maintenance', label: 'Weapons Maintenance' },
    { key: 'edged_weapons', label: 'Edged Weapons / Bladesmith' },
  ]},
  { role: 'k9_handler', specializations: [
    { key: 'patrol', label: 'Patrol / Bite Dog' },
    { key: 'detection', label: 'Detection (Explosive, Narcotics)' },
    { key: 'tracking', label: 'Tracking / Search & Rescue' },
    { key: 'herding', label: 'Herding / Livestock Dogs' },
  ]},

  // ── WATER ──────────────────────────────────────────────────────
  { role: 'well_driller', specializations: [
    { key: 'rotary', label: 'Rotary Drilling' },
    { key: 'hand_dug', label: 'Hand-Dug Wells' },
    { key: 'spring_development', label: 'Spring Development' },
    { key: 'dowsing_survey', label: 'Water Survey / Hydrogeology' },
  ]},
  { role: 'water_treatment', specializations: [
    { key: 'filtration', label: 'Filtration Systems' },
    { key: 'chemical', label: 'Chemical Treatment (Chlorine, Iodine)' },
    { key: 'uv', label: 'UV Treatment' },
    { key: 'testing', label: 'Water Quality Testing' },
    { key: 'rainwater', label: 'Rainwater Harvesting' },
  ]},
  { role: 'plumber', specializations: [
    { key: 'residential', label: 'Residential Plumbing' },
    { key: 'gravity_fed', label: 'Gravity-Fed Systems' },
    { key: 'irrigation', label: 'Irrigation / Drip Systems' },
    { key: 'septic', label: 'Septic / Waste Systems' },
  ]},

  // ── ENERGY & POWER ─────────────────────────────────────────────
  { role: 'electrician', specializations: [
    { key: 'residential', label: 'Residential Wiring' },
    { key: 'industrial', label: 'Industrial / Commercial' },
    { key: 'low_voltage', label: 'Low Voltage / DC Systems' },
    { key: 'off_grid', label: 'Off-Grid Systems' },
  ]},
  { role: 'solar_tech', specializations: [
    { key: 'panel_install', label: 'Panel Installation' },
    { key: 'charge_controllers', label: 'Charge Controllers / MPPT' },
    { key: 'inverters', label: 'Inverter Systems' },
    { key: 'system_design', label: 'System Design & Sizing' },
  ]},
  { role: 'generator_mechanic', specializations: [
    { key: 'diesel', label: 'Diesel Generators' },
    { key: 'gasoline', label: 'Gasoline Generators' },
    { key: 'propane_ng', label: 'Propane / Natural Gas' },
    { key: 'small_engine', label: 'Small Engine Repair' },
  ]},
  { role: 'battery_specialist', specializations: [
    { key: 'lead_acid', label: 'Lead Acid / AGM' },
    { key: 'lithium', label: 'Lithium (LiFePO4, Li-ion)' },
    { key: 'inverter_systems', label: 'Inverter / Charger Systems' },
    { key: 'battery_banks', label: 'Battery Bank Design' },
  ]},

  // ── CONSTRUCTION ───────────────────────────────────────────────
  { role: 'carpenter', specializations: [
    { key: 'framing', label: 'Framing / Structural' },
    { key: 'finish', label: 'Finish Carpentry' },
    { key: 'timber_frame', label: 'Timber Frame / Log' },
    { key: 'furniture', label: 'Furniture Making' },
    { key: 'roofing', label: 'Roofing' },
  ]},
  { role: 'mason', specializations: [
    { key: 'brick_block', label: 'Brick & Block' },
    { key: 'concrete', label: 'Concrete / Foundations' },
    { key: 'stone', label: 'Stone Masonry' },
    { key: 'earthen', label: 'Earthen (Adobe, Cob, Rammed Earth)' },
  ]},
  { role: 'welder', specializations: [
    { key: 'mig', label: 'MIG Welding' },
    { key: 'tig', label: 'TIG Welding' },
    { key: 'stick', label: 'Stick / Arc Welding' },
    { key: 'fabrication', label: 'Metal Fabrication' },
  ]},
  { role: 'heavy_equipment_operator', specializations: [
    { key: 'excavator', label: 'Excavator' },
    { key: 'bulldozer', label: 'Bulldozer' },
    { key: 'backhoe', label: 'Backhoe' },
    { key: 'crane', label: 'Crane Operator' },
  ]},
  { role: 'structural_engineer', specializations: [
    { key: 'buildings', label: 'Building Structures' },
    { key: 'bridges', label: 'Bridges' },
    { key: 'earthworks', label: 'Earthworks / Retaining Walls' },
    { key: 'fortification', label: 'Defensive Fortification' },
  ]},
  { role: 'blacksmith', specializations: [
    { key: 'toolmaking', label: 'Tool Making' },
    { key: 'bladesmith', label: 'Bladesmithing' },
    { key: 'farrier', label: 'Farrier (Horse Shoeing)' },
    { key: 'ornamental', label: 'Ornamental / Artistic' },
  ]},
  { role: 'surveyor', specializations: [
    { key: 'land_survey', label: 'Land Survey' },
    { key: 'topographic', label: 'Topographic Mapping' },
    { key: 'drainage', label: 'Drainage Planning' },
    { key: 'gis', label: 'GIS / Digital Mapping' },
  ]},

  // ── COMMUNICATIONS & TECHNOLOGY ────────────────────────────────
  { role: 'ham_radio_operator', specializations: [
    { key: 'hf', label: 'HF (Long Range)' },
    { key: 'vhf_uhf', label: 'VHF/UHF (Local)' },
    { key: 'digital_modes', label: 'Digital Modes (FT8, JS8Call, Winlink)' },
    { key: 'emergency_nets', label: 'Emergency Nets / ARES / RACES' },
    { key: 'antenna_building', label: 'Antenna Building' },
  ], experienceOptions: ['Technician License', 'General License', 'Extra License', 'No License (Learned)'] },
  { role: 'network_engineer', specializations: [
    { key: 'mesh_networking', label: 'Mesh Networking (Meshtastic, LoRa)' },
    { key: 'server_admin', label: 'Server Administration' },
    { key: 'networking', label: 'Networking (TCP/IP, Routing)' },
    { key: 'software_dev', label: 'Software Development' },
    { key: 'cybersecurity', label: 'Cybersecurity' },
  ]},
  { role: 'sigint', specializations: [
    { key: 'rf_monitoring', label: 'RF Monitoring / Scanning' },
    { key: 'direction_finding', label: 'Direction Finding' },
    { key: 'jamming', label: 'Electronic Countermeasures' },
    { key: 'comms_security', label: 'Communications Security' },
  ]},
  { role: 'cryptographer', specializations: [
    { key: 'encryption', label: 'Encryption / Key Management' },
    { key: 'opsec', label: 'OPSEC Planning' },
    { key: 'secure_comms', label: 'Secure Communications Setup' },
    { key: 'steganography', label: 'Steganography / Covert Channels' },
  ]},
  { role: 'drone_pilot', specializations: [
    { key: 'recon', label: 'Reconnaissance / Surveillance' },
    { key: 'mapping', label: 'Aerial Mapping / Photogrammetry' },
    { key: 'fpv', label: 'FPV / Racing' },
    { key: 'repair', label: 'Drone Repair / Building' },
  ]},

  // ── LOGISTICS & SUPPLY ─────────────────────────────────────────
  { role: 'cook', specializations: [
    { key: 'field_cooking', label: 'Field / Camp Cooking' },
    { key: 'mass_feeding', label: 'Mass Feeding (50+ people)' },
    { key: 'baking', label: 'Baking (Bread, Pastry)' },
    { key: 'food_safety', label: 'Food Safety / ServSafe' },
    { key: 'wild_game', label: 'Wild Game Preparation' },
  ]},
  { role: 'quartermaster', specializations: [
    { key: 'inventory', label: 'Inventory Management' },
    { key: 'supply_chain', label: 'Supply Chain / Procurement' },
    { key: 'rationing', label: 'Rationing / Distribution' },
    { key: 'warehouse', label: 'Warehouse / Storage Management' },
  ]},
  { role: 'vehicle_mechanic', specializations: [
    { key: 'diesel', label: 'Diesel Engines' },
    { key: 'gasoline', label: 'Gasoline Engines' },
    { key: 'atv_utv', label: 'ATV / UTV / Small Vehicles' },
    { key: 'heavy_truck', label: 'Heavy Truck / CDL Vehicles' },
    { key: 'motorcycle', label: 'Motorcycle' },
  ]},
  { role: 'fuel_specialist', specializations: [
    { key: 'storage', label: 'Fuel Storage & Stabilization' },
    { key: 'biodiesel', label: 'Biodiesel Production' },
    { key: 'ethanol', label: 'Ethanol / Alcohol Fuel' },
    { key: 'wood_gas', label: 'Wood Gasification' },
  ]},

  // ── KNOWLEDGE & TRAINING ───────────────────────────────────────
  { role: 'teacher', specializations: [
    { key: 'elementary', label: 'Elementary / Primary' },
    { key: 'secondary', label: 'Secondary / High School' },
    { key: 'stem', label: 'STEM Subjects' },
    { key: 'vocational', label: 'Vocational / Trade Skills' },
    { key: 'literacy', label: 'Literacy / ESL' },
  ]},
  { role: 'skills_trainer', specializations: [
    { key: 'firearms', label: 'Firearms Training' },
    { key: 'first_aid', label: 'First Aid / CPR' },
    { key: 'survival', label: 'Survival Skills' },
    { key: 'fitness', label: 'Physical Fitness / PT' },
    { key: 'trade_skills', label: 'Trade Skills Training' },
  ]},
  { role: 'historian', specializations: [
    { key: 'documentation', label: 'Documentation / Record Keeping' },
    { key: 'oral_history', label: 'Oral History' },
    { key: 'technical_writing', label: 'Technical Writing / SOPs' },
    { key: 'photography', label: 'Photography / Videography' },
  ]},
  { role: 'chaplain', specializations: [
    { key: 'pastoral', label: 'Pastoral Counseling' },
    { key: 'trauma', label: 'Trauma / Crisis Counseling' },
    { key: 'conflict_resolution', label: 'Conflict Resolution' },
    { key: 'group_facilitation', label: 'Group Facilitation' },
  ]},

  // ── GOVERNANCE & ADMINISTRATION ────────────────────────────────
  { role: 'strategic_planner', specializations: [
    { key: 'resource_allocation', label: 'Resource Allocation' },
    { key: 'risk_assessment', label: 'Risk Assessment' },
    { key: 'project_management', label: 'Project Management' },
    { key: 'scenario_planning', label: 'Scenario Planning' },
  ]},
  { role: 'mediator', specializations: [
    { key: 'legal', label: 'Legal Background' },
    { key: 'mediation_cert', label: 'Certified Mediator' },
    { key: 'restorative_justice', label: 'Restorative Justice' },
    { key: 'community_organizing', label: 'Community Organizing' },
  ]},
  { role: 'scribe', specializations: [
    { key: 'minutes', label: 'Meeting Minutes / Records' },
    { key: 'census', label: 'Census / Demographics' },
    { key: 'mapping', label: 'Map Making / Cartography' },
    { key: 'data_management', label: 'Data Management' },
  ]},
  { role: 'diplomat', specializations: [
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'trade_barter', label: 'Trade / Barter' },
    { key: 'multilingual', label: 'Multilingual Communication' },
    { key: 'alliance_building', label: 'Alliance Building' },
  ]},

  // ── CRAFT & SUSTAINABILITY ─────────────────────────────────────
  { role: 'seamstress', specializations: [
    { key: 'clothing_repair', label: 'Clothing Repair / Mending' },
    { key: 'garment_making', label: 'Garment Making' },
    { key: 'tactical_gear', label: 'Tactical Gear / Packs' },
    { key: 'spinning_weaving', label: 'Spinning / Weaving' },
  ]},
  { role: 'cobbler', specializations: [
    { key: 'shoe_repair', label: 'Shoe Repair' },
    { key: 'boot_making', label: 'Boot Making' },
    { key: 'leather_goods', label: 'Leather Goods (Belts, Holsters)' },
    { key: 'tanning', label: 'Tanning / Hide Processing' },
  ]},
  { role: 'potter', specializations: [
    { key: 'wheel', label: 'Wheel Throwing' },
    { key: 'hand_building', label: 'Hand Building' },
    { key: 'kiln', label: 'Kiln Building / Firing' },
    { key: 'glazing', label: 'Glazing / Finishing' },
  ]},
  { role: 'soapmaker', specializations: [
    { key: 'cold_process', label: 'Cold Process Soap' },
    { key: 'lye_making', label: 'Lye Making (Wood Ash)' },
    { key: 'cleaning_products', label: 'Cleaning Products' },
    { key: 'essential_oils', label: 'Essential Oil Extraction' },
  ]},
  { role: 'brewer', specializations: [
    { key: 'beer', label: 'Beer Brewing' },
    { key: 'wine', label: 'Wine Making' },
    { key: 'distilling', label: 'Distilling (Spirits)' },
    { key: 'cider_mead', label: 'Cider / Mead' },
    { key: 'vinegar', label: 'Vinegar Production' },
  ]},
]

// ── Lookup helpers ─────────────────────────────────────────────────

export const SPECIALIZATIONS_BY_ROLE: Record<string, RoleSpecializations> = Object.fromEntries(
  SPECIALIZATION_REGISTRY.map(s => [s.role, s])
)

export function getSpecializationsForRole(role: SkillRole): RoleSpecializations | undefined {
  return SPECIALIZATIONS_BY_ROLE[role]
}
