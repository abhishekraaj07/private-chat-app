/**
 * NEXUS Message Input Component
 *
 * Auto-expanding, keyboard accessible message composer with character limit,
 * typing throttle dispatch, quoted reply preview, message edit banner,
 * and 1× View-Once photo toggle.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Lock,
  Paperclip,
  X,
  AlertCircle,
  Reply,
  Edit2,
  Eye,
  Check,
  Mic,
  Flame,
  Trash2,
} from 'lucide-react';
import { useAutoResizeTextarea } from '../../hooks/useAutoResizeTextarea.ts';
import { EncryptedFileAttachment, ReplyReference } from '../../types/protocol.ts';
import { formatFileSize, formatCallDuration } from '../../utils/format.ts';

const MAX_CHAR_COUNT = 2000;
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB encrypted peer payload limit

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/wav',
  'audio/aac',
  'audio/x-m4a',
  'audio/m4a',
]);
const ALLOWED_FILE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'txt', 'mp3', 'wav', 'ogg', 'm4a', 'webm']);

interface MessageInputProps {
  onSendMessage: (
    text: string,
    file?: EncryptedFileAttachment,
    replyTo?: ReplyReference,
    isViewOnce?: boolean,
    isVoiceNote?: boolean,
    voiceDurationSec?: number
  ) => void;
  onTyping: (isTyping: boolean) => void;
  disabled: boolean;
  disabledReason?: string;
  replyingTo?: ReplyReference | null;
  onCancelReply?: () => void;
  editingMessage?: { id: string; text: string } | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (messageId: string, newText: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled,
  disabledReason,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
}) => {
  const [text, setText] = useState('');
  const [stagedFile, setStagedFile] = useState<EncryptedFileAttachment | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isVoiceViewOnce, setIsVoiceViewOnce] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useAutoResizeTextarea(text, 160);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync editing message to text state
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
      textareaRef.current?.focus();
    }
  }, [editingMessage, textareaRef]);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo, textareaRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      if (editingMessage && onCancelEdit) {
        onCancelEdit();
        setText('');
      } else if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHAR_COUNT) {
      setText(val);

      // Typing notification
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const processFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File exceeds 3 MB limit (${formatFileSize(file.size)}). Select a smaller file.`);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if ((file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) || !ALLOWED_FILE_EXTENSIONS.has(ext)) {
      setFileError('Unsupported file type. Allowed formats: JPG, PNG, WEBP, GIF, PDF, TXT.');
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStagedFile({
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result,
        });
        setIsViewOnce(false);
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read file locally.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (disabled) return;

    // Handle Edit saving
    if (editingMessage && onSaveEdit) {
      if (!trimmed) return;
      onSaveEdit(editingMessage.id, trimmed);
      setText('');
      if (onCancelEdit) onCancelEdit();
      return;
    }

    // Normal message send
    if (!trimmed && !stagedFile) return;

    onSendMessage(
      trimmed,
      stagedFile || undefined,
      replyingTo || undefined,
      isViewOnce
    );

    setText('');
    setStagedFile(null);
    setIsViewOnce(false);
    setFileError(null);
    if (onCancelReply) onCancelReply();
    onTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const startRecording = async () => {
    if (disabled || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus'))
        ? 'audio/webm;codecs=opus'
        : ((typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4')) ? 'audio/mp4' : 'audio/webm');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordDuration(0);

      const startTime = Date.now();
      recordTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordDuration(elapsed);
        if (elapsed >= 120) {
          stopAndSendRecording();
        }
      }, 500);
    } catch (err) {
      console.warn('Microphone error', err);
      setFileError('Microphone permission denied or microphone unavailable.');
    }
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (recorder.state !== 'inactive') {
        try { recorder.stop(); } catch {}
      }
      if (recorder.stream) {
        recorder.stream.getTracks().forEach((t) => t.stop());
      }
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordDuration(0);
    setIsVoiceViewOnce(false);
  };

  const stopAndSendRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = () => {
      const finalDuration = recordDuration;
      const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (recorder.stream) {
        recorder.stream.getTracks().forEach((t) => t.stop());
      }

      if (blob.size > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          onSendMessage(
            '',
            {
              name: `voice-note-${Date.now()}.webm`,
              size: blob.size,
              type: blob.type || 'audio/webm',
              dataUrl,
            },
            replyingTo || undefined,
            isVoiceViewOnce,
            true,
            finalDuration
          );
        };
        reader.readAsDataURL(blob);
      }

      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordDuration(0);
      setIsVoiceViewOnce(false);
    };

    recorder.stop();
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const canSend = Boolean(text.trim() || stagedFile) && !disabled;
  const isStagedFileImage = stagedFile?.type.startsWith('image/');

  return (
    <div
      id="message-input-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`px-2 pt-2 sm:px-4 sm:pt-3 border-t border-white/10 bg-[#0E121B]/65 backdrop-blur-xl shrink-0 transition-colors ${
        isDragging ? 'bg-[#38BDF8]/10 border-[#38BDF8]/60' : ''
      }`}
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Hidden File Input */}
        <input
          id="chat-file-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          aria-label="Select file attachment"
        />

        {disabled && disabledReason && (
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-mono text-amber-400/90">
            <Lock className="w-3.5 h-3.5" />
            <span>{disabledReason}</span>
          </div>
        )}

        {/* Editing Message Banner */}
        {editingMessage && (
          <div
            id="editing-message-banner"
            className="mb-2 p-2 px-3 rounded-lg bg-[#111318] border border-[#38BDF8]/50 flex items-center justify-between text-xs font-mono text-[#EDEDED] shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
              <Edit2 className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="text-[#38BDF8] font-semibold shrink-0">Editing message:</span>
              <span className="text-[#8A909E] truncate">{editingMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onCancelEdit) onCancelEdit();
                setText('');
              }}
              className="p-1 text-[#8A909E] hover:text-[#EDEDED] transition-colors cursor-pointer shrink-0"
              title="Cancel edit (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Replying Context Chip */}
        {replyingTo && !editingMessage && (
          <div
            id="reply-preview-banner"
            className="mb-2 p-2 px-3 rounded-lg bg-[#0C141F] border-l-2 border-l-[#38BDF8] border border-[#1F242D] flex items-center justify-between text-xs font-mono text-[#EDEDED] shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
              <Reply className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[#38BDF8] font-semibold text-[11px]">
                  Replying to {replyingTo.senderName}
                </span>
                <span className="text-[#8A909E] truncate text-[11px]">
                  {replyingTo.snippet || (replyingTo.fileName ? `[File] ${replyingTo.fileName}` : '[Message]')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              className="p-1 text-[#8A909E] hover:text-[#EDEDED] transition-colors cursor-pointer shrink-0"
              title="Cancel reply (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* File Error Notification */}
        {fileError && (
          <div className="mb-2 p-2 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-xs font-mono text-rose-300">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{fileError}</span>
            </div>
            <button
              type="button"
              onClick={() => setFileError(null)}
              className="p-1 hover:text-rose-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Staged File Preview Chip with 1× Toggle */}
        {stagedFile && (
          <div
            id="staged-file-preview"
            className="mb-2.5 p-2 px-3 rounded-lg bg-[#0C141F] border border-[#38BDF8]/40 flex items-center justify-between text-xs font-mono text-[#EDEDED] shadow-sm"
          >
            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
              <Paperclip className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="font-medium truncate">{stagedFile.name}</span>
              <span className="text-[#8A909E] shrink-0">({formatFileSize(stagedFile.size)})</span>

              {/* 1× View-Once Toggle for Images */}
              {isStagedFileImage && (
                <button
                  type="button"
                  onClick={() => setIsViewOnce((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    isViewOnce
                      ? 'bg-[#38BDF8] text-[#08090B] font-bold shadow-xs'
                      : 'bg-[#111318] text-[#8A909E] hover:text-[#EDEDED] border border-[#1F242D]'
                  }`}
                  title="Toggle One-Time View Media"
                >
                  <Eye className="w-3 h-3" />
                  <span>1× VIEW ONCE</span>
                  {isViewOnce && <Check className="w-2.5 h-2.5" />}
                </button>
              )}
            </div>

            <button
              id="remove-staged-file-btn"
              type="button"
              onClick={() => {
                setStagedFile(null);
                setIsViewOnce(false);
              }}
              className="p-1 text-[#8A909E] hover:text-rose-400 transition-colors cursor-pointer shrink-0"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isRecording ? (
          <div className="flex items-center justify-between gap-3 bg-[#0D0F12] border border-rose-500/50 rounded-xl p-2.5 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="font-mono text-xs font-semibold text-rose-300">
                Recording: {formatCallDuration(recordDuration)} / 2:00
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 1x View-Once toggle */}
              <button
                type="button"
                onClick={() => setIsVoiceViewOnce((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                  isVoiceViewOnce
                    ? 'bg-amber-400 text-black font-bold'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
                title="1x View Once Voice Note (Destroyed after 1 play)"
              >
                <Flame className="w-3 h-3" />
                <span>1× VIEW ONCE</span>
                {isVoiceViewOnce && <Check className="w-2.5 h-2.5" />}
              </button>

              {/* Cancel / Trash */}
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                title="Cancel voice note"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Send Voice Note */}
              <button
                type="button"
                onClick={stopAndSendRecording}
                className="p-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Send voice note"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex items-end gap-2 glass-input border border-white/12 focus-within:border-[#38BDF8]/60 rounded-2xl p-2.5 transition-all shadow-lg">
            {/* File Attachment Trigger Button */}
            <button
              id="attach-file-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || Boolean(editingMessage)}
              className="p-2 rounded-xl glass-btn-secondary text-[#8A909E] hover:text-[#38BDF8] border border-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Attach encrypted file (drag & drop or click, max 3MB)"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Textarea */}
            <textarea
              id="chat-message-textarea"
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={
                disabled
                  ? 'Waiting for secure session...'
                  : editingMessage
                  ? 'Edit message... (Esc to cancel)'
                  : stagedFile
                  ? isViewOnce
                    ? 'Add caption for 1× photo...'
                    : 'Add file caption...'
                  : 'Write a message or drop file...'
              }
              className="flex-1 bg-transparent text-[#EDEDED] text-sm placeholder-[#8A909E] focus:outline-none resize-none px-2 py-1.5 min-h-[40px] max-h-[160px] leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed"
            />

            <div className="flex items-center gap-1.5 pb-0.5">
              {text.length > 500 && (
                <span className="text-[10px] font-mono text-[#8A909E] pr-1">
                  {text.length}/{MAX_CHAR_COUNT}
                </span>
              )}

              {/* Mic / Voice Note Button (when not editing and input is empty) */}
              {!editingMessage && !text.trim() && !stagedFile && (
                <button
                  id="record-voice-btn"
                  type="button"
                  onClick={startRecording}
                  disabled={disabled}
                  className="p-2 rounded-xl glass-btn-secondary text-cyan-400 hover:text-cyan-300 border border-white/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  title="Record encrypted voice note"
                  aria-label="Record voice note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}

              {/* Send / Save Button (when there is text or staged file or editing) */}
              {(canSend || editingMessage) && (
                <button
                  id="send-message-btn"
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="p-2.5 rounded-xl glass-btn-primary text-slate-900 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shrink-0 flex items-center justify-center font-bold"
                  title={editingMessage ? 'Save edit' : 'Send encrypted message'}
                >
                  {editingMessage ? (
                    <Check className="w-4 h-4 text-slate-900" />
                  ) : (
                    <Send className="w-4 h-4 text-slate-900" />
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
