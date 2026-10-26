# Time Interval

A screen full of neon clocks. Each clock sweeps smoothly from 1 to 9, goes blank for one step (the void), and repeats; neighbouring clocks are one step apart, so the count ripples diagonally across the page. A floating panel at the bottom picks colours, neon glow, and wedge or numeral clocks.

- Route: /experiments/w1/time-interval
- Week: W1 · Tech: React state + requestAnimationFrame, SVG, CSS Modules
- Inputs: time, the panel (colour swatches + pickers, neon slider, wedges/numerals button)
- Parameters: STEPS (10 = 1–9 + void), STEP_TIME (400 ms), CELL_SIZE (110 px), NEON_COLORS

## How it works
- One `requestAnimationFrame` loop sets `time` (in steps, with fractions) every frame; every clock reads from it.
- Each clock's phase is `(time - (row + col)) % STEPS`: 0–9 is drawn, 9–10 is the void.
- `WedgeClock` fills phase/9 of the circle; `NumeralClock` shows the digit 1–9 with a dot running round the rim once per digit.
- Colour sets a `--clock` CSS variable used by every stroke and fill. Neon is two `drop-shadow` filters on the whole grid, sized by the slider (0 = off).
- The grid fills the window above the panel; columns and rows come from the window size ÷ CELL_SIZE, recomputed on resize.

## Run
pnpm dev → open /experiments/w1/time-interval

## Status / next
Works. Next: a speed slider, or a pulsing glow that beats with the count.
