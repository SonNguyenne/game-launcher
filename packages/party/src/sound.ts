/** Âm thanh tổng hợp bằng Web Audio, không cần file mp3. */
export type Tone = 'tick' | 'tap' | 'win' | 'buzz';

let audio: AudioContext | null = null;

function context() {
  if (!audio) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

function beep(ac: AudioContext, type: OscillatorType, from: number, to: number, gain: number, at: number, length: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + length);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + length);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(at);
  osc.stop(at + length);
}

export function playTone(tone: Tone) {
  const ac = context();
  if (!ac) return;
  const now = ac.currentTime;
  try {
    if (tone === 'tick') beep(ac, 'sine', 700, 250, 0.12, now, 0.05);
    if (tone === 'tap') beep(ac, 'sine', 420 + Math.random() * 160, 420, 0.1, now, 0.05);
    if (tone === 'buzz') beep(ac, 'sawtooth', 150, 90, 0.25, now, 0.4);
    if (tone === 'win') [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => beep(ac, 'triangle', f, f, 0.18, now + i * 0.09, 0.25));
  } catch {
    // Trình duyệt chặn âm thanh: bỏ qua.
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Không hỗ trợ rung.
  }
}
