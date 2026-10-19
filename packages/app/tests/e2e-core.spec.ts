/**
 * Plus Ultra — Core E2E flows (TESTING.md Phase 3).
 *
 * Runs against the local dev server (`npx vite --port 5174` in packages/app,
 * or override with BASE_URL env). Each test gets a fresh browser profile, so
 * IndexedDB starts empty and identity generation runs from scratch, exactly
 * like a first install.
 *
 * NOTE on waits: Gun.js holds sockets open, so never use `networkidle`.
 * Identity key generation (Gun SEA) can take a few seconds on first boot.
 *
 * Run: npx playwright test tests/e2e-core.spec.ts --project=chrome-mobile
 */

import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:5174'

async function waitForApp(page: Page) {
  // Home renders only after identity init settles (or its error screen).
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 15_000 })
  await expect(page.getByText('PLUS ULTRA')).toBeVisible({ timeout: 30_000 })
}

/**
 * Create a tribe via the form, walk the 5-step onboarding wizard, and land
 * on the tribe dashboard. Founding redirects to onboarding, not the dashboard.
 */
async function foundTribeAndOnboard(page: Page, name: string) {
  await waitForApp(page)
  await page.getByRole('button', { name: '+ Create New Tribe' }).click()
  await expect(page.getByText('Create a Tribe')).toBeVisible()
  await page.getByPlaceholder('e.g. Austin North Tribe').fill(name)
  await page.getByPlaceholder('City or neighborhood (no exact addresses)').fill('Testville')
  await page.getByPlaceholder('e.g. Texas, California, Scotland').fill('Testland')
  await page.getByRole('button', { name: 'Found This Tribe' }).click()

  // Step 1 — profile
  await expect(page.getByText('Welcome to the Tribe')).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder('Your name').fill('E2E Tester')
  await page.getByRole('button', { name: 'Adult' }).click()
  await page.getByRole('button', { name: 'Next →' }).click()

  // Step 2 — domains (single domain keeps the skills step to one page)
  await expect(page.getByText('What can you contribute?')).toBeVisible()
  await page.getByRole('button', { name: /Medical/ }).click()
  await page.getByRole('button', { name: 'Next →' }).click()

  // Step 3 — skills (skippable)
  await page.getByRole('button', { name: 'Next →' }).click()

  // Step 4 — availability
  await page.getByRole('button', { name: 'Full-time' }).click()
  await page.getByRole('button', { name: 'Next →' }).click()

  // Step 5 — review → dashboard
  await page.getByRole('button', { name: 'Join Tribe' }).click()
  await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 })
}

test.describe('core flows', () => {
  test('onboarding: identity auto-generates and home renders', async ({ page }) => {
    await waitForApp(page)
    await expect(page.getByText('Tribal Operating System')).toBeVisible()
    await expect(page.getByRole('button', { name: '+ Create New Tribe' })).toBeVisible()
    // Identity badge shows an 8-char key id, not the empty placeholder.
    await expect(page.getByText('—')).toHaveCount(0)
  })

  test('create tribe: form validates and dashboard opens', async ({ page }) => {
    await waitForApp(page)
    await page.getByRole('button', { name: '+ Create New Tribe' }).click()
    await expect(page.getByText('Create a Tribe')).toBeVisible()

    // Submit is disabled until required fields are filled.
    await expect(page.getByRole('button', { name: 'Found This Tribe' })).toBeDisabled()
    await page.getByPlaceholder('e.g. Austin North Tribe').fill('E2E Test Tribe')
    await page.getByPlaceholder('City or neighborhood (no exact addresses)').fill('Testville')
    await page.getByPlaceholder('e.g. Texas, California, Scotland').fill('Testland')

    const foundBtn = page.getByRole('button', { name: 'Found This Tribe' })
    await expect(foundBtn).toBeEnabled()
    await foundBtn.click()

    // Founding lands on the onboarding wizard; walk it to the dashboard.
    await expect(page.getByText('Welcome to the Tribe')).toBeVisible({ timeout: 15_000 })
    await page.getByPlaceholder('Your name').fill('E2E Tester')
    await page.getByRole('button', { name: 'Adult' }).click()
    await page.getByPlaceholder('A few words about yourself...').fill('E2E bio here')
    await page.getByRole('button', { name: 'Next →' }).click()
    await expect(page.getByText('What can you contribute?')).toBeVisible()
    await page.getByRole('button', { name: /Medical/ }).click()
    await page.getByRole('button', { name: 'Next →' }).click()
    // Pick a role + sub-specialty + experience so the review has details.
    await page.getByText('Physician (MD/DO)').click()
    await page.getByRole('button', { name: 'Surgery', exact: true }).click()
    await page.getByRole('button', { name: '3–7 years', exact: true }).click()
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Full-time' }).click()
    await page.getByPlaceholder('e.g. bad knee, limited vision...').fill('E2E bad knee')
    await page.getByPlaceholder('Allergies, special needs, dependents...').fill('E2E notes here')
    await page.getByRole('button', { name: 'Next →' }).click()
    // Review shows everything entered — profile, skill detail, availability,
    // limitations, and notes.
    await expect(page.getByText('Review & Confirm')).toBeVisible()
    await expect(page.getByText('E2E bio here')).toBeVisible()
    await expect(page.getByText('Physician (MD/DO)')).toBeVisible()
    await expect(page.getByText(/Surgery.*3–7 years/)).toBeVisible()
    await expect(page.getByText('E2E bad knee')).toBeVisible()
    await expect(page.getByText('E2E notes here')).toBeVisible()
    await page.getByRole('button', { name: 'Join Tribe' }).click()
    await expect(page.getByText('E2E Test Tribe')).toBeVisible({ timeout: 15_000 })
  })

  test('tribe channel: send a text message and see it', async ({ page }) => {
    await foundTribeAndOnboard(page, 'Channel Tribe')

    await page.getByText('Tribe Channel').click()
    const input = page.getByPlaceholder('Message tribe...')
    await expect(input).toBeVisible({ timeout: 15_000 })
    await input.fill('hello from e2e')
    await page.getByRole('button', { name: 'Send', exact: true }).click()
    // Gun write + subscription round-trip; generous on loaded machines.
    await expect(page.getByText('hello from e2e')).toBeVisible({ timeout: 30_000 })
  })

  test('invite: generate link and copy it', async ({ page }) => {
    await foundTribeAndOnboard(page, 'Invite Tribe')

    await page.getByRole('button', { name: 'Generate Invite Link' }).click()
    // Invite URL + action buttons appear once the link exists.
    await expect(page.getByRole('button', { name: 'Copy Link' })).toBeVisible({
      timeout: 15_000,
    })
  })
})
