import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Production Release Hardening & Safe Confirmations', () => {
  const headerFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/Header.tsx'),
    'utf-8'
  );

  const chatRoomPageFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/pages/ChatRoomPage.tsx'),
    'utf-8'
  );

  const chatAreaFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/ChatArea.tsx'),
    'utf-8'
  );

  const confirmModalFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/ConfirmationModal.tsx'),
    'utf-8'
  );

  describe('1. Security Label & Unified Branding Hardening', () => {
    it('does NOT contain the old "SECURE / VERIFICATION REQUIRED" label anywhere in Header', () => {
      expect(headerFile).not.toContain('SECURE / VERIFICATION REQUIRED');
    });

    it('contains clean "SECURE" text for the unverified active encrypted session', () => {
      expect(headerFile).toContain('SECURE</span>');
    });

    it('preserves "SECURE &amp; VERIFIED" for verified sessions', () => {
      expect(headerFile).toContain('SECURE &amp; VERIFIED');
    });

    it('renders a unified NEXUS brand element in top-left with Shield + NEXUS wordmark', () => {
      expect(headerFile).toContain('Unified NEXUS Brand Element');
      expect(headerFile).toContain('NEXUS');
    });
  });

  describe('2. Header Layout: Direct Leave Room & 3-Dot Cleanup', () => {
    it('places Leave Room directly in the header action bar', () => {
      expect(headerFile).toContain('Direct Header Action: Leave Room');
      expect(headerFile).toContain('id="header-leave-btn"');
    });

    it('does NOT duplicate Leave Room inside the 3-dot dropdown menu', () => {
      // Find the dropdown menu markup
      const dropdownStart = headerFile.indexOf('{menuOpen && (');
      const dropdownContent = headerFile.slice(dropdownStart);
      expect(dropdownContent).not.toContain('Leave Room</div>');
    });
  });

  describe('3. Leave Room Safe Confirmation', () => {
    it('defines isLeaveConfirmOpen state in ChatRoomPage', () => {
      expect(chatRoomPageFile).toContain('isLeaveConfirmOpen');
    });

    it('requires explicit confirmation before calling leaveRoom()', () => {
      expect(chatRoomPageFile).toContain('setIsLeaveConfirmOpen(true)');
      expect(chatRoomPageFile).toContain('handleConfirmLeave');
    });

    it('renders ConfirmationModal with "Leave this room?" title and description', () => {
      expect(chatRoomPageFile).toContain('title="Leave this room?"');
      expect(chatRoomPageFile).toContain('You will leave this private room and return to the home screen.');
    });
  });

  describe('4. Burn Room Safe Confirmation', () => {
    it('defines isBurnConfirmOpen state in ChatRoomPage', () => {
      expect(chatRoomPageFile).toContain('isBurnConfirmOpen');
    });

    it('requires explicit confirmation before calling burnRoom()', () => {
      expect(chatRoomPageFile).toContain('setIsBurnConfirmOpen(true)');
      expect(chatRoomPageFile).toContain('handleConfirmBurn');
    });

    it('renders ConfirmationModal with BURN ROOM? title and permanent destruction description', () => {
      expect(chatRoomPageFile).toContain('title="BURN ROOM?"');
      expect(chatRoomPageFile).toContain('This will permanently end the current room/session.');
    });
  });

  describe('5. Security Information Tooltip & Clean Empty State', () => {
    it('has security information tooltip with accessible popover in ChatArea', () => {
      expect(chatAreaFile).toContain('isInfoTooltipOpen');
      expect(chatAreaFile).toContain('Security Architecture');
      expect(chatAreaFile).toContain('ZERO-KNOWLEDGE RELAY');
    });

    it('displays subtle empty state when there are no chat messages', () => {
      expect(chatAreaFile).toContain('id="nexus-empty-chat-state"');
      expect(chatAreaFile).toContain('No messages yet');
      expect(chatAreaFile).toContain('Start a secure conversation.');
    });
  });

  describe('6. Accessible ConfirmationModal Architecture', () => {
    it('has alertdialog ARIA role and accessibility attributes', () => {
      expect(confirmModalFile).toContain('role="alertdialog"');
      expect(confirmModalFile).toContain('aria-modal="true"');
      expect(confirmModalFile).toContain('aria-labelledby="confirm-modal-title"');
      expect(confirmModalFile).toContain('aria-describedby="confirm-modal-desc"');
    });

    it('listens for Escape key to safely cancel/close dialog', () => {
      expect(confirmModalFile).toContain("e.key === 'Escape'");
    });

    it('ensures cancel button has default focus to prevent accidental enter', () => {
      expect(confirmModalFile).toContain('cancelBtnRef.current?.focus()');
    });
  });
});
