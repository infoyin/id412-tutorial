import { SETTINGS, TUNING } from "./settings";
import { PAIRS } from "./words";

// Word physics and pointer interaction. No drawing here (see draw.ts).
// Every word drifts on its own, leans toward the cursor, pushes other words away,
// and feels its partner (the same characters in the other language) more strongly the closer it is.

export type Word = {
  pair: number; // index into PAIRS
  lang: "tw" | "ko";
  text: string;
  sub: string; // Tâi-lô under Taiwanese words, "" for Korean
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  scale: number;
  phase: number; // personal offset for drift and wobble
  width: number; // measured text width at scale 1
  radius: number; // collision radius at scale 1
  hover: number; // 0–1, how close the cursor is
};

export type Pointer = { x: number; y: number; vx: number; vy: number; inside: boolean };

const smooth = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

export class Field {
  words: Word[] = [];
  width = 0;
  height = 0;
  held: Word | null = null;
  guided: number | null = null; // keyboard: pair being pulled together
  revealed: number | null = null; // only one pair at a time
  revealTime = 0;
  cooldown = PAIRS.map(() => 0);
  closeness = PAIRS.map(() => 0); // 0–1 per pair, from distance
  intensity = PAIRS.map(() => 0); // live resonanceIntensity per pair (proximity × dragging)
  energy = 0; // smoothed pointer speed, px/s
  magnetic = SETTINGS.magneticStrength; // live magneticStrength (grows with pointer speed)
  ripples: { x: number; y: number; t: number }[] = [];
  onReveal: (pair: number) => void = () => {};
  onEnd: () => void = () => {};

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    PAIRS.forEach((p, i) => {
      this.words.push(this.make(i, "tw", p.taiwanese.written, p.taiwanese.tailo));
      this.words.push(this.make(i, "ko", p.korean.hangul, ""));
    });
    this.scatter();
  }

  private make(pair: number, lang: "tw" | "ko", text: string, sub: string): Word {
    return { pair, lang, text, sub, x: 0, y: 0, vx: 0, vy: 0, angle: 0, scale: 1, phase: Math.random() * Math.PI * 2, width: 0, radius: 60, hover: 0 };
  }

  // Random spots that don't overlap much, with partners kept apart so they have to be found.
  private scatter() {
    const placed: Word[] = [];
    for (const w of this.words) {
      let best = { x: 0, y: 0, score: -Infinity };
      for (let tries = 0; tries < 40; tries++) {
        const x = this.width * (0.1 + Math.random() * 0.8);
        const y = this.height * (0.15 + Math.random() * 0.7);
        let score = Math.min(...placed.map((o) => Math.hypot(o.x - x, o.y - y)), 9999);
        const partner = placed.find((o) => o.pair === w.pair);
        if (partner && Math.hypot(partner.x - x, partner.y - y) < this.reach()) score -= 500;
        if (score > best.score) best = { x, y, score };
      }
      w.x = best.x;
      w.y = best.y;
      placed.push(w);
    }
  }

  // Where partners start to feel each other, in px.
  reach() {
    return SETTINGS.connectionDistance * Math.min(this.width, this.height);
  }

  resize(width: number, height: number) {
    for (const w of this.words) {
      w.x *= width / this.width;
      w.y *= height / this.height;
    }
    this.width = width;
    this.height = height;
  }

  // Text width per word, for collisions and drawing. Call again when fonts change.
  measure(ctx: CanvasRenderingContext2D, font: string, fontSize: number) {
    ctx.font = font;
    for (const w of this.words) {
      w.width = ctx.measureText(w.text).width;
      w.radius = Math.max(w.width, fontSize) / 2 + fontSize * 0.25;
    }
  }

  wordAt(x: number, y: number) {
    let found: Word | null = null;
    let best = 1.05;
    for (const w of this.words) {
      if (this.revealed === w.pair) continue;
      const d = Math.hypot(w.x - x, w.y - y) / (w.radius * w.scale);
      if (d < best) {
        best = d;
        found = w;
      }
    }
    return found;
  }

  grab(x: number, y: number) {
    this.held = this.wordAt(x, y);
    this.guided = null;
    return this.held;
  }

  release() {
    this.held = null;
  }

  // Keyboard fallback: the Korean word glides to its Taiwanese partner.
  // If another pair is showing, or this one just showed, it reveals as soon as that is over.
  pullTogether(pair: number) {
    this.held = null;
    this.guided = pair;
  }

  private partners(pair: number) {
    const tw = this.words.find((w) => w.pair === pair && w.lang === "tw")!;
    const ko = this.words.find((w) => w.pair === pair && w.lang === "ko")!;
    return [tw, ko] as const;
  }

  update(dt: number, time: number, pointer: Pointer, reduced: boolean) {
    const reach = this.reach();
    const speed = Math.hypot(pointer.vx, pointer.vy);
    this.energy = smooth(this.energy, speed, 4, dt);
    // Live parameter 1: a fast-moving cursor pulls harder.
    this.magnetic = SETTINGS.magneticStrength * (1 + Math.min(this.energy / 1500, 1.5));
    const drift = SETTINGS.driftSpeed * (reduced ? 0.25 : 1) * (1 + Math.min(this.energy / 3000, 1));

    const ax = new Map<Word, number>();
    const ay = new Map<Word, number>();
    const push = (w: Word, x: number, y: number) => {
      ax.set(w, (ax.get(w) ?? 0) + x);
      ay.set(w, (ay.get(w) ?? 0) + y);
    };

    for (const w of this.words) {
      // Ambient drift: each word steers toward a slowly turning direction.
      const dir = w.phase + Math.sin(time * 0.07 + w.phase * 3) * 2;
      push(w, (Math.cos(dir) * drift - w.vx) * 0.6, (Math.sin(dir) * drift - w.vy) * 0.6);

      // Cursor field: words within reach lean toward the pointer.
      let hover = 0;
      if (pointer.inside && w !== this.held) {
        const dx = pointer.x - w.x;
        const dy = pointer.y - w.y;
        const d = Math.hypot(dx, dy) || 1;
        hover = Math.max(0, 1 - d / TUNING.pointerRadius);
        push(w, (dx / d) * hover * hover * 90 * this.magnetic, (dy / d) * hover * hover * 90 * this.magnetic);
      }
      w.hover = smooth(w.hover, w === this.held ? 1 : hover, 6, dt);

      // Soft walls.
      const m = w.radius;
      if (w.x < m) push(w, (m - w.x) * 8, 0);
      if (w.x > this.width - m) push(w, (this.width - m - w.x) * 8, 0);
      if (w.y < m * 0.6) push(w, 0, (m * 0.6 - w.y) * 8);
      if (w.y > this.height - m * 0.6) push(w, 0, (this.height - m * 0.6 - w.y) * 8);
    }

    // Pairs: closeness → attraction and resonance.
    PAIRS.forEach((_, i) => {
      this.cooldown[i] = Math.max(0, this.cooldown[i] - dt);
      const [tw, ko] = this.partners(i);
      const dx = ko.x - tw.x;
      const dy = ko.y - tw.y;
      const d = Math.hypot(dx, dy) || 1;
      const close = Math.max(0, 1 - d / reach);
      this.closeness[i] = close;

      const active = this.held === tw || this.held === ko || this.guided === i;
      // Partners always feel each other a little; much more while one is being carried.
      const pull = this.magnetic * close * (active ? 260 : 25);
      if (this.held !== tw) push(tw, (dx / d) * pull, (dy / d) * pull);
      if (this.held !== ko) push(ko, (-dx / d) * pull, (-dy / d) * pull);

      // Live parameter 2: resonance = proximity, boosted while dragging.
      const dragging = active ? 1 + Math.min(this.energy / 800, 1) : 0.5;
      const target = this.revealed === i ? 1 : SETTINGS.resonanceIntensity * close * dragging;
      this.intensity[i] = smooth(this.intensity[i], target, 5, dt);

      if (this.revealed === null && active && this.cooldown[i] === 0 && close >= TUNING.matchAt) this.reveal(i, tw, ko);
    });

    // Words push each other apart. Partners being brought together may overlap.
    for (let a = 0; a < this.words.length; a++) {
      for (let b = a + 1; b < this.words.length; b++) {
        const p = this.words[a];
        const q = this.words[b];
        if (p.pair === q.pair && (this.revealed === p.pair || this.guided === p.pair || this.held === p || this.held === q)) continue;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        const overlap = p.radius * p.scale + q.radius * q.scale - d;
        if (overlap <= 0) continue;
        const f = overlap * 6;
        push(p, (-dx / d) * f, (-dy / d) * f);
        push(q, (dx / d) * f, (dy / d) * f);
        // A carried word shoves its neighbours along.
        if (this.held === p) push(q, p.vx * 2, p.vy * 2);
        if (this.held === q) push(p, q.vx * 2, q.vy * 2);
      }
    }

    // The carried word springs after the pointer; the guided word springs to its partner.
    if (this.held) push(this.held, (pointer.x - this.held.x) * 120 - this.held.vx * 16, (pointer.y - this.held.y) * 120 - this.held.vy * 16);
    if (this.guided !== null) {
      const [tw, ko] = this.partners(this.guided);
      push(ko, (tw.x - ko.x) * 6 - ko.vx * 3, (tw.y - ko.y) * 6 - ko.vy * 3);
    }

    // Revealed pair: settle side by side above the middle of the screen, then let go.
    if (this.revealed !== null) {
      this.revealTime += dt;
      const [tw, ko] = this.partners(this.revealed);
      const gap = ((tw.width * tw.scale + ko.width * ko.scale) / 2 + 70) / 2; // half the distance between centres
      const cy = this.height * 0.2;
      push(tw, (this.width / 2 - gap - tw.x) * 30 - tw.vx * 10, (cy - tw.y) * 30 - tw.vy * 10);
      push(ko, (this.width / 2 + gap - ko.x) * 30 - ko.vx * 10, (cy - ko.y) * 30 - ko.vy * 10);
      // Everyone else makes room around the text below.
      for (const w of this.words) {
        if (w === tw || w === ko) continue;
        const dx = w.x - this.width / 2;
        if (Math.abs(dx) < 360 && w.y > this.height * 0.12 && w.y < this.height * 0.9) push(w, Math.sign(dx || 1) * 220, 0);
      }
      if (this.revealTime > TUNING.revealSeconds) {
        tw.vx -= 160;
        ko.vx += 160;
        this.cooldown[this.revealed] = TUNING.cooldownSeconds;
        this.revealed = null;
        this.onEnd();
      }
    }

    // Integrate, then shape: scale and rotation follow hover and resonance.
    for (const w of this.words) {
      w.vx += (ax.get(w) ?? 0) * dt;
      w.vy += (ay.get(w) ?? 0) * dt;
      const damping = Math.exp(-dt * 1.2);
      w.vx *= damping;
      w.vy *= damping;
      w.x += w.vx * dt;
      w.y += w.vy * dt;

      const together = this.revealed === w.pair;
      const grow = w.hover * 0.18 + this.intensity[w.pair] * 0.3 + (together ? 0.15 : 0);
      w.scale = smooth(w.scale, 1 + grow * SETTINGS.typographicScale, 8, dt);
      const wobble = reduced ? 0 : Math.sin(time * 0.3 + w.phase) * 0.06;
      w.angle = smooth(w.angle, together ? 0 : wobble + w.hover * 0.06 * Math.sign(Math.sin(w.phase)), 4, dt);
    }

    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 2.5);
  }

  private reveal(i: number, tw: Word, ko: Word) {
    this.revealed = i;
    this.revealTime = 0;
    this.held = null;
    this.guided = null;
    this.ripples.push({ x: (tw.x + ko.x) / 2, y: (tw.y + ko.y) / 2, t: 0 });
    this.onReveal(i);
  }

  // Strongest resonance right now, 0–1+, for the sound.
  loudest() {
    return Math.max(...this.intensity);
  }
}
