"use client";

import { useState } from "react";
import { ALIASES, DISHES, MOODS, type Dish } from "./dishes";
import styles from "./page.module.css";

// "What should I eat?" — type a mood, a reel of dishes slides past and stops on one.
// The background is the whole menu, drifting in rows behind a liquid-glass panel.

// ---- Edit these to change how it behaves. ----
const CARD = 104; // px, one reel card incl. gap (match .card + gap in the CSS)
const SPIN_CARDS = 30; // how many dishes slide past before the pick
const SPIN_TIME = 3.2; // seconds the reel slides
const ROWS = 9; // background rows
// -----------------------------------------------

const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const PHOTOS = "/experiments/w1/coolshit/";
const PLACEHOLDER: Dish = { name: "?", ko: "", photo: "", where: "", tags: [] };

// Dishes that fit what was typed: all words if possible, else any word, else everything.
function match(mood: string) {
  const words = mood.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (words.length === 0) return DISHES;
  const fits = (d: Dish, w: string) =>
    d.tags.includes(ALIASES[w] ?? w) || d.name.toLowerCase().includes(w) || d.ko.includes(w);
  const all = DISHES.filter((d) => words.every((w) => fits(d, w)));
  if (all.length) return all;
  const any = DISHES.filter((d) => words.some((w) => fits(d, w)));
  return any.length ? any : DISHES;
}

export default function WhatToEat() {
  const [mood, setMood] = useState("");
  const [reel, setReel] = useState<Dish[]>([PLACEHOLDER]);
  const [x, setX] = useState(CARD); // strip offset; CARD centres card 0 in a 3-card window
  const [sliding, setSliding] = useState(false);
  const [result, setResult] = useState<Dish | null>(null);

  const spin = (text: string) => {
    if (sliding) return;
    const pool = match(text);
    const winner = random(pool);
    const current = reel[reel.length - 3] ?? reel[0]; // the dish showing now
    // [left neighbour, current, ...passing dishes, winner, right neighbours]
    const strip = [random(DISHES), current];
    for (let i = 0; i < SPIN_CARDS; i++) strip.push(random(pool.length > 4 ? pool : DISHES));
    strip.push(winner, random(DISHES), random(DISHES));

    // Jump back to the current dish without animation, then slide to the winner.
    setResult(null);
    setSliding(false);
    setReel(strip);
    setX(0); // card 1 (the current dish) centred
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setSliding(true);
        setX(CARD - (strip.length - 3) * CARD);
      }),
    );
  };

  const onDone = () => {
    setSliding(false);
    setResult(reel[reel.length - 3]);
  };

  return (
    <main className={styles.root}>
      <div className={styles.wall} aria-hidden>
        {Array.from({ length: ROWS }, (_, r) => {
          // Each row is the menu rotated a bit, twice, so it can loop seamlessly.
          const row = [...DISHES.slice(r * 7 % DISHES.length), ...DISHES.slice(0, r * 7 % DISHES.length)];
          return (
            <div
              key={r}
              className={styles.row}
              style={{ animationDuration: `${80 + r * 9}s`, animationDirection: r % 2 ? "reverse" : "normal" }}
            >
              {[...row, ...row].map((d, i) => (
                <img key={i} className={styles.tile} src={PHOTOS + d.photo} alt="" />
              ))}
            </div>
          );
        })}
      </div>

      <section className={styles.glass}>
        <h1 className={styles.title}>What should I eat?</h1>
        <p className={styles.sub}>KAIST · Daejeon</p>

        <div className={styles.window}>
          <div
            className={styles.strip}
            style={{
              transform: `translateX(${x}px)`,
              transition: sliding ? `transform ${SPIN_TIME}s cubic-bezier(0.1, 0.7, 0.15, 1)` : "none",
            }}
            onTransitionEnd={onDone}
          >
            {reel.map((d, i) => (
              <div key={i} className={styles.card}>
                {d.photo ? <img src={PHOTOS + d.photo} alt={d.name} /> : "?"}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.result}>
          {result ? (
            <div className={styles.pick}>
              <strong>{result.name}</strong> <span>{result.ko}</span>
              <small>📍 {result.where}</small>
            </div>
          ) : (
            <small>{sliding ? "choosing…" : "Tell me your mood"}</small>
          )}
        </div>

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            spin(mood);
          }}
        >
          <input
            className={styles.input}
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="lunch, korean, spicy…"
          />
          <button className={styles.button} disabled={sliding}>
            Pick
          </button>
        </form>

        <div className={styles.chips}>
          {MOODS.map((m) => (
            <button
              key={m}
              className={styles.chip}
              disabled={sliding}
              onClick={() => {
                setMood(m);
                spin(m);
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
