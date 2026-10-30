import type { Playing } from "./audio";
import type { Block, World } from "./physics";
import { TUNING } from "./settings";
import { drawCube } from "./cube";
import { FONT_STYLES, LATIN_FACE, weightFor, type FontStyle } from "./fonts";
import { FOIL, foil, grain, mix, theme } from "./theme";

// Drawing the field: paper background, a few editorial rules, tension lines between partners,
// and the outlined blocks. Black and white only; grays for in-between states.

export const FONT = '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
// Tâi-lô needs a font with the combining mark in a̍; many CJK fonts draw a box instead.
export const LATIN = LATIN_FACE;

// The block typeface (fonts.ts). Changing it flips the blocks over one by one, left to right:
// each shows the old face until it is edge-on, then the new one.
export const typeface = { style: FONT_STYLES[0], prev: FONT_STYLES[0], changedAt: -100 };
let fieldWidth = 1;

export function setTypeface(style: FontStyle, time: number) {
  typeface.prev = typeface.style;
  typeface.style = style;
  typeface.changedAt = time;
}

// 0…1 through this block's flip (1 when done).
function flipOf(b: Block, time: number) {
  const delay = (b.x / fieldWidth) * 0.5;
  return Math.min(Math.max((time - typeface.changedAt - delay) / 0.4, 0), 1);
}

// The CSS font for a block's main word: its face, and a weight that grows as the pair comes
// together (light while floating, heaviest once connected and solid).
export function blockFont(b: Block, fontSize: number, k: number, face: FontStyle) {
  const family = b.lang === "tw" ? face.tw : face.ko;
  return `${weightFor(face, k, b.lang)} ${fontSize}px ${family}, ${FONT}`;
}
// Mixed lines (Hangul, Han and Tâi-lô together): Latin first so a̍ draws, then the CJK fonts.
const LABEL = `"Helvetica Neue", Arial, ${FONT}`;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
let hatch: CanvasPattern | null = null;
let hatchDark = false;

// Diagonal hatching for cracked false friends, made once.
function hatchPattern(ctx: CanvasRenderingContext2D) {
  if (hatch && hatchDark === theme.dark) return hatch;
  hatchDark = theme.dark;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 8;
  const g = tile.getContext("2d")!;
  g.fillStyle = theme.paper;
  g.fillRect(0, 0, 8, 8);
  g.strokeStyle = theme.mid;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(0, 8);
  g.lineTo(8, 0);
  g.stroke();
  hatch = ctx.createPattern(tile, "repeat");
  return hatch;
}

// 注音 beside each character: the width of one column, and the drawing.
export const zhuyinColumn = (fontSize: number) => fontSize * 0.44;

// Characters with their 注音 stacked to the right, the whole line centred on x = 0.
// Tone marks ˊˇˋ sit to the right of the last symbol, the neutral tone ˙ above the first.
function drawWithZhuyin(ctx: CanvasRenderingContext2D, text: string, zhuyin: string[], font: string, fontSize: number, y: number) {
  ctx.font = font;
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const col = zhuyinColumn(fontSize);
  const size = fontSize * 0.26;
  let x = -(widths.reduce((s, w) => s + w, 0) + col * chars.length) / 2;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.font = font;
    ctx.fillText(c, x, y);
    x += widths[i];
    const z = zhuyin[i] ?? "";
    const symbols = [...z.replace(/[ˊˇˋ˙]/g, "")];
    const tone = z.match(/[ˊˇˋ]/)?.[0];
    const step = size * 1.08;
    const top = y - ((symbols.length - 1) * step) / 2;
    ctx.font = `500 ${Math.round(size)}px ${FONT}`;
    symbols.forEach((sym, k) => ctx.fillText(sym, x + size * 0.15, top + k * step));
    if (tone) ctx.fillText(tone, x + size * 1.05, top + (symbols.length - 1) * step - size * 0.35);
    if (z.startsWith("˙")) ctx.fillText("˙", x + size * 0.3, top - step * 0.8);
    x += col;
  });
  ctx.textAlign = "center";
}

// Split text into lines that fit `max` px (character by character, so it works for Hangul and Han).
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > max && line) {
      lines.push(line);
      line = ch.trimStart();
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
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

// The words on a block, centred on (0, 0): text black on white, white on black; heavier as it
// resonates and solidifies. Used on the flat blocks and painted onto the 3D cubes.
function drawText(ctx: CanvasRenderingContext2D, b: Block, fontSize: number, alpha: number, resonance: number, solid: number, unit: number, time: number) {
  const pair = b.pair;
  const face = flipOf(b, time) < 0.5 ? typeface.prev : typeface.style;
  // On foil (dark mode) the text is near-black, and silver once the block turns black.
  ctx.fillStyle = theme.dark ? (solid > 0.5 ? FOIL.light : FOIL.ink) : solid > 0.5 ? theme.paper : theme.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = blockFont(b, fontSize, Math.max(solid, resonance * 0.6, b.hover * 0.15), face);
  // Taiwanese: characters with 注音, Tâi-lô underneath.
  // Korean: Hangul, then the shared characters (they surface as the pair resonates),
  // then the Revised Romanization.
  // On Korean blocks the lines open up as the characters appear, so before that the
  // romanization sits as close as the Tâi-lô does.
  const korean = b.lang === "ko";
  const show = korean ? Math.max(resonance, solid) : 0;
  const mainY = -fontSize * (0.2 + 0.16 * show);
  if (b.zhuyin) drawWithZhuyin(ctx, b.text, b.zhuyin, ctx.font, fontSize, mainY);
  else ctx.fillText(b.text, 0, mainY);
  if (show > 0.01) {
    ctx.font = `500 ${Math.round(fontSize * 0.3)}px ${FONT}`;
    ctx.globalAlpha = alpha * show;
    ctx.fillText(pair.entry.hanja, 0, fontSize * 0.28);
  }
  ctx.font = `400 ${Math.round(fontSize * 0.34)}px ${LATIN}`;
  ctx.globalAlpha = alpha * 0.75;
  ctx.fillText(b.sub, 0, fontSize * (0.62 + 0.14 * show));
  ctx.globalAlpha = alpha;

  // Language tag in the corner.
  ctx.font = `400 ${Math.round(fontSize * 0.26)}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.globalAlpha = alpha * 0.5;
  // Inside the plate, clear of a cut top-left corner.
  ctx.fillText(b.lang === "tw" ? "臺" : "한", -b.w / 2 + unit * (b.cut === 0 ? 1.1 : 0.55), -b.h / 2 + unit * 0.7);
}

// A block's face: white → black as the pair solidifies (light mode); silver foil → black (dark mode).
// Fills the current path (or the given rectangle) in the block's own frame.
export function fillFace(ctx: CanvasRenderingContext2D, b: Block, solid: number, time: number, rect?: boolean) {
  const draw = () => (rect ? ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h) : ctx.fill());
  if (!theme.dark) {
    ctx.fillStyle = mix(solid);
    draw();
    return;
  }
  ctx.fillStyle = foil(ctx, -b.w / 2, -b.h / 2, b.w / 2, b.h / 2, (Math.sin(time * 0.5 + b.phase) + 1) / 2);
  draw();
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * 0.5;
  ctx.fillStyle = grain(ctx)!;
  draw();
  ctx.globalAlpha = a * solid;
  ctx.fillStyle = "#0d0d0d";
  draw();
  ctx.globalAlpha = a;
}

let hatchLines: CanvasPattern | null = null;

// Cracked false friends: hatched paper in light mode. In dark mode the foil stays (so the dark
// text still reads) with see-through dark hatching over it.
function fillCracked(ctx: CanvasRenderingContext2D, b: Block, time: number, rect?: boolean) {
  if (!theme.dark) {
    ctx.fillStyle = hatchPattern(ctx)!;
    if (rect) ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    else ctx.fill();
    return;
  }
  fillFace(ctx, b, 0, time, rect);
  if (!hatchLines) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = 8;
    const g = tile.getContext("2d")!;
    g.strokeStyle = "rgba(0, 0, 0, 0.32)";
    g.beginPath();
    g.moveTo(0, 8);
    g.lineTo(8, 0);
    g.stroke();
    hatchLines = ctx.createPattern(tile, "repeat");
  }
  ctx.fillStyle = hatchLines!;
  if (rect) ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
  else ctx.fill();
}

// Corners of a block on screen (its rectangle, turned).
function corners(b: Block): [number, number][] {
  const c = Math.cos(b.angle);
  const s = Math.sin(b.angle);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
    const lx = (x * b.w) / 2;
    const ly = (y * b.h) / 2;
    return [b.x + lx * c - ly * s, b.y + lx * s + ly * c];
  });
}

// Convex hull (monotone chain).
function hull(points: [number, number][]) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// The bridge: the hull of both blocks, shrunk toward the line between them while far apart
// (beam 0 = a thin line) and opening to the full shape as they meet (beam 1).
function drawBridge(ctx: CanvasRenderingContext2D, tw: Block, ko: Block, beam: number, fade: number, time: number, reduced: boolean) {
  const k = 0.12 + 0.88 * beam ** 1.5;
  const squeeze = (b: Block) => corners(b).map(([x, y]) => [b.x + (x - b.x) * k, b.y + (y - b.y) * k] as [number, number]);
  const shape = hull([...squeeze(tw), ...squeeze(ko)]);
  ctx.save();
  ctx.beginPath();
  shape.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.globalAlpha = fade * (0.35 + 0.65 * beam);
  ctx.fillStyle = theme.shadow;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = fade * beam;
  ctx.stroke();
  // Stripes across the bridge, flowing from both ends toward the middle.
  ctx.clip();
  const dx = ko.x - tw.x;
  const dy = ko.y - tw.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const reach = Math.max(tw.w, tw.h, ko.w, ko.h);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const f = reduced ? i / 6 : (time * 0.6 + i / 6) % 1;
    for (const t of [f * 0.5, 1 - f * 0.5]) {
      const x = tw.x + dx * t;
      const y = tw.y + dy * t;
      ctx.globalAlpha = fade * beam * 0.35 * (1 - f);
      ctx.beginPath();
      ctx.moveTo(x - nx * reach, y - ny * reach);
      ctx.lineTo(x + nx * reach, y + ny * reach);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawField(
  ctx: CanvasRenderingContext2D,
  world: World,
  fontSize: number,
  dim: number,
  playing: Playing,
  time: number,
  reduced: boolean,
  // 3D view: amount 0…1 (animated on/off), and the point the "camera" looks from (the cursor).
  depth: { amount: number; x: number; y: number } = { amount: 0, x: 0, y: 0 },
  under?: (fade: number) => void, // drawn on the paper, beneath everything (the particles)
) {
  const { width, height } = world;
  fieldWidth = width;
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, width, height);

  const fade = 1 - dim * 0.94; // blocks step back in comparison mode
  under?.(fade);

  // Tension lines between partners (under the blocks, whose fill hides the inside part).
  for (const pair of world.pairs) {
    const { tw, ko, closeness } = pair;
    // (In the grid every pair sits side by side, so there is no "approach" to show.)
    if (closeness < 0.02 || pair.docked || pair.leaving || pair.cracked >= 0 || world.grid) continue;
    const resonance = resonanceOf(closeness);
    ctx.strokeStyle = resonance > 0 ? theme.ink : theme.mid;
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

    // A bridge between partners: the outline around both blocks, pulled thin at first and
    // filling out to a solid band as they close in, with stripes flowing toward the middle.
    const beam = clamp01((closeness - 0.2) / (TUNING.connectAt - 0.2));
    if (beam > 0) drawBridge(ctx, tw, ko, beam, fade, time, reduced);
  }

  const unit = fontSize * 0.5;
  for (const b of world.blocks) {
    const pair = b.pair;
    const cracked = pair.cracked >= 0;
    const resonance = pair.docked ? 1 : pair.leaving || cracked || world.grid ? 0 : resonanceOf(pair.closeness);
    const solid = Math.max(pair.solidity, b.chosen); // (listen mode: the chosen block fills black)
    const shake = reduced || pair.docked ? 0 : resonance * 1.6;
    // While this word is being pronounced, it breathes.
    const speaking = playing && playing.id === pair.entry.id && playing.lang === b.lang;
    const pulse = speaking ? (reduced ? 0.6 : 0.5 + 0.5 * Math.sin(time * 9)) : 0;
    const alpha = fade * b.alpha;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x + (Math.random() - 0.5) * shake, b.y + (Math.random() - 0.5) * shake);

    // 3D: a sliced cube (cube.ts) that turns toward the cursor; the word is painted on its front.
    if (depth.amount > 0.01) {
      const span = Math.max(width, height);
      const weight = Math.round(Math.max(solid, resonance * 0.6) * 10) + (flipOf(b, time) < 0.5 ? typeface.prev.id : typeface.style.id);
      ctx.rotate(b.angle * (1 - depth.amount * 0.7));
      drawCube(ctx, b, {
        amount: depth.amount,
        yaw: (((depth.x - b.x) / span) * 1.1 + Math.sin(time * 0.3 + b.phase) * 0.25) * depth.amount,
        pitch: (((b.y - depth.y) / span) * 1.2 + Math.cos(time * 0.25 + b.phase) * 0.15) * depth.amount,
        time,
        solid,
        faceKey: [theme.dark, fontSize, Math.round(solid * 10), Math.round(resonance * 5), cracked, weight, b.w | 0].join("|"),
        paint: (c) => {
          if (cracked) fillCracked(c, b, 0, true);
          else fillFace(c, b, solid, 0, true);
          drawText(c, b, fontSize, 1, resonance, solid, unit, time);
        },
      });
      ctx.restore();
      continue;
    }
    const near = 1;

    ctx.rotate(b.angle);
    ctx.scale(near, near);
    // Typeface change: the block turns edge-on and back (a flip about its vertical axis).
    const flip = flipOf(b, time);
    if (flip < 1) ctx.scale(Math.max(0.03, Math.abs(Math.cos(flip * Math.PI))), 1);
    if (speaking) ctx.scale(1 + pulse * 0.06, 1 + pulse * 0.06);

    // Lifted paper: a gray shadow plate under the held block.
    if (b === world.held) {
      ctx.save();
      ctx.translate(5, 8);
      plate(ctx, b, unit);
      ctx.fillStyle = theme.shadow;
      ctx.fill();
      ctx.restore();
    }

    // Resonance (or speech): an echo outline, slightly larger and turned.
    const echo = Math.max(resonance * (1 - solid), pulse);
    if (echo > 0) {
      ctx.save();
      ctx.rotate(0.03 * echo);
      plate(ctx, b, unit, 3 + echo * 4);
      ctx.strokeStyle = theme.ink;
      ctx.globalAlpha = alpha * echo * 0.6;
      ctx.lineWidth = 0.75;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = alpha;
    }

    // Listen mode: a double ring around the right block (or a hint).
    if (b.flash > 0) {
      ctx.save();
      ctx.globalAlpha = alpha * Math.min(1, b.flash * 1.5);
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 2;
      plate(ctx, b, unit, 6 + (1 - b.flash) * 10);
      ctx.stroke();
      plate(ctx, b, unit, 12 + (1 - b.flash) * 16);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // The plate: white → solid black as the pair solidifies; hatched and dashed once cracked.
    plate(ctx, b, unit);
    if (cracked) fillCracked(ctx, b, time);
    else fillFace(ctx, b, solid, time);
    // On foil, a cracked block's dashed edge and crack are drawn in dark ink so they show.
    ctx.strokeStyle = theme.dark ? (cracked ? FOIL.ink : "rgba(255, 255, 255, 0.4)") : theme.ink;
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

    drawText(ctx, b, fontSize, alpha, resonance, solid, unit, time);
    ctx.restore();
  }

  // Why a false friend failed: the two meanings. Shown for 12 s after cracking, and again
  // whenever the cursor rests on either block.
  for (const pair of world.pairs) {
    const t = pair.cracked;
    const hovered = Math.max(pair.tw.hover, pair.ko.hover);
    if (t < 0 || pair.leaving || (t > 12 && hovered < 0.3)) continue;
    const e = pair.entry;
    const ff = e.falseFriend;
    const size = Math.max(12, Math.round(fontSize * 0.4));
    const small = Math.round(size * 0.85);
    const maxWidth = Math.min(460, width - 48);
    // Bold lines: what each side means. Then why they differ, in Korean and Chinese, wrapped.
    const heads = [
      "偽友 · 가짜 친구 · false friend",
      `臺 ${e.hanja} ${e.taiwanese.tailo} — ${ff?.twEnglish ?? short(e.taiwanese.definition)}`,
      `한 ${e.korean.hangul} ${e.korean.romanization} — ${short(e.korean.english, 24)}`,
    ];
    ctx.font = `400 ${small}px ${LABEL}`;
    const notes = ff ? [...wrap(ctx, ff.why.ko, maxWidth - 24), ...wrap(ctx, ff.why.zh, maxWidth - 24)] : [];
    const notesWidth = Math.max(0, ...notes.map((l) => ctx.measureText(l).width));
    ctx.font = `700 ${size}px ${LABEL}`;
    const lines = [...heads.map((text) => ({ text, bold: true })), ...notes.map((text) => ({ text, bold: false }))];
    const w = Math.min(maxWidth, Math.max(notesWidth, ...heads.map((l) => ctx.measureText(l).width)) + 24);
    const h = heads.length * size * 1.5 + notes.length * small * 1.5 + (notes.length ? 8 : 0) + 16;
    const x = Math.min(Math.max((pair.tw.x + pair.ko.x) / 2 - w / 2, 12), width - w - 12);
    const y = Math.min(Math.max(Math.min(pair.tw.y, pair.ko.y) - h - 40, 96), height - h - 12); // below the tabs
    ctx.globalAlpha = fade * Math.max(Math.min(1, t / 0.3, (12 - t) / 1.2), Math.min(1, (hovered - 0.3) * 3));
    ctx.fillStyle = theme.paper;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = theme.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    let ly = y + 10;
    lines.forEach((l, i) => {
      if (!l.bold && lines[i - 1]?.bold) ly += 8; // a little space before the explanation
      ctx.font = l.bold ? `700 ${size}px ${LABEL}` : `400 ${small}px ${LABEL}`;
      ctx.fillText(l.text, x + 12, ly);
      ly += (l.bold ? size : small) * 1.5;
    });
  }
  ctx.globalAlpha = 1;
}
