// Open-source (SIL OFL) typefaces from Google Fonts. layout.tsx links their stylesheet
// (FONTS_CSS); the browser then downloads only the slices for the characters on screen
// (page.tsx asks for them with document.fonts.load). Nothing is fetched at build time.
// Four styles; each pairs a Traditional Chinese face (Taiwanese blocks) with a Korean face.
// Variable faces let the weight move continuously (light while floating, heavy once connected).

export const FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100..900&family=Noto+Sans+KR:wght@100..900" +
  "&family=Noto+Serif+TC:wght@200..900&family=Noto+Serif+KR:wght@200..900&family=LXGW+WenKai+TC:wght@300;400;700" +
  "&family=Gowun+Batang:wght@400;700&family=Chiron+Hei+HK:wght@200..900&family=Black+Han+Sans&family=Inter:wght@100..900" +
  "&display=swap";

// Tâi-lô and romanization: Inter, falling back per character (a̍) to Helvetica / Arial.
export const LATIN_FACE = `"Inter", "Helvetica Neue", Arial, sans-serif`;

export type FontStyle = {
  id: string;
  name: string; // menu label
  tw: string; // CSS font-family for Taiwanese blocks
  ko: string; // ... for Korean blocks
  // Weights: idle (floating) → full (connected). A face with only fixed weights snaps between them.
  light: number;
  heavy: number;
  variable: boolean;
  koWeight?: number; // a Korean face with a single weight: always use it (no faux bold)
};

export const FONT_STYLES: FontStyle[] = [
  { id: "sans", name: "黑體 · 고딕 · Sans", tw: `"Noto Sans TC"`, ko: `"Noto Sans KR"`, light: 250, heavy: 900, variable: true },
  { id: "serif", name: "明體 · 명조 · Serif", tw: `"Noto Serif TC"`, ko: `"Noto Serif KR"`, light: 250, heavy: 900, variable: true },
  { id: "kai", name: "楷體 · 손글씨 · Script", tw: `"LXGW WenKai TC"`, ko: `"Gowun Batang"`, light: 400, heavy: 700, variable: false },
  { id: "display", name: "粗體 · 디스플레이 · Display", tw: `"Chiron Hei HK"`, ko: `"Black Han Sans"`, light: 500, heavy: 900, variable: true, koWeight: 400 },
];

// The weight for how far a block has come: k = 0 floating … 1 connected and solid.
export function weightFor(style: FontStyle, k: number, lang: "tw" | "ko") {
  if (lang === "ko" && style.koWeight) return style.koWeight;
  const w = style.light + (style.heavy - style.light) * Math.min(Math.max(k, 0), 1);
  return style.variable ? Math.round(w / 10) * 10 : k > 0.5 ? style.heavy : style.light;
}
