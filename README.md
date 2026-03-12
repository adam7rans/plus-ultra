# Plus Ultra — Tribal Operating System

A native mobile app for tribal resilience and survivability. Built for communities that want to organize, coordinate, and thrive — with or without the internet.

## What It Does

Plus Ultra gives tribes the tools to function as self-reliant units:

- **Identity** — cryptographic keypair generated on-device. No accounts, no servers, no usernames. Your identity is yours. Set a display name once; it follows you into every tribe.
- **Tribes** — create or join a tribe with an invite link. Each tribe has its own keypair, governance model, and member roster.
- **Survivability Score** — real-time score based on the skills declared by tribe members across 11 domains, weighted by tier (critical, essential, multipliers).
- **Tribe Schematic** — bird's eye view of tribal readiness: personnel coverage across 53 roles, resource requirements across 48 assets, and tribe scale progression.
- **Schedule & Events** — tribal schedule with 10 event types (meal, watch, duty, medical, training, social, maintenance, comms, alert, personal), recurring events, day/week/month views, and a "Now + Up Next" dashboard widget.
- **Authority & Permissions** — five-tier authority system (Founder → Elder Council → Lead → Member → Restricted) controlling who can create events, cancel events, and manage roles. Leaders can appoint and revoke authority.
- **Tribe Channel** — tribe-wide encrypted messaging. Messages are signed with your identity keypair.
- **Direct Messages** — end-to-end encrypted DMs between tribe members using ECDH key exchange.
- **Offline Queue** — messages composed offline are queued and flushed when connectivity returns.
- **Skills Declaration** — members declare their skills across 53 roles in 11 survival domains. Gaps surface as critical priorities on the dashboard.
- **My Station** — personalized view of your roles, team, domain gaps, and relevant inventory.
- **My People** — track family and friends within the tribe.

## Architecture

```
packages/
  app/     — Tauri 2.0 native app (React + Vite + TailwindCSS)
  core/    — Shared types, algorithms, registries (tested with Vitest)
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
| Local storage | IndexedDB (idb) | Source of truth for identity, tribes, messages, skills, events. Survives app restarts. Gun is sync layer only. |

### Data Flow

```
User action
  → IDB write (source of truth, immediate)
  → Gun write (P2P sync, fire-and-forget)
  → Peers receive via Gun relay or LAN
```

Gun writes are always fire-and-forget. The app never blocks on Gun acks — no relay = no problem, data is in IDB.

### IDB Schema (v7)

| Store | Key Format | Purpose |
|-------|------------|---------|
| `identity` | string | Cryptographic keypair (device-only) |
| `members` | `tribeId:pubkey` | Tribe member records |
| `skills` | `tribeId:memberId__role` | Declared skills |
| `events` | `tribeId:eventId` | Scheduled events |
| `messages` | string | Chat messages |
| `channel-reads` | string | Per-channel read cursors |
| `my-tribes` | tribeId | Tribes this device has joined |
| `my-people` | `tribeId:myPubkey` | Family/friends |
| `tribe-cache` | tribeId | Cached tribe metadata |
| `queued-messages` | string | Offline message queue |
| `invite-tokens` | string | Invite link tokens |

### Cryptography

- **Identity keypair** — ECDSA P-256 (signing) + ECDH P-256 (encryption), generated via WebCrypto on first launch
- **Tribe keypair** — same, generated at tribe creation. Founder holds the private key.
- **Tribe messages** — signed with sender's ECDSA key
- **Direct messages** — encrypted with ECDH shared secret (`SEA.secret(recipientEpub, senderPair)`)

## Role Ontology

53 specific roles across 11 domains, organized into 3 tiers:

### Tier 1 — Critical
- **Medical** (7 roles) — physician, nurse, paramedic, dentist, midwife, veterinarian, pharmacist
- **Food & Agriculture** (9 roles) — farmer, livestock handler, hunter, fisherman, forager, beekeeper, butcher, seed saver, food preserver
- **Security & Defense** (8 roles) — tactical shooter, squad leader, strategic commander, sniper, combat medic, intel/recon, armorer, K9 handler
- **Water** (3 roles) — well driller, water treatment, plumber

### Tier 2 — Essential
- **Energy & Power** (4 roles) — electrician, solar tech, generator mechanic, battery specialist
- **Construction & Engineering** (7 roles) — carpenter, mason, welder, heavy equipment operator, structural engineer, blacksmith, surveyor
- **Communications & Technology** (5 roles) — ham radio operator, network engineer, SIGINT, cryptographer, drone pilot
- **Logistics & Supply** (4 roles) — cook, quartermaster, vehicle mechanic, fuel specialist

### Tier 3 — Multipliers
- **Knowledge & Training** (4 roles) — teacher, skills trainer, historian, chaplain
- **Governance & Administration** (4 roles) — strategic planner, mediator, scribe, diplomat
- **Craft & Sustainability** (5 roles) — seamstress, cobbler, potter, soapmaker, brewer

Each role has a scaling curve (linear, sqrt, log, fixed) that calculates how many slots are needed based on tribe population.

## Asset Ontology

48 assets across 5 categories: land (4), structures (13), equipment (18), vehicles (6), stores (8). Same scaling curve system as roles. Each asset is marked critical or non-critical for survivability weighting.

## Authority & Permissions

Organizational authority is separate from skill roles (capabilities):

| Authority Role | Icon | Who Can Assign | Capabilities |
|---------------|------|----------------|-------------|
| **Founder** | 👑 | Automatic (tribe creator) | Full admin. Cannot be revoked. |
| **Elder Council** | 🏛️ | Founder | Full admin. Can appoint/revoke lead, member, restricted. |
| **Lead** | ⭐ | Founder, Elder Council | Can create events in their skill domains. Can edit/cancel domain events. |
| **Member** | 👤 | Default for new joins | Can create personal events only. |
| **Restricted** | 🔒 | Founder, Elder Council | Read-only. Cannot create events. |

### Permission Matrix — Events

| Action | Founder | Elder Council | Lead | Member | Restricted |
|--------|---------|---------------|------|--------|------------|
| Create tribe-wide events | ✅ | ✅ | ✅ (own domain) | ❌ | ❌ |
| Create personal events | ✅ | ✅ | ✅ | ✅ | ❌ |
| Cancel/edit any event | ✅ | ✅ | own domain | own only | ❌ |
| Assign members | ✅ | ✅ | own domain | ❌ | ❌ |
| Appoint/revoke authority | ✅ | ✅ (below own level) | ❌ | ❌ | ❌ |

## Schedule & Events

10 event types with default durations and typical recurrence patterns:

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

## Tribe Scale Progression

| Scale | Population | Description |
|-------|-----------|-------------|
| 🔥 Fireteam | 1–12 | Extended family. Everyone wears multiple hats. |
| ⚡ Cell | 13–30 | Core operational unit. 24/7 security rotation. |
| 🛡️ Tribe | 31–150 | Dunbar-number community. Self-sustaining. |
| 🏘️ Village | 151–500 | Craft specialization, formal governance. |
| 🏛️ Town | 501–2000 | Institutions — hospital, school, court. |
| 🏙️ Settlement | 2001+ | Small city. Manufacturing, regional governance. |

## Governance Models

When creating a tribe, founders choose one of three governance models:

- **Council** — domain leads vote on decisions. Coordinator has tie-break. Efficient for action.
- **Direct Democracy** — every member votes on all decisions. Maximum inclusion, slower decisions.
- **Hybrid** — council handles operations, full tribe votes on major changes.

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
cd relay
node relay.js
# → Gun relay running on ws://localhost:8765/gun
```

Leave this running in a separate terminal. Both the Tauri app and browser tab connect to it automatically via `VITE_GUN_RELAY` in `packages/app/.env`.

**Local 3-context test setup:**
1. Ghostty tab 1 — `node relay/relay.js`
2. Ghostty tab 2 — `npx tauri dev` (User A)
3. Chrome at `http://localhost:5173` (User B)

### Build

```bash
npm run build                # Vite + tsc
cd packages/app && npx tauri build   # Native macOS app + dmg
```

### Run tests

```bash
npm test                     # Vitest on @plus-ultra/core (92 tests)
```

## Project Status

Local 2-user sync fully validated on macOS (Tauri + Chrome against local Gun relay). Android/iOS device testing is next.

| Feature | Status |
|---------|--------|
| Identity generation | ✅ Working |
| Display name (set once, used everywhere) | ✅ Working |
| Tribe creation | ✅ Working |
| Tribe dashboard | ✅ Working |
| Survivability score (weighted, tiered) | ✅ Working |
| Skills declaration (53 roles, 11 domains) | ✅ Working |
| Role scaling curves (linear/sqrt/log/fixed) | ✅ Working |
| Asset ontology (48 assets, 5 categories) | ✅ Working |
| Tribe schematic (personnel + resources view) | ✅ Working |
| Tribe scale progression (6 levels) | ✅ Working |
| Schedule & events (10 types, recurrence) | ✅ Working |
| Now + Up Next dashboard widget | ✅ Working |
| Authority & permissions (5-tier hierarchy) | ✅ Working |
| Role appointment/revocation UI | ✅ Working |
| Event permission enforcement | ✅ Working |
| My Station (personalized role view) | ✅ Working |
| My People (family/friends tracking) | ✅ Working |
| Tribe channel messaging | ✅ Working |
| Direct messages (E2E encrypted, real-time) | ✅ Validated |
| Offline queue | ✅ Working |
| Invite link flow (online + offline) | ✅ Working |
| Member persistence (IDB + Gun) | ✅ Working |
| Real-time cross-context sync (Tauri ↔ Chrome) | ✅ Validated |
| Data persistence across restarts | ✅ Working |
| macOS build | ✅ Passing |
| iOS build | 🔧 Scaffold done, device test pending |
| Android build | 📋 Pending Android Studio setup |
| Gun relay (production) | 📋 Pending deployment |

### Gun Compatibility Notes

Gun.js has two silent failure modes discovered during sync validation:

1. **`undefined` field values** — `gun.put()` silently drops writes containing any `undefined` value. Strip all `undefined` fields before writing (handled in `gunEscape()`).
2. **SEA-formatted string values** — Gun/SEA installs a put middleware that intercepts any value starting with `"SEA{"` and tries to verify it as a signed node. Writes containing raw `SEA.sign()` or `SEA.encrypt()` output in field values are silently rejected. Escape them before writing and restore on read (handled in `gunEscape()` / `gunUnescape()`).
3. **`map().on()` peer push** — Gun's `map().on()` doesn't reliably push peer-written data in all environments. Pair it with a 2s `map().once()` poll as a fallback.

## License

Private — all rights reserved.
