/**
 * NEXUS Header Component
 *
 * Top navigation bar:
 * - Left: Shield logo, NEXUS wordmark, interactive Room Code badge, and peer presence.
 * - Center: End-to-end encryption & verification status badge.
 * - Top-right: Frequent used feature (Voice Call) + 3-dot overflow menu (⋮).
 * - 3-Dot Menu: Non-essential features (Search, Timer, Copy Room Code,
 *   Security Inspector, Leave Room, and Burn Room kill switch).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Copy,
  Check,
  LogOut,
  Sliders,
  Search,
  Timer,
  Phone,
  Flame,
  MoreVertical,
  X,
  BookOpen,
  HelpCircle,
  Calculator,
  EyeOff,
  Zap,
} from 'lucide-react';
import { copyToClipboard } from '../../utils/format.ts';
import { ConnectionStatus, formatTtlLabel } from '../../hooks/useRoomSocket.ts';

interface HeaderProps {
  roomCode: string;
  connectionStatus: ConnectionStatus;
  participantCount: number;
  peerLastSeen?: number | null;
  isEncrypted: boolean;
  isPeerVerified?: boolean;
  disappearingTtlMs: number;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onOpenDisappearingModal: () => void;
  onOpenInspector: () => void;
  onOpenSecurity: () => void;
  onBurnRoom: () => void;
  onStartCall?: () => void;
  canCall?: boolean;
  onLeave: () => void;
  onOpenGuide?: () => void;
  onOpenFaq?: () => void;
  onOpenStealth?: () => void;
  privacyBlurEnabled?: boolean;
  onTogglePrivacyBlur?: () => void;
  onPanicKill?: () => void;
}

function formatLastSeen(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  connectionStatus,
  participantCount,
  peerLastSeen,
  isEncrypted,
  isPeerVerified = false,
  disappearingTtlMs,
  isSearchOpen,
  onToggleSearch,
  onOpenDisappearingModal,
  onOpenInspector,
  onOpenSecurity,
  onBurnRoom,
  onStartCall,
  canCall = false,
  onLeave,
  onOpenGuide,
  onOpenFaq,
  onOpenStealth,
  privacyBlurEnabled = false,
  onTogglePrivacyBlur,
  onPanicKill,
}) => {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleCopy = async () => {
    const ok = await copyToClipboard(roomCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Close menu on outside click or Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

  // Status dot color/label for compact display
  const getStatusDot = () => {
    if (connectionStatus === 'connected') {
      if (isEncrypted && isPeerVerified) return { color: 'bg-emerald-400', label: 'Secure & Verified' };
      if (isEncrypted) return { color: 'bg-[#38BDF8] animate-pulse', label: 'Encrypted' };
      return { color: 'bg-amber-400', label: 'Waiting for peer' };
    }
    if (connectionStatus === 'reconnecting') return { color: 'bg-amber-400 animate-ping', label: 'Reconnecting' };
    return { color: 'bg-rose-400', label: 'Offline' };
  };

  const getStatusDisplay = () => {
    if (connectionStatus === 'connected') {
      if (isEncrypted) {
        if (isPeerVerified) {
          return (
            <button
              onClick={onOpenSecurity}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/50 text-[11px] font-mono text-emerald-300 hover:border-emerald-400 transition-colors cursor-pointer shadow-xs"
              title="End-to-end encrypted and identity verified. Click to inspect security parameters."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="font-semibold tracking-wide">SECURE &amp; VERIFIED</span>
            </button>
          );
        }
        return (
          <button
            onClick={onOpenSecurity}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D1520] border border-[#38BDF8]/50 text-[11px] font-mono text-[#38BDF8] hover:border-[#38BDF8] transition-colors cursor-pointer shadow-xs"
            title="E2E Encrypted. Identity unverified. Click to compare security fingerprints."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse"></span>
            <span className="tracking-wide">SECURE</span>
          </button>
        );
      }
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111318] border border-[#1F242D] text-[11px] font-mono text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span className="hidden sm:inline">CONNECTING (WAITING FOR PEER)</span>
          <span className="sm:hidden">WAITING</span>
        </span>
      );
    }

    if (connectionStatus === 'reconnecting') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111318] border border-[#1F242D] text-[11px] font-mono text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
          <span>RECONNECTING...</span>
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111318] border border-[#1F242D] text-[11px] font-mono text-rose-400">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        <span>CONNECTION LOST</span>
      </span>
    );
  };

  const ttlLabel = formatTtlLabel(disappearingTtlMs);
  const statusDot = getStatusDot();

  return (
    <header
      id="nexus-header"
      className="border-b border-[#1F242D] bg-[#08090B]/95 backdrop-blur-md px-3 sm:px-4 lg:px-6 z-30 shrink-0 select-none relative"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-14 flex items-center justify-between gap-2">

        {/* ── LEFT: Unified Shield + NEXUS Brand + Interactive Room Code + Presence ── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Unified NEXUS Brand Element */}
          <div className="h-8 flex items-center gap-2 px-2 py-1 rounded-lg bg-[#111318] border border-[#1F242D] shrink-0 select-none shadow-xs">
            <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-[#EDEDED]">
              NEXUS
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#1F242D] hidden sm:block"></div>

          {/* Interactive Room Code Badge (Click to copy) */}
          <button
            type="button"
            onClick={handleCopy}
            className="h-8 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#111318] hover:bg-[#1A1E26] border border-[#1F242D] hover:border-[#38BDF8]/40 transition-colors shrink-0 cursor-pointer group"
            title="Click to copy room code"
            aria-label={`Copy room code ${roomCode}`}
          >
            <span className="text-[10px] font-mono text-[#8A909E] uppercase tracking-wider hidden sm:inline">ROOM /</span>
            <span className="text-xs font-mono font-semibold text-[#EDEDED] tracking-wider group-hover:text-[#38BDF8] transition-colors">
              {roomCode}
            </span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-[#8A909E] group-hover:text-[#38BDF8] shrink-0 transition-colors" />
            )}
          </button>

          {/* Presence Status: Desktop */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-[#8A909E] truncate">
            {participantCount === 2 ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Online</span>
              </span>
            ) : peerLastSeen ? (
              <span className="flex items-center gap-1.5 text-[#8A909E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A909E]"></span>
                <span>Offline · {formatLastSeen(peerLastSeen)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Waiting</span>
              </span>
            )}
          </div>

          {/* Mobile: compact status dot */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 md:hidden ${statusDot.color}`}
            title={statusDot.label}
          />
        </div>

        {/* ── CENTER: Security verification status ── */}
        <div className="hidden sm:flex items-center justify-center">
          {getStatusDisplay()}
        </div>

        {/* ── RIGHT: Actions: [ Timer ] [ Call ] [ Leave Room ] [ 3-dot ] ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* 1. Direct Header Action: Disappearing Messages Timer */}
          <button
            id="header-disappearing-btn"
            type="button"
            onClick={onOpenDisappearingModal}
            className={`h-8 inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-xs ${
              disappearingTtlMs > 0
                ? 'bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border-[#38BDF8]/50 text-[#38BDF8]'
                : 'bg-[#111318] hover:bg-[#1A1E26] border-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]'
            }`}
            title={`Disappearing messages: ${ttlLabel}`}
            aria-label={`Disappearing messages: ${ttlLabel}`}
          >
            <Timer className={`w-3.5 h-3.5 shrink-0 ${disappearingTtlMs > 0 ? 'text-[#38BDF8]' : 'text-amber-400'}`} />
            <span className="font-medium text-[11px] sm:text-xs">{ttlLabel}</span>
          </button>

          {/* 1.5. Stealth Mode Decoy Trigger */}
          {onOpenStealth && (
            <button
              id="header-stealth-btn"
              type="button"
              onClick={onOpenStealth}
              className="h-8 inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 rounded-lg border border-[#1F242D] bg-[#111318] hover:bg-[#1A1E26] text-xs font-mono text-[#8A909E] hover:text-[#EDEDED] transition-all cursor-pointer shadow-xs"
              title="Stealth Decoy Calculator (Ctrl+Alt+C)"
              aria-label="Stealth Decoy Calculator"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden md:inline font-medium">Stealth</span>
            </button>
          )}

          {/* 2. Frequent Used: P2P Encrypted Voice Call */}
          {onStartCall && (
            <button
              id="header-voice-call-btn"
              type="button"
              onClick={onStartCall}
              disabled={!canCall}
              className={`h-8 inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                canCall
                  ? 'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-500/50 text-emerald-300 shadow-xs hover:border-emerald-400'
                  : 'bg-[#111318] border-[#1F242D] text-slate-500 opacity-50 cursor-not-allowed'
              }`}
              title={canCall ? 'Start encrypted P2P voice call' : 'Voice call available when peer connects'}
              aria-label="Start Voice Call"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-medium">Call</span>
            </button>
          )}

          {/* 3. Direct Header Action: Leave Room */}
          <button
            id="header-leave-btn"
            type="button"
            onClick={onLeave}
            className="h-8 inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 rounded-lg bg-[#111318] hover:bg-rose-950/40 hover:border-rose-800/50 border border-[#1F242D] text-xs text-rose-300 font-mono transition-all cursor-pointer shadow-xs"
            title="Leave this room"
            aria-label="Leave this room"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="hidden sm:inline font-medium">Leave Room</span>
          </button>

          {/* 3. 3-DOT OVERFLOW MENU BUTTON (⋮) ── */}
          <div className="relative" ref={menuRef}>
            <button
              id="header-menu-btn"
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                menuOpen
                  ? 'bg-[#1F242D] border-[#38BDF8]/60 text-[#38BDF8]'
                  : 'bg-[#111318] hover:bg-[#1F242D] border-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]'
              }`}
              title="More options (Search, Copy, Security, Guide, FAQ, Burn)"
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>

            {/* ── 3-DOT OVERFLOW DROPDOWN MENU ── */}
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-[#0D0F12]/98 border border-[#1F242D] rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                role="menu"
                aria-label="Room actions"
              >
                {/* Mobile status indicator inside dropdown (when hidden outside on small screens) */}
                <div className="sm:hidden px-3 py-2.5 border-b border-[#1F242D] flex items-center justify-center bg-[#111318]/50">
                  {getStatusDisplay()}
                </div>

                {/* Peer status row inside dropdown */}
                <div className="px-3.5 py-2 border-b border-[#1F242D] text-xs font-mono text-[#8A909E] flex items-center justify-between bg-[#111318]/30">
                  <span>Peer Status</span>
                  {participantCount === 2 ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Online
                    </span>
                  ) : peerLastSeen ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A909E]"></span>
                      {formatLastSeen(peerLastSeen)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Waiting for peer
                    </span>
                  )}
                </div>

                {/* ── Secondary / Non-essential features ── */}
                <div className="p-1.5 space-y-0.5">

                  {/* 1. Search Messages */}
                  <button
                    id="header-search-btn"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleSearch();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-colors cursor-pointer text-left ${
                      isSearchOpen
                        ? 'bg-[#38BDF8]/15 text-[#38BDF8]'
                        : 'text-[#EDEDED] hover:bg-[#161920]'
                    }`}
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <Search className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-medium">Search Messages</div>
                        <div className="text-[10px] text-[#8A909E]">Find text in conversation</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8A909E] bg-[#111318] px-1.5 py-0.5 rounded border border-[#1F242D]">
                      Ctrl+K
                    </span>
                  </button>

                  {/* 2. Copy Room Code */}
                  <button
                    id="header-copy-code-btn"
                    type="button"
                    onClick={handleCopy}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">{copied ? 'Code Copied!' : 'Copy Room Code'}</div>
                        <div className="text-[10px] text-[#8A909E]">Share with your peer</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[#EDEDED] bg-[#111318] px-2 py-0.5 rounded border border-[#1F242D]">
                      {roomCode}
                    </span>
                  </button>

                  {/* 3. Security & Keys Inspector */}
                  <button
                    id="header-room-inspector-btn"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenInspector();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-[#38BDF8] shrink-0" />
                      <div>
                        <div className="font-medium">Security Inspector</div>
                        <div className="text-[10px] text-[#8A909E]">Fingerprints &amp; cipher info</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/30 px-1.5 py-0.5 rounded">
                      AES-256
                    </span>
                  </button>

                  {/* 4. Stealth Decoy Calculator */}
                  {onOpenStealth && (
                    <button
                      id="header-menu-stealth-btn"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenStealth();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calculator className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div>
                          <div className="font-medium">Stealth Mode (Decoy)</div>
                          <div className="text-[10px] text-[#8A909E]">Disguise as working calculator</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#8A909E] bg-[#111318] px-1.5 py-0.5 rounded border border-[#1F242D]">
                        Ctrl+Alt+C
                      </span>
                    </button>
                  )}

                  {/* 5. Anti-Surveillance Focus Blur Toggle */}
                  {onTogglePrivacyBlur && (
                    <button
                      id="header-menu-privacy-blur-btn"
                      type="button"
                      onClick={() => {
                        onTogglePrivacyBlur();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <EyeOff className={`w-4 h-4 shrink-0 ${privacyBlurEnabled ? 'text-emerald-400' : 'text-[#8A909E]'}`} />
                        <div>
                          <div className="font-medium">Surveillance Blur</div>
                          <div className="text-[10px] text-[#8A909E]">Auto-blur on tab switch / unfocus</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        privacyBlurEnabled
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
                          : 'bg-[#111318] text-[#8A909E] border-[#1F242D]'
                      }`}>
                        {privacyBlurEnabled ? 'ACTIVE' : 'OFF'}
                      </span>
                    </button>
                  )}

                  {/* 6. Operational Guide */}
                  {onOpenGuide && (
                    <button
                      id="header-guide-btn"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenGuide();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-4 h-4 text-[#38BDF8] shrink-0" />
                        <div>
                          <div className="font-medium">User Guide</div>
                          <div className="text-[10px] text-[#8A909E]">How to use &amp; security steps</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#8A909E] bg-[#111318] px-1.5 py-0.5 rounded border border-[#1F242D]">
                        DOCS
                      </span>
                    </button>
                  )}

                  {/* 7. FAQ */}
                  {onOpenFaq && (
                    <button
                      id="header-faq-btn"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenFaq();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <div className="font-medium">FAQ</div>
                          <div className="text-[10px] text-[#8A909E]">Privacy guarantees &amp; questions</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        FAQ
                      </span>
                    </button>
                  )}

                </div>

                {/* Divider */}
                <div className="h-[1px] bg-[#1F242D] mx-2" />

                {/* ── Danger action: Emergency Burn Room & Panic Kill ── */}
                <div className="p-1.5 space-y-1">
                  {onPanicKill && (
                    <button
                      id="header-panic-kill-btn"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onPanicKill();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-amber-300 hover:bg-amber-950/40 hover:text-amber-100 border border-amber-900/40 transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold text-amber-300">PANIC BLANK SCREEN</div>
                          <div className="text-[10px] text-amber-400/80">Instant erase &amp; escape</div>
                        </div>
                      </div>
                      <span className="text-[9px] text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1 py-0.5 rounded font-bold">
                        Ctrl+Alt+K
                      </span>
                    </button>
                  )}
                  <div>
                    <button
                      id="header-burn-room-btn"
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onBurnRoom();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-rose-400 hover:bg-rose-900/40 hover:text-rose-200 border border-rose-800/40 hover:border-rose-600 transition-colors cursor-pointer text-left"
                      role="menuitem"
                    >
                      <div className="flex items-center gap-2.5">
                        <Flame className="w-4 h-4 text-rose-500 fill-rose-500/20 shrink-0" />
                        <div>
                          <div className="font-bold text-rose-300">BURN ROOM</div>
                          <div className="text-[10px] text-rose-400/80">Self-destruct keys &amp; decoy</div>
                        </div>
                      </div>
                      <span className="text-[9px] text-rose-400/90 bg-rose-950/60 border border-rose-800/60 px-1 py-0.5 rounded font-bold">
                        PANIC
                      </span>
                    </button>
                  </div>

                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
