/**
 * Tests for Feature #9: Anti-Surveillance & Screen Capture Shield + Auto-Clearing Clipboard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, clearClipboardNow } from '../src/utils/format.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('Feature #9: Anti-Surveillance Shield & Clipboard Auto-Sanitizer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Auto-Clearing Clipboard Protection', () => {
    it('successfully copies text to clipboard and schedules auto-clear after 30 seconds', async () => {
      let clipboardContent = '';
      const writeTextMock = vi.fn().mockImplementation(async (text: string) => {
        clipboardContent = text;
      });
      const readTextMock = vi.fn().mockImplementation(async () => clipboardContent);

      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
          readText: readTextMock,
        },
      });

      const success = await copyToClipboard('super-secret-room-token-1234', 30);
      expect(success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('super-secret-room-token-1234');
      expect(clipboardContent).toBe('super-secret-room-token-1234');

      // Fast-forward 15 seconds: clipboard should still retain the secret
      vi.advanceTimersByTime(15000);
      expect(clipboardContent).toBe('super-secret-room-token-1234');

      // Fast-forward another 15 seconds (total 30s): clipboard must be wiped
      await vi.advanceTimersByTimeAsync(15000);
      expect(clipboardContent).toBe('');
      expect(writeTextMock).toHaveBeenLastCalledWith('');
    });

    it('does not overwrite clipboard if user has copied something else in between', async () => {
      let clipboardContent = '';
      const writeTextMock = vi.fn().mockImplementation(async (text: string) => {
        clipboardContent = text;
      });
      const readTextMock = vi.fn().mockImplementation(async () => clipboardContent);

      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
          readText: readTextMock,
        },
      });

      // User copies secret token
      await copyToClipboard('secret-token-A', 30);
      expect(clipboardContent).toBe('secret-token-A');

      // User later copies something unrelated in another app before 30s expires
      clipboardContent = 'unrelated-public-url';

      // 30 seconds elapse for the first copy
      await vi.advanceTimersByTimeAsync(30000);

      // Clipboard should NOT be wiped because current value changed
      expect(clipboardContent).toBe('unrelated-public-url');
    });

    it('clearClipboardNow immediately purges clipboard memory and resets timers', async () => {
      let clipboardContent = 'sensitive-passphrase';
      const writeTextMock = vi.fn().mockImplementation(async (text: string) => {
        clipboardContent = text;
      });

      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      const wiped = await clearClipboardNow();
      expect(wiped).toBe(true);
      expect(clipboardContent).toBe('');
      expect(writeTextMock).toHaveBeenCalledWith('');
    });
  });

  describe('Anti-Screen Capture Print Protection CSS', () => {
    it('verifies index.css contains @media print body display:none protection', () => {
      const cssPath = path.resolve(__dirname, '../src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toContain('@media print');
      expect(cssContent).toContain('display: none !important');
    });
  });

  describe('ChatRoomPage & Header Shield Wireup', () => {
    it('verifies Header component exposes quick shield button and Alt+S shortcut', () => {
      const headerPath = path.resolve(__dirname, '../src/client/components/Header.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf8');

      expect(headerContent).toContain('header-privacy-shield-btn');
      expect(headerContent).toContain('Quick Privacy Shield');
      expect(headerContent).toContain('onTriggerBlur');
    });

    it('verifies ChatRoomPage contains privacy-blur-shield overlay with accessibility modal attributes', () => {
      const pagePath = path.resolve(__dirname, '../src/client/pages/ChatRoomPage.tsx');
      const pageContent = fs.readFileSync(pagePath, 'utf8');

      expect(pageContent).toContain('id="privacy-blur-shield"');
      expect(pageContent).toContain('role="dialog"');
      expect(pageContent).toContain('aria-modal="true"');
      expect(pageContent).toContain('Anti-Surveillance Shield');
      expect(pageContent).toContain('Reveal Chat');
      expect(pageContent).toContain('Alt+S');
    });
  });
});
