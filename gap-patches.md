# Plus Ultra — Reliability Gap Patches

Five confirmed gaps identified after Phase 14. Each section explains what the bug is,
why it happens (with exact code references), and a phased implementation plan to fix it.

---

## Gap 1 — Tribe chat messages are invisible when sent offline

### Status

Open — not yet implemented.

### What happens

When you send a message to the tribe channel while offline, the message silently
disappears. You type it, hit send, nothing appears. No ⏱ icon, no "queued" state —
just a blank. It will eventually arrive for other members after reconnection, but you
have no confirmation it's coming.

DMs don't have this problem — DMs show up on screen immediately with the ⏱ icon even
when offline.

### Why it happens

`TribeChannelScreen.tsx` and `DirectMessageScreen.tsx` handle the offline path differently.

**DirectMessageScreen** (works correctly):
```ts
// packages/app/src/screens/DirectMessageScreen.tsx ~line 77
} else {
  const msg = await prepareDM(...)
  await queueMessage(msg)
  sentPlaintexts.current.set(msg.id, text)
  inject(msg)   // <-- adds to visible list immediately
  setDecrypted(prev => new Map(prev).set(msg.id, text))
}
```

**TribeChannelScreen** (broken):
```ts
// packages/app/src/screens/TribeChannelScreen.tsx ~line 50
} else {
  await queueMessage({
    id: nanoid(), tribeId, channelId: 'tribe-wide',
    senderId: identity.pub, type: 'text', content: text,
    sentAt: Date.now(), sig: '',
    ...(replyingTo ? { replyTo: replyingTo.id } : {}),
  })
  // inject() is never called — message is invisible
}
```

`inject()` comes from `useDMChannel` in `useChannel.ts`. The tribe channel hook
(`useTribeChannel`) also returns `inject` but TribeChannelScreen doesn't destructure it.

Because the tribe channel message is never injected into local state, and `usePendingMessageIds`
only works on messages that are visible in the list, the ⏱ indicator we built in Phase 14 also
never appears for tribe messages. Two bugs, one root cause.

### Fix plan

**Phase 1 — Wire inject() in TribeChannelScreen**

Files: `packages/app/src/screens/TribeChannelScreen.tsx`

1. Destructure `inject` from `useTribeChannel`:
   ```ts
   const { messages, loading, inject } = useTribeChannel(tribeId)
   ```
2. In `handleSendText`, after `queueMessage()`, call `inject(msg)`:
   ```ts
   const msg: Message = {
     id: nanoid(), tribeId, channelId: 'tribe-wide',
     senderId: identity.pub, type: 'text', content: text,
     sentAt: Date.now(), sig: '',
     ...(replyingTo ? { replyTo: replyingTo.id } : {}),
   }
   await queueMessage(msg)
   inject(msg)
   ```
3. Repeat for `handleSendVoice` and `handleSendPhoto`.

**Phase 2 — Verify inject() is exported by useTribeChannel**

File: `packages/app/src/hooks/useChannel.ts`

Confirm `useTribeChannel` returns `inject` (it should — both hooks share the same internal
`inject` function). If it doesn't, add it to the return object.

**Phase 3 — Verify ⏱ now appears**

After Phase 1+2: kill relay → send tribe message → confirm message appears immediately
with ⏱ icon → restart relay → confirm ⏱ disappears within 60s.

---

## Gap 2 — Flush on reconnect can silently lose data

### Status

Open — not yet implemented.

### What happens

When the relay comes back online, the app sends all your queued writes and then
immediately marks them as done — before getting any confirmation that they actually
arrived. If the relay dies again in that same instant (or the WebSocket was already
stalled when the flush ran), those writes are gone forever. The ⏱ icon disappears
even though the data never synced.

### Why it happens

`flushPendingSyncs()` in `sync-queue.ts` deletes the IDB entry immediately after
calling `.put()` on Gun, with no ACK:

```ts
// packages/app/src/lib/sync-queue.ts
export async function flushPendingSyncs(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('pending-syncs') as PendingSync[]
  for (const entry of all) {
    gun.get('tribes').get(entry.tribeId).get(entry.gunStore).get(entry.recordKey)
      .put(entry.payload as unknown as Record<string, unknown>)
    await db.delete('pending-syncs', entry.id)  // deleted before any confirmation
  }
}
```

By contrast, `flushQueue()` for messages has retry logic — it tracks `attempts` and
retries up to `MAX_QUEUE_ATTEMPTS` times. `flushPendingSyncs` has zero retry logic.

Gun's `.put()` does support an ACK callback: `.put(payload, (ack) => { ... })`.
`ack.err` is set if the write failed. We can use this to decide whether to keep or
delete the IDB entry.

### Fix plan

**Phase 1 — Add ACK-gated delete to flushPendingSyncs**

File: `packages/app/src/lib/sync-queue.ts`

Replace the optimistic delete with a Promise-wrapped Gun ACK callback. Only delete
the IDB entry if the ACK arrives without error within a timeout:

```ts
export async function flushPendingSyncs(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll('pending-syncs') as PendingSync[]
  for (const entry of all) {
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => resolve(), 8000)  // give up after 8s, leave in IDB
      gun.get('tribes').get(entry.tribeId).get(entry.gunStore).get(entry.recordKey)
        .put(entry.payload as unknown as Record<string, unknown>, async (ack: { err?: string }) => {
          clearTimeout(timer)
          if (!ack.err) {
            await db.delete('pending-syncs', entry.id)
          }
          resolve()
        })
    })
  }
}
```

If the ACK never arrives (relay dropped mid-flush), the entry stays in IDB and
the ⏱ icon remains until the next successful flush. If it succeeds, the entry is
deleted and the ⏱ disappears.

**Phase 2 — Add attempts tracking to PendingSync**

File: `packages/app/src/lib/sync-queue.ts` + `packages/app/src/lib/db.ts`

Add `attempts: number` to the `PendingSync` interface and the IDB store value type.
After each failed flush attempt (ACK timeout or error), increment `attempts`. After
`MAX_ATTEMPTS` (e.g. 10), drop the entry to prevent IDB bloat from writes that can
never succeed (e.g. the payload itself was malformed).

**Phase 3 — Verify**

Kill relay → update inventory item (⏱ appears) → restart relay → confirm ⏱ disappears
only after ACK arrives → kill relay again immediately as flush starts → confirm ⏱ stays
visible (entry not lost).

---

## Gap 3 — Up to 60 seconds to detect going offline or coming back

### Status

Open — not yet implemented.

### What happens

The app checks the relay once per minute. This means:
- You can be offline for up to 60 seconds before any offline UI appears
- After the relay comes back, you wait up to 60 seconds before queued data flushes

In a crisis scenario where the tribe needs to communicate in a rapidly changing network
environment, 60 seconds is a long time to be in the dark.

### Why it happens

```ts
// packages/app/src/hooks/useOfflineStage.ts
const PING_INTERVAL_MS = 60 * 1000  // 60s
```

The ping only runs on this fixed interval. There is no mechanism to trigger an immediate
check when the network state changes.

Browsers expose `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`
events that fire immediately when the device's network interface changes. These aren't used.

### Fix plan

**Phase 1 — Add browser online/offline event listeners**

File: `packages/app/src/hooks/useOfflineStage.ts`

In the main `useEffect`, add listeners for browser network events that immediately
trigger `doPing()`:

```ts
useEffect(() => {
  void doPing()
  const interval = setInterval(() => { void doPing() }, PING_INTERVAL_MS)

  // Immediately re-ping when browser detects network change
  const handleOnline = () => { void doPing() }
  const handleOffline = () => { void doPing() }
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    clearInterval(interval)
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])
```

This means reconnection is detected within seconds of the network coming back, not
within 60 seconds.

**Phase 2 — Reduce PING_INTERVAL_MS**

Change from 60s to 15s as a background safety net for cases where browser events
don't fire (VPN changes, corporate firewalls, relay-specific failures that don't
affect general internet connectivity).

```ts
const PING_INTERVAL_MS = 15 * 1000  // 15s
```

**Phase 3 — Verify**

With relay running: disconnect network adapter → confirm offline UI appears within 5s.
Reconnect → confirm flush happens within 5s. No browser events: pull relay process
down → confirm detection within 15s.

---

## Gap 4 — The "are you online?" check doesn't test the actual sync connection

### Status

Open — not yet implemented.

### What happens

The app determines online/offline status by making an HTTP request to the relay. But
Gun (the sync engine) uses a WebSocket connection. These are separate protocols and
they can disagree.

On a flaky network, or when the relay's WebSocket handler is broken while its HTTP
server still responds, the app shows "online" and the ⏱ icons disappear — but Gun
writes are still silently failing.

### Why it happens

```ts
// packages/app/src/lib/relay-ping.ts
export async function pingRelay(): Promise<boolean> {
  const res = await fetch(`${getRelayUrl()}/push/vapid-public-key`, { ... })
  return res.status === 200 || res.status === 503
}
```

This only tests HTTP. Gun uses WebSocket at `ws://relay/gun`. The two are served by
the same process but are separate subsystems. A crash in Gun's WS handler won't
necessarily bring down the HTTP server.

### Fix plan

**Phase 1 — Add WebSocket probe to pingRelay**

File: `packages/app/src/lib/relay-ping.ts`

After the HTTP check passes, also test the WebSocket endpoint with a short-lived
connection. Only return `true` if both succeed:

```ts
async function pingWS(baseUrl: string): Promise<boolean> {
  return new Promise(resolve => {
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/gun'
    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch {
      return resolve(false)
    }
    const timer = setTimeout(() => { ws.close(); resolve(false) }, 3000)
    ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(true) }
    ws.onerror = () => { clearTimeout(timer); resolve(false) }
  })
}

export async function pingRelay(): Promise<boolean> {
  // HTTP check first (fast fail)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${getRelayUrl()}/push/vapid-public-key`, {
      method: 'GET', signal: controller.signal, cache: 'no-store',
    })
    clearTimeout(timeout)
    if (res.status !== 200 && res.status !== 503) return false
  } catch {
    return false
  }
  // WS check second (verifies Gun's actual transport)
  return pingWS(getRelayUrl())
}
```

**Phase 2 — Verify divergence case**

Modify relay.js to temporarily break the WS upgrade handler while keeping HTTP alive.
Confirm app detects offline correctly. Restore and confirm it detects online again.

---

## Gap 5 — Two people editing the same thing offline overwrites one person's work

### Status

Open — not yet implemented.

### What happens

If two tribe members both update the same inventory item while offline, whoever syncs
back to the relay last wins. The first person's changes are silently overwritten with
no warning, no merge, no notification. The same applies to events and skills.

### Why it happens

Gun uses last-write-wins semantics based on its internal vector clock. The app
doesn't implement any application-level conflict detection.

The subscription handlers in `inventory.ts`, `events.ts`, and `skills.ts` all accept
any incoming Gun data unconditionally:

```ts
// packages/app/src/lib/inventory.ts — subscribeToInventory handler
function handleItem(data: unknown, assetKey: string) {
  // ...
  const entry = d as unknown as TribeAsset
  invMap.set(assetKey as AssetType, entry)
  getDB().then(db => db.put('inventory', entry, `${tribeId}:${assetKey}`))
  // no timestamp check — Gun data always wins over local IDB data
}
```

If local IDB has a newer `updatedAt` than the incoming Gun data, the incoming data
still silently overwrites local truth.

### Fix plan

**Phase 1 — Timestamp-gated IDB writes in subscription handlers**

Files: `packages/app/src/lib/inventory.ts`, `packages/app/src/lib/events.ts`,
`packages/app/src/lib/skills.ts`

In each subscription handler, before writing incoming Gun data to IDB, check if the
local IDB record is newer. If so, skip the overwrite (the local write will re-sync
on the next flush):

```ts
// inventory.ts handleItem
function handleItem(data: unknown, assetKey: string) {
  if (assetKey === '_') return
  if (!data || typeof data !== 'object') {
    invMap.delete(assetKey as AssetType)
  } else {
    const d = data as Record<string, unknown>
    if (d.asset && d.tribeId === tribeId) {
      const incoming = d as unknown as TribeAsset
      const local = invMap.get(assetKey as AssetType)
      // Only overwrite if incoming is newer than what we have
      if (!local || (incoming.updatedAt ?? 0) >= (local.updatedAt ?? 0)) {
        invMap.set(assetKey as AssetType, incoming)
        getDB().then(db => db.put('inventory', incoming, `${tribeId}:${assetKey}`))
      }
    }
  }
  callback(Array.from(invMap.values()))
}
```

Apply the same pattern to `events.ts` (using `createdAt` as the timestamp field since
events don't have `updatedAt`) and `skills.ts` (using `declaredAt`).

**Phase 2 — Conflict notification (optional, future)**

When a conflict is detected (incoming Gun data is older than local), surface a passive
notification: "Your recent [inventory/event/skill] edit may conflict with another
member's change." This is a future phase — Phase 1 already prevents silent overwrite.

**Phase 3 — Verify**

Two devices: both offline → both edit same inventory item → device A reconnects (syncs)
→ device B reconnects → confirm device B's older edit doesn't overwrite device A's newer
edit → confirm device B's newer edit DOES overwrite device A's older edit correctly.

---

## File summary

| Gap | Files to modify |
|-----|-----------------|
| 1 — Tribe messages invisible | `TribeChannelScreen.tsx`, possibly `hooks/useChannel.ts` |
| 2 — Flush loses data | `lib/sync-queue.ts`, `lib/db.ts` |
| 3 — 60s detection lag | `hooks/useOfflineStage.ts` |
| 4 — HTTP ping ≠ WS health | `lib/relay-ping.ts` |
| 5 — Conflict overwrite | `lib/inventory.ts`, `lib/events.ts`, `lib/skills.ts` |

## Execution order (recommended)

Fix gaps in this order — each is independent and safe to implement alone:

1. **Gap 3** (ping interval) — smallest change, highest day-to-day impact
2. **Gap 1** (tribe messages) — fixes visible UX hole immediately
3. **Gap 4** (WS ping) — hardens the detection that gaps 3 and the flush depend on
4. **Gap 2** (flush safety) — hardens the flush that now runs faster (gap 3)
5. **Gap 5** (conflict resolution) — most complex, lowest urgency
