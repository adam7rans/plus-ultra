# Plus Ultra — Userflow Reference

**Purpose:** Internal reference for tutorial articles and videos. Covers every userflow in the app across both Grid Up (cloud-connected) and Grid Down (offline/P2P mesh) modes.

**App concept:** Plus Ultra is a decentralized tribal operating system — a sovereign coordination platform for groups who need to function with or without internet infrastructure.

---

## How to Read This Document

Each flow describes a user journey through the app:

- **Mode: Grid Up** — Convex cloud sync is active; data propagates in real time.
- **Mode: Grid Down** — Offline or mesh-only; data is queued locally and syncs when connectivity returns.
- **Mode: Both** — Works in either mode; behavior differences are noted in the steps.

---

## Section 1: Setup & Identity

These flows cover first-run setup, identity management, and tribe enrollment. They all work in both modes because identity is generated locally.

---

### 1. First Launch & Identity Creation

**Mode:** Both
**Summary:** On first launch, the app auto-generates a Gun/SEA cryptographic keypair and stores it in IndexedDB. No accounts, no servers required.

**Steps:**
1. User opens the app for the first time.
2. `IdentityContext` checks IndexedDB for an existing keypair.
3. [Branch A — No identity found] A new keypair is generated via Gun SEA (`pub`, `priv`, `epub`, `epriv`). The identity is saved locally with `createdAt` timestamp and `backedUp: false`.
4. [Branch B — Identity exists] The existing identity is loaded.
5. The **Home Screen** renders with the user's short public key ID displayed in the top-right corner.
6. A yellow backup warning banner appears if `backedUp` is false.

**Screens & UI:**
- **Home Screen:**
  - Header: "PLUS ULTRA / Tribal Operating System"
  - Top-right identity chip: shows short ID (first 8 chars of public key) — tap to go to Identity Screen
  - Backup warning banner (yellow, pulsing): "Back up your identity — losing your phone without a backup means losing tribe access forever." Tapping navigates to Identity Screen.
  - "My Tribes" section: empty state with campfire emoji and "No tribe yet"
  - "Create New Tribe" primary button
  - "Scan QR to Join" secondary button (activates inline camera scanner)
  - "diagnostics" text link at bottom

**Accomplished:** User has a cryptographic identity stored locally. No registration, no server handshake.
**Next Steps:** Back up the identity QR code (Flow 2), then create (Flow 4) or join (Flow 5) a tribe.

---

### 2. Identity Backup (QR Export)

**Mode:** Both
**Summary:** The user exports their full keypair as a QR code to save offline. This is the only way to recover access on a new device.

**Steps:**
1. From Home Screen, tap the identity chip (top-right) or the yellow backup warning banner.
2. **Identity Screen** opens, showing: public key (full + shortened), display name section, private key (hidden), backup status card.
3. Tap **"Back Up Now"** (or "View Backup QR Code" if already backed up).
4. App switches to **Backup View**: QR code is rendered from a JSON payload containing `pub`, `priv`, `epub`, `epriv`, `createdAt`, `backedUp: true`.
5. Warning card: "This QR contains your private key. Guard it like cash."
6. User saves/prints the QR. The app calls `markBackedUp()` which sets `identity.backedUp = true` in IDB.
7. Tap **"Done — I've saved my backup"** to return to Identity main view.
8. Backup status card now shows green: "Identity backed up."

**Screens & UI:**
- **Identity Screen (main view):**
  - Public Key card: shortened readable ID + full key
  - Display Name card: current name or "Not set" with edit/save inline form
  - Private Key card: masked by default; tap "tap to reveal" shows raw key; "Hide" re-masks
  - Backup Status card: green (backed up) or yellow pulsing (not backed up)
  - "Back Up Now" / "View Backup QR Code" primary button
  - "Restore from QR Code" secondary button
  - Creation date at bottom
- **Backup View:**
  - "← Back" link
  - "Backup Identity" heading with storage guidance
  - QR code display (full-screen card)
  - Red danger card: "⚠ Keep this private"
  - "Done — I've saved my backup" primary button

**Accomplished:** Keypair is backed up; `backedUp` flag set; yellow warning banner dismissed.
**Next Steps:** Store backup in a Faraday bag or fire safe. Proceed to tribe setup.

---

### 3. Identity Restore (from Backup QR)

**Mode:** Both
**Summary:** User scans a previously exported backup QR to restore their identity on a new or wiped device.

**Steps:**
1. From Home Screen, tap identity chip → Identity Screen.
2. Tap **"Restore from QR Code"**.
3. **Restore View** opens with a camera QR scanner.
4. User holds up the backup QR code to the camera.
5. [Branch A — Valid QR] Scanner decodes the JSON payload; `restoreIdentity()` is called, which overwrites the local IDB keypair with the backup data.
6. Success card: "✓ Identity restored" with a "Continue" button.
7. User taps Continue → navigates back to Home Screen with restored identity.
8. [Branch B — Invalid QR] Error card: "Failed to restore identity" with the specific error message.

**Screens & UI:**
- **Restore View:**
  - "← Back" link
  - "Restore Identity" heading with instructions
  - Live camera QR scanner component
  - Error card (danger, shown on failure)
  - Success card (green) with "Continue" button

**Accomplished:** Identity restored from backup; user can access their previous tribes and messages.
**Next Steps:** Navigate to tribe dashboard; verify tribe memberships are still present.

---

### 4. Create a Tribe

**Mode:** Both (tribe metadata written locally; syncs to Convex if Grid Up)
**Summary:** The founding member sets up a new tribe with a name, location, region, governance model, and optional coordinates.

**Steps:**
1. From Home Screen, tap **"+ Create New Tribe"**.
2. Fill in required fields: Tribe Name, Location (general area), Region.
3. Optionally expand "Set Coordinates" to use device GPS or enter lat/lng manually.
4. Select **Governance Model** — one of three:
   - **Council Model:** Domain leads vote; coordinator has tie-break; 24-hour window.
   - **Direct Democracy:** All members vote; 72-hour window.
   - **Hybrid:** Council for operations; full tribe for major changes; 48-hour window.
5. Tap **"Found This Tribe"**.
6. App calls `createTribe()`: writes tribe metadata to IDB, registers founding member, dispatches `tribe-joined` event.
7. Navigates to `/tribe/$tribeId/onboarding` (Onboarding Wizard — Flow 6).

**Screens & UI:**
- **Create Tribe Screen:**
  - "← Back" link to Home
  - "Create a Tribe" heading; "You'll be the founding member. Invite others after setup."
  - Tribe Name field (max 60 chars)
  - Location field: "City or neighborhood (no exact addresses)" — note: "General area only — exact location stays private."
  - Region field (max 40 chars)
  - "Set Coordinates" expandable section: "Use My Current Location" button; manual lat/lng fields; computed display (e.g., "30.2672° N, 97.7431° W")
  - Governance Model selector: 3 radio cards, each with label and description
  - Error card (danger) if validation fails
  - "Found This Tribe" button (disabled until all required fields filled)

**Accomplished:** Tribe created; founding member enrolled; governance constitution set.
**Next Steps:** Complete the Onboarding Wizard (Flow 6); then invite others (generate invite from dashboard).

---

### 5. Join a Tribe (via Invite QR/Link)

**Mode:** Both (invite link works offline if tribe metadata is embedded in URL)
**Summary:** A non-member receives an invite link or QR code, scans it, and is enrolled as a tribe member.

**Steps:**
1. [Path A — QR Scan] From Home Screen, tap **"Scan QR to Join"**. The inline camera scanner activates. User scans the invite QR code. App parses the URL and navigates to `/join?tribe=...&token=...&name=...&loc=...&pub=...`.
2. [Path B — Link Click] User taps the invite link directly. App opens the Join screen with URL params pre-parsed.
3. **Join Tribe Screen** loads, attempts to fetch tribe metadata from Gun relay.
4. [Branch A — Grid Up, tribe data found] Shows tribe preview card: tribe name, location, governance model.
5. [Branch B — Grid Down, URL-embedded fallback] Shows tribe preview using name/location embedded in the invite URL. No relay needed.
6. [Branch C — No data, no fallback] Warning card: "Could not load tribe info."
7. User taps **"Join [Tribe Name]"**.
8. `joinTribe()` is called: validates token, adds member record to IDB, dispatches `tribe-joined` event.
9. Navigates to `/tribe/$tribeId/onboarding`.

**Screens & UI:**
- **Home Screen (scanner active):**
  - Inline camera QR scanner with "Cancel Scan" button
- **Join Tribe Screen:**
  - "← Back" link to Home
  - "Join a Tribe" heading
  - Tribe preview card: "You're invited to join" / tribe name / location / governance model (if loaded)
  - Warning card (if no tribe data)
  - "Join [Tribe Name]" primary button
  - Error card on join failure

**Accomplished:** Member enrolled in tribe; invite token consumed.
**Next Steps:** Complete the Onboarding Wizard (Flow 6).

---

### 6. Onboarding Wizard (Multi-Step Profile + Skills Setup)

**Mode:** Both
**Summary:** After joining or creating a tribe, new members complete a 5-step wizard that captures their profile, skill domains, individual roles, and availability. This data directly feeds the Survivability Score.

**Steps:**
1. **Step 1 — Profile:** Enter display name (required), select member type (Adult / Elder / Child / Dependent), upload optional photo (max 200KB), write optional bio. Tap Next.
2. **Step 2 — Domains:** Select all skill domains that apply (grid of domain cards with icon and label). At least one required. Tap Next.
3. **Step 3 — Skills:** For each selected domain (paginated, "Domain X of Y"), review roles for that domain. Tap a role to select it; tapping an already-selected role expands it to set:
   - Sub-specialties (pill chips)
   - Experience (< 1 year / 1–3 / 3–7 / 7–15 / 15+ years)
   - Proficiency (Basic / Intermediate / Expert / Verified Expert)
   - "Remove this role" link
   Tap "Next Domain →" until all domains covered, then Next to Availability.
4. **Step 4 — Availability:** Select availability (Full-time / Part-time / On-call), optional physical limitations, optional notes for the tribe.
5. **Step 5 — Review:** Summary card showing photo/name/member type, all selected skills organized by domain, and availability. Tap "Join Tribe" to submit.
6. Submission: saves display name, updates member profile (bio, photo, availability, limitations, memberType), and batch-writes all skill declarations to IDB. Navigates to tribe dashboard.

**Screens & UI:**
- **Onboarding Screen:**
  - Progress dots at top (5 dots; current = filled, past = dim, future = darkest)
  - Fixed bottom bar: Back / Next buttons (or "Join Tribe" on review step)
  - Step 1 Profile: name input, 2×2 member type grid, file upload with preview circle, bio textarea
  - Step 2 Domains: 2-column grid of domain cards (icon + label), toggle-select style
  - Step 3 Skills: domain name + icon header, list of role cards with expandable detail panels
  - Step 4 Availability: 3 large option buttons, limitations input, notes textarea
  - Step 5 Review: profile summary card with nested skills and availability sections

**Accomplished:** Member profile complete; skills declared; tribe can compute accurate Survivability Score.
**Next Steps:** Explore the Tribe Dashboard (Flow 7); declare additional skills anytime (Flow 9); view your Station (Flow 10).

---

## Section 2: Daily Operations — Profile & People

---

### 7. Navigate the Tribe Dashboard

**Mode:** Both (Grid Down: offline stage banner appears; some cards dimmed)
**Summary:** The central hub of tribe life. Shows survivability score, upcoming events, resources, member roster, alerts, and quick-access navigation to all tribe features.

**Steps:**
1. From Home Screen, tap a tribe card.
2. Dashboard loads tribe data: survivability score, events, inventory readiness, members, notifications, proposals count, federation relationships.
3. Grid Down banner (if applicable) shows current offline stage and description.
4. User can navigate to any feature via the dashboard cards and quick-action buttons.

**Screens & UI:**
- **Tribe Dashboard:**
  - **Offline Stage Banner** (Grid Down only): colored badge indicating Stage 1–5
  - **Header:** tribe name + location; "Invite" button (generates invite URL/QR); notification bell (with unread count badge); "⚡ Send Alert" button; "📣 Muster" button
  - **Survivability Score card:** numeric score (0–100) + progress ring; tap to expand 6-bucket breakdown; "view schematic" link
  - **Now & Up Next card:** current and upcoming scheduled events
  - **Resource Readiness card:** percentage bar; link to inventory
  - **Critical Gaps panel:** roles with zero coverage highlighted in red
  - **Members section:** member cards with status indicators (active/away); tap to view profile
  - **Tribe Channel card:** unread message count; link to channel
  - **Proposals badge:** open proposal count; link to proposals
  - **Federation card:** allied tribes count; link to federation
  - **Drill Checklist card** (Grid Down): grid-down drill tasks
  - **Infra Checklist card** (Grid Down): 11-item infrastructure status checklist
  - **Bug-Out CTA** (Grid Down/emergency): link to bug-out plan if one is active
  - **Notifications panel** (on bell tap): scrollable list; "Mark all read" button
  - **Send Alert modal** (on alert button): message + severity selector
  - **Initiate Muster modal** (on muster button): reason + optional message
  - **Push notifications toggle** (if supported by platform)
  - **Declare Grid Down modal** (manual override)

**Accomplished:** User has situational awareness of tribe health, upcoming activities, and gaps.
**Next Steps:** Any of the 50+ features reachable from this screen.

---

### 8. Update Your Member Profile

**Mode:** Both
**Summary:** Members can edit their display name, photo, bio, member type, availability, and physical limitations at any time after onboarding.

**Steps:**
1. From the dashboard, tap your own member card, or navigate to `/tribe/$tribeId/member/$yourPub`.
2. **Member Profile Screen** opens with current profile data.
3. Edit fields as needed: display name, photo upload, bio, member type, availability, physical limitations.
4. Tap Save.
5. Profile update is written to IDB and synced (Grid Up) or queued (Grid Down).

**Screens & UI:**
- **Member Profile Screen:**
  - Avatar display (or placeholder)
  - Name field with inline edit
  - Member type selector
  - Bio textarea
  - Availability selector
  - Physical limitations input
  - Save button

**Accomplished:** Member profile reflects current status; tribe member cards updated.
**Next Steps:** Update skills declaration (Flow 9).

---

### 9. Declare Skills

**Mode:** Both
**Summary:** Members update their skill declarations at any time from the dedicated Skills screen. Skills are organized in 3 tiers (Critical → Essential → Multipliers) and domains, each role showing icon, description, and current proficiency.

**Steps:**
1. From the dashboard, navigate to `/tribe/$tribeId/skills` (linked from My Station or via the skill link on the dashboard).
2. **Skills Declaration Screen** loads existing declared skills from IDB.
3. Scroll through roles grouped by Tier and Domain.
4. Tap a role to select it (defaults to Intermediate proficiency); tap again to expand proficiency picker.
5. Set proficiency: Basic / Intermediate / Expert / Verified Expert.
6. Pending sync indicator (clock icon) appears beside roles not yet relayed.
7. Tap **"Save Skills"** at the bottom (fixed bar with skill count badge).
8. Skills are batch-written to IDB and synced.
9. Navigates back to tribe dashboard.

**Screens & UI:**
- **Skills Declaration Screen:**
  - Offline Stage Banner (Grid Down)
  - "← Back to Tribe" link
  - Heading: "Declare Your Skills" + advisory text
  - Role list grouped: Tier 1 — Critical, Tier 2 — Essential, Tier 3 — Multipliers; within tiers, grouped by domain with icon/label
  - Each role card: icon, label, description; checkmark when selected; proficiency badge; pending sync icon
  - Expanded state: 4-cell proficiency grid (Basic / Intermediate / Expert / Verified Expert) with descriptions; "Remove this skill" link
  - Fixed bottom bar: skill count + "Save Skills" button

**Accomplished:** Updated skills declaration feeds the Survivability Score and informs team assignments.
**Next Steps:** View My Station (Flow 10) to see how skills translate to roles, teams, and gaps.

---

### 10. View My Station

**Mode:** Both
**Summary:** A personalized command view showing the member's declared roles, team members in the same domain, gaps in their domain, cross-training recommendations, and role-relevant inventory items.

**Steps:**
1. From dashboard, tap "My Station" card or navigate to `/tribe/$tribeId/station`.
2. [Branch A — No skills declared] Empty state with "Declare Skills →" button.
3. [Branch B — Skills declared] Full station view loads.
4. Review My Roles (icon + label chips).
5. Review My Team (members sharing domain/affinity; tap 💬 to DM them).
6. Review Vacancies in My Domain (roles with fewer members than needed, shown as `have/needed`).
7. Review Cross-Training Opportunities (gap roles where existing skills transfer; "Learn →" links to Training screen).
8. Review My Inventory (role-relevant assets with readiness colors: green = met, yellow = partial, red = zero/critical).

**Screens & UI:**
- **My Station Screen:**
  - "← Back to Dashboard" link
  - "My Station" heading
  - My Roles section: pill chips with role icon + label
  - My Team section: member list with status dot (green/yellow/gray), truncated roles, DM chat link
  - Vacancies section (warning card): role, icon, have/needed count in yellow
  - Cross-Training section: role icon, label, slots needed, affinity note, "Learn →" link
  - My Inventory section: asset icon, label, quantity/needed with color coding, star for critical
  - Quick links: "Edit My Skills" and "My People"

**Accomplished:** Member knows their operational role, team, and where the tribe most needs them.
**Next Steps:** Message team members directly (Flow 33/34); log inventory items (Flow 14); explore cross-training (Flow 37).

---

### 11. Take the Psych Assessment

**Mode:** Both
**Summary:** Members take a structured scenario-based quiz to generate a psychological archetype profile. Results contribute to the tribe's cohesion dimension in the Readiness Report.

**Steps:**
1. Navigate to `/tribe/$tribeId/psych/assessment`.
2. Questions display one at a time — a mix of scenario questions (situational choices) and forced-choice questions.
3. Each question has 4 options (A/B/C/D) with descriptive labels.
4. User taps their answer; the app advances to the next question.
5. After all questions, results are scored and saved as a `PsychProfile` with an archetype.
6. Redirects to the Psych Overview screen.

**Screens & UI:**
- **Psych Assessment Screen:**
  - Progress indicator (question number)
  - Scenario prompt text
  - 4 answer option buttons (full-width; highlight on select)
  - No back navigation (forced-choice, one-way)

**Accomplished:** Member has a psych archetype on record; tribe cohesion score improves.
**Next Steps:** View tribe-wide psych overview (Flow 12).

---

### 12. View Tribe Psych Overview (Leaders)

**Mode:** Both
**Summary:** Leaders and elders can see an aggregate view of all member archetypes to understand the group's psychological makeup and identify balance gaps.

**Steps:**
1. Navigate to `/tribe/$tribeId/psych`.
2. **Psych Overview Screen** loads all members who have completed the assessment.
3. View archetype distribution, individual member cards with their archetypes, and any balance notes.
4. Members without profiles are flagged.
5. Tap "Take Assessment" to navigate to the assessment (if own profile is missing).

**Screens & UI:**
- **Psych Overview Screen:**
  - Heading: "Tribe Psychology"
  - Archetype distribution summary
  - Member list with archetype labels and descriptions
  - "Take Assessment" button (if own profile missing)
  - Note: read-only for regular members; full data visible to leads+

**Accomplished:** Leadership understands team dynamics; can identify over-indexed archetypes or critical gaps.
**Next Steps:** Use insights in role assignments and training decisions.

---

### 13. My People (Family & Friends)

**Mode:** Both
**Summary:** Members can register non-member dependents, family, and friends — people outside the tribe who need to be tracked during musters or emergencies.

**Steps:**
1. Navigate to `/tribe/$tribeId/people`.
2. **My People Screen** shows a list of registered contacts.
3. Tap **"+ Add Person"** to create a new entry: name, relationship type, location, notes.
4. Save. Person appears in the list.
5. During Roll Call, these records inform the member's dependent headcount.

**Screens & UI:**
- **My People Screen:**
  - "← Back to Dashboard" link
  - "My People" heading
  - List of registered people with relationship type and notes
  - "+ Add Person" button
  - Edit/remove options per entry

**Accomplished:** Non-member dependents tracked; muster accountability improved.
**Next Steps:** Reference during Roll Call (Flow 39/40).

---

## Section 3: Resources & Logistics

---

### 14. Add/Update Inventory Items

**Mode:** Both
**Summary:** Members log physical assets — food, water, fuel, medical supplies, tools, communications gear — against tribe targets. The inventory data drives the Resource Readiness score.

**Steps:**
1. Navigate to `/tribe/$tribeId/inventory`.
2. **Inventory Screen** shows all tracked asset categories with current vs. needed quantities.
3. Tap an asset to expand it.
4. Enter quantity and tap Save.
5. [Branch A — Grid Up] Saved immediately to IDB and synced to Convex.
6. [Branch B — Grid Down] Saved to IDB; queued for sync.

**Screens & UI:**
- **Inventory Screen:**
  - Asset list by category; each row: icon, name, current/needed, color indicator
  - Expand to edit: quantity input, unit label (days supply, units, gallons, etc.), save button
  - Progress bars or color codes: green = at target, yellow = partial, red = zero
  - "★" markers on critical assets
  - Summary: overall readiness percentage

**Accomplished:** Tribe knows exactly what it has and what it lacks; readiness score is updated.
**Next Steps:** Log consumption (Flow 15); log production (Flow 16); view readiness report (Flow 17).

---

### 15. Log Consumption

**Mode:** Both
**Summary:** Members log consumption of resources, reducing inventory quantities over time.

**Steps:**
1. Navigate to `/tribe/$tribeId/inventory`.
2. Select an asset; tap "Log Consumption."
3. Enter quantity consumed and optional notes.
4. Tap Save. The asset quantity decreases; the consumption record is written to IDB.

**Screens & UI:**
- **Inventory Screen (consumption mode):**
  - "Log Consumption" button per asset
  - Quantity input (positive number)
  - Notes field (optional)
  - Save button

**Accomplished:** Inventory remains accurate; depletion rates visible to tribe leadership.
**Next Steps:** Replenish stock via production or resupply; track trends.

---

### 16. Log Production

**Mode:** Both
**Summary:** Members log production output — food grown, water filtered, fuel refined, gear fabricated — increasing inventory quantities.

**Steps:**
1. Navigate to `/tribe/$tribeId/production`.
2. **Production Screen** shows a form to log a production event: asset type, quantity produced, date, producer (member), notes.
3. Tap Save. Inventory quantity for the asset is increased.

**Screens & UI:**
- **Production Screen:**
  - Asset selector
  - Quantity input
  - Date picker
  - Member selector (defaults to self)
  - Notes textarea
  - Save button

**Accomplished:** Production output tracked; inventory replenished; readiness score improves.
**Next Steps:** View updated inventory (Flow 14); monitor resource readiness on dashboard (Flow 17).

---

### 17. View Resource Readiness on Dashboard

**Mode:** Both
**Summary:** The dashboard Resource Readiness card gives an at-a-glance percentage score based on critical asset coverage.

**Steps:**
1. From the Tribe Dashboard, locate the **Resource Readiness card**.
2. The card shows an overall percentage (e.g., "73% Ready").
3. Tap the card to navigate to the full Inventory screen for details.
4. For a full readiness report including all 6 dimensions, tap the Survivability Score card → "view schematic" or navigate to Readiness Screen.

**Screens & UI:**
- **Dashboard Resource Readiness card:**
  - Percentage label
  - Progress bar (color-coded: green/yellow/red)
  - Link: "→ Full Inventory"

**Accomplished:** Quick situational awareness of supply status.
**Next Steps:** Log inventory updates (Flow 14); view full Readiness Report (Flow 28).

---

### 18. Manage Finances (Expenses + Contributions)

**Mode:** Both
**Summary:** Track tribe expenses and member financial contributions for shared operations.

**Steps:**
1. Navigate to `/tribe/$tribeId/finance`.
2. **Finance Screen** shows two tabs: Expenses and Contributions.
3. Tap **"+ Log Expense"**: enter amount, category, description, date, payer.
4. Tap **"+ Log Contribution"**: enter amount, member, date, notes.
5. Save. The entry appears in the list.
6. Summary section shows total expenses, total contributions, and net balance.

**Screens & UI:**
- **Finance Screen:**
  - Tab bar: Expenses / Contributions
  - List of entries with amount, category/member, date
  - "+ Log Expense" / "+ Log Contribution" buttons
  - Summary card: total in, total out, net balance

**Accomplished:** Financial transparency maintained; tribe leadership can account for shared resources.
**Next Steps:** Use financial data in governance proposals (Flow 20) for budget decisions.

---

### 19. Add External Contacts

**Mode:** Both
**Summary:** Record contact information for people and organizations outside the tribe — doctors, suppliers, emergency services — accessible offline.

**Steps:**
1. Navigate to `/tribe/$tribeId/contacts`.
2. **Contacts Screen** shows a list of external contacts.
3. Tap **"+ Add Contact"**: fill in name, role/relationship, phone, notes, location.
4. Save. Contact appears in list.
5. Contacts are stored locally in IDB and available offline.

**Screens & UI:**
- **Contacts Screen:**
  - Contact list with name, role, phone
  - "+ Add Contact" button
  - Edit / delete per entry
  - Search/filter (if implemented)

**Accomplished:** Critical external contacts available even without internet.
**Next Steps:** Reference contacts during emergency operations; include in PACE plan (Flow 27).

---

## Section 4: Governance & Planning

---

### 20. Create a Proposal

**Mode:** Both (proposals queued offline; synced when Grid Up)
**Summary:** Any non-restricted member can create a governance proposal. The voting window, eligible voters, and required threshold depend on the tribe's constitution.

**Steps:**
1. Navigate to `/tribe/$tribeId/proposals` and tap **"+ New Proposal"** or go directly to `/tribe/$tribeId/proposals/new`.
2. **Create Proposal Screen** opens.
3. Fill in: title (required), description, proposed action, and optionally a category.
4. Tap **"Submit Proposal."**
5. Proposal is written to IDB with status `open`, `closesAt` timestamp based on constitutional window (24h/48h/72h).
6. Navigates to the proposal detail view.

**Screens & UI:**
- **Create Proposal Screen:**
  - "← Proposals" back link
  - "New Proposal" heading
  - Title input (required)
  - Description textarea
  - Category selector
  - Submit button

**Accomplished:** Proposal live and open for voting; tribe notified.
**Next Steps:** Vote on the proposal (Flow 21); track status in Proposals list.

---

### 21. Vote on a Proposal

**Mode:** Both
**Summary:** Eligible voters cast yes/no votes within the constitutional window. The system auto-tallies and closes the proposal when the window expires.

**Steps:**
1. Navigate to `/tribe/$tribeId/proposals`.
2. **Proposals Screen** shows tabs: Open, Closed, All. Constitution banner shows governance model and window.
3. Tap an open proposal card to view it.
4. **Proposal Detail Screen** shows full text, vote tally, and remaining time.
5. Eligible voters see the voting interface: "Yes" and "No" buttons.
6. Vote is saved to IDB and synced.
7. [Branch A — Quorum reached + window open] Proposal stays open until window closes.
8. [Branch B — Window expired] Auto-close fires: votes tallied, outcome computed, proposal status set to `passed` or `failed`.
9. [Branch C — Elder/Coordinator manual close] Authorized user can close proposal early.

**Screens & UI:**
- **Proposals Screen:**
  - Filter tabs: Open / Closed / All
  - Governance banner: "Council · 24h · Leads+ vote" (varies by constitution)
  - Proposal cards: title, submitter, category, time remaining (e.g., "14h 30m left"), vote tally bar
  - "View" → Proposal Detail
  - "Create Proposal" button (non-restricted members)
- **Proposal Detail Screen:**
  - Full proposal text
  - Vote tally: Yes / No counts + bar
  - Eligible voter count
  - Time remaining
  - Your vote buttons (Yes / No) — disabled after voting or if ineligible
  - Status badge: open / passed / failed

**Accomplished:** Democratic decision recorded; tribe governance history maintained.
**Next Steps:** Create a Goal from a passed proposal (Flow 22).

---

### 22. Create a Goal from a Passed Proposal

**Mode:** Both
**Summary:** After a proposal passes, an elder or council member converts it into an active tribe goal with a horizon and associated tasks.

**Steps:**
1. Navigate to `/tribe/$tribeId/goals`.
2. Tap **"+ New Goal"** (requires elder_council role).
3. Fill in: title (e.g., the passed proposal title), description, horizon (Immediate / Short Term / Long Term).
4. Save. Goal appears in the Goals list with status `active`.
5. Link to the source proposal is optionally noted in the description.

**Screens & UI:**
- **Goals Screen (goal form):**
  - Title input
  - Description textarea
  - Horizon selector: Immediate / Short Term / Long Term
  - Save / Cancel buttons

**Accomplished:** Proposal outcome converted to trackable work item.
**Next Steps:** Add tasks to the goal (Flow 23); assign members; track progress (Flow 24).

---

### 23. Add and Assign Tasks

**Mode:** Both
**Summary:** Leads and above can break goals into discrete tasks with priority levels, assignees, and status tracking.

**Steps:**
1. Navigate to `/tribe/$tribeId/goals`, find the goal.
2. Expand the goal → tap **"+ Add Task"** (requires lead role).
3. Fill in: title (required), description, priority (Critical / High / Normal / Low), assign one or more members.
4. Save. Task appears under the goal with status `todo`.
5. Assigned members receive a notification.
6. Task status can be updated: todo → in_progress → done; or blocked / cancelled.

**Screens & UI:**
- **Goals Screen (task form):**
  - Task title input
  - Description textarea
  - Priority selector: Critical / High / Normal / Low (with icons/colors)
  - Assignee multi-select (member list)
  - Save / Cancel
- **Task cards:**
  - Title, priority badge (color-coded), status badge, assignee name(s)
  - Status update button

**Accomplished:** Work is delegated and tracked; progress visible across the tribe.
**Next Steps:** View progress (Flow 24); update task status as work completes.

---

### 24. View Goals & Track Progress

**Mode:** Both
**Summary:** Goals Screen has three tabs — Goals (all goals with task progress), My Tasks (tasks assigned to me), All Tasks (full task board).

**Steps:**
1. Navigate to `/tribe/$tribeId/goals`.
2. Switch between tabs: **Goals**, **My Tasks**, **All Tasks**.
3. In Goals tab: tap a goal to expand; see task list with statuses and a progress bar.
4. In My Tasks: see only tasks assigned to me; update status inline.
5. In All Tasks: full task board across all goals.

**Screens & UI:**
- **Goals Screen:**
  - Tab bar: Goals / My Tasks / All Tasks
  - Goals sorted: active → paused → completed → cancelled
  - Goal card: title, horizon badge, status badge, progress bar (% tasks done), expand chevron
  - Expanded: task list with priority/status chips and assignee names
  - My Tasks tab: flat list of assigned tasks; status update buttons
  - All Tasks tab: flat list of all tribe tasks

**Accomplished:** Team coordination maintained; progress visible to all members.
**Next Steps:** Close completed goals; create new goals from upcoming proposals.

---

### 25. Create a Schedule Event

**Mode:** Both
**Summary:** Leaders can schedule tribe events — drills, meetings, work parties, patrols — visible to all members on the dashboard calendar.

**Steps:**
1. Navigate to `/tribe/$tribeId/schedule`.
2. **Schedule Screen** shows a calendar or event list.
3. Tap **"+ New Event"** (requires lead role).
4. Fill in: title, date/time, duration, type/category, location (optional), notes.
5. Save. Event appears in "Now & Up Next" on the dashboard.

**Screens & UI:**
- **Schedule Screen:**
  - Event list chronologically, or calendar view (toggle)
  - Event cards with title, date/time, type badge, member count
  - "+ New Event" button (leads+)
  - Event detail: full info + attendees

**Accomplished:** Tribe schedule is set; members see events on dashboard.
**Next Steps:** Assign members to events (Flow 26).

---

### 26. Assign Members to Events

**Mode:** Both
**Summary:** Assign specific members to a scheduled event so attendance is tracked and accountability is clear.

**Steps:**
1. Open the event from Schedule Screen.
2. Tap **"Manage Attendees"** (leads+).
3. Select members from the tribe roster.
4. Save. Members are notified.
5. During the event, a quick muster can be initiated to confirm attendance (Flow 39).

**Screens & UI:**
- **Event Detail:**
  - Attendee list with status indicators
  - "Manage Attendees" button (leads+)
  - Member multi-select panel

**Accomplished:** Event staffing confirmed in advance; attendance accountability established.
**Next Steps:** Run a muster at event start (Flow 39).

---

### 27. PACE Comms Plan Setup

**Mode:** Both
**Summary:** The PACE (Primary, Alternate, Contingency, Emergency) Comms Plan defines how the tribe will communicate as infrastructure degrades. Elders set it up; all members can view it.

**Steps:**
1. Navigate to `/tribe/$tribeId/comms`.
2. **Comms Screen** opens with 4 tabs: PACE, Check-Ins, Rally Points, Code Words.
3. **PACE Tab:** For each level (Primary → Alternate → Contingency → Emergency), tap **"+ Add"** or "Edit":
   - Select method: App, HAM Radio, FRS/GMRS, CB, Phone/SMS, Runner, Signal Mirror, Other
   - Enter details (frequency, channel, callsign)
   - Enter trigger condition (e.g., "When app relay is unreachable")
   - Optional notes
   - Save
   - If HAM Radio is selected, app suggests tribe members with HAM operator skill
4. **Check-Ins Tab:** Create recurring check-in schedules with time, frequency (daily/weekly/etc.), and method.
5. **Rally Points Tab:** Create named rally points with location description and trigger conditions.
6. **Code Words Tab:** Create code word → meaning pairs (e.g., "Eagle" = "All clear").
7. Use **Export** button to copy the full plan as formatted text to clipboard.

**Screens & UI:**
- **Comms Screen:**
  - "← Dashboard" back link
  - "Comms Plan" heading + "Export" button
  - "Read-only — elder council can edit" notice for non-elders
  - Tab bar: PACE / Check-Ins / Rally Points / Code Words
  - PACE tab: 4 color-coded level cards (forest-green, blue, yellow, red)
  - Check-Ins tab: schedule cards + "+ Add Schedule" button
  - Rally Points tab: point cards with trigger description + "+ Add Rally Point" button
  - Code Words tab: code word → meaning pairs + "+ Add Code Word" button

**Accomplished:** Tribe has a complete communications plan available offline; all members know the fallback chain.
**Next Steps:** Reference during Grid Down operations; review and update periodically; share with allied tribes (Flow 50).

---

### 28. View Tribe Schematic & Readiness Report

**Mode:** Both
**Summary:** The Tribe Schematic shows role coverage across all domains and buckets. The Readiness Report gives a 6-dimensional grade (Personnel / Supply / Infrastructure / Comms / Coordination / Cohesion).

**Steps:**
1. Navigate to `/tribe/$tribeId/schematic` (Schematic) or `/tribe/$tribeId/readiness` (Readiness Report).
2. **Schematic:** Shows all skill domains with role slots filled/needed per member count. Critical gaps highlighted.
3. **Readiness Screen:** Shows a radar chart with 6 dimensions. Each dimension card can be expanded to show:
   - Score (0–100)
   - Letter grade (A through F)
   - Contributing factors with percentages
   - Actionable gaps with direct links to the relevant screen
4. Tap a gap link to navigate directly to the area that needs attention.

**Screens & UI:**
- **Tribe Schematic Screen:**
  - Domain-by-domain role coverage table
  - Each role: icon, label, have/needed count, coverage bar
  - Color codes: green = full, yellow = partial, red = critical gap
- **Readiness Screen:**
  - Radar chart (6-axis: Personnel, Supply, Infrastructure, Comms, Coordination, Cohesion)
  - Score label in center
  - 6 dimension cards: icon, label, score bar, letter grade badge
  - Expanded card: contributing factors (formatted as %), gap list with clickable links

**Accomplished:** Leadership has a holistic, actionable view of tribe readiness.
**Next Steps:** Address each gap via linked screens; re-check scores after improvements.

---

### 29. Knowledge Base: Browse Documents

**Mode:** Both
**Summary:** The Knowledge Base is a tribe document repository for SOPs, guides, policies, and reference materials — all stored locally and available offline.

**Steps:**
1. Navigate to `/tribe/$tribeId/kb`.
2. **Knowledge Base Screen** shows a list of documents organized by category.
3. Tap a document to read it.
4. Use search/filter to find documents by title or tag.

**Screens & UI:**
- **Knowledge Base Screen:**
  - Document list with title, category badge, author, date
  - Search input
  - Filter by category
  - Document detail: full text, metadata, version

**Accomplished:** Member can access tribe knowledge independently of internet.
**Next Steps:** Create new documents (Flow 30); share with allied tribes (Flow 50).

---

### 30. Knowledge Base: Create & Approve a Document

**Mode:** Both
**Summary:** Members create draft documents; elders approve and publish them. Maintains quality control over shared knowledge.

**Steps:**
1. From Knowledge Base, tap **"+ New Document"**.
2. Fill in: title, category, body (markdown supported), tags.
3. Save as Draft.
4. Document shows as "Pending Approval" status.
5. An elder or coordinator reviews it and taps **"Approve"**.
6. Document status becomes "Published" and visible to all members.

**Screens & UI:**
- **Knowledge Base (create form):**
  - Title input
  - Category selector
  - Body editor (markdown)
  - Tags input
  - "Save Draft" and "Submit for Approval" buttons
- **Document Detail (approval):**
  - "Approve" button (elders+)
  - "Request Changes" button with notes
  - Status badge: Draft / Pending / Published

**Accomplished:** Tribe knowledge is vetted and permanently stored offline.
**Next Steps:** Share documents in tribe channel or with allied tribes.

---

### 31. Map: View Territory & Asset Pins

**Mode:** Both
**Summary:** The Map screen shows the tribe's geographic territory, pinned assets, and patrol routes overlaid on a map.

**Steps:**
1. Navigate to `/tribe/$tribeId/map`.
2. **Map Screen** renders an interactive map centered on tribe coordinates.
3. Asset pins display icon and label; tap to see details.
4. Patrol routes overlay as colored lines.
5. Territory boundary shown as a polygon (if drawn).

**Screens & UI:**
- **Map Screen:**
  - Interactive map (Leaflet/equivalent)
  - Asset pins with icons
  - Route lines (colored)
  - Territory polygon
  - "Edit Map" button (leads+) → switches to edit mode

**Accomplished:** Visual situational awareness of tribe territory.
**Next Steps:** Edit the map (Flow 32); use routes in bug-out plan (Flow 44).

---

### 32. Map: Draw Territory / Add Pins / Add Patrol Routes

**Mode:** Both
**Summary:** Leads can define the tribe's territory boundary, add pins for important assets (cache sites, water sources, outposts), and draw named patrol routes.

**Steps:**
1. From Map Screen, tap **"Edit Map"** (leads+).
2. **Add Pin:** Tap a map location; fill in name, type, icon, notes; save.
3. **Draw Territory:** Tap polygon mode; tap multiple points to define boundary; close polygon to save.
4. **Add Route:** Tap route mode; tap path points; name the route (used in bug-out planning); save.
5. Tap **"Done"** to exit edit mode.

**Screens & UI:**
- **Map Screen (edit mode):**
  - Pin drop mode button
  - Territory draw mode button
  - Route draw mode button
  - Pin form: name, type, icon, notes
  - Route form: name, color, type
  - "Done" button to exit edit mode

**Accomplished:** Tribe has a documented operational map available fully offline.
**Next Steps:** Reference patrol routes in bug-out plans (Flow 44); use territory data in readiness report.

---

## Section 5: Communication

---

### 33. Send a Message in the Tribe Channel

**Mode:** Both (Grid Down: message queued locally; auto-flushed on reconnect)
**Summary:** The tribe-wide channel is a group chat visible to all members. Supports text and voice messages.

**Steps:**
1. Navigate to `/tribe/$tribeId/channel`.
2. **Tribe Channel Screen** loads message history; auto-scrolls to bottom; marks channel read.
3. Type text in the message input bar; tap send arrow.
4. [Branch A — Grid Up] Message sent via `sendTribeMessage()` immediately and signed with user's keypair.
5. [Branch B — Grid Down, offline stage > 0] Message created locally with a temp ID and queued via `queueMessage()`. Injected into local view immediately. A "pending" indicator shows. Auto-flushed when reconnected.
6. Voice message: tap microphone button; record; tap stop; message sent/queued as base64 audio.

**Screens & UI:**
- **Tribe Channel Screen:**
  - "← Back" link
  - Channel header: tribe name
  - Message list: bubble per message with sender name, timestamp, content
  - Pending message indicators (clock icon or gray styling)
  - Reply thread indicators (for threaded replies)
  - Fixed bottom input bar: text input, microphone button (voice), send button

**Accomplished:** Message delivered to all online tribe members; offline messages buffered.
**Next Steps:** React and reply to messages (Flow 35).

---

### 34. Send a Direct Message

**Mode:** Both
**Summary:** Encrypted one-on-one messages between tribe members. Encryption uses Gun's SEA with recipient's `epub` key.

**Steps:**
1. Navigate to `/tribe/$tribeId/dm/$memberPub`.
2. **Direct Message Screen** loads conversation history with that member.
3. Type text; tap send. Message encrypted with recipient's epub, stored in IDB.
4. Voice messages also supported.

**Screens & UI:**
- **Direct Message Screen:**
  - Recipient name + status in header
  - Message bubbles (self right / other left)
  - Text input + microphone button + send button
  - Offline queue indicators if Grid Down

**Accomplished:** Private encrypted message sent; only recipient can decrypt.
**Next Steps:** Continue conversation; reference in muster or emergency coordination.

---

### 35. React and Reply to a Message

**Mode:** Both
**Summary:** Members can add emoji reactions to messages and thread replies to specific messages in the tribe channel.

**Steps:**
1. In the Tribe Channel, long-press or tap the reaction button on a message.
2. Select an emoji reaction. `addTribeReaction()` writes the reaction to IDB.
3. Reaction counter appears on the message bubble.
4. To reply: tap **Reply** on a message. The input bar shows a "Replying to [sender]" banner.
5. Type reply text; send. Message is linked to the parent via `replyTo` field.
6. Threaded reply appears indented or with a quote preview below the parent message.

**Screens & UI:**
- **Message Bubble:**
  - Reaction chips showing emoji + count
  - React button (smiley face or long-press gesture)
  - "Reply" action
- **Input Bar (reply mode):**
  - "Replying to [Name]" banner above input with ✕ to cancel
  - Text input + send button

**Accomplished:** Richer communication; context preserved in threaded discussions.
**Next Steps:** Continue conversation; use reactions for quick polls.

---

### 36. Training: Log a Session

**Mode:** Both
**Summary:** Members log completed training sessions to track practice hours and maintain skill currency.

**Steps:**
1. Navigate to `/tribe/$tribeId/training`.
2. **Training Screen** shows training log and certifications.
3. Tap **"+ Log Session"**: fill in skill/domain, date, duration, notes, trainer (self or another member).
4. Save. Session appears in the log with duration and date.

**Screens & UI:**
- **Training Screen:**
  - Training log list (session cards)
  - Certification list
  - "+ Log Session" button
  - Session form: skill selector, date, duration, trainer, notes

**Accomplished:** Training history on record; contributes to tribe's skills picture.
**Next Steps:** Record a certification (Flow 37).

---

### 37. Training: Record a Certification

**Mode:** Both
**Summary:** Members can log a formal certification (e.g., EMT, ham license, first aid) that elevates their proficiency level to `verified_expert` for the relevant skill role.

**Steps:**
1. From Training Screen, tap **"+ Add Certification"**.
2. Fill in: certificate name, issuing organization, date, expiration (optional), skill role.
3. Upload or note document reference.
4. Save. Certification appears in list; associated skill role updated to `verified_expert`.

**Screens & UI:**
- **Training Screen (certification form):**
  - Certificate name input
  - Issuing org input
  - Issue date / expiry date
  - Skill role selector
  - Notes input

**Accomplished:** Professional credentials documented; role proficiency level elevated.
**Next Steps:** Level-up approval (Flow 38).

---

### 38. Training: Approve a Level-Up

**Mode:** Both
**Summary:** A designated trainer or elder can approve a member's skill level advancement after witnessing their competency.

**Steps:**
1. From Training Screen, a member with `verified_expert` or trainer authority sees pending level-up requests.
2. Tap a pending request; review evidence (session logs, certifications).
3. Tap **"Approve"** or **"Deny."**
4. On approval: skill proficiency updated in IDB; member notified.

**Screens & UI:**
- **Training Screen (pending approvals):**
  - "Pending Level-Ups" section (trainers/elders only)
  - Request card: member name, skill, proposed level, evidence links
  - "Approve" and "Deny" buttons

**Accomplished:** Skill advancement validated by a second authority; `verified_expert` meaningful.
**Next Steps:** Updated skills feed the Survivability Score and role assignments.

---

## Section 6: Emergency & Accountability

---

### 39. Initiate a Roll Call (Muster)

**Mode:** Both
**Summary:** Leads and above can call a roll call (muster) — a real-time accountability check that requires every member to check in with their status.

**Steps:**
1. From the Tribe Dashboard, tap the **"📣 Muster"** button (visible to all; only leads+ can initiate).
2. **Initiate Muster Modal** opens: select reason (drill / emergency / meeting / other) and optionally add a message.
3. Tap **"Call Muster."**
4. A live muster is created; all online members receive a push notification or in-app alert via `MusterOverlay` (full-screen prompt to respond).
5. Navigates to Roll Call Screen (or Roll Call Screen auto-updates with the active muster).

**Screens & UI:**
- **Dashboard "📣 Muster" button** (leads+ only)
- **Initiate Muster Modal:**
  - Reason selector (icons for each reason type)
  - Optional message textarea
  - "Call Muster" primary button
  - "Cancel" secondary button
- **Muster Overlay** (for non-initiators): full-screen prompt with response form

**Accomplished:** Active muster started; all members alerted; accountability clock started.
**Next Steps:** Members respond to roll call (Flow 40); monitor status board live.

---

### 40. Respond to a Roll Call

**Mode:** Both (response queued if Grid Down)
**Summary:** Members respond to an active muster by declaring their status, location, and any notes.

**Steps:**
1. Receive push notification or see `MusterOverlay` full-screen prompt.
2. Alternatively, navigate to `/tribe/$tribeId/rollcall`.
3. **Roll Call Screen** shows the active muster header with reason + message + "Live" badge.
4. Count row shows current tallies by status (present/away/injured/need help/unknown).
5. "Your Response" section shows response form (if not yet responded):
   - Status selector: Present / Away (Authorized) / Away (Unplanned) / Injured / Need Help
   - Optional location text
   - Optional note
   - Optional voice note
6. Tap Submit.
7. [Branch A — Grid Up] Response saved and synced immediately.
8. [Branch B — Grid Down] Response saved to IDB; queued.
9. Leads can submit a proxy response on behalf of a non-responsive member via the ✏️ button on any member's row.
10. If status is Injured or Need Help, a health status picker appears (Minor / Major / Critical injury).
11. The initiator (or elder_council) can Close Muster when satisfied.

**Screens & UI:**
- **Roll Call Screen (active muster):**
  - Muster header card: Live badge, reason icon + label, message, "called by [name] · Xm ago"
  - Count row: 6 status icons with live counts
  - "Your Response" card: response form or current response with "Update response" link
  - Member Status Board: sorted list (need_help first, unknown last); status icon, name, response time, location, note, voice note player; health badge if injured
  - "Close Muster" button (initiator / elder_council)
  - Proxy response modal (leads+ only)
  - Past Musters accordion at bottom

**Accomplished:** All members accounted for with health and location data; tribe leader has situational awareness.
**Next Steps:** If injured members found, coordinate medical response; close muster when done; record drill results.

---

### 41. Report Infrastructure Status (11-Item Checklist)

**Mode:** Both
**Summary:** During Grid Down operations, a checklist appears on the dashboard allowing leads to report the status of 11 key infrastructure items (power, water, communications, etc.).

**Steps:**
1. Activate Grid Down mode (automatically via offline stage escalation, or via "Declare Grid Down" on dashboard).
2. **Infra Checklist Card** appears on the dashboard.
3. For each of the 11 items (defined in `INFRA_ITEMS` from core), tap to mark status: OK / Degraded / Down.
4. Updates write to IDB and sync when connectivity returns.
5. Status visible to all tribe members.

**Screens & UI:**
- **Infra Checklist Card (dashboard):**
  - "Infrastructure Status" heading
  - 11 item rows: icon, label, status toggle (OK/Degraded/Down)
  - Color codes: green / yellow / red
  - Last updated timestamp

**Accomplished:** Tribe has a real-time infrastructure status board; leadership knows what systems are affected.
**Next Steps:** Activate bug-out plan if multiple systems down (Flow 45).

---

### 42. Send an Emergency Alert

**Mode:** Both (alert queued if Grid Down; sent immediately when Grid Up)
**Summary:** Authorized members broadcast an emergency alert to all tribe members. Triggers a full-screen overlay on all receiving devices.

**Steps:**
1. From dashboard, tap **"⚡ Send Alert"** button.
2. **Send Alert Modal** opens.
3. Fill in: message text, severity level (Info / Warning / Critical).
4. Tap **"Send Alert."**
5. [Grid Up] Alert written to IDB and dispatched via `subscribeToAlerts`. All online members see `AlertOverlay`.
6. [Grid Down] Alert written to IDB locally; queued for sync; locally visible.

**Screens & UI:**
- **Send Alert Modal:**
  - Message textarea
  - Severity selector: Info / Warning / Critical
  - "Send Alert" primary button (danger styling for Critical)
  - "Cancel" button
- **Alert Overlay** (on receiving end): full-screen takeover with alert content

**Accomplished:** All tribe members simultaneously notified of the emergency.
**Next Steps:** Initiate muster for accountability (Flow 39); activate bug-out if needed (Flow 45).

---

### 43. Receive an Emergency Alert (Full-Screen Overlay)

**Mode:** Both
**Summary:** When a tribe alert is broadcast, all member devices show a full-screen `AlertOverlay` that cannot be dismissed until acknowledged.

**Steps:**
1. Alert arrives via Gun subscription (`subscribeToAlerts`).
2. `AlertOverlay` component renders over all other UI.
3. Full-screen display: severity color (red for Critical), message text, sender, timestamp.
4. Member taps **"Acknowledge"** to dismiss the overlay.
5. Acknowledged state is saved locally.

**Screens & UI:**
- **Alert Overlay:**
  - Full-screen background (red for Critical, orange for Warning, blue for Info)
  - Severity badge
  - Alert message
  - Sender name + timestamp
  - "Acknowledge" button

**Accomplished:** Member has been notified and has acknowledged the emergency.
**Next Steps:** Respond to roll call (Flow 40); follow tribe's emergency protocols.

---

### 44. Create a Bug-Out Plan

**Mode:** Both
**Summary:** Elder council members can create named bug-out plans with trigger conditions, vehicle assignments, load priorities, and a linked map route.

**Steps:**
1. Navigate to `/tribe/$tribeId/bugout`.
2. Tap **"+ New Bug-Out Plan"** (elder_council only).
3. Fill in the plan form:
   - Plan name (required)
   - Trigger condition (e.g., "Immediate threat to base")
   - Status: Draft or Ready
   - Route: select from named routes in the Map (Flow 32)
   - Vehicles: add vehicles with label, capacity, driver assignment (member selector)
   - Load Priorities: ordered list of categories with descriptions and assignees
   - Notes
4. Tap **"Save Plan."** Plan status is Draft or Ready (not yet active).
5. Plan appears in the plan list with status badge.

**Screens & UI:**
- **Bug-Out Screen:**
  - "← Dashboard" back link
  - Active plan banner (orange, pulsing) if a plan is currently active
  - "+ New Bug-Out Plan" button (elder_council)
  - **Plan form:** name, trigger textarea, status selector, route selector (from Map routes), vehicles section (add/remove, label/capacity/driver), load priorities section (order number, category, description, assignee), notes textarea, Save / Cancel buttons
  - **Plan list:** plan cards with name, trigger, status badge, route name, vehicle count; Edit / Activate / Deactivate / Delete buttons

**Accomplished:** Pre-planned evacuation scenarios documented; tribe ready to execute quickly.
**Next Steps:** Promote plan to "Ready" status; activate when trigger conditions are met (Flow 45).

---

### 45. Activate a Bug-Out Plan

**Mode:** Both
**Summary:** When trigger conditions are met, an elder activates a "Ready" bug-out plan. All tribe members receive an alert and see the plan banner.

**Steps:**
1. From Bug-Out Screen, find a plan with status "Ready."
2. Tap **"Activate."**
3. **Activate Confirmation Modal** appears: "This will alert all tribe members. Confirm?"
4. Tap **"Activate."**
5. `activateBugOutPlan()` is called: plan status set to `active`, `activatedAt` and `activatedBy` timestamps set.
6. Bug-out alert sent to all members.
7. Orange **"BUG-OUT ACTIVE"** banner appears on the Bug-Out screen and dashboard.
8. Members follow the plan: vehicles, load priorities, route to destination.
9. When the situation is resolved, tap **"Deactivate"** to reset plan status to "Ready."

**Screens & UI:**
- **Activate Confirmation Modal:**
  - Plan name
  - Warning message
  - Orange "Activate" button + "Cancel" button
- **Active Plan Banner (Bug-Out Screen and Dashboard):**
  - Orange pulsing dot + "BUG-OUT ACTIVE: [Plan Name]"
  - Trigger condition text
  - "Deactivate" button (elder_council)

**Accomplished:** Evacuation orders issued; all members alerted to begin bug-out procedures.
**Next Steps:** Execute plan; account for all members via roll call (Flow 39); deactivate once safe.

---

## Section 7: Federation (Grid Up)

Federation features connect allied tribes. They require Grid Up connectivity and elder-level authority.

---

### 46. Generate a Federation Contact Card

**Mode:** Grid Up
**Summary:** The founding member generates a shareable contact card (URL with encrypted public params) that allies can use to connect.

**Steps:**
1. Navigate to `/tribe/$tribeId/federation`.
2. **Federation Screen** shows allied tribes and a contact card generator.
3. Tap **"Generate Contact Card."**
4. App builds a URL with `?tribe=&name=&loc=&pub=&epub=` parameters (tribe's encryption public key).
5. Share via QR code or copy link.
6. Ally receives the URL and connects (Flow 47).

**Screens & UI:**
- **Federation Screen:**
  - Allied tribes list (empty if no alliances yet)
  - "Generate Contact Card" button
  - QR display of contact card URL
  - Copy link button

**Accomplished:** Contact card ready to share; enables encrypted communication with allies.
**Next Steps:** Share with ally; they use it in the Connect flow (Flow 47).

---

### 47. Connect with an Allied Tribe (Connect Screen)

**Mode:** Grid Up
**Summary:** When an allied tribe sends a contact card URL, the receiving tribe opens it, selects which of their tribes to federate from, and saves the federation contact.

**Steps:**
1. Receive the contact card URL from an ally.
2. Open the URL — app routes to `/connect?tribe=&name=&loc=&pub=&epub=`.
3. **Connect Screen** shows the incoming contact card details.
4. Select which of your tribes to connect from (dropdown).
5. App verifies membership and fetches the tribe's own encryption key (`epub`).
6. Tap **"Add Federation Contact."**
7. `addFederationContact()` writes the ally to IDB.
8. Navigates to the Federation Screen.

**Screens & UI:**
- **Connect Screen:**
  - "← Home" link
  - Incoming contact preview: ally tribe name, location
  - "Connect from:" tribe selector dropdown
  - "Add Federation Contact" button
  - Error card if member verification fails or encryption key unavailable

**Accomplished:** Two tribes are now federated; encrypted federation channel accessible.
**Next Steps:** Message in federation channel (Flow 48); create trade proposals (Flow 49).

---

### 48. Message in a Federation Channel

**Mode:** Grid Up
**Summary:** Once federated, tribes can communicate in a shared encrypted channel. Messages are encrypted with the federation keypair.

**Steps:**
1. Navigate to `/tribe/$tribeId/federation/$channelId`.
2. **Federation Channel Screen** loads shared messages.
3. Type a message; send. Encrypted with federation epub.
4. Allied tribe members see the message in their federation channel.

**Screens & UI:**
- **Federation Channel Screen:**
  - Channel header: ally tribe name
  - Message history (bubble format, labeled with sender name + tribe)
  - Text input + send button

**Accomplished:** Cross-tribe communication established.
**Next Steps:** Create trade proposals (Flow 49); share intel (Flow 50).

---

### 49. Create a Trade Proposal

**Mode:** Grid Up
**Summary:** Tribes can propose resource trades with allies — offering supplies in exchange for others.

**Steps:**
1. From Federation Screen, tap "New Trade Proposal" for an allied tribe.
2. Fill in: items offered, items requested, terms, expiration.
3. Send. Ally sees the proposal in their federation view.
4. Ally accepts or counters.

**Screens & UI:**
- **Trade Proposal form:**
  - Items offered (asset + quantity)
  - Items requested (asset + quantity)
  - Terms textarea
  - Expiration date
  - Send button

**Accomplished:** Formal inter-tribal resource exchange initiated.
**Next Steps:** Confirm trade via direct coordination; update inventory post-trade.

---

### 50. Share Intel / PACE Plan with an Ally

**Mode:** Grid Up
**Summary:** Tribe elders can selectively share knowledge base documents or PACE comms plan details with allied tribes over the encrypted federation channel.

**Steps:**
1. From Knowledge Base or Comms Screen, use the "Share with Ally" option on a document/plan.
2. Select the allied tribe to share with.
3. Document/plan text is encrypted and sent via the federation channel.
4. Ally sees the shared content in their federation channel.

**Screens & UI:**
- **Knowledge Base / Comms (share action):**
  - "Share with Ally" button on documents/plans
  - Ally selector
  - Confirmation modal

**Accomplished:** Tactical knowledge shared securely between allied tribes.
**Next Steps:** Coordinate joint operations; align PACE plans for mutual aid.

---

### 51. Manage Tribe Settings (Members, Roles, Remove Member)

**Mode:** Grid Up
**Summary:** The tribe founder and elders can update tribe metadata, manage member roles/authority levels, and remove members.

**Steps:**
1. Navigate to `/tribe/$tribeId/settings`.
2. **Tribe Settings Screen** shows three sections: Tribe Info, Members, Danger Zone.
3. **Update Tribe Info:** edit name, location, region; save.
4. **Manage Members:** view all members with their authority roles; tap a member to edit their role (member / lead / elder_council / coordinator).
5. **Remove Member:** tap "Remove" on a member; confirm. Member's access is revoked.
6. **Danger Zone:** delete tribe (founder only, irreversible).

**Screens & UI:**
- **Tribe Settings Screen:**
  - Tribe Info section: editable fields + Save
  - Members section: member list with role dropdowns (elders+)
  - Remove button per member (founder/elders)
  - Danger Zone: "Delete Tribe" button with confirmation

**Accomplished:** Tribe roster and governance structure maintained.
**Next Steps:** Invite new members; re-run survivability score after role changes.

---

## Section 8: Grid Down Operations

These flows describe what happens when the app detects extended connectivity loss and enters Grid Down mode.

---

### 52. Offline Escalation — Stages 1–5

**Mode:** Grid Down
**Summary:** The app uses a 5-stage escalation system to progressively change behavior as connectivity loss extends. Stages are time-based and stored in `localStorage`.

**Steps:**
1. **Stage 0 (Grid Up):** Convex is connected; normal operation.
2. **Stage 1 (minutes offline):** Orange offline banner appears. Message queue begins. Non-critical features dim. Mesh mode starts automatically in Tauri.
3. **Stage 2 (30+ minutes):** Banner upgrades to amber. Navigation reordering begins. Non-mesh-friendly cards deprioritized.
4. **Stage 3 (2+ hours):** Grid-down dashboard mode activates. Infra checklist card appears. Drill checklist card appears.
5. **Stage 4 (6+ hours):** Offline stage banner becomes prominent red. Bug-Out CTA appears on dashboard. Emergency features surface at top.
6. **Stage 5 (24+ hours / Grid Down Auto-Declared):** Full Grid Down mode. "GRID DOWN" is declared. All features operate in local-only or mesh mode.
7. When connectivity resumes, `clearOfflineSince()` is called, mesh stops, offline banners clear, and queued messages/data flush automatically.

**Screens & UI:**
- **Offline Stage Banner** (persistent at top of most screens):
  - Stage 0: hidden
  - Stage 1: subtle orange bar — "Signal degraded — X hours offline"
  - Stage 2: amber — "Extended outage — mesh active"
  - Stage 3: amber — "Grid down declared"
  - Stage 4: red — "Prolonged grid down"
  - Stage 5: bright red — "GRID DOWN"
- **Dashboard changes by stage:**
  - Stage 3+: Infra Checklist card visible
  - Stage 4+: Bug-Out CTA visible; emergency nav at top
  - Dimmed cards for Grid Up-only features (federation, cloud sync indicators)

**Accomplished:** User understands connectivity state; app adapts to the available infrastructure.
**Next Steps:** Use mesh features (Flows 55–57); follow offline procedures.

---

### 53. Navigate the Grid-Down Dashboard

**Mode:** Grid Down
**Summary:** In Grid Down mode, the dashboard reorganizes to surface emergency-relevant features and dims or hides cloud-dependent ones.

**Steps:**
1. After offline stage escalates to Stage 3+, the dashboard re-renders in Grid Down layout.
2. Grid Down Banner is prominently displayed.
3. Navigation priorities shift: Roll Call, Infra Status, Bug-Out at top.
4. Cloud-sync cards (federation, convex-only notifications) are dimmed or show "Unavailable offline."
5. Drill Checklist Card and Infra Checklist Card become visible.
6. All local features (channel, skills, inventory, comms plan, roll call) remain fully functional.

**Screens & UI:**
- **Grid-Down Dashboard:**
  - Prominent Grid Down Banner
  - Emergency nav: Roll Call, Send Alert, Bug-Out
  - Drill Checklist Card: drill tasks with checkboxes
  - Infra Checklist Card: 11-item status board
  - Bug-Out CTA card (Stage 4+): links to active plan
  - Dimmed cards for Grid Up-only features

**Accomplished:** User has a clear emergency-focused interface with no confusion about what works offline.
**Next Steps:** Run muster drill (Flow 58); check infra (Flow 41); activate bug-out if needed (Flow 45).

---

### 54. Offline Message Queue (Compose Offline, Auto-Flush on Reconnect)

**Mode:** Grid Down
**Summary:** Messages composed while offline are stored in a local queue and automatically sent when connectivity is restored.

**Steps:**
1. In Grid Down mode, user opens Tribe Channel.
2. Types and sends a message.
3. `queueMessage()` stores the message in IDB with a pending status.
4. Message is injected into the local channel view immediately (optimistic UI).
5. A pending indicator (clock icon or gray styling) shows on queued messages.
6. When `offlineStage` returns to 0 (Grid Up), `flushQueue()` is called automatically.
7. All queued messages are sent in order; pending indicators clear.

**Screens & UI:**
- **Tribe Channel Screen (offline mode):**
  - All normal UI visible
  - Queued messages shown with pending indicator
  - No "offline" error — optimistic send
- **On reconnect:**
  - Pending indicators removed as messages send
  - No duplicate messages

**Accomplished:** Seamless communication continuity across grid transitions.
**Next Steps:** Normal channel operations resume on reconnect.

---

### 55. Mesh Network Discovery via mDNS (LAN/Hotspot)

**Mode:** Grid Down (Tauri/native app only)
**Summary:** Phase A mesh: when Grid Down mode activates, the Tauri app automatically starts an embedded Gun relay and advertises via mDNS. Other devices on the same WiFi or hotspot are discovered automatically.

**Steps:**
1. Grid Down triggers `setOfflineSince()` → calls `startMeshMode()`.
2. Tauri invokes `start_mesh_relay` Rust command on port 8766 with `tribeId`.
3. The app listens for `mesh-peer-found` events. When a peer is found, its `ws://[ip]:8766/gun` URL is added to Gun's peer list.
4. Gun data (messages, skills, muster responses) flows over the local LAN.
5. `mesh-peers-changed` event updates `useSyncTier()` → sync tier becomes `mesh`.
6. Sync tier displayed in the Offline Stage Banner or a mesh indicator.
7. When a peer goes offline, `mesh-peer-lost` event removes it from the peer list.

**Screens & UI:**
- **Offline Stage Banner:** may show "Mesh active — N peer(s) connected"
- **Diagnostics Screen:** mesh relay status (if checking diagnostics during outage)
- No user action required — fully automatic

**Accomplished:** Devices on the same LAN or mobile hotspot can sync tribe data without internet.
**Next Steps:** If no LAN available, fall back to WiFi Direct (Flow 56) or BLE (Flow 57).

---

### 56. WiFi Direct Phone-to-Phone Sync (Android P2P)

**Mode:** Grid Down (Android Tauri only)
**Summary:** Phase B mesh: when mDNS peers aren't available, Android devices use WiFi Direct to create a direct P2P connection without any router, hotspot, or internet.

**Steps:**
1. `startMeshMode()` calls `startWifiDirectMode()` (no-op on non-Android).
2. Android WiFi Direct service invokes the Tauri plugin to advertise and scan.
3. When a peer connects, `wifi-direct-state-changed` event fires with `{ connected: true }`.
4. Gun sync flows over the WiFi Direct socket.
5. `isWifiDirectActive()` returns true → `useSyncTier()` returns `mesh`.
6. Data syncs between the two connected phones.
7. When the P2P session ends, `wifi-direct-state-changed` fires with `{ connected: false }`.

**Screens & UI:**
- No explicit user action (automatic in Tauri)
- Sync tier badge may show "WiFi Direct active"
- Diagnostics screen: WiFi Direct status

**Accomplished:** Two Android phones exchanged tribe data without any network infrastructure.
**Next Steps:** If phones are too far for WiFi Direct, use BLE discovery (Flow 57) to establish the connection first.

---

### 57. BLE Peer Discovery and Auto-Connect (Android Background Scan)

**Mode:** Grid Down (Android Tauri only)
**Summary:** Phase C mesh: BLE (Bluetooth Low Energy) background scanning discovers nearby tribe members, then triggers a WiFi Direct connection. Enables awareness of nearby members without an active connection.

**Steps:**
1. `startMeshMode()` calls `startBleDiscovery(tribeId)`.
2. Android BLE service advertises the tribeId and scans for other advertisements.
3. When a device broadcasting the same tribeId is found within Bluetooth range, the app logs the discovery and optionally triggers Phase B (WiFi Direct).
4. BLE discovery continues in the background even when the app is in the background.
5. `isBleDiscoveryActive()` returns true.
6. Once a close peer is confirmed via BLE, WiFi Direct handshake initiates for higher-bandwidth sync.

**Screens & UI:**
- No user action required
- Background-capable on Android
- Diagnostics screen: BLE discovery status
- Optional UI notification: "Tribe member nearby — syncing via WiFi Direct"

**Accomplished:** Passive proximity detection enables opportunistic data exchange with nearby tribe members even without network infrastructure.
**Next Steps:** BLE discovery continuously monitors; sync happens automatically when peers are in range.

---

### 58. Grid-Down Drill Mode (Muster-Triggered Simulation)

**Mode:** Grid Down
**Summary:** Leads can initiate a simulated grid-down drill from the dashboard to practice the tribe's Grid Down response procedures. The Drill Checklist Card guides teams through a standardized drill protocol.

**Steps:**
1. In Grid Down mode (Stage 3+), the **Drill Checklist Card** appears on the dashboard.
2. A lead taps **"Start Drill."**
3. A simulated muster is triggered (reason: Drill).
4. Members respond to the muster as in a real event (Flow 40).
5. The Drill Checklist Card items track drill milestones: muster called, X% responded, infra status reported, comms plan reviewed, bug-out plan reviewed.
6. Each checklist item is checked off as the tribe completes it.
7. Lead closes the drill muster when complete.
8. Drill results recorded in Roll Call history.

**Screens & UI:**
- **Drill Checklist Card (dashboard):**
  - "Grid-Down Drill" heading
  - Checklist items with check/uncheck state
  - "Start Drill" button → triggers muster modal pre-filled with "Drill" reason
- **Roll Call Screen (drill muster):**
  - Same as normal muster (Flow 40) with "Drill" reason displayed

**Accomplished:** Tribe has practiced the full Grid Down response; weaknesses identified before a real event.
**Next Steps:** Review drill results; adjust PACE plan; schedule next drill.

---

## Bonus: Technical/Setup Flows

---

### 59. Diagnostics Screen (System Health Check)

**Mode:** Both
**Summary:** A developer/validation screen that reports on the device's capabilities and current system state. Accessible from the Home Screen for troubleshooting.

**Steps:**
1. From Home Screen, tap **"diagnostics"** link at the bottom.
2. **Diagnostics Screen** runs a series of checks and displays results.
3. Each check shows: label, value, and OK/FAIL status (green/red).
4. DEV-mode only: "Reset All Data" button appears to wipe IDB and reload.

**Screens & UI:**
- **Diagnostics Screen:**
  - "← Home" link
  - Results list:
    - User-Agent (browser/OS)
    - Online (boolean)
    - IndexedDB (available/MISSING)
    - MediaRecorder (available/MISSING)
    - Audio MIME type support (audio/webm, audio/ogg, audio/mp4, etc.)
    - getUserMedia (available/MISSING)
    - WebCrypto (available/MISSING)
    - Message queue stats (queued count, pending IDs)
  - "Reset All Data" button (DEV mode only) — deletes the `plus-ultra` IDB database and reloads

**Accomplished:** User/developer can verify the app's runtime environment is correctly configured.
**Next Steps:** Fix any MISSING capabilities; check platform support for voice messages and QR scanning.

---

### 60. Enable Push Notifications

**Mode:** Grid Up (requires Convex + VAPID setup)
**Summary:** Members opt in to push notifications for tribe alerts, musters, and direct messages. Available on supported browsers and devices.

**Steps:**
1. From the Tribe Dashboard, locate the push notification toggle (visible when `pushSupported()` returns true).
2. Tap **"Enable Push Notifications."**
3. Browser prompts for notification permission.
4. [Branch A — Granted] `subscribeToPush()` is called; VAPID subscription registered.
5. Push enabled indicator shows (bell icon filled).
6. Member now receives push alerts even when the app is in the background.
7. To disable: tap the toggle → `unsubscribeFromPush()` called; subscription removed.
8. [Branch B — Denied] Browser permission was denied; push unavailable; user must enable in browser settings.

**Screens & UI:**
- **Dashboard (push toggle):**
  - Bell icon button + "Enable Push" label
  - Active state: filled bell icon; "Push On" label
  - Platform guard: only visible when `pushSupported()` is true (VAPID configured + browser supports Push API)

**Accomplished:** Member receives out-of-app alerts for musters and emergencies.
**Next Steps:** Receive emergency alerts (Flow 43); respond to musters from notifications.

---

## Appendix: Key Architecture Notes

### Grid State Detection

The app uses three layers to determine connectivity state:

```
Grid Up  = Convex client configured + browser online + no offline-since timestamp
Mesh     = mDNS peer discovered OR WiFi Direct active (isMeshUp() returns true)
Local-Only = neither
```

This state is exposed via `useSyncTier()` and drives banner display, queue behavior, and feature availability.

### Offline Stage Thresholds

Five stages with increasing urgency:

| Stage | Elapsed Time | Behavior |
|-------|-------------|---------|
| 0 | Grid Up | Normal operation |
| 1 | < 30 min | Orange banner; queue active |
| 2 | 30 min+ | Amber banner; mesh phase A starts |
| 3 | 2 hr+ | Grid Down dashboard mode |
| 4 | 6 hr+ | Bug-Out CTA surfaces |
| 5 | 24 hr+ | Full Grid Down declared |

### Mesh Network Phases

| Phase | Technology | Trigger | Scope |
|-------|-----------|---------|-------|
| A | mDNS embedded relay | Auto on offline | Same WiFi/LAN/hotspot |
| B | WiFi Direct (Android) | Auto on offline | ~30–200m, no router |
| C | BLE discovery (Android) | Auto on offline | ~10–50m, triggers B |

### Authority Hierarchy

`restricted` < `member` < `lead` < `elder_council` < `coordinator`

Most governance actions require `lead` or above. Federation, bug-out, and PACE plan management require `elder_council`. Tribe creation sets the founder as `coordinator`.

### Identity Architecture

Identities are Gun/SEA keypairs: `(pub, priv)` for signing + `(epub, epriv)` for encryption. The `pub` key is the permanent member ID used across all tribe records. Loss of the keypair without a backup means permanent loss of tribe access.
