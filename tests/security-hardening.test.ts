import { describe, it, expect } from 'vitest';
import worker from '../worker/index.ts';
import { Env } from '../worker/types.ts';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from '../src/crypto/e2e.ts';
import {
  isSafeObject,
  validateRoomCode,
  validateUsername,
  validatePublicKeyJwk,
  validateMessagePayload,
  isAllowedAttachmentMime,
} from '../worker/validation.ts';

describe('NEXUS Production Security Hardening & Negative Fuzzing', () => {
  const mockEnv: Env = {
    ROOMS: {
      idFromName: (name: string) => ({ toString: () => 'id-' + name }),
      get: () => ({
        fetch: async (req: Request | string) => {
          const urlStr = typeof req === 'string' ? req : req.url;
          if (urlStr.includes('/info')) {
            return new Response(JSON.stringify({ roomCode: 'ABCDEF', participantCount: 1, maxParticipants: 2 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200 });
        },
      }),
    },
  };

  describe('1. Strict CORS & Security Header Enforcement', () => {
    it('rejects preflight OPTIONS from untrusted origins with 403 Forbidden', async () => {
      const req = new Request('https://nexus.test/api/rooms', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil-attacker.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(403);
      expect(await res.text()).toContain('CORS Preflight Forbidden');
    });

    it('rejects API requests from untrusted origins with 403 Forbidden', async () => {
      const req = new Request('https://nexus.test/api/rooms', {
        method: 'POST',
        headers: {
          Origin: 'https://malicious-site.org',
          'Content-Type': 'application/json',
        },
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Origin not allowed by CORS policy');
    });

    it('allows preflight OPTIONS from trusted origins and includes Vary: Origin', async () => {
      const trustedOrigin = 'https://localhost:5173';
      const req = new Request('https://nexus.test/api/rooms', {
        method: 'OPTIONS',
        headers: {
          Origin: trustedOrigin,
          'Access-Control-Request-Method': 'POST',
        },
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(trustedOrigin);
      expect(res.headers.get('Vary')).toBe('Origin');
    });

    it('allows same-origin API requests and emits full suite of security headers', async () => {
      const req = new Request('https://nexus.test/api/rooms', {
        method: 'POST',
        headers: {
          Origin: 'https://nexus.test',
          'Content-Type': 'application/json',
        },
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(201);

      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(self), geolocation=()');
      expect(res.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains; preload');
      expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');

      const csp = res.headers.get('Content-Security-Policy') || '';
      expect(csp).toContain("script-src 'self'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-eval'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('2. Cryptographic Negative Fuzzing & Integrity Verification', () => {
    it('detects and rejects ciphertext tampering via AES-256-GCM authentication tag', async () => {
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();
      const sharedKey = await deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

      const plaintext = 'Sensitive intelligence payload';
      const encrypted = await encryptMessage(sharedKey, plaintext);

      const rawBytes = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));
      rawBytes[rawBytes.length - 2] ^= 0x01;
      const tamperedCiphertext = btoa(String.fromCharCode(...rawBytes));

      await expect(
        decryptMessage(sharedKey, tamperedCiphertext, encrypted.iv)
      ).rejects.toThrow(/Decryption failed/);
    });

    it('rejects tampered AAD (roomCode / senderId / messageId mismatch)', async () => {
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();
      const sharedKey = await deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

      const aadOriginal = {
        version: 2,
        roomCode: 'ALPHA1',
        senderId: 'alice',
        messageId: 'msg-100',
        type: 'message',
      };

      const encrypted = await encryptMessage(sharedKey, 'Secret message', aadOriginal);

      const aadForgedRoom = { ...aadOriginal, roomCode: 'BRAVO2' };
      await expect(
        decryptMessage(sharedKey, encrypted.ciphertext, encrypted.iv, aadForgedRoom)
      ).rejects.toThrow(/Decryption failed/);

      const aadForgedSender = { ...aadOriginal, senderId: 'eve' };
      await expect(
        decryptMessage(sharedKey, encrypted.ciphertext, encrypted.iv, aadForgedSender)
      ).rejects.toThrow(/Decryption failed/);
    });

    it('rejects invalid IV length (must be exactly 12 bytes / 96 bits)', async () => {
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();
      const sharedKey = await deriveSharedSecret(aliceKeys.privateKey, bobKeys.publicKey);

      const encrypted = await encryptMessage(sharedKey, 'Test message');
      const shortIv = btoa('12345678');

      await expect(
        decryptMessage(sharedKey, encrypted.ciphertext, shortIv)
      ).rejects.toThrow(/Invalid IV length: expected 12 bytes/);
    });

    it('rejects malformed JWK public keys during import', async () => {
      const missingCoordJwk: any = {
        kty: 'EC',
        crv: 'P-256',
        x: 'f83OJ3D2xFmTEcKEUSUQ52hYLtmBoOnINeqUK3XVup8',
      };
      await expect(importPublicKey(missingCoordJwk)).rejects.toThrow(/Failed to import peer public key/);

      const wrongCurveJwk: any = {
        kty: 'EC',
        crv: 'P-384',
        x: 'f83OJ3D2xFmTEcKEUSUQ52hYLtmBoOnINeqUK3XVup8',
        y: 'x_da7WygvOEkSuFmGWqrW059zhWxbwmW870qEBxyo6Q',
      };
      await expect(importPublicKey(wrongCurveJwk)).rejects.toThrow(/Failed to import peer public key/);

      const rsaJwk: any = {
        kty: 'RSA',
        crv: 'P-256',
        x: 'abc',
        y: 'def',
      };
      await expect(importPublicKey(rsaJwk)).rejects.toThrow(/Failed to import peer public key/);
    });
  });

  describe('3. Server Zero-Trust Input & Prototype Pollution Validation', () => {
    it('blocks prototype pollution objects from passing isSafeObject', () => {
      const pollutedPayload = JSON.parse('{"__proto__":{"admin":true},"data":"test"}');
      expect(isSafeObject(pollutedPayload)).toBe(false);

      const constructorPolluted = JSON.parse('{"constructor":{"prototype":{"injected":true}}}');
      expect(isSafeObject(constructorPolluted)).toBe(false);

      const safePayload = { roomCode: 'ROOM12', messageId: 'm-1', text: 'hello' };
      expect(isSafeObject(safePayload)).toBe(true);
    });

    it('validates and rejects oversized ciphertexts', () => {
      const hugePayload = {
        messageId: 'msg-valid',
        iv: '1234567890123456',
        ciphertext: 'x'.repeat(7 * 1024 * 1024),
        timestamp: Date.now(),
      };
      const result = validateMessagePayload(hugePayload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Ciphertext exceeds max size limit');
    });

    it('validates and rejects clock skew exceeding 10 minutes', () => {
      const futurePayload = {
        messageId: 'msg-valid',
        iv: '1234567890123456',
        ciphertext: 'valid-ciphertext',
        timestamp: Date.now() + 20 * 60 * 1000,
      };
      const result = validateMessagePayload(futurePayload);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Message timestamp skew too large');
    });

    it('sanitizes user display names by stripping control characters', () => {
      const dirtyName = 'Alice\u0000\u0007\u001B[31m';
      const result = validateUsername(dirtyName);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Alice[31m');
    });

    it('rejects empty or whitespace-only display names', () => {
      const result = validateUsername('    \u0000   ');
      expect(result.valid).toBe(false);
    });

    it('strictly enforces allowed MIME types for file attachments', () => {
      expect(isAllowedAttachmentMime('image/png')).toBe(true);
      expect(isAllowedAttachmentMime('image/jpeg')).toBe(true);
      expect(isAllowedAttachmentMime('application/pdf')).toBe(true);
      expect(isAllowedAttachmentMime('audio/webm')).toBe(true);
      expect(isAllowedAttachmentMime('application/x-msdownload')).toBe(false);
      expect(isAllowedAttachmentMime('application/javascript')).toBe(false);
      expect(isAllowedAttachmentMime('text/html')).toBe(false);
    });
  });
});
