const Gun = require('gun')
const http = require('http')
const webpush = require('web-push')
const fs = require('fs')
const path = require('path')

// ── Load env ──────────────────────────────────────────────────────────
// Simple .env loader (no dotenv dependency)
try {
  const envPath = path.join(__dirname, '.env')
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length > 0) process.env[key.trim()] = rest.join('=').trim()
  }
} catch { /* no .env file — use process.env directly */ }

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@plusultra.network'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  console.log('[push] VAPID configured — push notifications enabled')
} else {
  console.warn('[push] No VAPID keys found — push notifications disabled')
}

// ── Push subscription store (in-memory + file persistence) ──────────
const SUBS_FILE = path.join(__dirname, 'push-subscriptions.json')
let subscriptions = new Map() // key: `${tribeId}:${memberPub}`, value: PushSubscription

try {
  const data = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'))
  for (const [k, v] of Object.entries(data)) subscriptions.set(k, v)
  console.log(`[push] Loaded ${subscriptions.size} push subscriptions`)
} catch { /* no file yet */ }

function persistSubs() {
  const obj = Object.fromEntries(subscriptions)
  fs.writeFileSync(SUBS_FILE, JSON.stringify(obj, null, 2))
}

// ── HTTP server with CORS + JSON body parsing ───────────────────────
const server = http.createServer((req, res) => {
  // CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // GET /push/vapid-public-key — client fetches this to subscribe
  if (req.method === 'GET' && req.url === '/push/vapid-public-key') {
    if (!VAPID_PUBLIC_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Push not configured' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ publicKey: VAPID_PUBLIC_KEY }))
    return
  }

  // POST /push/subscribe — register a push subscription
  if (req.method === 'POST' && req.url === '/push/subscribe') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      try {
        const { tribeId, memberPub, subscription } = JSON.parse(body)
        if (!tribeId || !memberPub || !subscription) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing tribeId, memberPub, or subscription' }))
          return
        }
        subscriptions.set(`${tribeId}:${memberPub}`, subscription)
        persistSubs()
        console.log(`[push] Subscription registered: ${memberPub.slice(0, 8)}… in tribe ${tribeId.slice(0, 8)}…`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // DELETE /push/subscribe — unregister
  if (req.method === 'DELETE' && req.url === '/push/subscribe') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      try {
        const { tribeId, memberPub } = JSON.parse(body)
        subscriptions.delete(`${tribeId}:${memberPub}`)
        persistSubs()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // POST /push/send — send a push to specific member(s) or entire tribe
  if (req.method === 'POST' && req.url === '/push/send') {
    if (!VAPID_PUBLIC_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Push not configured' }))
      return
    }
    let body = ''
    req.on('data', c => body += c)
    req.on('end', async () => {
      try {
        const { tribeId, targetPub, title, body: msgBody, icon, data } = JSON.parse(body)
        if (!tribeId || !title) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing tribeId or title' }))
          return
        }

        const payload = JSON.stringify({ title, body: msgBody || '', icon: icon || '/pwa-192x192.png', data: data || {} })
        let sent = 0
        let failed = 0

        for (const [key, sub] of subscriptions) {
          if (!key.startsWith(`${tribeId}:`)) continue
          // If targetPub is set and not '*', only send to that member
          if (targetPub && targetPub !== '*' && key !== `${tribeId}:${targetPub}`) continue

          try {
            await webpush.sendNotification(sub, payload)
            sent++
          } catch (err) {
            failed++
            // Remove expired/invalid subscriptions
            if (err.statusCode === 410 || err.statusCode === 404) {
              subscriptions.delete(key)
              console.log(`[push] Removed stale subscription: ${key}`)
            }
          }
        }

        if (failed > 0) persistSubs()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ sent, failed }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // Everything else — let Gun handle it (WebSocket upgrade + GETs)
})

// ── Gun relay ─────────────────────────────────────────────────────────
Gun({ web: server })
server.listen(8765, () => console.log('Gun relay + push server running on http://localhost:8765'))
