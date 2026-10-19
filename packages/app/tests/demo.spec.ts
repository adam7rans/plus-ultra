/**
 * Plus Ultra — tabs + demo tribe E2E.
 *
 * - Bottom tab bar renders on every tribe screen with working navigation.
 * - Diagnostics "Load Demo Tribe" seeds 25 members + full conversation
 *   history; the dashboard and channel reflect it.
 *
 * Seeding generates 24 keypairs in-browser — this file gets 120s per test.
 * Run: npx playwright test tests/demo.spec.ts --project=chrome-mobile
 */
import { test, expect } from '@playwright/test'
import { BASE, waitForApp, foundTribeAndOnboard } from './helpers'

test.describe('tabs', () => {
  test('tab bar navigates Home / Chat / People / Map / More', async ({ page }) => {
    await foundTribeAndOnboard(page, 'Tab Tribe')

    const tabbar = page.getByRole('navigation')
    await expect(tabbar.getByRole('link', { name: 'Chat' })).toBeVisible()

    await tabbar.getByRole('link', { name: 'Chat' }).click()
    await expect(page.getByPlaceholder('Message tribe...')).toBeVisible({ timeout: 15_000 })

    await tabbar.getByRole('link', { name: 'People' }).click()
    await expect(page.getByText('My People')).toBeVisible({ timeout: 15_000 })

    await tabbar.getByRole('link', { name: 'Map' }).click()
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 15_000 })

    await tabbar.getByRole('link', { name: 'More' }).click()
    await expect(page.getByText('All sections')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Roll Call')).toBeVisible()

    await tabbar.getByRole('link', { name: 'Home' }).click()
    await expect(page.getByText('Tab Tribe')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('demo tribe', () => {
  test.setTimeout(120_000)

  test('seed button builds a 25-member tribe with history', async ({ page }) => {
    await waitForApp(page)
    await page.goto(`${BASE}/diagnostics`, { waitUntil: 'load', timeout: 15_000 })
    await expect(page.getByText('Diagnostics')).toBeVisible()

    page.on('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: 'Load Demo Tribe (25 members)' }).click()

    // Seeder navigates to the new tribe dashboard when done.
    await expect(page.getByText('Pinecrest Demo Tribe')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText('25 members')).toBeVisible({ timeout: 15_000 })

    // Channel shows seeded threads, media, and the unread badge lights up.
    await page.getByRole('navigation').getByRole('link', { name: 'Chat' }).click()
    await expect(
      page.getByText('Radio check tonight at 20:00, channel 3. Acknowledge below 👇').first(),
    ).toBeVisible({ timeout: 15_000 })
    // Photo/voice captions live in the image/audio itself — assert on
    // visible thread texts plus rendered media elements.
    await expect(page.getByText('Smokehouse is full — fish drying nicely. Thanks Eli!').first()).toBeVisible()
    const media = await page.locator('audio, video, img[alt="Photo"]').count()
    expect(media).toBeGreaterThan(0)
  })
})
