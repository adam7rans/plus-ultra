# Plus Ultra — Cloud Infrastructure Plan

> Status: `TODO`
> Last updated: 2026-03-16

The app currently runs entirely offline-first: **IndexedDB** is the local source of truth, **Gun.js** syncs peer-to-peer through a relay. This works for grid-down, but in grid-up (normal life), users need a centralized cloud backend so tribe members who are miles apart can share data reliably.

**Goal:** Add a cloud data layer (Convex) and deploy the app (Vercel) so that grid-up users get real-time sync through a real database, while preserving the existing offline/Gun layer for grid-down fallback.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GRID-UP (normal)                         │
│                                                                 │
│   User Device          Vercel                  Convex           │
│  ┌──────────┐      ┌────────────┐      ┌──────────────────┐    │
│  │  React   │─────▶│  PWA Host  │      │  Cloud Database   │    │
│  │  App     │      │  + API     │─────▶│  Real-time sync   │    │
│  │  (IDB)   │◀────▶│  Routes    │◀─────│  Server functions │    │
│  └──────────┘      └────────────┘      └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       GRID-DOWN (fallback)                      │
│                                                                 │
│   User Device A         Local Relay         User Device B       │
│  ┌──────────┐      ┌──────────────┐      ┌──────────┐          │
│  │  React   │◀────▶│  Gun Relay   │◀────▶│  React   │          │
│  │  App     │      │  (WiFi mesh) │      │  App     │          │
│  │  (IDB)   │      └──────────────┘      │  (IDB)   │          │
│  └──────────┘                            └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Vercel Projects

| Project | Domain | Purpose |
|---------|--------|---------|
| **plus-ultra** (existing) | plusultra.network | Landing page, docs, downloads |
| **plus-ultra-app** (new) | app.plusultra.network | PWA host + API routes + Convex client |

---

## Phase 1 — Convex Setup & Schema `PARTIAL`

_Set up Convex project, define the schema to match every IDB object store, and deploy._

### 1.1 Create Convex project `TODO`
- [ ] 🧑 Sign up at [convex.dev](https://convex.dev) (free tier is fine to start)
- [ ] 🧑 Install Convex CLI: `npm install -g convex`
- [ ] 🧑 Run `npx convex init` in the repo root (or in a new `convex/` folder)
- [ ] 🧑 Link to your Convex dashboard project
- [ ] Wire up Convex client provider in the app

### 1.2 Define Convex schema `DONE`
_Mirror every IDB object store as a Convex table._

- [x] `convex/schema.ts` — 42 tables, 52 indexes, all types defined. See file for full details.

### 1.3 Write Convex server functions `DONE`
_For each table, create mutations (write) and queries (read). These run on Convex's infrastructure._

- [x] 26 server function files created in `convex/` — 81 total functions (mutations + queries)
- [x] Covers: tribes, members, invites, messages, skills, inventory, proposals, events, rollcall, notifications, alerts, training, consumption, production, finance, tasks, goals, docs, map, psych, contacts, federation, bugout, gridState, comms, push

### 1.4 Deploy Convex `TODO`
- [ ] 🧑 Run `npx convex deploy` to push schema + functions to production
- [ ] Verify tables are created in Convex dashboard

---

## Phase 2 — Vercel App Project Setup `TODO`

_Create the new Vercel project that will host the PWA and serve as the API layer._

### 2.1 Create Vercel project `TODO`
- [ ] 🧑 Go to [vercel.com/new](https://vercel.com/new)
- [ ] 🧑 Import the `adam7rans/plus-ultra` repo
- [ ] 🧑 Set the root directory to `packages/app`
- [ ] 🧑 Set framework preset to **Vite**
- [ ] 🧑 Set build command: `cd ../.. && npm run build`
- [ ] 🧑 Set output directory: `dist`
- [ ] 🧑 Name the project `plus-ultra-app`

### 2.2 Configure domain `TODO`
- [ ] 🧑 Add custom domain `app.plusultra.network` (or your preferred subdomain)
- [ ] 🧑 Update DNS: add CNAME record pointing to `cname.vercel-dns.com`
- [ ] Wait for SSL certificate auto-provisioning

### 2.3 Set environment variables `TODO`
- [ ] 🧑 In Vercel project settings → Environment Variables, add:
  - `VITE_CONVEX_URL` — your Convex deployment URL (from `npx convex deploy` output)
  - `VITE_GUN_RELAY` — `https://gun-relay.prepper.network` (or your relay URL for grid-up fallback)
  - `VITE_RELAY_PUSH_SECRET` — same push secret as your relay

### 2.4 Verify deployment `TODO`
- [ ] 🧑 Push a commit → Vercel auto-deploys
- [ ] 🧑 Open `app.plusultra.network` → app loads
- [ ] 🧑 Test PWA install (Add to Home Screen) on mobile

---

## Phase 3 — Sync Layer: Connect App to Convex `TODO`

_This is the big one. Replace Gun as the grid-up sync mechanism with Convex, while keeping Gun as the grid-down fallback._

### 3.1 Install Convex client in the app `TODO`
- [ ] Add `convex` package to `packages/app/` dependencies
- [ ] Create `packages/app/src/lib/convex-client.ts` — initializes the Convex client
- [ ] Create `ConvexProvider` wrapper in `App.tsx` (Convex's React provider for real-time subscriptions)

### 3.2 Create sync adapter pattern `TODO`
_Each lib module (tribes.ts, messaging.ts, etc.) currently writes to IDB + Gun. We need a pattern where it writes to IDB + Convex (grid-up) or IDB + Gun (grid-down)._

- [ ] Create `packages/app/src/lib/sync-adapter.ts`:
  ```
  isGridUp() → boolean (navigator.onLine + Convex connection alive)

  syncWrite(table, data):
    if gridUp → convex.mutation(table.upsert, data)
    else → gun.get(path).put(data) + addPendingSync()

  syncSubscribe(table, filter, callback):
    if gridUp → convex.useQuery(table.list, filter)
    else → gun.get(path).map().on(callback)
  ```
- [ ] This adapter is the ONLY place that decides Gun vs Convex — all lib modules use it

### 3.3 Migrate lib modules to use sync adapter `TODO`
_Update each module to use the sync adapter instead of calling Gun directly. IDB writes stay unchanged._

Priority order (same as the data modules):
- [ ] `lib/tribes.ts` — createTribe, joinTribe, writeMember, fetchTribeMeta
- [ ] `lib/messaging.ts` — sendTribeMessage, sendDM, subscribe channels
- [ ] `lib/proposals.ts` — createProposal, castVote
- [ ] `lib/inventory.ts` — updateAsset, subscribeToInventory
- [ ] `lib/skills.ts` — declareSkill, vouchForSkill
- [ ] `lib/events.ts` — createEvent, subscribeToEvents
- [ ] `lib/rollcall.ts` — initiateMuster, respond
- [ ] `lib/notifications.ts` — notify, subscribe
- [ ] `lib/consumption.ts` — logConsumption
- [ ] `lib/production.ts` — logProduction
- [ ] `lib/training.ts` — logSession
- [ ] `lib/finance.ts` — addExpense, addContribution
- [ ] `lib/tasks.ts` — createTask, updateTask
- [ ] `lib/docs.ts` — createDoc, updateDoc
- [ ] `lib/map.ts` — addPin, addRoute
- [ ] `lib/psych.ts` — saveProfile, submitRating
- [ ] `lib/contacts.ts` — addContact
- [ ] `lib/federation.ts` — all federation ops
- [ ] `lib/bugout.ts` — savePlan
- [ ] `lib/grid-state.ts` — updateGridState
- [ ] `lib/comms.ts` — PACE plan

### 3.4 Migrate hooks to Convex subscriptions `TODO`
_Replace Gun-based polling with Convex real-time queries (grid-up) or keep Gun polling (grid-down)._

- [ ] Update all 31 hooks in `src/hooks/` to use Convex `useQuery()` when grid-up
- [ ] Convex subscriptions are automatic — when data changes on the server, the hook re-renders
- [ ] No more 2-second polling intervals in grid-up mode (massive perf improvement)

### 3.5 Update sync-queue for Convex `TODO`
- [ ] When coming back online, `flushPendingSyncs()` should write to Convex (not Gun)
- [ ] Add conflict resolution: Convex record has `updatedAt` — latest timestamp wins
- [ ] Clear pending-syncs entries after successful Convex write

### 3.6 Invite links with Convex `TODO`
_Currently invite tokens live only in Gun. In grid-up, they should be in Convex so they're reliably single-use._

- [ ] `createInviteToken()` → write to Convex `invite_tokens` table
- [ ] `validateAndConsumeToken()` → check Convex first, fall back to Gun if offline
- [ ] Invite URL format stays the same: `app.plusultra.network/join?tribe=X&token=Y`
- [ ] 🧑 Share links now point to the deployed app URL instead of localhost

---

## Phase 4 — Push Notifications via Convex `TODO`

_Move push notification infrastructure from the Gun relay to Convex + Vercel._

### 4.1 Convex push subscriptions `TODO`
- [ ] Create `convex/push.ts` — store push subscriptions in Convex instead of relay JSON file
- [ ] Convex action to send web push (using `web-push` npm package in a Convex action)
- [ ] Update `lib/push.ts` to register subscriptions with Convex instead of relay HTTP endpoints

### 4.2 Vercel API route for push (if needed) `TODO`
- [ ] If Convex actions can't call web-push directly, create `api/push/send.ts` Vercel serverless function
- [ ] This becomes the push relay — Convex triggers it via HTTP action

### 4.3 Update push triggers `TODO`
- [ ] `messaging.ts` → trigger push via Convex after message write
- [ ] `notifications.ts` → trigger push for alert broadcasts
- [ ] `rollcall.ts` → trigger push for muster calls

---

## Phase 5 — Data Migration & Conflict Resolution `TODO`

_Handle the case where users already have data in IDB/Gun from before Convex existed._

### 5.1 First-launch sync `TODO`
_When an existing user opens the app after the Convex update, upload their IDB data to Convex._

- [ ] Create `lib/initial-sync.ts`:
  - On app start, check if `convex-synced` flag exists in IDB
  - If not: read all IDB stores → batch write to Convex → set flag
  - Show a "Syncing your data to the cloud..." progress indicator
- [ ] Handle the founder case: they have `tribePriv` + `tribeEpriv` — these must NOT go to Convex

### 5.2 Conflict resolution strategy `TODO`
- [ ] **Last-write-wins** using `updatedAt` timestamps (same as current inventory pattern)
- [ ] For messages: append-only, no conflicts possible (each message has unique ID)
- [ ] For votes: idempotent (same pubkey + proposalId = same vote, can't vote twice)
- [ ] For member records: latest `lastSeen` wins

### 5.3 Security: what stays local `TODO`
_Some data MUST NEVER leave the device._

- [ ] `identity.priv` — private signing key → IDB only
- [ ] `identity.epriv` — private encryption key → IDB only
- [ ] `tribePriv` / `tribeEpriv` — tribe encryption keys (founder/diplomats) → IDB only
- [ ] `photo` (base64) — too large for Convex, stays in IDB (already excluded from Gun)
- [ ] DM content — end-to-end encrypted, stored as ciphertext in Convex (only participants can decrypt)

---

## Phase 6 — Gun Relay: Grid-Down Only `TODO`

_Once Convex handles all grid-up sync, the Gun relay becomes a grid-down-only tool._

### 6.1 Simplify relay role `TODO`
- [ ] Gun relay no longer needs push notification endpoints (moved to Convex)
- [ ] Relay becomes: `Gun({ web: server })` + static file serving for mesh distribution
- [ ] Remove push subscription storage from relay
- [ ] Keep `serve-app.js` for mesh PWA distribution (unchanged)

### 6.2 Grid detection in app `TODO`
- [ ] `isGridUp()`: `navigator.onLine && convexClient.connectionState === 'connected'`
- [ ] `isGridDown()`: no internet OR Convex unreachable
- [ ] UI indicator: green dot (cloud connected) / yellow (local only) / red (no connectivity)
- [ ] Auto-switch: when Convex connection drops, fall back to Gun seamlessly
- [ ] When Convex reconnects, flush pending-syncs to Convex

### 6.3 Update relay deployment `TODO`
- [ ] 🧑 The relay still needs to be runnable locally for grid-down scenarios
- [ ] 🧑 Optionally deploy a cloud Gun relay as a bridge (for users who have internet but Convex is down)
- [ ] Document the two modes in README

---

## Phase 7 — Testing & Verification `TODO`

_Now we can finally do proper E2E tests against the real system._

### 7.1 Update integration tests `TODO`
- [ ] Update existing `packages/app/src/lib/` tests to mock Convex client (same pattern as Gun mocks)
- [ ] Test sync adapter: grid-up path uses Convex, grid-down path uses Gun
- [ ] Test conflict resolution logic

### 7.2 E2E tests (Playwright) — Phase 3 from TESTING.md `TODO`
- [ ] 🧑 Install Playwright: `cd packages/app && npm i -D @playwright/test && npx playwright install chromium`
- [ ] Create `playwright.config.ts` pointing at Vite dev server
- [ ] `e2e/onboarding.spec.ts` — identity → tribe creation → founder has elder_council role
- [ ] `e2e/join-tribe.spec.ts` — founder generates invite → new user joins via URL
- [ ] `e2e/proposals.spec.ts` — create proposal → vote → outcome
- [ ] `e2e/rollcall.spec.ts` — muster → responses → completion
- [ ] `e2e/offline-sync.spec.ts` — go offline → write → come back → data syncs to Convex

### 7.3 Multi-device testing `TODO`
- [ ] 🧑 Open app on two different devices/browsers
- [ ] 🧑 Create tribe on device A → join on device B via invite link
- [ ] 🧑 Send message on A → appears on B in real-time (via Convex subscription)
- [ ] 🧑 Verify proposal voting works across devices
- [ ] 🧑 Test offline on one device while other stays online

---

## Phase 8 — Production Hardening `TODO`

### 8.1 Rate limiting & auth `TODO`
- [ ] Add Convex authentication (tie Convex identity to the app's pub key)
- [ ] Rate limit writes per user (prevent spam/abuse)
- [ ] Validate tribe membership on the server before accepting writes

### 8.2 Monitoring `TODO`
- [ ] 🧑 Set up Convex dashboard alerts for errors
- [ ] 🧑 Set up Vercel analytics for app usage
- [ ] Add error reporting (Sentry or similar) to catch client-side crashes

### 8.3 Backup strategy `TODO`
- [ ] Convex has automatic backups (built-in)
- [ ] Document recovery procedure: Convex snapshot → restore
- [ ] Keep Gun relay as a secondary backup path (data exists in both systems)

---

## New Dependencies Summary

| Package | Where | Purpose |
|---------|-------|---------|
| `convex` | packages/app dependencies | Convex client SDK + React hooks |
| `@playwright/test` | packages/app devDependencies | E2E testing (Phase 7) |

---

## Run Commands (after setup)

```bash
# Local dev with Convex
npx convex dev                    # starts Convex dev server (hot-reloads functions)
npm run dev                       # starts Vite dev server (in parallel)

# Deploy
npx convex deploy                 # push schema + functions to production
git push                          # Vercel auto-deploys the app

# Grid-down mode (local)
npm run relay                     # start Gun relay on localhost:8765
npm run serve-app                 # serve PWA for mesh distribution

# Tests
npm test                          # unit + integration tests
cd packages/app && npx playwright test   # E2E tests
```

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Convex over Supabase/Firebase | Real-time subscriptions built-in, serverless functions colocated with DB, TypeScript-native, generous free tier |
| Separate Vercel project from landing page | Different deploy cycles, different failure domains, different scaling needs |
| Keep Gun for grid-down | The whole point of the app — can't depend on cloud when infrastructure fails |
| Private keys never leave device | Security requirement — Convex stores public identity only |
| DMs stored as ciphertext in Convex | End-to-end encryption preserved — server can't read messages |
| Last-write-wins conflict resolution | Simple, predictable, matches existing inventory pattern |
