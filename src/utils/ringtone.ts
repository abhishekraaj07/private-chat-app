/**
 * NEXUS Subtle Encrypted Voice Call Ringtone
 *
 * Uses Web Audio API for a lightweight, zero-asset, technical dual-tone chime.
 * Follows singleton lifecycle:
 * - Starts only when callState === 'incoming'
 * - Stops immediately on accept, decline, end, timeout, or caller disconnect
 * - Respects browser autoplay policies without throw/unhandled rejection
 * - Cleanly releases audio nodes, timers, and context
 */

class RingtoneController {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private _isPlaying = false;
  private _soundEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('nexus_call_sound_enabled');
      if (stored !== null) {
        this._soundEnabled = stored === 'true';
      }
    }
  }

  public isEnabled(): boolean {
    return this._soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this._soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_call_sound_enabled', String(enabled));
    }
    if (!enabled && this._isPlaying) {
      this.stop();
    }
  }

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  private initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      try {
        this.audioCtx = new AudioCtxClass();
      } catch (err) {
        console.warn('NEXUS Ringtone: AudioContext initialization failed', err);
        return null;
      }
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {
        // Autoplay policy prevented immediate playback
      });
    }

    return this.audioCtx;
  }

  /**
   * Plays a single subtle, technical dual-chime pulse:
   * Chime 1: 587.33 Hz (D5) - soft sine wave (120ms)
   * Chime 2: 880.00 Hz (A5) - soft sine wave (180ms)
   */
  private playPulse(): void {
    const ctx = this.initAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    // Subtle, unobtrusive volume
    masterGain.gain.setValueAtTime(0.09, now);
    masterGain.connect(ctx.destination);
    this.activeGainNodes.push(masterGain);

    // Note 1: 587 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(1.0, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain1);
    gain1.connect(masterGain);

    osc1.start(now);
    osc1.stop(now + 0.13);
    this.activeOscillators.push(osc1);

    // Note 2: 880 Hz (A5) slightly delayed
    const t2 = now + 0.14;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, t2);

    gain2.gain.setValueAtTime(0.001, t2);
    gain2.gain.exponentialRampToValueAtTime(0.9, t2 + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.22);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc2.start(t2);
    osc2.stop(t2 + 0.23);
    this.activeOscillators.push(osc2);

    // Clean up node references after note completes
    setTimeout(() => {
      this.activeOscillators = this.activeOscillators.filter((o) => o !== osc1 && o !== osc2);
      this.activeGainNodes = this.activeGainNodes.filter((g) => g !== masterGain && g !== gain1 && g !== gain2);
    }, 400);
  }

  /**
   * Starts the incoming call ringtone cycle (repeats every 2.4s).
   */
  public start(): void {
    if (this._isPlaying || !this._soundEnabled) return;
    this._isPlaying = true;

    // Play first pulse immediately
    this.playPulse();

    // Repeat pulses every 2400ms
    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => {
        if (this._isPlaying && this._soundEnabled) {
          this.playPulse();
        }
      }, 2400);
    }
  }

  /**
   * Immediately silences and halts any ongoing ringtone and clears all timers/nodes.
   */
  public stop(): void {
    this._isPlaying = false;

    if (this.intervalId !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.intervalId);
      }
      this.intervalId = null;
    }

    // Stop active oscillators immediately
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Node already stopped
      }
    }
    this.activeOscillators = [];

    // Disconnect active gains
    for (const gain of this.activeGainNodes) {
      try {
        gain.disconnect();
      } catch {
        // Node already disconnected
      }
    }
    this.activeGainNodes = [];
  }
}

export const incomingCallRingtone = new RingtoneController();
