/**
 * Plus Ultra — Userflow Screenshot Capture
 *
 * Prerequisites: `npm run dev` must be running at http://localhost:5173
 *
 * Run:
 *   npx playwright test tests/capture-screens.spec.ts --reporter=list
 *
 * Output: docs/userflows-screens/[flow-folder]/step-01.png, step-02.png, ...
 *
 * Mobile viewport: 390×844 (iPhone 14 Pro)
 */

import { test } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../../../docs/userflows-screens')

// ─── helpers ─────────────────────────────────────────────────────────────────

function ensureDir(folder: string): string {
  const p = path.join(OUT, folder)
  fs.mkdirSync(p, { recursive: true })
  return p
}

async function snap(page: any, folder: string, step: number) {
  const d = ensureDir(folder)
  const file = path.join(d, `step-${String(step).padStart(2, '0')}.png`)
  await page.screenshot({ path: file })
  console.log(`  ✓  ${folder}/step-${String(step).padStart(2, '0')}.png`)
}

/**
 * Navigate to `url` and wait for the page to settle.
 * Uses `load` instead of `networkidle` because Gun.js keeps WebSocket open
 * indefinitely, which would cause networkidle to never fire.
 */
async function go(page: any, url: string, settle = 800) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 15_000 })
  } catch {
    // fallback if load times out (shouldn't happen on local dev)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10_000 })
  }
  await page.waitForTimeout(settle)
}

/** Write a MANUAL.md placeholder so the designer knows what's needed. */
function markManual(folder: string, reason: string) {
  const d = ensureDir(folder)
  const file = path.join(d, 'MANUAL.md')
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, `# Manual Capture Required\n\n${reason}\n`)
  }
}

// ─── main test ───────────────────────────────────────────────────────────────

test('capture all userflow screens', async ({ page }) => {
  // ── SEED PHASE ─────────────────────────────────────────────────────────────
  // Identity auto-creates on first app load via IdentityProvider.
  // We then create a tribe via the UI to get a real tribeId for all tribe routes.

  // Warm up the app (identity keypair generates here)
  await go(page, '/', 1500)

  // Navigate to create-tribe and fill the form
  await go(page, '/create-tribe')
  await page.fill('input[placeholder*="Austin"]', 'Blue Ridge Alpha').catch(() => {})
  await page.fill('input[placeholder*="City or"]', 'Blue Ridge Mountains, VA').catch(() => {})
  await page.fill('input[placeholder*="Texas"]', 'Virginia').catch(() => {})
  await page.click('button:has-text("Found This Tribe")').catch(() => {})

  // Wait for navigation to /tribe/$tribeId/onboarding (up to 8s for IDB + Gun writes)
  let tribeId = 'SEEDED_TRIBE'
  try {
    await page.waitForURL('**/tribe/**', { timeout: 8_000 })
    const m = page.url().match(/\/tribe\/([^/?#]+)/)
    if (m) tribeId = m[1]
  } catch {
    console.warn('⚠  Tribe creation did not navigate — using placeholder tribeId')
  }
  console.log(`\n  Tribe ID: ${tribeId}\n`)

  // Convenience: prefix for all tribe-scoped routes
  const T = (route: string) => `/tribe/${tribeId}${route}`

  // Placeholder member pub (our own identity — close enough for empty-state shots)
  const memberPub = tribeId

  // ── CAPTURE PHASE ──────────────────────────────────────────────────────────

  // 01 — First launch & identity creation
  await go(page, '/')
  await snap(page, '01-first-launch-and-identity-creation', 1)

  // 02 — Identity backup QR export
  await go(page, '/identity')
  await snap(page, '02-identity-backup-qr-export', 1)

  // 03 — Identity restore from backup QR
  await go(page, '/identity')
  // Try clicking a Restore tab/button if present
  await page
    .click('[role="tab"]:has-text("Restore"), button:has-text("Restore"), a:has-text("Restore")')
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '03-identity-restore-from-backup-qr', 1)

  // 04 — Create a tribe
  await go(page, '/create-tribe')
  await snap(page, '04-create-a-tribe', 1)

  // 05 — Join a tribe
  await go(page, '/join')
  await snap(page, '05-join-a-tribe', 1)

  // 06 — Onboarding wizard (capture each step; skills step repeats per domain)
  // Cap at 20 to prevent runaway; real exit is when Next button disappears.
  await go(page, T('/onboarding'))
  await snap(page, '06-onboarding-wizard', 1)
  for (let s = 2; s <= 20; s++) {
    const clicked = await page
      .click(
        'button:has-text("Next"), button:has-text("Continue"), button[aria-label="Next step"], button:has-text("→")',
        { timeout: 2_000 },
      )
      .then(() => true)
      .catch(() => false)
    if (!clicked) break
    await page.waitForTimeout(400)
    await snap(page, '06-onboarding-wizard', s)
  }

  // 07 — Tribe dashboard
  await go(page, T('/'))
  await snap(page, '07-navigate-tribe-dashboard', 1)

  // 08 — Member profile
  await go(page, T(`/member/${memberPub}`))
  await snap(page, '08-update-member-profile', 1)

  // 09 — Declare skills
  await go(page, T('/skills'))
  await snap(page, '09-declare-skills', 1)

  // 10 — My station
  await go(page, T('/station'))
  await snap(page, '10-view-my-station', 1)

  // 11 — Psych assessment
  await go(page, T('/psych/assessment'))
  await snap(page, '11-psych-assessment', 1)

  // 12 — Tribe psych overview
  await go(page, T('/psych'))
  await snap(page, '12-tribe-psych-overview', 1)

  // 13 — My people
  await go(page, T('/people'))
  await snap(page, '13-my-people', 1)

  // 14 — Inventory (browse)
  await go(page, T('/inventory'))
  await snap(page, '14-add-update-inventory-items', 1)

  // 15 — Log consumption (try to open the consumption form)
  await go(page, T('/inventory'))
  await page
    .click(
      'button:has-text("Log Consumption"), button:has-text("Consume"), button:has-text("Use"), button[aria-label*="consumption"]',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '15-log-consumption', 1)

  // 16 — Production log
  await go(page, T('/production'))
  await snap(page, '16-log-production', 1)

  // 17 — Resource readiness dashboard
  await go(page, T('/readiness'))
  await snap(page, '17-resource-readiness-dashboard', 1)

  // 18 — Manage finances
  await go(page, T('/finance'))
  await snap(page, '18-manage-finances', 1)

  // 19 — External contacts
  await go(page, T('/contacts'))
  await snap(page, '19-add-external-contacts', 1)

  // 20 — Create a proposal
  await go(page, T('/proposals/new'))
  await snap(page, '20-create-a-proposal', 1)

  // 21 — Vote on a proposal (proposals list — empty state)
  await go(page, T('/proposals'))
  await snap(page, '21-vote-on-a-proposal', 1)

  // 22 — Create goal from proposal
  await go(page, T('/goals'))
  await snap(page, '22-create-goal-from-proposal', 1)

  // 23 — Add and assign tasks (try opening task form)
  await go(page, T('/goals'))
  await page
    .click(
      'button:has-text("Add Task"), button:has-text("New Task"), button:has-text("+ Task"), button[aria-label*="task"]',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '23-add-and-assign-tasks', 1)

  // 24 — View goals and track progress
  await go(page, T('/goals'))
  await snap(page, '24-view-goals-and-track-progress', 1)

  // 25 — Create schedule event
  await go(page, T('/schedule'))
  await snap(page, '25-create-schedule-event', 1)

  // 26 — Assign members to events (try opening event form)
  await go(page, T('/schedule'))
  await page
    .click(
      'button:has-text("New Event"), button:has-text("Add Event"), button:has-text("Create Event"), button:has-text("+")',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '26-assign-members-to-events', 1)

  // 27 — PACE comms plan setup
  await go(page, T('/comms'))
  await snap(page, '27-pace-comms-plan-setup', 1)

  // 28 — Tribe schematic and readiness (two screens)
  await go(page, T('/schematic'))
  await snap(page, '28-tribe-schematic-and-readiness', 1)
  await go(page, T('/readiness'))
  await snap(page, '28-tribe-schematic-and-readiness', 2)

  // 29 — Knowledge base browse
  await go(page, T('/kb'))
  await snap(page, '29-knowledge-base-browse', 1)

  // 30 — KB create / approve (try opening create form)
  await go(page, T('/kb'))
  await page
    .click(
      'button:has-text("Create"), button:has-text("New Entry"), button:has-text("Add Article"), button:has-text("+")',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '30-knowledge-base-create-approve', 1)

  // 31 — Map view
  await go(page, T('/map'), 1200) // Leaflet needs extra time
  await snap(page, '31-map-view-territory', 1)

  // 32 — Map draw mode (try activating draw tools)
  await go(page, T('/map'), 1200)
  await page
    .click(
      'button:has-text("Draw"), button[aria-label*="Draw"], button:has-text("Edit"), .leaflet-draw-draw-polygon, button:has-text("Pin")',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(600)
  await snap(page, '32-map-draw-territory-pins-routes', 1)

  // 33 — Tribe channel
  await go(page, T('/channel'))
  await snap(page, '33-send-message-tribe-channel', 1)

  // 34 — Direct message
  await go(page, T(`/dm/${memberPub}`))
  await snap(page, '34-send-direct-message', 1)

  // 35 — React and reply to message (same channel screen — shows reply affordance)
  await go(page, T('/channel'))
  await snap(page, '35-react-and-reply-to-message', 1)

  // 36 — Training log session
  await go(page, T('/training'))
  await snap(page, '36-training-log-session', 1)

  // 37 — Record certification (try opening cert form)
  await go(page, T('/training'))
  await page
    .click(
      'button:has-text("Certification"), button:has-text("Add Cert"), button:has-text("Record Cert"), button[aria-label*="cert"]',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '37-training-record-certification', 1)

  // 38 — Training approve level-up (approvals tab/section)
  await go(page, T('/training'))
  await page
    .click(
      '[role="tab"]:has-text("Approve"), button:has-text("Level Up"), [role="tab"]:has-text("Approvals")',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '38-training-approve-level-up', 1)

  // 39 — Initiate roll call muster
  await go(page, T('/rollcall'))
  await snap(page, '39-initiate-roll-call-muster', 1)

  // 40 — MANUAL: Respond to roll call
  markManual(
    '40-respond-to-roll-call',
    'Requires an active muster initiated from another device/user. ' +
      'Route: /tribe/$tribeId/rollcall (response form state)',
  )

  // 41 — Report infrastructure status (tribe dashboard)
  await go(page, T('/'))
  await snap(page, '41-report-infrastructure-status', 1)

  // 42 — Send emergency alert (tribe dashboard alert section)
  await go(page, T('/'))
  await snap(page, '42-send-emergency-alert', 1)

  // 43 — MANUAL: Receive emergency alert
  markManual(
    '43-receive-emergency-alert',
    'Full-screen overlay triggered when another user broadcasts an emergency alert. ' +
      'Requires a second active tribe member sending an alert.',
  )

  // 44 — Create bug-out plan
  await go(page, T('/bugout'))
  await snap(page, '44-create-bug-out-plan', 1)

  // 45 — Activate bug-out plan (empty state + note)
  await go(page, T('/bugout'))
  await snap(page, '45-activate-bug-out-plan', 1)
  markManual(
    '45-activate-bug-out-plan',
    'step-01.png shows the empty-state / create form. ' +
      'The activation confirmation modal requires an existing saved plan.',
  )

  // 46 — Generate federation contact card
  await go(page, T('/federation'))
  await snap(page, '46-generate-federation-contact-card', 1)

  // 47 — Connect with allied tribe
  await go(page, '/connect')
  await snap(page, '47-connect-with-allied-tribe', 1)

  // 48 — MANUAL: Message in federation channel
  markManual(
    '48-message-in-federation-channel',
    'Requires a successfully federated allied tribe. ' +
      'Route: /tribe/$tribeId/federation/$channelId',
  )

  // 49 — Create trade proposal (same create-proposal form, trade type)
  await go(page, T('/proposals/new'))
  await page
    .click(
      'button:has-text("Trade"), [value="trade"], label:has-text("Trade"), input[value="trade"]',
      { timeout: 2_000 },
    )
    .catch(() => {})
  await page.waitForTimeout(400)
  await snap(page, '49-create-trade-proposal', 1)

  // 50 — Share intel / PACE plan export
  await go(page, T('/comms'))
  await snap(page, '50-share-intel-pace-plan', 1)

  // 51 — Manage tribe settings
  await go(page, T('/settings'))
  await snap(page, '51-manage-tribe-settings', 1)

  // ── GRID-DOWN FLOWS (inject localStorage before each navigation) ──────────
  const now = Date.now()

  // 52 — Offline escalation stages (5 distinct time thresholds)
  const offlineStages: [number, string][] = [
    [5 * 60 * 1000, 'Stage 1 — just went offline (5 min)'],
    [30 * 60 * 1000, 'Stage 2 — 30 min offline'],
    [2 * 60 * 60 * 1000, 'Stage 3 — 2 hours offline'],
    [24 * 60 * 60 * 1000, 'Stage 4 — 1 day offline'],
    [72 * 60 * 60 * 1000, 'Stage 5 — 3 days offline'],
  ]
  for (let i = 0; i < offlineStages.length; i++) {
    const [delta] = offlineStages[i]
    await page.evaluate((ts: number) => localStorage.setItem('plusultra:offlineSince', String(ts)), now - delta)
    await go(page, T('/'))
    await snap(page, '52-offline-escalation-stages', i + 1)
  }

  // 53 — Grid-down dashboard (1 hour offline)
  await page.evaluate((ts: number) => localStorage.setItem('plusultra:offlineSince', String(ts)), now - 60 * 60 * 1000)
  await go(page, T('/'))
  await snap(page, '53-grid-down-dashboard', 1)

  // 54 — Offline message queue (show channel in grid-down state)
  await page.evaluate((ts: number) => localStorage.setItem('plusultra:offlineSince', String(ts)), now - 30 * 60 * 1000)
  await go(page, T('/channel'))
  await snap(page, '54-offline-message-queue', 1)

  // Restore online state for remaining captures
  await page.evaluate(() => localStorage.removeItem('plusultra:offlineSince'))

  // 55, 56, 57 — MANUAL: Tauri-native mesh features
  markManual(
    '55-mesh-network-mdns-discovery',
    'Tauri desktop-only feature. Requires running in Tauri context with mDNS/LAN relay. ' +
      'No-ops in the browser. See packages/app/src-tauri/src/mesh.rs',
  )
  markManual(
    '56-wifi-direct-phone-to-phone',
    'Android Tauri-only feature. Requires two physical Android devices with WiFi Direct. ' +
      'See packages/app/src-tauri/android-plugins/',
  )
  markManual(
    '57-ble-peer-discovery',
    'Tauri mobile-only feature. Requires a physical device with Bluetooth LE. ' +
      'See packages/app/src/lib/ble-discovery.ts',
  )

  // 58 — Grid-down drill mode (dashboard with ~24h offline)
  await page.evaluate((ts: number) => localStorage.setItem('plusultra:offlineSince', String(ts)), now - 24 * 60 * 60 * 1000)
  await go(page, T('/'))
  await snap(page, '58-grid-down-drill-mode', 1)
  await page.evaluate(() => localStorage.removeItem('plusultra:offlineSince'))

  // 59 — Diagnostics
  await go(page, '/diagnostics')
  await snap(page, '59-diagnostics-screen', 1)

  // 60 — Enable push notifications (tribe dashboard)
  await go(page, T('/'))
  await snap(page, '60-enable-push-notifications', 1)

  console.log(`\n  All automatable screens captured → ${OUT}\n`)
})
