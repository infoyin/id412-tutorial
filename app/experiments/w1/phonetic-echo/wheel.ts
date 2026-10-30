import type { Entry } from "./words";

// The paper wheel on the left edge. Half hidden by default.
// - Drag it down (or up): it turns, and how far it is pulled becomes gravity (or lift) on the field.
//   Let go and it springs back slowly; the pull fades with a lag, so the words drift home.
// - Click it: it slides out and grows into the comparison wheel. Outer ring = Taiwanese,
//   inner ring = Korean, one sector per entry; the sector at the pointer (3 o'clock) is selected.
//   Drag to turn, click a sector to go there, click the hub to go back.

export type WheelAction = { type: "open" } | { type: "close" } | { type: "select"; index: number } | null;

const INK = "#111";
const PAPER = "#fbfbf9";
const smooth = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
const ease = (t: number) => t * t * (3 - 2 * t);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Wheel {
  angle = 0;
  omega = 0;
  open = 0; // 0 closed … 1 comparison mode (animated)
  isOpen = false;
  pull = 0; // -1…1, smoothed; read by the physics as gravity
  selected = 0;
  private pullTarget = 0;
  private dragging = false;
  private start = { x: 0, y: 0, t: 0 };
  private last = { y: 0, a: 0, t: 0 };
  private moved = 0;
  private count: number;

  constructor(count: number) {
    this.count = count;
  }

  private get step() {
    return (Math.PI * 2) / this.count;
  }

  // Where the wheel is now: half off the left edge when closed, whole and larger when open.
  // On narrow screens the open wheel sits at the top centre instead.
  geometry(w: number, h: number, open = this.open) {
    const wide = w >= 760;
    const r0 = Math.min(Math.max(h * 0.36, 140), 320, w * 0.36); // half of it shows
    const r1 = Math.min(h * 0.4, wide ? w * 0.28 : w * 0.44, 360);
    const e = ease(open);
    const openX = wide ? r1 + 56 : w / 2;
    const openY = wide ? h / 2 : r1 + 72;
    return { x: openX * e, y: h / 2 + (openY - h / 2) * e, r: r0 + (r1 - r0) * e, wide };
  }

  hit(x: number, y: number, w: number, h: number) {
    const g = this.geometry(w, h);
    return Math.hypot(x - g.x, y - g.y) < g.r;
  }

  setOpen(open: boolean) {
    this.isOpen = open;
    this.pullTarget = 0;
    if (open) this.selected = this.nearest();
  }

  select(index: number) {
    this.selected = ((index % this.count) + this.count) % this.count;
  }

  private nearest() {
    return ((Math.round(-this.angle / this.step) % this.count) + this.count) % this.count;
  }

  down(x: number, y: number, w: number, h: number) {
    const g = this.geometry(w, h);
    const t = performance.now();
    this.dragging = true;
    this.moved = 0;
    this.start = { x, y, t };
    this.last = { y, a: Math.atan2(y - g.y, x - g.x), t };
  }

  move(x: number, y: number, w: number, h: number) {
    if (!this.dragging) return;
    const g = this.geometry(w, h);
    const t = performance.now();
    const dt = Math.max((t - this.last.t) / 1000, 0.008);
    this.moved = Math.max(this.moved, Math.hypot(x - this.start.x, y - this.start.y));
    // Closed: roll with vertical motion. Open: turn with the pointer around the centre.
    const a = Math.atan2(y - g.y, x - g.x);
    const turn = this.isOpen ? wrap(a - this.last.a) : (y - this.last.y) / g.r;
    this.angle += turn;
    this.omega = turn / dt;
    if (this.isOpen) this.selected = this.nearest();
    else this.pullTarget = Math.max(-1, Math.min(1, (y - this.start.y) / (g.r * 0.9)));
    this.last = { y, a, t };
  }

  up(x: number, y: number, w: number, h: number, entries: Entry[]): WheelAction {
    if (!this.dragging) return null;
    this.dragging = false;
    this.pullTarget = 0;
    const isClick = this.moved < 6 && performance.now() - this.start.t < 500;
    if (!isClick) {
      if (this.isOpen) this.selected = this.nearest();
      return null;
    }
    if (!this.isOpen) return { type: "open" };
    const g = this.geometry(w, h);
    if (Math.hypot(x - g.x, y - g.y) < g.r * 0.22) return { type: "close" };
    // Which sector was clicked?
    const local = Math.atan2(y - g.y, x - g.x) - this.angle;
    const index = ((Math.round(local / this.step) % entries.length) + entries.length) % entries.length;
    return { type: "select", index };
  }

  update(dt: number) {
    this.open = smooth(this.open, this.isOpen ? 1 : 0, 3.2, dt);
    // Gravity follows the pull quickly while held, and lingers after letting go.
    this.pull = smooth(this.pull, this.pullTarget, this.dragging ? 3 : 0.7, dt);
    if (this.dragging) return;
    if (this.isOpen) {
      // Turn to the selected sector (the nearest way round).
      const target = this.angle + wrap(-this.selected * this.step - this.angle);
      this.omega += ((target - this.angle) * 40 - this.omega * 11) * dt;
    } else {
      // A slow return spring, like a dial.
      this.omega += (-wrap(this.angle) * 2.2 - this.omega * 2.4) * dt;
    }
    this.angle += this.omega * dt;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, entries: Entry[], font: string) {
    const g = this.geometry(w, h);
    const { x, y, r } = g;
    const e = ease(this.open);
    ctx.save();
    ctx.translate(x, y);

    // Disk, rings, hub.
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 0.75;
    for (const k of [0.9, 0.62, 0.22]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tick marks turn with the wheel.
    for (let i = 0; i < 120; i++) {
      const a = this.angle + (i / 120) * Math.PI * 2;
      const long = i % 10 === 0;
      ctx.lineWidth = long ? 1.2 : 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
      ctx.lineTo(Math.cos(a) * r * (long ? 0.98 : 0.94), Math.sin(a) * r * (long ? 0.98 : 0.94));
      ctx.stroke();
    }

    const step = this.step;
    const size = r * 0.075;

    // Comparison mode: sector lines, the selected sector filled black.
    if (e > 0.01) {
      ctx.globalAlpha = e;
      const sel = this.selected * step + this.angle;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.9, sel - step / 2, sel + step / 2);
      ctx.arc(0, 0, r * 0.22, sel + step / 2, sel - step / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.5;
      for (let i = 0; i < entries.length; i++) {
        const a = i * step + this.angle + step / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
        ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Labels: Taiwanese (outer ring) and Korean (inner ring). Closed: verified Taiwanese only.
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    entries.forEach((entry, i) => {
      if (e < 0.5 && entry.status !== "verified") return;
      const a = i * step + this.angle;
      const flip = Math.cos(a) < 0;
      const selected = e > 0.5 && i === this.selected;
      const candidate = entry.status !== "verified";
      ctx.fillStyle = selected ? PAPER : candidate ? "#8b8b86" : INK;
      for (const [text, radius, scale] of [
        [entry.taiwanese.written, 0.76, 1],
        [e > 0.5 ? entry.korean.hangul : "", 0.42, 0.9],
      ] as const) {
        ctx.save();
        ctx.rotate(a);
        ctx.translate(r * radius, 0);
        if (flip) ctx.rotate(Math.PI);
        ctx.font = font.replace("SIZE", String(Math.round(size * scale)));
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
      // Candidates carry a hollow mark at the rim, verified pairs a filled one (not colour alone).
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, 2.5, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = selected ? PAPER : INK;
      if (candidate) ctx.stroke();
      else {
        ctx.fillStyle = selected ? PAPER : INK;
        ctx.fill();
      }
      ctx.strokeStyle = INK;
    });

    // Gravity gauge: a thick arc on the visible half that grows with the pull.
    if (e < 0.99 && Math.abs(this.pull) > 0.01) {
      ctx.globalAlpha = 1 - e;
      ctx.lineWidth = 4;
      ctx.beginPath();
      const from = -Math.PI / 2 + 0.12; // top of the wheel; down-pull grows clockwise
      ctx.arc(0, 0, r * 1.03, from, from + this.pull * Math.PI * 0.9, this.pull < 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Hub text and the pointer notch at 3 o'clock.
    ctx.fillStyle = INK;
    ctx.font = font.replace("SIZE", String(Math.round(r * 0.05)));
    if (e > 0.5) {
      ctx.fillText("×", 0, -r * 0.06);
      ctx.fillText("back · 返回 · 돌아가기", 0, r * 0.07);
    } else {
      ctx.textAlign = "left";
      ctx.fillText("↓ 重力 · 중력", r * 0.06, -r * 0.05);
      ctx.fillText("○ 對照 · 비교", r * 0.06, r * 0.07);
    }
    ctx.beginPath();
    ctx.moveTo(r + 4, 0);
    ctx.lineTo(r + 16, -7);
    ctx.lineTo(r + 16, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
