# Plus Ultra — Testing Checklist

Living document. Check off each file as it is written. Source of truth across conversations.

---

## Phase 1 — Unit Tests: `packages/core/src/lib/`

Tooling: Vitest (already configured). Run with `npm test` from root or `packages/core/`.

- [x] `readiness.test.ts` — `computeCompositeReadiness()`, 6 dimensions, grades, critical gaps
- [x] `psych-engine.test.ts` — `scoreQuiz`, `computeArchetype`, `mergeProfileDimensions`, `roleFitScore`, `compatibilityScore`
- [x] `consumption-rate.test.ts` — `computeBurnRate`, `computeDaysRemaining`, `getDepletionStatus`
- [x] `production-rate.test.ts` — `computeProductionRate`, `computeNetRate`, `computeNetDaysRemaining`
- [x] `training-criteria.test.ts` — `getTrainingHoursForSkill`, `checkLevelUpEligibility`
- [x] `membership.test.ts` — `currentAttachmentScore`, decay, clamping
- [x] `role-registry.test.ts` — `slotsNeeded` (all 4 curves), `activeRoles`
- [x] `role-affinity.test.ts` — `canEditInventory`, `getAffinityAssets`, `getAffinityDomains`

---

## Phase 2 — Integration Tests: `packages/app/src/lib/`

New deps needed: `vitest`, `fake-indexeddb` in `packages/app` devDependencies.
Run with: `npm run test --workspace=packages/app`

Setup files:
- [x] `packages/app/package.json` — added vitest + fake-indexeddb devDependencies + test script
- [x] `packages/app/vitest.config.ts` — vitest config for app package
- [x] `packages/app/src/test-setup.ts` — fake-indexeddb auto-patch

Priority tests (bug-prone areas):
- [x] `lib/sync-queue.test.ts` — addPendingSync, flushPendingSyncs, ACK gating, timeout
- [x] `lib/messaging.test.ts` — sendTribeMessage, queueMessage/flushQueue, cacheMessage, markChannelRead
- [x] `lib/proposals.test.ts` — createProposal, castVote with nested gunPath (known bug area)
- [x] `lib/inventory.test.ts` — updateAsset, offline queuing, multi-asset independence
- [x] `lib/identity.test.ts` — generateIdentity, loadIdentity, restoreIdentity (key lifecycle)
- [x] `lib/consumption.test.ts` — logConsumption, alert deduplication
- [x] `lib/tribes.test.ts` — createTribe (IDB-first ordering), joinTribe, validateAndConsumeToken
- [x] `lib/skills.test.ts` — declareSkill (composite key format), vouchForSkill, no-double-vouch

Remaining modules:
- [x] `lib/contacts.test.ts`
- [x] `lib/events.test.ts`
- [x] `lib/finance.test.ts`
- [x] `lib/tasks.test.ts`
- [x] `lib/rollcall.test.ts`
- [x] `lib/docs.test.ts`
- [x] `lib/training.test.ts`
- [x] `lib/certifications.test.ts`
- [x] `lib/production.test.ts`
- [x] `lib/bugout.test.ts`
- [x] `lib/grid-state.test.ts`
- [x] `lib/psych.test.ts`
- [x] `lib/map.test.ts`
- [x] `lib/comms.test.ts`

---

## Phase 3 — E2E Tests: Playwright

New deps: `@playwright/test` in `packages/app` devDependencies.
Config: `packages/app/playwright.config.ts`

- [ ] `packages/app/playwright.config.ts`
- [ ] `e2e/onboarding.spec.ts` — identity auto-generated → tribe creation → founder has elder_council role
- [ ] `e2e/join-tribe.spec.ts` — founder generates invite → new identity uses invite → member appears
- [ ] `e2e/proposals.spec.ts` — create proposal → multiple votes → correct outcome
- [ ] `e2e/rollcall.spec.ts` — initiate muster → members respond → 100% response rate
- [ ] `e2e/offline-sync.spec.ts` — go offline → write → pending-syncs entry → restore → synced

---

## Phase 4 — Security / Crypto Tests

Covered alongside Phase 2e (identity.test.ts). Additional file:

- [x] `lib/crypto.test.ts` — key gen, sign/verify, backup/restore roundtrip, DM encryption, federation encryption

Note: requires `globalThis.crypto = require('node:crypto').webcrypto` in test-setup.ts for SEA.

---

## Phase 5 — Offline Resilience Tests

- [x] `lib/offline-queue.test.ts` — queue accumulation, flush success, partial failure, error stays

Playwright (part of 3e above):
- [ ] `e2e/offline-sync.spec.ts` — 2s polling fallback when WS blocked

---

## Phase 6 — Component Tests

New deps: `@testing-library/react`, `@testing-library/user-event`, `jsdom` in `packages/app` devDependencies.
Requires `environment: 'jsdom'` in vitest config.

- [x] `components/QrDisplay.test.tsx`
- [x] `components/MessageInput.test.tsx`
- [x] `components/MusterResponseForm.test.tsx`
- [x] `components/CriticalGapsPanel.test.tsx`
- [x] `components/AlertOverlay.test.tsx`

---

## Run Commands

```bash
# Phase 1 (works today)
cd packages/core && npm test

# Phase 2+ (after vitest + fake-indexeddb added to packages/app)
npm run test --workspace=packages/app

# Phase 3 (after Playwright installed)
cd packages/app && npx playwright test
```
