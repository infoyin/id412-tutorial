import type { Entry } from "./words";

// Pronunciation. One voice at a time; starting a new one stops the last.
// - Taiwanese: the MOE dictionary recording, played as it is.
// - Korean: a Lingua Libre recording when there is one, otherwise the browser's speech
//   synthesis with an actual Korean (ko-*) voice. If the browser has no Korean voice we say so
//   and stay silent; we never fall back to an English or Chinese voice.
// Nothing plays while muted, and muting stops audio and queued speech at once.
// Pages call these only from user gestures (a drag that connects a pair, a click).

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
