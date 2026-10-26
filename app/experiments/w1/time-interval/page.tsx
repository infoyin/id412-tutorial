"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";
import Kaonashi, { type Ghost } from "./Kaonashi";
import { distortDigit, noiseLines, wobblyCircle } from "./captcha";

// A page full of abstract clocks. Each one sweeps smoothly from 1 to 9, then a void step,
// then starts again. A floating panel adjusts colours, glow, layout and timing.
// Kaonashi (No-Face) follows the mouse and swallows the clocks near it.
// Captcha mode turns borders and digits into warped, scratched captcha shapes.

// ---- Edit these to change how the page starts. Every one also has a control in the panel. ----
const DEFAULTS = {
  clockColor: "#00f0ff",
  backgroundColor: "#000000",
  glow: 8, // px of neon glow, 0 = off
  size: 110, // px, roughly the size of one clock
  speed: 2.5, // counts per second
  line: 1.5, // outline thickness
  numerals: false, // false = wedges, true = digits
  layout: "grid" as "grid" | "random",
  kaonashi: true, // No-Face on/off
  captcha: false, // false = clean circles, true = warped captcha shapes
  warp: 8, // px of captcha warp, 0 = none
};
const NEON_COLORS = ["#ff2bd6", "#00f0ff", "#39ff14", "#ffe600", "#ff6b00", "#9d4dff", "#ffffff"];
const STEPS = 10; // 1–9 and one void
const PANEL_SPACE = 130; // px kept free at the bottom while the panel is open
// -----------------------------------------------------------------------------------------------

type Settings = typeof DEFAULTS;
type Spot = { x: number; y: number; size: number; offset: number }; // one clock: centre, size, delay in steps

export default function TimeInterval() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [time, setTime] = useState(0); // in steps, with fractions (2.5 = halfway through step 3)
  const [spots, setSpots] = useState<Spot[]>([]);
  const [panelOpen, setPanelOpen] = useState(true);
  const [shuffle, setShuffle] = useState(0); // bump to re-scatter the random layout
  const speed = useRef(DEFAULTS.speed);
  const ghost = useRef<Ghost>({ x: -9999, y: -9999, reach: 0, alpha: 0 }); // written by <Kaonashi> every frame
  const [ghostAt, setGhostAt] = useState(ghost.current); // copied once per frame, read by the clocks

  // Change one setting, keep the rest.
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((previous) => ({ ...previous, [key]: value }));

  // The loop reads speed from a ref, so moving the slider doesn't restart it.
  useEffect(() => {
    speed.current = settings.speed;
  }, [settings.speed]);

  // One animation loop drives every clock, every frame.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      setTime((previous) => previous + ((now - last) / 1000) * speed.current);
      setGhostAt(ghost.current);
      last = now;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Place the clocks: again on resize, layout or size change, and on Shuffle.
  useEffect(() => {
    const place = () =>
      setSpots(
        makeSpots(
          settings.layout,
          settings.size,
          window.innerWidth,
          window.innerHeight - (panelOpen ? PANEL_SPACE : 0),
        ),
      );
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [settings.layout, settings.size, panelOpen, shuffle]);

  // Neon: two coloured shadows around everything drawn, one tight and one wide.
  const { clockColor, glow } = settings;
  const neon =
    glow > 0
      ? `drop-shadow(0 0 ${glow / 2}px ${clockColor}) drop-shadow(0 0 ${glow * 2}px ${clockColor})`
      : "";
  // Captcha warp: the SVG filter below bends the whole clock layer like captcha text.
  const warp = settings.captcha && settings.warp > 0 ? "url(#captcha-warp)" : "";
  const filter = `${warp} ${neon}`.trim() || "none";
  const Clock = settings.numerals ? NumeralClock : WedgeClock;

  return (
    <main
      className={styles.container}
      style={{ "--clock": clockColor, background: settings.backgroundColor } as React.CSSProperties}
    >
      <svg className={styles.hidden} aria-hidden>
        <filter id="captcha-warp">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale={settings.warp} />
        </filter>
      </svg>

      <div className={styles.canvas} style={{ filter }}>
        {spots.map((spot, i) => {
          // 0 = far from Kaonashi, 1 = swallowed: the clock shrinks and fades.
          const distance = Math.hypot(spot.x - ghostAt.x, spot.y - ghostAt.y);
          const eaten = settings.kaonashi ? Math.max(0, 1 - distance / ghostAt.reach) * ghostAt.alpha : 0;
          return (
            <div
              key={i}
              className={styles.spot}
              style={{
                left: spot.x - spot.size / 2,
                top: spot.y - spot.size / 2,
                width: spot.size,
                height: spot.size,
                transform: `scale(${1 - eaten * 0.9})`,
                opacity: 1 - eaten,
              }}
            >
              <Clock
                phase={(((time - spot.offset) % STEPS) + STEPS) % STEPS}
                line={settings.line}
                captcha={settings.captcha}
                seed={i + 1}
              />
            </div>
          );
        })}
      </div>

      {settings.kaonashi && <Kaonashi ghost={ghost} rimColor={clockColor} />}

      {panelOpen ? (
        <div className={styles.panel}>
          <div className={styles.row}>
            <div className={styles.swatches}>
              {NEON_COLORS.map((color) => (
                <button
                  key={color}
                  className={styles.swatch}
                  data-active={color === clockColor}
                  style={{ background: color, color }}
                  onClick={() => set("clockColor", color)}
                  aria-label={`Clock colour ${color}`}
                />
              ))}
            </div>
            <label className={styles.control}>
              Clock
              <input
                type="color"
                className={styles.picker}
                value={clockColor}
                onChange={(e) => set("clockColor", e.target.value)}
              />
            </label>
            <label className={styles.control}>
              BG
              <input
                type="color"
                className={styles.picker}
                value={settings.backgroundColor}
                onChange={(e) => set("backgroundColor", e.target.value)}
              />
            </label>
            <Slider label="Neon" value={glow} min={0} max={20} step={1} onChange={(v) => set("glow", v)} />
          </div>

          <div className={styles.row}>
            <div className={styles.segmented}>
              <button data-active={settings.layout === "grid"} onClick={() => set("layout", "grid")}>
                Grid
              </button>
              <button data-active={settings.layout === "random"} onClick={() => set("layout", "random")}>
                Random
              </button>
            </div>
            {settings.layout === "random" && (
              <button className={styles.button} onClick={() => setShuffle(shuffle + 1)}>
                Shuffle
              </button>
            )}
            <Slider label="Size" value={settings.size} min={40} max={300} step={5} onChange={(v) => set("size", v)} />
            <Slider label="Speed" value={settings.speed} min={0} max={10} step={0.5} onChange={(v) => set("speed", v)} />
            <Slider label="Line" value={settings.line} min={0.5} max={6} step={0.5} onChange={(v) => set("line", v)} />
            <button className={styles.button} onClick={() => set("numerals", !settings.numerals)}>
              {settings.numerals ? "◔ Wedges" : "123 Numerals"}
            </button>
            <button
              className={styles.button}
              data-active={settings.captcha}
              onClick={() => set("captcha", !settings.captcha)}
            >
              Captcha
            </button>
            {settings.captcha && (
              <Slider label="Warp" value={settings.warp} min={0} max={30} step={1} onChange={(v) => set("warp", v)} />
            )}
            <button className={styles.button} onClick={() => set("kaonashi", !settings.kaonashi)}>
              {settings.kaonashi ? "Hide No-Face" : "Show No-Face"}
            </button>
            <button className={styles.button} onClick={() => setSettings(DEFAULTS)}>
              Reset
            </button>
            <button className={styles.button} onClick={() => setPanelOpen(false)} aria-label="Hide panel">
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.openButton} onClick={() => setPanelOpen(true)}>
          ⚙ Panel
        </button>
      )}
    </main>
  );
}

// Grid: rows and columns, each clock one step behind its neighbour (a diagonal ripple).
// Random: scattered positions, sizes and delays.
function makeSpots(layout: Settings["layout"], size: number, width: number, height: number): Spot[] {
  const cols = Math.max(1, Math.round(width / size));
  const rows = Math.max(1, Math.round(height / size));
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const spots: Spot[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (layout === "grid") {
        spots.push({
          x: (col + 0.5) * cellWidth,
          y: (row + 0.5) * cellHeight,
          size: Math.min(cellWidth, cellHeight) * 0.9,
          offset: row + col,
        });
      } else {
        spots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: size * (0.4 + Math.random() * 1.2),
          offset: Math.random() * STEPS,
        });
      }
    }
  }
  return spots;
}

type ClockProps = { phase: number; line: number; captcha: boolean; seed: number };

// The clock's border: a clean circle, or in captcha mode a wobbly double outline with scratches.
function Face({ line, captcha, seed }: Omit<ClockProps, "phase">) {
  if (!captcha) return <circle cx="50" cy="50" r="40" className={styles.face} strokeWidth={line} />;

  return (
    <>
      <path d={wobblyCircle(seed)} className={styles.face} strokeWidth={line} />
      <path d={wobblyCircle(seed + 100, 10)} className={styles.face} strokeWidth={line / 2} opacity={0.6} />
      {noiseLines(seed).map((l, k) => (
        <line key={k} {...l} className={styles.hand} strokeWidth={line / 2} />
      ))}
    </>
  );
}

// phase 0–9: the wedge grows smoothly to a full circle. phase 9–10: void (nothing drawn).
function WedgeClock({ phase, line, captcha, seed }: ClockProps) {
  if (phase >= 9) return null;

  const angle = (phase / 9) * 2 * Math.PI;
  const x = 50 + 40 * Math.sin(angle);
  const y = 50 - 40 * Math.cos(angle);
  const largeArc = angle > Math.PI ? 1 : 0;

  return (
    <svg className={styles.clock} viewBox="0 0 100 100">
      <Face line={line} captcha={captcha} seed={seed} />
      <path d={`M 50 50 L 50 10 A 40 40 0 ${largeArc} 1 ${x} ${y} Z`} className={styles.wedge} />
      <line x1="50" y1="50" x2={x} y2={y} className={styles.hand} strokeWidth={line * 2} />
    </svg>
  );
}

// phase 0–9: shows the digit 1–9, with a dot running once round the rim per digit. phase 9–10: void.
function NumeralClock({ phase, line, captcha, seed }: ClockProps) {
  if (phase >= 9) return null;

  const digit = Math.floor(phase) + 1;
  const angle = (phase % 1) * 2 * Math.PI;
  const x = 50 + 40 * Math.sin(angle);
  const y = 50 - 40 * Math.cos(angle);

  return (
    <svg className={styles.clock} viewBox="0 0 100 100">
      <Face line={line} captcha={captcha} seed={seed} />
      {captcha ? (
        <CaptchaDigit digit={digit} seed={seed * 10 + digit} />
      ) : (
        <text x="50" y="52" className={styles.digit}>
          {digit}
        </text>
      )}
      <circle cx={x} cy={y} r={2 + line * 1.5} className={styles.wedge} />
    </svg>
  );
}

// A digit tilted, skewed and set in a random font, like one letter of a captcha.
function CaptchaDigit({ digit, seed }: { digit: number; seed: number }) {
  const d = distortDigit(seed);
  return (
    <text
      className={styles.digit}
      transform={`translate(${50 + d.dx} 52) rotate(${d.rotate}) skewX(${d.skew})`}
      style={{ fontFamily: d.fontFamily, fontSize: d.fontSize, fontWeight: 700 }}
    >
      {digit}
    </text>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function Slider({ label, value, min, max, step, onChange }: SliderProps) {
  return (
    <label className={styles.control}>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.value}>{value}</span>
    </label>
  );
}
