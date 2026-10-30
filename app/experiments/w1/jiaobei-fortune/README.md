# Jiaobei Fortune (擲筊 · 求籤)

Two white 3D moon blocks (筊) on a white floor, drawn in black lines. Hold the mouse to pick them up, flick forward, let go. Throw until 聖筊 (one flat, one round side up); then a temple door swings open and a fortune stick rises out of its tube, followed by its poem.

- Route: /experiments/w1/jiaobei-fortune
- Week: W1 · Tech: Three.js (+ CSS animation for the door)
- Inputs: mouse press, drag speed, release
- Parameters: SIZE, BEND, GRAVITY, BOUNCE, THROW (top of `Blocks.tsx`); DOOR_DELAY (`page.tsx`)

## How it works
- `Blocks.tsx` builds one block from a half sphere + flat cap, squashed and bent into a crescent; black lines come from drei `Edges`, `Outlines` and three contour rings.
- While held, the blocks follow the mouse on a plane above the floor. On release, the speed of the last 100 ms becomes the throw speed and spin.
- The face each block lands on (flat or round up) is random, decided at release. A hand-made loop does gravity and bounces, and after the first bounce eases the block onto that face.
- When both stop: 聖筊 / 笑筊 / 陰筊 goes up to `page.tsx`. On 聖筊, `Temple.tsx` mounts and plays the door → stick → poem sequence, all CSS animation delays.
- `poems.ts`: six placeholder 籤詩 written for this prototype, not from a real temple.

## Run
pnpm dev → open /experiments/w1/jiaobei-fortune

## Status / next
Prototype, works end to end. Rough: the flight is not real physics (no block-on-block collisions), outlines are thin. Next: a second 擲筊 to confirm the stick, as in a real temple.
