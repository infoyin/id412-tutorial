import { SETTINGS, TUNING } from "./settings";
import type { Entry } from "./words";

// The word field: outlined blocks with position, velocity, angle and spin.
// By default the field is weightless: each block drifts in its own slowly turning direction,
// bounces off edges and the wheel (its drift direction reflects), and turns gently. Gravity from
// the wheel (each block feels it with its own lag), drag (settlingDamping), partner attraction,
// box collisions.
// A fling gives every block an impulse; the old set flies out and fades while a new set
// flies in from the edges and settles.
// Partners pass three stages: approach → resonance → docked and filling black.
// False friends (same characters, different meanings) go through approach and resonance too,
// then crack apart instead of docking, and no longer attract each other.

export type Block = {
  pair: Pair;
  lang: "tw" | "ko";
  text: string;
  sub: string; // Tâi-lô on Taiwanese blocks, romanization on Korean ones
  zhuyin: string[] | null; // Mandarin 注音 beside each character (Taiwanese blocks)
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
  cut: number; // chamfered corner, -1 for none
  homeX: number;
  homeY: number;
  phase: number;
  drift: number; // direction it floats in when weightless (radians)
  lag: number; // how quickly this block feels a change in gravity
  feel: number; // gravity this block currently feels
  hover: number;
  age: number; // seconds since it entered or started leaving
  entering: boolean; // still flying in from off screen
  alpha: number;
};

export type Pair = {
  entry: Entry;
  tw: Block;
  ko: Block;
  closeness: number; // 0–1 from the gap between the two blocks
  solidity: number; // 0 outline … 1 solid black
  docked: boolean;
  side: number; // Korean block docks on this side of the Taiwanese one
  leaving: boolean;
  falseFriend: boolean;
  cracked: number; // seconds since a false friend cracked apart; -1 = not (yet)
};

export type Pointer = { x: number; y: number; vx: number; vy: number; inside: boolean };
export type Circle = { x: number; y: number; r: number };

const smooth = (current: number, target: number, rate: number, dt: number) => current + (target - current) * (1 - Math.exp(-rate * dt));
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

export class World {
  blocks: Block[] = [];
  pairs: Pair[] = [];
  width: number;
  height: number;
  held: Block | null = null;
  private grabX = 0;
  private grabY = 0;
  guided: Pair | null = null; // keyboard: pair being brought together
  pull = 0; // -1…1, set from the wheel every frame
  gravity = 0; // live gravityStrength
  magnetic = SETTINGS.magneticStrength; // live magneticStrength
  damping = SETTINGS.settlingDamping; // live settlingDamping
  energy = 0; // smoothed speed of the dragged block, px/s
  left = 0; // keep new homes right of this (the wheel)
  obstacle: Circle = { x: 0, y: 0, r: 0 };
  keepOut = { w: 0, h: 0 }; // the menu row in the top-left corner
  keepOutCorner = { w: 0, h: 0 }; // the size bar in the bottom-right corner
  private pending: { at: number; entries: Entry[] } | null = null;
  private time = 0;
  measure: (b: Block) => void = () => {};
  onConnect: (pair: Pair) => void = () => {};
  onCrack: (pair: Pair) => void = () => {};
  onChange: (entries: Entry[]) => void = () => {};

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  // Pairs on screen (not leaving).
  current() {
    return this.pairs.filter((p) => !p.leaving);
  }

  private make(pair: Pair, lang: "tw" | "ko"): Block {
    const r = Math.random;
    const e = pair.entry;
    return {
      pair,
      lang,
      text: lang === "tw" ? e.taiwanese.written : e.korean.hangul,
      sub: lang === "tw" ? e.taiwanese.tailo : e.korean.romanization,
      zhuyin: lang === "tw" ? e.taiwanese.zhuyin : null,
      x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0,
      rest: (r() - 0.5) * 0.16,
      w: 100, h: 60,
      jitter: Array.from({ length: 8 }, () => r() - 0.5),
      cut: r() < 0.6 ? Math.floor(r() * 4) : -1,
      homeX: 0, homeY: 0,
      phase: r() * Math.PI * 2,
      drift: r() * Math.PI * 2,
      lag: 1.5 + r() * 2.5,
      feel: 0, hover: 0, age: 0,
      entering: false,
      alpha: 1,
    };
  }

  // Put a new set of pairs in. "home": appear in place. "edges": fly in from off screen.
  spawn(entries: Entry[], from: "home" | "edges") {
    const fresh: Block[] = [];
    for (const entry of entries) {
      const falseFriend = entry.status === "false_friend";
      const pair = { entry, closeness: 0, solidity: 0, docked: false, side: 1, leaving: false, falseFriend, cracked: -1 } as Pair;
      pair.tw = this.make(pair, "tw");
      pair.ko = this.make(pair, "ko");
      this.pairs.push(pair);
      fresh.push(pair.tw, pair.ko);
    }
    fresh.forEach((b) => this.measure(b));
    this.scatter(fresh);
    for (const b of fresh) {
      b.x = b.homeX;
      b.y = b.homeY;
      if (from === "edges") {
        // Start beyond the nearest edge, moving toward home.
        const toLeft = b.homeX, toRight = this.width - b.homeX, toTop = b.homeY, toBottom = this.height - b.homeY;
        const nearest = Math.min(toRight, toTop, toBottom, toLeft + 200);
        if (nearest === toRight) b.x = this.width + b.w;
        else if (nearest === toTop) b.y = -b.h;
        else if (nearest === toBottom) b.y = this.height + b.h;
        else b.x = -b.w;
        b.vx = (b.homeX - b.x) * (2 + Math.random());
        b.vy = (b.homeY - b.y) * (2 + Math.random());
        b.spin = (Math.random() - 0.5) * 6 * SETTINGS.angularMomentum;
        b.entering = true;
      }
      this.blocks.push(b);
    }
    this.onChange(this.current().map((p) => p.entry));
  }

  // Spread homes over the free part of the screen, partners apart, away from other homes.
  private scatter(fresh: Block[]) {
    const reach = this.reach();
    const placed = this.blocks.filter((b) => !b.pair.leaving);
    for (const b of fresh) {
      let best = { x: 0, y: 0, score: -Infinity };
      for (let k = 0; k < 60; k++) {
        const x = this.left + b.w / 2 + Math.random() * Math.max(this.width - this.left - b.w - 48, 1);
        const y = this.height * 0.16 + Math.random() * this.height * 0.66;
        let score = Math.min(9999, ...placed.map((o) => Math.hypot(o.homeX - x, o.homeY - y) - (o.w + b.w) / 3));
        const partner = placed.find((o) => o.pair === b.pair);
        if (partner && Math.hypot(partner.homeX - x, partner.homeY - y) < reach * 1.5) score -= 400;
        if (score > best.score) best = { x, y, score };
      }
      b.homeX = best.x;
      b.homeY = best.y;
      placed.push(b);
    }
  }

  reach() {
    return TUNING.connectionDistance * Math.min(this.width, this.height);
  }

  resize(width: number, height: number) {
    for (const b of this.blocks) {
      b.x *= width / this.width;
      b.homeX *= width / this.width;
      b.y *= height / this.height;
      b.homeY *= height / this.height;
      this.measure(b);
    }
    this.width = width;
    this.height = height;
  }

  // Shake the field: every block gets an impulse away from the wheel, plus spin.
  // strength ~0.3 (just over the threshold) … 1.5; dir = +1 flung down, -1 up.
  // Then a new set of words flies in, partway through the transition.
  fling(strength: number, dir: number, next: Entry[]) {
    this.held = null;
    this.guided = null;
    this.damping = 0.08; // nearly frictionless at first; eases back to settlingDamping
    for (const pair of this.pairs) {
      if (pair.leaving) continue;
      pair.leaving = true;
      pair.docked = false;
      for (const b of [pair.tw, pair.ko]) {
        const away = Math.atan2(b.y - this.obstacle.y, b.x - this.obstacle.x);
        const angle = away + (Math.random() - 0.5) * 1.6;
        const speed = SETTINGS.flingImpulse * strength * (0.6 + Math.random() * 0.8);
        b.vx += Math.cos(angle) * speed;
        b.vy += Math.sin(angle) * speed + dir * speed * 0.35;
        b.spin += (Math.random() - 0.5) * 2 * 9 * SETTINGS.angularMomentum * strength;
        b.age = 0;
      }
    }
    this.pending = { at: this.time + TUNING.transitionSeconds * 0.3, entries: next };
    this.onChange([]);
  }

  // Throw the two blocks of a false friend apart, spinning.
  private crack(pair: Pair) {
    const { tw, ko } = pair;
    pair.cracked = 0;
    if (this.held === tw || this.held === ko) this.held = null;
    if (this.guided === pair) this.guided = null;
    const d = Math.hypot(ko.x - tw.x, ko.y - tw.y) || 1;
    const nx = (ko.x - tw.x) / d;
    const ny = (ko.y - tw.y) / d;
    tw.vx -= nx * 700;
    tw.vy -= ny * 700;
    ko.vx += nx * 700;
    ko.vy += ny * 700;
    tw.spin -= 4 * SETTINGS.angularMomentum;
    ko.spin += 4 * SETTINGS.angularMomentum;
    this.onCrack(pair);
  }

  // Keep at most n pairs: the extra ones (never one being held) drift off and fade.
  trim(n: number) {
    const over = this.current().length - n;
    if (over <= 0) return;
    const extra = this.current().filter((p) => p.tw !== this.held && p.ko !== this.held).slice(-over);
    for (const pair of extra) {
      pair.leaving = true;
      pair.docked = false;
      for (const b of [pair.tw, pair.ko]) {
        b.age = 0;
        b.vx += (Math.random() - 0.5) * 300;
        b.vy += (Math.random() - 0.5) * 300;
      }
    }
    this.onChange(this.current().map((p) => p.entry));
  }

  // Topmost block under a point, in the block's own rotated frame.
  blockAt(x: number, y: number) {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const b = this.blocks[i];
      if (b.pair.leaving) continue;
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
      this.blocks.splice(this.blocks.indexOf(this.held), 1);
      this.blocks.push(this.held); // to the front
    }
    return this.held;
  }

  release() {
    this.held = null;
  }

  // How close the pair being brought together (dragged or guided) is, 0…1. Drives the hum.
  activeCloseness() {
    let best = 0;
    for (const p of this.pairs) {
      const active = this.held === p.tw || this.held === p.ko || this.guided === p;
      if (active && !p.docked && p.cracked < 0 && !p.leaving) best = Math.max(best, p.closeness);
    }
    return best;
  }

  // Keyboard fallback: the Korean block glides to its Taiwanese partner.
  bringTogether(pair: Pair) {
    if (!pair.docked && !pair.leaving) this.guided = pair;
  }

  // Gap between two blocks' boxes (0 when touching or overlapping).
  private gap(a: Block, b: Block) {
    const gx = Math.max(0, Math.abs(b.x - a.x) - (a.w + b.w) / 2);
    const gy = Math.max(0, Math.abs(b.y - a.y) - (a.h + b.h) / 2);
    return Math.hypot(gx, gy);
  }

  update(dt: number, pointer: Pointer, reduced: boolean) {
    this.time += dt;
    if (this.pending && this.time >= this.pending.at) {
      this.spawn(this.pending.entries, "edges");
      this.pending = null;
    }

    const reach = this.reach();
    const speed = Math.hypot(pointer.vx, pointer.vy);
    this.energy = smooth(this.energy, this.held ? speed : 0, 4, dt);
    // Live parameters.
    this.gravity = SETTINGS.gravityStrength * this.pull * Math.abs(this.pull); // pull² keeps small drags subtle
    this.magnetic = SETTINGS.magneticStrength * (1 + Math.min(this.energy / 1200, 1.5));
    this.damping = smooth(this.damping, SETTINGS.settlingDamping, 1.6 / TUNING.transitionSeconds, dt);
    const drift = TUNING.driftSpeed * (reduced ? 0.3 : 1);

    const ax = new Map<Block, number>();
    const ay = new Map<Block, number>();
    const force = (b: Block, x: number, y: number) => {
      ax.set(b, (ax.get(b) ?? 0) + x);
      ay.set(b, (ay.get(b) ?? 0) + y);
    };

    for (const b of this.blocks) {
      b.age += dt;
      b.feel = smooth(b.feel, this.gravity, b.lag, dt);
      let hover = 0;
      if (b.pair.leaving) {
        force(b, -b.vx * this.damping * 0.5, b.feel - b.vy * this.damping * 0.5);
        // Fade out over the second half of the transition.
        b.alpha = clamp01(1 - (b.age - TUNING.transitionSeconds * 0.4) / (TUNING.transitionSeconds * 0.6));
      } else if (b === this.held) {
        force(b, (pointer.x - this.grabX - b.x) * 140 - b.vx * 18, (pointer.y - this.grabY - b.y) * 140 - b.vy * 18);
        hover = 1;
      } else if (b.entering) {
        // Flying in: guided to its spot until it is on screen.
        force(b, (b.homeX - b.x) * 3 - b.vx * this.damping, (b.homeY - b.y) * 3 + b.feel - b.vy * this.damping);
        if (b.age > 0.3 && this.inside(b)) b.entering = false;
      } else {
        // Weightless: steer toward its own drift velocity; the direction slowly turns.
        b.drift += Math.sin(this.time * 0.13 + b.phase) * 0.15 * dt;
        force(b, (Math.cos(b.drift) * drift - b.vx) * this.damping, (Math.sin(b.drift) * drift - b.vy) * this.damping + b.feel);
        if (pointer.inside && !this.held) {
          const d = Math.hypot(pointer.x - b.x, pointer.y - b.y);
          hover = clamp01(1 - (d - Math.max(b.w, b.h) / 2) / 120);
          force(b, (pointer.x - b.x) * hover * 0.4 * this.magnetic, (pointer.y - b.y) * hover * 0.4 * this.magnetic);
        }
      }
      b.hover = smooth(b.hover, hover, 6, dt);
    }

    // Partners: approach, resonance, docking, solidity.
    for (const pair of this.pairs) {
      const { tw, ko } = pair;
      const rate = TUNING.solidityRate * dt;
      if (pair.leaving) {
        pair.solidity = Math.max(0, pair.solidity - rate);
        continue;
      }
      const close = clamp01(1 - this.gap(tw, ko) / reach);
      pair.closeness = close;
      const active = this.held === tw || this.held === ko || this.guided === pair;

      if (pair.cracked >= 0) {
        // Cracked false friends keep a little distance from each other.
        pair.cracked += dt;
        const d = Math.hypot(ko.x - tw.x, ko.y - tw.y) || 1;
        const push = close * 220;
        force(tw, ((tw.x - ko.x) / d) * push, ((tw.y - ko.y) / d) * push);
        force(ko, ((ko.x - tw.x) / d) * push, ((ko.y - tw.y) / d) * push);
      } else if (pair.docked) {
        // Docked: the Korean block holds its place beside the Taiwanese one, same tilt.
        const tx = tw.x + pair.side * ((tw.w + ko.w) / 2 + 6);
        const kx = (tx - ko.x) * 70 - (ko.vx - tw.vx) * 12;
        const ky = (tw.y - ko.y) * 70 - (ko.vy - tw.vy) * 12;
        force(ko, kx, ky);
        force(tw, -kx * 0.5, -ky * 0.5);
        ko.spin += (tw.angle - ko.angle) * 8 * dt;
        pair.solidity = Math.min(1, pair.solidity + rate);
        if (active && this.energy > 1800) pair.docked = false; // a hard flick pulls them apart
      } else {
        const d = Math.hypot(ko.x - tw.x, ko.y - tw.y) || 1;
        // Partners only pull while a hand (or the keyboard) is bringing them together.
        const pull = active ? this.magnetic * close * close * 520 : 0;
        if (this.held !== tw) force(tw, ((ko.x - tw.x) / d) * pull, ((ko.y - tw.y) / d) * pull);
        if (this.held !== ko) force(ko, ((tw.x - ko.x) / d) * pull, ((tw.y - ko.y) / d) * pull);
        pair.solidity = Math.max(0, pair.solidity - rate * 0.5);
        // False friends: at the moment of connecting, they crack apart.
        if (pair.falseFriend && active && close >= TUNING.connectAt) {
          this.crack(pair);
          continue;
        }
        // Only a hand (or the keyboard) makes the final connection; gravity alone can't.
        if (active && close >= TUNING.connectAt) {
          pair.docked = true;
          pair.side = Math.sign(ko.x - tw.x) || 1;
          if (this.guided === pair) this.guided = null;
          this.onConnect(pair);
        }
      }
    }

    if (this.guided) {
      const { tw, ko } = this.guided;
      force(ko, (tw.x - ko.x) * 8 - ko.vx * 4, (tw.y - ko.y) * 8 - ko.vy * 4);
    }

    // Integrate. Spin settles with the same damping as motion.
    for (const b of this.blocks) {
      b.vx += (ax.get(b) ?? 0) * dt;
      b.vy += (ay.get(b) ?? 0) * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      // Held: tilt with the motion. Floating: sway slowly around its resting tilt.
      const target = b === this.held ? Math.max(-0.35, Math.min(0.35, b.vx * 0.0006)) : b.rest + Math.sin(this.time * 0.12 + b.phase) * 0.45;
      const spring = b.pair.leaving ? 0 : 5;
      b.spin += ((target - b.angle) * spring - b.spin * (0.4 + this.damping * 2) + b.vx * 0.0015) * dt;
      b.angle += b.spin * dt;
    }

    this.collide();

    // Drop blocks that have left or faded out.
    const gone = (b: Block) => b.pair.leaving && (b.alpha <= 0 || !this.near(b));
    this.pairs = this.pairs.filter((p) => !(gone(p.tw) && gone(p.ko)));
    this.blocks = this.blocks.filter((b) => this.pairs.includes(b.pair));
  }

  private inside(b: Block) {
    return b.x - b.w / 2 > 0 && b.x + b.w / 2 < this.width && b.y - b.h / 2 > 0 && b.y + b.h / 2 < this.height;
  }

  private near(b: Block) {
    const m = 300;
    return b.x > -m && b.x < this.width + m && b.y > -m && b.y < this.height + m;
  }

  // Soft box collisions (rotation ignored), then walls and the wheel.
  private collide() {
    const list = this.blocks;
    // Leaving blocks only collide early on, so they can scatter out freely.
    const solid = (b: Block) => !b.pair.leaving || b.age < 0.5;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!solid(a)) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!solid(b) || (a.pair === b.pair && a.pair.docked)) continue;
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
          const closing = (a.vx - b.vx) * s;
          if (closing > 0) {
            if (wa) a.vx -= s * closing * 0.6;
            if (wb) b.vx += s * closing * 0.6;
            a.spin -= closing * 0.002 * s;
            b.spin += closing * 0.002 * s;
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
    const bounce = 0.45;
    for (const b of list) {
      // New blocks pass through the edges while flying in; old ones bounce once, then may leave.
      const walls = !b.entering && (!b.pair.leaving || b.age < 0.6);
      if (walls) {
        // Bounce, and turn the drift direction away from the wall (like light off a mirror).
        if (b.y + b.h / 2 > this.height - m) {
          b.y = this.height - m - b.h / 2;
          if (b.vy > 0) b.vy *= -bounce;
          b.vx *= 0.96;
          if (Math.sin(b.drift) > 0) b.drift = -b.drift;
        }
        if (b.y - b.h / 2 < m) {
          b.y = m + b.h / 2;
          if (b.vy < 0) b.vy *= -bounce;
          b.vx *= 0.96;
          if (Math.sin(b.drift) < 0) b.drift = -b.drift;
        }
        if (b.x + b.w / 2 > this.width - m) {
          b.x = this.width - m - b.w / 2;
          if (b.vx > 0) b.vx *= -bounce;
          if (Math.cos(b.drift) > 0) b.drift = Math.PI - b.drift;
        }
        if (b.x - b.w / 2 < m) {
          b.x = m + b.w / 2;
          if (b.vx < 0) b.vx *= -bounce;
          if (Math.cos(b.drift) < 0) b.drift = Math.PI - b.drift;
        }
      }
      // Keep out of the menu row at the top left: push out along the shallower side.
      const free = b !== this.held && !b.entering && !b.pair.leaving;
      const ox = this.keepOut.w + b.w / 2 + 8 - b.x;
      const oy = this.keepOut.h + b.h / 2 + 8 - b.y;
      if (free && ox > 0 && oy > 0) {
        if (ox < oy) {
          b.x += ox;
          if (b.vx < 0) b.vx *= -bounce;
          if (Math.cos(b.drift) < 0) b.drift = Math.PI - b.drift;
        } else {
          b.y += oy;
          if (b.vy < 0) b.vy *= -bounce;
          if (Math.sin(b.drift) < 0) b.drift = -b.drift;
        }
      }
      // Same for the size bar at the bottom right.
      const cx = b.x + b.w / 2 + 8 - (this.width - this.keepOutCorner.w);
      const cy = b.y + b.h / 2 + 8 - (this.height - this.keepOutCorner.h);
      if (free && cx > 0 && cy > 0) {
        if (cx < cy) {
          b.x -= cx;
          if (b.vx > 0) b.vx *= -bounce;
          if (Math.cos(b.drift) > 0) b.drift = Math.PI - b.drift;
        } else {
          b.y -= cy;
          if (b.vy > 0) b.vy *= -bounce;
          if (Math.sin(b.drift) > 0) b.drift = -b.drift;
        }
      }
      // Keep out of the wheel.
      const o = this.obstacle;
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const d = Math.hypot(dx, dy) || 1;
      const min = o.r + Math.min(b.w, b.h) / 2 + 8;
      if (d < min && b !== this.held && !b.pair.leaving) {
        b.x = o.x + (dx / d) * min;
        b.y = o.y + (dy / d) * min;
        b.drift = Math.atan2(dy, dx) + (Math.random() - 0.5); // float away from the wheel
        const inward = (b.vx * dx + b.vy * dy) / d;
        if (inward < 0) {
          b.vx -= (dx / d) * inward * 1.3;
          b.vy -= (dy / d) * inward * 1.3;
        }
      }
    }
  }
}
