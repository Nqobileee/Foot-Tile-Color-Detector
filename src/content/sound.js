// Tiny Web Audio synth — no audio files to host, just short generated tones.
// The AudioContext is created lazily on first use, which always happens
// inside a user-triggered event (a click, or a step that only occurs after
// the player has already interacted with the page), satisfying browsers'
// autoplay-gesture requirement.
let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextCtor();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep(freq, duration = 0.12, type = 'sine', volume = 0.2, delay = 0) {
  try {
    const ctx = getCtx();
    const startAt = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration);
  } catch {
    /* audio unavailable — game still works silently */
  }
}

export function playHit() {
  beep(660, 0.12, 'triangle', 0.25);
}

export function playMiss() {
  beep(140, 0.18, 'sawtooth', 0.18);
}

export function playClick() {
  beep(880, 0.05, 'square', 0.08);
}

export function playRoundStart() {
  beep(440, 0.1, 'sine', 0.2);
  beep(660, 0.15, 'sine', 0.2, 0.1);
}

export function playGameOver() {
  beep(523, 0.15, 'sine', 0.2);
  beep(392, 0.25, 'sine', 0.2, 0.15);
}
