"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

// A page full of abstract clocks. Each one sweeps smoothly from 1 to 9, then a void step,
// then starts again. Neighbouring clocks are offset, so the count ripples across.
const STEPS = 10; // 1–9 and one void
const STEP_TIME = 400; // ms per step
const CELL_SIZE = 110; // px, roughly the size of one clock
const PANEL_HEIGHT = 56; // px, the colour panel at the bottom

export default function TimeInterval() {
  const [time, setTime] = useState(0); // in steps, with fractions (2.5 = halfway through step 3)
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const [clockColor, setClockColor] = useState("#ffffff");
  const [backgroundColor, setBackgroundColor] = useState("#000000");

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
        rows: Math.max(1, Math.round((window.innerHeight - PANEL_HEIGHT) / CELL_SIZE)),
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
      clocks.push(<Clock key={`${row}-${col}`} phase={phase} />);
    }
  }

  return (
    <main
      className={styles.container}
      style={{ "--clock": clockColor, background: backgroundColor } as React.CSSProperties}
    >
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
          gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        }}
      >
        {clocks}
      </div>

      <div className={styles.panel} style={{ height: PANEL_HEIGHT }}>
        <label>
          Clocks
          <input type="color" value={clockColor} onChange={(e) => setClockColor(e.target.value)} />
        </label>
        <label>
          Background
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
          />
        </label>
      </div>
    </main>
  );
}

// phase 0–9: the wedge grows smoothly to a full circle. phase 9–10: void (nothing drawn).
function Clock({ phase }: { phase: number }) {
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
