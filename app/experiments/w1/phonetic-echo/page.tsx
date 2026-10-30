"use client";

import { useEffect, useRef, useState } from "react";
import { playPair, setMuted, stop } from "./audio";
import { drawField, FONT, LATIN } from "./draw";
import { Overlay } from "./Overlay";
import { World, type Pointer } from "./physics";
import { TUNING } from "./settings";
import { Wheel } from "./wheel";
import { ENTRIES, VERIFIED, type Entry } from "./words";
import styles from "./page.module.css";

// PHONETIC ECHO — Taiwanese and Korean words that share Chinese characters, as outlined paper
// blocks floating on a white field. Drag a word to its partner: they attract, resonate, dock and
// fill black. Pull the half-hidden wheel on the left down and the field falls; click it to open
// the comparison wheel.

export default function PhoneticEcho() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const wheelRef = useRef<Wheel | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [place, setPlace] = useState({ left: 0, top: 0, wide: true });
  const [muted, setMutedState] = useState(false);
  const [started, setStarted] = useState(false);
  const [announce, setAnnounce] = useState("");

  const openWheel = (value: boolean) => {
    wheelRef.current?.setOpen(value);
    setOpen(value);
    setStarted(true);
  };

  const step = (delta: number) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    wheel.select(wheel.selected + delta);
    setSelected(wheel.selected);
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const world = new World(innerWidth, innerHeight);
    const wheel = new Wheel(ENTRIES.length);
    worldRef.current = world;
    wheelRef.current = wheel;
    let fontSize = 0;

    const measure = () => {
      world.measure(ctx, `500 ${fontSize}px ${FONT}`, `400 ${Math.round(fontSize * 0.36)}px ${LATIN}`, fontSize);
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, TUNING.maxDpr);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = Math.round(Math.min(Math.max(Math.min(innerWidth, innerHeight) * 0.042, 18), 34));
      world.resize(innerWidth, innerHeight);
      measure();
      // The annotation sits right of the open wheel, or below it on narrow screens.
      const g = wheel.geometry(innerWidth, innerHeight, 1);
      setPlace(g.wide ? { left: g.x + g.r + 56, top: Math.max(g.y - g.r, 90), wide: true } : { left: 0, top: g.y + g.r + 24, wide: false });
    };
    resize();
    world.scatter(wheel.geometry(innerWidth, innerHeight, 0).r + 40);
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", resize);

    world.onConnect = (i) => {
      playPair(VERIFIED[i]);
      setAnnounce(`${VERIFIED[i].taiwanese.written} · ${VERIFIED[i].korean.hangul}`);
    };

    // Pointer: route to the wheel or to a block.
    const pointer: Pointer = { x: -999, y: -999, vx: 0, vy: 0, inside: false };
    let target: "wheel" | "block" | null = null;
    let lastMove = performance.now();
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max((now - lastMove) / 1000, 0.008);
      if (pointer.inside) {
        pointer.vx += ((e.clientX - pointer.x) / dt - pointer.vx) * 0.3;
        pointer.vy += ((e.clientY - pointer.y) / dt - pointer.vy) * 0.3;
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.inside = true;
      lastMove = now;
      if (target === "wheel") wheel.move(e.clientX, e.clientY, innerWidth, innerHeight);
      const overWheel = wheel.hit(e.clientX, e.clientY, innerWidth, innerHeight);
      const overBlock = !wheel.isOpen && world.blockAt(e.clientX, e.clientY);
      canvas.style.cursor = target ? "grabbing" : overWheel || overBlock ? "grab" : "default";
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      setStarted(true);
      if (wheel.hit(e.clientX, e.clientY, innerWidth, innerHeight)) {
        wheel.down(e.clientX, e.clientY, innerWidth, innerHeight);
        target = "wheel";
      } else if (wheel.isOpen) {
        openWheel(false); // clicking the empty field goes back
      } else if (world.grab(e.clientX, e.clientY)) {
        target = "block";
      }
      if (target) canvas.setPointerCapture(e.pointerId);
    };
    const onUp = (e: PointerEvent) => {
      if (target === "wheel") {
        const action = wheel.up(e.clientX, e.clientY, innerWidth, innerHeight, ENTRIES);
        if (action?.type === "open") openWheel(true);
        if (action?.type === "close") openWheel(false);
        if (action?.type === "select") {
          wheel.select(action.index);
          setSelected(action.index);
        }
      }
      if (target === "block") world.release();
      target = null;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!wheel.isOpen) return;
      if (e.key === "Escape") openWheel(false);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") step(1);
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") step(-1);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey);

    let frame = 0;
    let last = performance.now();
    let shown = -1;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      pointer.vx *= Math.exp(-dt * 6);
      pointer.vy *= Math.exp(-dt * 6);
      wheel.update(dt);
      const g = wheel.geometry(innerWidth, innerHeight);
      world.pull = wheel.pull;
      world.obstacle = { x: g.x, y: g.y, r: g.r };
      world.update(dt, now / 1000, pointer, reduced);
      drawField(ctx, world, fontSize, wheel.open, reduced);
      wheel.draw(ctx, innerWidth, innerHeight, ENTRIES, `400 SIZEpx ${FONT}`);
      if (wheel.selected !== shown) {
        shown = wheel.selected;
        setSelected(shown);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      stop();
    };
  }, []);

  const toggleSound = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <main className={styles.root}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
      <Overlay
        started={started}
        open={open}
        entry={ENTRIES[selected]}
        place={place}
        muted={muted}
        announce={announce}
        pairs={VERIFIED}
        onToggleSound={toggleSound}
        onPlay={(entry: Entry) => playPair(entry)}
        onStep={step}
        onOpen={() => openWheel(true)}
        onClose={() => openWheel(false)}
        onBringTogether={(i) => {
          setStarted(true);
          worldRef.current?.bringTogether(i);
        }}
      />
    </main>
  );
}
