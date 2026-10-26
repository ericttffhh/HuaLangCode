/**
 * 華語 (HuaLang) - 音效與音樂合成模組 (Web Audio API)
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.noteFrequencies = {
      'Do': 261.63, 'Re': 293.66, 'Mi': 329.63, 'Fa': 349.23,
      'Sol': 392.00, 'La': 440.00, 'Si': 493.88,
      '高Do': 523.25, '高Re': 587.33, '高Mi': 659.25,
      '低Sol': 196.00, '低La': 220.00, '低Si': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25
    };
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  async playTone(freq, durationMs = 250, type = 'sine') {
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // 平滑淡入淡出避免爆音
    const now = this.ctx.currentTime;
    const durSec = durationMs / 1000;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durSec);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + durSec);

    await new Promise(r => setTimeout(r, durationMs));
  }

  async playNote(noteName, durationMs = 300) {
    const freq = this.noteFrequencies[noteName] || 440;
    await this.playTone(freq, durationMs);
  }

  async beep(freq = 440, ms = 150) {
    await this.playTone(freq, ms, 'square');
  }

  getAPI() {
    return {
      音階: async (note, ms = 300) => {
        await this.playNote(String(note), Number(ms));
      },
      頻率: async (freq, ms = 250) => {
        await this.playTone(Number(freq), Number(ms));
      },
      嗶: async (freq = 600, ms = 120) => {
        await this.beep(Number(freq), Number(ms));
      }
    };
  }
}
