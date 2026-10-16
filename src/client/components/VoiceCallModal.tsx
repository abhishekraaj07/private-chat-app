/**
 * NEXUS Encrypted P2P Voice Call Modal
 *
 * End-to-end encrypted WebRTC audio calling modal.
 * Features:
 * - Calling (outgoing) state with pulse animation
 * - Incoming call state with Accept / Decline controls
 * - Connected state with call duration timer, Mute/Unmute microphone toggle, and End Call
 * - Hidden <audio> element auto-playing remote stream
 */

import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { formatCallDuration } from '../../utils/format.ts';
import { incomingCallRingtone } from '../../utils/ringtone.ts';

export type CallState = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

interface VoiceCallModalProps {
  callState: CallState;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  callDuration: number;
  peerName: string;
  onAccept: () => void;
  onReject: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
}

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  callState,
  remoteStream,
  isMuted,
  callDuration,
  peerName,
  onAccept,
  onReject,
  onEndCall,
  onToggleMute,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(incomingCallRingtone.isEnabled());

  // Ringtone lifecycle: start only on incoming call, stop on any other state or unmount
  useEffect(() => {
    if (callState === 'incoming') {
      incomingCallRingtone.start();
    } else {
      incomingCallRingtone.stop();
    }

    return () => {
      incomingCallRingtone.stop();
    };
  }, [callState]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    incomingCallRingtone.setEnabled(next);
    if (next && callState === 'incoming') {
      incomingCallRingtone.start();
    }
  };

  const handleAcceptWithRingtoneStop = () => {
    incomingCallRingtone.stop();
    onAccept();
  };

  const handleRejectWithRingtoneStop = () => {
    incomingCallRingtone.stop();
    onReject();
  };

  // Hook remote audio stream to audio element
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch((err) => {
        console.warn('Remote audio playback prevented by autoplay policy', err);
      });
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Encrypted Voice Call"
    >
      {/* Remote audio player */}
      <audio ref={audioRef} autoPlay playsInline />

      <div className="relative w-full max-w-sm rounded-2xl bg-[#0F1117] border border-cyan-500/30 p-8 shadow-2xl shadow-cyan-500/10 text-center space-y-6">
        {/* Call Status Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-semibold tracking-wider uppercase">
            E2EE DTLS-SRTP P2P VOICE
          </span>
        </div>

        {/* Peer Avatar & Pulse Animation */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {callState === 'calling' && (
            <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
          )}
          {callState === 'incoming' && (
            <div className="absolute -inset-2 rounded-full border-2 border-emerald-400/60 animate-pulse" />
          )}
          {callState === 'connected' && (
            <div className="absolute -inset-1 rounded-full border-2 border-cyan-400/40" />
          )}

          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-950 to-slate-900 border-2 border-cyan-500/40 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {peerName.charAt(0).toUpperCase() || 'P'}
            </span>
          </div>
        </div>

        {/* Status Text & Duration */}
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {peerName}
          </h3>
          <p className="text-xs font-mono text-slate-400">
            {callState === 'calling' && 'Calling peer...'}
            {callState === 'incoming' && 'Incoming Encrypted Voice Call...'}
            {callState === 'connected' && (
              <span className="text-cyan-400 font-bold tracking-widest text-sm">
                {formatCallDuration(callDuration)}
              </span>
            )}
            {callState === 'ended' && 'Call ended'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {callState === 'incoming' && (
            <>
              <button
                onClick={handleRejectWithRingtoneStop}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="Decline Call"
                aria-label="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={handleToggleSound}
                className={`w-12 h-12 rounded-full border transition-colors flex items-center justify-center cursor-pointer ${
                  soundEnabled
                    ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/50'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
                title={soundEnabled ? 'Call sound ON (click to mute ringtone)' : 'Call sound OFF (click to unmute)'}
                aria-label={soundEnabled ? 'Mute call ringtone' : 'Unmute call ringtone'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button
                onClick={handleAcceptWithRingtoneStop}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-bounce cursor-pointer"
                title="Accept Call"
                aria-label="Accept Call"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          )}

          {(callState === 'calling' || callState === 'connected') && (
            <>
              {callState === 'connected' && (
                <button
                  onClick={onToggleMute}
                  className={`w-12 h-12 rounded-full border transition-colors flex items-center justify-center cursor-pointer ${
                    isMuted
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              <button
                onClick={onEndCall}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="End Call"
                aria-label="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Subtitle / Footer */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Volume2 className="w-3.5 h-3.5 text-cyan-400/70" />
          <span>Zero-server audio routing. Relayed via STUN/WebRTC.</span>
        </div>
      </div>
    </div>
  );
};
