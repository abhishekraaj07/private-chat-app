/**
 * NEXUS Chat Room Page
 *
 * Primary active conversation view coordinating:
 * - Header with live room metrics & controls
 * - Search bar with match navigation
 * - Pinned messages bar with jump-to-message
 * - ChatArea with encrypted timeline, reply bubbles, and reactions
 * - MessageInput with reply preview, edit banner, and 1× view-once toggle
 * - Ephemeral view-once viewer modal
 * - Disappearing messages configuration modal
 * - Cryptographic Room Inspector & Security verification modals
 * - Toast notification system
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Header } from '../components/Header.tsx';
import { ChatArea } from '../components/ChatArea.tsx';
import { MessageInput } from '../components/MessageInput.tsx';
import { RoomInspector } from '../components/RoomInspector.tsx';
import { SecurityModal } from '../components/SecurityModal.tsx';
import { AboutModal } from '../components/AboutModal.tsx';
import { GuideModal } from '../components/GuideModal.tsx';
import { FaqModal } from '../components/FaqModal.tsx';
import { SearchBar } from '../components/SearchBar.tsx';
import { PinnedBar } from '../components/PinnedBar.tsx';
import { DisappearingModal } from '../components/DisappearingModal.tsx';
import { ViewOnceModal } from '../components/ViewOnceModal.tsx';
import { VoiceCallModal } from '../components/VoiceCallModal.tsx';
import { CalculatorDecoy } from '../components/CalculatorDecoy.tsx';
import { ToastProvider } from '../components/Toast.tsx';
import { ConfirmationModal } from '../components/ConfirmationModal.tsx';
import { useRoomSocket } from '../../hooks/useRoomSocket.ts';
import { useTabNotifications } from '../../hooks/useTabNotifications.ts';
import { ChatMessage, ReplyReference } from '../../types/protocol.ts';
import { AlertCircle, RefreshCw, Copy, Check as CheckIcon, Lock, LogOut, Flame, ShieldCheck } from 'lucide-react';
import { copyToClipboard } from '../../utils/format.ts';
import { getShareableOrigin } from '../../services/api.ts';
import { processNexusBotCommand } from '../utils/nexusBotEngine.ts';

interface ChatRoomPageProps {
  roomCode: string;
  participantId: string;
  displayName: string;
  onLeave: () => void;
}

export const ChatRoomPage: React.FC<ChatRoomPageProps> = ({
  roomCode,
  participantId,
  displayName,
  onLeave,
}) => {
  // Modal & Drawer State
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isDisappearingModalOpen, setIsDisappearingModalOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isBurnConfirmOpen, setIsBurnConfirmOpen] = useState(false);

  // Stealth Decoy & Anti-Surveillance Blur State
  const [isStealthOpen, setIsStealthOpen] = useState(false);
  const [privacyBlurEnabled, setPrivacyBlurEnabled] = useState(true);
  const [isScreenBlurred, setIsScreenBlurred] = useState(false);

  // Waiting-for-peer copy state
  const [waitCopiedCode, setWaitCopiedCode] = useState(false);
  const [waitCopiedLink, setWaitCopiedLink] = useState(false);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Message Action State
  const [replyingTo, setReplyingTo] = useState<ReplyReference | null>(null);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [viewOnceData, setViewOnceData] = useState<{
    isOpen: boolean;
    imageUrl: string;
    senderName: string;
    messageId: string;
  } | null>(null);

  const handleExpired = useCallback(() => {
    // Room TTL expired
  }, []);

  const {
    status,
    participants,
    timeline,
    peerTyping,
    peerLastSeen,
    blockedParticipantIds,
    blockParticipant,
    unblockParticipant,
    errorBanner,
    expiresAt,
    crypto,
    disappearingTtlMs,
    sendMessage,
    retrySendMessage,
    sendReaction,
    sendEdit,
    sendDelete,
    sendPin,
    sendViewOnceAck,
    setDisappearingTimer,
    sendTyping,
    leaveRoom,
    retryConnection,
    burnRoom,
    callState,
    remoteStream,
    isMuted,
    callDuration,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useRoomSocket({
    roomCode,
    participantId,
    displayName,
    onExpired: handleExpired,
  });

  const { notifyIncomingMessage } = useTabNotifications();

  // Watch for new incoming messages from peer while tab may be inactive/hidden
  const prevTimelineLengthRef = useRef(timeline.length);
  useEffect(() => {
    if (timeline.length > prevTimelineLengthRef.current) {
      const lastItem = timeline[timeline.length - 1];
      if (lastItem && lastItem.kind === 'message' && lastItem.senderId !== participantId) {
        notifyIncomingMessage();
      }
    }
    prevTimelineLengthRef.current = timeline.length;
  }, [timeline, participantId, notifyIncomingMessage]);

  // Filter out blocked participants from the active timeline
  const filteredTimeline = useMemo(() => {
    if (blockedParticipantIds.size === 0) return timeline;
    return timeline.filter((item) => {
      if (item.kind === 'message' && blockedParticipantIds.has(item.senderId)) {
        return false;
      }
      return true;
    });
  }, [timeline, blockedParticipantIds]);

  // Calculate search matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return filteredTimeline
      .filter(
        (item): item is ChatMessage =>
          item.kind === 'message' && !item.isDeleted && Boolean(item.text?.toLowerCase().includes(query))
      )
      .map((m) => m.id);
  }, [filteredTimeline, searchQuery]);

  const totalMatches = searchMatches.length;
  const activeMatchMessageId = totalMatches > 0 ? searchMatches[currentMatchIndex] : null;

  const handleSearchQueryChange = (q: string) => {
    setSearchQuery(q);
    setCurrentMatchIndex(0);
  };

  const handleNextMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  };

  const handlePrevMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  // Pinned messages
  const pinnedMessages = useMemo(() => {
    return timeline.filter(
      (item): item is ChatMessage => item.kind === 'message' && Boolean(item.isPinned) && !item.isDeleted
    );
  }, [timeline]);

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-container-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#38BDF8]/60');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[#38BDF8]/60'), 1500);
    }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyingTo({
      messageId: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      snippet: msg.text?.slice(0, 100),
      isFile: Boolean(msg.attachment),
      fileName: msg.attachment?.name,
      isViewOnce: msg.isViewOnce,
    });
    setEditingMessage(null);
  };

  const handleEdit = (msg: ChatMessage) => {
    setEditingMessage({
      id: msg.id,
      text: msg.text || '',
    });
    setReplyingTo(null);
  };

  const handleSaveEdit = (messageId: string, newText: string) => {
    sendEdit(messageId, newText);
    setEditingMessage(null);
  };

  const handleSendMessage = useCallback(
    (
      text: string,
      file?: any,
      replyTo?: ReplyReference,
      isViewOnce?: boolean,
      isVoiceNote?: boolean,
      voiceDurationSec?: number
    ) => {
      sendMessage(text, file, replyTo, isViewOnce, isVoiceNote, voiceDurationSec);

      if (text) {
        const botRes = processNexusBotCommand(text, displayName);
        if (botRes.isBotCommand && botRes.replyText) {
          setTimeout(() => {
            sendMessage(botRes.replyText);
          }, 400);
        }
      }
    },
    [sendMessage, displayName]
  );

  const handleOpenViewOnce = (imageUrl: string, senderName: string, messageId: string) => {
    setViewOnceData({
      isOpen: true,
      imageUrl,
      senderName,
      messageId,
    });
  };

  const handleCloseViewOnce = () => {
    if (viewOnceData) {
      if (viewOnceData.imageUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(viewOnceData.imageUrl);
        } catch {
          // ignore
        }
      }
      sendViewOnceAck(viewOnceData.messageId);
      setViewOnceData(null);
    }
  };

  const handleLeave = () => {
    setIsLeaveConfirmOpen(true);
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    leaveRoom();
    onLeave();
  };

  const handleBurnRoom = useCallback(() => {
    setIsBurnConfirmOpen(true);
  }, []);

  const handleConfirmBurn = useCallback(() => {
    setIsBurnConfirmOpen(false);
    burnRoom();
  }, [burnRoom]);

  // Global keyboard shortcuts (Ctrl+Shift+X for panic burn, Ctrl+K/F for search, Esc to dismiss)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleBurnRoom();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        if (isSearchOpen) setSearchQuery('');
      } else if (e.key === 'Escape') {
        if (isLeaveConfirmOpen) setIsLeaveConfirmOpen(false);
        else if (isBurnConfirmOpen) setIsBurnConfirmOpen(false);
        else if (isInspectorOpen) setIsInspectorOpen(false);
        else if (isSecurityOpen) setIsSecurityOpen(false);
        else if (isAboutOpen) setIsAboutOpen(false);
        else if (isGuideOpen) setIsGuideOpen(false);
        else if (isFaqOpen) setIsFaqOpen(false);
        else if (isDisappearingModalOpen) setIsDisappearingModalOpen(false);
        else if (viewOnceData) handleCloseViewOnce();
        else if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery('');
        } else if (replyingTo) {
          setReplyingTo(null);
        } else if (editingMessage) {
          setEditingMessage(null);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    handleBurnRoom,
    isLeaveConfirmOpen,
    isBurnConfirmOpen,
    isSearchOpen,
    isInspectorOpen,
    isSecurityOpen,
    isAboutOpen,
    isGuideOpen,
    isFaqOpen,
    isDisappearingModalOpen,
    viewOnceData,
    replyingTo,
    editingMessage,
  ]);

  const handlePanicKill = useCallback(() => {
    try {
      leaveRoom();
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.replace('https://www.google.com');
  }, [leaveRoom]);

  // Anti-surveillance auto-blur on tab switch / window blur
  useEffect(() => {
    if (!privacyBlurEnabled) {
      setIsScreenBlurred(false);
      return;
    }

    const handleVisibility = () => {
      if (document.hidden) {
        setIsScreenBlurred(true);
      }
    };

    const handleBlur = () => {
      setIsScreenBlurred(true);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [privacyBlurEnabled]);

  // Global stealth (Ctrl+Alt+C) and panic (Ctrl+Alt+K) shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setIsStealthOpen((v) => !v);
      } else if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlePanicKill();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handlePanicKill]);

  const isInputDisabled = status !== 'connected' || !crypto.isEncrypted;
  let disabledReason: string | undefined;
  if (status === 'connecting') {
    disabledReason = 'Connecting to room relay...';
  } else if (status === 'reconnecting') {
    disabledReason = 'Reconnecting...';
  } else if (status === 'disconnected') {
    disabledReason = 'Disconnected from room';
  } else if (!crypto.isEncrypted) {
    disabledReason = 'Waiting for peer key agreement (AES-256-GCM / ECDH)...';
  }

  return (
    <ToastProvider>
      <div
        id="chat-room-container"
        className="flex flex-col h-[100dvh] w-full bg-[#08090B] text-[#EDEDED] overflow-hidden"
      >
        {/* Top Header */}
        <Header
          roomCode={roomCode}
          connectionStatus={status}
          participantCount={participants.length}
          peerLastSeen={peerLastSeen}
          isEncrypted={crypto.isEncrypted}
          isPeerVerified={crypto.isPeerVerified}
          disappearingTtlMs={disappearingTtlMs}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => {
            setIsSearchOpen((prev) => !prev);
            if (isSearchOpen) setSearchQuery('');
          }}
          onOpenDisappearingModal={() => setIsDisappearingModalOpen(true)}
          onOpenInspector={() => setIsInspectorOpen(true)}
          onOpenSecurity={() => setIsSecurityOpen(true)}
          onBurnRoom={handleBurnRoom}
          onStartCall={startCall}
          canCall={participants.length === 2 && crypto.isEncrypted && status === 'connected'}
          onLeave={handleLeave}
          onOpenGuide={() => setIsGuideOpen(true)}
          onOpenFaq={() => setIsFaqOpen(true)}
          onOpenStealth={() => setIsStealthOpen(true)}
          privacyBlurEnabled={privacyBlurEnabled}
          onTogglePrivacyBlur={() => setPrivacyBlurEnabled((v) => !v)}
          onPanicKill={handlePanicKill}
        />

        {/* Local Blocked Banner */}
        {blockedParticipantIds.size > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-300 font-mono">
            <span>{blockedParticipantIds.size} participant blocked locally.</span>
            <button
              type="button"
              onClick={() => {
                for (const id of Array.from(blockedParticipantIds)) {
                  unblockParticipant(id);
                }
              }}
              className="text-[#38BDF8] hover:underline cursor-pointer"
            >
              Unblock all
            </button>
          </div>
        )}

        {/* Message Search Bar */}
        <SearchBar
          isOpen={isSearchOpen}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchQuery('');
          }}
          searchQuery={searchQuery}
          onQueryChange={handleSearchQueryChange}
          currentMatchIndex={currentMatchIndex}
          totalMatches={totalMatches}
          onNextMatch={handleNextMatch}
          onPrevMatch={handlePrevMatch}
        />

        {/* Pinned Messages Bar */}
        <PinnedBar
          pinnedMessages={pinnedMessages}
          onJumpToMessage={handleJumpToMessage}
          onUnpin={(messageId) => sendPin(messageId, false)}
        />

        {/* Disconnect / Error Banner */}
        {errorBanner && (
          <div className="bg-rose-950/40 border-b border-rose-800/40 px-4 py-2 flex items-center justify-between text-xs text-rose-300 font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{errorBanner}</span>
            </div>
            {status === 'disconnected' && (
              <button
                onClick={retryConnection}
                className="flex items-center gap-1 text-[#38BDF8] hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry connection</span>
              </button>
            )}
          </div>
        )}

        {/* Main Chat Flow */}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* Waiting-for-peer empty state — shown when no peer has joined yet and no messages */}
          {participants.length < 2 &&
            status === 'connected' &&
            filteredTimeline.filter((i) => i.kind === 'message').length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="pointer-events-auto mx-4 w-full max-w-sm text-center space-y-5 px-6 py-8 rounded-2xl bg-[#0D0F12]/90 border border-[#1F242D] shadow-xl backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#111318] border border-[#1F242D] flex items-center justify-center shadow-md">
                      <Lock className="w-6 h-6 text-[#38BDF8]" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold font-mono text-[#EDEDED] tracking-tight">
                        Waiting for your peer
                      </h2>
                      <p className="text-xs text-[#8A909E] mt-1 leading-relaxed">
                        Share the room code or link to start a private conversation.
                      </p>
                    </div>
                  </div>

                  {/* Room Code display */}
                  <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#111318] border border-[#1F242D] font-mono text-lg font-bold tracking-widest text-[#EDEDED] select-all">
                    {roomCode}
                  </div>

                  {/* Copy buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(roomCode);
                        if (ok) {
                          setWaitCopiedCode(true);
                          setTimeout(() => setWaitCopiedCode(false), 2000);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#111318] hover:bg-[#1F242D] border border-[#1F242D] hover:border-[#38BDF8]/40 text-xs font-mono text-[#EDEDED] transition-colors cursor-pointer"
                    >
                      {waitCopiedCode ? (
                        <><CheckIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5 text-[#8A909E]" /><span>Copy code</span></>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const url = `${getShareableOrigin()}/?room=${roomCode}`;
                        const ok = await copyToClipboard(url);
                        if (ok) {
                          setWaitCopiedLink(true);
                          setTimeout(() => setWaitCopiedLink(false), 2000);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#111318] hover:bg-[#1F242D] border border-[#1F242D] hover:border-[#38BDF8]/40 text-xs font-mono text-[#EDEDED] transition-colors cursor-pointer"
                    >
                      {waitCopiedLink ? (
                        <><CheckIcon className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                      ) : (
                        <><Copy className="w-3.5 h-3.5 text-[#8A909E]" /><span>Copy link</span></>
                      )}
                    </button>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-[#8A909E]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
                      Secure connection ready
                    </span>
                    <span className="text-[#1F242D]">·</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Waiting for peer
                    </span>
                  </div>

                  {/* Technical security detail (lower-level secondary transparency) */}
                  <div className="pt-3 border-t border-[#1F242D]/60 flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#8A909E]/75">
                    <ShieldCheck className="w-3 h-3 text-[#38BDF8]/60 shrink-0" />
                    <span>Waiting for peer key agreement (AES-256-GCM / ECDH P-256)</span>
                  </div>
                </div>
              </div>
            )}

          <ChatArea
            timeline={filteredTimeline}
            currentUserId={participantId}
            isEncrypted={crypto.isEncrypted}
            peerTyping={peerTyping}
            searchQuery={searchQuery}
            activeMatchMessageId={activeMatchMessageId}
            onReply={handleReply}
            onReact={sendReaction}
            onEdit={handleEdit}
            onPin={sendPin}
            onDeleteForMe={(msgId) => sendDelete(msgId, 'me')}
            onDeleteForEveryone={(msgId) => sendDelete(msgId, 'everyone')}
            onOpenViewOnce={handleOpenViewOnce}
            onRetry={retrySendMessage}
            onBlockSender={blockParticipant}
          />

          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={sendTyping}
            disabled={isInputDisabled}
            disabledReason={disabledReason}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onSaveEdit={handleSaveEdit}
          />
        </main>

        {/* Ephemeral View-Once Modal */}
        {viewOnceData && (
          <ViewOnceModal
            isOpen={viewOnceData.isOpen}
            onClose={handleCloseViewOnce}
            imageUrl={viewOnceData.imageUrl}
            senderName={viewOnceData.senderName}
            timestamp={Date.now()}
          />
        )}

        {/* Disappearing Messages Modal */}
        <DisappearingModal
          isOpen={isDisappearingModalOpen}
          onClose={() => setIsDisappearingModalOpen(false)}
          currentTtlMs={disappearingTtlMs}
          onSelectTtl={(ttlMs) => setDisappearingTimer(ttlMs)}
        />

        {/* Room Inspector Drawer */}
        <RoomInspector
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          roomCode={roomCode}
          participants={participants}
          expiresAt={expiresAt}
          isEncrypted={crypto.isEncrypted}
          fingerprint={crypto.fingerprint}
          isPeerVerified={crypto.isPeerVerified}
          onTogglePeerVerified={() => crypto.setPeerVerified(!crypto.isPeerVerified)}
          connectionStatus={status}
          onOpenAbout={() => setIsAboutOpen(true)}
        />

        {/* Security Modal */}
        <SecurityModal
          isOpen={isSecurityOpen}
          onClose={() => setIsSecurityOpen(false)}
          fingerprint={crypto.fingerprint}
          sasCode={crypto.sasCode}
          sasEmojis={crypto.sasEmojis}
          isEncrypted={crypto.isEncrypted}
          participantCount={participants.length}
          isPeerVerified={crypto.isPeerVerified}
          onTogglePeerVerified={() => crypto.setPeerVerified(!crypto.isPeerVerified)}
        />

        {/* About Modal */}
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />

        {/* Guide Modal */}
        <GuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />

        {/* FAQ Modal */}
        <FaqModal
          isOpen={isFaqOpen}
          onClose={() => setIsFaqOpen(false)}
        />

        {/* WebRTC Voice Call Modal */}
        <VoiceCallModal
          callState={callState}
          remoteStream={remoteStream}
          isMuted={isMuted}
          callDuration={callDuration}
          peerName={participants.find((p) => p.id !== participantId)?.displayName || 'Peer'}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEndCall={endCall}
          onToggleMute={toggleMute}
        />

        {/* Safe Confirmation: Leave Room */}
        <ConfirmationModal
          isOpen={isLeaveConfirmOpen}
          title="Leave this room?"
          description="You will leave this private room and return to the home screen."
          confirmLabel="Leave Room"
          cancelLabel="Cancel"
          variant="danger"
          icon={LogOut}
          onConfirm={handleConfirmLeave}
          onClose={() => setIsLeaveConfirmOpen(false)}
        />

        {/* Safe Confirmation: Burn Room */}
        <ConfirmationModal
          isOpen={isBurnConfirmOpen}
          title="BURN ROOM?"
          description={`This will permanently end the current room/session.\n\nAll keys will be destroyed and memory wiped immediately.`}
          confirmLabel="Burn Room"
          cancelLabel="Cancel"
          variant="burn"
          icon={Flame}
          onConfirm={handleConfirmBurn}
          onClose={() => setIsBurnConfirmOpen(false)}
        />

        {/* Camouflage Calculator Decoy (Stealth Mode) */}
        <CalculatorDecoy
          isOpen={isStealthOpen}
          roomCode={roomCode}
          onUnlock={() => setIsStealthOpen(false)}
        />

        {/* Anti-Surveillance Focus Shield Blur Overlay */}
        {isScreenBlurred && privacyBlurEnabled && (
          <div
            id="privacy-blur-shield"
            onClick={() => setIsScreenBlurred(false)}
            className="fixed inset-0 z-40 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center cursor-pointer p-4 text-center select-none animate-in fade-in duration-150"
          >
            <div
              className="p-6 rounded-2xl bg-[#0D0F12] border border-[#1F242D] max-w-sm flex flex-col items-center gap-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl bg-[#111318] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="font-mono font-semibold text-sm text-[#EDEDED] uppercase tracking-wider">
                Anti-Surveillance Shield
              </div>
              <p className="text-xs text-[#8A909E] font-sans leading-relaxed">
                Chat hidden automatically because window lost focus. Click below to reveal.
              </p>
              <button
                type="button"
                onClick={() => setIsScreenBlurred(false)}
                className="mt-2 w-full py-2 rounded-xl bg-[#38BDF8] text-[#08090B] font-mono font-bold text-xs cursor-pointer hover:bg-[#0284C7] transition-colors"
              >
                Reveal Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
};
