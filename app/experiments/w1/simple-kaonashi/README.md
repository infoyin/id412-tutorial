# Simple Kaonashi

Kaonashi (No-Face) stands in a dark room and drifts after your mouse. Its eyes look at the cursor, its head leans into the motion, and it fades when you move fast; hold still and it comes back. Bring the cursor close to the mask and it whispers "ah… ah…".

- Route: /experiments/w1/simple-kaonashi
- Week: W1 · Tech: Canvas
- Inputs: mouse position, mouse speed, time
- Parameters: FOLLOW, LEAN, FADE_SPEED, NEAR, MARK_COLOR (top of `page.tsx`)

## How it works
- One `requestAnimationFrame` loop: update, then draw background, body, mask, text, cursor.
- The body's x eases toward the mouse (`FOLLOW`); the change per frame becomes the head's lean.
- Mouse speed is smoothed each frame; faster → lower `globalAlpha`, so the body fades.
- The mask's eyes and mouth shift a little toward the cursor's direction (`atan2`).
- The body is two bezier curves plus a wavy hem from `Math.sin(time)`, filled with a gradient that fades to the floor.

## Run
pnpm dev → open /experiments/w1/simple-kaonashi

## Status / next
Works. Next: "Scary Kaonashi" — the mouth opens and it grows when the cursor gets close.
