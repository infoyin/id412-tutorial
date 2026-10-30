// The five parameters that shape the piece. Edit these.
// Two are driven live by input (see physics.ts):
// - gravityStrength is scaled by how far the wheel is pulled down (up = lift),
// - magneticStrength grows with the speed of a dragged word.

export const SETTINGS = {
  driftSpeed: 12, // px per second of ambient wandering
  gravityStrength: 1100, // px/s² when the wheel is pulled all the way
  magneticStrength: 1, // pull between partners (and toward the cursor)
  connectionDistance: 0.32, // × shorter screen side: gap at which partners start to feel each other
  solidityProgress: 0.6, // per second: how fast a connected pair fills black (half as fast to fade)
};

// Smaller knobs.
export const TUNING = {
  connectAt: 0.88, // 0–1 closeness at which partners dock
  resonateFrom: 0.45, // closeness where approach turns into resonance
  maxDpr: 2,
};
