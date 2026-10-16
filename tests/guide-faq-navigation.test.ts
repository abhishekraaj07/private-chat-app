import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('NEXUS 3-Dot Navigation with Guide & FAQ (Inside and Outside Room)', () => {
  const headerFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/Header.tsx'),
    'utf-8'
  );

  const landingPageFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/pages/LandingPage.tsx'),
    'utf-8'
  );

  const chatRoomPageFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/pages/ChatRoomPage.tsx'),
    'utf-8'
  );

  const appFile = fs.readFileSync(
    path.resolve(__dirname, '../src/App.tsx'),
    'utf-8'
  );

  const guideModalFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/GuideModal.tsx'),
    'utf-8'
  );

  const faqModalFile = fs.readFileSync(
    path.resolve(__dirname, '../src/client/components/FaqModal.tsx'),
    'utf-8'
  );

  describe('1. Inside Room 3-Dot Menu (Header.tsx)', () => {
    it('contains the 3-dot menu button with id="header-menu-btn"', () => {
      expect(headerFile).toContain('id="header-menu-btn"');
      expect(headerFile).toContain('MoreVertical');
    });

    it('contains User Guide button with id="header-guide-btn" inside 3-dot menu', () => {
      expect(headerFile).toContain('id="header-guide-btn"');
      expect(headerFile).toContain('User Guide');
    });

    it('contains FAQ button with id="header-faq-btn" inside 3-dot menu', () => {
      expect(headerFile).toContain('id="header-faq-btn"');
      expect(headerFile).toContain('FAQ');
    });

    it('preserves room actions (Search, Copy, Inspector, Burn) and ensures QR is removed', () => {
      expect(headerFile).toContain('id="header-search-btn"');
      expect(headerFile).toContain('id="header-copy-code-btn"');
      expect(headerFile).not.toContain('id="header-qr-code-btn"');
      expect(headerFile).toContain('id="header-room-inspector-btn"');
      expect(headerFile).toContain('id="header-burn-room-btn"');
    });

    it('positions Disappearing Messages Timer outside 3-dot menu as direct header action', () => {
      expect(headerFile).toContain('Direct Header Action: Disappearing Messages Timer');
      expect(headerFile).toContain('id="header-disappearing-btn"');
    });

    it('preserves direct Header Leave Room action outside dropdown', () => {
      expect(headerFile).toContain('Direct Header Action: Leave Room');
      expect(headerFile).toContain('id="header-leave-btn"');
    });
  });

  describe('2. Outside Room 3-Dot Menu (LandingPage.tsx)', () => {
    it('contains the 3-dot menu button with id="landing-menu-btn"', () => {
      expect(landingPageFile).toContain('id="landing-menu-btn"');
      expect(landingPageFile).toContain('MoreVertical');
    });

    it('contains Features, Guide, Security, and FAQ in the landing 3-dot dropdown', () => {
      expect(landingPageFile).toContain('id="landing-menu-features-btn"');
      expect(landingPageFile).toContain('id="landing-menu-guide-btn"');
      expect(landingPageFile).toContain('id="landing-menu-security-btn"');
      expect(landingPageFile).toContain('id="landing-menu-faq-btn"');
    });

    it('does not contain duplicate outer security button on top bar', () => {
      expect(landingPageFile).not.toContain('id="landing-security-link"');
    });
  });

  describe('3. GuideModal & FaqModal Integration', () => {
    it('wires GuideModal and FaqModal in ChatRoomPage', () => {
      expect(chatRoomPageFile).toContain('<GuideModal');
      expect(chatRoomPageFile).toContain('<FaqModal');
      expect(chatRoomPageFile).toContain('isGuideOpen');
      expect(chatRoomPageFile).toContain('isFaqOpen');
    });

    it('wires GuideModal and FaqModal in App.tsx', () => {
      expect(appFile).toContain('<GuideModal');
      expect(appFile).toContain('<FaqModal');
      expect(appFile).toContain('isGuideOpen');
      expect(appFile).toContain('isFaqOpen');
    });

    it('contains complete 5 operational guide steps', () => {
      expect(guideModalFile).toContain('Create & Share Room');
      expect(guideModalFile).toContain('Zero-Knowledge Key Agreement');
      expect(guideModalFile).toContain('Encrypted Messaging & 1× Media');
      expect(guideModalFile).toContain('Voice Notes & P2P Calling');
      expect(guideModalFile).toContain('Auto-Expiry & Panic Burn');
    });

    it('contains complete 6 FAQ answers', () => {
      expect(faqModalFile).toContain('Are my messages, media, or calls stored on any server?');
      expect(faqModalFile).toContain('Who generates and controls the encryption keys?');
      expect(faqModalFile).toContain('How long do private rooms stay active?');
      expect(faqModalFile).toContain('How does 1× View-Once media protection work?');
      expect(faqModalFile).toContain('What happens when I click BURN ROOM?');
      expect(faqModalFile).toContain('Can a third party enter or eavesdrop on my room?');
    });
  });
});
