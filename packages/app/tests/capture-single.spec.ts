/**
 * Smoke test: capture flow 01 (first launch / home screen).
 * No seeding needed — just verify the screenshot pipeline works.
 */
import { test } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(__dirname, '../../../docs/userflows-screens')

test('flow 01 — first launch home screen', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load', timeout: 15_000 })
  await page.waitForTimeout(2000)

  const dir = path.join(OUT, '01-first-launch-and-identity-creation')
  fs.mkdirSync(dir, { recursive: true })
  await page.screenshot({ path: path.join(dir, 'step-01.png') })
  console.log('  ✓  01-first-launch-and-identity-creation/step-01.png')

  // Verify create-tribe route also works (was 404ing due to wrong port)
  await page.goto('/create-tribe', { waitUntil: 'load', timeout: 15_000 })
  await page.waitForTimeout(1000)
  const dir2 = path.join(OUT, '04-create-a-tribe')
  fs.mkdirSync(dir2, { recursive: true })
  await page.screenshot({ path: path.join(dir2, 'step-01.png') })
  console.log('  ✓  04-create-a-tribe/step-01.png')
})
