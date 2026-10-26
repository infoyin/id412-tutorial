# Video

A 3×3 square grid of the same YouTube video, centred on the screen. Each cell starts after its own random delay and from a slightly different second around 0:41, so the 9 videos never line up.

- Route: /experiments/w1/video
- Week: W1 · Tech: YouTube iframe embed, CSS grid, CSS Modules
- Inputs: none yet
- Parameters: VIDEO_ID, START (41 s), GRID (3), MIN_DELAY–MAX_DELAY (0.1–6 s), START_JITTER (4 s)

## How it works
- One embed URL: `youtube.com/embed/<id>?start=41&autoplay=1&mute=1&loop=1&playlist=<id>&controls=0`.
- Browsers only autoplay muted video, so `mute=1` is required; `loop` needs `playlist` set to the same id.
- On load each cell picks a random delay (MIN_DELAY–MAX_DELAY) and start (START minus up to START_JITTER); a `setTimeout` per cell swaps its black placeholder for the iframe when the delay is up.
- The grid is a square, `min(100vw, 100vh)` on each side, centred; GRID columns × GRID rows, one `<iframe>` per cell.

## Run
pnpm dev → open /experiments/w1/video

## Status / next
Works.  Next: unmute the cell under the mouse. Note: when a cell loops it restarts from 0:00, not from START.
