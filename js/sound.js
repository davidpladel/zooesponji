let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

function playEatSound() {
  playTone(660, 0.15, 'sine');
  setTimeout(() => playTone(880, 0.15, 'sine'), 100);
}

function playRejectSound() {
  playTone(180, 0.25, 'sawtooth');
}

function playSpecialSound() {
  playTone(520, 0.12, 'triangle');
  setTimeout(() => playTone(700, 0.12, 'triangle'), 90);
  setTimeout(() => playTone(900, 0.18, 'triangle'), 180);
}
