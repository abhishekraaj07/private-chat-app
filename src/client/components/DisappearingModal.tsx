/**
 * NEXUS Disappearing Messages Settings Modal
 *
 * Configures self-destruct timers for all subsequent messages in room.
 */

import React from 'react';
import { Timer, X, Check, ShieldCheck } from 'lucide-react';

interface DisappearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTtlMs: number;
  onSelectTtl: (ttlMs: number) => void;
}

const TTL_OPTIONS = [
  { label: 'Off', ttlMs: 0, description: 'Messages stay in memory until session ends' },
  { label: '30 seconds', ttlMs: 30 * 1000, description: 'Ultra-ephemeral self-destruction' },
  { label: '5 minutes', ttlMs: 5 * 60 * 1000, description: 'Temporary sensitive discussions' },
  { label: '1 hour', ttlMs: 60 * 60 * 1000, description: 'Short-term collaboration' },
  { label: '24 hours', ttlMs: 24 * 60 * 60 * 1000, description: 'Daily auto-clearing' },
];

export const DisappearingModal: React.FC<DisappearingModalProps> = ({
  isOpen,
  onClose,
  currentTtlMs,
  onSelectTtl,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="disappearing-modal"
      className="fixed inset-0 z-50 bg-[#08090B]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0D0F12] border border-[#1F242D] rounded-xl shadow-2xl p-5 font-mono text-xs select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#1F242D]">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#38BDF8]" />
            <span className="font-semibold text-sm text-[#EDEDED]">DISAPPEARING MESSAGES</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="py-3 text-[11px] text-[#8A909E] leading-relaxed">
          When enabled, new messages sent in this room will automatically self-destruct for both participants after the selected timer expires.
        </p>

        <div className="space-y-1.5 py-1">
          {TTL_OPTIONS.map((opt) => {
            const isSelected = currentTtlMs === opt.ttlMs;
            return (
              <button
                key={opt.ttlMs}
                type="button"
                onClick={() => {
                  onSelectTtl(opt.ttlMs);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#38BDF8]/10 border-[#38BDF8]/60 text-[#EDEDED]'
                    : 'bg-[#111318] border-[#1F242D] hover:border-[#1F242D]/80 text-[#8A909E] hover:text-[#EDEDED]'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-[#EDEDED]">{opt.label}</div>
                  <div className="text-[10px] text-[#8A909E] mt-0.5">{opt.description}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#38BDF8] shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[#1F242D] flex items-center gap-1.5 text-[10px] text-[#8A909E]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>Timers are client-side verified and zero-knowledge synchronized.</span>
        </div>
      </div>
    </div>
  );
};
