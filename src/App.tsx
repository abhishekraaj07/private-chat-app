/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LandingPage } from './client/pages/LandingPage.tsx';
import { CreateRoomPage } from './client/pages/CreateRoomPage.tsx';
import { JoinRoomPage } from './client/pages/JoinRoomPage.tsx';
import { ChatRoomPage } from './client/pages/ChatRoomPage.tsx';
import { SecurityModal } from './client/components/SecurityModal.tsx';
import { AboutModal } from './client/components/AboutModal.tsx';
import { GuideModal } from './client/components/GuideModal.tsx';
import { FaqModal } from './client/components/FaqModal.tsx';
import { normalizeRoomCode, isValidRoomCode } from './utils/room-code.ts';
import { setupPanicHotkeys } from './client/utils/duressWipe.ts';

type AppView = 'landing' | 'create' | 'join' | 'chat';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [roomCode, setRoomCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [participantId, setParticipantId] = useState<string>('');
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);

  // Setup Panic/Duress Hotkey (Ctrl+Alt+Q) & participant ID
  useEffect(() => {
    const cleanupPanic = setupPanicHotkeys();

    let id = '';
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      id = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    setParticipantId(id);

    // Check URL parameters for direct room code joining (e.g., /?room=K7M4PX, #join=K7M4PX, #K7M4PX, or /K7M4PX)
    const searchParams = new URLSearchParams(window.location.search);
    const pathParts = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/');
    const pathCandidate = pathParts.length === 1 && pathParts[0] ? pathParts[0] : (pathParts[0] === 'room' ? pathParts[1] : '');

    let urlRoom = searchParams.get('room') || searchParams.get('join') || '';
    const hash = window.location.hash.replace(/^#/, '');
    if (!urlRoom && hash) {
      if (hash.includes('=')) {
        const hashParams = new URLSearchParams(hash);
        urlRoom = hashParams.get('join') || hashParams.get('room') || '';
      } else {
        urlRoom = hash;
      }
    }
    if (!urlRoom && pathCandidate) {
      urlRoom = pathCandidate;
    }

    if (urlRoom) {
      const normalized = normalizeRoomCode(urlRoom);
      if (isValidRoomCode(normalized)) {
        setRoomCode(normalized);
        setView('join');
      }
    }

    return () => {
      cleanupPanic();
    };
  }, []);

  const handleEnterRoom = (code: string, name: string) => {
    setRoomCode(code);
    setDisplayName(name);
    setView('chat');
  };

  const handleLeaveRoom = () => {
    setView('landing');
    setRoomCode('');
    // Clear room from URL hash/query
    if (window.location.search || window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090B] text-[#EDEDED] font-sans antialiased">
      {view === 'landing' && (
        <LandingPage
          onCreateRoom={() => setView('create')}
          onJoinRoom={() => setView('join')}
          onOpenSecurity={() => setIsSecurityOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenFaq={() => setIsFaqOpen(true)}
        />
      )}

      {view === 'create' && (
        <CreateRoomPage
          onBack={() => setView('landing')}
          onEnterRoom={handleEnterRoom}
        />
      )}

      {view === 'join' && (
        <JoinRoomPage
          initialRoomCode={roomCode}
          onBack={() => setView('landing')}
          onJoinRoom={handleEnterRoom}
        />
      )}

      {view === 'chat' && roomCode && (
        <ChatRoomPage
          roomCode={roomCode}
          participantId={participantId}
          displayName={displayName || 'Anonymous'}
          onLeave={handleLeaveRoom}
        />
      )}

      <SecurityModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <GuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <FaqModal
        isOpen={isFaqOpen}
        onClose={() => setIsFaqOpen(false)}
      />
    </div>
  );
}
