# Phonetic Echo

A black-and-white typographic field: Taiwanese and Korean words that share Chinese characters (感謝 / 감사) float as outlined paper blocks. Drag a word to its partner: they attract, resonate, dock and fill black, and the Taiwanese recording plays. A paper wheel half-hidden on the left edge controls the field: pull it down and everything falls; click it and it opens into a comparison wheel.

- Route: /experiments/w1/phonetic-echo
- Week: W1 · Tech: Canvas 2D + HTML overlay
- Inputs: drag words, drag/click the wheel, keyboard (Tab, Enter, ↑↓, Esc)
- Parameters (`settings.ts`): driftSpeed, gravityStrength (live: wheel pull), magneticStrength (live: drag speed), connectionDistance, solidityProgress

## How it works
- `physics.ts`: blocks with position, velocity, angle, spin. Home spring + drift, wheel gravity (each block feels it with its own lag), air drag, box collisions, partner attraction. Stages: approach (dashed line) → resonance (double rule, echo outline, hanja on the Korean block) → docked, filling black. A hard flick undocks.
- `wheel.ts`: drag down = gravity (up = lift), springs back, gravity fades slowly. Click = comparison mode: outer ring Taiwanese, inner ring Korean, the sector at the ◀ is selected.
- `draw.ts` draws the field, `Overlay.tsx` the title, instruction, sound toggle, annotation, keyboard controls. `audio.ts`: Taiwanese recording, then Korean if one exists; mutable.
- `words.ts`: 5 verified pairs (float in the field) + 12 candidates (on the wheel only, marked ○).
- `check-candidates.mjs`: looks up new pairs in both dictionaries → JSON. `node app/experiments/w1/phonetic-echo/check-candidates.mjs 電話:전화`. Found in both ≠ verified: a person still compares meanings.

## Sources
- 教育部《臺灣台語常用詞辭典》 https://sutian.moe.edu.tw/, CC BY-ND 3.0 TW: Tâi-lô, recordings (unmodified, `public/experiments/w1/phonetic-echo/audio/`).
- 국립국어원《한국어기초사전》 https://krdict.korean.go.kr/, CC BY-SA 2.0 KR: pronunciation, definitions. Korean recordings not bundled: each file's license is set separately and none is stated, so the annotation links to the entry.
- Ours: English/中文 meanings, sound notes, Hangul romanization.

## Run
pnpm dev → open /experiments/w1/phonetic-echo

## Status / next
Works with mouse and keyboard. Next: compare the 12 candidates by hand and promote them; Korean audio once a license is confirmed.
