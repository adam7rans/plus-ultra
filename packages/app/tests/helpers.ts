/**
 * Shared E2E helpers (not a spec — `*.spec.ts` only are collected).
 */
import { expect, type Page } from '@playwright/test'

export const BASE = process.env.BASE_URL ?? 'http://localhost:5174'

export async function waitForApp(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 15_000 })
  await expect(page.getByText('PLUS ULTRA')).toBeVisible({ timeout: 30_000 })
}

/** Create a tribe via the form and walk the 5-step onboarding wizard. */
export async function foundTribeAndOnboard(page: Page, name: string) {
  await waitForApp(page)
  await page.getByRole('button', { name: '+ Create New Tribe' }).click()
  await page.getByPlaceholder('e.g. Austin North Tribe').fill(name)
  await page.getByPlaceholder('City or neighborhood (no exact addresses)').fill('Testville')
  await page.getByPlaceholder('e.g. Texas, California, Scotland').fill('Testland')
  await page.getByRole('button', { name: 'Found This Tribe' }).click()
  await expect(page.getByText('Welcome to the Tribe')).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder('Your name').fill('E2E Tester')
  await page.getByRole('button', { name: 'Adult' }).click()
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('button', { name: /Medical/ }).click()
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('button', { name: 'Full-time' }).click()
  await page.getByRole('button', { name: 'Next →' }).click()
  await page.getByRole('button', { name: 'Join Tribe' }).click()
  await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 })
}
