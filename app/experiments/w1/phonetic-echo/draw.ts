import type { Playing } from "./audio";
import type { Block, World } from "./physics";
import { TUNING } from "./settings";

// Drawing the field: paper background, a few editorial rules, tension lines between partners,
// and the outlined blocks. Black and white only; grays for in-between states.

export const FONT = '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
// Tâi-lô needs a font with the combining mark in a̍; many CJK fonts draw a box instead.
export const LATIN = '"Helvetica Neue", Arial, sans-serif';

const PAPER = "#fbfbf9";
const INK = "#111";
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
let hatch: CanvasPattern | null = null;

// Diagonal hatching for cracked false friends, made once.
function hatchPattern(ctx: CanvasRenderingContext2D) {
  if (hatch) return hatch;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 8;
  const g = tile.getContext("2d")!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, 8, 8);
  g.strokeStyle = "#8a8a86";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, 8);
  g.lineTo(8, 0);
  g.stroke();
  hatch = ctx.createPattern(tile, "repeat");
  return hatch;
}

// First clause of a definition: "報社、廣播電臺…" → "報社".
const short = (text: string, max = 12) => (text.split(/[。，、；;,]/)[0] ?? "").slice(0, max);

const resonanceOf = (close: number) => clamp01((close - TUNING.resonateFrom) / (TUNING.connectAt - TUNING.resonateFrom));

// Irregular plate: a rectangle with jittered corners and maybe one cut corner.
function plate(ctx: CanvasRenderingContext2D, b: Block, unit: number, grow = 0) {
  const w = b.w / 2 + grow;
  const h = b.h / 2 + grow;
  const j = (k: number) => b.jitter[k] * unit * 0.5;
  const corners = [
    [-w + j(0), -h + j(1)],
    [w + j(2), -h + j(3)],
    [w + j(4), h + j(5)],
    [-w + j(6), h + j(7)],
  ];
  ctx.beginPath();
  corners.forEach(([x, y], k) => {
    if (k === b.cut) {
      // Chamfer: replace the corner with two points along its edges.
      const [px, py] = corners[(k + 3) % 4];
      const [nx, ny] = corners[(k + 1) % 4];
      const c = unit * 0.6;
      const toPrev = Math.hypot(px - x, py - y);
      const toNext = Math.hypot(nx - x, ny - y);
      ctx.lineTo(x + ((px - x) / toPrev) * c, y + ((py - y) / toPrev) * c);
      ctx.lineTo(x + ((nx - x) / toNext) * c, y + ((ny - y) / toNext) * c);
    } else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

export function drawField(
  ctx: CanvasRenderingContext2D,
  world: World,
  fontSize: number,
  dim: number,
  playing: Playing,
  time: number,
  reduced: boolean,
) {
  const { width, height } = world;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  // Editorial rules.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(width - 28, 120);
  ctx.lineTo(width - 28, height - 70);
  ctx.moveTo(width * 0.55, height - 56);
  ctx.lineTo(width - 28, height - 56);
  ctx.stroke();

  const fade = 1 - dim * 0.94; // blocks step back in comparison mode

  // Tension lines between partners (under the blocks, whose fill hides the inside part).
  for (const pair of world.pairs) {
    const { tw, ko, closeness } = pair;
    if (closeness < 0.02 || pair.docked || pair.leaving || pair.cracked >= 0) continue;
    const resonance = resonanceOf(closeness);
    ctx.strokeStyle = resonance > 0 ? INK : "#9a9a95";
    ctx.lineWidth = 0.75;
    ctx.setLineDash(resonance > 0 ? [] : [3, 5]);
    ctx.globalAlpha = fade * Math.min(1, closeness / TUNING.resonateFrom);
    const nx = -(ko.y - tw.y);
    const ny = ko.x - tw.x;
    const len = Math.hypot(nx, ny) || 1;
    // One dashed line while approaching; a double rule once they resonate.
    for (const off of resonance > 0 ? [-2, 2] : [0]) {
      ctx.beginPath();
      ctx.moveTo(tw.x + (nx / len) * off, tw.y + (ny / len) * off);
      ctx.lineTo(ko.x + (nx / len) * off, ko.y + (ny / len) * off);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  const unit = fontSize * 0.5;
  for (const b of world.blocks) {
    const pair = b.pair;
    const cracked = pair.cracked >= 0;
    const resonance = pair.docked ? 1 : pair.leaving || cracked ? 0 : resonanceOf(pair.closeness);
    const solid = pair.solidity;
    const shake = reduced || pair.docked ? 0 : resonance * 1.6;
    // While this word is being pronounced, it breathes.
    const speaking = playing && playing.id === pair.entry.id && playing.lang === b.lang;
    const pulse = speaking ? (reduced ? 0.6 : 0.5 + 0.5 * Math.sin(time * 9)) : 0;
    const alpha = fade * b.alpha;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x + (Math.random() - 0.5) * shake, b.y + (Math.random() - 0.5) * shake);
    ctx.rotate(b.angle);
    if (speaking) ctx.scale(1 + pulse * 0.06, 1 + pulse * 0.06);

    // Lifted paper: a gray shadow plate under the held block.
    if (b === world.held) {
      ctx.save();
      ctx.translate(5, 8);
      plate(ctx, b, unit);
      ctx.fillStyle = "#d8d8d4";
      ctx.fill();
      ctx.restore();
    }

    // Resonance (or speech): an echo outline, slightly larger and turned.
    const echo = Math.max(resonance * (1 - solid), pulse);
    if (echo > 0) {
      ctx.save();
      ctx.rotate(0.03 * echo);
      plate(ctx, b, unit, 3 + echo * 4);
      ctx.strokeStyle = `rgba(17, 17, 17, ${echo * 0.6})`;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
    }

    // The plate: white → solid black as the pair solidifies; hatched and dashed once cracked.
    const g = Math.round(251 - 234 * solid);
    plate(ctx, b, unit);
    ctx.fillStyle = cracked ? hatchPattern(ctx)! : `rgb(${g}, ${g}, ${g})`;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1 + solid * 1.4 + b.hover * 0.6 + pulse;
    if (cracked) ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (cracked) {
      // A zigzag crack from top to bottom.
      const x0 = b.jitter[0] * b.w * 0.4;
      ctx.beginPath();
      ctx.moveTo(x0, -b.h / 2);
      for (let k = 1; k <= 5; k++) ctx.lineTo(x0 + (k % 2 ? 1 : -1) * unit * 0.35, -b.h / 2 + (b.h * k) / 5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Text: black on white, white on black; heavier as it resonates and solidifies.
    const weight = solid > 0.6 ? 700 : resonance > 0.3 ? 500 : 400;
    ctx.fillStyle = solid > 0.5 ? PAPER : INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${weight} ${fontSize}px ${FONT}`;
    if (b.lang === "tw") {
      ctx.fillText(b.text, 0, -fontSize * 0.2);
      ctx.font = `400 ${Math.round(fontSize * 0.36)}px ${LATIN}`;
      ctx.globalAlpha = alpha * 0.75;
      ctx.fillText(b.sub, 0, fontSize * 0.62);
    } else {
      ctx.fillText(b.text, 0, fontSize * 0.12);
      // The shared characters surface on the Korean block as the pair resonates.
      const show = Math.max(resonance, solid);
      if (show > 0.01) {
        ctx.font = `400 ${Math.round(fontSize * 0.36)}px ${FONT}`;
        ctx.globalAlpha = alpha * show;
        ctx.fillText(pair.entry.hanja, 0, -fontSize * 0.68);
      }
    }

    // Language tag in the corner.
    ctx.font = `400 ${Math.round(fontSize * 0.26)}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillText(b.lang === "tw" ? "台" : "한", -b.w / 2 + 8, -b.h / 2 + 10);
    ctx.restore();
  }

  // Label for a freshly cracked false friend: the two meanings, for a few seconds.
  for (const pair of world.pairs) {
    const t = pair.cracked;
    if (t < 0 || t > 7 || pair.leaving) continue;
    const e = pair.entry;
    const lines = [
      "偽友 · 가짜 친구 · false friend",
      `台 ${e.hanja} — ${short(e.taiwanese.definition) || `同華語「${e.hanja}」`}`,
      `한 ${e.korean.hangul} — ${short(e.korean.chinese, 8)} · ${short(e.korean.english, 18)}`,
    ];
    const size = Math.max(12, Math.round(fontSize * 0.5));
    ctx.font = `700 ${size}px ${FONT}`;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24;
    const h = lines.length * size * 1.5 + 16;
    const x = Math.min(Math.max((pair.tw.x + pair.ko.x) / 2 - w / 2, 12), width - w - 12);
    const y = Math.min(Math.max(Math.min(pair.tw.y, pair.ko.y) - h - 40, 12), height - h - 12);
    ctx.globalAlpha = fade * Math.min(1, t / 0.3, (7 - t) / 1.2);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, x + 12, y + 10 + i * size * 1.5));
  }
  ctx.globalAlpha = 1;
}
