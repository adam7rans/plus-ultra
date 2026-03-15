# Plus Ultra — Extended Roadmap

> Created: 2026-03-14
> Continues from ROADMAP.md (Phases 1–8, all complete).
> Covers ten new systems identified in the Phase 8 gap analysis.

This document covers what a tribe needs to be a **functioning, organized operational unit** — not just a roster with a chat channel. These features close the gap between "useful app" and "tribe operating system."

---

## Gap Summary

| # | Feature | Status | Grid-Down Critical | Depends On |
|---|---|---|---|---|
| 9.1 | Production Tracking | ✅ Complete | Yes | Inventory (done), Consumption (done) |
| 9.2 | Roll Call / Accountability | ✅ Complete | Yes | Notifications (done), Member Profiles (done) |
| 9.3 | External Contacts | ✅ Complete | Partial | — |
| 10.1 | Member Health / Medical Status | 🔲 TODO | Yes | Member Profiles (done), Roll Call (9.2) |
| 10.2 | PACE Comms Plan | 🔲 TODO | Yes | Map (done), Certifications (done) |
| 11.1 | Goals + Tasks (Tribe OKRs + Kanban) | 🔲 TODO | Yes | Proposals (done), Member Profiles (done) |
| 11.2 | Bug-Out / Evacuation Planning | 🔲 TODO | Yes | Map (done), Inventory (done), Health (10.1) |
| 12.1 | SOPs / Knowledge Base / Playbooks | 🔲 TODO | Yes | Permissions (done), Bug-Out (11.2), PACE (10.2) |
| 12.2 | Financial / Shared Expense Tracking | 🔲 TODO | Grid-up | Inventory (done) |
| 13.1 | Composite Readiness Score | 🔲 TODO | No — synthesizes all | Production (9.1), Health (10.1), all prior phases |

---

## Dependency Graph

```
Phase 9 — Resource Completeness + Accountability (independent entries)
  ├── 9.1 Production Tracking    ← no new deps
  ├── 9.2 Roll Call              ← no new deps
  └── 9.3 External Contacts      ← no new deps

Phase 10 — Member Wellbeing + Comms
  ├── 10.1 Health Status         ← enriched by 9.2 (roll call response fields)
  └── 10.2 PACE Comms Plan       ← enriched by 10.1 (medical status during comms)

Phase 11 — Operational Planning
  ├── 11.1 Goals + Tasks         ← no new deps (enriched by 10.1 for task health context)
  └── 11.2 Bug-Out Planning      ← requires 10.1 (health/mobility per member)

Phase 12 — Knowledge + Finance
  ├── 12.1 SOPs / Knowledge Base ← enriched by 11.2 (bug-out SOP) and 10.2 (PACE SOP)
  └── 12.2 Financial Tracking    ← no new deps

Phase 13 — Intelligence Synthesis
  └── 13.1 Composite Readiness   ← requires 9.1, 10.1; benefits from all phases
```

---

## Phase 9 — Resource Completeness + Accountability `✅ Complete`

_Three independent, high-value additions that close obvious gaps with minimal new surface area._

---

### 9.1 Production Tracking `✅`

**Problem:** Consumption tracking shows burn rate and days-until-depletion. Inventory shows current stock. But there's no production side of the ledger. A tribe harvesting food, filtering water, or generating power is in a fundamentally different position than one that isn't — and the app currently can't see this.

**Net position = production rate − consumption rate.** Without production, depletion estimates are systematically pessimistic.

**Core types** (`packages/core/src/types/production.ts` — new file):
```typescript
export type ProductionCategory = 'food' | 'water' | 'energy' | 'materials'

export interface ProductionEntry {
  id: string
  tribeId: string
  assetType: string        // references AssetType from asset-registry
  category: ProductionCategory
  amount: number
  unit: string             // 'lbs', 'gallons', 'kWh', 'units'
  periodDays: number       // how many days this production covers
  loggedAt: number         // timestamp
  loggedBy: string         // memberPub
  notes?: string
  source?: string          // 'garden', 'rainwater', 'solar', 'livestock', etc.
}

export interface ProductionRate {
  assetType: string
  dailyRate: number        // units/day (rolling 30-day average)
  unit: string
  lastLoggedAt: number
}
```

**Core algorithm** (`packages/core/src/lib/production-rate.ts` — new file):
- `computeProductionRate(entries, assetType)` — rolling 30-day average (same pattern as `computeBurnRate`)
- `computeNetRate(productionRate, consumptionRate)` — net units/day
- `computeNetDaysRemaining(currentStock, netRate)` — adjusted depletion accounting for production

**IDB changes** (`lib/db.ts`):
- Add `production-log` object store (version bump), key: `${tribeId}:${assetType}:${id}`

**Lib** (`lib/production.ts` — new file):
- `logProductionEntry(tribeId, assetType, amount, periodDays, notes?)` — IDB first, Gun sync
- `subscribeToProduction(tribeId, callback)` — same IDB-seed + once()+on() poll pattern
- Gun path: `gun.get('tribes').get(tribeId).get('production').get(entryId)`

**Hook** (`hooks/useProduction.ts` — new file):
- `useProduction(tribeId)` — returns entries, rates per asset, net positions

**UI** (`screens/ProductionScreen.tsx` — new screen):
- Log a production event: asset type, amount, period, source, notes
- View production history grouped by asset category
- Net position row per asset: production rate vs consumption rate vs stock → adjusted days remaining
- Seasonal planting overlay: link to ScheduleScreen for planting/harvest events
- Access via: Tribe Dashboard → Resources (alongside Inventory + Consumption)

**Wire into existing screens:**
- `InventoryScreen`: add net rate column next to burn rate; update depletion label
- `TribeDashboard`: show net resource position widget (replacing or augmenting the simple consumption widget)
- `TribeSchematicScreen`: incorporate net production in asset readiness calculation

**Effort:** ~3–4 hrs. Purely additive — slots alongside existing consumption module.

---

### 9.2 Roll Call / Member Accountability `✅`

**Problem:** The app has `lastSeen` timestamps and online/offline status, but no structured accountability mechanism. After a perimeter breach, a medical emergency, or a bug-out, the first operational task is: **who is here and who is not?** There is currently no mechanism to answer this.

**Core types** (`packages/core/src/types/rollcall.ts` — new file):
```typescript
export type MusterStatus = 'present' | 'away_authorized' | 'injured' | 'missing' | 'unknown'

export interface MusterCall {
  id: string
  tribeId: string
  initiatedBy: string       // memberPub
  initiatedAt: number
  closedAt?: number
  reason?: string           // 'routine' | 'emergency' | 'drill' | 'event'
  responses: Record<string, MusterResponse>  // memberPub → response
}

export interface MusterResponse {
  memberPub: string
  status: MusterStatus
  respondedAt: number
  location?: string         // free text or lat,lng string
  note?: string
}
```

**IDB changes:**
- Add `muster-calls` store (version bump), key: `${tribeId}:${id}`

**Lib** (`lib/rollcall.ts` — new file):
- `initiateMuster(tribeId, initiatorPub, reason?)` — creates MusterCall, writes to Gun, triggers notification to all members
- `respondToMuster(tribeId, musterId, memberPub, status, note?)` — writes response, Gun-synced
- `closeMuster(tribeId, musterId)` — marks closed, writes summary
- `subscribeToActiveMuster(tribeId, callback)` — live muster status board
- Gun path: `gun.get('tribes').get(tribeId).get('muster').get(musterId)`

**Notifications integration:**
- When muster is initiated → `notify()` all tribe members with type `muster_called`
- Push notification (via existing push.ts) if available

**UI** (`screens/RollCallScreen.tsx` — new screen, also accessible as modal):
- Initiate muster (elder_council+ only): choose reason, one tap
- Member response view: large status buttons (Present / Away / Injured / Need Help)
- Live status board: green/yellow/red/grey per member, with response time
- Summary when closed: X present, Y away, Z unaccounted
- History: past musters with outcomes
- Quick muster button on TribeDashboard (visible to elder_council+, prominent during alerts)

**Dead-man switch (optional, Phase 2 of this feature):**
- Configurable check-in interval (e.g., every 12 hrs during grid-down)
- If no check-in, escalate: first a reminder notification, then flag member as `unknown` in the active roster

**Effort:** ~3–4 hrs. Reuses notification system heavily.

---

### 9.3 External Contacts / Resources `✅`

**Problem:** A tribe's network extends beyond its membership. Doctors, lawyers, HAM operators, local vendors, mutual-aid groups, and allied individuals who aren't tribe members are all critical resources — especially grid-down. Currently there's no place to store them.

**Core types** (`packages/core/src/types/contacts.ts` — new file):
```typescript
export type ContactCategory =
  | 'medical'       // doctors, vets, nurses outside the tribe
  | 'legal'         // lawyers, notaries
  | 'comms'         // HAM operators, radio clubs
  | 'supply'        // vendors, farmers, suppliers (grid-up)
  | 'mutual_aid'    // allied individuals/groups not in federation
  | 'authority'     // sheriff, fire, local government (grid-up)
  | 'other'

export interface ExternalContact {
  id: string
  tribeId: string
  name: string
  category: ContactCategory
  role?: string              // "EMT", "HAM operator KD9XYZ", "County Sheriff"
  phone?: string
  radioFreq?: string         // HAM frequency/callsign
  location?: string          // address or lat,lng
  notes?: string
  addedBy: string            // memberPub
  addedAt: number
  lastVerified?: number      // when contact was last confirmed accurate
}
```

**IDB changes:**
- Add `external-contacts` store (version bump), key: `${tribeId}:${id}`

**Lib** (`lib/contacts.ts` — new file):
- `addContact(tribeId, contact)` — IDB + Gun
- `updateContact(...)`, `deleteContact(...)`
- `subscribeToContacts(tribeId, callback)` — IDB-seed + once()+on()
- Gun path: `gun.get('tribes').get(tribeId).get('contacts').get(id)`

**UI** (`screens/ContactsScreen.tsx` — new screen):
- List contacts grouped by category
- Search/filter
- Add/edit contact form
- Tap contact → detail view with all fields + "Copy frequency" / "Copy phone" actions
- Map pin option: if location provided, show on MapScreen
- Accessible offline (IDB-backed)

**Effort:** ~2 hrs. Simple CRUD, well-understood pattern.

---

## Phase 10 — Member Wellbeing + Comms `🔲 TODO`

_These two features are companions: health status informs who can respond to a comms check-in, and PACE plans reference medical assets and injured members._

---

### 10.1 Member Health / Medical Status `🔲`

**Problem:** The medical skills domain tracks *who knows medicine*. But there's no record of *who needs medicine* — and in a grid-down emergency, triage requires both. Blood type, allergies, current injury status, and critical medications are life-or-death data.

**Dependencies:** Member Profiles (done). Roll Call 9.2 (health status becomes a roll call response field).

**Core types** — extend `TribeMember` in `core/types/tribe.ts`:
```typescript
// Add to TribeMember:
bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown'
allergies?: string[]
medications?: string[]           // critical ongoing medications
medicalConditions?: string[]     // relevant to emergency response
currentHealthStatus?: HealthStatus
healthStatusUpdatedAt?: number
healthStatusUpdatedBy?: string   // memberPub (self or medic/founder)
```

New standalone type:
```typescript
export type HealthStatus =
  | 'well'
  | 'minor_injury'     // operational but impaired
  | 'major_injury'     // non-operational, needs care
  | 'critical'         // immediate medical intervention needed
  | 'deceased'
```

**Visibility rules:** Health data is sensitive. Read access:
- Own profile: always
- Medical role (any level) + elder_council + founder: all member health data
- Other members: only `currentHealthStatus` (not blood type, medications, conditions)

**IDB changes:** No schema change — health fields stored on the existing member record.

**Lib** (`lib/tribes.ts` — extend):
- `updateMemberHealth(tribeId, memberPub, healthData, updaterPub)` — IDB + Gun
- `setHealthStatus(tribeId, memberPub, status, updaterPub)` — quick status update

**UI:**
- `MemberProfileScreen.tsx` — add health section (visible per rules above); editable by self + authorized roles
- Edit form: blood type selector, allergy/medication chips, condition chips, status selector
- `RollCallScreen.tsx` (9.2) — when a member responds "injured", prompt to update health status
- **Emergency Card:** QR code or printable card showing: name, blood type, allergies, critical medications, emergency contact. Accessible from own profile. Printable for physical carry.

**Effort:** ~2–3 hrs. Mostly data model + profile screen extension.

---

### 10.2 PACE Comms Plan `🔲`

**Problem:** The app assumes connectivity. It has no plan for when the relay goes down, the internet dies, or the devices go dark. PACE (Primary / Alternate / Contingency / Emergency) is the military standard for communications resilience. Without it, when the app stops working, the tribe loses coordination entirely.

**Dependencies:** Map (done), Certifications/Training (done — HAM callsigns may already be in certs). External Contacts (9.3 — radio operators in contacts list).

**Core types** (`packages/core/src/types/comms.ts` — new file):
```typescript
export type CommsLevel = 'primary' | 'alternate' | 'contingency' | 'emergency'
export type CommsMethod = 'app' | 'ham_radio' | 'frs_gmrs' | 'cb' | 'phone' | 'runner' | 'signal_mirror' | 'other'

export interface PaceMethod {
  level: CommsLevel
  method: CommsMethod
  details: string           // frequency, channel, callsign, meeting point, etc.
  triggerCondition: string  // "when app relay is unreachable", "when no radio", etc.
  notes?: string
}

export interface CheckInSchedule {
  id: string
  label: string             // "Morning net", "Evening check-in"
  timeOfDay: string         // "08:00", "20:00" (local time)
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed'
  method: CommsMethod
  details: string
  notes?: string
}

export interface RallyPoint {
  id: string
  label: string             // "Primary rally", "Secondary rally"
  description: string
  coordinates?: { lat: number; lng: number }
  triggerCondition: string  // "if separated from base", "if base is compromised"
  notes?: string
}

export interface TribePacePlan {
  tribeId: string
  methods: PaceMethod[]           // 4 levels, 1+ methods each
  checkInSchedules: CheckInSchedule[]
  rallyPoints: RallyPoint[]
  codeWords?: Record<string, string>   // label → meaning (e.g., "Eagle" → "All clear")
  lastUpdatedAt: number
  lastUpdatedBy: string
}
```

**IDB changes:**
- Add `pace-plan` store (version bump), key: `${tribeId}`

**Lib** (`lib/comms.ts` — new file):
- `savePacePlan(tribeId, plan)` — IDB + Gun (plan is tribe-wide, founder/elder_council only)
- `getPacePlan(tribeId)` — IDB read
- `subscribeToPacePlan(tribeId, callback)` — Gun sync
- Gun path: `gun.get('tribes').get(tribeId).get('pace-plan')`

**UI** (`screens/CommsScreen.tsx` — new screen):
- PACE plan editor: 4-tab layout (Primary / Alternate / Contingency / Emergency); each tab: method selector + details text + trigger condition
- Check-in schedule builder: add/remove schedules, time + frequency + method
- Rally points: list with optional map pin (taps to open MapScreen at that location)
- Code words table: add/remove label→meaning pairs
- Read-only view for members; edit gated to elder_council+
- **Offline-first, prominently accessible** — this screen needs to work when nothing else does
- Print/share: export PACE plan as plain text (for paper backup)

**HAM integration:**
- When adding a HAM radio method, if tribe has members with HAM certifications, suggest their callsigns from cert records
- Link to ExternalContacts (9.3) for non-member radio operators in the area

**Effort:** ~3–4 hrs. New data model but straightforward UI pattern.

---

## Phase 11 — Operational Planning `🔲 TODO`

_The two features that transform Plus Ultra from a status dashboard into an actual operating system. Goals give tribes direction; bug-out planning gives them an exit._

---

### 11.1 Goals + Tasks (Tribe OKRs + Kanban) `🔲`

**Problem:** Proposals handle *decisions*. Events handle *scheduled time*. Training handles *skill development*. But there's no system for *ongoing work* — what the tribe is actively trying to accomplish. Without goals, tribes drift. Without tasks, nothing gets done.

**Dependencies:** Proposals (done — proposals can auto-generate goals). Member Profiles (done — for assignment). Notifications (done — task assignment notifications).

**Data model:**

Three-level hierarchy: **Goal → Milestone → Task**

```typescript
// packages/core/src/types/tasks.ts — new file

export type GoalHorizon = 'weekly' | 'monthly' | 'quarterly' | 'ongoing'
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled'
export type TaskStatus = 'backlog' | 'in_progress' | 'blocked' | 'done' | 'cancelled'
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low'

export interface TribeGoal {
  id: string
  tribeId: string
  title: string
  description?: string
  horizon: GoalHorizon
  status: GoalStatus
  ownedBy?: string          // memberPub — who is accountable
  dueDate?: number          // timestamp
  linkedProposalId?: string // proposal that created this goal
  createdBy: string
  createdAt: number
  completedAt?: number
}

export interface GoalMilestone {
  id: string
  goalId: string
  tribeId: string
  title: string
  description?: string
  dueDate?: number
  assignedTo?: string       // memberPub
  status: TaskStatus
  completedAt?: number
}

export interface TribeTask {
  id: string
  milestoneId?: string      // optional — tasks can exist without a milestone
  goalId?: string           // for direct goal-linked tasks
  tribeId: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assignedTo?: string[]     // one or more memberPubs
  assignedRole?: string     // role key — "medical_officer", etc. (alt to memberPub)
  dueDate?: number
  blockedReason?: string    // if status === 'blocked'
  createdBy: string
  createdAt: number
  updatedAt: number
  completedAt?: number
  linkedEventId?: string    // optional — task tied to a scheduled event
}
```

**IDB changes:**
- Add `tribe-goals`, `goal-milestones`, `tribe-tasks` stores (version bump)
- Keys: `${tribeId}:${id}` pattern (consistent with everything else)

**Lib** (`lib/tasks.ts` — new file):
- `createGoal(tribeId, goal)` — IDB + Gun
- `updateGoal(...)`, `completeGoal(...)`, `cancelGoal(...)`
- `createMilestone(tribeId, goalId, milestone)` — IDB + Gun
- `createTask(tribeId, task)` — IDB + Gun; triggers `task_assigned` notification if `assignedTo` set
- `updateTask(tribeId, taskId, updates)` — IDB + Gun; moving to `done` updates milestone/goal completion % automatically
- `subscribeToGoals(tribeId, callback)` — full tree: goals + milestones + tasks
- Gun paths:
  - `gun.get('tribes').get(tribeId).get('goals').get(goalId)`
  - `gun.get('tribes').get(tribeId).get('tasks').get(taskId)`

**Proposal → Goal bridge:** When a proposal passes, show a "Create Goal from this Proposal" button on the ProposalDetailScreen. Pre-fills goal title from proposal title. One-click.

**Notification types** (extend existing notification system):
- `task_assigned` — when a task is assigned to you
- `task_due_soon` — 24 hrs before due date
- `milestone_completed` — when all tasks in a milestone are done
- `goal_completed` — when all milestones in a goal are done

**UI:**

`screens/GoalsScreen.tsx` — new screen:
- **Goals tab:** list of active goals with horizon badge, owner avatar, % complete, due date. Tap to expand milestones tree.
- **My Tasks tab:** Kanban board filtered to tasks assigned to you — columns: Backlog / In Progress / Blocked / Done. Drag to move status.
- **All Tasks tab:** Full tribe Kanban — same columns, all members. Filterable by goal, assignee, priority.
- Goal detail: title, description, owner, milestones list with task counts, progress bar
- Task card: title, priority badge, assignee avatar, due date, status chip, "Mark Done" one-tap action
- Create task: form with all fields, role-based assignment option (assign to "whoever has EMT cert" rather than specific person)

**Access control:**
- Create goals: elder_council+
- Create tasks within goals: lead+ for their domain, elder_council+ for any domain
- Update task status: assigned member (own tasks) + lead+ + elder_council+
- All members can view all goals and tasks

**Effort:** ~5–6 hrs. The largest new feature. Well worth it.

---

### 11.2 Bug-Out / Evacuation Planning `🔲`

**Problem:** Maps, routes, and inventory exist, but there's no structured evacuation plan. When the order comes to leave, critical decisions — who rides with whom, what gets loaded, where to meet if separated — should already be made. Under stress is the wrong time to figure these out.

**Dependencies:** Map (done), Inventory (done), Member Profiles (done), Health Status (10.1 — to account for injured members in vehicle assignments).

**Core types** (`packages/core/src/types/bugout.ts` — new file):
```typescript
export interface BugOutPlan {
  id: string
  tribeId: string
  name: string               // "Plan Alpha", "Plan Bravo"
  triggerCondition: string   // "grid-down > 72hrs", "security breach at perimeter"
  status: 'draft' | 'active' | 'archived'
  primaryRouteId?: string    // references PatrolRoute (repurposed as bug-out route)
  alternateRouteId?: string
  destinationLabel?: string
  destinationCoords?: { lat: number; lng: number }
  vehicles: BugOutVehicle[]
  loadPriorities: LoadPriority[]
  rallyPointIds: string[]    // references PACE rally points (10.2)
  notes?: string
  createdBy: string
  createdAt: number
  lastUpdatedAt: number
}

export interface BugOutVehicle {
  id: string
  label: string              // "Blue Pickup", "White Van"
  capacity: number           // persons
  driverPub: string          // memberPub
  passengerPubs: string[]
  cargoNotes?: string
}

export interface LoadPriority {
  rank: number               // 1 = load first
  assetType: string          // references AssetType
  quantity: number
  notes?: string
}
```

**IDB changes:**
- Add `bugout-plans` store (version bump), key: `${tribeId}:${id}`

**Lib** (`lib/bugout.ts` — new file):
- `saveBugOutPlan(tribeId, plan)` — IDB + Gun
- `activateBugOutPlan(tribeId, planId)` — marks as active + sends tribe alert via notification system
- `getBugOutPlans(tribeId)` — IDB read, all plans
- `subscribeToBugOutPlans(tribeId, callback)` — Gun sync

**UI** (`screens/BugOutScreen.tsx` — new screen):
- List of plans (draft/active/archived) with trigger condition and status
- Plan editor:
  - Trigger condition text field
  - Route selector (links to MapScreen patrol routes — reused as bug-out routes)
  - Vehicle roster: add vehicle, assign driver (dropdown of tribe members), assign passengers, capacity check (warn if assigned > capacity), cargo notes
  - Load priority list: ordered drag list, asset type + quantity + notes
  - Rally points: reference from PACE plan (10.2) or create new
  - Destination: text + optional map pin
- "Activate Plan" button (elder_council+): sends emergency alert to all tribe members with plan name and trigger
- Members can view plans (read-only) — the plan needs to be known to everyone before it's needed

**Map integration:** Bug-out routes displayed on MapScreen as a distinct route type (different color/style from patrol routes).

**Effort:** ~3–4 hrs. New data model, mostly UI composition from existing components.

---

## Phase 12 — Knowledge + Finance `🔲 TODO`

---

### 12.1 SOPs / Knowledge Base / Playbooks `🔲`

**Problem:** The app has roles, skills, certs, and training — but no place to store *how to do things*. When the grid goes down and the trained person is injured, someone else needs to follow their protocols. Pre-written SOPs accessible offline are critical for operational continuity.

**Dependencies:** Permissions (done), Bug-Out (11.2 — provides the first SOP template), PACE (10.2 — provides the second). Both can be auto-templated as SOPs on creation.

**Core types** (`packages/core/src/types/docs.ts` — new file):
```typescript
export type DocCategory =
  | 'medical'
  | 'security'
  | 'food_water'
  | 'comms'
  | 'evacuation'
  | 'governance'
  | 'training'
  | 'other'

export type DocStatus = 'draft' | 'active' | 'superseded' | 'archived'

export interface TribeDoc {
  id: string
  tribeId: string
  title: string
  category: DocCategory
  status: DocStatus
  content: string           // Markdown — renders offline
  version: number           // integer, incremented on each approval
  authorPub: string
  approvedBy?: string       // elderPub — required to set status: 'active'
  createdAt: number
  updatedAt: number
  approvedAt?: number
  linkedRoles?: string[]    // role keys this SOP is relevant to
  tags?: string[]
}
```

**IDB changes:**
- Add `tribe-docs` store (version bump), key: `${tribeId}:${id}`

**Lib** (`lib/docs.ts` — new file):
- `createDoc(tribeId, doc)` — IDB + Gun
- `updateDoc(tribeId, docId, content, authorPub)` — increments version, sets status back to `draft` if was `active`
- `approveDoc(tribeId, docId, approverPub)` — requires elder_council+, sets `status: 'active'`
- `subscribeToTribeDocs(tribeId, callback)` — IDB-seed + Gun sync
- Gun path: `gun.get('tribes').get(tribeId).get('docs').get(docId)`

**Access control:**
- All members: read all active docs
- lead+: create/edit docs in their domain
- elder_council+: approve/archive docs, edit any doc

**UI** (`screens/KnowledgeBaseScreen.tsx` — new screen):
- Category tabs with doc counts
- Document list: title, version, status badge (draft/active), last updated
- Document reader: Markdown renderer (offline-capable, no external CDN)
- Document editor: Markdown textarea with preview toggle
- Version history: list of past versions with author + date
- Approval workflow: "Submit for approval" → appears in elder_council's review queue (notification)
- Search: full-text search across all active docs (client-side, no server needed)

**Starter templates** (generated on first open):
- PACE plan SOP (pulls from 10.2 data if exists)
- Bug-out SOP (pulls from 11.2 data if exists)
- Medical emergency checklist
- Perimeter breach protocol
- All-clear procedure

**Offline delivery:** Docs are stored in IDB and sync via Gun. No internet required after first sync. A "Download all" option re-serializes all active docs to a single plaintext file for paper backup.

**Effort:** ~4–5 hrs. Markdown rendering adds some complexity; versioning/approval workflow is the nuanced part.

---

### 12.2 Financial / Shared Expense Tracking `🔲`

**Problem:** Grid-up tribes have real shared costs — bulk food purchases, ammunition, fuel, equipment, land fees. Without a ledger, contributions become informal and resentment builds. This is a grid-up feature only; deprioritize for grid-down focus.

**Dependencies:** Inventory (done — expense entries can link to inventory assets). No new deps from Phase 9–12.

**Core types** (`packages/core/src/types/finance.ts` — new file):
```typescript
export type ExpenseCategory = 'supplies' | 'equipment' | 'land' | 'services' | 'fuel' | 'training' | 'other'

export interface TribeExpense {
  id: string
  tribeId: string
  category: ExpenseCategory
  description: string
  amount: number             // in cents (avoids float issues)
  currency: string           // 'USD', 'EUR', etc.
  paidBy: string             // memberPub
  splitAmong: string[]       // memberPubs — who owes a share
  linkedAssetType?: string   // references AssetType (optional)
  receiptNote?: string
  loggedAt: number
  loggedBy: string
}

export interface TribeFund {
  tribeId: string
  balance: number            // in cents
  currency: string
  contributions: FundContribution[]
}

export interface FundContribution {
  id: string
  memberPub: string
  amount: number
  note?: string
  contributedAt: number
}
```

**IDB changes:**
- Add `tribe-expenses`, `tribe-fund` stores (version bump)

**Lib** (`lib/finance.ts` — new file):
- `logExpense(tribeId, expense)` — IDB + Gun
- `logContribution(tribeId, contribution)` — IDB + Gun
- `getMemberBalance(tribeId, memberPub, expenses, contributions)` — compute net position
- `subscribeToFinances(tribeId, callback)` — IDB-seed + Gun sync

**UI** (`screens/FinanceScreen.tsx` — new screen):
- Fund balance display + contribution history
- Expense log: list with category icons, amounts, who paid, split
- Member balances: who's owed money, who owes money (relative to equal split)
- "Log Expense" form: category, description, amount, paid-by, split-among
- "Add Contribution" form: amount, note
- Export: plaintext summary for record-keeping

**Effort:** ~2–3 hrs. Straightforward CRUD + simple arithmetic.

---

## Phase 13 — Intelligence Synthesis `🔲 TODO`

---

### 13.1 Composite Readiness Score `🔲`

**Problem:** The survivability score is skills-only. A tribe with all the right skills but no food, injured members, no comms plan, and no goals is not ready. A true readiness picture requires synthesizing across all dimensions.

**Dependencies:** Requires Production (9.1) and Health (10.1) for complete data. Benefits from all prior phases but can compute partial score from available data.

**Scoring model** (`packages/core/src/lib/readiness.ts` — new file):

Six weighted dimensions → composite 0–100 score:

```
Personnel Readiness (30%)
  - Skills coverage (survivability score — existing)
  - Health status of members (% well/operational)
  - Training recency (certs not expired, training this month)

Supply Readiness (25%)
  - Inventory vs needed (asset readiness %)
  - Net resource position (production − consumption for critical stores)
  - Days-until-depletion for food/water/fuel/ammo

Infrastructure Readiness (15%)
  - Map completeness (territory drawn, critical pins placed)
  - Asset physical readiness (structures, vehicles, equipment)

Comms Readiness (10%) — NEW from Phase 10
  - PACE plan exists and is complete
  - HAM-certified members present
  - Check-in schedule defined

Coordination Readiness (10%)
  - Active goals with assigned owners
  - Open proposals being resolved (not stalled)
  - Muster last conducted within 30 days

Morale / Cohesion (10%) — from psych module
  - Archetype diversity score (tribe has range of archetypes)
  - Average peer attachment score across members
  - Compatibility score mean
```

**Output types:**
```typescript
export interface CompositeReadinessReport {
  tribeId: string
  overall: number            // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'   // A≥90, B≥75, C≥60, D≥45, F<45
  dimensions: {
    personnel: number
    supply: number
    infrastructure: number
    comms: number
    coordination: number
    cohesion: number
  }
  criticalGaps: string[]     // human-readable gap descriptions
  computedAt: number
}
```

**UI** (`screens/ReadinessScreen.tsx` — new screen, also a TribeDashboard widget):
- Hexagonal radar chart (6 dimensions) + overall score + grade
- Each dimension: expandable detail showing what's contributing positively/negatively
- Critical gaps list: ordered by impact, with suggested actions ("Log training session", "Complete PACE plan", "Add food inventory")
- Historical score chart: show trajectory over past 30/90 days
- Dashboard widget: condensed version — score + grade + top 3 gaps

**TribeDashboard integration:**
- Replace/augment current survivability score widget with the composite readiness score
- Tap to navigate to full ReadinessScreen

**Effort:** ~4–5 hrs. Algorithm is the most complex part; UI reuses existing chart patterns.

---

## Priority Order (recommended build sequence)

```
Sprint 1:  9.1 Production Tracking     (~3h) — closes resource picture
           9.2 Roll Call               (~4h) — critical accountability gap
           9.3 External Contacts       (~2h) — quick win, high utility

Sprint 2:  10.1 Health Status          (~3h) — enriches roll call + triage
           10.2 PACE Comms Plan        (~4h) — existential grid-down feature

Sprint 3:  11.1 Goals + Tasks          (~6h) — largest feature, highest impact
           11.2 Bug-Out Planning       (~4h) — companion to PACE

Sprint 4:  12.1 SOPs / Knowledge Base  (~5h) — brings everything together
           12.2 Financial Tracking     (~3h) — grid-up, lower urgency

Sprint 5:  13.1 Composite Readiness    (~5h) — synthesis, best when data is rich
```

Total estimated effort: ~39–43 hours of focused development.

---

## Notes on Shared Infrastructure

Several new features share patterns — build these once:

- **Markdown renderer:** Used by SOPs (12.1). Use `react-markdown` — already likely in deps or easy add. Cache rendered output.
- **Three-pane drill-down:** Goals (11.1) uses Goal → Milestone → Task. Same pattern could apply to SOPs (Category → Doc → Version history). Build a reusable `DrillDownList` component.
- **Status board pattern:** Roll call (9.2) and task Kanban (11.1) both use a live status grid with member avatars. Extract into a shared component.
- **Export to plaintext:** PACE plan, SOPs, and Financial reports all benefit from a "print/export as text" action. One utility function handles all.
