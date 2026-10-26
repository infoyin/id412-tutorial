# Time Interval

A screen full of abstract clocks. Each clock sweeps smoothly from 1 to 9 as a growing wedge, goes blank for one step (the void), and repeats; neighbouring clocks are one step apart, so the count ripples diagonally across the page. A panel at the bottom picks the clock and background colours.

- Route: /experiments/w1/time-interval
- Week: W1 · Tech: React state + requestAnimationFrame, SVG, CSS Modules
- Inputs: time, two colour pickers (window size sets how many clocks)
- Parameters: STEPS (10 = 1–9 + void), STEP_TIME (400 ms), CELL_SIZE (110 px)

## How it works
- One `requestAnimationFrame` loop sets `time` (in steps, with fractions) every frame; every clock reads from it.
- Each clock's phase is `(time - (row + col)) % STEPS`: 0–9 draws a wedge of phase/9 of the circle plus a hand, 9–10 is the void.
- The grid fills the window above the panel: columns and rows come from the window size ÷ CELL_SIZE, recomputed on resize.
- The colour pickers set a `--clock` CSS variable and the background; the SVG strokes and fills use `var(--clock)`.

## Run
pnpm dev → open /experiments/w1/time-interval

## Status / next
Works. Next: other offsets (random, spiral), or a speed slider in the panel.
