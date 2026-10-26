"use client";

import { useEffect, useRef } from "react";
import styles from "./page.module.css";

// Kaonashi (No-Face) follows the mouse. Its eyes look at the cursor, its body leans
// into the motion, and when you move fast it fades away — stay still and it comes back.

// ---- Edit these to change how it behaves. ----
const FOLLOW = 0.04; // 0–1, how quickly the body catches up with the mouse
const LEAN = 0.6; // how far the head leans into the motion
const FADE_SPEED = 25; // px per frame of mouse speed that makes it almost invisible
const NEAR = 160; // px, cursor this close to the mask → "ah… ah…"
const MARK_COLOR = "#8a4f9e"; // purple marks above and below the eyes
// -----------------------------------------------

export default function SimpleKaonashi() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse, and the body's own (lagging) position.
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    const last = { x: mouse.x, y: mouse.y };
    let bodyX = mouse.x;
    let lean = 0;
    let speed = 0; // smoothed mouse speed
    let alpha = 1; // smoothed visibility

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove);

    let frame = 0;
    const draw = (now: number) => {
      const t = now / 1000;
      const w = innerWidth;
      const h = innerHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. Update: follow, lean, fade.
      const moved = Math.hypot(mouse.x - last.x, mouse.y - last.y);
      last.x = mouse.x;
      last.y = mouse.y;
      speed += (moved - speed) * 0.1;

      const before = bodyX;
      bodyX += (mouse.x - bodyX) * FOLLOW;
      lean += ((bodyX - before) * 8 * LEAN - lean) * 0.08;

      const targetAlpha = 1 - Math.min(speed / FADE_SPEED, 1) * 0.9;
      alpha += (targetAlpha - alpha) * 0.05;

      // 2. Background: dark with a faint lantern glow behind it.
      ctx.fillStyle = "#0b0710";
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.6);
      glow.addColorStop(0, "rgba(120, 40, 50, 0.35)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 3. Body: a tall dark shape with a wavy hem that fades out at the bottom.
      const size = Math.min(w, h) * 0.85;
      const bob = Math.sin(t * 1.2) * 6; // slow breathing
      const top = h * 0.18 + bob;
      const bottom = h + 20;
      const half = size * 0.22;
      const headX = bodyX + lean;

      ctx.globalAlpha = alpha;
      const body = ctx.createLinearGradient(0, top, 0, bottom);
      body.addColorStop(0, "rgba(8, 6, 10, 0.97)");
      body.addColorStop(0.7, "rgba(8, 6, 10, 0.85)");
      body.addColorStop(1, "rgba(8, 6, 10, 0)");
      ctx.fillStyle = body;

      ctx.beginPath();
      ctx.moveTo(bodyX - half * 1.5, bottom);
      ctx.bezierCurveTo(bodyX - half * 1.3, top + size * 0.4, headX - half, top, headX, top);
      ctx.bezierCurveTo(headX + half, top, bodyX + half * 1.3, top + size * 0.4, bodyX + half * 1.5, bottom);
      // wavy hem, right to left
      for (let i = 1; i <= 12; i++) {
        const x = bodyX + half * 1.5 - (i / 12) * half * 3;
        ctx.lineTo(x, bottom + Math.sin(t * 2 + i) * 14);
      }
      ctx.closePath();
      ctx.fill();

      // 4. Mask: a white oval that looks at the cursor.
      const maskX = headX;
      const maskY = top + size * 0.17;
      const rx = size * 0.075;
      const ry = size * 0.1;
      const angle = Math.atan2(mouse.y - maskY, mouse.x - maskX);
      const look = Math.min(Math.hypot(mouse.x - maskX, mouse.y - maskY) / 300, 1);
      const lookX = Math.cos(angle) * look * rx * 0.12;
      const lookY = Math.sin(angle) * look * ry * 0.1;

      ctx.save();
      ctx.translate(maskX, maskY);
      ctx.rotate(lean * 0.004);

      ctx.fillStyle = "#efe9dd";
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      for (const side of [-1, 1]) {
        const ex = side * rx * 0.4 + lookX;
        const ey = -ry * 0.12 + lookY;

        // purple marks: a short one above, a long one below
        ctx.fillStyle = MARK_COLOR;
        ctx.beginPath();
        ctx.moveTo(ex - rx * 0.1, ey - ry * 0.12);
        ctx.lineTo(ex + rx * 0.1, ey - ry * 0.12);
        ctx.lineTo(ex, ey - ry * 0.42);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(ex - rx * 0.12, ey + ry * 0.12);
        ctx.lineTo(ex + rx * 0.12, ey + ry * 0.12);
        ctx.lineTo(ex, ey + ry * 0.62);
        ctx.fill();

        // eye
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.ellipse(ex, ey, rx * 0.17, ry * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // mouth: a thin dark line with a grey tint below
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.18 + lookX, ry * 0.62);
      ctx.quadraticCurveTo(lookX, ry * 0.58, rx * 0.18 + lookX, ry * 0.62);
      ctx.stroke();
      ctx.restore();

      // 5. "ah… ah…" when the cursor comes close.
      const dist = Math.hypot(mouse.x - maskX, mouse.y - maskY);
      if (dist < NEAR) {
        ctx.globalAlpha = alpha * (1 - dist / NEAR);
        ctx.fillStyle = "#efe9dd";
        ctx.font = "italic 18px serif";
        ctx.textAlign = "left";
        ctx.fillText("ah… ah…", maskX + rx * 1.4, maskY - ry * 0.6 + Math.sin(t * 3) * 3);
      }
      ctx.globalAlpha = 1;

      // 6. Cursor: a small warm light.
      ctx.fillStyle = "rgba(255, 200, 120, 0.9)";
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
      ctx.fill();

      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <main className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <p className={styles.hint}>move slowly — it fades when you rush</p>
    </main>
  );
}
