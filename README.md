<div align="center">

```
███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

### **NEXUS v2.0.0 Production Release**
### **ASTRO 5 ISLANDS • ZERO-KNOWLEDGE • CLIENT-SIDE ENCRYPTED CHAT**

[![Astro 5](https://img.shields.io/badge/Astro-5.4-BC52EE?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![Live Deployment](https://img.shields.io/badge/Live_Deployment-Cloudflare_Workers-38BDF8?style=for-the-badge&logo=cloudflare&logoColor=white)](https://nexus-private-chat.abhishekraaj07.workers.dev)
[![Download Android APK](https://img.shields.io/badge/Download_APK-Android_Native-emerald?style=for-the-badge&logo=android&logoColor=white)](https://github.com/abhishekraaj07/private-chat-app/raw/main/release/NEXUS.apk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Web Crypto API](https://img.shields.io/badge/Cryptography-AES--256--GCM%20%7C%20ECDH%20P--256-emerald?style=for-the-badge&logo=shield&logoColor=white)](https://w3c.github.io/webcrypto/)
[![Vitest](https://img.shields.io/badge/Tests-168%20Passed%20(100%25)-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

**NEXUS** is a minimalist, temporary, privacy-first messaging application engineered with client-side end-to-end encryption. Built on the **Astro 5 Islands Architecture**, **W3C Web Crypto API**, **Cloudflare Workers**, and **Durable Objects**.

> *"Private conversations. Ephemeral rooms. Client-side encryption. Nothing unnecessary."*

[🌐 **Launch NEXUS Web Client**](https://nexus-private-chat.abhishekraaj07.workers.dev) &nbsp;|&nbsp; [📱 **Direct Download Android APK (v2.0.0)**](https://github.com/abhishekraaj07/private-chat-app/raw/main/release/NEXUS.apk)

</div>

---

## ⚡ What's New in NEXUS V2

NEXUS v2.0 brings an architectural overhaul to **Astro 5 Islands** and introduces 4 Next-Gen cryptographic communication capabilities:

### 1. 🎙️ Ephemeral E2EE Voice Notes (`VoiceRecorder.tsx`)
* In-browser Opus/WebM audio recording up to 120 seconds with live canvas audio waveform visualizer.
* **1× View-Once Audio Self-Destruct**: Voice note automatically purges from browser memory and sender timeline upon recipient playback.
* Encrypted end-to-end via AES-256-GCM before socket relay transmission.

### 2. 🤖 Client-Side Zero-Trace Assistant Bot (`@nexus` / `@bot`)
* Client-side command evaluator executing arithmetic calculations, entropy & cipher inspection, cryptographic coin tosses, dice rolls, and UTC timestamps.
* **100% Zero-Cloud Leak**: Commands are parsed and evaluated strictly inside the browser runtime—zero data is sent to external AI APIs or LLM vendors.
* Available commands: `@nexus help`, `@nexus calc <expression>`, `@nexus cipher <text>`, `@nexus flip`, `@nexus roll`, `@nexus time`.

### 3. ⚡ WebRTC Direct P2P DataChannel (`webrtcP2P.ts`)
* Uses WebSocket relay solely for initial SDP offer/answer and ICE candidate exchange.
* Automatically establishes a direct, high-bandwidth browser-to-browser peer connection (`RTCDataChannel`), bypassing server relay hops entirely for peer communication.

### 4. 🚨 Panic / Duress Emergency Screen Wipe (`duressWipe.ts`)
* Instant emergency wipe triggered via global keyboard shortcut **`Ctrl + Alt + Q`** (or `Cmd + Alt + Q` on macOS).
* Instantly destroys all AES-256-GCM session keys and ECDH keypairs in RAM.
* Purges `localStorage` and `sessionStorage`.
* Rewrites browser history stack to prevent back-button inspection.
* Hard redirects active tab to an innocent decoy website (`wikipedia.org/wiki/Cryptography`).

---

## 🏝️ Astro 5 Islands Architecture

NEXUS leverages Astro 5 Islands for performance and security:
* **Zero Initial JavaScript Overhead**: The outer application shell, styling tokens, and layout stream as static HTML/CSS from the edge, achieving near-instant first contentful paint (FCP).
* **Targeted Interactive Hydration**: The encrypted messaging workspace hydrates dynamically via `<App client:only="react" />`, guaranteeing uninterrupted access to browser Web Crypto APIs, MediaRecorder, and WebSockets.
* **Cloudflare Worker & Durable Object Relay**: Fully unified with `@astrojs/cloudflare` server adapter for global zero-latency edge delivery and stateful in-memory room multiplexing.

---

## 📋 Comprehensive Feature Matrix

| Capability | Description | Security / Implementation Guarantee |
| :--- | :--- | :--- |
| **🎙️ Voice Notes** | Record up to 120s Opus voice memos with live waveform visualizer & 1× View-Once audio self-destruct. | Client-side memory blob; encrypted via AES-256-GCM; revoked on playback. |
| **🤖 Zero-Trace Bot** | In-room `@nexus` / `@bot` utility evaluator for math, cipher inspect, coin toss, dice roll. | 100% local browser execution; 0 byte external cloud or LLM leak. |
| **⚡ WebRTC Direct P2P** | Direct peer-to-peer browser data channel with relay-only signaling fallback. | Direct browser-to-browser pipe; eliminates server relay latency. |
| **🚨 Panic Screen Wipe** | Emergency `Ctrl+Alt+Q` hotkey that wipes memory keys, storage, and redirects to Wikipedia. | Memory zeroization + storage purge + history overwrite. |
| **👁️ 1× View-Once Media** | Ephemeral photo viewer that self-destructs upon close and revokes memory blobs. | Memory-only blob URLs; recipient ACK locks card for both participants. |
| **💬 Quoted Replies** | WhatsApp-style reply context banner in composer with click-to-scroll & highlight. | Encrypted inside V2 payload envelope with parent ID and snippet. |
| **🔥 Reactions** | Quick emoji reactions (`❤️`, `👍`, `😂`, `😮`, `😢`, `🔥`) with toggle support. | Authenticated encrypted reaction envelopes; live participant aggregation. |
| **✏️ Message Editing** | In-place text editing for authors with `(edited)` visual tags. | Encrypted edit envelope; validated author-only dispatch. |
| **🗑️ Dual Deletion** | **"Delete for me"** (local purge) & **"Delete for everyone"** (`🚫 Deleted`). | Local timeline filter or encrypted deletion broadcast. |
| **📌 Pinned Messages** | Pinned header bar with multi-pin carousel and direct jump navigation. | Encrypted pin state synchronized across participants. |
| **⏱️ Disappearing Messages**| Configurable self-destruct timers (`30s`, `5m`, `1h`, `24h`) with automated pruning. | In-memory timestamp pruning; zero persistent server database. |
| **🔍 Local Message Search** | In-memory substring search (`Ctrl+K`/`Ctrl+F`), match navigation (`1 of N`). | Operates strictly on decrypted timeline in browser memory. |
| **🛡️ Local Privacy Controls**| Local participant block/unblock with instant message filtering. | Client-side filtering; protects viewer without leaking block status. |
| **📎 Safe Attachments** | Strict whitelist validation (`JPG`, `PNG`, `WEBP`, `GIF`, `PDF`, `TXT` up to 3MB). | Executables and dangerous MIME types rejected locally and on relay. |
| **🔒 Zero-Knowledge Relay** | WebSocket relay forwards opaque encrypted envelopes without holding private keys. | Server never receives private keys or plaintext. |
| **📱 Mobile & PWA Ready** | Standalone progressive web app & native Android APK build via Capacitor. | Full secure context WebCrypto support on mobile browsers. |

---

## 🔐 Cryptographic Architecture

NEXUS uses strict **W3C Web Crypto API** standard primitives natively implemented in modern browsers. No custom or proprietary crypto libraries are used.

```
Participant A (Browser)                                Participant B (Browser)
      │                                                      │
      │ 1. generateKeyPair() (ECDH P-256)                    │ 1. generateKeyPair() (ECDH P-256)
      │ 2. exportPublicKey() (JWK)                           │ 2. exportPublicKey() (JWK)
      │                                                      │
      ├────────── Send Public JWK via Relay ────────────────>│
      │<───────── Send Public JWK via Relay ─────────────────┤
      │                                                      │
      │ 3. deriveSharedSecret(privA, pubB)                   │ 3. deriveSharedSecret(privB, pubA)
      │    HKDF-SHA-256 (Context: "NEXUS-E2E-v1-AES-GCM-256")│    HKDF-SHA-256 (Same Context)
      │    Derived Key: 256-bit AES-GCM                      │    Derived Key: 256-bit AES-GCM
      │                                                      │
      │ 4. encryptMessage(AES-GCM, fresh 96-bit IV)          │
      ├────────── Send {ciphertext, iv} relay ──────────────>│
      │                                                      │ 5. decryptMessage(AES-GCM, iv)
      │                                                      │    -> Verified Plaintext
```

1. **Non-Extractable Keys**: Key pairs are generated with `extractable: false` on private keys via Web Crypto API. Private keys cannot be exported or leaked via JavaScript introspection.
2. **Key Exchange**: Ephemeral ECDH P-256 public keys are exchanged over the WebSocket relay in standard JWK format.
3. **HKDF-SHA256 Derivation**: Both peers derive a 256-bit symmetric session key with explicit domain separation (`"NEXUS-E2E-v1"`).
4. **Authenticated Encryption with AAD Binding (AES-256-GCM)**: Every outgoing packet is encrypted using a fresh, cryptographically secure 96-bit (12-byte) IV (`crypto.getRandomValues`). The packet header metadata (protocol version, roomCode, senderId, messageId) is bound as Additional Authenticated Data (AAD), cryptographically preventing cross-room replay and sender spoofing.
5. **Replay Protection**: Duplicate message IDs and stale sequence packets outside the sequence window are automatically dropped by the client.
6. **Integrity & Tamper Rejection**: 128-bit authentication tags reject any modified, truncated, or injected frames before processing.

---

## 📁 Repository Structure

```
nexus/
├── astro.config.mjs                   # Astro 5 configuration with Cloudflare adapter
├── tailwind.config.mjs                # Cyberpunk dark theme tokens
├── src/
│   ├── layouts/
│   │   └── Layout.astro               # Base HTML skeleton & font loader
│   ├── pages/
│   │   └── index.astro                # Astro entry page mounting React Islands
│   ├── client/
│   │   ├── components/
│   │   │   ├── VoiceRecorder.tsx      # Ephemeral voice memo recorder & waveform visualizer
│   │   │   ├── VoiceNotePlayer.tsx    # Audio player with view-once self-destruct
│   │   │   ├── Header.tsx             # Room metrics, search toggle, disappearing timer
│   │   │   ├── ChatArea.tsx           # Encrypted timeline, 1× cards, replies, reactions
│   │   │   ├── MessageInput.tsx       # Composer, reply preview, edit banner, 1× toggle
│   │   │   ├── MessageActionMenu.tsx  # Quick emoji reactions, reply, pin, edit, delete
│   │   │   ├── SearchBar.tsx          # Local search bar with prev/next match navigation
│   │   │   ├── PinnedBar.tsx          # Pinned message banner with jump-to-message
│   │   │   ├── DisappearingModal.tsx  # Self-destruct timer selector (30s, 5m, 1h, 24h)
│   │   │   ├── ViewOnceModal.tsx      # Ephemeral full-screen one-time viewer
│   │   │   ├── Toast.tsx              # Minimal floating dark feedback toasts
│   │   │   ├── RoomInspector.tsx      # Technical transparency drawer & fingerprint
│   │   │   └── SecurityModal.tsx      # Honest cryptographic disclosure modal
│   │   ├── utils/
│   │   │   ├── duressWipe.ts          # Panic Ctrl+Alt+Q emergency wipe & decoy redirect
│   │   │   ├── nexusBotEngine.ts      # Zero-Trace client-side AI bot evaluator
│   │   │   └── webrtcP2P.ts           # WebRTC Direct P2P DataChannel engine
│   │   └── pages/
│   │       ├── LandingPage.tsx        # Minimalist landing view
│   │       ├── CreateRoomPage.tsx     # Code generator & waiting room
│   │       ├── JoinRoomPage.tsx       # Code verification
│   │       └── ChatRoomPage.tsx       # Primary active session coordinator
│   ├── crypto/
│   │   ├── e2e.ts                     # Web Crypto API ECDH, HKDF, AES-256-GCM engine
│   │   └── types.ts                   # Cryptographic schemas
│   ├── hooks/
│   │   ├── useCryptoSession.ts        # Local keypair & AES-GCM session state
│   │   ├── useRoomSocket.ts           # WebSocket lifecycle, V2 frame dispatch, auto-reconnect
│   │   └── useAutoResizeTextarea.ts   # Auto-expanding composer hook
│   └── types/
│       └── protocol.ts                # Strongly-typed V2 protocol schemas
├── worker/
│   ├── index.ts                       # Cloudflare Worker router & asset handler
│   ├── room-do.ts                     # Cloudflare RoomDurableObject (Zero-knowledge relay)
│   ├── validation.ts                  # Server-side input & payload validation
│   └── rate-limit.ts                  # Sliding-window rate limiters
├── server/
│   ├── relay.ts                       # Standalone WebSocket relay engine
│   └── dev-plugin.ts                  # Development WebSocket bridge
├── android/                           # Capacitor Android native project
├── tests/
│   ├── nexus-v2-features.test.ts      # Voice notes, Zero-Trace Bot, WebRTC & Panic tests
│   ├── crypto.test.ts                 # Cryptographic primitive unit tests
│   ├── features-v2.test.ts            # V2 features, replies, view-once, reactions, search
│   ├── relay.test.ts                  # WebSocket relay lifecycle tests
│   ├── room-code.test.ts              # Room code entropy & collision tests
│   ├── validation.test.ts             # Input sanitization unit tests
│   └── rate-limit.test.ts             # Rate limiting tests
├── wrangler.jsonc                     # Cloudflare Workers & Durable Objects config
└── package.json
```

---

## 🧪 Automated Test Suite (168/168 Passing)

NEXUS maintains a strict 100% pass rate across 16 test suites:

```bash
npm run test
```

```text
 ✓ tests/nexus-v2-features.test.ts (7 tests)
 ✓ tests/validation.test.ts (21 tests)
 ✓ tests/relay.test.ts (1 test)
 ✓ tests/crypto.test.ts (10 tests)
 ✓ tests/room-code.test.ts (7 tests)
 ✓ tests/security-hardening.test.ts (14 tests)
 ✓ tests/features-v2.test.ts (11 tests)
 ✓ tests/ux-polish.test.ts (13 tests)
 ✓ tests/favicon.test.ts (5 tests)
 ✓ tests/feature-discovery-faq.test.ts (11 tests)
 ✓ tests/qr-removal.test.ts (9 tests)
 ✓ tests/new-capabilities.test.ts (12 tests)
 ✓ tests/release-hardening.test.ts (17 tests)
 ✓ tests/guide-faq-navigation.test.ts (13 tests)
 ✓ tests/chat-layout.test.ts (13 tests)
 ✓ tests/rate-limit.test.ts (4 tests)

 Test Files  16 passed (16)
      Tests  168 passed (168)
   Duration  4.95s
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* **Node.js**: v20.0+
* **npm**: v10.0+

### 1. Clone & Install
```bash
git clone https://github.com/abhishekraaj07/private-chat-app.git
cd private-chat-app
npm install --legacy-peer-deps
```

### 2. Run Local Development Server
Starts the Astro dev server with integrated zero-knowledge WebSocket relay:
```bash
npm run dev
```
Open **`http://localhost:4321`** in two browser windows or private tabs to test real-time encrypted messaging.

### 3. Run Automated Tests
```bash
npm run test
```

### 4. Build for Production
```bash
npm run build
```

---

## ☁️ Cloudflare Deployment

Deploy to Cloudflare Workers with native Durable Objects support:

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Build and deploy
npm run build
npx wrangler deploy
```

Configuration is managed via [`wrangler.jsonc`](wrangler.jsonc).

---

## 📱 Android APK Build (Capacitor)

NEXUS includes a fully configured native Android project using Capacitor:

```powershell
# Build web bundle and sync to Android
npm run build
npx cap sync android

# Open in Android Studio or compile APK
./build-apk.ps1
```

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

<div align="center">
<sub>Designed and engineered with zero unnecessary clutter. Built for privacy.</sub>
</div>
