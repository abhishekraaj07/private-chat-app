import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  splitUrlAndTrailingPunctuation,
  isSafeWebUrl,
  renderFormattedMessageText,
} from '../src/utils/textFormatter.tsx';
import { incomingCallRingtone } from '../src/utils/ringtone.ts';

describe('NEXUS Final UX Polish & Production Improvements (Steps 1 to 5)', () => {
  const headerFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/Header.tsx'),
    'utf-8'
  );

  const chatRoomPageFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/pages/ChatRoomPage.tsx'),
    'utf-8'
  );

  const voiceCallModalFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/VoiceCallModal.tsx'),
    'utf-8'
  );

  const chatAreaFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/ChatArea.tsx'),
    'utf-8'
  );

  const useTabNotificationsFile = fs.readFileSync(
    path.resolve(__dirname, '../src/hooks/useTabNotifications.ts'),
    'utf-8'
  );

  // =========================================================================
  // STEP 1 — Clickable Links & Inline Code Formatting
  // =========================================================================
  describe('STEP 1: Clickable Safe Links & Inline Backtick Code', () => {
    it('splits trailing punctuation correctly from URLs', () => {
      expect(splitUrlAndTrailingPunctuation('https://example.com.')).toEqual({
        url: 'https://example.com',
        trailing: '.',
      });
      expect(splitUrlAndTrailingPunctuation('https://example.com/path,')).toEqual({
        url: 'https://example.com/path',
        trailing: ',',
      });
      expect(splitUrlAndTrailingPunctuation('https://example.com/test!')).toEqual({
        url: 'https://example.com/test',
        trailing: '!',
      });
      expect(splitUrlAndTrailingPunctuation('https://example.com)')).toEqual({
        url: 'https://example.com',
        trailing: ')',
      });
    });

    it('validates safe web URLs (http/https) and rejects dangerous schemes', () => {
      expect(isSafeWebUrl('https://example.com')).toBe(true);
      expect(isSafeWebUrl('http://docs.nexus.internal:8080/api')).toBe(true);
      expect(isSafeWebUrl('https://github.com/example/repo?param=value#anchor')).toBe(true);

      // Dangerous schemes must be rejected
      expect(isSafeWebUrl('javascript:alert(1)')).toBe(false);
      expect(isSafeWebUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeWebUrl('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeWebUrl('file:///C:/Windows/System32')).toBe(false);
      expect(isSafeWebUrl('not a url')).toBe(false);
    });

    it('ChatArea uses renderFormattedMessageText for message rendering', () => {
      expect(chatAreaFile).toContain('renderFormattedMessageText');
      expect(chatAreaFile).toContain('textFormatter');
    });
  });

  // =========================================================================
  // STEP 2 — Incoming Call Ringtone
  // =========================================================================
  describe('STEP 2: Incoming Call Ringtone & Audio Lifecycle', () => {
    it('provides ringtone controller with start, stop, and user sound preferences', () => {
      expect(incomingCallRingtone).toBeDefined();
      expect(typeof incomingCallRingtone.start).toBe('function');
      expect(typeof incomingCallRingtone.stop).toBe('function');
      expect(typeof incomingCallRingtone.isEnabled).toBe('function');
      expect(typeof incomingCallRingtone.setEnabled).toBe('function');

      // Test sound preference toggle
      const initial = incomingCallRingtone.isEnabled();
      incomingCallRingtone.setEnabled(false);
      expect(incomingCallRingtone.isEnabled()).toBe(false);
      incomingCallRingtone.setEnabled(initial);
      expect(incomingCallRingtone.isEnabled()).toBe(initial);
    });

    it('VoiceCallModal starts ringtone only on incoming call and cleans up on accept/reject', () => {
      expect(voiceCallModalFile).toContain("callState === 'incoming'");
      expect(voiceCallModalFile).toContain('incomingCallRingtone.start()');
      expect(voiceCallModalFile).toContain('incomingCallRingtone.stop()');
      expect(voiceCallModalFile).toContain('handleAcceptWithRingtoneStop');
      expect(voiceCallModalFile).toContain('handleRejectWithRingtoneStop');
    });
  });

  // =========================================================================
  // STEP 3 — Header Micro-Polish
  // =========================================================================
  describe('STEP 3: Header Micro-Polish (Normalized Height & Alignment)', () => {
    it('normalizes header action buttons to h-8 visual axis', () => {
      expect(headerFile).toContain('id="header-disappearing-btn"');
      expect(headerFile).toContain('h-8 inline-flex items-center justify-center');
      expect(headerFile).toContain('id="header-voice-call-btn"');
      expect(headerFile).toContain('id="header-leave-btn"');
      expect(headerFile).toContain('id="header-menu-btn"');
      expect(headerFile).toContain('w-8 h-8 rounded-lg');
    });

    it('preserves existing 3-dot overflow menu without hamburger navigation', () => {
      expect(headerFile).toContain('MoreVertical');
      expect(headerFile).not.toContain('HamburgerButton');
      expect(headerFile).not.toContain('NavigationMenu');
    });

    it('preserves central SECURE / Security status badge', () => {
      expect(headerFile).toContain('getStatusDisplay()');
      expect(headerFile).toContain('SECURE');
    });
  });

  // =========================================================================
  // STEP 4 — Waiting-State UX Polish
  // =========================================================================
  describe('STEP 4: Waiting-State UX Polish (4-Tier Hierarchy)', () => {
    it('contains clear 4-tier visual hierarchy in waiting card', () => {
      // 1. Primary Heading
      expect(chatRoomPageFile).toContain('Waiting for your peer');
      expect(chatRoomPageFile).toContain('Share the room code or link to start a private conversation.');

      // 2. Action / Room Code
      expect(chatRoomPageFile).toContain('copyToClipboard(roomCode)');
      expect(chatRoomPageFile).toContain('Copy code');
      expect(chatRoomPageFile).toContain('Copy link');

      // 3. Status
      expect(chatRoomPageFile).toContain('Secure connection ready');
      expect(chatRoomPageFile).toContain('Waiting for peer');

      // 4. Technical Security Detail
      expect(chatRoomPageFile).toContain('Waiting for peer key agreement (AES-256-GCM / ECDH P-256)');
    });

    it('preserves empty chat state in ChatArea', () => {
      expect(chatAreaFile).toContain('id="nexus-empty-chat-state"');
      expect(chatAreaFile).toContain('No messages yet');
      expect(chatAreaFile).toContain('Start a secure conversation.');
    });
  });

  // =========================================================================
  // STEP 5 — Background Tab / Inactive Chat Notifications
  // =========================================================================
  describe('STEP 5: Background Tab & Inactive Chat Notifications', () => {
    it('implements useTabNotifications hook with document.hidden detection', () => {
      expect(useTabNotificationsFile).toContain('document.hidden');
      expect(useTabNotificationsFile).toContain('visibilitychange');
      expect(useTabNotificationsFile).toContain('notifyIncomingMessage');
      expect(useTabNotificationsFile).toContain('clearNotifications');
      expect(useTabNotificationsFile).toContain('New Message');
    });

    it('protects message privacy: never puts decrypted message text into notifications', () => {
      // Must use generic privacy string "New encrypted message", never plain message content
      expect(useTabNotificationsFile).toContain("'New encrypted message'");
      expect(useTabNotificationsFile).not.toContain('item.text');
      expect(useTabNotificationsFile).not.toContain('message.text');
      expect(useTabNotificationsFile).not.toContain('msg.text');
    });

    it('wires useTabNotifications in ChatRoomPage', () => {
      expect(chatRoomPageFile).toContain('useTabNotifications');
      expect(chatRoomPageFile).toContain('notifyIncomingMessage');
    });
  });
});
