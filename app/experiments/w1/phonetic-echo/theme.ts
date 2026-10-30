// Colours shared by the canvas drawing (draw.ts, wheel.ts). Light: black on paper.
// Dark: the same, inverted. The HTML side uses the matching CSS variables (--paper, --ink).

export const theme = {
  dark: false,
  paper: "#fbfbf9",
  ink: "#111111",
  mid: "#9a9a95", // dashed lines, hatching
  shadow: "#d8d8d4", // lifted block
};

export function setDark(dark: boolean) {
  theme.dark = dark;
  theme.paper = dark ? "#121212" : "#fbfbf9";
  theme.ink = dark ? "#eeeeea" : "#111111";
  theme.mid = dark ? "#6e6e6a" : "#9a9a95";
  theme.shadow = dark ? "#2e2e2c" : "#d8d8d4";
}

// Mix paper → ink, 0…1 (a block filling up as it solidifies).
export function mix(t: number) {
  const a = parseInt(theme.paper.slice(1), 16);
  const b = parseInt(theme.ink.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

// Dark mode prints blocks and the wheel in silver foil: a metallic gradient whose bright band
// drifts (shimmer 0…1), with fine grain on top. Text on foil is near-black.
export const FOIL = { ink: "#161616", light: "#dcdcd8", side: "#a3a3a0" };

export function foil(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, shimmer: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const s = 0.2 + shimmer * 0.6; // where the bright band sits
  g.addColorStop(0, "#b4b4b1");
  g.addColorStop(Math.max(0, s - 0.22), "#cfcfcc");
  g.addColorStop(s, "#f1f1ee");
  g.addColorStop(Math.min(1, s + 0.18), "#bdbdba");
  g.addColorStop(1, "#d3d3d0");
  return g;
}

let grainPattern: CanvasPattern | null = null;

// Fine speckle, made once.
export function grain(ctx: CanvasRenderingContext2D) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 96;
  const g = tile.getContext("2d")!;
  const img = g.createImageData(96, 96);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 90;
  }
  g.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, "repeat");
  return grainPattern;
}
