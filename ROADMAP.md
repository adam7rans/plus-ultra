# Plus Ultra — Implementation Roadmap

> Last updated: 2026-03-12

This document lays out the remaining features in dependency order. Each phase builds on the previous. Estimated effort is per-feature, not per-phase.

---

## What's Done

| System | Status | Key Files |
|--------|--------|-----------|
| Identity (keypair, backup/restore via QR, display name) | ✅ | `lib/identity.ts`, `IdentityScreen.tsx` |
| Tribe creation (name, location, governance template) | ✅ | `lib/tribes.ts`, `CreateTribeScreen.tsx` |
| Invite system (link + QR, 24hr single-use, offline fallback) | ✅ | `lib/tribes.ts`, `JoinTribeScreen.tsx` |
| Onboarding wizard (profile, domains, skills deep-dive, availability) | ✅ | `OnboardingScreen.tsx`, `specialization-registry.ts` |
| Skills declaration (50+ roles, 4 proficiency levels, IDB+Gun sync) | ✅ | `lib/skills.ts`, `SkillsDeclarationScreen.tsx` |
| Survivability score (11 domain buckets, weighted scoring) | ✅ | `core/lib/survivability.ts` |
| Schedule/events (10 types, recurrence, create/edit/cancel/delete) | ✅ | `lib/events.ts`, `ScheduleScreen.tsx` |
| Permissions (5-tier authority, domain-scoped event/role permissions) | ✅ | `core/lib/permissions.ts` |
| Tribe channel (group messaging, offline queue) | ✅ | `lib/messaging.ts`, `TribeChannelScreen.tsx` |
| Encrypted DMs (SEA encryption, per-pair channels) | ✅ | `lib/messaging.ts`, `DirectMessageScreen.tsx` |
| Tribe schematic (role slots, asset requirements, scale progress) | ✅ | `TribeSchematicScreen.tsx` |
| My Station (personal roles, team view, domain gaps, affinity assets) | ✅ | `MyStationScreen.tsx` |
| My People (family/friend links) | ✅ | `MyPeopleScreen.tsx` |
| Authority management (promote/demote via MemberCard dropdown) | ✅ | `MemberCard.tsx`, `lib/tribes.ts` |
| PWA (service worker, manifest, offline-capable, installable) | ✅ | `vite.config.ts`, `public/` |
| Asset & role registries with scaling algorithms | ✅ | `core/lib/asset-registry.ts`, `core/lib/role-registry.ts` |
| Specialization registry (250+ sub-specialties) | ✅ | `core/lib/specialization-registry.ts` |

---

## Phase 1 — Data Persistence Gaps `✅ DONE`

_Complete the data layer. Everything collected in onboarding and existing screens that isn't actually saved yet._

### 1.1 Persist onboarding profile data `✅`
**Problem:** Onboarding collects member type, photo, availability, physical limitations, and bio — but only `displayName` and skill roles are persisted. The rest is lost.

**Work:**
- Extend `TribeMember` type in `core/types/tribe.ts` with: `bio?: string`, `photo?: string`, `availability?: 'full_time' | 'part_time' | 'on_call'`, `physicalLimitations?: string`
- Update `writeMember()` in `lib/tribes.ts` to accept and store these fields
- Update `subscribeToMembers()` Gun handler to read them back
- Update `OnboardingScreen.tsx` handleSubmit to write profile fields to the member record
- No IDB schema change needed — `members` store uses `unknown` value type

### 1.2 Persist specializations and experience `✅`
**Problem:** `declareSkill()` only saves `role` + `proficiency`. Sub-specializations, years of experience, and notes from onboarding are discarded.

**Work:**
- Extend `MemberSkill` type in `core/types/skills.ts` with: `specializations?: string[]`, `yearsExperience?: number`, `notes?: string`
- Update `declareSkill()` in `lib/skills.ts` to accept and persist the new fields
- Update `subscribeToAllSkills()` Gun handler to parse `specializations` (JSON-stringified for Gun, same as `assignedTo` in events)
- Update `OnboardingScreen.tsx` to pass specialization/experience data through
- Update `SkillsDeclarationScreen.tsx` to show/edit specializations inline (re-use the chip pattern from onboarding)

### 1.3 Founder onboarding `✅`
**Problem:** Tribe creators skip onboarding entirely — they go straight to an empty dashboard with no skills declared.

**Work:**
- After `createTribe()` in `CreateTribeScreen.tsx`, navigate to `/tribe/$tribeId/onboarding` instead of `/tribe/$tribeId`
- The onboarding wizard already works for any member — no code change needed beyond the redirect

---

## Phase 2 — Inventory & Asset Tracking `✅ DONE`

_The asset registry, scaling algorithms, and permission checks all exist in core. The only missing piece is the UI to log what the tribe actually has._

### 2.1 Inventory data layer `✅`
**Work:**
- Add `inventory` object store to IDB (version 8), key format: `${tribeId}:${assetType}`
- Create `lib/inventory.ts` with:
  - `updateAsset(tribeId, asset, quantity, notes)` — IDB first, Gun fire-and-forget
  - `subscribeToInventory(tribeId, callback)` — same IDB-seed + Gun-subscribe pattern as events/skills
- Create `useInventory(tribeId)` hook (same pattern as `useEvents`)
- Gun path: `gun.get('tribes').get(tribeId).get('inventory').get(assetType)`

### 2.2 Inventory screen `✅`
**Work:**
- Create `InventoryScreen.tsx` at `/tribe/$tribeId/inventory`
- Display assets grouped by category (use `CATEGORY_ORDER`, `CATEGORY_META`, `ASSETS_BY_CATEGORY`)
- For each asset: show icon, label, needed count (from `assetsNeeded`), current quantity (from inventory), and a +/- stepper or editable number input
- Gate editing with `canEditInventory()` from `core/lib/role-affinity.ts` — only roles with permissions for that category can edit
- Notes field per asset (e.g., "2x Honda EU2200i generators")
- Show `assetReadiness()` score at the top
- Color-code: green (have ≥ needed), yellow (have > 0 but < needed), red (have = 0 and critical)

### 2.3 Wire inventory into existing screens `✅`
**Work:**
- **My Station** — replace the static "need ×N" display with actual have/need counts from inventory
- **Tribe Schematic** — add asset readiness score alongside survivability score
- **Tribe Dashboard** — show asset readiness as a secondary metric; flag critical assets with quantity = 0 in the gaps panel

---

## Phase 3 — Member Profiles & Social `✅ DONE`

_Right now you can see a member's name, status, and authority role in MemberCard. You can't tap into a full profile to see their skills, specializations, availability, photo, or vouch for them._

### 3.1 Member profile screen `✅`
**Work:**
- Create `MemberProfileScreen.tsx` at `/tribe/$tribeId/member/$memberPub`
- Show: photo, display name, member type, bio, availability, physical limitations
- Show: all declared skills with proficiency badges, specializations as chips, years of experience
- Show: authority role with description
- Action buttons: DM, Vouch (see 3.2), Edit Authority (if `canManageRoles`)
- If viewing your own profile: "Edit Profile" button that opens an edit form (re-use onboarding form fields)

### 3.2 Skill vouching `✅`
**Problem:** `MemberSkill.vouchedBy` exists as `string[]` but there's no UI or logic to vouch.

**Work:**
- Add `vouchForSkill(tribeId, memberId, role, voucherPub)` to `lib/skills.ts` — appends pubkey to `vouchedBy` array in IDB and Gun
- On the member profile screen, each skill shows a "Vouch" button (disabled if already vouched by you)
- Show vouch count badge on each skill
- In survivability scoring, vouched skills could carry more weight (future enhancement — note in the score algorithm but don't block on it)

### 3.3 Make MemberCard tappable `✅`
**Work:**
- Wrap `MemberCard` in a `Link` to `/tribe/$tribeId/member/$memberPub`
- Keep the existing authority role dropdown inline (it already works)
- Show skill count and top 2-3 role icons as a preview on the card

---

## Phase 4 — Notifications & Alerts `✅ DONE`

_No push notification system exists. Events start, watches change, alerts fire — and nobody knows unless they're staring at the schedule screen._

### 4.1 In-app notification system `✅`
**Work:**
- Create notification types: `event_starting`, `event_assigned`, `alert_broadcast`, `role_change`, `new_member`, `vouch_received`
- Create `lib/notifications.ts` with:
  - `notify(tribeId, notification)` — write to Gun and IDB
  - `subscribeToNotifications(tribeId, memberPub, callback)` — filter to relevant notifications
  - `markRead(notificationId)`
- Create `useNotifications(tribeId)` hook
- Gun path: `gun.get('tribes').get(tribeId).get('notifications').get(notificationId)`

### 4.2 Notification bell + panel `✅`
**Work:**
- Add a notification bell icon to the tribe dashboard header with unread count badge
- Create `NotificationsPanel` component — slides down or opens as a sheet
- Each notification: icon, message, timestamp, tap to navigate (e.g., tap event notification → schedule screen)
- Mark as read on tap or "mark all read" button

### 4.3 Alert broadcast system `✅`
**Problem:** The `alert` event type exists but there's no way to push an immediate alert to all tribe members.

**Work:**
- Add "🚨 Send Alert" button to dashboard (visible to `elder_council+`)
- Alert types: `emergency`, `perimeter_breach`, `medical`, `rally_point`, `all_clear`
- When an alert is sent, it writes to a `gun.get('tribes').get(tribeId).get('alerts')` channel
- All connected clients show a full-screen alert overlay with the alert type, message, and sender
- Alert sound/vibration via Web Audio API + `navigator.vibrate()`

### 4.4 PWA push notifications (grid-up only) `✅`
**Work:**
- Add a push notification service worker handler for Web Push API
- This only works when a push server is available (grid-up) — degrade gracefully
- Register push subscription and store on the server/relay
- Trigger pushes for: event reminders (15 min before), alert broadcasts, DM received
- Note: this requires a push server endpoint — could use the existing Gun relay as a relay point or a separate lightweight push service

---

## Phase 5 — Tribe Settings & Administration `✅ DONE`

_No way to edit tribe metadata, leave a tribe, or manage tribe-level settings after creation._

### 5.1 Tribe settings screen `✅`
**Work:**
- Create `TribeSettingsScreen.tsx` at `/tribe/$tribeId/settings`
- Editable fields (gated by `canManageRoles`): tribe name, location, region
- Read-only display: governance template, creation date, founder
- "Leave Tribe" button for any member (removes from `my-tribes` IDB, removes member record)
- "Delete Tribe" button for founder only (marks tribe as deleted in Gun)

### 5.2 Member management `✅`
**Work:**
- View all members with authority roles, last seen, attachment score
- Bulk actions for `elder_council+`: promote/demote, mark as departed
- Remove member (marks `status: 'departed'`, doesn't delete data)

### 5.3 Governance model display `✅`
**Work:**
- Show the active governance template (council/direct democracy/hybrid) with explanation
- Future: voting system for decisions — out of scope for now, but the constitutional template should be visible

---

## Phase 6 — Messaging Improvements `✅ DONE`

_The messaging system works but has rough edges._

### 6.1 Offline message queue drain `✅`
**Problem:** Messages queued offline via `queueMessage()` are stored in IDB's `queued-messages` store but there's no automatic retry/drain mechanism when connectivity is restored.

**Work:**
- Enhanced `flushQueue()` in `lib/messaging.ts` — increments `attempts` on failure, drops after 5, returns stats
- `TribeChannelScreen` calls `flushQueue()` on mount (when online) and on `window.online` event
- Show queue status in diagnostics screen

### 6.2 Message reactions & replies `✅`
**Work:**
- Added `replyTo?: string` (message ID) to message type
- Added `reactions?: Record<string, string[]>` (emoji → pubkeys) to message type
- `MessageBubble` shows reply context (quoted message with sender), reaction bar, and long-press reaction picker (👍 ❤️ 😂 ⚠️ ✅)
- Both tribe channel and DM screens: reply bar above input, reply context in bubbles
- `addTribeReaction` / `addDMReaction` in `lib/messaging.ts` — IDB + Gun

### 6.3 Channel read receipts `✅`
**Problem:** `channel-reads` IDB store exists but isn't used to show unread counts.

**Work:**
- `markChannelRead` now called on channel mount AND scroll-to-bottom (new messages arrive)
- `useChannelUnread` hook + `useDMUnreadCounts` hook in `hooks/useChannelUnread.ts`
- Unread badge on "Tribe Channel" link in dashboard
- Unread dot on DM button in MemberCard

---

## Phase 7 — App Distribution & Grid-Down `✅ DONE (7.1, 7.2)`

_The PWA is built. Now make it distributable in grid-down scenarios._

### 7.1 Local app server `✅`
**Work:**
- Built `relay/serve-app.js`:
  - Detects all local IPv4 interfaces and shows URLs
  - Serves the PWA `dist/` folder over HTTP (`node relay/serve-app.js [port]`)
  - Shows a QR code in the terminal (requires `qrcode-terminal`, already in relay deps)
  - Serves Android APK at `/app.apk` if a Tauri Android build exists
  - SPA fallback so all routes serve `index.html`
  - Prints WiFi hotspot name suggestion ("TRIBE-MESH") and setup steps
- New tribe members connect to the hotspot, open the URL, and "Add to Home Screen"
- The service worker caches everything on first load — they're fully offline after that
- Added `npm run serve-app` at the root level
- Also added `npm run relay` shortcut for `node relay/relay.js`

### 7.2 Tauri mobile builds `✅`
**Work:**
- Added build scripts to `packages/app/package.json`:
  - `npm run build:android` — Vite build + `tauri android build`
  - `npm run build:ios` — Vite build + `tauri ios build`
  - `npm run build:desktop` — Vite build + `tauri build` (macOS/Windows/Linux)
  - `npm run tauri:android:init` — initializes Android project (run once)
  - `npm run tauri:ios:init` — initializes iOS project (run once, macOS only)
- Mirrored at root: `npm run build:android`, `npm run build:ios`
- **Setup required before first build:**
  - Android: Install Android Studio, set `ANDROID_HOME` + `NDK_HOME`, run `npm run tauri:android:init`
  - iOS: macOS only, Xcode required, run `npm run tauri:ios:init`
- APK is automatically picked up by `serve-app.js` after a successful Android build

### 7.3 App Store submission `🔲`
**Work:**
- Apple App Store ($99/year developer account)
- Google Play Store ($25 one-time)
- App icons, screenshots, descriptions, privacy policy
- This should happen as early as possible — App Store review can take time

---

## Phase 8 — Advanced Features (Future) `🔲 TODO`

_These are important but not blocking the core loop of: create tribe → invite members → declare skills → coordinate._

### 8.1 Inter-tribe federation `✅`
- Tribe-to-tribe messaging via Gun
- Trade/barter proposals between tribes
- Alliance system with shared threat intelligence
- Diplomat role enables inter-tribe comms

### 8.2 Map & geospatial `✅`
- Replace text-only location with lat/lng coordinates
- Show tribe territory on a map (works offline with pre-cached tiles)
- Guard post and patrol route mapping
- Asset location pins (e.g., water source, armory)

### 8.3 Decision/voting system `✅`
- Governance templates (council/direct_democracy/hybrid) with model-specific deadlines and eligibility
- Proposal → discussion → vote → outcome workflow
- Quorum = strict majority of eligible voters; early-pass fires before deadline
- Public votes with voter list; threaded comments; withdraw by creator
- Auto-close on ProposalsScreen (5s delay, 1-min buffer)

### 8.4 Training & skill progression `✅`
- Track training sessions completed
- Skill level-up based on vouches + training hours
- Cross-training recommendations based on tribe gaps
- Certification tracking (e.g., HAM license, EMT cert)

### 8.5 Resource consumption tracking `✅`
- Track daily consumption rates for stores (food, water, fuel, ammo)
- Auto-calculate "days until depletion" based on consumption rate
- Alerts when reserves drop below thresholds
- Historical burn rate charts

### 8.6 Psychological profiling `✅`
- Decision-making style assessment
- Stress response tendencies
- Leadership compatibility matrix
- Conflict resolution preferences
- This was discussed early but deferred — revisit when core features are stable

---

## Dependency Graph

```
Phase 1 (Data Persistence)
  └── Phase 2 (Inventory) — needs IDB pattern from 1
  └── Phase 3 (Profiles) — needs profile fields from 1.1
      └── Phase 4 (Notifications) — needs member profiles to route notifications
  └── Phase 5 (Settings) — independent, can parallel with 2-4
  └── Phase 6 (Messaging) — independent, can parallel with 2-5

Phase 7 (Distribution) — independent, can start anytime
Phase 8 (Advanced) — after 1-6 are stable
```

## Priority Order (if doing serially)

1. **Phase 1** — 30 min. Pure data plumbing, unblocks everything else.
2. **Phase 2** — 2-3 hrs. Highest impact missing feature. Tribe can't track what they own.
3. **Phase 3.1 + 3.3** — 1-2 hrs. Member profiles make the app feel real.
4. **Phase 5.1** — 1 hr. Settings screen is basic but expected.
5. **Phase 3.2** — 1 hr. Vouching adds trust layer.
6. **Phase 4.1 + 4.2** — 2-3 hrs. In-app notifications.
7. **Phase 6** — 2-3 hrs. Messaging polish.
8. **Phase 4.3** — 1-2 hrs. Alert broadcast.
9. **Phase 7** — 2-3 hrs. Distribution.
10. **Phase 8** — Ongoing.
