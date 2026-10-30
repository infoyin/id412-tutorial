import type { Entry } from "./words";

// Pronunciation playback. Dictionary recordings are played as they are (no processing).
// Taiwanese first, then Korean when a Korean recording exists (none are bundled yet).
// Nothing plays until the user has interacted, and nothing plays while muted.

let muted = false;
let current: HTMLAudioElement | null = null;

export function setMuted(value: boolean) {
  muted = value;
  if (muted) stop();
}

export function stop() {
  if (!current) return;
  current.onended = null;
  current.pause();
  current = null;
}

function play(src: string, then?: () => void) {
  stop();
  current = new Audio(src);
  current.onended = () => then?.();
  current.play().catch(() => then?.()); // blocked or missing: carry on silently
}

export function playPair(entry: Entry) {
  if (muted) return;
  const { taiwanese, korean } = entry;
  const playKorean = () => {
    if (korean.audio && !muted) play(korean.audio);
  };
  if (taiwanese.audio) play(taiwanese.audio, playKorean);
  else playKorean();
}
