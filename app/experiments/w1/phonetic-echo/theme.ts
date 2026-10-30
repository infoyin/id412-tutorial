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
