# Time Interval

A screen full of abstract clocks. Each clock counts 1 to 9 as a growing white wedge, goes blank for one step (the void), and repeats; neighbouring clocks are one step apart, so the count ripples diagonally across the page.

- Route: /experiments/w1/time-interval
- Week: W1 · Tech: React state + setInterval, SVG, CSS Modules
- Inputs: time only (window size sets how many clocks)
- Parameters: STEPS (10 = 1–9 + void), INTERVAL (400 ms), CELL_SIZE (110 px)

## How it works
- One `setInterval` adds 1 to `tick`; every clock reads from it.
- Each clock's step is `(tick - (row + col)) % STEPS`: 0 is the void, 1–9 draw a wedge of step/9 of the circle plus a hand.
- The grid fills the window: columns and rows come from `innerWidth/innerHeight ÷ CELL_SIZE`, recomputed on resize.
- Clocks are SVG (circle face, wedge path, hand line), styled in `page.module.css`.

## Run
pnpm dev → http://localhost:3000/experiments/w1/time-interval

## Status / next
Works. Next: other offsets (random, spiral), or let the mouse speed up nearby clocks.
