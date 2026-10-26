# Video

A 5×5 grid of the same YouTube video, filling the whole screen, all playing muted from 8:50.

- Route: /experiments/w1/video
- Week: W1 · Tech: YouTube iframe embed, CSS grid, CSS Modules
- Inputs: none yet
- Parameters: VIDEO_ID, START (530 s), GRID (5)

## How it works
- One embed URL: `youtube.com/embed/<id>?start=530&autoplay=1&mute=1&loop=1&playlist=<id>&controls=0`.
- Browsers only autoplay muted video, so `mute=1` is required; `loop` needs `playlist` set to the same id.
- The page is a fixed full-screen CSS grid, GRID columns × GRID rows, one `<iframe>` per cell.

## Run
pnpm dev → open /experiments/w1/video

## Status / next
Works. 25 embeds are heavy to load. Next: offset each cell's start time, or unmute the cell under the mouse.
