/** TEMPORARY skills visual — deleted after review. */
import { test, expect } from '@playwright/test'
import { BASE, waitForApp } from './helpers'

test('skills shot', async ({ page }) => {
  test.setTimeout(120_000)
  await waitForApp(page)
  await page.goto(`${BASE}/diagnostics`, { waitUntil: 'load', timeout: 15_000 })
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Load Demo Tribe (25 members)' }).click()
  await page.getByText('Pinecrest Demo Tribe').first().waitFor({ timeout: 90_000 })
  const tribeId = page.url().match(/\/tribe\/([^/]+)/)?.[1] ?? ''
  await page.goto(`${BASE}/tribe/${tribeId}/skills`, { waitUntil: 'load' })
  await page.getByText('Medical').first().waitFor({ timeout: 20_000 })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '/tmp/pu-skills.png' })
})
