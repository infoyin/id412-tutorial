"use client";

import { useEffect, useRef, useState } from "react";
import { dispose, playRecording, setResonance, unlock } from "./audio";
import { draw, makeGrain, wordFont } from "./draw";
import { Field, type Pointer } from "./field";
import { Overlay } from "./Overlay";
import { TUNING } from "./settings";
import { PAIRS, type Pair } from "./words";
import styles from "./page.module.css";

// PHONETIC ECHO — Taiwanese and Korean words that share Chinese characters float in a dark field.
// Grab one and carry it to its partner; when they meet they resonate, and the
// Taiwanese recording plays while what they share is revealed.

export default function PhoneticEcho() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<Field | null>(null);
  const [revealed, setRevealed] = useState<Pair | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const grain = ctx.createPattern(makeGrain(), "repeat");
    const field = new Field(innerWidth, innerHeight);
    fieldRef.current = field;
    let fontSize = 0;

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, TUNING.maxDpr);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = Math.round(Math.min(Math.max(Math.min(innerWidth, innerHeight) * 0.085, 34), 92));
      field.resize(innerWidth, innerHeight);
      field.measure(ctx, wordFont(fontSize), fontSize);
    };
    resize();
    document.fonts?.ready.then(() => field.measure(ctx, wordFont(fontSize), fontSize));
    window.addEventListener("resize", resize);

    field.onReveal = (i) => {
      setRevealed(PAIRS[i]);
      const src = PAIRS[i].taiwanese.audio;
      if (src) playRecording(src);
    };
    field.onEnd = () => setRevealed(null);

    // Pointer: position and a smoothed velocity.
    const pointer: Pointer = { x: -999, y: -999, vx: 0, vy: 0, inside: false };
    let lastMove = performance.now();
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max((now - lastMove) / 1000, 0.008);
      pointer.vx += ((e.clientX - pointer.x) / dt - pointer.vx) * 0.3;
      pointer.vy += ((e.clientY - pointer.y) / dt - pointer.vy) * 0.3;
      if (!pointer.inside) pointer.vx = pointer.vy = 0;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      lastMove = now;
      canvas.style.cursor = field.held ? "grabbing" : field.wordAt(pointer.x, pointer.y) ? "grab" : "default";
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      unlock();
      setStarted(true);
      if (field.grab(e.clientX, e.clientY)) {
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      }
    };
    const onUp = () => {
      field.release();
      canvas.style.cursor = "default";
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      pointer.vx *= Math.exp(-dt * 6);
      pointer.vy *= Math.exp(-dt * 6);
      field.update(dt, now / 1000, pointer, reduced);
      draw(ctx, field, now / 1000, fontSize, grain, reduced);
      setResonance(field.loudest());
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      dispose();
    };
  }, []);

  // Keyboard fallback: pull a pair together.
  const pullPair = (i: number) => {
    unlock();
    setStarted(true);
    fieldRef.current?.pullTogether(i);
  };

  return (
    <main className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
      <Overlay started={started} revealed={revealed} onPullPair={pullPair} />
    </main>
  );
}
