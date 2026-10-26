# Time Interval

A screen full of neon clocks. Each clock sweeps smoothly from 1 to 9, goes blank for one step (the void), and repeats; neighbouring clocks are one step apart, so the count ripples diagonally across the page. Kaonashi (No-Face) drifts after the mouse and swallows the clocks near its mask. Images mode swaps each clock for a random time picture (hourglass, alarm clock, calendar, moon…), a new one after every void. Captcha mode turns borders and digits into warped, scratched captcha shapes. A floating panel picks colours, glow, layout, size, speed, line and warp.

- Route: /experiments/w1/time-interval
- Week: W1 · Tech: React state + requestAnimationFrame, SVG, Canvas, CSS Modules
- Inputs: time, mouse position and speed, the panel
- Parameters: DEFAULTS (colours, glow, size, speed, line, face, layout, kaonashi, captcha, warp) and IMAGES in `page.tsx`; FOLLOW, LEAN, FADE_SPEED in `Kaonashi.tsx`

## How it works
- One `requestAnimationFrame` loop in `page.tsx` advances `time` (in steps, with fractions); every clock reads from it.
- Each clock's phase is `(time - offset) % STEPS`: 0–9 is drawn, 9–10 is the void. Grid offset is `row + col`; Random scatters it.
- `Kaonashi.tsx` is a see-through canvas over the clocks with its own loop (copied from `../simple-kaonashi`): the body eases toward the mouse, leans into the motion, and fades when the mouse moves fast.
- Each frame Kaonashi writes its mask position into the `ghost` ref; the page copies it into state, and clocks within `reach` shrink and fade (`eaten`, 0–1).
- Images: 10 SVGs in `public/experiments/w1/time-interval/`, listed in `IMAGES`. Each is a CSS `mask-image` over a block of `var(--clock)`, so it takes the clock colour and glow. `noise(seed, cycle)` picks the picture and tilt; it grows in on 1 and shrinks on 9. Add your own by dropping a file there and adding its name.
- Captcha (`captcha.ts`): wobbly double border and two scratch lines per clock, digits tilted/skewed in a random font (new look per digit), and an SVG `feTurbulence` + `feDisplacementMap` filter (`Warp`) bending the clock layer. Shapes come from `noise(seed, n)`, so they hold still between frames.
- Neon is two `drop-shadow` filters on the clock layer; the body's rim uses the same clock colour.

## Run
pnpm dev → open /experiments/w1/time-interval

## Status / next
Works. Next: swallowed clocks stop counting and catch up when Kaonashi leaves.
