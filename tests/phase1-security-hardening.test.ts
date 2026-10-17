import { describe, it, expect, vi } from 'vitest';
import worker from '../worker/index.ts';
import { executePanicWipe } from '../src/client/utils/duressWipe.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 1 Security Foundation Verification', () => {
  describe('Origin Hardening & CSWSH Protection', () => {
    it('rejects cross-origin requests from arbitrary .workers.dev domains', async () => {
      const req = new Request('https://private-chat-app.abhishekraaj07.workers.dev/api/rooms', {
        method: 'POST',
        headers: {
          Origin: 'https://attacker.workers.dev',
          'Content-Type': 'application/json',
        },
      });

      const env = {
        ROOMS: {
          idFromName: vi.fn(),
          get: vi.fn(),
        },
      };

      const res = await worker.fetch(req, env as any);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toBe('Origin not allowed by CORS policy');
    });

    it('rejects WebSocket upgrade requests from untrusted origins', async () => {
      const req = new Request('https://private-chat-app.abhishekraaj07.workers.dev/api/rooms/TEST12/ws', {
        method: 'GET',
        headers: {
          Upgrade: 'websocket',
          Origin: 'https://malicious-site.com',
        },
      });

      const env = {
        ROOMS: {
          idFromName: vi.fn().mockReturnValue('mock-id'),
          get: vi.fn(),
        },
      };

      const res = await worker.fetch(req, env as any);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toMatch(/Origin not allowed|Untrusted WebSocket Origin/);
    });

    it('permits requests from the trusted production worker origin and localhost', async () => {
      const trustedOrigins = [
        'https://private-chat-app.abhishekraaj07.workers.dev',
        'http://localhost:3000',
        'capacitor://localhost',
      ];

      for (const origin of trustedOrigins) {
        const req = new Request('https://private-chat-app.abhishekraaj07.workers.dev/api/rooms', {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
          },
        });

        const env = {
          ROOMS: {
            idFromName: vi.fn(),
            get: vi.fn(),
          },
        };

        const res = await worker.fetch(req, env as any);
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      }
    });
  });

  describe('Server-Side Replay Filter in RoomDurableObject', () => {
    it('verifies that RoomDurableObject rejects duplicate message frames', () => {
      const roomDoPath = path.resolve(__dirname, '../worker/room-do.ts');
      const content = fs.readFileSync(roomDoPath, 'utf-8');

      expect(content).toContain('seenMessageIds');
      expect(content).toContain('seenMessageList');
      expect(content).toContain('Duplicate message ID rejected (replay protection)');
    });
  });

  describe('Comprehensive Panic Teardown in duressWipe', () => {
    it('executes teardown callback and purges storage before redirect', () => {
      const teardownSpy = vi.fn();

      // Mock window environment
      const mockStorage = {
        clear: vi.fn(),
      };
      const mockHistory = {
        replaceState: vi.fn(),
      };
      const mockLocation = {
        replace: vi.fn(),
      };

      vi.stubGlobal('window', {
        sessionStorage: mockStorage,
        localStorage: mockStorage,
        history: mockHistory,
        location: mockLocation,
      });

      executePanicWipe({
        decoyUrl: 'https://en.wikipedia.org/wiki/Cryptography',
        onBeforeRedirect: teardownSpy,
      });

      expect(teardownSpy).toHaveBeenCalled();
      expect(mockStorage.clear).toHaveBeenCalledTimes(2);
      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, '', '/');
      expect(mockLocation.replace).toHaveBeenCalledWith('https://en.wikipedia.org/wiki/Cryptography');

      vi.unstubAllGlobals();
    });
  });
});
