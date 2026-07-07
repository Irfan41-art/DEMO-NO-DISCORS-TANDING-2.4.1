/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Audio API Sound Synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a crisp, responsive mechanical click sound
 */
export function playClickSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {
    console.warn('Audio click failed', e);
  }
}

/**
 * Play a pleasant synthesizer ding for validated entries / scoring hits
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    // Two oscillators for a rich "ding" chord
    const time = ctx.currentTime;
    
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.1, time + (idx * 0.02));
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time + (idx * 0.02));
      osc.stop(time + 0.35);
    });
  } catch (e) {
    console.warn('Audio success failed', e);
  }
}

/**
 * Play a warning beep for penalties
 */
export function playWarningSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch (e) {
    console.warn('Audio warning failed', e);
  }
}

/**
 * Play a martial arts gong sound for timer end or start
 */
export function playGongSound() {
  try {
    const ctx = getAudioContext();
    const time = ctx.currentTime;
    
    // Sub-bass gong frequencies
    const lowFreqs = [110, 150, 165];
    
    lowFreqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      // Ring modulation effect
      if (index > 0) {
        osc.frequency.linearRampToValueAtTime(freq + (Math.sin(index) * 5), time + 0.8);
      }

      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(time + 0.95);
    });
  } catch (e) {
    console.warn('Audio gong failed', e);
  }
}
