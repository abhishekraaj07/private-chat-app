/**
 * NEXUS Operational Guide Modal
 *
 * Technical, step-by-step workflow guide for zero-knowledge ephemeral chat.
 */

import React, { useEffect } from 'react';
import { X, BookOpen, Key, Shield, MessageSquare, Flame, Share2, Phone } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideStep {
  step: string;
  title: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    step: '01',
    title: 'Create & Share Room',
    tag: 'EPHEMERAL CODE',
    icon: Share2,
    description:
      'Generate a cryptographically randomized 8-character room code. Share the code or direct invite link with your peer through any channel.',
  },
  {
    step: '02',
    title: 'Zero-Knowledge Key Agreement',
    tag: 'ECDH P-256 + AES-GCM',
    icon: Key,
    description:
      'When your peer connects, both browsers automatically perform an ECDH key exchange using the native Web Crypto API. The shared 256-bit AES key is derived in local memory only.',
  },
  {
    step: '03',
    title: 'Encrypted Messaging & 1× Media',
    tag: 'VOLATILE RAM',
    icon: MessageSquare,
    description:
      'Every text message, edit, reaction, and attachment is encrypted on-device before transmission. 1× View-Once media decrypts into temporary blob memory and is purged upon closure.',
  },
  {
    step: '04',
    title: 'Voice Notes & P2P Calling',
    tag: 'WEBRTC AUDIO',
    icon: Phone,
    description:
      'Record microphone voice notes encrypted in-browser, or start a direct WebRTC voice call. Signaling SDP and ICE candidates are 100% end-to-end encrypted.',
  },
  {
    step: '05',
    title: 'Auto-Expiry & Panic Burn',
    tag: 'KILL SWITCH',
    icon: Flame,
    description:
      'Rooms auto-expire after 15 minutes of inactivity. In emergencies, trigger BURN ROOM (Ctrl+Shift+X) to wipe keys, purge volatile memory, and redirect to a decoy domain.',
  },
];

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="guide-modal-backdrop"
      className="fixed inset-0 z-60 flex sm:items-center items-end justify-center bg-black/80 backdrop-blur-xs sm:p-4 p-0 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="guide-modal-content"
        className="relative w-full sm:max-w-xl bg-[#0D0F12] border border-[#1F242D] sm:rounded-2xl rounded-t-2xl shadow-2xl sm:p-6 p-5 text-[#EDEDED] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-[#1F242D]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F242D] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#111318] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 id="guide-modal-title" className="text-base font-semibold tracking-tight font-mono text-[#EDEDED]">
                NEXUS Operational Guide
              </h2>
              <p className="text-[11px] font-mono text-[#8A909E]">
                End-to-end encrypted workflow &amp; security guidelines
              </p>
            </div>
          </div>

          <button
            id="guide-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="w-8 h-8 rounded-lg border border-[#1F242D] bg-[#111318] hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps List */}
        <div className="overflow-y-auto py-4 space-y-3 pr-1">
          {GUIDE_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.step}
                className="p-3.5 rounded-xl bg-[#111318]/60 border border-[#1F242D] hover:border-[#38BDF8]/30 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded border border-[#38BDF8]/20">
                      STEP {step.step}
                    </span>
                    <h3 className="text-xs font-mono font-semibold text-[#EDEDED] flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-[#38BDF8]" />
                      {step.title}
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-[#8A909E] bg-[#0D0F12] px-1.5 py-0.5 rounded border border-[#1F242D]">
                    {step.tag}
                  </span>
                </div>
                <p className="text-xs text-[#8A909E] leading-relaxed pl-1">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#1F242D] flex items-center justify-between text-[11px] font-mono text-[#8A909E] shrink-0">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            Zero Server Plaintext
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#111318] hover:bg-[#1F242D] border border-[#1F242D] text-xs font-mono text-[#EDEDED] transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
