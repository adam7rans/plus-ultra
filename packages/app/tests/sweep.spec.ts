/** TEMPORARY full-route sweep — deleted after review. */
import { test, expect } from '@playwright/test'
import { BASE, waitForApp } from './helpers'

const SHOTS = '/tmp/pu-sweep'

test('sweep all routes', async ({ page }) => {
  test.setTimeout(240_000)
  await waitForApp(page)
  await page.goto(`${BASE}/diagnostics`, { waitUntil: 'load', timeout: 15_000 })
  page.on('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Load Demo Tribe (25 members)' }).click()
  await page.getByText('Pinecrest Demo Tribe').first().waitFor({ timeout: 90_000 })
  const tribeId = page.url().match(/\/tribe\/([^/]+)/)?.[1] ?? ''
  expect(tribeId.length).toBeGreaterThan(0)
  const T = `${BASE}/tribe/${tribeId}`

  // Grab a real member + proposal id for parameterized routes.
  // Grab a real member + proposal id straight from IndexedDB (no UI dependency).
  const ids = await page.evaluate((tid) => {
    return new Promise<{ memberPub: string; propId: string }>((resolve) => {
      const req = indexedDB.open('plus-ultra')
      req.onsuccess = () => {
        const db = req.result
        const out = { memberPub: '', propId: '' }
        try {
          const tx = db.transaction(['members', 'proposals'], 'readonly')
          const mreq = tx.objectStore('members').getAll()
          mreq.onsuccess = () => {
            const all = (mreq.result ?? []) as Array<{ pubkey?: string; tribeId?: string }>
            const hit = all.find((m) => m.tribeId === tid && m.pubkey)
            if (hit?.pubkey) out.memberPub = hit.pubkey
          }
          const preq = tx.objectStore('proposals').getAll()
          preq.onsuccess = () => {
            const all = (preq.result ?? []) as Array<{ id?: string; tribeId?: string }>
            const hit = all.find((p) => p.tribeId === tid && p.id)
            if (hit?.id) out.propId = hit.id
          }
          tx.oncomplete = () => resolve(out)
          tx.onerror = () => resolve(out)
        } catch {
          resolve(out)
        }
      }
      req.onerror = () => resolve({ memberPub: '', propId: '' })
    })
  }, tribeId)
  const memberPub = ids.memberPub
  const propId = ids.propId

  const routes: Array<[string, string]> = [
    ['home', `${BASE}/`],
    ['identity', `${BASE}/identity`],
    ['create-tribe', `${BASE}/create-tribe`],
    ['join', `${BASE}/join`],
    ['connect', `${BASE}/connect`],
    ['diagnostics', `${BASE}/diagnostics`],
    ['dashboard', T],
    ['skills', `${T}/skills`],
    ['channel', `${T}/channel`],
    ['schematic', `${T}/schematic`],
    ['station', `${T}/station`],
    ['people', `${T}/people`],
    ['schedule', `${T}/schedule`],
    ['onboarding', `${T}/onboarding`],
    ['inventory', `${T}/inventory`],
    ['settings', `${T}/settings`],
    ['proposals', `${T}/proposals`],
    ['proposals-new', `${T}/proposals/new`],
    ['map', `${T}/map`],
    ['training', `${T}/training`],
    ['federation', `${T}/federation`],
    ['psych', `${T}/psych`],
    ['psych-assessment', `${T}/psych/assessment`],
    ['rollcall', `${T}/rollcall`],
    ['production', `${T}/production`],
    ['contacts', `${T}/contacts`],
    ['comms', `${T}/comms`],
    ['goals', `${T}/goals`],
    ['bugout', `${T}/bugout`],
    ['kb', `${T}/kb`],
    ['finance', `${T}/finance`],
    ['readiness', `${T}/readiness`],
    ['more', `${T}/more`],
  ]
  if (memberPub) routes.push(['member', `${T}/member/${memberPub}`])
  if (propId) routes.push(['proposal-detail', `${T}/proposals/${propId}`]);

  for (const [name, url] of routes) {
    await page.goto(url, { waitUntil: 'load', timeout: 20_000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${SHOTS}-${name}.png` })
  }

  // DOM emoji scan per page (raw signal — content emoji expected in chats).
  const hits: Record<string, string[]> = {}
  for (const [name, url] of routes) {
    await page.goto(url, { waitUntil: 'load', timeout: 20_000 })
    await page.waitForTimeout(600)
    const found = await page.evaluate(() => {
      const text = document.body.innerText ?? ''
      const m = text.match(/[\u{1F300}-\u{1FAFF}\u2600-\u{27BF}\u2B00-\u{2BFF}\uFE0F]/gu)
      return [...new Set(m ?? [])].join('');
    })
    if (found) hits[name] = [...found]
  }
  console.log('EMOJI-HITS ' + JSON.stringify(hits));
})
