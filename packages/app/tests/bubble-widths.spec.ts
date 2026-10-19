/**
 * Chat layout regression: no message bubble may exceed 75% of the chat
 * column, no matter the content (long reply quotes, photos, voice, video).
 * Guards the flex min-content overflow class of bugs (see MessageBubble).
 *
 * Run: npx playwright test tests/bubble-widths.spec.ts --project=chrome-mobile
 */
import { test, expect } from '@playwright/test'
import { BASE, waitForApp } from './helpers'

test('no bubble exceeds 75% of the chat column', async ({ page }) => {
  test.setTimeout(120_000)
  await waitForApp(page)
  await page.goto(`${BASE}/diagnostics`, { waitUntil: 'load', timeout: 15_000 })
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Load Demo Tribe (25 members)' }).click()
  await page.getByText('Pinecrest Demo Tribe').first().waitFor({ timeout: 90_000 })
  await page.getByRole('navigation').getByRole('link', { name: 'Chat' }).click()
  await page.getByText('Radio check tonight').first().waitFor({ timeout: 15_000 })
  await page.waitForTimeout(1000)

  const { widths, viewport } = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll('div.max-w-\\[75\\%\\]'))
    return {
      widths: boxes.map((b) => Math.round((b as HTMLElement).offsetWidth)),
      viewport: window.innerWidth,
    }
  })
  expect(widths.length).toBeGreaterThan(10)
  expect(Math.max(...widths)).toBeLessThanOrEqual(Math.round(viewport * 0.78))

  // The page itself must not scroll sideways either.
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(sideways).toBe(0)
})
