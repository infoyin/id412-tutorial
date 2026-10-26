"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

// A page full of abstract clocks. Each one sweeps smoothly from 1 to 9, then a void step,
// then starts again. Neighbouring clocks are offset, so the count ripples across.
// A floating panel picks colours, neon glow, and wedge or numeral clocks.
const STEPS = 10; // 1–9 and one void
const STEP_TIME = 400; // ms per step
const CELL_SIZE = 110; // px, roughly the size of one clock
const PANEL_SPACE = 90; // px kept free at the bottom for the panel
const NEON_COLORS = ["#ff2bd6", "#00f0ff", "#39ff14", "#ffe600", "#ff6b00", "#9d4dff", "#ffffff"];

export default function TimeInterval() {
  const [time, setTime] = useState(0); // in steps, with fractions (2.5 = halfway through step 3)
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const [clockColor, setClockColor] = useState("#00f0ff");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [glow, setGlow] = useState(8); // px of neon glow, 0 = off
  const [numerals, setNumerals] = useState(false);

  // One animation loop drives every clock, every frame.
  useEffect(() => {
    let frame = 0;
    const loop = (now: number) => {
      setTime(now / STEP_TIME);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fill the window (above the panel) with as many clocks as fit.
  useEffect(() => {
    const resize = () =>
      setGrid({
        cols: Math.max(1, Math.round(window.innerWidth / CELL_SIZE)),
        rows: Math.max(1, Math.round((window.innerHeight - PANEL_SPACE) / CELL_SIZE)),
      });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const clocks = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      // Diagonal offset: each clock is one step behind its neighbour.
      const phase = (time - (row + col) + STEPS * 1000) % STEPS;
      const Clock = numerals ? NumeralClock : WedgeClock;
      clocks.push(<Clock key={`${row}-${col}`} phase={phase} />);
    }
  }

  // Neon: two coloured shadows around everything drawn, one tight and one wide.
  const neon =
    glow > 0
      ? `drop-shadow(0 0 ${glow / 2}px ${clockColor}) drop-shadow(0 0 ${glow * 2}px ${clockColor})`
      : "none";

  return (
    <main
      className={styles.container}
      style={{ "--clock": clockColor, background: backgroundColor } as React.CSSProperties}
    >
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
          paddingBottom: PANEL_SPACE,
          filter: neon,
        }}
      >
        {clocks}
      </div>

      <div className={styles.panel}>
        <div className={styles.swatches}>
          {NEON_COLORS.map((color) => (
            <button
              key={color}
              className={styles.swatch}
              data-active={color === clockColor}
              style={{ background: color, color }}
              onClick={() => setClockColor(color)}
              aria-label={`Clock colour ${color}`}
            />
          ))}
          <input
            type="color"
            className={styles.picker}
            value={clockColor}
            onChange={(e) => setClockColor(e.target.value)}
            title="Custom clock colour"
          />
        </div>

        <label className={styles.control}>
          BG
          <input
            type="color"
            className={styles.picker}
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
        </label>

        <label className={styles.control}>
          Neon
          <input
            type="range"
            min="0"
            max="20"
            value={glow}
            onChange={(e) => setGlow(Number(e.target.value))}
          />
        </label>

        <button className={styles.toggle} onClick={() => setNumerals(!numerals)}>
          {numerals ? "◔ Wedges" : "123 Numerals"}
        </button>
      </div>
    </main>
  );
}

// phase 0–9: the wedge grows smoothly to a full circle. phase 9–10: void (nothing drawn).
function WedgeClock({ phase }: { phase: number }) {
  if (phase >= 9) return <div />;

  const angle = (phase / 9) * 2 * Math.PI;
  const x = 50 + 40 * Math.sin(angle);
  const y = 50 - 40 * Math.cos(angle);
  const largeArc = angle > Math.PI ? 1 : 0;

  return (
    <svg className={styles.clock} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" className={styles.face} />
      <path d={`M 50 50 L 50 10 A 40 40 0 ${largeArc} 1 ${x} ${y} Z`} className={styles.wedge} />
      <line x1="50" y1="50" x2={x} y2={y} className={styles.hand} />
    </svg>
  );
}

// phase 0–9: shows the digit 1–9, with a dot running once round the rim per digit. phase 9–10: void.
function NumeralClock({ phase }: { phase: number }) {
  if (phase >= 9) return <div />;

  const digit = Math.floor(phase) + 1;
  const angle = (phase % 1) * 2 * Math.PI;
  const x = 50 + 40 * Math.sin(angle);
  const y = 50 - 40 * Math.cos(angle);

  return (
    <svg className={styles.clock} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" className={styles.face} />
      <text x="50" y="52" className={styles.digit}>
        {digit}
      </text>
      <circle cx={x} cy={y} r="4" className={styles.wedge} />
    </svg>
  );
}
