/**
 * NEXUS Specifications & Features Directory Modal
 *
 * Comprehensive directory of all implemented capabilities,
 * architecture specifications, and security model.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Terminal,
  ShieldCheck,
  CheckCheck,
  EyeOff,
  Clock,
  Zap,
  MessageSquare,
  Search,
  Ban,
  Cpu,
  FileCode,
  Layers,
  Sparkles,
  Github,
  ExternalLink,
  Lock,
  LucideIcon,
  Flame,
  Mic,
  Phone,
  Database,
  Share2,
  UserCheck,
  Users,
  Pin,
  Radio,
  RefreshCw,
  Shield,
  Key,
} from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type FeatureCategory =
  | 'all'
  | 'security'
  | 'messaging'
  | 'privacy'
  | 'controls'
  | 'realtime'
  | 'media'
  | 'infrastructure';

export type FeatureStatus = 'ACTIVE' | 'CLIENT-SIDE' | 'REAL-TIME' | 'EPHEMERAL' | 'IMPLEMENTED';

export interface FeatureSpec {
  id: string;
  category: Exclude<FeatureCategory, 'all'>;
  title: string;
  valueStatement: string;
  technical: string;
  status: FeatureStatus;
  icon: LucideIcon;
}

const FEATURES: FeatureSpec[] = [
  // 1. Security & Crypto
  {
    id: 'client-crypto',
    category: 'security',
    title: 'Client-Side Cryptography',
    valueStatement: 'Messages are protected in the browser before transport.',
    technical: 'ECDH P-256 • HKDF-SHA-256 • AES-256-GCM',
    status: 'CLIENT-SIDE',
    icon: ShieldCheck,
  },
  {
    id: 'fingerprint-verification',
    category: 'security',
    title: 'Session Fingerprint Verification',
    valueStatement: 'Verify peer authenticity out-of-band to prevent impersonation.',
    technical: 'SHA-256 Safety Numbers • Manual Peer Lock',
    status: 'ACTIVE',
    icon: Key,
  },
  {
    id: 'anti-replay',
    category: 'security',
    title: 'Anti-Replay Protection',
    valueStatement: 'Monotonic sequence numbering protects against message injection.',
    technical: 'Strict Inbound Ordering • In-Memory Replay Guard',
    status: 'IMPLEMENTED',
    icon: Lock,
  },

  // 2. Messaging
  {
    id: 'receipts',
    category: 'messaging',
    title: '4-Stage Delivery Receipts',
    valueStatement: 'Track message progress from sending to read.',
    technical: 'SENDING → SENT → DELIVERED → READ',
    status: 'REAL-TIME',
    icon: CheckCheck,
  },
  {
    id: 'threaded-replies',
    category: 'messaging',
    title: 'Threaded Quoted Replies',
    valueStatement: 'Quote specific messages with one-click auto-scroll and highlight.',
    technical: 'Contextual Thread Anchors • Smooth Target Scroll',
    status: 'ACTIVE',
    icon: MessageSquare,
  },
  {
    id: 'edits-tombstones',
    category: 'messaging',
    title: 'Real-Time Edits & Revocation',
    valueStatement: 'Update sent text or retract messages with cryptographic tombstones.',
    technical: 'In-Memory Tombstones • (edited) Sync',
    status: 'REAL-TIME',
    icon: Layers,
  },
  {
    id: 'links-code',
    category: 'messaging',
    title: 'Clickable Links & Inline Code',
    valueStatement: 'Sanitized hyperlinks open safely, and backtick syntax formats monospace code.',
    technical: 'rel="noopener noreferrer" • Inline `code` Formatter',
    status: 'ACTIVE',
    icon: FileCode,
  },
  {
    id: 'reactions',
    category: 'messaging',
    title: 'Emoji Reaction Signals',
    valueStatement: 'React with collaborative emoji signals synchronized between peers.',
    technical: 'Lightweight Peer Signals • Zero Persistent Retention',
    status: 'REAL-TIME',
    icon: Sparkles,
  },

  // 3. Privacy & Ephemerality
  {
    id: 'local-search',
    category: 'privacy',
    title: 'Zero-Knowledge Timeline Search',
    valueStatement: 'Search chat text locally in memory without exposing queries.',
    technical: 'Ctrl+K Hotkey • 100% Client-Side Evaluation',
    status: 'CLIENT-SIDE',
    icon: Search,
  },
  {
    id: 'disappearing-messages',
    category: 'privacy',
    title: 'Configurable Disappearing Messages',
    valueStatement: 'Purges message payloads from browser RAM after a set countdown.',
    technical: '30s · 1m · 5m · 1h TTL • Real-Time Dual Purge',
    status: 'EPHEMERAL',
    icon: Clock,
  },
  {
    id: 'view-once',
    category: 'privacy',
    title: '1× View-Once Self-Destructing Media',
    valueStatement: 'Decrypted only in volatile RAM and permanently wiped upon dismissal.',
    technical: 'URL.revokeObjectURL • Zero Disk Forensics',
    status: 'EPHEMERAL',
    icon: EyeOff,
  },
  {
    id: 'panic-burn',
    category: 'privacy',
    title: 'Panic / Burn Room Kill Switch',
    valueStatement: 'Emergency wipe: destroys session keys, notifies peer, and redirects to decoy.',
    technical: 'Ctrl+Shift+X • Instant RAM Wipe & Decoy Redirect',
    status: 'EPHEMERAL',
    icon: Flame,
  },
  {
    id: 'zero-storage',
    category: 'privacy',
    title: 'Zero Persistent Storage',
    valueStatement: 'No databases, disk caches, or persistent message logs exist.',
    technical: '0 Bytes Disk Storage • Volatile Memory Exclusivity',
    status: 'CLIENT-SIDE',
    icon: Database,
  },

  // 4. Room & Participant Controls
  {
    id: 'room-code-links',
    category: 'controls',
    title: 'Ephemeral Room Code & Direct Link',
    valueStatement: 'Create and enter rooms with 8-character codes or 1-click invite links.',
    technical: 'Crockford Base32 • Cryptographic Randomization',
    status: 'ACTIVE',
    icon: Share2,
  },
  {
    id: 'guest-mode',
    category: 'controls',
    title: 'Guest Mode Anonymous Entry',
    valueStatement: 'Join rooms instantly with an ephemeral display name; zero registration.',
    technical: 'Zero Account Requirement • Ephemeral Identity',
    status: 'ACTIVE',
    icon: UserCheck,
  },
  {
    id: 'two-peer-lock',
    category: 'controls',
    title: 'Strict 2-Participant Room Lock',
    valueStatement: 'Rooms automatically lock when two peers connect; third parties are rejected.',
    technical: '403 Forbidden Gate • 1-on-1 Confidentiality',
    status: 'ACTIVE',
    icon: Users,
  },
  {
    id: 'block-participant',
    category: 'controls',
    title: 'Local Participant Shield & Mute',
    valueStatement: 'Locally discard incoming messages and signals without notifying the relay.',
    technical: 'Client-Side Message Filter • Zero Network Leakage',
    status: 'CLIENT-SIDE',
    icon: Ban,
  },
  {
    id: 'pinned-notices',
    category: 'controls',
    title: 'Pinned Announcement Notices',
    valueStatement: 'Pin critical room rules or instructions at the top of the conversation.',
    technical: 'Top Banner Bar • Peer Synchronized Display',
    status: 'REAL-TIME',
    icon: Pin,
  },

  // 5. Real-Time & Connection
  {
    id: 'presence-telemetry',
    category: 'realtime',
    title: 'Peer Presence & Last-Seen Telemetry',
    valueStatement: 'Live peer connection status with humanized last-seen indicators.',
    technical: 'Volatile Heartbeat • Online / Offline Indicators',
    status: 'REAL-TIME',
    icon: Zap,
  },
  {
    id: 'typing-indicators',
    category: 'realtime',
    title: 'Typing Activity Indicators',
    valueStatement: 'Shows when peer is actively composing without leaking text content.',
    technical: 'Debounced WebSocket Signal • Zero Keystroke Logging',
    status: 'REAL-TIME',
    icon: Radio,
  },
  {
    id: 'auto-reconnect',
    category: 'realtime',
    title: 'Automatic Connection Recovery',
    valueStatement: 'Recovers seamlessly from temporary network disconnects via backoff.',
    technical: 'Exponential Backoff • WebSocket State Recovery',
    status: 'ACTIVE',
    icon: RefreshCw,
  },

  // 6. Media & Voice
  {
    id: 'media-whitelist',
    category: 'media',
    title: 'Whitelisted Encrypted Media',
    valueStatement: 'Share encrypted images, PDFs, and text files under strict size limits.',
    technical: '≤ 3MB • In-Browser AES-GCM • MIME Enforcement',
    status: 'CLIENT-SIDE',
    icon: FileCode,
  },
  {
    id: 'voice-notes',
    category: 'media',
    title: '1× Ephemeral Encrypted Voice Notes',
    valueStatement: 'Record microphone audio, encrypted client-side before transmission.',
    technical: 'MediaRecorder • Waveform Scrubber • 1×/1.5×/2× Speed',
    status: 'CLIENT-SIDE',
    icon: Mic,
  },
  {
    id: 'webrtc-calls',
    category: 'media',
    title: 'Direct WebRTC Voice Calling',
    valueStatement: 'Browser-to-browser encrypted voice communication with zero server audio.',
    technical: 'DTLS-SRTP • Dual-Chime Ringtone • Microphone Mute',
    status: 'REAL-TIME',
    icon: Phone,
  },

  // 7. Edge Infrastructure
  {
    id: 'edge-relay',
    category: 'infrastructure',
    title: 'Blind Cloudflare Edge Relay',
    valueStatement: 'Globally distributed WebSocket coordination running on Cloudflare Workers.',
    technical: 'Cloudflare Workers • Durable Objects • Zero Database',
    status: 'ACTIVE',
    icon: Cpu,
  },
  {
    id: 'inactivity-expiry',
    category: 'infrastructure',
    title: '15-Minute Inactivity Auto-Eviction',
    valueStatement: 'Rooms automatically expire after 15 minutes of inactivity via edge alarms.',
    technical: 'Durable Object Alarms • Ephemeral Lifecycle',
    status: 'EPHEMERAL',
    icon: Shield,
  },
];

const CATEGORIES: { key: FeatureCategory; label: string }[] = [
  { key: 'all', label: 'All Capabilities' },
  { key: 'security', label: 'Security & Crypto' },
  { key: 'messaging', label: 'Messaging Suite' },
  { key: 'privacy', label: 'Privacy & Ephemerality' },
  { key: 'controls', label: 'Room & Participant Controls' },
  { key: 'realtime', label: 'Real-Time & Connection' },
  { key: 'media', label: 'Media & Voice' },
  { key: 'infrastructure', label: 'Edge Infrastructure' },
];

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<FeatureCategory>('all');

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCount = FEATURES.length;

  const filteredFeatures =
    activeCategory === 'all'
      ? FEATURES
      : FEATURES.filter((f) => f.category === activeCategory);

  const getStatusBadgeClass = (status: FeatureStatus) => {
    switch (status) {
      case 'CLIENT-SIDE':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50';
      case 'REAL-TIME':
        return 'text-violet-400 bg-violet-950/40 border-violet-800/50';
      case 'EPHEMERAL':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
      case 'ACTIVE':
      case 'IMPLEMENTED':
      default:
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
    }
  };

  const getIconContainerClass = (status: FeatureStatus) => {
    switch (status) {
      case 'CLIENT-SIDE':
        return 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40';
      case 'REAL-TIME':
        return 'text-violet-400 bg-violet-950/30 border-violet-900/40';
      case 'EPHEMERAL':
        return 'text-amber-400 bg-amber-950/30 border-amber-900/40';
      case 'ACTIVE':
      case 'IMPLEMENTED':
      default:
        return 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40';
    }
  };

  return (
    <div
      id="about-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="about-modal-content"
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#0A0C10] border border-[#1F242D] rounded-2xl shadow-2xl flex flex-col text-[#EDEDED] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
      >
        {/* Subtle accent line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#38BDF8]/60 to-transparent"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F242D] bg-[#0D0F13]/90">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#11141A] border border-[#1F242D] flex items-center justify-center text-[#38BDF8] shadow-xs">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="about-modal-title"
                  className="text-sm font-semibold tracking-wider text-[#EDEDED] uppercase font-mono"
                >
                  NEXUS SPECIFICATION & FEATURES
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#111318] text-[#38BDF8] border border-[#1F242D]">
                  v1.0.0 PROD
                </span>
              </div>
              <p className="text-xs text-[#8A909E] font-sans mt-0.5">
                Complete product architecture, capabilities, and privacy model.
              </p>
            </div>
          </div>

          <button
            id="about-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8A909E] hover:text-[#EDEDED] hover:bg-[#161B22] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Executive Creator Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#0F131A] via-[#11141C] to-[#0D0F14] border border-[#1F242D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E2638] to-[#0F141E] border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8] font-mono font-bold text-sm shadow-md">
                  AR
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#0A0C10]"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[#EDEDED] tracking-tight">
                    Architected & Engineered by Abhishek
                  </span>
                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                    CREATOR
                  </span>
                </div>
                <p className="text-xs text-[#8A909E] mt-0.5 leading-relaxed">
                  Ephemeral communication built with Web Crypto client keys, zero disk persistence, and Cloudflare edge relaying.
                </p>
              </div>
            </div>

            <a
              href="https://github.com/abhishekishere014-git/NEXUS-PRIVATE-CHAT"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161B22] hover:bg-[#21262D] border border-[#2D333B] hover:border-[#38BDF8]/50 text-xs font-mono text-[#EDEDED] transition-colors shrink-0 shadow-xs cursor-pointer group"
            >
              <Github className="w-3.5 h-3.5 text-[#8A909E] group-hover:text-[#EDEDED] transition-colors" />
              <span>Source Repository</span>
              <ExternalLink className="w-3 h-3 text-[#8A909E] group-hover:text-[#38BDF8] transition-colors" />
            </a>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-[#0D0F13] border border-[#1A1F29] flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A909E]">Disk Storage</span>
              <span className="text-base font-mono font-bold text-emerald-400 mt-1">0 Bytes</span>
              <span className="text-[10px] text-[#8A909E]/70 mt-0.5">Zero DB / Disk Persistence</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0F13] border border-[#1A1F29] flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A909E]">Cipher Strength</span>
              <span className="text-base font-mono font-bold text-[#38BDF8] mt-1">256-Bit</span>
              <span className="text-[10px] text-[#8A909E]/70 mt-0.5">AES-GCM Authenticated</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0F13] border border-[#1A1F29] flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A909E]">Room Auto-Eviction</span>
              <span className="text-base font-mono font-bold text-amber-400 mt-1">15 Minutes</span>
              <span className="text-[10px] text-[#8A909E]/70 mt-0.5">Inactivity Edge Destruction</span>
            </div>
            <div className="p-3 rounded-xl bg-[#0D0F13] border border-[#1A1F29] flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A909E]">Key Custody</span>
              <span className="text-base font-mono font-bold text-violet-400 mt-1">Client RAM</span>
              <span className="text-[10px] text-[#8A909E]/70 mt-0.5">Zero Server Key Knowledge</span>
            </div>
          </div>

          {/* Category Filter Navigation */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#8A909E] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>NEXUS Capabilities Directory</span>
              </div>
              <span className="text-[11px] font-mono text-[#8A909E]">
                {totalCount} implemented capabilities across security, messaging, privacy, room controls, and edge infrastructure.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              {CATEGORIES.map((cat) => {
                const count =
                  cat.key === 'all'
                    ? totalCount
                    : FEATURES.filter((f) => f.category === cat.key).length;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-[#161B22] border-[#38BDF8]/50 text-[#EDEDED] font-semibold shadow-xs'
                        : 'bg-[#0D0F13] border-[#1A1F29] text-[#8A909E] hover:text-[#EDEDED] hover:border-[#1F242D]'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8]'
                          : 'bg-[#15181F] text-[#8A909E]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.id}
                  className="p-4 rounded-xl bg-[#0D0F13] hover:bg-[#101319] border border-[#1A1F29] hover:border-[#1F242D] transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${getIconContainerClass(
                          f.status
                        )}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border text-right font-medium ${getStatusBadgeClass(
                          f.status
                        )}`}
                      >
                        {f.status}
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs font-mono text-[#EDEDED] tracking-tight group-hover:text-white transition-colors">
                      {f.title}
                    </h3>

                    <p className="text-xs text-[#8A909E] leading-relaxed mt-1.5 font-sans">
                      &ldquo;{f.valueStatement}&rdquo;
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#1A1F29]/60 flex items-center justify-between text-[10px] font-mono text-[#8A909E]">
                    <span className="truncate text-[#38BDF8]/80 font-mono">{f.technical}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Protocol Stack Badges */}
          <div className="pt-2 border-t border-[#1F242D]/60 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[#8A909E]">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#38BDF8]" />
              Core Protocol Stack:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'React 19',
                'TypeScript 5',
                'Tailwind CSS 4',
                'Web Crypto API',
                'Cloudflare Workers & DO',
                'WebSockets',
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded bg-[#111318] border border-[#1F242D] text-[#EDEDED]"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#1F242D] bg-[#0D0F13]/90 flex items-center justify-between text-xs text-[#8A909E]">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#38BDF8]">●</span>
            <span>NEXUS Private Chat · Crafted by Abhishek</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#8A909E]/60 hidden sm:inline">
              [Esc to close]
            </span>
            <button
              id="about-modal-close-action-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-[#141820] hover:bg-[#1C222E] text-[#EDEDED] font-mono rounded-lg border border-[#1F242D] hover:border-[#38BDF8]/40 transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
