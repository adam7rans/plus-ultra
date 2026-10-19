/**
 * demo-seed.ts — dev-only demo tribe seeder ("mature tribe" fixture).
 *
 * Builds a 25-member tribe (you as founder + 24 generated members) with
 * lived-in data across every major surface: tribe channel threads (text,
 * replies, reactions, voice memos, photos, video), DM threads with you,
 * proposals + votes + comments, events, inventory, map pins, tasks, skills,
 * and a channel-read watermark that leaves recent messages unread (badge demo).
 *
 * Entry point: DiagnosticsScreen "Load demo tribe" button (dev only).
 * Everything is written through the real lib functions or the exact IDB
 * record shapes they use — no test-only backdoors in prod code paths.
 * Gun writes from the real lib calls are fire-and-forget (harmless offline);
 * raw IDB puts skip Gun intentionally (local demo data, clearly labeled).
 *
 * Media is synthesized on-device (no assets, works offline):
 * - photos: canvas scenes rendered to JPEG
 * - voice: hand-built WAV (short tone pattern, valid header)
 * - video: canvas.captureStream + MediaRecorder (skipped if unsupported)
 */

import { nanoid } from 'nanoid'
import SEA from 'gun/sea'
import { getDB } from './db'
import { createTribe, writeMember } from './tribes'
import { declareSkill, vouchForSkill } from './skills'
import { prepareDM } from './messaging'
import { createProposal, castVote, addComment } from './proposals'
import { createEvent } from './events'
import { updateAsset } from './inventory'
import { addPin } from './map'
import { createTask } from './tasks'
import type { Identity } from '@plus-ultra/core'
import type {
  Message,
  TribeMember,
  SkillRole,
  ProficiencyLevel,
  AssetType,
} from '@plus-ultra/core'

export interface SeedResult {
  tribeId: string
  memberCount: number
  messageCount: number
}

interface SeedOptions {
  /** Defaults to 24 generated members (+ you = 25). Tests pass fewer. */
  memberCount?: number
  onProgress?: (msg: string) => void
}

type Keypair = { pub: string; priv: string; epub: string; epriv: string }

// ─── Roster (deterministic, domain-spread) ────────────────────────────────

interface RosterEntry {
  name: string
  memberType: 'adult' | 'elder'
  role: SkillRole
  proficiency: ProficiencyLevel
  bio: string
}

const ROSTER: RosterEntry[] = [
  { name: 'Maya', memberType: 'adult', role: 'paramedic', proficiency: 'expert', bio: 'Ex-EMT. Runs the aid station.' },
  { name: 'Jonas', memberType: 'adult', role: 'hunter', proficiency: 'expert', bio: 'Tracks the north ridge.' },
  { name: 'Priya', memberType: 'adult', role: 'nurse', proficiency: 'intermediate', bio: 'Night-shift nurse, triage lead.' },
  { name: 'Sam', memberType: 'elder', role: 'farmer', proficiency: 'expert', bio: 'Forty seasons in these fields.' },
  { name: 'Ruth', memberType: 'elder', role: 'midwife', proficiency: 'expert', bio: 'Delivered half the valley.' },
  { name: 'Eli', memberType: 'adult', role: 'fisherman', proficiency: 'intermediate', bio: 'Creek nets and smokehouse.' },
  { name: 'Noor', memberType: 'adult', role: 'pharmacist', proficiency: 'intermediate', bio: 'Herbalist + med stock.' },
  { name: 'Tomás', memberType: 'adult', role: 'forager', proficiency: 'intermediate', bio: 'Knows every edible within 10 miles.' },
  { name: 'Grace', memberType: 'adult', role: 'beekeeper', proficiency: 'basic', bio: 'Second-year hives.' },
  { name: 'Henrik', memberType: 'elder', role: 'butcher', proficiency: 'expert', bio: 'No waste, ever.' },
  { name: 'Adaeze', memberType: 'adult', role: 'physician', proficiency: 'expert', bio: 'Family medicine, clinic days.' },
  { name: 'Marco', memberType: 'adult', role: 'livestock_handler', proficiency: 'intermediate', bio: 'Goats, chickens, one mule.' },
  { name: 'June', memberType: 'adult', role: 'dentist', proficiency: 'intermediate', bio: 'Infections kill — floss.' },
  { name: 'Silas', memberType: 'adult', role: 'hunter', proficiency: 'intermediate', bio: 'Traplines east of the creek.' },
  { name: 'Wren', memberType: 'adult', role: 'forager', proficiency: 'basic', bio: 'Learning mushrooms (carefully).' },
  { name: 'Otto', memberType: 'elder', role: 'farmer', proficiency: 'expert', bio: 'Seed keeper.' },
  { name: 'Farah', memberType: 'adult', role: 'nurse', proficiency: 'basic', bio: 'Studying under Priya.' },
  { name: 'Yusuf', memberType: 'adult', role: 'paramedic', proficiency: 'basic', bio: 'First-aid certified.' },
  { name: 'Lena', memberType: 'adult', role: 'veterinarian', proficiency: 'intermediate', bio: 'Livestock health = food.' },
  { name: 'Marcus', memberType: 'adult', role: 'farmer', proficiency: 'basic', bio: 'Orchard rows.' },
  { name: 'Ilya', memberType: 'adult', role: 'fisherman', proficiency: 'basic', bio: 'Mends nets.' },
  { name: 'Sage', memberType: 'adult', role: 'beekeeper', proficiency: 'intermediate', bio: 'Honey + wax.' },
  { name: 'Rosa', memberType: 'adult', role: 'midwife', proficiency: 'basic', bio: 'Assists Ruth.' },
  { name: 'Theo', memberType: 'adult', role: 'hunter', proficiency: 'basic', bio: 'New to the ridge.' },
]

/** Pure roster builder (unit-tested): first N entries, names unique. */
export function buildRoster(count: number): RosterEntry[] {
  return ROSTER.slice(0, Math.max(0, Math.min(count, ROSTER.length)))
}

// ─── Synthesized media (offline, no assets) ─────────────────────────────

/** Hand-built 8kHz 16-bit mono WAV: short two-tone pattern. Always valid. */
export function makeWavBase64(seed = 1): string {
  const sampleRate = 8000
  const seconds = 1.6
  const n = Math.floor(sampleRate * seconds)
  const data = new Uint8Array(44 + n * 2)
  const view = new DataView(data.buffer)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + n * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, n * 2, true)
  // Three soft blips (440Hz → 660Hz → 520Hz) with decay + slight seed wobble.
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const seg = Math.floor(t / 0.45) % 3
    const freq = [440, 660, 520][seg] * (1 + ((seed * 7 + i) % 13) / 4000)
    const env = Math.exp(-((t % 0.45) / 0.45) * 4)
    const s = Math.sin(2 * Math.PI * freq * t) * env * 0.5
    view.setInt16(44 + i * 2, Math.round(s * 32767), true)
  }
  let bin = ''
  const CHUNK = 8192
  for (let i = 0; i < data.length; i += CHUNK) {
    bin += String.fromCharCode(...data.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}

/** 1px JPEG fallback when canvas is unavailable (node tests — never on device). */
const FALLBACK_JPEG =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ANvasT//2Q=='

/** Rendered 480×360 scene (gradient + emoji + caption) → raw JPEG base64. */
export function makePhotoBase64(caption: string, hue: number, emoji: string): string {
  if (typeof document === 'undefined') return FALLBACK_JPEG
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (!ctx) return FALLBACK_JPEG
  const grad = ctx.createLinearGradient(0, 0, 0, 360)
  grad.addColorStop(0, `hsl(${hue}, 25%, 14%)`)
  grad.addColorStop(1, `hsl(${hue}, 35%, 26%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 480, 360)
  ctx.font = '120px serif'
  ctx.textAlign = 'center'
  ctx.fillText(emoji, 240, 190)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 296, 480, 64)
  ctx.fillStyle = '#F5F5F5'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText(caption.slice(0, 28), 240, 338)
  const url = canvas.toDataURL('image/jpeg', 0.82)
  return url.split(',')[1] ?? FALLBACK_JPEG
}

/**
 * 2s animated scene → base64 video (webm/mp4 per platform support).
 * Returns null when capture/record is unavailable (headless, old WebView).
 */
export function makeVideoBase64(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      if (typeof document === 'undefined') return resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      const ctx = canvas.getContext('2d')
      const stream = (canvas as HTMLCanvasElement).captureStream?.(15)
      if (!ctx || !stream || typeof MediaRecorder === 'undefined') return resolve(null)
      const mimeType = ['video/mp4', 'video/webm'].find(
        (t) => MediaRecorder.isTypeSupported(t),
      )
      if (!mimeType) return resolve(null)
      const chunks: Blob[] = []
      const rec = new MediaRecorder(stream, { mimeType })
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1] ?? null)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      }
      let frame = 0
      const timer = setInterval(() => {
        frame++
        const g = ctx.createLinearGradient(0, 0, 320, 240)
        g.addColorStop(0, '#101418')
        g.addColorStop(1, '#1d2b22')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, 320, 240)
        ctx.fillStyle = '#39FF14'
        const x = 40 + ((frame * 12) % 240)
        ctx.beginPath()
        ctx.moveTo(x, 60)
        ctx.lineTo(x + 40, 160)
        ctx.lineTo(x - 40, 160)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#F5F5F5'
        ctx.font = '600 20px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('North ridge patrol', 160, 205)
      }, 66)
      rec.start()
      setTimeout(() => {
        clearInterval(timer)
        rec.stop()
      }, 1500)
      // Safety net: never hang the seeder on media.
      setTimeout(() => resolve(null), 8000)
    } catch {
      resolve(null)
    }
  })
}

// ─── Channel script ─────────────────────────────────────────────────────
// Built from pubkeys at seed time (user + fakes). Times = hours ago.

interface ScriptMsg {
  from: number // index into pubs (-1 = you)
  type: 'text' | 'voice' | 'photo' | 'video'
  text: string
  hoursAgo: number
  replyTo?: number // index into the script array
  reactions?: Record<string, number[]> // emoji → from-indexes
  photo?: { caption: string; hue: number; emoji: string }
  voiceSeed?: number
}

const CHANNEL_SCRIPT: ScriptMsg[] = [
  { from: -1, type: 'text', text: 'Welcome to Pinecrest 🌲 Say hi and tell us your strongest skill.', hoursAgo: 72 },
  { from: 0, type: 'text', text: 'Maya here — paramedic, aid station is stocked. Come find me for anything urgent.', hoursAgo: 71.8 },
  { from: 1, type: 'text', text: 'Jonas, north ridge. Trails are clear as of this morning.', hoursAgo: 71.5 },
  { from: 3, type: 'text', text: 'Sam — fields are in. Forty seasons and this soil still surprises me.', hoursAgo: 71, reactions: { '❤️': [0, 8] } },
  { from: 5, type: 'text', text: 'Creek is running high after the rain. Checking the intake at first light.', hoursAgo: 50, replyTo: 1 },
  { from: 5, type: 'photo', text: 'Intake looks clear, flow is strong', hoursAgo: 49.5, photo: { caption: 'Cedar Creek intake', hue: 210, emoji: '🏞️' }, reactions: { '👍': [-1, 0] } },
  { from: -1, type: 'text', text: 'Great news. Log the flow reading in production when you can.', hoursAgo: 49, replyTo: 5 },
  { from: 5, type: 'voice', text: 'Voice memo from the creek', hoursAgo: 48.7, voiceSeed: 3 },
  { from: 10, type: 'text', text: 'Clinic day Thursday. Bring your med lists.', hoursAgo: 30 },
  { from: 2, type: 'text', text: 'Radio check tonight at 20:00, channel 3. Acknowledge below 👇', hoursAgo: 29 },
  { from: 7, type: 'text', text: 'Tomás ack ✅', hoursAgo: 28.7, replyTo: 9 },
  { from: 13, type: 'text', text: 'Silas ack ✅ east line quiet', hoursAgo: 28.5, replyTo: 9 },
  { from: 16, type: 'text', text: 'Farah ack ✅', hoursAgo: 28.2, replyTo: 9 },
  { from: -1, type: 'text', text: '📢 Muster drill Sunday 09:00 at the hall. Full turnout expected.', hoursAgo: 26 },
  { from: 4, type: 'text', text: 'Ruth will be there — bringing the birth kit for the drill scenario.', hoursAgo: 25.5, replyTo: 13 },
  { from: 6, type: 'text', text: 'Noor ack, bringing spare bandages.', hoursAgo: 25.2, replyTo: 13 },
  { from: 9, type: 'text', text: 'Henrik ack. No waste drill — we eat what we open 😄', hoursAgo: 24.8, replyTo: 13, reactions: { '😂': [2, 7] } },
  { from: 11, type: 'text', text: 'Goats are restless — anyone spare to help reinforce the pen tomorrow?', hoursAgo: 10 },
  { from: 19, type: 'text', text: 'Marcus can help after orchard rows. Bring wire?', hoursAgo: 9.6, replyTo: 17 },
  { from: 11, type: 'photo', text: 'Pen corner gave way here', hoursAgo: 9.4, photo: { caption: 'Goat pen — north corner', hue: 35, emoji: '🐐' } },
  { from: 3, type: 'text', text: 'Sam has wire in the barn. Take what you need, log it in inventory.', hoursAgo: 9.1, replyTo: 19 },
  { from: 20, type: 'text', text: 'Smokehouse is full — fish drying nicely. Thanks Eli!', hoursAgo: 5 },
  { from: 5, type: 'text', text: 'Anytime. Creek keeps giving. 🙏', hoursAgo: 4.8, replyTo: 21 },
  // Recent batch (unread watermark sits 3h back — these demo the badge)
  { from: 12, type: 'text', text: 'Reminder: water testing strips are in the clinic. Test before you drink from new sources.', hoursAgo: 2.5 },
  { from: 15, type: 'text', text: 'Otto — seed inventory is counted. 14 varieties secured for spring.', hoursAgo: 2.1 },
  { from: 18, type: 'photo', text: 'Sunset over the west field tonight', hoursAgo: 1.6, photo: { caption: 'West field at dusk', hue: 25, emoji: '🌅' }, reactions: { '❤️': [-1, 0, 2, 4] } },
  { from: 1, type: 'voice', text: 'Ridge report — all quiet', hoursAgo: 1.2, voiceSeed: 7 },
  { from: -1, type: 'text', text: 'Copy that Jonas. Everyone check in on the roll call thread when you see this. ✅', hoursAgo: 0.9, replyTo: 26 },
  { from: 21, type: 'text', text: 'Sage here — honey harvest this weekend, bring jars!', hoursAgo: 0.4 },
]

// ─── Seeder ───────────────────────────────────────────────────────────

export async function seedDemoTribe(
  identity: Identity,
  opts: SeedOptions = {},
): Promise<SeedResult> {
  const memberCount = opts.memberCount ?? 24
  const progress = opts.onProgress ?? (() => undefined)
  const now = Date.now()
  const db = await getDB()

  progress('Creating tribe…')
  const tribe = await createTribe(
    {
      name: 'Pinecrest Demo Tribe',
      location: 'Pinecrest',
      region: 'cascadia',
      constitutionTemplate: 'council',
      lat: 47.6062,
      lng: -122.3321,
    },
    identity.pub,
    identity.displayName,
    identity.epub,
  )
  const tribeId = tribe.id
  const userPub = identity.pub

  // ── Members ──
  progress('Generating member keys…')
  const roster = buildRoster(memberCount)
  const pairs: Keypair[] = []
  for (let i = 0; i < roster.length; i++) {
    if (i % 6 === 0) progress(`Generating member keys… ${i + 1}/${roster.length}`)
    pairs.push((await SEA.pair()) as Keypair)
  }

  progress('Adding members…')
  const pubs = [userPub, ...pairs.map((p) => p.pub)]
  for (let i = 0; i < roster.length; i++) {
    const r = roster[i]
    const pair = pairs[i]
    const joinedAt = now - (72 - i) * 3600_000 // staggered arrivals, oldest first
    const member: TribeMember = {
      pubkey: pair.pub,
      tribeId,
      joinedAt,
      lastSeen: now - (i % 5) * 3600_000,
      status: 'active',
      attachmentScore: 0.6 + ((i * 37) % 40) / 100,
      memberType: r.memberType,
      displayName: r.name,
      epub: pair.epub,
      bio: r.bio,
      availability: (['full_time', 'part_time', 'on_call'] as const)[i % 3],
      ...(i % 4 === 0 ? { physicalLimitations: 'Old knee injury — light duty' } : {}),
    }
    await writeMember(tribeId, member)
  }

  // ── Skills (+ a few vouches) ──
  progress('Declaring skills…')
  for (let i = 0; i < roster.length; i++) {
    await declareSkill(tribeId, pairs[i].pub, roster[i].role, roster[i].proficiency, {
      yearsExperience: ['1–3 years', '3–7 years', '7–15 years'][i % 3],
    })
  }
  const vouchPairs: Array<[number, number]> = [
    [0, 2], [2, 0], [3, 11], [1, 13], [10, 0], [4, 12],
  ]
  for (const [vouchee, voucher] of vouchPairs) {
    if (vouchee < roster.length && voucher < roster.length) {
      await vouchForSkill(tribeId, pairs[vouchee].pub, roster[vouchee].role, pairs[voucher].pub)
    }
  }
  // You vouch for Maya's paramedic skill.
  if (roster.length > 0) {
    await vouchForSkill(tribeId, pairs[0].pub, roster[0].role, userPub)
  }

  // ── Channel history ──
  progress('Writing channel history…')
  const putChannelMessage = async (m: Message) => {
    await db.put('messages', m as unknown, m.id)
  }
  const scriptIds: string[] = []
  for (const entry of CHANNEL_SCRIPT) {
    const senderPub = entry.from === -1 ? userPub : pubs[entry.from + 1]
    const sentAt = now - entry.hoursAgo * 3600_000
    const id = nanoid()
    scriptIds.push(id)
    if (entry.type === 'text') {
      await putChannelMessage({
        id, tribeId, channelId: 'tribe-wide', senderId: senderPub,
        type: 'text', content: entry.text, sentAt, sig: 'seed',
        ...(entry.replyTo !== undefined ? { replyTo: scriptIds[entry.replyTo] } : {}),
        ...(entry.reactions
          ? {
              reactions: Object.fromEntries(
                Object.entries(entry.reactions).map(([emoji, idxs]) => [
                  emoji,
                  idxs.map((ix) => (ix === -1 ? userPub : pubs[ix + 1])),
                ]),
              ),
            }
          : {}),
      })
    } else if (entry.type === 'photo' && entry.photo) {
      await putChannelMessage({
        id, tribeId, channelId: 'tribe-wide', senderId: senderPub,
        type: 'photo', content: makePhotoBase64(entry.photo.caption, entry.photo.hue, entry.photo.emoji),
        mimeType: 'image/jpeg', sentAt, sig: 'seed',
        ...(entry.replyTo !== undefined ? { replyTo: scriptIds[entry.replyTo] } : {}),
        ...(entry.reactions
          ? {
              reactions: Object.fromEntries(
                Object.entries(entry.reactions).map(([emoji, idxs]) => [
                  emoji,
                  idxs.map((ix) => (ix === -1 ? userPub : pubs[ix + 1])),
                ]),
              ),
            }
          : {}),
      })
    } else if (entry.type === 'voice') {
      await putChannelMessage({
        id, tribeId, channelId: 'tribe-wide', senderId: senderPub,
        type: 'voice', content: makeWavBase64(entry.voiceSeed ?? 1),
        mimeType: 'audio/wav', sentAt, sig: 'seed',
        ...(entry.replyTo !== undefined ? { replyTo: scriptIds[entry.replyTo] } : {}),
      })
    }
  }

  // One video message (generated in-app; skipped if capture unsupported).
  progress('Recording patrol clip…')
  const clip = await makeVideoBase64()
  if (clip) {
    const videoMime =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : 'video/webm'
    await putChannelMessage({
      id: nanoid(), tribeId, channelId: 'tribe-wide', senderId: pubs[2],
      type: 'video', content: clip, mimeType: videoMime,
      sentAt: now - 0.2 * 3600_000, sig: 'seed',
    })
  }

  // Unread watermark 3h back → recent batch lights up the Chat badge.
  await db.put(
    'channel-reads',
    { channelId: 'tribe-wide', lastReadAt: now - 3 * 3600_000 },
    'tribe-wide',
  )

  // ── DM threads with you ──
  progress('Writing direct messages…')
  const dm = async (
    fromIdx: number, // -1 = you
    toIdx: number,
    type: Message['type'],
    content: string,
    mimeType: string | undefined,
    hoursAgo: number,
  ) => {
    const fromPub = fromIdx === -1 ? userPub : pubs[fromIdx + 1]
    const toPub = toIdx === -1 ? userPub : pubs[toIdx + 1]
    const fromPair = fromIdx === -1 ? identity : pairs[fromIdx]
    const toEpub = toIdx === -1 ? identity.epub : pairs[toIdx].epub
    const msg = await prepareDM(tribeId, fromPub, fromPair, toPub, toEpub, type, content, mimeType)
    msg.sentAt = now - hoursAgo * 3600_000
    await db.put('messages', msg as unknown, msg.id)
    return msg
  }
  // Maya — med supply coordination (text)
  await dm(0, -1, 'text', 'Med stock is good except antiseptic — running low.', undefined, 20)
  await dm(-1, 0, 'text', 'Noor has a herbal wash that can bridge us. I’ll ask her to bring some Thursday.', undefined, 19.5)
  await dm(0, -1, 'text', 'Perfect, thank you! 🙏', undefined, 19)
  // Jonas — snare line (photo + voice)
  await dm(1, -1, 'text', 'East line is producing. Sending a photo of the new set.', undefined, 8)
  await dm(
    1, -1, 'photo',
    makePhotoBase64('East snare line', 120, '🪤'),
    'image/jpeg', 7.8,
  )
  await dm(-1, 1, 'text', 'Nice work. Log the yield in production when you get a chance.', undefined, 7)
  // Priya — shift cover (text + reply chain via second message)
  const priyaFirst = await dm(2, -1, 'text', 'Can you cover my watch Thursday? Clinic runs late.', undefined, 4)
  await dm(-1, 2, 'text', 'Covered — I’ll take Thursday night.', undefined, 3.8)
  void priyaFirst
  // Sam — barn wire (short thread)
  await dm(3, -1, 'text', 'Wire is in the barn, second stall. Take what the pen needs.', undefined, 9)
  await dm(-1, 3, 'text', 'Grabbed two coils. Pen holds for now.', undefined, 8.8)

  // ── Proposals + votes + comments ──
  progress('Seeding proposals…')
  const p1 = await createProposal(
    tribeId,
    { title: 'Extend the north fence line?', body: 'Predators probing the orchard side. 200m of wire + 3 work days.', scope: 'operational' },
    userPub,
    tribe,
  )
  const yesVoters = [0, 1, 2, 3, 4, 5, 10, 11]
  for (const ix of yesVoters) {
    if (ix < roster.length) await castVote(tribeId, p1.id, pairs[ix].pub, 'yes')
  }
  for (const ix of [6, 7]) {
    if (ix < roster.length) await castVote(tribeId, p1.id, pairs[ix].pub, 'no')
  }
  if (roster.length > 8) await castVote(tribeId, p1.id, pairs[8].pub, 'abstain')
  await addComment(tribeId, p1.id, pairs[3].pub, 'Wire is already in the barn — this is mostly labor.')
  await addComment(tribeId, p1.id, pairs[1].pub, 'I can walk the line Sunday and mark post holes.')

  await createProposal(
    tribeId,
    { title: 'Trade 20kg potatoes for radio batteries?', body: 'Ridge runners offer 8× AA lithium. Vote by Friday.', scope: 'major' },
    pairs[0].pub,
    tribe,
  ).then(async (p2) => {
    for (const ix of [0, 2, 4]) await castVote(tribeId, p2.id, pairs[ix].pub, 'yes')
    if (roster.length > 6) await castVote(tribeId, p2.id, pairs[6].pub, 'no')
  })

  // ── Events, inventory, map, tasks ──
  progress('Seeding events…')
  // Within a few hours so the dashboard "now & up next" card (24h window) shows it.
  const watchStart = now + 5 * 3600_000
  await createEvent(tribeId, pairs[1].pub, {
    type: 'watch',
    title: 'North ridge watch',
    description: 'Evening rotation, bring thermals.',
    startAt: watchStart,
    durationMin: 360,
    recurrence: { frequency: 'daily' },
    assignedTo: [pairs[1].pub, pairs[13].pub, pairs[23].pub],
    location: 'North gate',
  })
  await createEvent(tribeId, pairs[10].pub, {
    type: 'training',
    title: 'First-aid refresher',
    description: 'Bleeding control + splints. All welcome.',
    startAt: now + 3 * 24 * 3600_000,
    durationMin: 120,
    recurrence: { frequency: 'once' },
    assignedTo: [pairs[10].pub, pairs[2].pub],
    location: 'Community hall',
  })

  progress('Seeding inventory…')
  const stock: Array<[AssetType, number, string]> = [
    ['food_storage', 45, 'days of staples'],
    ['water_storage', 120, 'gallons treated'],
    ['medical_supplies', 30, 'days at current burn'],
    ['radio_handheld', 6, '2 need batteries (see proposal)'],
    ['agricultural_land', 12, 'acres under cultivation'],
    ['defensive_perimeter', 1, 'north fence extension pending'],
    ['fuel_depot', 40, 'gallons stabilized'],
    ['community_hall', 1, 'good condition'],
  ]
  for (const [asset, qty, note] of stock) {
    await updateAsset(tribeId, asset, qty, note, pairs[3].pub)
  }

  progress('Seeding map…')
  await addPin(tribeId, { assetType: 'water_source_access', label: 'Cedar Creek intake', notes: 'Flow strong, test weekly', lat: 47.612, lng: -122.341 }, pairs[5].pub)
  await addPin(tribeId, { assetType: 'guard_post', label: 'North gate', notes: 'Watch rotation meets here', lat: 47.618, lng: -122.328 }, pairs[1].pub)
  await addPin(tribeId, { assetType: 'food_storage', label: 'Root cellar', notes: 'Cool and dry, check monthly', lat: 47.604, lng: -122.335 }, pairs[3].pub)

  progress('Seeding tasks…')
  await createTask(tribeId, { title: 'Repair goat pen north corner', priority: 'high', assignedTo: [pairs[11].pub, pairs[19].pub], creatorPub: userPub })
  await createTask(tribeId, { title: 'Count seed inventory for spring', priority: 'normal', assignedTo: [pairs[15].pub], creatorPub: userPub })
  await createTask(tribeId, { title: 'Weekly water test at intake', priority: 'high', assignedTo: [pairs[5].pub], creatorPub: pairs[0].pub })
  await createTask(tribeId, { title: 'Smokehouse restock', priority: 'normal', assignedTo: [pairs[5].pub, pairs[20].pub], creatorPub: userPub })

  progress('Done')
  const allMessages = (await db.getAll('messages')) as Message[]
  return {
    tribeId,
    memberCount: roster.length + 1,
    messageCount: allMessages.filter((m) => m.tribeId === tribeId).length,
  }
}
