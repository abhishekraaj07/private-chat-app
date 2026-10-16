<div align="center">

```
███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

### **NEXUS v1.0.0 Public Beta**
### **EPHEMERAL • ZERO-KNOWLEDGE • CLIENT-SIDE ENCRYPTED CHAT**

[![Live Deployment](https://img.shields.io/badge/Live_Deployment-Cloudflare_Workers-38BDF8?style=for-the-badge&logo=cloudflare&logoColor=white)](https://nexus-private-chat.abhishekraaj07.workers.dev)
[![Download Android APK](https://img.shields.io/badge/Download_APK-Android_Native-emerald?style=for-the-badge&logo=android&logoColor=white)](https://github.com/abhishekishere014-git/NEXUS-PRIVATE-CHAT/raw/main/release/NEXUS.apk)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Crypto API](https://img.shields.io/badge/Cryptography-AES--256--GCM%20%7C%20ECDH%20P--256-emerald?style=for-the-badge&logo=shield&logoColor=white)](https://w3c.github.io/webcrypto/)
[![Vitest](https://img.shields.io/badge/Tests-Passing_(100%25)-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

**NEXUS** is a minimalist, temporary, privacy-focused real-time messaging application with client-side end-to-end encryption. Built on the browser's native **W3C Web Crypto API**, **Cloudflare Workers**, and **Durable Objects**.

> *"Private conversations. Ephemeral rooms. Client-side encryption. Nothing unnecessary."*

[🌐 **Launch NEXUS Web Client**](https://nexus-private-chat.abhishekraaj07.workers.dev) &nbsp;|&nbsp; [📱 **Direct Download Android APK (v1.0.0)**](https://github.com/abhishekishere014-git/NEXUS-PRIVATE-CHAT/raw/main/release/NEXUS.apk)

</div>

---

## ⚡ Key Highlights & Features

| Feature | Description | Cryptographic Mechanism |
| :--- | :--- | :--- |
| **✅ Delivery States** | Real-time state transitions (`sending` $\rightarrow$ `sent` $\rightarrow$ `delivered` $\rightarrow$ `read`) with one-click retry. | Zero-knowledge client-to-client encrypted delivery and read receipt frames. |
| **🟢 Presence & Last Seen** | Real-time peer online indicator and last-seen timestamp kept in-memory. | Ephemeral WebSocket lifecycle presence; zero server storage. |
| **💬 Quoted Replies** | WhatsApp-style reply context banner in composer with click-to-scroll and pulse ring highlight. | Encrypted inside V2 payload envelope with parent ID and snippet. |
| **👁️ 1× View-Once Media** | Ephemeral photo viewer that self-destructs upon close, revokes memory blobs, and sends view ACK. | Client-side memory blob; zero disk caching; recipient ACK locks card. |
| **🔥 Reactions** | Quick reaction bar (`❤️`, `👍`, `😂`, `😮`, `😢`, `🔥`) with toggle support and live count aggregation. | Transmitted via authenticated encrypted reaction envelopes. |
| **✏️ Message Editing** | In-place text editing for authors with `(edited)` visual tags. | Encrypted edit envelope; validated author-only dispatch. |
| **🗑️ Dual Deletion** | **"Delete for me"** (local purge) & **"Delete for everyone"** (`🚫 This message was deleted`). | Local timeline filter or encrypted deletion broadcast. |
| **📌 Pinned Messages** | Pinned header bar with multi-pin carousel and direct jump navigation. | Encrypted pin state synchronized across participants. |
| **⏱️ Disappearing Messages** | Configurable self-destruct timers (`30s`, `5m`, `1h`, `24h`) with automated client-side pruning. | In-memory timestamp pruning; zero persistent server database. |
| **🔍 Local Message Search** | Zero-knowledge in-memory substring search (`Ctrl+K`/`Ctrl+F`), match navigation (`1 of N`), and `<mark>` badges. | Operates solely on already-decrypted timeline in browser memory. |
| **🛡️ Local Privacy Controls** | Local participant block/unblock with instant message filtering. | Client-side filtering; protects viewer without leaking block status. |
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
├── src/
│   ├── client/
│   │   ├── components/
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
│   ├── services/
│   │   └── api.ts                     # REST client for room creation & join
│   └── types/
│       └── protocol.ts                # Strongly-typed V2 protocol schemas
├── worker/
│   ├── index.ts                       # Cloudflare Worker router & asset handler
│   ├── room-do.ts                     # Cloudflare RoomDurableObject (Zero-knowledge relay)
│   ├── validation.ts                  # Server-side input & payload validation
│   └── rate-limit.ts                  # Sliding-window rate limiters
├── server/
│   ├── relay.ts                       # Standalone WebSocket relay engine
│   └── dev-plugin.ts                  # Vite development WebSocket bridge
├── android/                           # Capacitor Android native project
├── tests/
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

## 🛡️ Honest Threat Model

We believe in technically defensible security disclosures:

### What NEXUS Cryptographically Guarantees
* **Content Confidentiality**: Plaintext messages and decrypted attachments exist only in volatile client browser memory.
* **Integrity & Authenticity**: Tampered ciphertext or mismatched authentication tags cause immediate rejection before timeline rendering.
* **Cryptographic Envelope Binding (AAD)**: Protocol version, roomCode, senderId, and messageId are cryptographically bound via AES-GCM Additional Authenticated Data, preventing cross-room replay and sender impersonation.
* **Non-Extractable Private Keys**: ECDH private keys are generated with `extractable: false`, preventing memory dump or script introspection extraction.
* **Zero Server-Side Knowledge**: Cloudflare Workers, Durable Objects, and Node relays forward encrypted envelopes blindly and never receive private keys or plaintext.
* **No Server Persistence**: Zero database, zero chat logs, zero analytics, zero message history on servers.
* **Strict Ephemeral Lifespans**: Inactive rooms automatically expire after 15 minutes of inactivity; invalid traffic cannot reset alarms.

### Real-World Boundaries & Limitations
* **Edge Metadata Visibility**: Edge networks, ISPs, and network eavesdroppers can observe IP addresses, WebSocket connection timestamps, frame lengths, and transmission cadence. If network-level anonymity is required, use Tor or an equivalent onion routing proxy.
* **Endpoint Compromise**: Keyloggers, compromised browser extensions, operating system malware, or physical access bypass transport and cryptographic protections.
* **View-Once & Disappearing Messages**: These are client-side memory controls (immediate revocation of blob URLs, wiping attachment pointers, automatic timeline expiration). They **cannot** prevent an untrusted recipient from taking an external photograph, using screen recording tools, or running a modified client.
* **Active MitM Verification**: Because ephemeral ECDH does not use static certificates or a central public key infrastructure (PKI), participants MUST verify the **Session Fingerprint** out-of-band (e.g. over a phone call or face-to-face) to guarantee an active adversary relay hasn't performed key substitution. Once verified, click **"Verify Peer Fingerprint"** in the Room Inspector.

---

## 🚀 Quick Start & Local Setup

### Prerequisites
* **Node.js**: v20.0+
* **npm**: v10.0+

### 1. Clone & Install
```bash
git clone https://github.com/abhishekishere014-git/NEXUS-PRIVATE-CHAT.git
cd NEXUS-PRIVATE-CHAT
npm install
```

### 2. Run Local Development Server
Starts the Vite dev server with integrated zero-knowledge WebSocket relay:
```bash
npm run dev
```
Open **`http://localhost:3000`** in two browser windows or private tabs to test real-time encrypted messaging.

### 3. Run Automated Tests
```bash
npm run test
```
Runs the full Vitest test suite with **46/46 passing tests** across 6 test files.

### 4. Check Types & Linter
```bash
npm run lint
```

### 5. Build for Production
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
