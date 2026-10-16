/**
 * NEXUS Pinned Messages Bar Component
 *
 * Displays active pinned messages below header with one-click navigation
 * and quick unpin action.
 */

import React, { useState } from 'react';
import { Pin, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatMessage } from '../../types/protocol.ts';

interface PinnedBarProps {
  pinnedMessages: ChatMessage[];
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export const PinnedBar: React.FC<PinnedBarProps> = ({
  pinnedMessages,
  onJumpToMessage,
  onUnpin,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pinnedMessages.length === 0) return null;

  const validIndex = Math.min(currentIndex, pinnedMessages.length - 1);
  const currentMsg = pinnedMessages[validIndex];
  if (!currentMsg) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  return (
    <div
      id="nexus-pinned-bar"
      onClick={() => onJumpToMessage(currentMsg.id)}
      className="bg-[#0D0F12]/95 border-b border-[#1F242D] px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-3 text-xs font-mono cursor-pointer hover:bg-[#111318] transition-colors select-none z-20 overflow-hidden"
      title="Click to jump to pinned message"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Pin className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 fill-[#38BDF8]/20" />
        <span className="text-[#38BDF8] font-semibold shrink-0">
          PINNED{pinnedMessages.length > 1 ? ` (${validIndex + 1}/${pinnedMessages.length})` : ''}:
        </span>
        <span className="text-[#8A909E] font-medium shrink-0">{currentMsg.senderName}:</span>
        <span className="text-[#EDEDED] truncate">
          {currentMsg.text || (currentMsg.attachment ? `[File] ${currentMsg.attachment.name}` : '[Message]')}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {pinnedMessages.length > 1 && (
          <div className="flex items-center gap-0.5 mr-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]"
              title="Previous pinned message"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]"
              title="Next pinned message"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin(currentMsg.id);
          }}
          className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-rose-400 transition-colors"
          title="Unpin message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
