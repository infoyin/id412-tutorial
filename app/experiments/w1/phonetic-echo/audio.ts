// Sound. Two things only:
// - dictionary recordings, played as they are (an <audio> element, no processing),
// - one original synthesized drone whose volume follows resonance. It is not speech.
// Nothing makes a sound before the first pointer or keyboard gesture calls unlock().

let ctx: AudioContext | null = null;
let drone: GainNode | null = null;
let current: HTMLAudioElement | null = null;

export function unlock() {
  if (ctx) return;
  ctx = new AudioContext();
  drone = ctx.createGain();
  drone.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  filter.connect(drone);
  drone.connect(ctx.destination);
  for (const freq of [110, 164.8]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
  }
}

// level 0–1+: how strongly any pair resonates right now.
export function setResonance(level: number) {
  if (!ctx || !drone) return;
  const quiet = current && !current.paused ? 0.3 : 1; // duck under a recording
  drone.gain.setTargetAtTime(Math.min(level, 1.2) * 0.045 * quiet, ctx.currentTime, 0.15);
}

export function playRecording(src: string) {
  current?.pause();
  current = new Audio(src);
  current.play().catch(() => {}); // blocked or missing: the visuals carry on
}

export function dispose() {
  current?.pause();
  current = null;
  ctx?.close();
  ctx = null;
  drone = null;
}
