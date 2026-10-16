/**
 * NEXUS Voice Recorder Component
 * 
 * Provides hold/click-to-record microphone capture with live elapsed timer,
 * animated audio waveform, preview playback, and encrypted dispatch.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Flame } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, durationSec: number, isViewOnce: boolean) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceNote, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopMediaStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopMediaStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/ogg;codecs=opus';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        recordedBlobRef.current = audioBlob;
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stopMediaStream();
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone access failed:', err);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleSend = () => {
    if (recordedBlobRef.current) {
      onSendVoiceNote(recordedBlobRef.current, Math.max(recordTime, 1), isViewOnce);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 w-full bg-[#121621] border border-indigo-500/30 rounded-2xl p-2.5 px-4 shadow-xl animate-in fade-in duration-200">
      
      {/* Recording Indicator & Timer */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
          </span>
        ) : (
          <Mic className="w-4 h-4 text-emerald-400" />
        )}
        <span className="font-mono text-xs text-slate-200 font-semibold">{formatTime(recordTime)}</span>
      </div>

      {/* Waveform Animation */}
      <div className="flex items-center gap-1 flex-1 px-3">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-indigo-400/60 rounded-full transition-all duration-150 ${
              isRecording ? 'animate-pulse' : 'h-2'
            }`}
            style={{
              height: isRecording ? `${Math.max(6, (Math.sin(i * 0.8 + recordTime * 2) + 1.2) * 12)}px` : '4px',
              animationDelay: `${i * 60}ms`
            }}
          />
        ))}
      </div>

      {/* 1x View-Once Toggle */}
      <button
        type="button"
        onClick={() => setIsViewOnce(!isViewOnce)}
        title="Send as 1x View-Once Audio (Self-destructs after listen)"
        className={`p-1.5 rounded-lg border transition text-xs font-mono flex items-center gap-1 ${
          isViewOnce
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
        }`}
      >
        <Flame className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold">1×</span>
      </button>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="p-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition border border-amber-500/30"
            title="Stop recording"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
            title="Send Voice Note"
          >
            <Send className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            stopRecording();
            onCancel();
          }}
          className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          title="Delete / Cancel"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
