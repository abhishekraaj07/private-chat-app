/**
 * NEXUS Message Search Bar Component
 *
 * Local zero-knowledge in-memory message search with match count,
 * previous/next navigation, and match highlighting.
 */

import React, { useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X, Shield } from 'lucide-react';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onQueryChange: (q: string) => void;
  currentMatchIndex: number;
  totalMatches: number;
  onNextMatch: () => void;
  onPrevMatch: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onQueryChange,
  currentMatchIndex,
  totalMatches,
  onNextMatch,
  onPrevMatch,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="message-search-bar"
      className="bg-[#0D0F12] border-b border-[#1F242D] px-4 py-2 flex items-center justify-between gap-3 text-xs font-mono select-none animate-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <Search className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search encrypted messages (in-memory)..."
          className="w-full bg-[#111318] border border-[#1F242D] focus:border-[#38BDF8]/60 rounded-lg px-2.5 py-1 text-[#EDEDED] placeholder-[#8A909E] focus:outline-none"
        />
        <span
          className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#111318] border border-[#1F242D] text-[10px] text-emerald-400 shrink-0 select-none"
          title="Search runs strictly inside your local browser memory. No search terms or indexes ever leave this device."
        >
          <Shield className="w-2.5 h-2.5" />
          <span>LOCAL ONLY</span>
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Match Count Indicator */}
        <span className="text-[11px] text-[#8A909E] min-w-[50px] text-center">
          {totalMatches > 0
            ? `${currentMatchIndex + 1} of ${totalMatches}`
            : searchQuery
            ? '0 matches'
            : ''}
        </span>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 border-l border-[#1F242D] pl-2">
          <button
            type="button"
            onClick={onPrevMatch}
            disabled={totalMatches === 0}
            className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNextMatch}
            disabled={totalMatches === 0}
            className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED] disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
            title="Next match (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[#1F242D] text-[#8A909E] hover:text-rose-400 transition-colors cursor-pointer"
          title="Close search (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
