/**
 * NEXUS Chat Area Component
 *
 * Minimalist, high-density timeline supporting:
 * - Zero-knowledge end-to-end encryption verification
 * - Quoted reply previews with click-to-scroll
 * - One-time view ephemeral media ("1× Photo")
 * - Message reactions with count & toggle
 * - In-place message edits & deleted message placeholders
 * - Pinned status indicators
 * - Local message search match highlighting
 * - Hover & long-press action menu
 */

import React, { useEffect, useRef } from 'react';
import { TimelineItem, ChatMessage } from '../../types/protocol.ts';
import { formatTimestamp, formatFileSize } from '../../utils/format.ts';
import { MessageActionMenu } from './MessageActionMenu.tsx';
import { VoiceNotePlayer } from './VoiceNotePlayer.tsx';
import { renderFormattedMessageText } from '../../utils/textFormatter.tsx';
import {
  Lock,
  ShieldCheck,
  MessageSquare,
  Paperclip,
  Download,
  File,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Pin,
  Eye,
  EyeOff,
  CornerDownRight,
  Ban,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Info,
} from 'lucide-react';

interface ChatAreaProps {
  timeline: TimelineItem[];
  currentUserId: string;
  isEncrypted: boolean;
  peerTyping: string | null;
  searchQuery?: string;
  activeMatchMessageId?: string | null;
  onReply: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onEdit: (message: ChatMessage) => void;
  onPin: (messageId: string, isPinned: boolean) => void;
  onDeleteForMe: (messageId: string) => void;
  onDeleteForEveryone: (messageId: string) => void;
  onOpenViewOnce: (imageUrl: string, senderName: string, messageId: string) => void;
  onRetry?: (messageId: string) => void;
  onBlockSender?: (senderId: string) => void;
}

function getFileIcon(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-[#38BDF8]" />;
  }
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rs', 'go', 'html', 'css', 'c', 'cpp', 'sh', 'sql'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-emerald-400" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-400" />;
  }
  if (['pdf', 'txt', 'md', 'doc', 'docx', 'rtf'].includes(ext) || mimeType.startsWith('text/')) {
    return <FileText className="w-5 h-5 text-cyan-400" />;
  }
  return <File className="w-5 h-5 text-[#8A909E]" />;
}


export const ChatArea: React.FC<ChatAreaProps> = ({
  timeline,
  currentUserId,
  isEncrypted,
  peerTyping,
  searchQuery,
  activeMatchMessageId,
  onReply,
  onReact,
  onEdit,
  onPin,
  onDeleteForMe,
  onDeleteForEveryone,
  onOpenViewOnce,
  onRetry,
  onBlockSender,
}) => {
  const [activeActionMenuId, setActiveActionMenuId] = React.useState<string | null>(null);
  const [isInfoTooltipOpen, setIsInfoTooltipOpen] = React.useState(false);
  const infoTooltipRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Close info tooltip on outside click or Escape
  useEffect(() => {
    if (!isInfoTooltipOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (infoTooltipRef.current && !infoTooltipRef.current.contains(e.target as Node)) {
        setIsInfoTooltipOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsInfoTooltipOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isInfoTooltipOpen]);

  // Close action toolbar on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.message-action-wrapper') && !target.closest('.message-bubble-target')) {
        setActiveActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-scroll to bottom on new messages if not searching
  useEffect(() => {
    if (!searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline, peerTyping, searchQuery]);

  // Scroll to active search match
  useEffect(() => {
    if (activeMatchMessageId) {
      const el = document.getElementById(`msg-container-${activeMatchMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeMatchMessageId]);

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-container-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#38BDF8]', 'bg-[#38BDF8]/10');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#38BDF8]', 'bg-[#38BDF8]/10');
      }, 1500);
    }
  };

  // Check if there are actual active chat messages (excluding system notices & deleted items)
  const hasChatMessages = timeline.some(
    (item) => item.kind === 'message' && !(item as ChatMessage).isDeleted
  );

  return (
    <div
      id="chat-area"
      className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-6 sm:py-5 text-sm font-sans select-text"
    >
      {/* Session Security Banner */}
      <div className="mx-auto max-w-full sm:max-w-lg mb-4 sm:mb-5 p-2.5 sm:p-3 rounded-xl bg-[#0D0F12] border border-[#1F242D] text-xs text-[#8A909E] text-center font-mono shadow-xs relative">
        <div className="flex items-center justify-center gap-1.5 text-[#EDEDED] font-medium mb-1">
          <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span>ZERO-KNOWLEDGE RELAY</span>

          {/* Subtle Security Info Tooltip / Popover */}
          <div className="relative inline-flex items-center" ref={infoTooltipRef}>
            <button
              type="button"
              onClick={() => setIsInfoTooltipOpen((v) => !v)}
              onMouseEnter={() => setIsInfoTooltipOpen(true)}
              onMouseLeave={() => setIsInfoTooltipOpen(false)}
              onFocus={() => setIsInfoTooltipOpen(true)}
              onBlur={() => setIsInfoTooltipOpen(false)}
              className="p-0.5 rounded text-[#8A909E] hover:text-[#38BDF8] focus:text-[#38BDF8] focus:outline-none focus:ring-1 focus:ring-[#38BDF8]/50 transition-colors cursor-pointer"
              title="Security Information"
              aria-label="Security Information"
              aria-expanded={isInfoTooltipOpen}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {isInfoTooltipOpen && (
              <div
                role="tooltip"
                className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 sm:w-80 p-3 rounded-xl bg-[#0A0C10] border border-[#1F242D] text-[#EDEDED] text-left text-xs font-mono shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-100 select-none pointer-events-auto"
              >
                <div className="font-semibold text-[#38BDF8] mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Security Architecture</span>
                </div>
                <p className="text-[11px] text-[#8A909E] leading-relaxed mb-2">
                  All messages, media, and voice notes are client-side encrypted using AES-256-GCM. Session keys are derived locally via ECDH P-256 key agreement.
                </p>
                <p className="text-[10px] text-[#8A909E]/80 border-t border-[#1F242D] pt-1.5 leading-relaxed">
                  The Cloudflare edge relay server only routes opaque binary packets and never holds keys or accesses plaintext.
                </p>
              </div>
            )}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed">
          Messages and attachments are client-side encrypted with AES-256-GCM. The relay server routes encrypted envelopes without holding keys.
        </p>
      </div>

      {/* Clean Empty Chat State — shown when there are 0 real chat messages */}
      {!hasChatMessages && (
        <div
          id="nexus-empty-chat-state"
          className="flex flex-col items-center justify-center py-10 sm:py-16 text-center select-none animate-in fade-in duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-[#111318] border border-[#1F242D] flex items-center justify-center text-[#8A909E] mb-3 shadow-xs">
            <MessageSquare className="w-4 h-4 text-[#38BDF8]/70" />
          </div>
          <p className="text-sm font-mono font-medium text-[#EDEDED] tracking-wide">
            No messages yet
          </p>
          <p className="text-xs font-mono text-[#8A909E] mt-1">
            Start a secure conversation.
          </p>
        </div>
      )}

      {timeline.map((item, index) => {
        if (item.kind === 'system') {
          return (
            <div
              key={item.id}
              className="flex items-center justify-center gap-2 my-2 py-1 text-xs text-[#8A909E] font-mono"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F242D]"></span>
              <span className="text-center">{item.content}</span>
              <span className="text-[10px] text-[#8A909E]/70">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
          );
        }

        const msg = item as ChatMessage;
        const isOwn = msg.senderId === currentUserId;
        const isFile = Boolean(msg.attachment);
        const attachment = msg.attachment;
        const isImage = attachment?.type.startsWith('image/');
        const ext = attachment?.name.split('.').pop()?.toUpperCase() || 'FILE';
        const isSearchMatch = activeMatchMessageId === msg.id;

        // Grouping & Spacing calculation:
        // Consecutive messages from the same sender within 5 mins have tight 6px spacing without repeated sender header.
        const prevItem = index > 0 ? timeline[index - 1] : null;
        const isConsecutive =
          prevItem &&
          prevItem.kind === 'message' &&
          (prevItem as ChatMessage).senderId === msg.senderId &&
          Math.abs(msg.timestamp - (prevItem as ChatMessage).timestamp) < 5 * 60 * 1000 &&
          !msg.isPinned &&
          !(prevItem as ChatMessage).isPinned;

        // Deleted Message View
        if (msg.isDeleted) {
          return (
            <div
              key={msg.id}
              id={`msg-container-${msg.id}`}
              className={`flex flex-col ${
              isOwn ? 'items-end' : 'items-start'
            } max-w-2xl mx-auto w-full ${
              isConsecutive ? 'mt-1' : 'mt-3 sm:mt-4'
            }`}
            >
              {!isConsecutive && (
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-[#8A909E] select-none">
                  <span className={isOwn ? 'text-[#38BDF8] font-semibold' : 'text-[#EDEDED] font-semibold'}>
                    {msg.senderName}
                  </span>
                  <span>·</span>
                  <span>{formatTimestamp(msg.timestamp)}</span>
                </div>
              )}
              <div className="px-3.5 py-2 rounded-xl bg-[#0D0F12]/60 border border-[#1F242D]/50 text-xs font-mono italic text-[#8A909E] flex items-center gap-2">
                <Ban className="w-3.5 h-3.5 text-[#8A909E]/60" />
                <span>This message was deleted</span>
              </div>
            </div>
          );
        }

        // Calculate active user reactions
        const userReactions = Object.entries(msg.reactions || {})
          .filter(([_, users]) => users.includes(currentUserId))
          .map(([emoji]) => emoji);

        return (
          <div
            key={msg.id}
            id={`msg-container-${msg.id}`}
            className={`flex flex-col ${
              isOwn ? 'items-end' : 'items-start'
            } max-w-2xl mx-auto w-full group relative transition-all rounded-xl ${
              isConsecutive ? 'mt-1' : 'mt-3 sm:mt-4'
            } ${isSearchMatch ? 'ring-2 ring-[#38BDF8] p-1 bg-[#38BDF8]/5' : ''}`}
          >
            {/* Sender & Timestamp Header for new message groups */}
            {!isConsecutive && (
              <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono text-[#8A909E] select-none">
                <span className={isOwn ? 'text-[#38BDF8] font-semibold' : 'text-[#EDEDED] font-semibold'}>
                  {msg.senderName}
                </span>
                <span>·</span>
                <span>{formatTimestamp(msg.timestamp)}</span>

                {msg.isViewOnce ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30">
                    <Eye className="w-2.5 h-2.5" />
                    <span>1× VIEW ONCE</span>
                  </span>
                ) : isFile ? (
                  <span
                    id={`msg-badge-file-${msg.id}`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/30"
                  >
                    <Lock className="w-2.5 h-2.5 text-[#38BDF8]" />
                    <span>ENCRYPTED FILE</span>
                  </span>
                ) : null}

                {isEncrypted && (
                  <ShieldCheck className="w-3 h-3 text-[#38BDF8]/70" title="End-to-end verified" />
                )}
              </div>
            )}

            {/* Message Body Container: w-fit ensures bubble size matches content, max-w ensures it doesn't exceed viewport fraction.
                IMPORTANT: No min-w-0 here — that would starve the bubble of natural content width inside a flex column,
                causing short words like 'hi' or 'hello' to wrap character-by-character. */}
            <div className="relative w-fit max-w-[85%] sm:max-w-[75%]">
              {/* VOICE NOTE PLAYER */}
              {msg.isVoiceNote && attachment?.dataUrl ? (
                <div id={`chat-voicenote-${msg.id}`} className="space-y-1">
                  <VoiceNotePlayer
                    dataUrl={attachment.dataUrl}
                    durationSec={msg.voiceDurationSec}
                    isOwn={isOwn}
                    isViewOnce={msg.isViewOnce}
                    isViewed={msg.isViewed}
                    onViewOnceDestroy={() => {
                      if (!msg.isViewed && onOpenViewOnce) {
                        onOpenViewOnce(attachment.dataUrl, msg.senderName, msg.id);
                      }
                    }}
                  />
                  {msg.text && (
                    <div className="mt-1.5 text-xs text-[#EDEDED] [overflow-wrap:anywhere] [word-break:normal] whitespace-pre-wrap">
                      {renderFormattedMessageText(msg.text, searchQuery)}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-[#8A909E] select-none pr-1">
                    <span>{formatTimestamp(msg.timestamp)}</span>
                    {isOwn && (
                      <span className="inline-flex items-center ml-0.5">
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3 h-3 text-[#38BDF8]" title="Read" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3 h-3 text-[#8A909E]" title="Delivered" />
                        ) : (
                          <Check className="w-3 h-3 text-[#8A909E]" title="Sent" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ) : msg.isViewOnce ? (
                <div
                  id={`chat-viewonce-${msg.id}`}
                  className={`p-3 sm:p-3.5 rounded-2xl text-xs font-mono w-full transition-all border ${
                    msg.isViewed
                      ? 'bg-[#0A0D12] border-[#1F242D] text-[#8A909E]'
                      : 'bg-[#0D1520] border-[#38BDF8]/40 hover:border-[#38BDF8]/70 text-[#EDEDED] shadow-md cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!msg.isViewed && attachment?.dataUrl) {
                      onOpenViewOnce(attachment.dataUrl, msg.senderName, msg.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        msg.isViewed
                          ? 'bg-[#111318] text-[#8A909E] border border-[#1F242D]'
                          : 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                      }`}
                    >
                      {msg.isViewed ? <EyeOff className="w-4 h-4" /> : '1×'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-[#EDEDED]">
                        {msg.isViewed ? 'Photo Viewed' : 'One-Time View Photo'}
                      </div>
                      <div className="text-[11px] text-[#8A909E] mt-0.5 leading-tight">
                        {msg.isViewed
                          ? isOwn
                            ? 'Opened by recipient · Expired'
                            : 'Photo Viewed · Expired'
                          : isOwn
                          ? '1× View-Once photo sent'
                          : 'Tap to view • Self-destructs upon close'}
                      </div>
                    </div>
                  </div>

                  {msg.text && (
                    <div className="mt-2.5 pt-2 border-t border-[#1F242D] text-xs text-[#EDEDED] font-sans [overflow-wrap:anywhere] [word-break:normal] whitespace-pre-wrap">
                      {renderFormattedMessageText(msg.text, searchQuery)}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-2 text-[10px] font-mono text-[#8A909E] select-none">
                    <span>{formatTimestamp(msg.timestamp)}</span>
                    {isOwn && (
                      <span className="inline-flex items-center ml-0.5">
                        {msg.isViewed ? (
                          <CheckCheck className="w-3 h-3 text-[#38BDF8]" title="Viewed by peer" />
                        ) : (
                          <Check className="w-3 h-3 text-[#8A909E]" title="Sent" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ) : isFile && attachment ? (
                /* Encrypted File Attachment Card */
                <div
                  id={`chat-attachment-${msg.id}`}
                  className={`rounded-2xl text-sm leading-relaxed w-full transition-all p-3 sm:p-3.5 ${
                    isOwn
                      ? 'bg-[#0B121C] border border-[#38BDF8]/40 text-[#EDEDED] shadow-sm ring-1 ring-[#38BDF8]/10'
                      : 'bg-[#0A1017] border border-[#1F3347] hover:border-[#38BDF8]/40 text-[#EDEDED] shadow-sm'
                  }`}
                >
                  {/* File Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#101A26] border border-[#1E3044] flex items-center justify-center shrink-0">
                      {getFileIcon(attachment.name, attachment.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs sm:text-sm font-semibold text-[#EDEDED] truncate" title={attachment.name}>
                        {attachment.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-[#8A909E]">
                        <span>{formatFileSize(attachment.size)}</span>
                        <span>·</span>
                        <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-[#101824] text-[#38BDF8] border border-[#1F2E40]">
                          {ext}
                        </span>
                      </div>
                    </div>

                    {/* Download Button */}
                    <a
                      id={`download-attachment-${msg.id}`}
                      href={attachment.dataUrl}
                      download={attachment.name}
                      className="px-2.5 py-1.5 rounded-lg bg-[#142233] hover:bg-[#1C324D] border border-[#38BDF8]/30 hover:border-[#38BDF8]/60 text-xs font-mono text-[#38BDF8] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
                      title="Save decrypted file locally"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                  </div>

                  {/* Image Preview */}
                  {isImage && (
                    <div className="mt-2.5 rounded-lg overflow-hidden border border-[#1F2E40] bg-[#05080C] max-h-64 flex items-center justify-center">
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.name}
                        referrerPolicy="no-referrer"
                        className="max-h-64 max-w-full object-contain rounded-md"
                      />
                    </div>
                  )}

                  {/* Caption */}
                  {msg.text && (
                    <div className="mt-2.5 pt-2 border-t border-[#1E3044] text-xs sm:text-sm text-[#EDEDED] [overflow-wrap:anywhere] [word-break:normal] whitespace-pre-wrap selection:bg-[#38BDF8]/30">
                      {renderFormattedMessageText(msg.text, searchQuery)}
                    </div>
                  )}

                  {/* Footer Pill */}
                  <div className="mt-2.5 pt-1.5 border-t border-[#1E3044]/60 flex items-center justify-between text-[10px] font-mono text-[#8A909E]">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#38BDF8]" />
                      <span>AES-256-GCM blob</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span>{formatTimestamp(msg.timestamp)}</span>
                      {isOwn && (
                        <span className="inline-flex items-center ml-0.5">
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3 h-3 text-[#38BDF8]" title="Read" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3 h-3 text-[#8A909E]" title="Delivered" />
                          ) : (
                            <Check className="w-3 h-3 text-[#8A909E]" title="Sent" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Text Message Bubble */
                <div
                  id={`chat-text-${msg.id}`}
                  onClick={() => setActiveActionMenuId((prev) => (prev === msg.id ? null : msg.id))}
                  className={`message-bubble-target px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-sm leading-relaxed w-fit max-w-full transition-all cursor-pointer sm:cursor-default ${
                    isOwn
                      ? 'bg-[#111318] border border-[#1F242D] text-[#EDEDED] shadow-xs'
                      : 'bg-[#0D0F12] border border-[#1F242D] text-[#EDEDED] shadow-xs'
                  }`}
                >
                  {/* Quoted Reply Preview (if message is a reply) */}
                  {msg.replyTo && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        scrollToMessage(msg.replyTo!.messageId || msg.replyTo!.id);
                      }}
                      className={`mb-2 p-2 rounded-lg text-xs font-mono border-l-2 border-l-[#38BDF8] border border-[#1F242D] cursor-pointer hover:bg-[#151A22] transition-colors max-w-full ${
                        isOwn ? 'bg-[#0B121C]' : 'bg-[#080B0F]'
                      }`}
                      title="Click to jump to replied message"
                    >
                      <div className="flex items-center gap-1 text-[11px] text-[#38BDF8] font-semibold mb-0.5">
                        <CornerDownRight className="w-3 h-3" />
                        <span>{msg.replyTo.senderName}</span>
                      </div>
                      <div className="text-[#8A909E] truncate text-[11px]">
                        {msg.replyTo.snippet || (msg.replyTo.fileName ? `[File] ${msg.replyTo.fileName}` : '[Media]')}
                      </div>
                    </div>
                  )}

                  {/* Message Text: word-break:normal prevents breaking short words character-by-character; overflow-wrap:anywhere safely wraps long URLs */}
                  <div className="[overflow-wrap:anywhere] [word-break:normal] whitespace-pre-wrap selection:bg-[#38BDF8]/30 font-sans">
                    {renderFormattedMessageText(msg.text || '', searchQuery)}
                  </div>

                  {/* Bubble Footer: Timestamp & Delivery Status */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-[#8A909E] select-none">
                    {msg.isEdited && <span className="italic mr-0.5">(edited)</span>}
                    {msg.isPinned && (
                      <span className="flex items-center gap-0.5 text-[#38BDF8] font-semibold mr-0.5">
                        <Pin className="w-2.5 h-2.5 fill-[#38BDF8]/20" />
                      </span>
                    )}
                    <span>{formatTimestamp(msg.timestamp)}</span>

                    {/* Delivery & Read Receipts for Own Messages */}
                    {isOwn && (
                      <span className="inline-flex items-center ml-0.5" id={`msg-status-${msg.id}`}>
                        {msg.status === 'sending' && (
                          <Clock className="w-3 h-3 text-[#8A909E] animate-pulse" title="Sending..." />
                        )}
                        {msg.status === 'sent' && (
                          <Check className="w-3 h-3 text-[#8A909E]" title="Sent to relay" />
                        )}
                        {msg.status === 'delivered' && (
                          <CheckCheck className="w-3 h-3 text-[#8A909E]" title="Delivered to peer" />
                        )}
                        {msg.status === 'read' && (
                          <CheckCheck className="w-3 h-3 text-[#38BDF8]" title="Read by peer" />
                        )}
                        {msg.status === 'failed' && onRetry && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetry(msg.id);
                            }}
                            className="inline-flex items-center gap-0.5 text-rose-400 hover:text-rose-300 text-[10px] font-mono hover:underline cursor-pointer"
                            title="Sending failed. Click to retry."
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Action Toolbar on Hover (Desktop) & Tap (Mobile) */}
              <div
                className={`message-action-wrapper absolute ${
                  isOwn ? 'right-0' : 'left-0'
                } -top-8 z-30 transition-all duration-150 ${
                  activeActionMenuId === msg.id
                    ? 'opacity-100 pointer-events-auto scale-100'
                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto scale-95 group-hover:scale-100'
                }`}
                style={{ maxWidth: 'calc(100vw - 1rem)' }}
              >
                <MessageActionMenu
                  messageId={msg.id}
                  senderId={msg.senderId}
                  senderName={msg.senderName}
                  text={msg.text}
                  isFile={isFile}
                  fileName={attachment?.name}
                  isViewOnce={msg.isViewOnce}
                  isPinned={msg.isPinned}
                  isOwn={isOwn}
                  isDeleted={msg.isDeleted}
                  userReactions={userReactions}
                  onReply={() => {
                    setActiveActionMenuId(null);
                    onReply(msg);
                  }}
                  onReact={(emoji) => {
                    setActiveActionMenuId(null);
                    onReact(msg.id, emoji);
                  }}
                  onEdit={isOwn && !isFile && !msg.isViewOnce ? () => {
                    setActiveActionMenuId(null);
                    onEdit(msg);
                  } : undefined}
                  onPin={() => {
                    setActiveActionMenuId(null);
                    onPin(msg.id, !msg.isPinned);
                  }}
                  onDeleteForMe={() => {
                    setActiveActionMenuId(null);
                    onDeleteForMe(msg.id);
                  }}
                  onDeleteForEveryone={isOwn ? () => {
                    setActiveActionMenuId(null);
                    onDeleteForEveryone(msg.id);
                  } : undefined}
                  onBlockSender={onBlockSender ? () => {
                    setActiveActionMenuId(null);
                    onBlockSender(msg.senderId);
                  } : undefined}
                />
              </div>
            </div>

            {/* Reaction Pills Below Bubble */}
            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1 px-1">
                {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                  const hasReacted = userIds.includes(currentUserId);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => onReact(msg.id, emoji)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                        hasReacted
                          ? 'bg-[#38BDF8]/20 border border-[#38BDF8]/60 text-[#38BDF8]'
                          : 'bg-[#111318] border border-[#1F242D] text-[#8A909E] hover:border-[#1F242D]/80 hover:text-[#EDEDED]'
                      }`}
                      title={`${userIds.length} reaction${userIds.length > 1 ? 's' : ''}`}
                    >
                      <span>{emoji}</span>
                      <span className="text-[10px] font-semibold">{userIds.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Typing Indicator */}
      {peerTyping && (
        <div className="max-w-2xl mx-auto w-full flex items-center gap-2 text-xs font-mono text-[#8A909E] px-1 py-1 mt-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-1 bg-[#111318] border border-[#1F242D] px-2.5 py-1 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse [animation-delay:200ms]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse [animation-delay:400ms]"></span>
            <span className="text-[#EDEDED] font-medium ml-1.5">{peerTyping}</span>
            <span className="text-[#8A909E]">is typing...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
