"use client";

import { useEffect, useRef, useState } from "react";
import {
  closeEffects,
  crackSound,
  getPlaying,
  koreanVoiceStatus,
  onPlaying,
  playOne,
  playPair,
  portal,
  setHum,
  setMuted,
  stop,
  unlockEffects,
  type Lang,
  type Playing,
} from "./audio";
import { drawField, FONT, LATIN } from "./draw";
import { Menu } from "./Menu";
import { Overlay } from "./Overlay";
import { World, type Pointer } from "./physics";
import { pairCount, TUNING } from "./settings";
import { setDark } from "./theme";
import { Wheel } from "./wheel";
import { Rotation, type Entry } from "./words";
import styles from "./page.module.css";

// PHONETIC ECHO — Taiwanese and Korean words that share Chinese characters, as outlined paper
// blocks on a white field. Drag a word to its partner: they attract, resonate, dock, fill black
// and are pronounced. The half-hidden wheel on the left: drag = gravity, fling = scatter the
// field and bring new words, click = the comparison wheel, where each word can be replayed.

export default function PhoneticEcho() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const wheelRef = useRef<Wheel | null>(null);
  const shownRef = useRef<Entry[]>([]);
  const flingRef = useRef<(strength: number, dir: number) => void>(() => {});
  const [shown, setShown] = useState<Entry[]>([]);
  const [selectedId, setSelectedState] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null); // the same, readable from the event handlers
  const setSelectedId = (id: string | null) => {
    selectedRef.current = id;
    setSelectedState(id);
  };
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ left: 0, top: 0, wide: true });
  const [muted, setMutedState] = useState(false);
  const [dark, setDarkState] = useState(false);
  const [started, setStarted] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [playing, setPlayingState] = useState<Playing>(null);
  const [koreanVoice, setKoreanVoice] = useState<boolean | null>(null);

  const openWheel = (value: boolean) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    if (value) {
      // Keep the pair last connected or chosen, if it is still on screen.
      const i = shownRef.current.findIndex((e) => e.id === selectedRef.current);
      wheel.select(Math.max(i, 0));
      setSelectedId(shownRef.current[Math.max(i, 0)]?.id ?? null);
    }
    wheel.setOpen(value);
    setOpen(value);
    setStarted(true);
  };

  const step = (delta: number) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    wheel.select(wheel.selected + delta);
    setSelectedId(shownRef.current[wheel.selected]?.id ?? null);
  };

  // Light / dark, remembered per browser (a convenience; it may not be available).
  const applyDark = (value: boolean) => {
    setDark(value);
    setDarkState(value);
    try {
      localStorage.setItem("phonetic-echo-dark", value ? "1" : "0");
    } catch {}
  };
  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem("phonetic-echo-dark") === "1";
    } catch {}
    if (saved) applyDark(true);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const world = new World(innerWidth, innerHeight);
    const wheel = new Wheel();
    const rotation = new Rotation();
    worldRef.current = world;
    wheelRef.current = wheel;
    let fontSize = 24;
    let lastFling = -Infinity;

    // Block size from its text.
    world.measure = (b) => {
      ctx.font = `500 ${fontSize}px ${FONT}`;
      let inner = ctx.measureText(b.text).width;
      if (b.sub) {
        ctx.font = `400 ${Math.round(fontSize * 0.36)}px ${LATIN}`;
        inner = Math.max(inner, ctx.measureText(b.sub).width);
      }
      b.w = inner + fontSize * 1.4;
      b.h = fontSize * 2.4;
    };
    world.onChange = (entries) => {
      shownRef.current = entries;
      wheel.setCount(entries.length);
      setShown(entries);
    };
    // A pair connects: the portal sound, then the two pronunciations.
    world.onConnect = (pair) => {
      portal();
      setTimeout(() => playPair(pair.entry), 700);
      setSelectedId(pair.entry.id);
      setAnnounce(`${pair.entry.taiwanese.written} · ${pair.entry.korean.hangul}`);
    };
    // A false friend cracks: hear both (they sound alike), and say what happened.
    world.onCrack = (pair) => {
      crackSound();
      setTimeout(() => playPair(pair.entry), 450);
      setAnnounce(`偽友 · 가짜 친구 · false friend: ${pair.entry.taiwanese.written} ≠ ${pair.entry.korean.hangul}`);
    };
    onPlaying(setPlayingState);
    const checkVoice = () => setKoreanVoice(koreanVoiceStatus());
    checkVoice();
    if ("speechSynthesis" in window) speechSynthesis.addEventListener("voiceschanged", checkVoice);

    // A fling scatters the field and brings the next words (with a cooldown).
    flingRef.current = (strength, dir) => {
      const now = performance.now() / 1000;
      if (now - lastFling < TUNING.flingCooldown) return;
      lastFling = now;
      world.fling(strength, dir, rotation.next(pairCount(innerWidth, innerHeight)));
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, TUNING.maxDpr);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = Math.round(Math.min(Math.max(Math.min(innerWidth, innerHeight) * 0.052, 20), 40));
      world.resize(innerWidth, innerHeight);
      // Floating words stay out of the menu row (title, INFO, INDEX).
      const menu = document.querySelector("[data-menu]")?.getBoundingClientRect();
      world.keepOut = { w: menu?.right ?? 0, h: menu?.bottom ?? 0 };
      const closed = wheel.geometry(innerWidth, innerHeight, 0);
      world.left = closed.x + closed.r + 32;
      const g = wheel.geometry(innerWidth, innerHeight, 1);
      setPlace({ ...g.note, wide: g.wide });
    };
    resize();
    world.spawn(rotation.next(pairCount(innerWidth, innerHeight)), "home");
    document.fonts?.ready.then(() => world.blocks.forEach((b) => world.measure(b)));
    window.addEventListener("resize", resize);

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
      wheel.hovered = wheel.hit(e.clientX, e.clientY, innerWidth, innerHeight);
      const over = wheel.hovered || (!wheel.isOpen && world.blockAt(e.clientX, e.clientY));
      canvas.style.cursor = target ? "grabbing" : over ? "grab" : "default";
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      setStarted(true);
      unlockEffects(); // sound effects may start only after a gesture
      if (wheel.hit(e.clientX, e.clientY, innerWidth, innerHeight)) {
        wheel.down(e.clientX, e.clientY, innerWidth, innerHeight);
        target = "wheel";
      } else if (wheel.isOpen) {
        openWheel(false); // clicking the empty field goes back
      } else if (world.grab(e.clientX, e.clientY)) {
        target = "block";
      }
      if (target) canvas.setPointerCapture(e.pointerId); // keep dragging even off the wheel
    };
    const onUp = (e: PointerEvent) => {
      if (target === "wheel") {
        const action = wheel.up(e.clientX, e.clientY, innerWidth, innerHeight);
        if (action?.type === "open") openWheel(true);
        if (action?.type === "close") openWheel(false);
        if (action?.type === "select") {
          wheel.select(action.index);
          setSelectedId(shownRef.current[action.index]?.id ?? null);
        }
        if (action?.type === "fling") flingRef.current(action.strength, action.dir);
      }
      if (target === "block") world.release();
      target = null;
    };
    const onLeave = () => {
      pointer.inside = false;
      wheel.hovered = false;
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
    let shownSelected = -1;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      pointer.vx *= Math.exp(-dt * 6);
      pointer.vy *= Math.exp(-dt * 6);
      wheel.update(dt);
      const g = wheel.geometry(innerWidth, innerHeight);
      world.pull = wheel.isOpen ? 0 : wheel.pull;
      world.obstacle = { x: g.x, y: g.y, r: g.r };
      world.update(dt, pointer, reduced);
      setHum(world.activeCloseness() ** 1.5);
      drawField(ctx, world, fontSize, wheel.open, getPlaying(), now / 1000, reduced);
      wheel.draw(ctx, innerWidth, innerHeight, shownRef.current, `400 SIZEpx ${FONT}`);
      // Turning the open wheel changes the annotation (state only changes when the sector does).
      if (wheel.isOpen && wheel.selected !== shownSelected) {
        shownSelected = wheel.selected;
        setSelectedId(shownRef.current[shownSelected]?.id ?? null);
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
      if ("speechSynthesis" in window) speechSynthesis.removeEventListener("voiceschanged", checkVoice);
      onPlaying(() => {});
      stop();
      closeEffects();
    };
    // openWheel and step only use refs and state setters, so setting up once is safe.
  }, []);

  const toggleSound = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  const entry = shown.find((e) => e.id === selectedId) ?? shown[0] ?? null;

  return (
    <main className={`${styles.root} ${dark ? styles.dark : ""}`}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
      <Menu playing={playing} muted={muted} onPlay={(e: Entry, lang: Lang) => playOne(e, lang)} />
      <Overlay
        started={started}
        open={open}
        entry={entry}
        place={place}
        muted={muted}
        dark={dark}
        playing={playing}
        koreanVoice={koreanVoice}
        announce={announce}
        pairs={shown}
        onToggleSound={toggleSound}
        onToggleDark={() => applyDark(!dark)}
        onPlay={(e: Entry, lang: Lang) => playOne(e, lang)}
        onStep={step}
        onOpen={() => openWheel(true)}
        onClose={() => openWheel(false)}
        onShuffle={() => flingRef.current(1, 1)}
        onBringTogether={(i) => {
          setStarted(true);
          const pair = worldRef.current?.current()[i];
          if (pair) worldRef.current?.bringTogether(pair);
        }}
      />
    </main>
  );
}
