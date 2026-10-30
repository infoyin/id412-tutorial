import { SETTINGS, TUNING } from "./settings";
import { theme } from "./theme";
import type { Entry } from "./words";

// The paper wheel on the left edge, a little more than half hidden.
// - Drag it slowly: it turns, and how far it is pulled becomes gravity (down) or lift (up).
//   Let go: it keeps turning a moment, slows, and springs back; gravity fades with a lag.
// - Fling it (pointer faster than TUNING.flingSpeed when released): "fling" with a strength,
//   which scatters the field and brings new words. The wheel spins on with that momentum.
// - Click it (moves < 6 px): it moves to the centre and opens into the comparison wheel,
//   with the annotation beside it. Outer ring = Taiwanese, inner ring = Korean; the sector
//   at the ◀ is selected. Drag to turn, click a sector to go there, click the hub to go back.

export type WheelAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "select"; index: number }
  | { type: "fling"; strength: number; dir: number }
  | null;

export const NOTE_WIDTH = 400; // the annotation beside the open wheel
const GAP = 56;
const smooth = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
const ease = (t: number) => t * t * (3 - 2 * t);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Wheel {
  angle = 0;
  omega = 0; // rad/s
  open = 0; // 0 closed … 1 comparison mode (animated)
  isOpen = false;
  pull = 0; // -1…1, smoothed; read by the physics as gravity
  selected = 0;
  count = 1;
  hovered = false; // pointer over the wheel: it grows a little
  private hover = 0;
  private pullTarget = 0;
  private dragging = false;
  private start = { x: 0, y: 0, t: 0 };
  private last = { y: 0, a: 0, t: 0 };
  private samples: { x: number; y: number; t: number }[] = [];
  private moved = 0;

  private get step() {
    return (Math.PI * 2) / Math.max(this.count, 1);
  }

  setCount(n: number) {
    this.count = Math.max(n, 1);
    this.selected = Math.min(this.selected, this.count - 1);
  }

  // Closed: centre a little inside the left edge. Open: wheel + annotation centred as one group
  // (wide screens), or wheel on top and annotation below (narrow screens).
  geometry(w: number, h: number, open = this.open) {
    const r0 = Math.min(Math.max(h * 0.34, 130), 300, w * 0.34);
    const closed = { x: r0 * 0.22, y: h / 2, r: r0 * (1 + 0.05 * this.hover) };
    const rWide = Math.min(h * 0.38, 340, (w - NOTE_WIDTH - GAP - 64) / 2);
    const wide = rWide >= 170;
    let target: { x: number; y: number; r: number };
    let note: { left: number; top: number };
    if (wide) {
      const left = (w - (rWide * 2 + GAP + NOTE_WIDTH)) / 2;
      target = { x: left + rWide, y: h / 2, r: rWide };
      note = { left: left + rWide * 2 + GAP, top: h / 2 }; // the note centres itself on this line
    } else {
      const r = Math.min(h * 0.26, w * 0.42, 260);
      target = { x: w / 2, y: r + 64, r };
      note = { left: 16, top: r * 2 + 88 };
    }
    const e = ease(open);
    return {
      x: closed.x + (target.x - closed.x) * e,
      y: closed.y + (target.y - closed.y) * e,
      r: closed.r + (target.r - closed.r) * e,
      wide,
      note,
    };
  }

  hit(x: number, y: number, w: number, h: number) {
    const g = this.geometry(w, h);
    return Math.hypot(x - g.x, y - g.y) < g.r;
  }

  setOpen(open: boolean) {
    this.isOpen = open;
    this.pullTarget = 0;
    this.omega = 0;
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
    this.samples = [{ x, y, t }];
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
    this.samples.push({ x, y, t });
    while (this.samples.length > 2 && t - this.samples[0].t > 100) this.samples.shift();
  }

  // Pointer speed over the last ~100 ms, px/s, signed by vertical direction.
  private releaseSpeed() {
    const a = this.samples[0];
    const b = this.samples[this.samples.length - 1];
    const dt = Math.max((b.t - a.t) / 1000, 0.016);
    return { speed: Math.hypot(b.x - a.x, b.y - a.y) / dt, dir: Math.sign(b.y - a.y) || 1 };
  }

  up(x: number, y: number, w: number, h: number): WheelAction {
    if (!this.dragging) return null;
    this.dragging = false;
    this.pullTarget = 0;
    const isClick = this.moved < 6 && performance.now() - this.start.t < 500;
    if (isClick) {
      if (!this.isOpen) return { type: "open" };
      const g = this.geometry(w, h);
      if (Math.hypot(x - g.x, y - g.y) < g.r * 0.22) return { type: "close" };
      const local = Math.atan2(y - g.y, x - g.x) - this.angle;
      return { type: "select", index: ((Math.round(local / this.step) % this.count) + this.count) % this.count };
    }
    if (this.isOpen) {
      this.selected = this.nearest();
      return null;
    }
    const { speed, dir } = this.releaseSpeed();
    if (this.moved > 30 && speed > TUNING.flingSpeed) {
      // Momentum: the wheel spins on in the direction it was flung.
      this.omega = dir * (speed / 160) * SETTINGS.angularMomentum;
      return { type: "fling", strength: Math.min(0.3 + (speed - TUNING.flingSpeed) / TUNING.flingSpeed, 1.5), dir };
    }
    return null;
  }

  update(dt: number) {
    this.open = smooth(this.open, this.isOpen ? 1 : 0, 3.2, dt);
    this.hover = smooth(this.hover, (this.hovered || this.dragging) && !this.isOpen ? 1 : 0, 8, dt);
    // Gravity follows the pull quickly while held, and lingers after letting go.
    this.pull = smooth(this.pull, this.pullTarget, this.dragging ? 3 : 0.7, dt);
    if (this.dragging) return;
    if (this.isOpen) {
      const target = this.angle + wrap(-this.selected * this.step - this.angle);
      this.omega += ((target - this.angle) * 40 - this.omega * 11) * dt;
    } else {
      // Spin freely while fast (friction scales with angularMomentum), then a slow return spring.
      const friction = 1.2 / SETTINGS.angularMomentum;
      const spring = Math.abs(this.omega) > 2 ? 0 : 2.2;
      this.omega += (-wrap(this.angle) * spring - this.omega * (friction + spring)) * dt;
    }
    this.angle += this.omega * dt;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number, entries: Entry[], font: string) {
    const { x, y, r } = this.geometry(w, h);
    const e = ease(this.open);
    const step = this.step;
    ctx.save();
    ctx.translate(x, y);

    // Disk, rings.
    ctx.fillStyle = theme.paper;
    ctx.strokeStyle = theme.ink;
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

    // Comparison mode: sector lines, the selected sector filled black.
    if (e > 0.01 && entries.length) {
      ctx.globalAlpha = e;
      const sel = this.selected * step + this.angle;
      ctx.fillStyle = theme.ink;
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

    // Labels: Taiwanese (outer ring) and, when open, Korean (inner ring).
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const size = r * 0.075;
    entries.forEach((entry, i) => {
      const a = i * step + this.angle;
      const flip = Math.cos(a) < 0;
      const selected = e > 0.5 && i === this.selected;
      ctx.fillStyle = selected ? theme.paper : theme.ink;
      for (const [text, radius, scale] of [
        [entry.taiwanese.written, 0.76, 1],
        [e > 0.5 ? entry.korean.hangul : "", 0.42, 0.9],
      ] as const) {
        if (!text) continue;
        ctx.save();
        ctx.rotate(a);
        ctx.translate(r * radius, 0);
        if (flip) ctx.rotate(Math.PI);
        ctx.font = font.replace("SIZE", String(Math.round(size * scale * (text.length > 2 ? 0.8 : 1))));
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
      // False friends get a hollow mark, matched pairs a filled one.
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, 2.5, 0, Math.PI * 2);
      if (entry.status === "false_friend") {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else ctx.fill();
    });

    // Gravity gauge: a thick arc on the visible side that grows with the pull.
    if (e < 0.99 && Math.abs(this.pull) > 0.01) {
      ctx.globalAlpha = 1 - e;
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.ink;
      ctx.beginPath();
      const from = -Math.PI / 2 + 0.12; // top of the wheel; down-pull grows clockwise
      ctx.arc(0, 0, r * 1.03, from, from + this.pull * Math.PI * 0.9, this.pull < 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Two curved arrows along the rim, top and bottom of the visible side: "turn me".
    // They point clockwise, the way a downward drag turns the wheel.
    if (e < 0.99) {
      ctx.globalAlpha = 1 - e;
      ctx.strokeStyle = theme.ink;
      ctx.fillStyle = theme.ink;
      ctx.lineWidth = 1.5;
      const rr = r * 1.1;
      for (const [from, to] of [[-1.75, -1.12], [0.95, 1.5]]) {
        ctx.beginPath();
        ctx.arc(0, 0, rr, from, to);
        ctx.stroke();
        // Arrowhead at the end, pointing along the circle.
        const x = Math.cos(to) * rr;
        const y = Math.sin(to) * rr;
        const tx = -Math.sin(to);
        const ty = Math.cos(to);
        ctx.beginPath();
        ctx.moveTo(x + tx * 9, y + ty * 9);
        ctx.lineTo(x - ty * 5, y + tx * 5);
        ctx.lineTo(x + ty * 5, y - tx * 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Hub text and the pointer notch at 3 o'clock.
    ctx.fillStyle = theme.ink;
    ctx.font = font.replace("SIZE", String(Math.round(Math.max(r * 0.05, 10))));
    if (e > 0.5) {
      // A bold × and "Back", centred in the hub.
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = font.replace("400", "700").replace("SIZE", String(Math.round(r * 0.1)));
      ctx.fillText("×", 0, -r * 0.045);
      ctx.font = font.replace("400", "700").replace("SIZE", String(Math.round(Math.max(r * 0.05, 11))));
      ctx.fillText("Back", 0, r * 0.065);
    } else {
      ctx.textAlign = "left";
      ctx.fillText("↓ 重力 · 중력", -r * 0.1, -r * 0.34);
      ctx.fillText("⇣⇣ 換詞 · 새 단어", -r * 0.1, -r * 0.27);
      ctx.fillText("○ 對照 · 비교", -r * 0.1, r * 0.3);
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
