/**
 * NEXUS Message Action Menu Component
 *
 * Provides desktop hover action toolbar and mobile long-press / action popup
 * with quick reactions (❤️, 👍, 😂, 😮, 😢, 🔥), reply, pin, copy, edit,
 * and delete (for me / for everyone).
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Reply,
  Pin,
  PinOff,
  Copy,
  Edit2,
  Trash2,
  MoreHorizontal,
  X,
  UserX,
} from 'lucide-react';
import { copyToClipboard } from '../../utils/format.ts';
import { useToast } from './Toast.tsx';

export const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const;

export interface MessageActionMenuProps {
  messageId: string;
  senderId: string;
  senderName: string;
  text?: string;
  isFile?: boolean;
  fileName?: string;
  isViewOnce?: boolean;
  isPinned?: boolean;
  isOwn: boolean;
  isDeleted?: boolean;
  userReactions?: string[];
  onReply: () => void;
  onReact: (emoji: string) => void;
  onEdit?: () => void;
  onPin: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone?: () => void;
  onBlockSender?: () => void;
}

export const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  messageId,
  senderId,
  senderName,
  text,
  isFile,
  fileName,
  isViewOnce,
  isPinned,
  isOwn,
  isDeleted,
  userReactions = [],
  onReply,
  onReact,
  onEdit,
  onPin,
  onDeleteForMe,
  onDeleteForEveryone,
  onBlockSender,
}) => {
  const { showToast } = useToast();
  const [showMore, setShowMore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMore(false);
        setShowDeleteConfirm(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMore(false);
        setShowDeleteConfirm(false);
      }
    };
    if (showMore || showDeleteConfirm) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [showMore, showDeleteConfirm]);

  if (isDeleted) {
    return null;
  }

  const handleCopy = async () => {
    if (text) {
      const ok = await copyToClipboard(text);
      if (ok) {
        showToast('Copied message (auto-clears in 30s)', 'success');
      }
    }
    setShowMore(false);
  };

  return (
    <div
      ref={menuRef}
      className="relative flex items-center gap-0.5 bg-[#0D0F12]/95 border border-[#1F242D] rounded-lg p-0.5 shadow-lg backdrop-blur-md text-[#8A909E]"
    >
      {/* Quick Reaction Emojis (Desktop & Mobile compact) */}
      <div className="flex items-center">
        {QUICK_EMOJIS.slice(0, 4).map((emoji) => {
          const hasReacted = userReactions.includes(emoji);
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => onReact(emoji)}
              className={`px-1.5 py-0.5 text-xs rounded hover:scale-125 transition-transform cursor-pointer ${
                hasReacted ? 'bg-[#38BDF8]/20 ring-1 ring-[#38BDF8]/50' : 'hover:bg-[#1F242D]'
              }`}
              title={`React ${emoji}`}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          );
        })}
      </div>

      <div className="w-[1px] h-3.5 bg-[#1F242D] mx-0.5" />

      {/* Reply Action */}
      <button
        type="button"
        onClick={onReply}
        className="p-1 rounded hover:bg-[#1F242D] hover:text-[#EDEDED] transition-colors cursor-pointer"
        title="Reply to message"
        aria-label="Reply to message"
      >
        <Reply className="w-3.5 h-3.5" />
      </button>

      {/* Pin / Unpin Action */}
      <button
        type="button"
        onClick={onPin}
        className={`p-1 rounded hover:bg-[#1F242D] transition-colors cursor-pointer ${
          isPinned ? 'text-[#38BDF8]' : 'hover:text-[#EDEDED]'
        }`}
        title={isPinned ? 'Unpin message' : 'Pin message'}
        aria-label={isPinned ? 'Unpin message' : 'Pin message'}
      >
        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
      </button>

      {/* More Actions Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setShowMore((prev) => !prev)}
        className="p-1 rounded hover:bg-[#1F242D] hover:text-[#EDEDED] transition-colors cursor-pointer"
        title="More actions"
        aria-label="More message actions"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {/* More Actions Flyout Menu */}
      {showMore && (
        <div
          className={`absolute z-40 top-full mt-1 ${
            isOwn ? 'right-0' : 'left-0'
          } min-w-[170px] bg-[#0D0F12] border border-[#1F242D] rounded-xl shadow-2xl p-1 font-mono text-xs text-[#EDEDED] animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Remaining Reaction Emojis */}
          <div className="flex items-center justify-around py-1 px-1 border-b border-[#1F242D] mb-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  setShowMore(false);
                }}
                className={`p-1 text-sm rounded hover:scale-125 transition-transform cursor-pointer ${
                  userReactions.includes(emoji) ? 'bg-[#38BDF8]/20' : 'hover:bg-[#1F242D]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Copy Text */}
          {text && (
            <button
              type="button"
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#1F242D] text-left transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#8A909E]" />
              <span>Copy text</span>
            </button>
          )}

          {/* Edit (Own message & text only) */}
          {isOwn && text && onEdit && !isViewOnce && (
            <button
              type="button"
              onClick={() => {
                setShowMore(false);
                onEdit();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#1F242D] text-left transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Edit message</span>
            </button>
          )}

          {/* Block Participant (for incoming peer messages) */}
          {!isOwn && onBlockSender && (
            <button
              type="button"
              onClick={() => {
                setShowMore(false);
                onBlockSender();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-950/40 text-amber-400 hover:text-amber-300 text-left transition-colors cursor-pointer"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Block participant</span>
            </button>
          )}

          {/* Delete Submenu */}
          <button
            type="button"
            onClick={() => {
              setShowMore(false);
              setShowDeleteConfirm(true);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 text-left transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete...</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal / Popover */}
      {showDeleteConfirm && (
        <div
          className={`absolute z-50 top-full mt-1 ${
            isOwn ? 'right-0' : 'left-0'
          } w-56 bg-[#0D0F12] border border-[#1F242D] rounded-xl shadow-2xl p-2 font-mono text-xs text-[#EDEDED] animate-in fade-in duration-100`}
        >
          <div className="flex items-center justify-between px-1 pb-1.5 border-b border-[#1F242D] mb-1.5 text-[11px] text-[#8A909E]">
            <span>DELETE MESSAGE</span>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="hover:text-[#EDEDED]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowDeleteConfirm(false);
              onDeleteForMe();
              showToast('Deleted for you', 'info');
            }}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-[#1F242D] text-[#EDEDED] transition-colors cursor-pointer mb-1"
          >
            Delete for me
          </button>

          {isOwn && onDeleteForEveryone && (
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                onDeleteForEveryone();
                showToast('Deleted for everyone', 'info');
              }}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Delete for everyone
            </button>
          )}
        </div>
      )}
    </div>
  );
};
