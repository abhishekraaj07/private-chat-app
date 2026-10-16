/**
 * NEXUS View Once Media Modal
 *
 * Ephemeral fullscreen viewer for one-time view photos.
 * Self-destructs upon close, revoking local blob and sending view ACK.
 */

import React, { useEffect } from 'react';
import { Lock, X, ShieldAlert, EyeOff } from 'lucide-react';

interface ViewOnceModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  senderName: string;
  timestamp: number;
}

export const ViewOnceModal: React.FC<ViewOnceModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  senderName,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Clean up in-memory blob URLs when unmounting or closing
  useEffect(() => {
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(imageUrl);
        } catch {
          // ignore
        }
      }
    };
  }, [imageUrl]);

  if (!isOpen) return null;

  return (
    <div
      id="view-once-modal"
      className="fixed inset-0 z-50 bg-[#08090B]/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Ephemeral Header */}
      <div className="flex items-center justify-between border-b border-[#1F242D] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 text-xs font-mono font-bold">
            1×
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#EDEDED]">
              <span>EPHEMERAL MEDIA</span>
              <span className="text-[#8A909E]">· {senderName}</span>
            </div>
            <div className="text-[10px] font-mono text-amber-400/90 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              <span>Best-effort one-time viewing. In-memory blob purged upon closing.</span>
            </div>
          </div>
        </div>

        <button
          id="close-view-once-btn"
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#111318] hover:bg-rose-950/40 border border-[#1F242D] hover:border-rose-800/50 text-xs font-mono text-rose-300 transition-colors cursor-pointer"
          title="Close and destroy media"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close & Destroy</span>
        </button>
      </div>

      {/* Main Image Container */}
      <div className="flex-1 flex items-center justify-center my-4 overflow-hidden relative">
        <img
          src={imageUrl}
          alt="Ephemeral View Once"
          draggable={false}
          className="max-h-full max-w-full object-contain rounded-lg shadow-2xl ring-1 ring-[#1F242D] pointer-events-none"
        />
      </div>

      {/* Ephemeral Footer */}
      <div className="border-t border-[#1F242D] pt-3 flex items-center justify-between text-[11px] font-mono text-[#8A909E]">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-[#38BDF8]" />
          <span>Encrypted in-memory blob. Best-effort protection; cannot prevent external screenshots.</span>
        </div>
        <div className="flex items-center gap-1">
          <EyeOff className="w-3 h-3 text-amber-400" />
          <span>Cannot be re-opened once closed.</span>
        </div>
      </div>
    </div>
  );
};
