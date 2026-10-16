/**
 * NEXUS FAQ Modal
 *
 * Direct, user-friendly explanations of all implemented features,
 * messaging operations, room controls, and cryptographic boundaries.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  Lock,
  Database,
  Clock,
  EyeOff,
  Flame,
  MessageSquare,
  CheckCheck,
  Radio,
  RefreshCw,
  FileCode,
  Phone,
  LogOut,
  Ban,
  UserCheck,
  Share2,
  ShieldAlert,
  ExternalLink,
  LucideIcon,
} from 'lucide-react';

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type FaqCategory =
  | 'all'
  | 'security'
  | 'messaging'
  | 'rooms'
  | 'privacy'
  | 'infrastructure';

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, 'all'>;
  question: string;
  answer: string;
  technicalBadge: string;
  icon: LucideIcon;
}

const FAQ_ITEMS: FaqItem[] = [
  // 1. Overview & Capabilities
  {
    id: 'features-overview',
    category: 'messaging',
    question: 'What features does NEXUS provide?',
    answer:
      'NEXUS provides end-to-end encrypted messaging, direct P2P WebRTC voice calling, 1× ephemeral voice notes, self-destructing view-once media, 4-stage delivery receipts, typing indicators, threaded quoted replies, in-memory timeline search, and an emergency burn room kill switch. Everything runs strictly in volatile RAM with zero server database storage.',
    technicalBadge: 'ECDH P-256 • WebRTC • 100% Volatile RAM',
    icon: HelpCircle,
  },
  {
    id: 'realtime-messaging',
    category: 'messaging',
    question: 'How does real-time messaging work?',
    answer:
      'When connected, messages are encrypted in your browser using AES-256-GCM and dispatched over a bidirectional WebSocket to the Cloudflare edge relay. The relay forwards the opaque ciphertext envelope directly to your peer’s active connection for immediate client-side decryption.',
    technicalBadge: 'WebSockets • Durable Objects • Sub-100ms Dispatch',
    icon: MessageSquare,
  },
  {
    id: 'delivery-receipts',
    category: 'messaging',
    question: 'What do the Sending, Sent, Delivered, and Read states mean?',
    answer:
      'NEXUS uses a 4-stage delivery lifecycle. "Sending" indicates the message is being prepared locally. "Sent" confirms the relay accepted the frame. "Delivered" signals your peer\'s browser received it. "Read" triggers via an in-viewport Intersection Observer only when the message enters your peer\'s active view.',
    technicalBadge: 'SENDING → SENT → DELIVERED → READ',
    icon: CheckCheck,
  },
  {
    id: 'typing-indicator',
    category: 'messaging',
    question: 'Does NEXUS show when someone is typing?',
    answer:
      'Yes. When a participant is actively typing, a debounced presence signal is transmitted over the WebSocket. It informs your peer that you are composing a message without exposing any keystrokes or text content.',
    technicalBadge: 'Debounced Signaling • Zero Text Exposure',
    icon: Radio,
  },
  {
    id: 'reconnection',
    category: 'infrastructure',
    question: 'What happens if my connection drops?',
    answer:
      'If network connectivity is temporarily lost, NEXUS automatically attempts reconnection using an exponential backoff strategy. Once reconnected, the client re-authenticates to the room and synchronizes presence without requiring a full page reload.',
    technicalBadge: 'Exponential Backoff • State Recovery',
    icon: RefreshCw,
  },
  {
    id: 'media-sharing',
    category: 'messaging',
    question: 'Can I share media?',
    answer:
      'Yes. NEXUS supports sending JPEG, PNG, WebP, GIF, PDF, and TXT files up to 3MB. Attachments are encoded and encrypted client-side using AES-256-GCM before transport, ensuring the relay never accesses raw image or document data.',
    technicalBadge: '≤ 3MB • In-Browser AES-GCM • MIME Whitelist',
    icon: FileCode,
  },
  {
    id: 'voice-calls',
    category: 'messaging',
    question: 'Can I send voice notes or make voice calls?',
    answer:
      'Yes. NEXUS provides 1× ephemeral encrypted voice notes recorded via microphone, complete with animated waveform scrubbing and speed toggles. For live voice, direct browser-to-browser WebRTC voice calling connects peers with dual-chime ringtones and DTLS-SRTP encryption without server audio handling.',
    technicalBadge: 'WebRTC DTLS-SRTP • MediaRecorder • Dual-Chime',
    icon: Phone,
  },

  // 2. Privacy & Storage
  {
    id: 'storage',
    category: 'privacy',
    question: 'Are my messages, media, or calls stored on any server?',
    answer:
      'No. NEXUS operates on a 100% zero-persistence architecture. All message routing happens in volatile memory through Cloudflare Durable Objects. No databases, persistent disk caches, or message logs exist.',
    technicalBadge: '0 Bytes Disk Storage • Cloudflare In-Memory DO',
    icon: Database,
  },
  {
    id: 'view-once',
    category: 'privacy',
    question: 'How does 1× View-Once media protection work?',
    answer:
      'View-Once media and voice notes are encrypted with individual ephemeral nonces. When opened, the content is held only in volatile browser RAM. Once closed or dismissed, the decrypted memory is wiped and the blob URL is revoked. Note that client-side software cannot technically stop external hardware cameras.',
    technicalBadge: 'URL.revokeObjectURL • Zero Residual Storage',
    icon: EyeOff,
  },
  {
    id: 'burn',
    category: 'privacy',
    question: 'What happens when I click BURN ROOM?',
    answer:
      'The BURN ROOM panic button (Ctrl+Shift+X or via menu) triggers immediate self-destruction: clears session keys, deletes local state, sends an emergency termination frame to your peer, and redirects your browser to an innocent decoy site (Google). A confirmation dialog prevents accidental triggers.',
    technicalBadge: 'Emergency Decoy • Instant RAM Eviction',
    icon: Flame,
  },
  {
    id: 'expiry',
    category: 'privacy',
    question: 'How long do private rooms stay active?',
    answer:
      'Rooms have a maximum inactivity timer of 15 minutes. If no messages or keep-alive pings occur within 15 minutes, the room and its memory state are permanently purged from the edge relay.',
    technicalBadge: '15-Minute Inactivity • Ephemeral Alarm Eviction',
    icon: Clock,
  },

  // 3. Rooms & User Controls
  {
    id: 'room-creation',
    category: 'rooms',
    question: 'How does room creation and joining work?',
    answer:
      'Creating a room generates a cryptographically randomized 8-character code from a 32-character unambiguous charset. To invite your peer, simply share the 8-character code or the direct 1-click invite link. The second participant joins by entering the code or opening the link.',
    technicalBadge: 'Crockford Base32 • Direct Link Joining',
    icon: Share2,
  },
  {
    id: 'leave-room',
    category: 'rooms',
    question: 'Can I leave a room?',
    answer:
      'Yes. Clicking the Leave button in the header or menu prompts a confirmation modal. Leaving closes your WebSocket connection, destroys the local session keys, and returns you safely to the landing screen while notifying your peer.',
    technicalBadge: 'Confirmation Guard • Key Annihilation',
    icon: LogOut,
  },
  {
    id: 'blocking',
    category: 'rooms',
    question: 'Can participants be blocked?',
    answer:
      'Yes. The Room Inspector allows you to block or mute a disruptive participant locally. Incoming messages, typing status, and presence signals from blocked IDs are dropped client-side without alerting the relay.',
    technicalBadge: 'Client-Side Drop • Zero Network Leakage',
    icon: Ban,
  },
  {
    id: 'guest-mode',
    category: 'rooms',
    question: 'How does Guest Mode work?',
    answer:
      'NEXUS requires no account creation, email addresses, phone numbers, or passwords. You can enter any valid room simply by choosing an ephemeral display name. Identities exist only for the lifetime of the active session.',
    technicalBadge: 'No Registration • Volatile Identity',
    icon: UserCheck,
  },

  // 4. Security & Cryptography
  {
    id: 'keys',
    category: 'security',
    question: 'Who generates and controls the encryption keys?',
    answer:
      'Only your browser and your peer’s browser. Ephemeral ECDH P-256 keys are negotiated client-side using the native Web Crypto API. The edge server routes encrypted binary payloads and cannot read your messages or media.',
    technicalBadge: 'ECDH P-256 • HKDF-SHA-256 • AES-256-GCM',
    icon: Lock,
  },
  {
    id: 'access',
    category: 'security',
    question: 'Can a third party enter or eavesdrop on my room?',
    answer:
      'No. Each room allows a maximum of 2 participants. Once two peers are connected, the room is locked. Any third connection attempt is immediately rejected with a 403 Forbidden status.',
    technicalBadge: '403 Forbidden Gate • 1-on-1 Confidentiality',
    icon: ShieldCheck,
  },
  {
    id: 'anonymity',
    category: 'security',
    question: 'Does NEXUS provide anonymity?',
    answer:
      'NEXUS provides strong cryptographic confidentiality and message integrity, but does not provide complete network anonymity. Network observers and cloud infrastructure can view IP addresses, connection timestamps, and packet sizes. For anonymous transport, pair NEXUS with an anonymity network like Tor.',
    technicalBadge: 'End-to-End Confidentiality • Observable Network Metadata',
    icon: ShieldAlert,
  },

  // 5. Infrastructure
  {
    id: 'open-source',
    category: 'infrastructure',
    question: 'Is NEXUS open source?',
    answer:
      'Yes. NEXUS is open source. The complete client and edge worker implementation is publicly accessible on GitHub for auditing, inspection, and self-hosting.',
    technicalBadge: 'Open Source • MIT Licensed • Public Codebase',
    icon: ExternalLink,
  },
];

const FAQ_CATEGORIES: { key: FaqCategory; label: string }[] = [
  { key: 'all', label: 'All Questions' },
  { key: 'security', label: 'Security & Keys' },
  { key: 'messaging', label: 'Messaging & Calls' },
  { key: 'rooms', label: 'Rooms & Controls' },
  { key: 'privacy', label: 'Privacy & Storage' },
  { key: 'infrastructure', label: 'Edge Infrastructure' },
];

export const FaqModal: React.FC<FaqModalProps> = ({ isOpen, onClose }) => {
  const [openItem, setOpenItem] = useState<string>('features-overview');
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('all');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = FAQ_ITEMS.length;

  const filteredItems =
    activeCategory === 'all'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === activeCategory);

  return (
    <div
      id="faq-modal-backdrop"
      className="fixed inset-0 z-60 flex sm:items-center items-end justify-center bg-black/80 backdrop-blur-sm sm:p-4 p-0 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="faq-modal-content"
        className="relative w-full sm:max-w-2xl bg-[#0D0F12] border border-[#1F242D] sm:rounded-2xl rounded-t-2xl shadow-2xl sm:p-6 p-5 text-[#EDEDED] max-h-[90vh] flex flex-col custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="faq-modal-title"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-[#1F242D]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F242D] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111318] border border-[#1F242D] flex items-center justify-center text-[#38BDF8] shadow-xs">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="faq-modal-title"
                className="text-base sm:text-lg font-semibold tracking-tight font-mono text-[#EDEDED]"
              >
                NEXUS Frequently Asked Questions
              </h2>
              <p className="text-xs text-[#8A909E] font-sans mt-0.5">
                Clear answers on capabilities, security architecture, and room controls.
              </p>
            </div>
          </div>

          <button
            id="faq-modal-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close FAQ"
            className="w-8 h-8 rounded-lg border border-[#1F242D] bg-[#111318] hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="pt-3 pb-2 border-b border-[#1F242D]/60 flex flex-wrap items-center gap-1.5 shrink-0">
          {FAQ_CATEGORIES.map((cat) => {
            const count =
              cat.key === 'all'
                ? totalCount
                : FAQ_ITEMS.filter((item) => item.category === cat.key).length;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-[#161B22] border-[#38BDF8]/50 text-[#EDEDED] font-semibold shadow-xs'
                    : 'bg-[#111318] border-[#1F242D] text-[#8A909E] hover:text-[#EDEDED]'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                      : 'bg-[#161920] text-[#8A909E]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Q&A Accordion */}
        <div className="overflow-y-auto py-3 space-y-2.5 pr-1 flex-1 custom-scrollbar">
          {filteredItems.map((item) => {
            const isExpanded = openItem === item.id;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="rounded-xl bg-[#111318]/70 border border-[#1F242D] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenItem(isExpanded ? '' : item.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs sm:text-[13px] font-mono font-medium text-[#EDEDED] hover:text-white transition-colors cursor-pointer"
                  aria-expanded={isExpanded}
                >
                  <span className="flex items-center gap-2.5 pr-2">
                    <Icon className="w-4 h-4 text-[#38BDF8] shrink-0" />
                    <span>{item.question}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#8A909E] shrink-0 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-[#38BDF8]' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-[13px] text-[#8A909E] leading-[1.65] border-t border-[#1F242D]/60 bg-[#0A0C10]/60 space-y-2.5 font-sans">
                    <p>{item.answer}</p>
                    <div className="pt-1">
                      <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-[#111318] text-[#38BDF8] border border-[#1F242D]">
                        {item.technicalBadge}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#1F242D] shrink-0 flex items-center justify-between text-xs text-[#8A909E]">
          <span className="font-mono text-[11px]">
            Showing {filteredItems.length} of {totalCount} questions
          </span>
          <button
            id="faq-modal-dismiss-btn"
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-[#141820] hover:bg-[#1C222E] text-[#EDEDED] font-mono text-xs rounded-lg border border-[#1F242D] hover:border-[#38BDF8]/40 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
