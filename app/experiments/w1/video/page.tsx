"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

// A 3×3 square grid of the same YouTube video, centred on the screen, with sound.
// Each cell waits a random delay and starts at a slightly different second, so they are never in sync.
// Browsers only play sound after a click, so the page starts with one "click to start" layer.
const VIDEO_ID = "HdZ9weP5i68";
const START = 41; // seconds into the video (the &t=41s in the link)
const GRID = 3; // 3 × 3 cells
const MIN_DELAY = 0.1; // s, the shortest a cell waits before it starts
const MAX_DELAY = 6; // s, the longest
const START_JITTER = 4; // s, each cell starts up to this much earlier than START

type Cell = { delay: number; start: number };

export default function Video() {
  const [started, setStarted] = useState(false);
  const [cells, setCells] = useState<Cell[]>([]);
  const [shown, setShown] = useState<boolean[]>([]); // which cells have started

  // After the click: pick a random delay and start second per cell, then load each one when its delay is up.
  useEffect(() => {
    if (!started) return;

    const picked = Array.from({ length: GRID * GRID }, () => ({
      delay: MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY),
      start: START - Math.floor(Math.random() * START_JITTER),
    }));
    setCells(picked);
    setShown(picked.map(() => false));

    const timers = picked.map((cell, i) =>
      setTimeout(() => {
        setShown((previous) => previous.map((value, j) => (j === i ? true : value)));
      }, cell.delay * 1000),
    );
    return () => timers.forEach(clearTimeout);
  }, [started]);

  return (
    <main className={styles.container}>
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
        {cells.map((cell, i) =>
          shown[i] ? (
            <iframe
              key={i}
              className={styles.cell}
              // loop needs playlist set to the same video.
              src={`https://www.youtube.com/embed/${VIDEO_ID}?start=${cell.start}&autoplay=1&loop=1&playlist=${VIDEO_ID}&controls=0&disablekb=1`}
              title={`Video ${i + 1}`}
              allow="autoplay; encrypted-media"
            />
          ) : (
            <div key={i} className={styles.cell} />
          ),
        )}
      </div>

      {!started && (
        <button className={styles.start} onClick={() => setStarted(true)}>
          click to start
        </button>
      )}
    </main>
  );
}
