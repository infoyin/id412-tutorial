# Phonetic Echo

Taiwanese and Korean words that share Chinese characters (感謝 / 감사) float in a dark field. Grab one and carry it to its partner: the closer they get, the more they vibrate, glow and connect; when they meet they settle side by side, a ripple spreads, the Taiwanese recording plays, and what they share is revealed in Korean, 中文 and English.

- Route: /experiments/w1/phonetic-echo
- Week: W1 · Tech: Canvas 2D + HTML overlay, Web Audio
- Inputs: mouse position and speed, press-drag-release; Tab + Enter as a keyboard fallback
- Parameters (`settings.ts`): magneticStrength, resonanceIntensity, driftSpeed, connectionDistance, typographicScale. Live: magneticStrength grows with pointer speed; resonanceIntensity follows pair proximity and is boosted while dragging.

## How it works
- `field.ts`: word physics. Drift, cursor pull, words pushing apart, partner attraction (stronger while one is carried), spring-follow for the held word, reveal and separate.
- `draw.ts`: motion trails (fade instead of clear), dotted line + particles between partners, ripples, words with glow and shake, Tâi-lô, film grain.
- `Overlay.tsx`: title, one instruction, the revealed pair, sources, and pair buttons that only appear when tabbed to.
- `audio.ts`: dictionary recordings played unmodified, plus one original synthesized drone that follows resonance. Silent until the first gesture.
- `words.ts`: the dataset: 時間, 感謝, 結婚, 學生, 文化. Every entry was checked on 2026-10-30.
- Reduced motion: slower drift, no shake, wobble or trails.

## Sources
- Taiwanese forms, Tâi-lô, recordings (`public/experiments/w1/phonetic-echo/audio/`): 教育部《臺灣台語常用詞辭典》 https://sutian.moe.edu.tw/, CC BY-ND 3.0 TW. Recordings are unmodified.
- Korean forms, pronunciation, definitions: 국립국어원《한국어기초사전》 https://krdict.korean.go.kr/, CC BY-SA 2.0 KR. The 문화 definition is the first sentence only.
- Ours: glosses, sound notes, Revised Romanization of Hangul.

## Run
pnpm dev → open /experiments/w1/phonetic-echo

## Status / next
Works end to end with mouse and keyboard. Korean recordings are not included: krdict sets the license of each audio file separately and none is stated, so the reveal links to the dictionary entry instead. Next: more verified pairs, and Korean audio once a license is confirmed.
