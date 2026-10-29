# What Should I Eat? (coolshit)

Type a mood (breakfast, korean, spicy, dessert…) and a reel of dishes slides through a liquid-glass panel, then stops on a suggestion from the KAIST main campus cafeterias or nearby Daejeon spots. Behind it, the whole menu drifts in rows.

- Route: /experiments/w1/coolshit
- Week: W1 · Tech: React + CSS
- Inputs: typed mood, or a mood chip
- Parameters: CARD, SPIN_CARDS, SPIN_TIME, ROWS (top of `page.tsx`)

## How it works
- `dishes.ts` is the menu: name, Korean name, emoji (the "image"), where to get it, tags. `ALIASES` maps typed words (mexico, 한식, coffee) to tags.
- `match()` keeps dishes that fit every typed word, else any word, else the whole menu.
- The reel is one long row of cards. `spin()` builds it (current dish, 30 random, winner), jumps to the start, then a CSS `transition` on `translateX` slides to the winner; `onTransitionEnd` shows the result.
- The glass is `backdrop-filter: blur() saturate()` plus white borders and inset highlights.
- Background rows are the menu doubled, moved by a CSS `translateX(-50%)` loop.

## Run
pnpm dev → open /experiments/w1/coolshit

## Status / next
Works. Places are approximate (KAIMARU N11, West W2, East E5, Eoeun-dong, Gung-dong) — check them against the real weekly menu. Next: real food photos in `public/experiments/w1/coolshit/`, and a better name.
