# Plus Ultra — Tribal Operating System

A native mobile app for tribal resilience and survivability. Built for communities that want to organize, coordinate, and thrive — with or without the internet.

## What It Does

Plus Ultra gives tribes the tools to function as self-reliant units:

- **Identity** — cryptographic keypair generated on-device. No accounts, no servers, no usernames. Your identity is yours.
- **Tribes** — create or join a tribe with an invite link. Each tribe has its own keypair, governance model, and member roster.
- **Survivability Score** — real-time score based on the skills declared by tribe members across critical domains (food, water, medical, security, comms, energy, shelter, community).
- **Tribe Channel** — tribe-wide encrypted messaging. Messages are signed with your identity keypair.
- **Direct Messages** — end-to-end encrypted DMs between tribe members using ECDH key exchange.
- **Offline Queue** — messages composed offline are queued and flushed when connectivity returns.
- **Skills Declaration** — members declare their skills across 8 survival domains. Gaps surface as critical priorities on the dashboard.

## Architecture

```
packages/
  app/     — Tauri 2.0 native app (React + Vite + TailwindCSS)
  core/    — Shared TypeScript types (Tribe, TribeMember, Message, Identity, Skill)
```

### Key Technology Choices

| Layer | Choice | Why |
|-------|--------|-----|
| Native shell | Tauri 2.0 | iOS + Android + macOS from one Rust core. Smaller binary than Electron, no Chromium bundle. |
| UI | React 18 + Vite | Fast HMR, small bundle, familiar ecosystem. |
| Routing | TanStack Router | File-safe type-checked routes with params. |
| Styling | Tailwind CSS | Custom `forest` palette optimized for dark outdoor readability. |
| P2P sync | Gun.js | Decentralized real-time graph database. Works peer-to-peer over LAN or via relay. |
| Crypto | Gun SEA (WebCrypto) | ECDSA signing, ECDH encryption, key generation — all in-browser WebCrypto. |
| Local storage | IndexedDB (idb) | Source of truth for identity, tribes, messages. Survives app restarts. Gun is sync layer only. |

### Data Flow

```
User action
  → IDB write (source of truth, immediate)
  → Gun write (P2P sync, fire-and-forget)
  → Peers receive via Gun relay or LAN
```

Gun writes are always fire-and-forget. The app never blocks on Gun acks — no relay = no problem, data is in IDB.

### Cryptography

- **Identity keypair** — ECDSA P-256 (signing) + ECDH P-256 (encryption), generated via WebCrypto on first launch
- **Tribe keypair** — same, generated at tribe creation. Founder holds the private key.
- **Tribe messages** — signed with sender's ECDSA key
- **Direct messages** — encrypted with ECDH shared secret (`SEA.secret(recipientEpub, senderPair)`)

## Getting Started

### Prerequisites

- Node.js 18+
- Rust + Cargo (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Tauri CLI prerequisites for your platform: https://tauri.app/start/prerequisites/

### Run in development

```bash
npm install
npm run dev                  # Vite + Tauri desktop window
# or open http://localhost:5173 in Chrome for browser-only dev
```

### Build

```bash
npm run build                # Vite + tsc
cd packages/app && npx tauri build   # Native macOS app + dmg
```

### Run tests

```bash
npm test                     # Vitest on @plus-ultra/core
```

## Project Status

Currently in active development — macOS validation spike complete, Android/iOS builds pending.

| Feature | Status |
|---------|--------|
| Identity generation | ✅ Working |
| Tribe creation | ✅ Working |
| Tribe dashboard | ✅ Working |
| Survivability score | ✅ Working |
| Skills declaration | ✅ Working |
| Tribe channel messaging | ✅ Implemented |
| Direct messages (encrypted) | ✅ Implemented |
| Offline queue | ✅ Implemented |
| Invite link flow | ✅ Implemented |
| macOS build | ✅ Passing |
| iOS build | 🔧 Scaffold done, device test pending |
| Android build | 📋 Pending Android Studio setup |
| Gun relay (production) | 📋 Pending deployment |

## Governance Models

When creating a tribe, founders choose one of three governance models:

- **Council** — domain leads vote on decisions. Coordinator has tie-break. Efficient for action.
- **Direct Democracy** — every member votes on all decisions. Maximum inclusion, slower decisions.
- **Hybrid** — council handles operations, full tribe votes on major changes.

## Survivability Domains

Skills are declared across 8 domains. The tribe score is an aggregate of coverage across all domains weighted by criticality:

1. Food production & preservation
2. Water sourcing & purification
3. Medical & first aid
4. Security & defense
5. Communications
6. Energy & power
7. Shelter & construction
8. Community & leadership

## License

Private — all rights reserved.
