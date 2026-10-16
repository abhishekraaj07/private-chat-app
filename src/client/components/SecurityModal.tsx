/**
 * NEXUS Security Architecture Modal
 *
 * Honest, technically accurate explanation of the cryptographic model.
 * Styled with a refined, high-trust security engineering aesthetic.
 */

import React from 'react';
import {
  Shield,
  Lock,
  Key,
  Server,
  Clock,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldAlert,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';
import { copyToClipboard } from '../../utils/format.ts';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  fingerprint?: string | null;
  isEncrypted?: boolean;
  participantCount?: number;
  isPeerVerified?: boolean;
  onTogglePeerVerified?: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  fingerprint,
  isEncrypted,
  isPeerVerified = false,
  onTogglePeerVerified,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!fingerprint) return;
    const ok = await copyToClipboard(fingerprint);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id="security-modal-backdrop"
      className="fixed inset-0 z-50 flex sm:items-center items-end justify-center bg-black/80 backdrop-blur-sm sm:p-4 p-0 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="security-modal-content"
        className="relative w-full sm:max-w-2xl bg-[#0D0F12] border border-[#1F242D] sm:rounded-2xl rounded-t-2xl shadow-2xl sm:p-7 p-5 text-[#EDEDED] max-h-[90vh] overflow-y-auto flex flex-col custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-modal-title"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-[#1F242D]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1F242D] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#111318] border border-[#1F242D] flex items-center justify-center text-[#38BDF8] shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="security-modal-title"
                className="text-lg sm:text-xl font-semibold tracking-tight text-[#EDEDED] font-mono"
              >
                Security & Cryptographic Architecture
              </h2>
              <p className="text-xs text-[#8A909E] font-sans mt-0.5">
                Cryptographic foundations, client-side custody, and threat model boundaries.
              </p>
            </div>
          </div>
          <button
            id="security-modal-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#1F242D] bg-[#111318] hover:bg-[#1F242D] text-[#8A909E] hover:text-[#EDEDED] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 space-y-6">
          {/* Active Session Verification Card */}
          {isEncrypted && fingerprint && (
            <div className="p-4 bg-[#111318] border border-[#1F242D] rounded-xl space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#EDEDED]">
                    Active Session Fingerprint
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-mono text-[#38BDF8] hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Fingerprint</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-[#08090B] border border-[#1F242D] rounded-lg font-mono text-xs sm:text-sm text-center tracking-widest text-[#EDEDED] select-all">
                {fingerprint}
              </div>

              <p className="text-xs leading-relaxed text-[#8A909E] font-sans">
                Compare this security code out-of-band (e.g. over a phone call or in person). If both ends match exactly, no Man-in-the-Middle (MITM) relay can intercept or decrypt your conversation.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#1F242D]">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  {isPeerVerified ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      PEER VERIFIED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <ShieldAlert className="w-4 h-4" />
                      UNVERIFIED PEER
                    </span>
                  )}
                </div>
                {onTogglePeerVerified && (
                  <button
                    type="button"
                    onClick={onTogglePeerVerified}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                      isPeerVerified
                        ? 'bg-rose-950/30 text-rose-300 border-rose-800/40 hover:bg-rose-900/40'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/50'
                    }`}
                  >
                    {isPeerVerified ? 'Mark Unverified' : 'Verify Peer Fingerprint'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 01 — EPHEMERAL KEY AGREEMENT */}
          <div className="p-4 rounded-xl bg-[#111318]/50 border border-[#1F242D]/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#161922] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
                  <Key className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-mono font-semibold text-sm text-[#EDEDED] tracking-tight">
                  01 — Ephemeral Key Agreement
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20">
                ECDH • P-256
              </span>
            </div>
            <p className="text-sm text-[#8A909E] leading-[1.7] font-sans pt-1">
              Each participant generates an ephemeral elliptic-curve key pair locally in the browser using the native Web Crypto API. Private keys remain in browser memory and are not transmitted to the relay as part of the normal protocol.
            </p>
            <div className="pt-1 text-[11px] font-mono text-[#8A909E]/70">
              Technical: ECDH • P-256 • Web Crypto API
            </div>
          </div>

          {/* 02 — AUTHENTICATED ENCRYPTION */}
          <div className="p-4 rounded-xl bg-[#111318]/50 border border-[#1F242D]/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#161922] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-mono font-semibold text-sm text-[#EDEDED] tracking-tight">
                  02 — Authenticated Encryption
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#38BDF8] bg-[#38BDF8]/10 px-2 py-0.5 rounded border border-[#38BDF8]/20">
                HKDF + AES-GCM
              </span>
            </div>
            <p className="text-sm text-[#8A909E] leading-[1.7] font-sans pt-1">
              The shared secret is processed through HKDF-SHA-256 with explicit domain separation. Messages are protected using AES-256-GCM with a fresh cryptographically secure 96-bit (12-byte) IV for each message.
            </p>
            <div className="pt-1 text-[11px] font-mono text-[#8A909E]/70">
              Technical: HKDF-SHA-256 • AES-256-GCM • Unique IV
            </div>
          </div>

          {/* 03 — BLIND EDGE RELAY */}
          <div className="p-4 rounded-xl bg-[#111318]/50 border border-[#1F242D]/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#161922] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-mono font-semibold text-sm text-[#EDEDED] tracking-tight">
                  03 — Blind Edge Relay
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                Cloudflare DO
              </span>
            </div>
            <p className="text-sm text-[#8A909E] leading-[1.7] font-sans pt-1">
              The NEXUS relay transports encrypted message envelopes between connected participants. It does not possess participant private keys and is not designed to access normal message plaintext.
            </p>
            <div className="pt-1 text-[11px] font-mono text-[#8A909E]/70">
              Technical: Cloudflare Workers • Durable Objects • WebSockets
            </div>
          </div>

          {/* 04 — EPHEMERAL ROOM LIFECYCLE */}
          <div className="p-4 rounded-xl bg-[#111318]/50 border border-[#1F242D]/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#161922] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-mono font-semibold text-sm text-[#EDEDED] tracking-tight">
                  04 — Ephemeral Room Lifecycle
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                15m Inactivity
              </span>
            </div>
            <p className="text-sm text-[#8A909E] leading-[1.7] font-sans pt-1">
              Rooms automatically expire after 15 minutes of inactivity. The application is designed around temporary communication rather than permanent conversation archives.
            </p>
            <div className="pt-1 text-[11px] font-mono text-[#8A909E]/70">
              Technical: 15-Minute Inactivity • Ephemeral Lifecycle
            </div>
          </div>

          {/* 05 — MINIMAL SERVER TRUST */}
          <div className="p-4 rounded-xl bg-[#111318]/50 border border-[#1F242D]/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#161922] border border-[#1F242D] flex items-center justify-center text-[#38BDF8]">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-mono font-semibold text-sm text-[#EDEDED] tracking-tight">
                  05 — Minimal Server Trust
                </h3>
              </div>
              <span className="text-[11px] font-mono text-violet-400 bg-violet-950/40 px-2 py-0.5 rounded border border-violet-800/40">
                Zero Custody
              </span>
            </div>
            <p className="text-sm text-[#8A909E] leading-[1.7] font-sans pt-1">
              Message protection occurs on the client before encrypted data is transported through the relay. The server primarily provides coordination and transport rather than acting as a permanent message repository.
            </p>
            <div className="pt-1 text-[11px] font-mono text-[#8A909E]/70">
              Technical: Client-Side Protection • Minimal Server Knowledge
            </div>
          </div>

          {/* 06 — HONEST THREAT MODEL */}
          <div className="p-4 bg-[#111318] border border-amber-900/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-mono font-semibold text-sm text-[#EDEDED] tracking-tight">
                  06 — Honest Threat Model & Boundaries
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                Confidentiality
              </span>
            </div>
            <p className="text-sm text-[#8A909E] leading-[1.7] font-sans pt-1">
              NEXUS protects <strong className="text-[#EDEDED]">message confidentiality and integrity</strong> but does not provide complete network anonymity. Network-level metadata such as IP addresses, connection timestamps, traffic characteristics, and connection information may remain observable depending on the network and infrastructure. If network-level anonymity is required, use an anonymity network such as Tor.
            </p>
            <div className="pt-1 text-[11px] font-mono text-amber-300/80">
              Technical: Cryptographic Confidentiality • Observable Network Metadata
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-[#1F242D] flex items-center justify-between">
          <span className="text-xs font-mono text-[#8A909E]">
            Web Crypto API · ECDH P-256 · AES-256-GCM
          </span>
          <button
            id="security-modal-dismiss-btn"
            onClick={onClose}
            className="px-4 py-2 bg-[#141820] hover:bg-[#1C222E] text-[#EDEDED] text-xs font-mono font-medium rounded-lg border border-[#1F242D] hover:border-[#38BDF8]/40 transition-colors cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
