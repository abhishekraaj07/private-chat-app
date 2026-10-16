/**
 * NEXUS Confirmation Dialog Component
 *
 * Accessible, cyber-themed alert dialog for critical/destructive actions:
 * - Leave Room confirmation
 * - Burn Room confirmation
 *
 * Ensures accidental taps/clicks never disconnect or destroy session state.
 */

import React, { useEffect, useRef } from 'react';
import { LucideIcon, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'burn' | 'warning';
  icon?: LucideIcon;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon: Icon = AlertTriangle,
  onConfirm,
  onClose,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus cancel button on open & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Small timeout to allow DOM mount
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isBurn = variant === 'burn';

  return (
    <div
      id="confirmation-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
      role="presentation"
    >
      <div
        id="confirmation-modal-content"
        className="relative w-full max-w-md bg-[#0D0F12] border border-[#1F242D] rounded-xl shadow-2xl p-5 sm:p-6 text-[#EDEDED] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        {/* Top accent border */}
        <div
          className={`absolute top-0 inset-x-0 h-[2px] rounded-t-xl ${
            isBurn
              ? 'bg-rose-600 shadow-sm shadow-rose-600/50'
              : 'bg-rose-500/70'
          }`}
        />

        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              isBurn
                ? 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                : 'bg-[#161920] border-[#1F242D] text-rose-400'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="confirm-modal-title"
              className="text-sm font-bold font-mono tracking-wider text-[#EDEDED] uppercase"
            >
              {title}
            </h2>
            <p
              id="confirm-modal-desc"
              className="text-xs text-[#8A909E] mt-1.5 leading-relaxed font-mono whitespace-pre-line"
            >
              {description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#1F242D]">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-[#1F242D] bg-[#111318] hover:bg-[#1A1E26] text-xs font-mono text-[#EDEDED] transition-colors cursor-pointer min-h-[44px] flex items-center justify-center font-medium"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
              isBurn
                ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-500 shadow-md shadow-rose-950/50'
                : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 hover:border-rose-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
