"use client";

import { useEffect, useRef, useState } from "react";
import {
  closeEffects,
  crackSound,
  flingSound,
  getPlaying,
  grabSound,
  koreanVoiceStatus,
  onPlaying,
  playOne,
  playPair,
  portal,
  setCharge,
  setDrag,
  setHum,
  setMuted,
  stop,
  throwSound,
  tick,
  unlockEffects,
  type Lang,
  type Playing,
} from "./audio";
import { blockFont, drawField, FONT, LATIN, setTypeface, typeface, zhuyinColumn } from "./draw";
import { FONT_STYLES } from "./fonts";
import { Particles } from "./particles";
import { makePoster } from "./poster";
import { Menu } from "./Menu";
import { Overlay } from "./Overlay";
import { World, type Block, type Pointer } from "./physics";
import { pairCount, SIZE, TUNING } from "./settings";
import { setDark } from "./theme";
import { Wheel } from "./wheel";
import { Rotation, type Entry } from "./words";
import styles from "./page.module.css";

// 臺韓對話 · 대한 대화 (Tâi-Hân Tuì-uē · Dae-han Dae-hwa) — Taiwanese and Korean words that share Chinese characters, as outlined paper
// blocks on a white field. Drag a word to its partner: they attract, resonate, dock, fill black
// and are pronounced. The half-hidden wheel on the left: drag = gravity, fling = scatter the
// field and bring new words, click = the comparison wheel, where each word can be replayed.

export default function PhoneticEcho() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const wheelRef = useRef<Wheel | null>(null);
  const shownRef = useRef<Entry[]>([]);
  const flingRef = useRef<(strength: number, dir: number) => void>(() => {});
  const rescaleRef = useRef<(scale: number) => void>(() => {});
  const styleRef = useRef<(id: string) => void>(() => {});
  const [fontStyle, setFontStyle] = useState(FONT_STYLES[0].id);
  const [grid, setGrid] = useState(false);
  const [listening, setListening] = useState(false); // listen mode (long-press the wheel)
  const [autoplay, setAutoplay] = useState(false); // playing itself after a while without input
  const snapRef = useRef<() => string | null>(() => null);
  const [poster, setPoster] = useState<string | null>(null); // the last snapshot, as a PNG
  const [flash, setFlash] = useState(0);
  const takePoster = () => {
    const url = snapRef.current();
    if (!url) return;
    setFlash((n) => n + 1);
    setPoster(url);
  };
  const chooseFont = (id: string) => {
    setFontStyle(id);
    styleRef.current(id);
  };
  const toggleGrid = () => {
    const on = !worldRef.current?.grid;
    worldRef.current?.setGrid(on);
    setGrid(on);
  };
  // Keyboard: F cycles the typeface, G toggles the grid (not while typing in a field).
  const toggle3D = () => {
    threeDRef.current = !threeDRef.current;
    setThreeD(threeDRef.current);
  };
  const keysRef = useRef({ chooseFont, toggleGrid, fontStyle, takePoster, toggle3D });
  keysRef.current = { chooseFont, toggleGrid, fontStyle, takePoster, toggle3D };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return;
      const k = keysRef.current;
      if (e.key === "f" || e.key === "F") {
        const i = FONT_STYLES.findIndex((f) => f.id === k.fontStyle);
        k.chooseFont(FONT_STYLES[(i + 1) % FONT_STYLES.length].id);
      }
      if (e.key === "g" || e.key === "G") k.toggleGrid();
      if (e.key === "p" || e.key === "P") k.takePoster();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const threeDRef = useRef(false); // the compass button: 3D blocks
  const [threeD, setThreeD] = useState(false);
  const [scale, setScaleState] = useState(SIZE.min); // block size from the size bar
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
    let scale = SIZE.min;
    const baseFont = () => Math.min(Math.max(Math.min(innerWidth, innerHeight) * 0.052, 20), 40);
    let lastFling = -Infinity;

    // Block size from its text.
    // Block size from its text, measured in the current face at its heaviest weight.
    world.measure = (b) => {
      ctx.font = blockFont(b, fontSize, 1, typeface.style);
      let inner = ctx.measureText(b.text).width + (b.zhuyin ? zhuyinColumn(fontSize) * b.zhuyin.length : 0);
      if (b.sub) {
        ctx.font = `400 ${Math.round(fontSize * 0.34)}px ${LATIN}`;
        inner = Math.max(inner, ctx.measureText(b.sub).width);
      }
      b.w = inner + fontSize * 1.4;
      b.h = fontSize * 2.4;
    };
    world.onChange = (entries) => {
      shownRef.current = entries;
      wheel.setCount(entries.length);
      setShown(entries);
      ensureFonts();
    };

    // The Chinese and Korean fonts arrive in slices: ask for the characters on screen in the
    // current face (light and heavy), then re-measure the blocks once they are in.
    function ensureFonts() {
      const loads = world.blocks.flatMap((b) => [0, 1].map((k) => document.fonts?.load(blockFont(b, 40, k, typeface.style), b.text)));
      Promise.all(loads).then(() => world.blocks.forEach((b) => world.measure(b)));
    }

    // The ⧉ button: crop the canvas to the blocks (plus a margin) and lay it out as a poster.
    snapRef.current = () => {
      const live = world.blocks.filter((b) => !b.pair.leaving);
      if (!live.length) return null;
      const m = 40;
      const x0 = Math.max(0, Math.min(...live.map((b) => b.x - b.w / 2)) - m);
      const y0 = Math.max(0, Math.min(...live.map((b) => b.y - b.h / 2)) - m);
      const x1 = Math.min(innerWidth, Math.max(...live.map((b) => b.x + b.w / 2)) + m);
      const y1 = Math.min(innerHeight, Math.max(...live.map((b) => b.y + b.h / 2)) + m);
      return makePoster(canvas, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, canvas.width / innerWidth, world.current().map((p) => p.entry), new Set(connected.keys()));
    };

    // The Aa menu: a new face for every block (they flip over to it).
    styleRef.current = (id) => {
      const next = FONT_STYLES.find((f) => f.id === id);
      if (!next || next === typeface.style) return;
      setTypeface(next, performance.now() / 1000);
      ensureFonts();
    };
    // A pair connects: the portal sound, then the two pronunciations.
    // Pairs connected this session, for the poster.
    const connected = new Map<string, Entry>();
    const particles = new Particles();
    world.onConnect = (pair) => {
      connected.set(pair.entry.id, pair.entry);
      particles.burst((pair.tw.x + pair.ko.x) / 2, (pair.tw.y + pair.ko.y) / 2);
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
      world.fling(strength, dir, rotation.next(pairCount(innerWidth, innerHeight, scale)));
      flingSound(strength);
      particles.kick(world.obstacle.x, world.obstacle.y, strength);
    };

    // The size bar: bigger text and blocks; fewer pairs when bigger, more when smaller again.
    rescaleRef.current = (next) => {
      scale = next;
      fontSize = Math.round(baseFont() * scale);
      world.blocks.forEach((b) => world.measure(b));
      const n = pairCount(innerWidth, innerHeight, scale);
      const now = world.current().length;
      if (now > n) world.trim(n);
      if (now < n) world.spawn(rotation.next(n - now), "edges");
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, TUNING.maxDpr);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fontSize = Math.round(baseFont() * scale);
      world.resize(innerWidth, innerHeight);
      particles.fill(innerWidth, innerHeight);
      // Floating words stay out of the menu row (title, INFO, INDEX).
      const menu = document.querySelector("[data-menu]")?.getBoundingClientRect();
      world.keepOut = { w: menu?.right ?? 0, h: menu?.bottom ?? 0 };
      const bar = document.querySelector("[data-size-bar]")?.getBoundingClientRect();
      world.keepOutCorner = bar ? { w: innerWidth - bar.left, h: innerHeight - bar.top } : { w: 0, h: 0 };
      // Top right: from the clock's left edge (or the icons, if the clock is hidden) to the corner.
      const clock = document.querySelector("[data-clock]")?.getBoundingClientRect();
      const icons = document.querySelector("[data-toggles]")?.getBoundingClientRect();
      const left = Math.min(clock?.width ? clock.left : Infinity, icons?.left ?? Infinity);
      world.keepOutTopRight = Number.isFinite(left) ? { w: innerWidth - left, h: Math.max(clock?.bottom ?? 0, icons?.bottom ?? 0) } : { w: 0, h: 0 };
      const closed = wheel.geometry(innerWidth, innerHeight, 0);
      world.left = closed.x + closed.r + 32;
      const g = wheel.geometry(innerWidth, innerHeight, 1);
      setPlace({ ...g.note, wide: g.wide });
    };
    resize();
    world.spawn(rotation.next(pairCount(innerWidth, innerHeight, scale)), "home");
    ensureFonts();
    window.addEventListener("resize", resize);
    setTimeout(resize, 300); // once the clock has rendered, measure the corner it takes

    // Pointer: route to the wheel or to a block.
    const pointer: Pointer = { x: -999, y: -999, vx: 0, vy: 0, inside: false };
    let target: "wheel" | "block" | null = null;
    let press = { x: 0, y: 0, t: 0 }; // to tell a click on a block from a drag
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
      } else if (listen.on) {
        // Listen mode: a click is an answer, not a grab.
        const b = world.blockAt(e.clientX, e.clientY);
        if (b) answer(b);
      } else if (world.grab(e.clientX, e.clientY)) {
        target = "block";
        press = { x: e.clientX, y: e.clientY, t: performance.now() };
        grabSound();
      }
      if (target) canvas.setPointerCapture(e.pointerId); // keep dragging even off the wheel
    };
    const onUp = (e: PointerEvent) => {
      if (target === "wheel") {
        const action = wheel.up(e.clientX, e.clientY, innerWidth, innerHeight);
        // In listen mode a click on the wheel plays the word again.
        if (action?.type === "open") {
          if (listen.on) playTarget();
          else openWheel(true);
        }
        if (action?.type === "close") openWheel(false);
        if (action?.type === "select") {
          wheel.select(action.index);
          setSelectedId(shownRef.current[action.index]?.id ?? null);
        }
        if (action?.type === "fling") flingRef.current(action.strength, action.dir);
      }
      if (target === "block") {
        // A click (not a drag) on a block plays that word.
        const b = world.held;
        const still = Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6 && performance.now() - press.t < 350;
        if (b && still) playOne(b.pair.entry, b.lang);
        const speed = Math.min(Math.hypot(pointer.vx, pointer.vy) / 2500, 1);
        if (b && !still && speed > 0.25) throwSound(speed);
        world.release();
      }
      target = null;
    };
    const onLeave = () => {
      pointer.inside = false;
      wheel.hovered = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && listen.on) setListen(false);
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

    // ---- Listen mode: long-press the wheel. A word is played (Taiwanese or Korean); click the
    // block you heard. Right: a ring, the portal sound, both readings, then the next word.
    // Wrong: the block shakes and the word plays again; after two misses the answer glows.
    const listen = { on: false, target: null as Block | null, misses: 0, timer: 0 };
    const playTarget = () => listen.target && playOne(listen.target.pair.entry, listen.target.lang);
    const nextRound = () => {
      const pool = world.blocks.filter((b) => !b.pair.leaving && !b.entering && b !== listen.target);
      listen.target = pool[Math.floor(Math.random() * pool.length)] ?? null;
      listen.misses = 0;
      playTarget();
    };
    const setListen = (on: boolean) => {
      listen.on = on;
      wheel.listening = on;
      setListening(on);
      clearTimeout(listen.timer);
      if (on) {
        world.release();
        listen.target = null;
        listen.timer = window.setTimeout(nextRound, 400);
      } else {
        listen.target = null;
        stop();
      }
    };
    const answer = (b: Block) => {
      if (!listen.target) return;
      if (b === listen.target) {
        b.flash = 1;
        particles.burst(b.x, b.y);
        portal();
        const entry = b.pair.entry;
        listen.target = null;
        listen.timer = window.setTimeout(() => {
          playPair(entry);
          listen.timer = window.setTimeout(() => listen.on && nextRound(), 3800);
        }, 650);
      } else {
        b.spin += (Math.random() < 0.5 ? -1 : 1) * 7;
        b.vx += (Math.random() - 0.5) * 300;
        crackSound();
        listen.misses++;
        listen.timer = window.setTimeout(playTarget, 600);
      }
    };

    // ---- Autoplay: after a while with no input the piece plays itself (for an exhibition
    // screen): pairs connect, the wheel spins, the grid and 3D come and go, a fling now and then.
    // Any input stops it and puts grid / 3D back as they were.
    const auto = { on: false, at: 0, step: 0, grid: false, threeD: false };
    const MOVES = ["pair", "turn", "pair", "grid", "pair", "grid", "3d", "pair", "fling", "3d"];
    let lastInput = performance.now();
    const stopAuto = () => {
      if (!auto.on) return;
      auto.on = false;
      if (auto.grid) keysRef.current.toggleGrid();
      if (auto.threeD) keysRef.current.toggle3D();
      auto.grid = auto.threeD = false;
      setAutoplay(false);
    };
    const onInput = () => {
      lastInput = performance.now();
      stopAuto();
    };
    const autoMove = () => {
      const move = MOVES[auto.step++ % MOVES.length];
      if (move === "pair") {
        const open = world.current().filter((p) => !p.falseFriend && !p.docked && p.cracked < 0);
        const pair = open[Math.floor(Math.random() * open.length)];
        if (pair) world.bringTogether(pair);
      }
      if (move === "turn") wheel.omega += 7;
      if (move === "grid") {
        keysRef.current.toggleGrid();
        auto.grid = !auto.grid;
      }
      if (move === "3d") {
        keysRef.current.toggle3D();
        auto.threeD = !auto.threeD;
      }
      if (move === "fling" && !world.grid) flingRef.current(0.8, 1);
    };
    for (const ev of ["pointerdown", "pointermove", "keydown", "wheel"]) window.addEventListener(ev, onInput);

    let frame = 0;
    let last = performance.now();
    let shownSelected = -1;
    let depthAmount = 0;
    let lastTooth = 0; // which gear tooth the wheel is on, for the ticks
    let lastTickAt = 0;
    const TOOTH = (Math.PI * 2) / 60;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      pointer.vx *= Math.exp(-dt * 6);
      pointer.vy *= Math.exp(-dt * 6);
      wheel.update(dt);
      if (wheel.longPress()) setListen(!listen.on);
      wheel.listenPulse += ((getPlaying() && listen.on ? 0.6 + 0.4 * Math.sin(now / 120) : 0) - wheel.listenPulse) * (1 - Math.exp(-dt * 10));
      // The word being asked can leave the screen (a fling): ask another once things settle.
      if (listen.on && listen.target?.pair.leaving) nextRound();
      // After two misses the answer glows, gently pulsing, until it is found.
      if (listen.on && listen.target && listen.misses >= 2) listen.target.flash = Math.max(listen.target.flash, 0.45 + 0.2 * Math.sin(now / 200));
      // Autoplay.
      if (!auto.on && now - lastInput > TUNING.autoplayAfter * 1000 && !listen.on && !wheel.isOpen && !document.querySelector("[data-menu] [class*=tabBody]")) {
        auto.on = true;
        auto.at = now;
        setAutoplay(true);
      }
      if (auto.on && now - auto.at > TUNING.autoplayStep * 1000) {
        auto.at = now;
        autoMove();
      }
      const g = wheel.geometry(innerWidth, innerHeight);
      world.pull = wheel.isOpen ? 0 : wheel.pull;
      world.obstacle = { x: g.x, y: g.y, r: g.r };
      world.update(dt, pointer, reduced);
      setHum(world.activeCloseness() ** 1.5);
      // Wheel: a click per gear tooth (at most ~30 per second), a charge while pulled down.
      const tooth = Math.floor(wheel.angle / TOOTH);
      if (tooth !== lastTooth && now - lastTickAt > 33) {
        tick(Math.min(Math.abs(wheel.omega) / 20, 1));
        lastTickAt = now;
      }
      lastTooth = tooth;
      setCharge(wheel.held && !wheel.isOpen ? Math.max(wheel.pull, 0) : 0);
      // Block: a whoosh that follows the drag speed.
      setDrag(target === "block" ? Math.min(Math.hypot(pointer.vx, pointer.vy) / 2000, 1) : 0);
      depthAmount += ((threeDRef.current ? 1 : 0) - depthAmount) * (1 - Math.exp(-dt * 5));
      const cam = pointer.inside ? pointer : { x: innerWidth / 2, y: innerHeight / 2 };
      particles.update(dt, now / 1000, world, pointer, reduced);
      drawField(ctx, world, fontSize, wheel.open, getPlaying(), now / 1000, reduced, { amount: depthAmount, x: cam.x, y: cam.y }, (fade) =>
        particles.draw(ctx, fade, FONT),
      );
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
      for (const ev of ["pointerdown", "pointermove", "keydown", "wheel"]) window.removeEventListener(ev, onInput);
      clearTimeout(listen.timer);
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
      {flash > 0 && <div key={flash} className={styles.shutter} />}
      {poster && (
        <div className={styles.posterCard}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL just drawn */}
          <img src={poster} alt="臺韓對話 poster" />
          <p>
            <a href={poster} download={`臺韓對話-${new Date().toLocaleDateString("sv")}.png`}>
              ↓ 下載 · 저장 · Download
            </a>
            <button onClick={() => setPoster(null)} aria-label="close · 關閉 · 닫기">
              ×
            </button>
          </p>
        </div>
      )}
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
        scale={scale}
        threeD={threeD}
        fontStyle={fontStyle}
        onFontStyle={chooseFont}
        grid={grid}
        onToggleGrid={toggleGrid}
        onSnap={takePoster}
        onToggle3D={toggle3D}
        listening={listening}
        autoplay={autoplay}
        onScale={(next: number) => {
          const v = Math.min(SIZE.max, Math.max(SIZE.min, Math.round(next / SIZE.step) * SIZE.step));
          setScaleState(v);
          rescaleRef.current(v);
        }}
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
