// Synthesizing high quality martial arts tournament electronic sounds using Web Audio API

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playClickSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio Context interaction error:', e);
  }
}

export function playPointSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // High-pitched sweet two-tone chime
    const now = ctx.currentTime;
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.frequency.setValueAtTime(987.77, now); // B5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(now + 0.15);

    // Second tone slightly delayed
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(1318.51, ctx.currentTime); // E6
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      } catch {}
    }, 80);

  } catch (e) {
    console.warn('Audio Context interaction error:', e);
  }
}

export function playWarningSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Deep warning double buzz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(180, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(now + 0.2);

    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(160, ctx.currentTime);
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.35);
      } catch {}
    }, 150);

  } catch (e) {
    console.warn('Audio Context interaction error:', e);
  }
}

let activeBuzzerOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

export function startBuzzer() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    
    // Clean up any existing running buzzer
    stopBuzzer();

    // Trumpet-like brass horn: bright, sharp, and lightweight (higher pitch range)
    // Combining fundamental tones with strong upper harmonics (sawtooth & triangle waves)
    const trumpetConfigs = [
      { freq: 233.08, type: 'sawtooth' as const, volume: 0.12 }, // Bb3 fundamental (crisp brass)
      { freq: 293.66, type: 'triangle' as const, volume: 0.12 }, // D4 third (warm helper)
      { freq: 349.23, type: 'sawtooth' as const, volume: 0.10 }, // F4 fifth (bright spike)
      { freq: 466.16, type: 'sine' as const, volume: 0.08 },     // Bb4 octave (smooth clarity)
      { freq: 587.33, type: 'sawtooth' as const, volume: 0.06 }  // D5 high-harmonic (sharp bite)
    ];

    trumpetConfigs.forEach(({ freq, type, volume }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      
      // Detune/chorusing for a full, natural trumpet ensemble sound
      osc.detune.setValueAtTime(Math.random() * 12 - 6, now);
      
      // Volume envelope: punchy attack, sharp presentation
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.05); // Rapid trumpet split-second blow
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      
      activeBuzzerOscillators.push({ osc, gain });
    });
  } catch (e) {
    console.warn('Audio Context interaction error:', e);
  }
}

export function stopBuzzer() {
  try {
    if (activeBuzzerOscillators.length === 0) return;
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    activeBuzzerOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Smooth release
        osc.stop(now + 0.16);
      } catch (err) {
        // Safe catch
      }
    });
    activeBuzzerOscillators = [];
  } catch (e) {
    console.warn('Error stopping buzzer:', e);
  }
}

let buzzerTimeout: NodeJS.Timeout | null = null;
export function playBuzzer() {
  if (buzzerTimeout) {
    clearTimeout(buzzerTimeout);
  }
  startBuzzer();
  buzzerTimeout = setTimeout(() => {
    stopBuzzer();
    buzzerTimeout = null;
  }, 1250);
}
export function initAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {}
}
