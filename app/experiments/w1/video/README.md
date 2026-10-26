# Video

A 5×5 grid of the same YouTube video, filling the whole screen. Each cell starts after its own random delay and from a slightly different second around 8:50, so the 25 screams never line up.

- Route: /experiments/w1/video
- Week: W1 · Tech: YouTube iframe embed, CSS grid, CSS Modules
- Inputs: none yet
- Parameters: VIDEO_ID, START (530 s), GRID (5), MAX_DELAY (12 s), START_JITTER (4 s)

## How it works
- One embed URL: `youtube.com/embed/<id>?start=530&autoplay=1&mute=1&loop=1&playlist=<id>&controls=0`.
- Browsers only autoplay muted video, so `mute=1` is required; `loop` needs `playlist` set to the same id.
- On load each cell picks a random delay (0–MAX_DELAY) and start (START minus up to START_JITTER); a `setTimeout` per cell swaps its black placeholder for the iframe when the delay is up.
- The page is a fixed full-screen CSS grid, GRID columns × GRID rows, one `<iframe>` per cell.

## Run
pnpm dev → open /experiments/w1/video

## Status / next
Works. 25 embeds are heavy to load. Next: unmute the cell under the mouse. Note: when a cell loops it restarts from 0:00, not from START.
