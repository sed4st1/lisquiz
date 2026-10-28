/**
 * Lisquiz Central Sound & BGM Manager
 * - Handles iOS / Android WebKit / Sferum MAX WebApp audio unlocking
 * - Procedural SFX with tactile haptic synchronization
 * - Ambient & Countdown BGM streaming with smooth crossfades
 * - Persisted Mute / Unmute state in localStorage
 */

import { haptics } from './haptics';
import {
  playClayTap,
  playWaterDrop,
  playWoodKnock,
  playAcornCollect,
  playCorrectChime,
  playWrongSoftThud,
  playVictoryStinger,
} from './proceduralSfx';

export type BgmTrack = 'grove' | 'countdown';

const BGM_SOURCES: Record<BgmTrack, string> = {
  grove: '/assets/audio/bgm/bgm_grove.mp3',
  countdown: '/assets/audio/bgm/bgm_countdown.mp3',
};

type MuteListener = (isMuted: boolean) => void;

class SoundManager {
  private static instance: SoundManager;

  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private isMuted: boolean = false;

  // Volumes
  private masterVolume: number = 0.85;
  private bgmTargetVolume: number = 0.35;

  // Background Music Element
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmTrack: BgmTrack | null = null;
  private fadeInterval: number | null = null;

  // Listeners for UI reactive state
  private muteListeners: Set<MuteListener> = new Set();

  private constructor() {
    // Read persisted mute state (default: unmuted)
    try {
      const saved = localStorage.getItem('lisquiz_audio_muted');
      if (saved === 'true') {
        this.isMuted = true;
      }
    } catch {}

    // Link global audio element if previously created in window/HMR
    if (typeof window !== 'undefined') {
      const existing = (window as unknown as { __LISQUIZ_GLOBAL_BGM_AUDIO__?: HTMLAudioElement }).__LISQUIZ_GLOBAL_BGM_AUDIO__;
      if (existing) {
        this.bgmAudio = existing;
        if (this.isMuted) {
          existing.pause();
          existing.volume = 0;
          existing.muted = true;
        }
      }
    }

    // Auto-setup interaction listener for browser audio unlock
    this.setupUnlockListeners();
    this.setupVisibilityListener();
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  /**
   * Lazy AudioContext getter with mobile-friendly sample rate
   */
  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass({
        latencyHint: 'interactive',
        sampleRate: 44100,
      });
    }
    return this.ctx;
  }

  /**
   * Unlock AudioContext on first user gesture (touch, click, key)
   */
  public async unlock(): Promise<boolean> {
    if (this.isUnlocked && this.ctx?.state === 'running') {
      return true;
    }

    const context = this.getContext();
    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (err) {
        console.warn('[SoundManager] Audio resume notice:', err);
      }
    }

    // Play 1-sample silent buffer to unlock iOS Safari WebKit audio pipeline
    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
      this.isUnlocked = true;
    } catch {}

    return true;
  }

  private setupUnlockListeners(): void {
    if (typeof window === 'undefined') return;
    if ((window as unknown as { __LISQUIZ_LISTENERS_SET__?: boolean }).__LISQUIZ_LISTENERS_SET__) return;
    (window as unknown as { __LISQUIZ_LISTENERS_SET__?: boolean }).__LISQUIZ_LISTENERS_SET__ = true;

    const onUserGesture = async () => {
      await this.unlock();
      if (!this.isMuted) {
        this.tryResumePendingBgm();
      }
    };

    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, onUserGesture, { capture: true, passive: true });
    });
  }

  public tryResumePendingBgm(): void {
    if (this.isMuted) return;
    if (this.currentBgmTrack && this.bgmAudio && this.bgmAudio.paused) {
      this.bgmAudio.muted = false;
      this.bgmAudio.volume = this.bgmTargetVolume * this.masterVolume;
      this.bgmAudio.play().catch(() => {});
    }
  }

  /**
   * Suspend audio when user leaves app/tab (Sferum / VK / browser background)
   */
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
        if (this.bgmAudio && !this.bgmAudio.paused) {
          this.bgmAudio.pause();
        }
      } else {
        if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
          this.ctx.resume().catch(() => {});
        }
        if (this.bgmAudio && this.currentBgmTrack && !this.isMuted) {
          this.bgmAudio.play().catch(() => {});
        }
      }
    });
  }

  // ========================================================
  // MUTE / UNMUTE API
  // ========================================================

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('lisquiz_audio_muted', muted ? 'true' : 'false');
    } catch {}

    this.stopFade();

    if (muted) {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio.volume = 0;
        this.bgmAudio.muted = true;
      }
      if (typeof window !== 'undefined') {
        const globalAudio = (window as unknown as { __LISQUIZ_GLOBAL_BGM_AUDIO__?: HTMLAudioElement }).__LISQUIZ_GLOBAL_BGM_AUDIO__;
        if (globalAudio) {
          globalAudio.pause();
          globalAudio.volume = 0;
          globalAudio.muted = true;
        }
      }
      if (typeof document !== 'undefined') {
        document.querySelectorAll('audio').forEach((el) => {
          try {
            el.pause();
            el.volume = 0;
            el.muted = true;
          } catch {}
        });
      }
    } else {
      if (this.bgmAudio) {
        this.bgmAudio.muted = false;
        if (this.currentBgmTrack) {
          this.bgmAudio.volume = this.bgmTargetVolume * this.masterVolume;
          this.bgmAudio.play().catch(() => {});
        }
      }
    }

    this.notifyMuteListeners();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public subscribeMute(listener: MuteListener): () => void {
    this.muteListeners.add(listener);
    listener(this.isMuted);
    return () => this.muteListeners.delete(listener);
  }

  private notifyMuteListeners(): void {
    this.muteListeners.forEach((fn) => fn(this.isMuted));
  }

  // ========================================================
  // PROCEDURAL SOUND FX (WITH HAPTIC SYNC)
  // ========================================================

  public playTap(): void {
    haptics.impact('light');
    this.tryResumePendingBgm();
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playClayTap(this.ctx, this.masterVolume);
    });
  }

  public playWater(): void {
    haptics.impact('light');
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playWaterDrop(this.ctx, this.masterVolume);
    });
  }

  public playKnock(): void {
    haptics.impact('medium');
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playWoodKnock(this.ctx, this.masterVolume);
    });
  }

  public playAcorn(): void {
    haptics.notification('success');
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playAcornCollect(this.ctx, this.masterVolume);
    });
  }

  public playCollect(): void {
    this.playAcorn();
  }

  public playCorrect(): void {
    haptics.notification('success');
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playCorrectChime(this.ctx, this.masterVolume);
    });
  }

  public playWrong(): void {
    haptics.notification('warning');
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playWrongSoftThud(this.ctx, this.masterVolume);
    });
  }

  public playVictory(): void {
    haptics.notification('success');
    if (this.isMuted) return;
    this.unlock().then(() => {
      if (this.ctx) playVictoryStinger(this.ctx, this.masterVolume);
    });
  }

  // ========================================================
  // BACKGROUND MUSIC (BGM)
  // ========================================================

  public playBgm(track: BgmTrack, loop = true): void {
    this.stopFade();

    if (this.isMuted) {
      this.currentBgmTrack = track;
      if (this.bgmAudio) {
        this.bgmAudio.pause();
        this.bgmAudio.volume = 0;
        this.bgmAudio.muted = true;
      }
      return;
    }

    if (!this.bgmAudio) {
      if (typeof window !== 'undefined') {
        const globalAudio = (window as unknown as { __LISQUIZ_GLOBAL_BGM_AUDIO__?: HTMLAudioElement }).__LISQUIZ_GLOBAL_BGM_AUDIO__;
        if (globalAudio) {
          this.bgmAudio = globalAudio;
        } else {
          this.bgmAudio = new Audio();
          (window as unknown as { __LISQUIZ_GLOBAL_BGM_AUDIO__?: HTMLAudioElement }).__LISQUIZ_GLOBAL_BGM_AUDIO__ = this.bgmAudio;
        }
      } else {
        this.bgmAudio = new Audio();
      }
      this.bgmAudio.preload = 'auto';
    }

    if (this.currentBgmTrack === track && !this.bgmAudio.paused) {
      // Already actively playing this track
      return;
    }

    this.currentBgmTrack = track;
    const src = BGM_SOURCES[track];

    if (this.bgmAudio.src !== window.location.origin + src && !this.bgmAudio.src.endsWith(src)) {
      this.bgmAudio.pause();
      this.bgmAudio.src = src;
      this.bgmAudio.currentTime = 0;
    }

    this.bgmAudio.loop = loop;
    this.bgmAudio.muted = false;
    this.bgmAudio.volume = this.bgmTargetVolume * this.masterVolume;

    this.bgmAudio.play().catch((err) => {
      console.warn('[SoundManager] BGM autoplay blocked until user gesture:', err);
    });
  }

  public stopBgm(fadeOutMs = 600): void {
    if (!this.bgmAudio || this.bgmAudio.paused) {
      this.currentBgmTrack = null;
      return;
    }

    this.stopFade();

    if (fadeOutMs <= 0 || this.isMuted) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.currentBgmTrack = null;
      return;
    }

    const stepMs = 50;
    const steps = Math.max(1, Math.floor(fadeOutMs / stepMs));
    const decrement = this.bgmAudio.volume / steps;

    this.fadeInterval = window.setInterval(() => {
      if (!this.bgmAudio) {
        this.stopFade();
        return;
      }
      if (this.bgmAudio.volume > decrement) {
        this.bgmAudio.volume -= decrement;
      } else {
        this.bgmAudio.volume = 0;
        this.bgmAudio.pause();
        this.bgmAudio.currentTime = 0;
        this.currentBgmTrack = null;
        this.stopFade();
      }
    }, stepMs);
  }

  public pauseBgm(): void {
    if (this.bgmAudio && !this.bgmAudio.paused) {
      this.bgmAudio.pause();
    }
  }

  public resumeBgm(): void {
    if (this.bgmAudio && this.currentBgmTrack && !this.isMuted) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  private stopFade(): void {
    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }
}

export const soundManager = SoundManager.getInstance();
