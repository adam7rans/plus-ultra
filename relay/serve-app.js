#!/usr/bin/env node
'use strict'

/**
 * Plus Ultra — Local App Server
 *
 * Serves the PWA dist/ folder over HTTP on the local network so tribe members
 * can install the app via a local WiFi hotspot — no internet required.
 *
 * Usage:
 *   node relay/serve-app.js [port]        (default port: 8080)
 *   node relay/serve-app.js 9090
 *
 * Run alongside the Gun relay:
 *   node relay/relay.js &
 *   node relay/serve-app.js
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.argv[2] || '8080', 10)
const DIST_DIR = path.resolve(__dirname, '../packages/app/dist')

// Tauri android build outputs the APK here
const APK_CANDIDATES = [
  path.resolve(__dirname, '../packages/app/src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk'),
  path.resolve(__dirname, '../packages/app/src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release-unsigned.apk'),
  path.resolve(__dirname, '../packages/app/src-tauri/gen/android/app/build/outputs/apk/debug/app-debug.apk'),
]
const APK_PATH = APK_CANDIDATES.find(p => fs.existsSync(p)) || null

// ── MIME types ────────────────────────────────────────────────────────────────

const MIME = {
  '.html':        'text/html; charset=utf-8',
  '.js':          'application/javascript; charset=utf-8',
  '.css':         'text/css; charset=utf-8',
  '.json':        'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png':         'image/png',
  '.svg':         'image/svg+xml',
  '.ico':         'image/x-icon',
  '.woff2':       'font/woff2',
  '.webp':        'image/webp',
  '.mp3':         'audio/mpeg',
  '.mp4':         'video/mp4',
  '.apk':         'application/vnd.android.package-archive',
  '.txt':         'text/plain; charset=utf-8',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLocalIPs() {
  const ifaces = os.networkInterfaces()
  const ips = []
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address })
      }
    }
  }
  return ips
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase()
  const mime = MIME[ext] || 'application/octet-stream'

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    // Don't cache HTML (SW needs fresh index.html); cache everything else aggressively
    const cacheControl = (ext === '.html' || ext === '.webmanifest')
      ? 'no-cache'
      : 'public, max-age=31536000, immutable'

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': cacheControl,
    })
    fs.createReadStream(filePath).pipe(res)
  })
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' })
    res.end('Method Not Allowed')
    return
  }

  const rawPath = req.url.split('?')[0]

  // Serve APK download
  if (rawPath === '/app.apk') {
    if (!APK_PATH) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('APK not built yet. Run: npm run build:android')
      return
    }
    res.setHeader('Content-Disposition', 'attachment; filename="plus-ultra.apk"')
    serveFile(APK_PATH, res)
    return
  }

  // Resolve to a file inside dist/
  const resolved = path.normalize(path.join(DIST_DIR, rawPath))

  // Path traversal guard
  if (!resolved.startsWith(DIST_DIR + path.sep) && resolved !== DIST_DIR) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden')
    return
  }

  // Serve file if it exists, otherwise SPA fallback to index.html
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    serveFile(resolved, res)
  } else {
    serveFile(path.join(DIST_DIR, 'index.html'), res)
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DIST_DIR)) {
  console.error('\n  ERROR: dist/ not found at ' + DIST_DIR)
  console.error('  Run `npm run build` from the repo root first.\n')
  process.exit(1)
}

// Try to load qrcode-terminal (optional dep — install if you want QR codes)
let qrcodeTerminal = null
try {
  qrcodeTerminal = require('qrcode-terminal')
} catch { /* fall back to plain URL */ }

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs()
  const primary = ips[0]?.address || '127.0.0.1'
  const url = `http://${primary}:${PORT}`

  const hr = '─'.repeat(52)
  console.log(`\n  ┌${hr}┐`)
  console.log(`  │  Plus Ultra — Local App Server${' '.repeat(20)}│`)
  console.log(`  └${hr}┘`)

  console.log('\n  WiFi hotspot suggestion:')
  console.log('  ┌──────────────────────┐')
  console.log('  │  SSID:  TRIBE-MESH   │')
  console.log('  │  Pass:  (no pass)    │')
  console.log('  └──────────────────────┘')
  console.log('  Create this hotspot, then share the URL below.')

  console.log('\n  App URL(s):')
  if (ips.length === 0) {
    console.log(`    http://localhost:${PORT}`)
  } else {
    for (const { name, address } of ips) {
      console.log(`    http://${address}:${PORT}  [${name}]`)
    }
  }
  if (APK_PATH) {
    console.log(`    http://${primary}:${PORT}/app.apk  [Android APK download]`)
  }

  console.log('\n  Scan to open on phone:')
  if (qrcodeTerminal) {
    qrcodeTerminal.generate(url, { small: true }, (qr) => {
      qr.split('\n').forEach(line => console.log('  ' + line))
    })
  } else {
    console.log(`    ${url}`)
    console.log('  (for QR code: cd relay && npm install)')
  }

  console.log('\n  Steps for new members:')
  console.log('  1. Connect to the "TRIBE-MESH" hotspot')
  console.log('  2. Open the URL above in Safari / Chrome')
  console.log('  3. Tap the share button → "Add to Home Screen"')
  console.log('  4. The app caches offline on first load')
  if (APK_PATH) {
    console.log('  5. Android: download /app.apk for native install')
  }
  console.log('\n  Also run the Gun relay for P2P sync:')
  console.log('    node relay/relay.js')
  console.log('\n  Press Ctrl+C to stop.\n')
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ERROR: Port ${PORT} is already in use.`)
    console.error(`  Try: node relay/serve-app.js ${PORT + 1}\n`)
  } else {
    console.error('\n  Server error:', err.message, '\n')
  }
  process.exit(1)
})
