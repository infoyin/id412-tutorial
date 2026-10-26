"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

// A page full of abstract clocks. Each one counts 1 to 9, then a void step,
// then starts again. Neighbouring clocks are offset, so the count ripples across.
const STEPS = 10; // 1–9 and one void (0)
const INTERVAL = 400; // ms per step
const CELL_SIZE = 110; // px, roughly the size of one clock

export default function TimeInterval() {
  const [tick, setTick] = useState(0);
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });

  // One timer drives every clock.
  useEffect(() => {
    const id = setInterval(() => setTick((previous) => previous + 1), INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Fill the window with as many clocks as fit.
  useEffect(() => {
    const resize = () =>
      setGrid({
        cols: Math.max(1, Math.round(window.innerWidth / CELL_SIZE)),
        rows: Math.max(1, Math.round(window.innerHeight / CELL_SIZE)),
      });
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const clocks = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      // Diagonal offset: each clock is one step behind its neighbour.
      const step = (tick + STEPS * 100 - (row + col)) % STEPS;
      clocks.push(<Clock key={`${row}-${col}`} step={step} />);
    }
  }

  return (
    <main
      className={styles.container}
      style={{
        gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
      }}
    >
      {clocks}
    </main>
  );
}

// step 0 = void (nothing drawn), 1–9 = a wedge filling step/9 of the circle.
function Clock({ step }: { step: number }) {
  if (step === 0) return <div />;

  const angle = (step / 9) * 2 * Math.PI;
  const x = 50 + 40 * Math.sin(angle);
  const y = 50 - 40 * Math.cos(angle);
  const largeArc = step > 4.5 ? 1 : 0;

  return (
    <svg className={styles.clock} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" className={styles.face} />
      {step === 9 ? (
        <circle cx="50" cy="50" r="40" className={styles.wedge} />
      ) : (
        <path
          d={`M 50 50 L 50 10 A 40 40 0 ${largeArc} 1 ${x} ${y} Z`}
          className={styles.wedge}
        />
      )}
      <line x1="50" y1="50" x2={x} y2={y} className={styles.hand} />
    </svg>
  );
}
