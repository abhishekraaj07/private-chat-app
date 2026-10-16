import { describe, it, expect } from 'vitest';
import {
  validateRoomCode,
  validateUsername,
  validateMessagePayload,
  validateClientMessage,
  validatePublicKeyJwk,
  isSafeObject,
  isAllowedAttachmentMime,
} from '../worker/validation.ts';

describe('Server-Side Protocol & Input Validation', () => {
  describe('validateRoomCode', () => {
    it('accepts valid 6-8 character codes', () => {
      expect(validateRoomCode('K7M4PX').valid).toBe(true);
      expect(validateRoomCode(' 234567 ').valid).toBe(true);
      expect(validateRoomCode('23456789').valid).toBe(true);
    });

    it('rejects invalid room codes', () => {
      expect(validateRoomCode('').valid).toBe(false);
      expect(validateRoomCode('12345').valid).toBe(false); // too short
      expect(validateRoomCode('K7M4P0').valid).toBe(false); // contains '0'
      expect(validateRoomCode(null).valid).toBe(false);
      expect(validateRoomCode(123456).valid).toBe(false);
    });
  });

  describe('validateUsername', () => {
    it('accepts valid display names', () => {
      const res = validateUsername('Alex');
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBe('Alex');
    });

    it('strips non-printable control characters', () => {
      const res = validateUsername('Alex\u0000\u0007');
      expect(res.valid).toBe(true);
      expect(res.sanitized).toBe('Alex');
    });

    it('rejects empty or whitespace-only names', () => {
      expect(validateUsername('').valid).toBe(false);
      expect(validateUsername('   ').valid).toBe(false);
      expect(validateUsername(undefined).valid).toBe(false);
    });

    it('rejects names exceeding max length', () => {
      const longName = 'A'.repeat(33);
      expect(validateUsername(longName).valid).toBe(false);
    });
  });

  describe('validateMessagePayload', () => {
    it('accepts well-formed encrypted message payloads', () => {
      const validPayload = {
        messageId: 'msg-12345',
        iv: 'A'.repeat(16), // 16-char base64 for 12 bytes
        ciphertext: 'base64ciphertextstring==',
        timestamp: Date.now(),
      };
      const res = validateMessagePayload(validPayload);
      expect(res.valid).toBe(true);
      expect(res.sanitized?.messageId).toBe('msg-12345');
    });

    it('rejects payloads with missing or malformed attributes', () => {
      expect(validateMessagePayload({}).valid).toBe(false);
      expect(validateMessagePayload({ messageId: '' }).valid).toBe(false);
      expect(validateMessagePayload({ messageId: '1', iv: 'short' }).valid).toBe(false);
      expect(
        validateMessagePayload({
          messageId: '1',
          iv: 'A'.repeat(16),
          ciphertext: '',
        }).valid
      ).toBe(false);
    });

    it('rejects timestamps with excessive clock drift', () => {
      const res = validateMessagePayload({
        messageId: 'msg-1',
        iv: 'A'.repeat(16),
        ciphertext: 'cipher',
        timestamp: Date.now() - 20 * 60 * 1000, // 20 mins ago
      });
      expect(res.valid).toBe(false);
    });
  });

  describe('validatePublicKeyJwk', () => {
    it('accepts valid EC P-256 public JWKs', () => {
      const jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: 'f83OJ3D2xFmT4vGLKD_EEN09',
        y: 'x_da7W5PBEV5174bE_G-35b9',
      };
      const res = validatePublicKeyJwk(jwk);
      expect(res.valid).toBe(true);
      expect(res.sanitized?.kty).toBe('EC');
    });

    it('rejects non-EC or non-P-256 keys', () => {
      expect(validatePublicKeyJwk({ kty: 'RSA' }).valid).toBe(false);
      expect(validatePublicKeyJwk({ kty: 'EC', crv: 'P-384' }).valid).toBe(false);
      expect(validatePublicKeyJwk(null).valid).toBe(false);
    });
  });

  describe('validateClientMessage', () => {
    it('validates join message', () => {
      const res = validateClientMessage({
        type: 'join',
        roomCode: 'K7M4PX',
        participantId: 'user-1',
        displayName: 'Sam',
      });
      expect(res.valid).toBe(true);
      expect(res.sanitized?.type).toBe('join');
    });

    it('validates ping message', () => {
      const res = validateClientMessage({ type: 'ping' });
      expect(res.valid).toBe(true);
      expect(res.sanitized?.type).toBe('ping');
    });

    it('rejects unknown message type', () => {
      const res = validateClientMessage({ type: 'hack' });
      expect(res.valid).toBe(false);
    });
  });

  describe('isSafeAttachmentUrl sanitization', () => {
    // Dynamic import to test client-side sanitization helper
    it('accepts safe image data URLs and blob URIs', async () => {
      const { isSafeAttachmentUrl } = await import('../src/hooks/useRoomSocket.ts');
      expect(isSafeAttachmentUrl('blob:http://localhost:5173/1234-5678')).toBe(true);
      expect(isSafeAttachmentUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE=')).toBe(true);
      expect(isSafeAttachmentUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
      expect(isSafeAttachmentUrl('data:application/pdf;base64,JVBERi0xLjc=')).toBe(true);
    });

    it('rejects dangerous execution schemes and HTML data URLs', async () => {
      const { isSafeAttachmentUrl } = await import('../src/hooks/useRoomSocket.ts');
      expect(isSafeAttachmentUrl('javascript:alert(document.cookie)')).toBe(false);
      expect(isSafeAttachmentUrl('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeAttachmentUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeAttachmentUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeAttachmentUrl('data:application/xhtml+xml;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
      expect(isSafeAttachmentUrl('https://evil.com/malware.exe')).toBe(false);
      expect(isSafeAttachmentUrl('')).toBe(false);
      expect(isSafeAttachmentUrl(undefined)).toBe(false);
    });
  });

  describe('Prototype Pollution Protection (isSafeObject)', () => {
    it('accepts safe flat objects', () => {
      expect(isSafeObject({ a: 1, b: 'test' })).toBe(true);
      expect(isSafeObject({})).toBe(true);
    });

    it('rejects objects with polluted keys', () => {
      expect(isSafeObject({ __proto__: { admin: true } })).toBe(false);
      expect(isSafeObject({ constructor: 'malicious' })).toBe(false);
      expect(isSafeObject({ prototype: 'bad' })).toBe(false);
    });

    it('rejects nested polluted objects', () => {
      expect(isSafeObject({ safe: { __proto__: {} } })).toBe(false);
      expect(isSafeObject({ nested: [{ constructor: {} }] })).toBe(false);
    });
  });

  describe('Attachment MIME Whitelist (isAllowedAttachmentMime)', () => {
    it('accepts whitelisted media formats', () => {
      expect(isAllowedAttachmentMime('image/jpeg')).toBe(true);
      expect(isAllowedAttachmentMime('image/png')).toBe(true);
      expect(isAllowedAttachmentMime('image/webp')).toBe(true);
      expect(isAllowedAttachmentMime('image/gif')).toBe(true);
      expect(isAllowedAttachmentMime('application/pdf')).toBe(true);
      expect(isAllowedAttachmentMime('text/plain')).toBe(true);
    });

    it('rejects dangerous and executable types', () => {
      expect(isAllowedAttachmentMime('text/html')).toBe(false);
      expect(isAllowedAttachmentMime('image/svg+xml')).toBe(false);
      expect(isAllowedAttachmentMime('application/javascript')).toBe(false);
      expect(isAllowedAttachmentMime('application/x-msdownload')).toBe(false);
      expect(isAllowedAttachmentMime('application/octet-stream')).toBe(false);
      expect(isAllowedAttachmentMime('')).toBe(false);
      expect(isAllowedAttachmentMime(undefined as unknown as string)).toBe(false);
    });
  });
});
