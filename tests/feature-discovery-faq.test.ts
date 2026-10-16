import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Frontend Feature Discovery, Security UI & FAQ Upgrade Suite', () => {
  const rootDir = path.resolve(__dirname, '..');

  const aboutModalFile = fs.readFileSync(
    path.join(rootDir, 'src/client/components/AboutModal.tsx'),
    'utf-8'
  );

  const securityModalFile = fs.readFileSync(
    path.join(rootDir, 'src/client/components/SecurityModal.tsx'),
    'utf-8'
  );

  const faqModalFile = fs.readFileSync(
    path.join(rootDir, 'src/client/components/FaqModal.tsx'),
    'utf-8'
  );

  describe('1. Specification & Features Directory (AboutModal.tsx)', () => {
    it('features the updated subtitle and title', () => {
      expect(aboutModalFile).toContain('NEXUS SPECIFICATION & FEATURES');
      expect(aboutModalFile).toContain('v1.0.0 PROD');
      expect(aboutModalFile).toContain(
        'Complete product architecture, capabilities, and privacy model.'
      );
    });

    it('defines clear capability categories with dynamic counting', () => {
      expect(aboutModalFile).toContain("key: 'all', label: 'All Capabilities'");
      expect(aboutModalFile).toContain("key: 'security', label: 'Security & Crypto'");
      expect(aboutModalFile).toContain("key: 'messaging', label: 'Messaging Suite'");
      expect(aboutModalFile).toContain("key: 'privacy', label: 'Privacy & Ephemerality'");
      expect(aboutModalFile).toContain("key: 'controls', label: 'Room & Participant Controls'");
      expect(aboutModalFile).toContain("key: 'realtime', label: 'Real-Time & Connection'");
      expect(aboutModalFile).toContain("key: 'media', label: 'Media & Voice'");
      expect(aboutModalFile).toContain("key: 'infrastructure', label: 'Edge Infrastructure'");
      expect(aboutModalFile).toContain('totalCount = FEATURES.length');
    });

    it('documents actual implemented capabilities', () => {
      expect(aboutModalFile).toContain('Client-Side Cryptography');
      expect(aboutModalFile).toContain('Session Fingerprint Verification');
      expect(aboutModalFile).toContain('Anti-Replay Protection');
      expect(aboutModalFile).toContain('4-Stage Delivery Receipts');
      expect(aboutModalFile).toContain('Threaded Quoted Replies');
      expect(aboutModalFile).toContain('Real-Time Edits & Revocation');
      expect(aboutModalFile).toContain('Clickable Links & Inline Code');
      expect(aboutModalFile).toContain('Emoji Reaction Signals');
      expect(aboutModalFile).toContain('Zero-Knowledge Timeline Search');
      expect(aboutModalFile).toContain('Configurable Disappearing Messages');
      expect(aboutModalFile).toContain('1× View-Once Self-Destructing Media');
      expect(aboutModalFile).toContain('Panic / Burn Room Kill Switch');
      expect(aboutModalFile).toContain('Zero Persistent Storage');
      expect(aboutModalFile).toContain('Ephemeral Room Code & Direct Link');
      expect(aboutModalFile).toContain('Guest Mode Anonymous Entry');
      expect(aboutModalFile).toContain('Strict 2-Participant Room Lock');
      expect(aboutModalFile).toContain('Local Participant Shield & Mute');
      expect(aboutModalFile).toContain('Pinned Announcement Notices');
      expect(aboutModalFile).toContain('Peer Presence & Last-Seen Telemetry');
      expect(aboutModalFile).toContain('Typing Activity Indicators');
      expect(aboutModalFile).toContain('Automatic Connection Recovery');
      expect(aboutModalFile).toContain('Whitelisted Encrypted Media');
      expect(aboutModalFile).toContain('1× Ephemeral Encrypted Voice Notes');
      expect(aboutModalFile).toContain('Direct WebRTC Voice Calling');
      expect(aboutModalFile).toContain('Blind Cloudflare Edge Relay');
      expect(aboutModalFile).toContain('15-Minute Inactivity Auto-Eviction');
    });

    it('uses standard feature status badges without giant text walls', () => {
      expect(aboutModalFile).toContain("'CLIENT-SIDE'");
      expect(aboutModalFile).toContain("'REAL-TIME'");
      expect(aboutModalFile).toContain("'EPHEMERAL'");
      expect(aboutModalFile).toContain("'ACTIVE'");
      expect(aboutModalFile).toContain("'IMPLEMENTED'");
    });
  });

  describe('2. Security & Cryptographic Architecture (SecurityModal.tsx)', () => {
    it('presents all 6 structured numbered security layers', () => {
      expect(securityModalFile).toContain('01 — Ephemeral Key Agreement');
      expect(securityModalFile).toContain('02 — Authenticated Encryption');
      expect(securityModalFile).toContain('03 — Blind Edge Relay');
      expect(securityModalFile).toContain('04 — Ephemeral Room Lifecycle');
      expect(securityModalFile).toContain('05 — Minimal Server Trust');
      expect(securityModalFile).toContain('06 — Honest Threat Model & Boundaries');
    });

    it('provides honest threat model boundaries without false marketing claims', () => {
      expect(securityModalFile).toContain('Honest Threat Model & Boundaries');
      expect(securityModalFile).toContain('message confidentiality and integrity');
      expect(securityModalFile).toContain('observable depending on the network');
      expect(securityModalFile).not.toContain('100% anonymous');
      expect(securityModalFile).not.toContain('Zero trace');
      expect(securityModalFile).not.toContain('Impossible to hack');
    });

    it('implements premium typography and layout hierarchy', () => {
      expect(securityModalFile).toContain('text-lg sm:text-xl font-semibold tracking-tight');
      expect(securityModalFile).toContain('leading-[1.7]');
      expect(securityModalFile).toContain('Technical: ECDH • P-256 • Web Crypto API');
      expect(securityModalFile).toContain('Technical: HKDF-SHA-256 • AES-256-GCM • Unique IV');
    });

    it('preserves fingerprint out-of-band verification and peer verification button', () => {
      expect(securityModalFile).toContain('Active Session Fingerprint');
      expect(securityModalFile).toContain('Copy Fingerprint');
      expect(securityModalFile).toContain('PEER VERIFIED');
      expect(securityModalFile).toContain('UNVERIFIED PEER');
      expect(securityModalFile).toContain('onTogglePeerVerified');
    });
  });

  describe('3. Expanded Feature & Operation FAQ (FaqModal.tsx)', () => {
    it('organizes questions into clear categories with dynamic counts', () => {
      expect(faqModalFile).toContain("key: 'all', label: 'All Questions'");
      expect(faqModalFile).toContain("key: 'security', label: 'Security & Keys'");
      expect(faqModalFile).toContain("key: 'messaging', label: 'Messaging & Calls'");
      expect(faqModalFile).toContain("key: 'rooms', label: 'Rooms & Controls'");
      expect(faqModalFile).toContain("key: 'privacy', label: 'Privacy & Storage'");
      expect(faqModalFile).toContain("key: 'infrastructure', label: 'Edge Infrastructure'");
    });

    it('explains core feature mechanics with technical badges', () => {
      expect(faqModalFile).toContain('What features does NEXUS provide?');
      expect(faqModalFile).toContain('How does real-time messaging work?');
      expect(faqModalFile).toContain('What do the Sending, Sent, Delivered, and Read states mean?');
      expect(faqModalFile).toContain('Does NEXUS show when someone is typing?');
      expect(faqModalFile).toContain('What happens if my connection drops?');
      expect(faqModalFile).toContain('Can I share media?');
      expect(faqModalFile).toContain('Can I send voice notes or make voice calls?');
      expect(faqModalFile).toContain('How does 1× View-Once media protection work?');
      expect(faqModalFile).toContain('What happens when I click BURN ROOM?');
      expect(faqModalFile).toContain('Can I leave a room?');
      expect(faqModalFile).toContain('Can participants be blocked?');
      expect(faqModalFile).toContain('How does Guest Mode work?');
      expect(faqModalFile).toContain('How does room creation and joining work?');
      expect(faqModalFile).toContain('How long do private rooms stay active?');
      expect(faqModalFile).toContain('Are my messages, media, or calls stored on any server?');
      expect(faqModalFile).toContain('Who generates and controls the encryption keys?');
      expect(faqModalFile).toContain('Can a third party enter or eavesdrop on my room?');
      expect(faqModalFile).toContain('Does NEXUS provide anonymity?');
      expect(faqModalFile).toContain('Is NEXUS open source?');
    });

    it('includes user-friendly technical badges for each question', () => {
      expect(faqModalFile).toContain('SENDING → SENT → DELIVERED → READ');
      expect(faqModalFile).toContain('ECDH P-256 • HKDF-SHA-256 • AES-256-GCM');
      expect(faqModalFile).toContain('WebRTC DTLS-SRTP • MediaRecorder • Dual-Chime');
      expect(faqModalFile).toContain('Emergency Decoy • Instant RAM Eviction');
    });
  });
});
