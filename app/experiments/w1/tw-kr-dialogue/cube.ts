import type { Block } from "./physics";
import { FOIL, mix, theme } from "./theme";

// 3D mode: a block becomes a white box cut into three horizontal slices, like a typographic
// Rubik's cube. The whole box turns toward the cursor (the camera), and each slice twists on its
// own now and then. The word is painted once onto a small canvas (the front face) and each slice
// shows its third of it. Plain Canvas 2D: corners are rotated and projected by hand, the front
// face is drawn with an affine transform (close enough at these small angles).

const SLICES = 3;
const FOCAL = 700; // px; smaller = stronger perspective
const SCALE = 2; // texture resolution

type Face = { canvas: HTMLCanvasElement; key: string };
const faces = new WeakMap<Block, Face>();

// The front face, redrawn only when what it shows changes (key).
function faceFor(b: Block, key: string, paint: (c: CanvasRenderingContext2D) => void) {
  let f = faces.get(b);
  if (!f) {
    f = { canvas: document.createElement("canvas"), key: "" };
    faces.set(b, f);
  }
  if (f.key !== key) {
    f.canvas.width = Math.ceil(b.w * SCALE);
    f.canvas.height = Math.ceil(b.h * SCALE);
    const c = f.canvas.getContext("2d")!;
    c.setTransform(SCALE, 0, 0, SCALE, (b.w * SCALE) / 2, (b.h * SCALE) / 2);
    paint(c);
    f.key = key;
  }
  return f.canvas;
}

type P = [number, number, number];

const rotate = ([x, y, z]: P, yaw: number, pitch: number): P => {
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  return [x1, y * Math.cos(pitch) - z1 * Math.sin(pitch), y * Math.sin(pitch) + z1 * Math.cos(pitch)];
};

const project = ([x, y, z]: P): [number, number] => [(x * FOCAL) / (FOCAL + z), (y * FOCAL) / (FOCAL + z)];

const avg = (ps: P[]): P => [0, 1, 2].map((k) => ps.reduce((s, p) => s + p[k], 0) / ps.length) as P;

// A face of a box is visible when its outward direction points back toward the camera at z = -FOCAL.
function facing(face: P[], boxCentre: P) {
  const f = avg(face);
  const n = [f[0] - boxCentre[0], f[1] - boxCentre[1], f[2] - boxCentre[2]];
  const v = [f[0], f[1], f[2] + FOCAL];
  return n[0] * v[0] + n[1] * v[1] + n[2] * v[2] < 0;
}

export function drawCube(
  ctx: CanvasRenderingContext2D,
  b: Block,
  o: { amount: number; yaw: number; pitch: number; time: number; solid: number; faceKey: string; paint: (c: CanvasRenderingContext2D) => void },
) {
  const tex = faceFor(b, o.faceKey, o.paint);
  const w = b.w;
  const h = b.h;
  const d = h * 0.65 * o.amount; // depth grows in as 3D turns on
  const side = theme.dark ? (o.solid > 0.5 ? "#1a1a1a" : FOIL.side) : mix(0.04 + o.solid * 0.85);
  const line = o.solid > 0.5 ? theme.paper : theme.mid;

  // Each slice: its own twist (mostly still, now and then a swing), then the whole box's turn.
  const slices = Array.from({ length: SLICES }, (_, i) => {
    const s = Math.sin(o.time * 0.55 + b.phase * 3 + i * 1.3);
    const twist = 0.5 * Math.sign(s) * Math.abs(s) ** 6 * o.amount;
    const y0 = -h / 2 + (i * h) / SLICES;
    const y1 = y0 + h / SLICES;
    const corner = (x: number, y: number, z: number) => rotate([x, y, z], o.yaw + twist, o.pitch);
    // 0..3 front (z = -d/2), 4..7 back.
    const c = [
      corner(-w / 2, y0, -d / 2), corner(w / 2, y0, -d / 2), corner(w / 2, y1, -d / 2), corner(-w / 2, y1, -d / 2),
      corner(-w / 2, y0, d / 2), corner(w / 2, y0, d / 2), corner(w / 2, y1, d / 2), corner(-w / 2, y1, d / 2),
    ];
    const centre = avg(c);
    return { i, y0, c, centre, p: c.map(project), depth: centre[2] };
  });

  // Farther slices first.
  slices.sort((a, b2) => b2.depth - a.depth);
  ctx.lineJoin = "round";
  for (const sl of slices) {
    const p = sl.p;
    const quads: [number, number, number, number][] = [
      [4, 5, 1, 0], // top
      [3, 2, 6, 7], // bottom
      [4, 0, 3, 7], // left
      [1, 5, 6, 2], // right
      [5, 4, 7, 6], // back
    ];
    for (const q of quads) {
      if (!facing(q.map((k) => sl.c[k]), sl.centre)) continue;
      const pts = q.map((k) => p[k]);
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = side;
      ctx.fill();
      ctx.strokeStyle = line;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Front face: this slice's third of the painted word.
    if (!facing([sl.c[0], sl.c[1], sl.c[2], sl.c[3]], sl.centre)) continue;
    const front = [p[0], p[1], p[2], p[3]];
    const [tl, tr, , bl] = front;
    const sw = w;
    const sh = h / SLICES;
    ctx.save();
    ctx.beginPath();
    front.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.transform((tr[0] - tl[0]) / sw, (tr[1] - tl[1]) / sw, (bl[0] - tl[0]) / sh, (bl[1] - tl[1]) / sh, tl[0], tl[1]);
    ctx.drawImage(tex, 0, (sl.y0 + h / 2) * SCALE, w * SCALE, sh * SCALE, -0.5, -0.5, sw + 1, sh + 1);
    ctx.restore();
    ctx.beginPath();
    front.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = line;
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
}
