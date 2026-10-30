// The five parameters that shape the piece, and how input drives them.
//
//   gravityStrength   ← how far the wheel is dragged (gentle drag = subtle drift, long drag = fall)
//   flingImpulse      ← how fast the wheel is flung (pointer speed at release, above flingSpeed)
//   angularMomentum   ← wheel spin after a fling, and how hard blocks spin when scattered
//   magneticStrength  ← pull between partners, stronger while a word is dragged fast
//   settlingDamping   ← how quickly a scattered field calms down (drops to near 0 at a fling,
//                       then eases back to this value)

export const SETTINGS = {
  gravityStrength: 1100, // px/s² at a full wheel pull (scaled by pull², so small pulls stay subtle)
  flingImpulse: 2600, // px/s given to blocks by a full-strength fling
  angularMomentum: 1, // 0.5 = sluggish, 2 = spins a lot
  magneticStrength: 1, // pull between partners
  settlingDamping: 0.9, // per second; higher = calms faster
};

// Smaller knobs.
export const TUNING = {
  driftSpeed: 34, // px/s of weightless floating
  connectionDistance: 0.3, // × shorter screen side: gap at which partners start to feel each other
  connectAt: 0.88, // closeness at which partners dock
  resonateFrom: 0.45, // closeness where approach turns into resonance
  solidityRate: 0.6, // per second: how fast a docked pair fills black
  flingSpeed: 1500, // px/s of pointer speed on the wheel that counts as a fling
  flingCooldown: 2.5, // seconds before another fling can renew the words
  transitionSeconds: 1.6, // old words fly out and fade, new ones enter, over about this long
  maxDpr: 2,
};

// How many pairs are on screen (12–20 word blocks at the default size; fewer when the blocks are
// made bigger with the size bar, so they keep their spacing).
export function pairCount(width: number, height: number, scale = 1) {
  return Math.round(Math.min(10, Math.max(4, (width * height) / 110000 / (scale * scale))));
}

// The size bar: block scale from the default (smallest) up to this.
export const SIZE = { min: 1, max: 1.6, step: 0.05 };
