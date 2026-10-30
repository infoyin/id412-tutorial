import type { Entry } from "./words";

// Pronunciation. One voice at a time; starting a new one stops the last.
// - Taiwanese: the MOE dictionary recording, played as it is.
// - Korean: a Lingua Libre recording when there is one, otherwise the browser's speech
//   synthesis with an actual Korean (ko-*) voice. If the browser has no Korean voice we say so
//   and stay silent; we never fall back to an English or Chinese voice.
// Nothing plays while muted, and muting stops audio and queued speech at once.
// Pages call these only from user gestures (a drag that connects a pair, a click).
//
// Sound effects (original, synthesized with Web Audio, not speech): a hum that rises while a
// pair resonates, a "portal" sweep when a pair connects, a falling glitch when a false friend
// cracks. The AudioContext is created by unlockEffects() on the first pointer press.

export type Lang = "tw" | "ko";
export type Playing = { id: string; lang: Lang } | null;

let muted = false;
let current: HTMLAudioElement | null = null;
let token = 0; // bumps on every stop, so late callbacks from old playback do nothing
let playing: Playing = null;
let listener: (p: Playing) => void = () => {};
let koreanVoice: SpeechSynthesisVoice | null = null;

const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

// Voices can load late; pick a Korean one whenever the list changes.
function findVoice() {
  if (!hasSpeech()) return;
  const voices = speechSynthesis.getVoices();
  koreanVoice = voices.find((v) => v.lang === "ko-KR") ?? voices.find((v) => v.lang.toLowerCase().startsWith("ko")) ?? null;
}
if (hasSpeech()) {
  findVoice();
  speechSynthesis.addEventListener("voiceschanged", findVoice);
}

// null = can't tell yet (voices not loaded), false = this browser has no Korean voice.
export function koreanVoiceStatus(): boolean | null {
  if (!hasSpeech()) return false;
  if (koreanVoice) return true;
  return speechSynthesis.getVoices().length ? false : null;
}

export function onPlaying(fn: (p: Playing) => void) {
  listener = fn;
}

export function getPlaying() {
  return playing;
}

function setPlaying(p: Playing) {
  playing = p;
  listener(p);
}

export function setMuted(value: boolean) {
  muted = value;
  if (muted) stop();
  if (fx) fx.master.gain.setTargetAtTime(muted ? 0 : 0.5, fx.ctx.currentTime, 0.05);
}

// ---- Sound effects ----

type Effects = {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
  hum: { gain: GainNode; filter: BiquadFilterNode; oscs: OscillatorNode[] };
};
let fx: Effects | null = null;

export function unlockEffects() {
  if (fx || typeof AudioContext === "undefined") return;
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);

  // One second of white noise, reused by the sweeps.
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  // Resonance hum: two detuned saws and a sine through a resonant low-pass, silent until used.
  const gain = ctx.createGain();
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 300;
  filter.Q.value = 8;
  filter.connect(gain);
  gain.connect(master);
  const oscs = [
    ["sawtooth", 110],
    ["sawtooth", 110.8],
    ["sine", 220],
  ].map(([type, freq]) => {
    const o = ctx.createOscillator();
    o.type = type as OscillatorType;
    o.frequency.value = freq as number;
    o.connect(filter);
    o.start();
    return o;
  });
  fx = { ctx, master, noise, hum: { gain, filter, oscs } };
}

// level 0…1: how close the pair being brought together is. 0 = silent.
export function setHum(level: number) {
  if (!fx) return;
  const t = fx.ctx.currentTime;
  const { gain, filter, oscs } = fx.hum;
  gain.gain.setTargetAtTime(level * 0.09, t, 0.08);
  filter.frequency.setTargetAtTime(300 + level * 2400, t, 0.08);
  oscs.forEach((o, i) => o.frequency.setTargetAtTime([110, 110.8, 220][i] * (1 + level), t, 0.1));
}

// A burst of filtered noise whose band moves from `from` Hz to `to` Hz.
function sweep(from: number, to: number, seconds: number, volume: number) {
  const { ctx, master, noise } = fx!;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 6;
  band.frequency.setValueAtTime(from, t);
  band.frequency.exponentialRampToValueAtTime(to, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + seconds * 0.3);
  g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  src.connect(band).connect(g).connect(master);
  src.start(t);
  src.stop(t + seconds + 0.05);
}

// A sine glide with a soft envelope.
function glide(from: number, to: number, start: number, seconds: number, volume: number) {
  const { ctx, master } = fx!;
  const t = ctx.currentTime + start;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + seconds);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + seconds + 0.05);
}

// A pair connects: a rising whoosh and a shimmering chord, like stepping through a portal.
export function portal() {
  if (!fx || muted) return;
  sweep(300, 5000, 0.9, 0.35);
  [523, 659, 784].forEach((f, i) => glide(f, f * 2, 0.15 + i * 0.06, 1.1, 0.07));
}

export function closeEffects() {
  fx?.ctx.close();
  fx = null;
}

// A false friend cracks: a short falling glitch.
export function crackSound() {
  if (!fx || muted) return;
  sweep(3000, 200, 0.35, 0.3);
  glide(600, 90, 0, 0.4, 0.12);
}

export function stop() {
  token++;
  if (current) {
    current.onended = current.onerror = null;
    current.pause();
    current = null;
  }
  if (hasSpeech()) speechSynthesis.cancel();
  setPlaying(null);
}

function playFile(src: string, mine: number, done: () => void) {
  const audio = new Audio(src);
  current = audio;
  const finish = () => mine === token && done();
  audio.onended = finish;
  audio.onerror = finish; // missing or broken file: move on
  audio.play().catch(finish);
}

function speakKorean(text: string, mine: number, done: () => void) {
  findVoice();
  if (!hasSpeech() || !koreanVoice) return done();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = koreanVoice.lang;
  u.voice = koreanVoice;
  u.rate = 0.85;
  const finish = () => mine === token && done();
  u.onend = finish;
  u.onerror = finish;
  speechSynthesis.speak(u);
}

// Play one language of a pair; `then` runs when it finishes (not if stopped).
export function playOne(entry: Entry, lang: Lang, then?: () => void) {
  stop();
  if (muted) return;
  const mine = token;
  setPlaying({ id: entry.id, lang });
  const done = () => {
    setPlaying(null);
    then?.();
  };
  if (lang === "tw") playFile(entry.taiwanese.audio, mine, done);
  else if (entry.korean.audio) playFile(entry.korean.audio.file, mine, done);
  else speakKorean(entry.korean.hangul, mine, done);
}

// Taiwanese, then Korean.
export function playPair(entry: Entry) {
  playOne(entry, "tw", () => {
    const mine = token; // if anything else starts in the pause, don't interrupt it
    setTimeout(() => mine === token && !muted && playOne(entry, "ko"), 250);
  });
}
