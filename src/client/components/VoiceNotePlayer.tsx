/**
 * NEXUS Voice Note Player Component
 *
 * Minimalist, dark-themed audio player for encrypted voice notes.
 * Supports scrub progress, 1x/1.5x/2x playback rate, animated waveform bars,
 * and 1× View-Once auto-destruction upon playback completion.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Flame, Sparkles } from 'lucide-react';
import { formatCallDuration } from '../../utils/format.ts';

interface VoiceNotePlayerProps {
  dataUrl: string;
  durationSec?: number;
  isOwn: boolean;
  isViewOnce?: boolean;
  isViewed?: boolean;
  onViewOnceDestroy?: () => void;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  dataUrl,
  durationSec = 0,
  isOwn,
  isViewOnce,
  isViewed,
  onViewOnceDestroy,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (isViewOnce && onViewOnceDestroy) {
        onViewOnceDestroy();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isViewOnce, onViewOnceDestroy]);

  const togglePlay = () => {
    if (isViewOnce && isViewed) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // If view-once and already burned
  if (isViewOnce && isViewed) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300/80 select-none">
        <Flame className="w-4 h-4 text-rose-400 shrink-0" />
        <span className="font-mono text-[11px] italic">1× Voice Note · Destroyed from memory</span>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`p-2.5 rounded-xl border select-none w-full max-w-[280px] sm:max-w-[320px] transition-all ${
      isOwn
        ? 'bg-[#121B24]/90 border-[#38BDF8]/30'
        : 'bg-[#111318] border-[#1F242D]'
    }`}>
      <audio ref={audioRef} src={dataUrl} preload="metadata" />

      {/* Top row: View Once badge */}
      {isViewOnce && (
        <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 mb-1.5 font-semibold">
          <Flame className="w-3 h-3" />
          <span>1× View-Once Voice Note (Self-destructs after playback)</span>
        </div>
      )}

      {/* Main player controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
            isOwn
              ? 'bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-black'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black'
          }`}
          aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-0.5" />
          )}
        </button>

        {/* Waveform / Scrubber */}
        <div className="flex-1 space-y-1">
          {/* Animated Waveform Visualizer Bars */}
          <div className="flex items-center gap-0.5 h-4 px-1">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 95, 35, 65, 85, 40, 60].map((height, i) => {
              const barProgress = (i / 16) * 100;
              const isPast = barProgress <= progressPercent;
              return (
                <div
                  key={i}
                  style={{ height: `${height}%` }}
                  className={`w-1 rounded-full transition-colors ${
                    isPast
                      ? isOwn ? 'bg-[#38BDF8]' : 'bg-cyan-400'
                      : 'bg-slate-700/60'
                  } ${isPlaying && isPast ? 'animate-pulse' : ''}`}
                />
              );
            })}
          </div>

          {/* Time and Speed */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              {formatCallDuration(Math.floor(currentTime))} / {formatCallDuration(duration)}
            </span>

            <button
              onClick={toggleSpeed}
              className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/60 text-[10px] font-bold text-cyan-300 transition-colors cursor-pointer"
              title="Playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
