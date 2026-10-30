import type { Block, World } from "./physics";
import { TUNING } from "./settings";

// Drawing the field: paper background, a few editorial rules, tension lines between partners,
// and the outlined blocks. Black and white only; grays for in-between states.

export const FONT = '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
// Tâi-lô needs a font with the combining mark in a̍; many CJK fonts draw a box instead.
export const LATIN = '"Helvetica Neue", Arial, sans-serif';

export const PAPER = "#fbfbf9";
const INK = "#111";
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

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

export function drawField(ctx: CanvasRenderingContext2D, world: World, fontSize: number, dim: number, reduced: boolean) {
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
  world.closeness.forEach((close, i) => {
    if (close < 0.02 || world.docked[i]) return;
    const tw = world.blocks.find((b) => b.pair === i && b.lang === "tw")!;
    const ko = world.blocks.find((b) => b.pair === i && b.lang === "ko")!;
    const resonance = clamp01((close - TUNING.resonateFrom) / (TUNING.connectAt - TUNING.resonateFrom));
    ctx.strokeStyle = resonance > 0 ? INK : "#9a9a95";
    ctx.lineWidth = 0.75;
    ctx.setLineDash(resonance > 0 ? [] : [3, 5]);
    ctx.globalAlpha = fade * Math.min(1, close / TUNING.resonateFrom);
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
  });

  const unit = fontSize * 0.5;
  for (const b of world.blocks) {
    const i = b.pair;
    const docked = world.docked[i];
    const resonance = docked ? 1 : clamp01((world.closeness[i] - TUNING.resonateFrom) / (TUNING.connectAt - TUNING.resonateFrom));
    const solid = world.solidity[i];
    const shake = reduced || docked ? 0 : resonance * 1.6;

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(b.x + (Math.random() - 0.5) * shake, b.y + (Math.random() - 0.5) * shake);
    ctx.rotate(b.angle);

    // Lifted paper: a gray shadow plate under the held block.
    if (b === world.held) {
      ctx.save();
      ctx.translate(5, 8);
      plate(ctx, b, unit);
      ctx.fillStyle = "#d8d8d4";
      ctx.fill();
      ctx.restore();
    }

    // Resonance: an echo outline, slightly larger and turned.
    if (resonance > 0 && solid < 1) {
      ctx.save();
      ctx.rotate(0.03 * resonance);
      plate(ctx, b, unit, 3 + resonance * 4);
      ctx.strokeStyle = `rgba(17, 17, 17, ${resonance * 0.5 * (1 - solid)})`;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
    }

    // The plate: white → solid black as the pair solidifies.
    const g = Math.round(251 - 234 * solid);
    plate(ctx, b, unit);
    ctx.fillStyle = `rgb(${g}, ${g}, ${g})`;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1 + solid * 1.4 + b.hover * 0.6;
    ctx.stroke();

    // Text: black on white, white on black; heavier as it resonates and solidifies.
    const weight = solid > 0.6 ? 700 : resonance > 0.3 ? 500 : 400;
    ctx.fillStyle = solid > 0.5 ? PAPER : INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${weight} ${fontSize}px ${FONT}`;
    if (b.lang === "tw") {
      ctx.fillText(b.text, 0, -fontSize * 0.2);
      ctx.font = `400 ${Math.round(fontSize * 0.36)}px ${LATIN}`;
      ctx.globalAlpha = fade * 0.75;
      ctx.fillText(b.sub, 0, fontSize * 0.62);
    } else {
      ctx.fillText(b.text, 0, fontSize * 0.12);
      // The shared characters surface on the Korean block as the pair resonates.
      const show = Math.max(resonance, solid);
      if (show > 0.01) {
        ctx.font = `400 ${Math.round(fontSize * 0.36)}px ${FONT}`;
        ctx.globalAlpha = fade * show;
        ctx.fillText(b.hanja, 0, -fontSize * 0.68);
      }
    }

    // Language tag in the corner.
    ctx.font = `400 ${Math.round(fontSize * 0.26)}px ${FONT}`;
    ctx.textAlign = "left";
    ctx.globalAlpha = fade * 0.5;
    ctx.fillText(b.lang === "tw" ? "台" : "한", -b.w / 2 + 8, -b.h / 2 + 10);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
