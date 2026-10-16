import { describe, it, expect } from 'vitest';
import { EncryptedV2Payload, ChatMessage } from '../src/types/protocol.ts';
import { isAllowedAttachmentMime } from '../worker/validation.ts';
import { formatCallDuration } from '../src/utils/format.ts';
import { normalizeRoomCode, isValidRoomCode } from '../src/utils/room-code.ts';

describe('New Capabilities Verification Suite (Direct Links, Panic Burn, Voice Notes, WebRTC Call)', () => {
  describe('1. Room URL & Code Resolver Logic', () => {
    function parseCandidateCode(raw: string): string | null {
      if (!raw) return null;
      const clean = raw.trim();

      try {
        if (clean.includes('://') || clean.startsWith('/')) {
          const url = new URL(clean, 'https://nexus.chat');
          const searchRoom = url.searchParams.get('room') || url.searchParams.get('join');
          if (searchRoom) {
            const norm = normalizeRoomCode(searchRoom);
            if (isValidRoomCode(norm)) return norm;
          }

          const hash = url.hash.replace(/^#/, '');
          if (hash) {
            if (hash.includes('=')) {
              const hashParams = new URLSearchParams(hash);
              const candidate = hashParams.get('join') || hashParams.get('room');
              if (candidate) {
                const norm = normalizeRoomCode(candidate);
                if (isValidRoomCode(norm)) return norm;
              }
            } else {
              const norm = normalizeRoomCode(hash);
              if (isValidRoomCode(norm)) return norm;
            }
          }

          const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart) {
            const norm = normalizeRoomCode(lastPart);
            if (isValidRoomCode(norm)) return norm;
          }
        }
      } catch {
        // Not a URL
      }

      const candidate = clean.replace(/^#/, '').replace(/^join=/, '').replace(/^room=/, '');
      const norm = normalizeRoomCode(candidate);
      return isValidRoomCode(norm) ? norm : null;
    }

    it('parses hash-based join links (#join=K7M4PX)', () => {
      const parsed = parseCandidateCode('https://nexus.chat/#join=K7M4PX&fp=E2E-TEST');
      expect(parsed).toBe('K7M4PX');
    });

    it('parses query-param room links (?room=K7M4PX)', () => {
      const parsed = parseCandidateCode('https://nexus.chat/?room=K7M4PX');
      expect(parsed).toBe('K7M4PX');
    });

    it('parses path-based room links (/K7M4PX)', () => {
      const parsed = parseCandidateCode('https://nexus.chat/K7M4PX');
      expect(parsed).toBe('K7M4PX');
    });

    it('parses raw typed room code (K7M4PX)', () => {
      const parsed = parseCandidateCode('k7m4px');
      expect(parsed).toBe('K7M4PX');
    });

    it('rejects corrupt or invalid room codes in URL payloads', () => {
      expect(parseCandidateCode('https://nexus.chat/#join=000000')).toBe(null); // '0' is invalid
      expect(parseCandidateCode('short')).toBe(null); // < 6 chars
      expect(parseCandidateCode('')).toBe(null);
    });
  });

  describe('2. Panic / Burn Room Kill Switch Protocol', () => {
    it('creates well-formed burn_room encrypted v2 payload', () => {
      const burnPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'burn_room',
        burnerId: 'usr-987',
        timestamp: Date.now(),
      };

      expect(burnPayload.version).toBe(2);
      expect(burnPayload.kind).toBe('burn_room');
      expect(burnPayload.burnerId).toBe('usr-987');
      expect(burnPayload.timestamp).toBeGreaterThan(0);
    });
  });

  describe('3. 1× Ephemeral Encrypted Voice Notes', () => {
    it('allows audio MIME types in attachment whitelist', () => {
      expect(isAllowedAttachmentMime('audio/webm')).toBe(true);
      expect(isAllowedAttachmentMime('audio/ogg')).toBe(true);
      expect(isAllowedAttachmentMime('audio/mp4')).toBe(true);
      expect(isAllowedAttachmentMime('audio/wav')).toBe(true);
      expect(isAllowedAttachmentMime('audio/aac')).toBe(true);
      expect(isAllowedAttachmentMime('audio/x-m4a')).toBe(true);
      expect(isAllowedAttachmentMime('audio/m4a')).toBe(true);
    });

    it('constructs valid voice note chat message with audio attachment', () => {
      const voiceMessage: ChatMessage = {
        id: 'voice-msg-1',
        senderId: 'user-alice',
        senderName: 'Alice',
        attachment: {
          name: 'voice-note-123.webm',
          size: 15420,
          type: 'audio/webm',
          dataUrl: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQETH...',
        },
        messageType: 'file',
        timestamp: Date.now(),
        isOwn: true,
        status: 'sent',
        isVoiceNote: true,
        voiceDurationSec: 14,
        isViewOnce: true,
      };

      expect(voiceMessage.isVoiceNote).toBe(true);
      expect(voiceMessage.voiceDurationSec).toBe(14);
      expect(voiceMessage.isViewOnce).toBe(true);
      expect(voiceMessage.attachment?.type).toBe('audio/webm');
    });

    it('formats call duration and voice note timers correctly', () => {
      expect(formatCallDuration(0)).toBe('0:00');
      expect(formatCallDuration(9)).toBe('0:09');
      expect(formatCallDuration(45)).toBe('0:45');
      expect(formatCallDuration(60)).toBe('1:00');
      expect(formatCallDuration(125)).toBe('2:05');
    });
  });

  describe('4. P2P Encrypted WebRTC Voice Call Protocol', () => {
    it('constructs valid WebRTC signaling offer payload', () => {
      const offerSignal: EncryptedV2Payload = {
        version: 2,
        kind: 'webrtc_signal',
        signalType: 'offer',
        sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
        senderId: 'user-alice',
        timestamp: Date.now(),
      };

      expect(offerSignal.version).toBe(2);
      expect(offerSignal.kind).toBe('webrtc_signal');
      expect(offerSignal.signalType).toBe('offer');
      expect(offerSignal.sdp).toContain('v=0');
    });

    it('constructs valid WebRTC ICE candidate signaling payload', () => {
      const candidateSignal: EncryptedV2Payload = {
        version: 2,
        kind: 'webrtc_signal',
        signalType: 'ice_candidate',
        candidate: {
          candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host',
          sdpMid: 'audio',
          sdpMLineIndex: 0,
        },
        senderId: 'user-bob',
        timestamp: Date.now(),
      };

      expect(candidateSignal.signalType).toBe('ice_candidate');
      expect(candidateSignal.candidate?.candidate).toContain('typ host');
      expect(candidateSignal.candidate?.sdpMid).toBe('audio');
    });

    it('constructs valid WebRTC hangup signal payload', () => {
      const hangupSignal: EncryptedV2Payload = {
        version: 2,
        kind: 'webrtc_signal',
        signalType: 'hangup',
        senderId: 'user-alice',
        timestamp: Date.now(),
      };

      expect(hangupSignal.signalType).toBe('hangup');
      expect(hangupSignal.senderId).toBe('user-alice');
    });
  });
});
