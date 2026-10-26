// Helpers for the captcha look: wobbly borders, noise lines, distorted digits.
// Everything comes from noise(seed, n), so a clock keeps the same shape every frame.

// A repeatable "random" number 0–1 for a given seed and index.
export function noise(seed: number, n: number) {
  const r = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return r - Math.floor(r);
}

// A circle of radius ~40 whose edge wobbles in and out, as an SVG path.
export function wobblyCircle(seed: number, wobble = 6, points = 18) {
  let d = "";
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const r = 40 + (noise(seed, i) - 0.5) * wobble;
    d += `${i === 0 ? "M" : "L"} ${50 + r * Math.sin(angle)} ${50 - r * Math.cos(angle)} `;
  }
  return d + "Z";
}

// Two thin lines across the clock, like the scratches over captcha text.
export function noiseLines(seed: number) {
  return [0, 1].map((k) => ({
    x1: 5 + noise(seed, 40 + k) * 20,
    y1: 10 + noise(seed, 50 + k) * 80,
    x2: 75 + noise(seed, 60 + k) * 20,
    y2: 10 + noise(seed, 70 + k) * 80,
  }));
}

const FONTS = [
  "Georgia, serif",
  "'Courier New', monospace",
  "Impact, sans-serif",
  "'Comic Sans MS', cursive",
  "'Times New Roman', serif",
];

// Tilt, skew, font and size for one digit. Pass the digit in the seed so each new number looks different.
export function distortDigit(seed: number) {
  return {
    rotate: (noise(seed, 1) - 0.5) * 60, // ±30°
    skew: (noise(seed, 2) - 0.5) * 40, // ±20°
    fontFamily: FONTS[Math.floor(noise(seed, 3) * FONTS.length)],
    fontSize: 38 + noise(seed, 4) * 20,
    dx: (noise(seed, 5) - 0.5) * 10,
  };
}
