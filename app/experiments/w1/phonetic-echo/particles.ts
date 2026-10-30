import type { Pointer, World } from "./physics";
import { theme } from "./theme";

// Background particles, kept quiet so the blocks stay in front: mostly specks, a few tiny
// letters (注音 and 한글 jamo) like type dust. They drift, lean away from the cursor, fall with
// the wheel's gravity, scatter on a fling, and a small burst rises where a pair connects.
// Drawn under everything else, at low opacity.

const LETTERS = "ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅓㅗㅜㅡㅣ";

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number; // px
  alpha: number; // its own opacity, 0.16–0.42
  letter: string; // "" = a speck
  phase: number;
  life: number; // seconds left; Infinity for the resident ones
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Particles {
  private motes: Mote[] = [];

  // Resident motes: about one per 15,000 px² (≈ 90 on a laptop screen).
  fill(width: number, height: number) {
    const n = Math.round((width * height) / 15000);
    this.motes = this.motes.filter((m) => m.life !== Infinity);
    for (let i = 0; i < n; i++) this.motes.push(this.make(rand(0, width), rand(0, height), Infinity));
  }

  private make(x: number, y: number, life: number): Mote {
    const letter = Math.random() < 0.18 ? LETTERS[Math.floor(Math.random() * LETTERS.length)] : "";
    return {
      x,
      y,
      vx: rand(-6, 6),
      vy: rand(-6, 6),
      size: letter ? rand(9, 13) : rand(1.6, 3.2),
      alpha: letter ? rand(0.16, 0.3) : rand(0.2, 0.42),
      letter,
      phase: rand(0, Math.PI * 2),
      life,
    };
  }

  // A pair connects: a few motes rise from the middle of the bridge and fade.
  burst(x: number, y: number) {
    for (let i = 0; i < 18; i++) {
      const m = this.make(x + rand(-20, 20), y + rand(-10, 10), rand(1.2, 2.4));
      const a = rand(-Math.PI, 0);
      const s = rand(40, 130);
      m.vx = Math.cos(a) * s;
      m.vy = Math.sin(a) * s;
      m.alpha *= 1.8;
      this.motes.push(m);
    }
  }

  // A fling: everything scatters away from the wheel.
  kick(fromX: number, fromY: number, strength: number) {
    for (const m of this.motes) {
      const a = Math.atan2(m.y - fromY, m.x - fromX) + rand(-0.6, 0.6);
      const s = rand(150, 420) * strength;
      m.vx += Math.cos(a) * s;
      m.vy += Math.sin(a) * s;
    }
  }

  update(dt: number, time: number, world: World, pointer: Pointer, reduced: boolean) {
    const { width, height } = world;
    const calm = reduced ? 0.2 : 1;
    for (const m of this.motes) {
      // Wander, fall with a fraction of the wheel's gravity, and slow down.
      m.vx += Math.cos(time * 0.3 + m.phase) * 4 * calm * dt;
      m.vy += (Math.sin(time * 0.25 + m.phase * 1.7) * 4 * calm + world.gravity * 0.25) * dt;
      // The cursor parts them gently.
      if (pointer.inside) {
        const dx = m.x - pointer.x;
        const dy = m.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 120 * 120) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / 120) * 260;
          m.vx += (dx / d) * push * dt;
          m.vy += (dy / d) * push * dt;
        }
      }
      const drag = Math.exp(-dt * 1.4);
      m.vx *= drag;
      m.vy *= drag;
      m.x += m.vx * dt * calm;
      m.y += m.vy * dt * calm;
      m.life -= dt;
      // Residents wrap around the edges, so the density stays even.
      if (m.life === Infinity) {
        if (m.x < -10) m.x += width + 20;
        if (m.x > width + 10) m.x -= width + 20;
        if (m.y < -10) m.y += height + 20;
        if (m.y > height + 10) m.y -= height + 20;
      }
    }
    this.motes = this.motes.filter((m) => m.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D, fade: number, font: string) {
    ctx.save();
    ctx.fillStyle = theme.dark ? "#d8d8d4" : theme.ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const m of this.motes) {
      const lifeFade = m.life === Infinity ? 1 : Math.min(1, m.life / 0.8);
      ctx.globalAlpha = m.alpha * lifeFade * fade;
      if (m.letter) {
        ctx.font = `400 ${m.size}px ${font}`;
        ctx.fillText(m.letter, m.x, m.y);
      } else {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
