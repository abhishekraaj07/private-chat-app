/**
 * NEXUS Landing Page
 *
 * Minimalist, restrained entry point.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ArrowRight,
  ShieldCheck,
  Terminal,
  MoreVertical,
  X,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

interface LandingPageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenSecurity: () => void;
  onOpenAbout: () => void;
  onOpenGuide?: () => void;
  onOpenFaq?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onOpenSecurity,
  onOpenAbout,
  onOpenGuide,
  onOpenFaq,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div
      id="landing-page"
      className="min-h-[100dvh] flex flex-col justify-between bg-[#08090B] text-[#EDEDED] px-4 py-6 sm:py-8 select-none"
    >
      {/* Subtle top navigation bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#0D0F12] border border-[#1F242D] flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#38BDF8]" />
          </div>
          <span className="font-mono text-sm font-bold tracking-widest text-[#EDEDED]">
            NEXUS
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">

          <button
            id="landing-about-link"
            onClick={onOpenAbout}
            className="hidden sm:flex group items-center gap-2 px-3 py-1 rounded-full bg-[#111318] hover:bg-[#161B22] border border-[#1F242D] hover:border-[#38BDF8]/50 shadow-xs transition-all duration-150 cursor-pointer text-xs font-mono"
            title="Explore NEXUS Architecture, Features & Creator Spec"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-70"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8]"></span>
            </span>
            <span className="text-[#EDEDED] font-semibold tracking-tight">Features</span>
            <span className="text-[#1F242D]">·</span>
            <span className="text-[#8A909E] group-hover:text-[#38BDF8] transition-colors">made by abhishek</span>
          </button>

          {/* 3-Dot (⋮) Overflow Menu Trigger */}
          <div className="relative" ref={menuRef}>
            <button
              id="landing-menu-btn"
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                menuOpen
                  ? 'bg-[#1F242D] border-[#38BDF8]/60 text-[#38BDF8]'
                  : 'bg-[#111318] hover:bg-[#1F242D] border-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]'
              }`}
              title="More options (Guide, FAQ, Security, Features)"
              aria-label="More options"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
            </button>

            {/* 3-Dot Overflow Dropdown Menu */}
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-[#0D0F12]/98 border border-[#1F242D] rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                role="menu"
                aria-label="Site navigation"
              >
                <div className="p-1.5 space-y-0.5">
                  {/* Features */}
                  <button
                    id="landing-menu-features-btn"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAbout();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-[#38BDF8] shrink-0" />
                      <div>
                        <div className="font-medium">Features</div>
                        <div className="text-[10px] text-[#8A909E]">Architecture &amp; specs</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#8A909E] bg-[#111318] px-1.5 py-0.5 rounded border border-[#1F242D]">
                      v2.0
                    </span>
                  </button>

                  {/* Guide */}
                  {onOpenGuide && (
                    <button
                      id="landing-menu-guide-btn"
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
                          <div className="text-[10px] text-[#8A909E]">How to use NEXUS</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#8A909E] bg-[#111318] px-1.5 py-0.5 rounded border border-[#1F242D]">
                        DOCS
                      </span>
                    </button>
                  )}

                  {/* Security */}
                  <button
                    id="landing-menu-security-btn"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenSecurity();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-[#EDEDED] hover:bg-[#161920] transition-colors cursor-pointer text-left"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-medium">Security Model</div>
                        <div className="text-[10px] text-[#8A909E]">Cryptographic proofs</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                      E2EE
                    </span>
                  </button>

                  {/* FAQ */}
                  {onOpenFaq && (
                    <button
                      id="landing-menu-faq-btn"
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
                          <div className="text-[10px] text-[#8A909E]">Common questions</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        FAQ
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-md w-full mx-auto my-auto text-center space-y-8">
        {/* Title & Tagline */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-[#EDEDED]">
            NEXUS
          </h1>
          <p className="text-base sm:text-lg font-medium text-[#EDEDED]">
            Private conversations.
            <br />
            <span className="text-[#8A909E]">Nothing unnecessary.</span>
          </p>
        </div>

        <p className="text-sm text-[#8A909E] leading-relaxed max-w-sm mx-auto">
          Create a temporary private room,
          <br />
          share the code, and start talking.
        </p>

        {/* Action Controls */}
        <div className="space-y-3 pt-2">
          <button
            id="landing-create-room-btn"
            onClick={onCreateRoom}
            className="w-full py-3 px-4 rounded-xl bg-[#0D0F12] hover:bg-[#111318] border border-[#1F242D] hover:border-[#38BDF8]/50 text-sm font-medium text-[#EDEDED] transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-xs"
          >
            <span>Create private room</span>
            <ArrowRight className="w-4 h-4 text-[#38BDF8] group-hover:translate-x-0.5 transition-transform" />
          </button>

          <div className="text-xs font-mono text-[#8A909E]/70">or</div>

          <button
            id="landing-join-room-btn"
            onClick={onJoinRoom}
            className="w-full py-2.5 px-3 rounded-xl bg-transparent hover:bg-[#0D0F12] border border-[#1F242D]/70 hover:border-[#1F242D] text-xs font-mono text-[#8A909E] hover:text-[#EDEDED] transition-all cursor-pointer"
          >
            [ Join a room ]
          </button>
        </div>

        {/* Private by Design pill */}
        <div className="pt-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D0F12] border border-[#1F242D] text-[11px] font-mono text-[#8A909E]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]"></span>
            PRIVATE BY DESIGN
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-[#8A909E]/50">
        <span>Web Crypto API · ECDH P-256 · AES-256-GCM · Ephemeral Relay</span>
        <button
          id="landing-footer-author-btn"
          onClick={onOpenAbout}
          className="hover:text-[#EDEDED] transition-colors cursor-pointer text-[#8A909E]/70 flex items-center gap-1.5"
        >
          <span>Features & Architecture · made by abhishek</span>
        </button>
      </footer>
    </div>
  );
};
