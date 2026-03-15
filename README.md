# Plus Ultra — Tribal Operating System

A native mobile app for tribal resilience and survivability. Built for communities that want to organize, coordinate, and thrive — with or without the internet.

## What It Does

Plus Ultra gives tribes the tools to function as self-reliant units:

- **Identity** — cryptographic keypair generated on-device. No accounts, no servers, no usernames. Your identity is yours. Set a display name once; it follows you into every tribe.
- **Tribes** — create or join a tribe with an invite link. Each tribe has its own keypair, governance model, and member roster.
- **Survivability Score** — real-time score based on the skills declared by tribe members across 11 domains, weighted by tier (critical, essential, multipliers).
- **Tribe Schematic** — bird's eye view of tribal readiness: personnel coverage across 53 roles, resource requirements across 48 assets, and tribe scale progression.
- **Skills Declaration** — members declare their skills across 53 roles in 11 survival domains with proficiency levels (basic → verified expert), sub-specializations, years of experience, and peer vouching.
- **Schedule & Events** — tribal schedule with 10 event types (meal, watch, duty, medical, training, social, maintenance, comms, alert, personal), recurring events, day/week/month views, member assignment, and a "Now + Up Next" dashboard widget.
- **Authority & Permissions** — five-tier authority system (Founder → Elder Council → Lead → Member → Restricted) controlling who can create events, cancel events, and manage roles. Leaders can appoint and revoke authority.
- **Tribe Channel** — tribe-wide encrypted group messaging with reactions (👍 ❤️ 😂 ⚠️ ✅), threaded replies, and unread count badges.
- **Direct Messages** — end-to-end encrypted DMs between tribe members using ECDH key exchange. Reactions and replies supported.
- **Offline Queue** — messages composed offline are queued in IndexedDB and flushed automatically when connectivity returns.
- **Member Profiles** — full member profile pages with photo, bio, availability, physical limitations, declared skills with vouching, and a psychological profile tab.
- **Inventory & Asset Tracking** — track what the tribe actually owns against what it needs. 48 assets across 5 categories with role-based edit permissions and per-asset notes.
- **Proposals & Governance** — structured proposal → discussion → vote → outcome workflow. Quorum enforcement, early-pass detection, comment threads, and scope-based governance (council/direct democracy/hybrid).
- **Notifications & Alerts** — in-app notification bell with read/unread tracking. Real-time full-screen alert overlay for emergency broadcasts (emergency, perimeter breach, medical, rally point, all clear). Vibration and audio on mobile.
- **PWA Push Notifications** — Web Push API integration for grid-up scenarios: event reminders, alerts, DM received.
- **My Station** — personalized view of your roles, your team, domain gaps, and your affinity inventory.
- **My People** — track family and friends within the tribe.
- **Map & Geospatial** — interactive tribe territory with offline tile caching. Guard post and patrol route mapping. Asset location pins (water source, armory, etc.). Tribe location stored as lat/lng.
- **Training & Certifications** — track training sessions, certification records (HAM license, EMT cert, etc.), and skill level-up eligibility based on vouches + training hours.
- **Resource Consumption Tracking** — log daily consumption rates for food, water, fuel, and ammo. Auto-calculate days until depletion. Depletion status (healthy/warning/critical) surfaced on the dashboard.
- **Inter-tribe Federation** — encrypted inter-tribe messaging channels, trade/barter proposals, and alliance system. Diplomat role enables inter-tribe diplomacy. Federated threat alerts from allied tribes.
- **Psychological Profiling** — 18-question self-assessment (10 scenario-based, 8 forced-rank pairs) mapping members across 6 psychological dimensions. Ongoing anonymous peer ratings. Three views: Archetype card, Radar chart, Big Five bars. Surfaces on member profiles, proposals, role assignment, and the tribe dashboard.
- **Production Tracking** — Log food, water, energy, and materials production. Rolling 30-day production rate vs consumption rate gives net resource position (days-until-depletion adjusted for what the tribe produces). Surfaced on the inventory screen alongside burn rate.
- **Roll Call / Accountability** — Initiate a tribe-wide muster (leads+). Members respond with status (present, away authorized, away unplanned, injured, need help). Live status board with response time tracking. Muster overlay for incoming calls. History of all past musters with outcomes. Full-screen overlay for incoming musters on the dashboard.
- **External Contacts** — Track non-member tribe resources: doctors, HAM operators, lawyers, mutual-aid groups, vendors. Searchable by category. Tap-to-copy phone/frequency. Offline-accessible (IDB-backed).
- **Member Health / Medical Status** — Blood type, allergies, critical medications, and medical conditions stored per member. Current health status updated during roll calls. Read access is role-gated: full data visible to medical roles + elder council; other members see status only.
- **PACE Comms Plan** — Tribe-wide communications plan covering all four PACE levels (Primary/Alternate/Contingency/Emergency). Check-in schedules, rally points, and code words. Offline-first, export to plaintext for paper backup. HAM certification integration suggests callsigns for radio methods.
- **Goals & Tasks** — Shared tribe goal layer with horizon classification (immediate / short-term / long-term), milestone tracking, and task assignment. Elder council creates goals; leads create and assign tasks to any member. Progress bars computed from task completion. Proposal-to-goal bridge on passed proposals. My Tasks tab for individual accountability. Full tribe task list filterable by status and priority.
- **Bug-Out Planning** — Formal evacuation plans tied to patrol routes, vehicles, load priorities, and rally points. Plans progress from draft → ready → active. Activating a plan broadcasts a `bug_out` alert to all tribe members and highlights the designated route in red/dashed on the map with a legend overlay. Elder council manages plans; deactivation returns map to normal.
- **Knowledge Base / SOPs** — Tribe document library with category tabs (medical, security, food/water, comms, evacuation, governance, training). Markdown content with offline rendering. Version-controlled approval workflow (draft → active). Full-text search. Plaintext export for paper backup.
- **Financial Tracking** — Shared expense ledger with category icons, paid-by, and split-among tracking. Fund contributions. Member balance view (who owes whom). Grid-up feature; de-emphasized in grid-down mode.
- **Composite Readiness Score** — Six-dimension operational readiness report (personnel, supply, infrastructure, comms, coordination, cohesion) weighted to a 0–100 composite score with letter grade. Critical gaps listed with suggested actions. Replaces the simpler survivability score widget on the dashboard.
- **Grid-Down Operational Mode** — Declare tribe-wide grid-down status (real or simulation/drill). Persistent red/amber banner on the dashboard. Nav cards reorder automatically to surface crisis-critical screens (Roll Call, PACE, Inventory, Map, Bug-Out first). Dimmed cards for grid-up-only features (Proposals, Finances, Federation). Drill mode triggered via muster system (`grid_down_drill` reason) with a 4-item checklist card. Auto-expires after 3/5/7 days or manual clear. Gun-synced tribe-wide.

---

## Architecture

```
packages/
  app/     — Tauri 2.0 native app (React + Vite + TailwindCSS)
  core/    — Shared types, algorithms, registries (tested with Vitest)
relay/     — Gun relay server + local app server
```

### Key Technology Choices

| Layer | Choice | Why |
|-------|--------|-----|
| Native shell | Tauri 2.0 | iOS + Android + macOS from one Rust core. Smaller binary than Electron, no Chromium bundle. |
| UI | React 18 + Vite | Fast HMR, small bundle, familiar ecosystem. |
| Routing | TanStack Router | File-safe type-checked routes with params. |
| Styling | Tailwind CSS | Custom `forest` palette optimized for dark outdoor readability. |
| P2P sync | Gun.js | Decentralized real-time graph database. Works peer-to-peer over LAN or via relay. |
| Crypto | Gun SEA (WebCrypto) | ECDSA signing, ECDH encryption, key generation — all in-browser WebCrypto. |
| Local storage | IndexedDB (idb) | Source of truth for all data. Survives app restarts. Gun is sync layer only. |

### Data Flow

```
User action
  → IDB write (source of truth, immediate)
  → Gun write (P2P sync, fire-and-forget)
  → Peers receive via Gun relay or LAN
```

Gun writes are always fire-and-forget. The app never blocks on Gun acks — no relay = no problem, data is in IDB.

### IDB Schema (v24)

| Store | Key Format | Purpose |
|-------|------------|---------|
| `identity` | string | Cryptographic keypair (device-only) |
| `members` | `tribeId:pubkey` | Tribe member records |
| `skills` | `tribeId:memberId__role` | Declared skills with specializations |
| `events` | `tribeId:eventId` | Scheduled events |
| `messages` | string | Chat messages (tribe channel + DMs) |
| `channel-reads` | string | Per-channel read cursors |
| `my-tribes` | tribeId | Tribes this device has joined (+ tribe keypair) |
| `my-people` | `tribeId:myPubkey` | Family/friends |
| `tribe-cache` | tribeId | Cached tribe metadata |
| `queued-messages` | string | Offline message queue |
| `invite-tokens` | string | Invite link tokens |
| `inventory` | `tribeId:assetType` | Tribe asset quantities + notes |
| `notifications` | `tribeId:notificationId` | In-app notifications |
| `alerts` | `tribeId:alertId` | Emergency alert broadcasts |
| `proposals` | `tribeId:proposalId` | Governance proposals |
| `proposal-votes` | `proposalId:memberPub` | Votes cast |
| `proposal-comments` | `proposalId:commentId` | Discussion threads |
| `map-pins` | `tribeId:pinId` | Map asset/POI pins |
| `patrol-routes` | `tribeId:routeId` | Guard patrol routes |
| `map-territory` | tribeId | Tribe territory polygon |
| `training-sessions` | `tribeId:sessionId` | Completed training sessions |
| `certifications` | `tribeId:memberId:certId` | Member certifications |
| `consumption-log` | `tribeId:entryId` | Resource consumption entries |
| `federation-relationships` | `myTribeId:channelId` | Inter-tribe federation channels |
| `federation-messages` | `channelId:messageId` | Inter-tribe messages |
| `federation-trades` | `channelId:proposalId` | Inter-tribe trade proposals |
| `psych-profiles` | `tribeId:memberPub` | Psychological profiles |
| `peer-ratings` | `tribeId:ratedPub:weekHash` | Anonymous peer ratings (local dedup) |
| `muster-calls` | `tribeId:musterId` | Roll call / muster events |
| `muster-responses` | `musterId:memberPub` | Member responses to musters |
| `production-log` | `tribeId:entryId` | Production tracking entries |
| `external-contacts` | `tribeId:id` | External contacts (doctors, HAM ops, etc.) |
| `pace-plan` | tribeId | PACE comms plan |
| `tribe-goals` | `tribeId:goalId` | Tribe goals |
| `goal-milestones` | `tribeId:milestoneId` | Goal milestones |
| `tribe-tasks` | `tribeId:taskId` | Tasks linked to goals |
| `bugout-plans` | `tribeId:planId` | Bug-out evacuation plans |
| `tribe-docs` | `tribeId:docId` | Knowledge base documents (Markdown, versioned) |
| `tribe-expenses` | `tribeId:expenseId` | Shared expense ledger |
| `tribe-contributions` | `tribeId:contributionId` | Fund contributions |
| `grid-state` | tribeId | Grid-down operational state (mode, expiry, simulation flag) |

### Cryptography

- **Identity keypair** — ECDSA P-256 (signing) + ECDH P-256 (encryption), generated via WebCrypto on first launch
- **Tribe keypair** — same, generated at tribe creation. Founder holds the private key.
- **Tribe messages** — signed with sender's ECDSA key
- **Direct messages** — encrypted with ECDH shared secret (`SEA.secret(recipientEpub, senderPair)`)
- **Federation channels** — encrypted with tribe ECDH keypair; diplomat holds the epriv key

---

## Feature Reference

### Role Ontology

53 specific roles across 11 domains, organized into 3 tiers:

**Tier 1 — Critical**
- **Medical** (7 roles) — physician, nurse, paramedic, dentist, midwife, veterinarian, pharmacist
- **Food & Agriculture** (9 roles) — farmer, livestock handler, hunter, fisherman, forager, beekeeper, butcher, seed saver, food preserver
- **Security & Defense** (8 roles) — tactical shooter, squad leader, strategic commander, sniper, combat medic, intel/recon, armorer, K9 handler
- **Water** (3 roles) — well driller, water treatment, plumber

**Tier 2 — Essential**
- **Energy & Power** (4 roles) — electrician, solar tech, generator mechanic, battery specialist
- **Construction & Engineering** (7 roles) — carpenter, mason, welder, heavy equipment operator, structural engineer, blacksmith, surveyor
- **Communications & Technology** (5 roles) — ham radio operator, network engineer, SIGINT, cryptographer, drone pilot
- **Logistics & Supply** (4 roles) — cook, quartermaster, vehicle mechanic, fuel specialist

**Tier 3 — Multipliers**
- **Knowledge & Training** (4 roles) — teacher, skills trainer, historian, chaplain
- **Governance & Administration** (4 roles) — strategic planner, mediator, scribe, diplomat
- **Craft & Sustainability** (5 roles) — seamstress, cobbler, potter, soapmaker, brewer

Each role has a scaling curve (linear, sqrt, log, fixed) that calculates how many slots are needed based on tribe population.

### Asset Ontology

48 assets across 5 categories: land (4), structures (13), equipment (18), vehicles (6), stores (8). Same scaling curve system as roles. Each asset is marked critical or non-critical for survivability weighting.

### Authority & Permissions

| Authority Role | Icon | Who Can Assign | Capabilities |
|---------------|------|----------------|-------------|
| **Founder** | 👑 | Automatic (tribe creator) | Full admin. Cannot be revoked. |
| **Elder Council** | 🏛️ | Founder | Full admin. Can appoint/revoke lead, member, restricted. |
| **Lead** | ⭐ | Founder, Elder Council | Can create events in their skill domains. Can edit/cancel domain events. |
| **Member** | 👤 | Default for new joins | Can create personal events only. |
| **Restricted** | 🔒 | Founder, Elder Council | Read-only. Cannot create events. |

### Governance Models

When creating a tribe, founders choose one of three governance models:

- **Council** — domain leads vote on decisions. Coordinator has tie-break. Efficient for action.
- **Direct Democracy** — every member votes on all decisions. Maximum inclusion, slower decisions.
- **Hybrid** — council handles operations, full tribe votes on major changes (scope: `major` vs `operational`).

Proposals follow the same lifecycle regardless of model: create → open discussion → vote → quorum check → outcome. Early-pass fires when quorum is reached before the deadline. Withdrawal only by the creator while open.

### Schedule & Events

| Type | Icon | Default Duration | Typical Recurrence |
|------|------|-----------------|-------------------|
| Meal | 🍽️ | 60 min | Daily |
| Watch | 👁️ | 240 min | Daily |
| Duty | 📋 | 120 min | Daily |
| Medical | 🏥 | 30 min | Once |
| Training | 🏋️ | 90 min | Weekly |
| Social | 🎉 | 120 min | Weekly |
| Maintenance | 🔧 | 60 min | Weekly |
| Comms | 📻 | 30 min | Daily |
| Alert | 🚨 | 15 min | Once |
| Personal | 👤 | 60 min | Once |

Recurrence supports: once, daily, weekly, monthly, yearly, and custom (every N days/weeks/months).

### Tribe Scale Progression

| Scale | Population | Description |
|-------|-----------|-------------|
| 🔥 Fireteam | 1–12 | Extended family. Everyone wears multiple hats. |
| ⚡ Cell | 13–30 | Core operational unit. 24/7 security rotation. |
| 🛡️ Tribe | 31–150 | Dunbar-number community. Self-sustaining. |
| 🏘️ Village | 151–500 | Craft specialization, formal governance. |
| 🏛️ Town | 501–2000 | Institutions — hospital, school, court. |
| 🏙️ Settlement | 2001+ | Small city. Manufacturing, regional governance. |

### Psychological Profiling

Six dimensions, each scored 0–100:

| Dimension | Low (0) | High (100) |
|-----------|---------|-----------|
| Decision Speed | Deliberate | Decisive |
| Stress Tolerance | Reactive | Resilient |
| Leadership Style | Directive | Collaborative |
| Conflict Approach | Avoidant | Assertive |
| Risk Appetite | Conservative | Bold |
| Social Energy | Introverted | Extraverted |

Six archetypes derived from dimension rules + nearest-centroid tie-breaking:

| Archetype | Key Signals | Role |
|-----------|------------|------|
| **Commander** | High decision speed + stress tolerance + directive | High-stakes ops leader |
| **Scout** | High risk appetite + decisive | Recon, first contact |
| **Strategist** | Deliberate + resilient + conservative | Long-range planning |
| **Connector** | High social energy + collaborative | Morale, mediation |
| **Planner** | Deliberate + conservative + introverted | Operations, logistics |
| **Sustainer** | Resilient + collaborative + avoidant of conflict | Cohesion, stability |

Profiles are built from three inputs:
1. **Quiz** — 18-question assessment (10 scenario-based, 8 forced-rank pairs). Scores all 6 dimensions starting from 50, applying per-answer deltas. Quiz result carries 70% weight.
2. **Anonymous peer ratings** — 3-dimension rating (stress tolerance, leadership, conflict approach). Once per peer per week. Rater identity is never stored in Gun — only a deterministic week hash is used for local dedup. Peer ratings carry 30% weight.
3. **Passive inference** — voting behavior (time-to-vote) nudges `decisionSpeed` passively after each cast vote.

Profile surfaces:
- **Member profile** — Psych tab with Archetype / Radar / Big Five views
- **Tribe dashboard** — Psychology nav link with archetype distribution summary
- **Proposals** — archetype badge on each voter in the voter list
- **Role assignment** — role-fit % shown in authority dropdown when profile exists

### Training & Certifications

- Log training sessions with skill, instructor, hours, and notes
- Record certifications (HAM license, EMT cert, WAFA, etc.) with expiry dates
- Level-up eligibility computed from vouches + training hours per skill
- Level-up queue surfaced on dashboard — elder_council can approve promotions
- Cross-training recommendations based on tribe skill gaps

### Resource Consumption

- Log consumption entries per asset with date and quantity consumed
- Burn rate computed from rolling average of last N entries
- Days-until-depletion calculated against current inventory quantity
- Three depletion statuses: `healthy` / `warning` / `critical` with configurable thresholds
- Depletion status surfaced on the tribe dashboard inventory widget

### Inter-tribe Federation

- Create encrypted federation channels between tribes — requires both tribe founders to share their tribe encryption keys
- Send and receive inter-tribe messages in dedicated federation channel screens
- Trade/barter proposals: offer items, request items, negotiate terms
- Alliance system: `pending` → `allied` / `declined` status
- Diplomat role: tribe members designated as diplomats by the founder can access federation comms
- Federated threat alerts: allied tribes can broadcast alerts that appear in your dashboard's notification count
- Connect screen at `/connect` — initiate federation by entering the other tribe's relay URL + tribe pub

---

## Getting Started

### Prerequisites

- Node.js 18+
- Rust + Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Tauri CLI prerequisites for your platform: https://tauri.app/start/prerequisites/

### Run in development

```bash
npm install
npm run dev                  # Vite + Tauri desktop window
# or open http://localhost:5173 in Chrome for browser-only dev
```

### Run the local Gun relay (required for multi-device / multi-context sync)

```bash
npm run relay
# → Gun relay running on ws://localhost:8765/gun
```

Leave this running in a separate terminal. Both the Tauri app and browser tab connect to it automatically via `VITE_GUN_RELAY` in `packages/app/.env`.

**Local 3-context test setup:**
1. Terminal 1 — `npm run relay`
2. Terminal 2 — `cd packages/app && npx tauri dev` (User A)
3. Chrome at `http://localhost:5173` (User B)

### Serve app over local network (grid-down distribution)

```bash
npm run serve-app
# Detects local network interfaces, shows URLs + QR code
# Serves the PWA dist/ over HTTP — members on the same WiFi open the URL and "Add to Home Screen"
# If an Android APK exists, it's served at /app.apk
```

### Build

```bash
npm run build                        # Vite + tsc
npm run build:desktop                # Native macOS/Windows/Linux app
npm run build:android                # Android APK (requires Android Studio + NDK)
npm run build:ios                    # iOS IPA (macOS only, requires Xcode)
```

### Run tests

```bash
npm test                     # Vitest on @plus-ultra/core
```

---

## Project Status

Local 2-user sync fully validated on macOS (Tauri + Chrome against local Gun relay). Android/iOS device testing is next.

| Feature | Status |
|---------|--------|
| Identity generation + backup (QR) | ✅ |
| Tribe creation + invite system | ✅ |
| Tribe dashboard | ✅ |
| Survivability score (weighted, tiered) | ✅ |
| Skills declaration (53 roles, specializations, vouching) | ✅ |
| Tribe schematic (personnel + resources) | ✅ |
| Tribe scale progression (6 levels) | ✅ |
| Schedule & events (10 types, recurrence, assignment) | ✅ |
| Authority & permissions (5-tier hierarchy) | ✅ |
| Tribe channel (group messaging, reactions, replies) | ✅ |
| Direct messages (E2E encrypted, reactions, replies) | ✅ |
| Offline message queue | ✅ |
| Member profiles (skills, bio, availability, vouching) | ✅ |
| Inventory & asset tracking (48 assets, role-gated edits) | ✅ |
| Proposals & governance (3 models, quorum, comments) | ✅ |
| Notifications & alerts (in-app bell, full-screen overlay) | ✅ |
| PWA push notifications | ✅ |
| My Station (personalized role + inventory view) | ✅ |
| My People (family/friends tracking) | ✅ |
| Map & geospatial (territory, pins, patrol routes) | ✅ |
| Training & certifications (sessions, certs, level-ups) | ✅ |
| Resource consumption tracking (burn rate, depletion) | ✅ |
| Inter-tribe federation (messaging, trade, alliances) | ✅ |
| Psychological profiling (quiz, peer ratings, archetypes) | ✅ |
| Goals & tasks (tribe objectives, task assignment, progress) | ✅ |
| Bug-out planning (vehicles, load priorities, route activation) | ✅ |
| Production tracking (net rate, days-remaining) | ✅ |
| Roll call / accountability (muster, live status board) | ✅ |
| External contacts (doctors, HAM ops, vendors) | ✅ |
| Member health / medical status (blood type, allergies, triage) | ✅ |
| PACE comms plan (4-level, check-ins, rally points) | ✅ |
| Knowledge base / SOPs (Markdown, versioned, offline) | ✅ |
| Financial tracking (shared expenses, fund, balances) | ✅ |
| Composite readiness score (6-dimension, 0–100) | ✅ |
| Grid-down operational mode (declare, banner, reorder, drill) | ✅ |
| Real-time cross-context sync (Tauri ↔ Chrome) | ✅ Validated |
| Data persistence across restarts (IDB) | ✅ |
| PWA (offline-capable, installable) | ✅ |
| Local app server (grid-down distribution) | ✅ |
| macOS build | ✅ |
| iOS build | 🔧 Scaffold done, device test pending |
| Android build | 📋 Pending Android Studio setup |
| Gun relay (production deployment) | 📋 Pending |

---

## Gun Compatibility Notes

Gun.js has three silent failure modes discovered during sync validation:

1. **`undefined` field values** — `gun.put()` silently drops writes containing any `undefined` value. Strip all `undefined` fields before writing (handled via `gunEscape()`).
2. **SEA-formatted string values** — Gun/SEA installs put middleware that intercepts any value starting with `"SEA{"` and tries to verify it as a signed node. Writes containing raw `SEA.sign()` or `SEA.encrypt()` output are silently rejected. Escape to `"~SEA{"` before writing, restore on read (handled via `gunEscape()` / `gunUnescape()`).
3. **`map().on()` peer push** — Gun's `map().on()` doesn't reliably push peer-written data in all environments. Pair it with a 2s `map().once()` poll as a fallback. This pattern is used consistently throughout the data layer.

---

## License

Private — all rights reserved.
