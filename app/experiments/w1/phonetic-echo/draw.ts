import type { Field } from "./field";
import { COLORS } from "./settings";

// Drawing: motion trails, the lines and particles between partners, ripples, the words, grain.
// Typography is the main character; everything else stays thin and quiet.

export const FONT_FAMILY =
  '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';

// Tâi-lô needs a font with the combining mark in a̍; many CJK fonts draw a box instead.
export const LATIN_FAMILY = '"Helvetica Neue", Arial, sans-serif';

export const wordFont = (size: number) => `500 ${size}px ${FONT_FAMILY}`;

// One small tile of film grain, made once.
export function makeGrain() {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 128;
  const g = tile.getContext("2d")!;
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return tile;
}

const accent = (alpha: number) => `rgba(255, 90, 38, ${alpha})`;
const ink = (alpha: number) => `rgba(240, 238, 232, ${alpha})`;

export function draw(
  ctx: CanvasRenderingContext2D,
  field: Field,
  time: number,
  fontSize: number,
  grain: CanvasPattern | null,
  reduced: boolean,
) {
  const { width, height } = field;

  // 1. Fade the last frame instead of clearing it: soft motion trails.
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = reduced ? COLORS.background : "rgba(16, 16, 16, 0.34)";
  ctx.fillRect(0, 0, width, height);

  // 2. Between partners: a thin line and drifting particles, stronger as they come close.
  field.closeness.forEach((_, i) => {
    const energy = Math.min(field.intensity[i], 1.6);
    if (energy < 0.02) return;
    const tw = field.words.find((w) => w.pair === i && w.lang === "tw")!;
    const ko = field.words.find((w) => w.pair === i && w.lang === "ko")!;
    const dx = ko.x - tw.x;
    const dy = ko.y - tw.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    ctx.strokeStyle = accent(Math.min(energy * 0.7, 0.9));
    ctx.lineWidth = 0.5 + energy;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(tw.x, tw.y);
    ctx.lineTo(ko.x, ko.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const count = Math.floor(6 + energy * 30);
    for (let k = 0; k < count; k++) {
      const f = (k / count + time * 0.12) % 1;
      const wave = reduced ? 0 : Math.sin(time * 7 + k * 1.7) * energy * 8;
      ctx.fillStyle = k % 3 === 0 ? ink(0.6 * energy) : accent(Math.min(energy, 1));
      ctx.fillRect(tw.x + dx * f + nx * wave, tw.y + dy * f + ny * wave, 1.5, 1.5);
    }
  });

  // 3. Ripples from a revealed pair.
  for (const r of field.ripples) {
    const k = r.t / 2.5;
    for (const lag of [0, 0.18]) {
      const kk = Math.max(0, k - lag);
      ctx.strokeStyle = accent((1 - kk) * 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, kk * Math.max(width, height) * 0.45, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 4. Words.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const w of field.words) {
    const energy = Math.min(field.intensity[w.pair], 1.6);
    const shake = reduced ? 0 : energy * 2.5;
    ctx.save();
    // While a pair is revealed, everything else steps back.
    ctx.globalAlpha = field.revealed !== null && field.revealed !== w.pair ? 0.3 : 1;
    ctx.translate(w.x + (Math.random() - 0.5) * shake, w.y + (Math.random() - 0.5) * shake);
    ctx.rotate(w.angle);
    ctx.scale(w.scale, w.scale);

    ctx.shadowColor = accent(0.9);
    ctx.shadowBlur = w.hover * 10 + energy * 26;
    ctx.fillStyle = COLORS.text;
    ctx.font = wordFont(fontSize);
    ctx.fillText(w.text, 0, 0);
    ctx.shadowBlur = 0;

    // Not only colour: a line under the word grows as the cursor nears or grabs it.
    if (w.hover > 0.02) {
      ctx.strokeStyle = ink(0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w.width / 2, fontSize * 0.62);
      ctx.lineTo(-w.width / 2 + w.width * w.hover, fontSize * 0.62);
      ctx.stroke();
    }

    // Tiny language tag, and Tâi-lô under the Taiwanese words.
    ctx.font = `400 ${Math.round(fontSize * 0.16)}px ${FONT_FAMILY}`;
    ctx.fillStyle = ink(0.4);
    ctx.textAlign = "left";
    ctx.fillText(w.lang === "tw" ? "台" : "한", w.width / 2 + 6, -fontSize * 0.36);
    ctx.textAlign = "center";
    if (w.sub) {
      ctx.font = `400 ${Math.round(fontSize * 0.24)}px ${LATIN_FAMILY}`;
      ctx.fillStyle = ink(0.55);
      ctx.fillText(w.sub, 0, fontSize * 0.86);
    }
    ctx.restore();
  }

  // 5. Grain over everything.
  if (grain) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.translate(reduced ? 0 : Math.random() * 128, reduced ? 0 : Math.random() * 128);
    ctx.fillStyle = grain;
    ctx.fillRect(-128, -128, width + 256, height + 256);
    ctx.restore();
  }
}
