import { describe, it, expect } from 'vitest';
import { processNexusBotCommand } from '../src/client/utils/nexusBotEngine.ts';
import { executePanicWipe, setupPanicHotkeys } from '../src/client/utils/duressWipe.ts';
import { NexusP2PManager } from '../src/client/utils/webrtcP2P.ts';

describe('NEXUS Next-Gen Feature Engines', () => {
  describe('Zero-Trace Client-Side Bot (@nexus)', () => {
    it('recognizes @nexus and @bot prefixes', () => {
      const res1 = processNexusBotCommand('@nexus help');
      expect(res1.isBotCommand).toBe(true);
      expect(res1.replyText).toContain('NEXUS Private Bot Help');

      const res2 = processNexusBotCommand('@bot help');
      expect(res2.isBotCommand).toBe(true);

      const nonBot = processNexusBotCommand('hello there');
      expect(nonBot.isBotCommand).toBe(false);
    });

    it('evaluates safe math expressions without cloud queries', () => {
      const res = processNexusBotCommand('@nexus calc 45 * 2 + 10');
      expect(res.isBotCommand).toBe(true);
      expect(res.replyText).toContain('100');
    });

    it('inspects cryptographic parameters safely', () => {
      const res = processNexusBotCommand('@nexus cipher secret-phrase');
      expect(res.isBotCommand).toBe(true);
      expect(res.replyText).toContain('AES-256-GCM');
      expect(res.replyText).toContain('ECDH NIST P-256');
    });

    it('supports coin flip and dice rolls', () => {
      const flip = processNexusBotCommand('@nexus flip');
      expect(flip.isBotCommand).toBe(true);
      expect(flip.replyText).toMatch(/HEADS|TAILS/);

      const roll = processNexusBotCommand('@nexus roll');
      expect(roll.isBotCommand).toBe(true);
      expect(roll.replyText).toContain('Random Roll');
    });

    it('returns time in UTC', () => {
      const res = processNexusBotCommand('@nexus time');
      expect(res.isBotCommand).toBe(true);
      expect(res.replyText).toContain('Relay Timestamp:');
    });
  });

  describe('Duress / Panic Screen Wipe', () => {
    it('exports executePanicWipe and setupPanicHotkeys and is safe in Node/browser environments', () => {
      expect(typeof executePanicWipe).toBe('function');
      expect(typeof setupPanicHotkeys).toBe('function');
      expect(() => executePanicWipe()).not.toThrow();
      const cleanup = setupPanicHotkeys();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('WebRTC P2P DataChannel Manager', () => {
    it('initializes NexusP2PManager with signaling callback', () => {
      const signalingMessages: any[] = [];
      const manager = new NexusP2PManager((msg) => {
        signalingMessages.push(msg);
      });
      expect(manager).toBeDefined();
    });
  });
});
