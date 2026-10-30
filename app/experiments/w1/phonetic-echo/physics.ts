import { SETTINGS, TUNING } from "./settings";
import { VERIFIED } from "./words";

// The word field: outlined blocks with position, velocity, angle and spin.
// Forces: a soft spring to a wandering home spot, gravity from the wheel (each block feels it with
// its own small lag), air drag, partner attraction, collisions between blocks, walls and the wheel.
// Partners pass three stages: approach (closeness < resonateFrom) → resonance → docked and solidifying.

export type Block = {
  pair: number; // index into VERIFIED
  lang: "tw" | "ko";
  text: string;
  sub: string; // Tâi-lô on Taiwanese blocks
  hanja: string; // shown on Korean blocks as they resonate
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  rest: number; // resting tilt
  w: number;
  h: number;
  jitter: number[]; // 8 corner offsets (fractions) that make the plate irregular
  cut: number; // which corner is chamfered, -1 for none
  homeX: number;
  homeY: number;
  phase: number;
  lag: number; // how quickly this block feels a change in gravity
  feel: number; // gravity this block currently feels
  hover: number;
};

export type Pointer = { x: number; y: number; vx: number; vy: number; inside: boolean };
export type Circle = { x: number; y: number; r: number };

const smooth = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

export class World {
  blocks: Block[] = [];
  width: number;
  height: number;
  held: Block | null = null;
  private grabX = 0;
  private grabY = 0;
  guided: number | null = null; // keyboard: pair being brought together
  pull = 0; // -1…1, set from the wheel every frame
  gravity = 0; // live gravityStrength, px/s²
  magnetic = SETTINGS.magneticStrength; // live magneticStrength
  energy = 0; // smoothed speed of the dragged block, px/s
  closeness = VERIFIED.map(() => 0);
  solidity = VERIFIED.map(() => 0); // 0 outline … 1 solid black
  docked = VERIFIED.map(() => false);
  private side = VERIFIED.map(() => 1); // Korean block docks on this side of the Taiwanese one
  obstacle: Circle = { x: 0, y: 0, r: 0 }; // the wheel
  onConnect: (pair: number) => void = () => {};

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    VERIFIED.forEach((e, i) => {
      this.blocks.push(this.make(i, "tw", e.taiwanese.written, e.taiwanese.tailo ?? "", ""));
      this.blocks.push(this.make(i, "ko", e.korean.hangul, "", e.hanja));
    });
  }

  private make(pair: number, lang: "tw" | "ko", text: string, sub: string, hanja: string): Block {
    const r = Math.random;
    return {
      pair, lang, text, sub, hanja,
      x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0,
      rest: (r() - 0.5) * 0.16,
      w: 100, h: 60,
      jitter: Array.from({ length: 8 }, () => r() - 0.5),
      cut: r() < 0.6 ? Math.floor(r() * 4) : -1,
      homeX: 0, homeY: 0,
      phase: r() * Math.PI * 2,
      lag: 1.5 + r() * 2.5,
      feel: 0,
      hover: 0,
    };
  }

  // Block sizes from the text. Call after fonts load and on resize.
  measure(ctx: CanvasRenderingContext2D, font: string, latin: string, fontSize: number) {
    for (const b of this.blocks) {
      ctx.font = font;
      let inner = ctx.measureText(b.text).width;
      if (b.sub) {
        ctx.font = latin;
        inner = Math.max(inner, ctx.measureText(b.sub).width);
      }
      b.w = inner + fontSize * 1.4;
      b.h = fontSize * 2.4;
    }
  }

  // Spread homes over the free part of the screen, partners apart.
  scatter(left: number) {
    const reach = this.reach();
    const placed: Block[] = [];
    for (const b of this.blocks) {
      let best = { x: 0, y: 0, score: -Infinity };
      for (let k = 0; k < 60; k++) {
        const x = left + b.w / 2 + Math.random() * Math.max(this.width - left - b.w - 40, 1);
        const y = this.height * 0.18 + Math.random() * this.height * 0.64;
        let score = Math.min(9999, ...placed.map((o) => Math.hypot(o.x - x, o.y - y) - (o.w + b.w) / 3));
        const partner = placed.find((o) => o.pair === b.pair);
        if (partner && Math.hypot(partner.x - x, partner.y - y) < reach * 1.5) score -= 400;
        if (score > best.score) best = { x, y, score };
      }
      b.homeX = b.x = best.x;
      b.homeY = b.y = best.y;
      placed.push(b);
    }
  }

  reach() {
    return SETTINGS.connectionDistance * Math.min(this.width, this.height);
  }

  resize(width: number, height: number) {
    for (const b of this.blocks) {
      b.x *= width / this.width;
      b.homeX *= width / this.width;
      b.y *= height / this.height;
      b.homeY *= height / this.height;
    }
    this.width = width;
    this.height = height;
  }

  // Topmost block under a point, in the block's own rotated frame.
  blockAt(x: number, y: number) {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      const c = Math.cos(-b.angle);
      const s = Math.sin(-b.angle);
      const lx = (x - b.x) * c - (y - b.y) * s;
      const ly = (x - b.x) * s + (y - b.y) * c;
      if (Math.abs(lx) < b.w / 2 + 6 && Math.abs(ly) < b.h / 2 + 6) return b;
    }
    return null;
  }

  grab(x: number, y: number) {
    this.held = this.blockAt(x, y);
    if (this.held) {
      this.grabX = x - this.held.x;
      this.grabY = y - this.held.y;
      this.guided = null;
      // Bring it to the front.
      this.blocks.splice(this.blocks.indexOf(this.held), 1);
      this.blocks.push(this.held);
    }
    return this.held;
  }

  release() {
    this.held = null;
  }

  // Keyboard fallback: the Korean block glides to its Taiwanese partner.
  bringTogether(pair: number) {
    if (!this.docked[pair]) this.guided = pair;
  }

  private partners(pair: number) {
    const tw = this.blocks.find((b) => b.pair === pair && b.lang === "tw")!;
    const ko = this.blocks.find((b) => b.pair === pair && b.lang === "ko")!;
    return [tw, ko] as const;
  }

  // Gap between two blocks' boxes (0 when touching or overlapping).
  private gap(a: Block, b: Block) {
    const gx = Math.max(0, Math.abs(b.x - a.x) - (a.w + b.w) / 2);
    const gy = Math.max(0, Math.abs(b.y - a.y) - (a.h + b.h) / 2);
    return Math.hypot(gx, gy);
  }

  update(dt: number, time: number, pointer: Pointer, reduced: boolean) {
    const reach = this.reach();
    const speed = Math.hypot(pointer.vx, pointer.vy);
    this.energy = smooth(this.energy, this.held ? speed : 0, 4, dt);
    // Live parameters: the wheel sets gravity, a fast drag strengthens attraction.
    this.gravity = SETTINGS.gravityStrength * this.pull;
    this.magnetic = SETTINGS.magneticStrength * (1 + Math.min(this.energy / 1200, 1.5));
    const drift = SETTINGS.driftSpeed * (reduced ? 0.3 : 1);
    const anchor = 1.2 * (1 - Math.min(Math.abs(this.pull) * 1.6, 1)) ** 2; // home spring gives way to gravity

    const ax = new Map<Block, number>();
    const ay = new Map<Block, number>();
    const force = (b: Block, x: number, y: number) => {
      ax.set(b, (ax.get(b) ?? 0) + x);
      ay.set(b, (ay.get(b) ?? 0) + y);
    };

    for (const b of this.blocks) {
      b.feel = smooth(b.feel, this.gravity, b.lag, dt);
      let hover = 0;
      if (b === this.held) {
        // Spring after the pointer (slight inertia), tilt with the motion.
        force(b, (pointer.x - this.grabX - b.x) * 140 - b.vx * 18, (pointer.y - this.grabY - b.y) * 140 - b.vy * 18);
        hover = 1;
      } else {
        const hx = b.homeX + Math.sin(time * 0.05 + b.phase) * drift * 3;
        const hy = b.homeY + Math.cos(time * 0.04 + b.phase * 1.3) * drift * 2;
        force(b, (hx - b.x) * anchor - b.vx * 0.9, (hy - b.y) * anchor + b.feel - b.vy * 0.9);
        if (pointer.inside && !this.held) {
          const d = Math.hypot(pointer.x - b.x, pointer.y - b.y);
          hover = clamp01(1 - (d - Math.max(b.w, b.h) / 2) / 120);
          force(b, (pointer.x - b.x) * hover * 0.4 * this.magnetic, (pointer.y - b.y) * hover * 0.4 * this.magnetic);
        }
      }
      b.hover = smooth(b.hover, hover, 6, dt);
    }

    // Partners: approach, resonance, docking, solidity.
    VERIFIED.forEach((_, i) => {
      const [tw, ko] = this.partners(i);
      const close = clamp01(1 - this.gap(tw, ko) / reach);
      this.closeness[i] = close;
      const active = this.held === tw || this.held === ko || this.guided === i;
      const rate = SETTINGS.solidityProgress * dt;

      if (this.docked[i]) {
        // Docked: the Korean block holds its place beside the Taiwanese one, same tilt.
        const s = this.side[i];
        const tx = tw.x + s * ((tw.w + ko.w) / 2 + 6);
        const kx = (tx - ko.x) * 70 - (ko.vx - tw.vx) * 12;
        const ky = (tw.y - ko.y) * 70 - (ko.vy - tw.vy) * 12;
        force(ko, kx, ky);
        force(tw, -kx * 0.5, -ky * 0.5);
        ko.spin += (tw.angle - ko.angle) * 8 * dt;
        this.solidity[i] = Math.min(1, this.solidity[i] + rate);
        // A hard flick pulls them apart again.
        if (active && this.energy > 1800) this.docked[i] = false;
      } else {
        const d = Math.hypot(ko.x - tw.x, ko.y - tw.y) || 1;
        const pull = this.magnetic * close * close * (active ? 520 : 30);
        if (this.held !== tw) force(tw, ((ko.x - tw.x) / d) * pull, ((ko.y - tw.y) / d) * pull);
        if (this.held !== ko) force(ko, ((tw.x - ko.x) / d) * pull, ((tw.y - ko.y) / d) * pull);
        this.solidity[i] = Math.max(0, this.solidity[i] - rate * 0.5);
        // Only a hand (or the keyboard) makes the final connection; gravity alone can't.
        if (active && close >= TUNING.connectAt) {
          this.docked[i] = true;
          this.side[i] = Math.sign(ko.x - tw.x) || 1;
          if (this.guided === i) this.guided = null;
          this.onConnect(i);
        }
      }
    });

    if (this.guided !== null) {
      const [tw, ko] = this.partners(this.guided);
      force(ko, (tw.x - ko.x) * 8 - ko.vx * 4, (tw.y - ko.y) * 8 - ko.vy * 4);
    }

    // Integrate.
    for (const b of this.blocks) {
      b.vx += (ax.get(b) ?? 0) * dt;
      b.vy += (ay.get(b) ?? 0) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Tilt: springs back to rest, swings with sideways motion.
      const target = b === this.held ? Math.max(-0.35, Math.min(0.35, b.vx * 0.0006)) : b.rest;
      b.spin += ((target - b.angle) * 5 - b.spin * 2.2 + b.vx * 0.0015) * dt;
      b.angle += b.spin * dt;
    }

    this.collide();
  }

  // Soft box collisions (rotation ignored), then walls and the wheel.
  private collide() {
    const list = this.blocks;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.pair === b.pair && this.docked[a.pair]) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = (a.w + b.w) / 2 - Math.abs(dx);
        const oy = (a.h + b.h) / 2 - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;
        // Move apart along the shallower axis; a held block doesn't give way.
        const wa = a === this.held ? 0 : b === this.held ? 1 : 0.5;
        const wb = 1 - wa;
        if (ox < oy) {
          const s = Math.sign(dx) || 1;
          a.x -= s * ox * wa;
          b.x += s * ox * wb;
          const closing = (a.vx - b.vx) * s; // > 0 when moving into each other
          if (closing > 0) {
            if (wa) a.vx -= s * closing * 0.6;
            if (wb) b.vx += s * closing * 0.6;
          }
        } else {
          const s = Math.sign(dy) || 1;
          a.y -= s * oy * wa;
          b.y += s * oy * wb;
          const closing = (a.vy - b.vy) * s;
          if (closing > 0) {
            if (wa) a.vy -= s * closing * 0.6;
            if (wb) b.vy += s * closing * 0.6;
            // Landing off-centre makes the upper block swing.
            const [above, below] = a.y < b.y ? [a, b] : [b, a];
            above.spin += ((above.x - below.x) / below.w) * closing * 0.004;
          }
        }
      }
    }

    const m = 12;
    for (const b of list) {
      if (b.y + b.h / 2 > this.height - m) {
        b.y = this.height - m - b.h / 2;
        if (b.vy > 0) b.vy *= -0.25;
        b.vx *= 0.96;
      }
      if (b.y - b.h / 2 < m) {
        b.y = m + b.h / 2;
        if (b.vy < 0) b.vy *= -0.25;
        b.vx *= 0.96;
      }
      if (b.x + b.w / 2 > this.width - m) {
        b.x = this.width - m - b.w / 2;
        if (b.vx > 0) b.vx *= -0.3;
      }
      if (b.x - b.w / 2 < m) {
        b.x = m + b.w / 2;
        if (b.vx < 0) b.vx *= -0.3;
      }
      // Keep out of the wheel.
      const o = this.obstacle;
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = o.r + Math.min(b.w, b.h) / 2 + 8;
      if (d < min && b !== this.held) {
        b.x = o.x + (dx / d) * min;
        b.y = o.y + (dy / d) * min;
        const inward = (b.vx * dx + b.vy * dy) / d;
        if (inward < 0) {
          b.vx -= (dx / d) * inward * 1.3;
          b.vy -= (dy / d) * inward * 1.3;
        }
      }
    }
  }
}
