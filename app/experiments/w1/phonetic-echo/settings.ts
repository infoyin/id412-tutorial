// The five parameters that shape the piece. Edit these.
// The values here are the base; two of them are pushed around live by the pointer (see field.ts):
// - magneticStrength grows with pointer speed (a fast cursor pulls harder),
// - resonanceIntensity is scaled by how close a pair is and whether you are dragging.

export const SETTINGS = {
  magneticStrength: 1, // how hard words lean toward the cursor and toward their partner
  resonanceIntensity: 1, // vibration, glow, particles and line energy as a pair comes close
  driftSpeed: 14, // px per second of ambient wandering
  connectionDistance: 0.42, // × the shorter screen side: where a pair starts to feel each other
  typographicScale: 1, // how much glyphs grow on hover and in resonance
};

// Smaller knobs.
export const TUNING = {
  pointerRadius: 220, // px, reach of the cursor's field
  matchAt: 0.82, // 0–1 closeness at which a held pair locks and reveals
  revealSeconds: 7, // how long a revealed pair stays together
  cooldownSeconds: 4, // after separating, the pair can't reveal again for this long
  maxDpr: 2,
};

export const COLORS = {
  background: "#101010",
  text: "#F0EEE8",
  accent: "#FF5A26",
};
