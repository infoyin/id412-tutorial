# 臺韓對話 · 대한 대화 (Daehan Daehwa)

A black-and-white typographic field of Taiwanese and Korean words that share Chinese characters (感謝 / 감사), as outlined paper blocks. Drag a word to its partner: they attract, resonate, dock, fill black and are pronounced (Taiwanese, then Korean). The paper wheel at the left edge drives the field: drag it for gravity, fling it to scatter everything and bring new words, click it for the comparison wheel, where each word can be replayed. One or two pairs in each set are false friends (新聞 news / 신문 newspaper): they resonate like partners, then crack apart, hatched, with both meanings shown (12 s, and again on hover; also in the comparison wheel). Title, INFO and INDEX tabs at the top left: a short history with diagrams, and the full numbered word list in category columns with a details pane. Bottom right: light/dark and sound icons (`theme.ts` holds the canvas colours, CSS variables the rest).

- Route: /experiments/w1/phonetic-echo
- Week: W1 · Tech: Canvas 2D + HTML overlay, Web Speech API
- Inputs: drag words; drag / fling / click the wheel; keyboard (Tab, Enter, ↑↓, Esc)
- Parameters (`settings.ts`): gravityStrength ← wheel drag distance · flingImpulse ← wheel release speed (> flingSpeed 1500 px/s) · angularMomentum (wheel spin, block spin) · magneticStrength ← word drag speed · settlingDamping (drops at a fling, eases back)

## How it works
- `physics.ts`: blocks with position, velocity, angle, spin. Weightless by default: each block drifts in its own slowly turning direction (`driftSpeed`), reflecting off edges and the wheel; wheel gravity, damping, box collisions, partner attraction only while dragging. Fling = impulse away from the wheel; old pairs fly out and fade, the next set flies in from the edges (`transitionSeconds`).
- `wheel.ts`: drag = gravity, fling (speed over the last 100 ms, cooldown 2.5 s), click (< 6 px) = open. Open = wheel + annotation centred as one group.
- `words.ts`: loads `vocabulary.json`; `Rotation` picks 6–10 pairs per set, mixing categories, avoiding recent ones.
- Approaching partners are joined by a bridge: the outline around both blocks, thin at first and filling out as they meet, with stripes flowing inward; the hum, portal and crack sounds are synthesized live in `audio.ts` (original, not speech).
- More synthesized sounds: gear ticks as the wheel turns, a charge while it is pulled down, a burst on a fling, a knock and whoosh when a block is grabbed, dragged or thrown.
- Bottom right: a compass button turns 3D on (`cube.ts`: each block becomes a white box cut into three slices that twist now and then, turning toward the cursor like a camera); a size bar (+ / −) scales blocks and text up to 1.6×; fewer pairs are shown when bigger (`pairCount`, `SIZE` in `settings.ts`). Top right: light/dark and sound icons.
- Typefaces (`fonts.ts`, open-source Google Fonts linked in `layout.tsx`): Noto Sans/Serif TC+KR, LXGW WenKai TC + Gowun Batang, Chiron Hei HK + Gothic A1, Inter for romanization. The weight grows as a pair comes together (light while floating, heaviest once connected). Aa (or F) switches style; blocks flip over one by one.
- ⊞ (or G): the field becomes a Swiss grid, pairs side by side; again to scatter. ⧉ (or P, top right): a 3:4 poster of the field with the pairs connected this session (`poster.ts`).
- Top right: a clock (`Clock.tsx`) alternating every 6 s between Taipei time (🇹🇼 2026.10.31（六）11:32:54 AM) and Seoul time in Korean (🇰🇷 2026.10.31 (토) 오후 12:32:54).
- `particles.ts`: quiet background motes (specks and tiny 注音/한글 letters) that drift, part around the cursor, fall with the wheel, scatter on a fling and burst where a pair connects.
- Listen mode: long-press the wheel (an ear appears in its hub). A word plays, Taiwanese or Korean; click the block you heard. Right: a ring, the portal sound, both readings, next word. Wrong: it shakes and replays; after two misses the answer glows. Click the wheel to replay, long-press or Esc to leave.
- Autoplay: after `autoplayAfter` (15 s) with no input the piece plays itself every 4.5 s (pairs connect, the wheel spins, grid and 3D come and go, a fling). Any input stops it and restores grid / 3D.
- `audio.ts`: one voice at a time. Taiwanese = MOE recording. Korean = Lingua Libre recording if any, else browser `ko-KR` speech synthesis (never another language's voice). Mute stops both.
- Blocks: Taiwanese words carry Mandarin 注音 beside each character (from the MOE revised Mandarin dictionary, by whole word so polyphones are right) and Tâi-lô below; Korean words carry Revised Romanization (`romanize.ts`, from krdict's pronunciation). Click a block to hear it.
- Clicking the title opens a short About (ID412 Interactive Space mini project, credits). INFO fits one screen: text in three columns, the letter charts in a strip on the right. `Zhuyin.tsx` shows 注音 beside characters in the HTML (comparison note, INDEX details).
- `letters.ts` + `Info.tsx`: INFO also covers the history of 注音 and 한글, with clickable charts of the 40 Hangul letters and the 37 注音 symbols + tones (browser speech synthesis).
- `draw.ts`, `Overlay.tsx`: drawing; title, instruction, sound toggle, annotation (click a word to hear it).
- `Menu.tsx` (tabs), `Info.tsx` (history, sources, three diagrams; the ending chart -m→ㅁ, -t→ㄹ… is counted live from the usable pairs), `IndexList.tsx` (520 rows: meanings, examples, both pronunciations).

## Vocabulary data
`build-vocabulary.py` (offline, standard library) matches 教育部《臺灣台語常用詞辭典》 `kautian.ods` against the 《한국어기초사전》 full JSON download by identical characters, using Unicode Unihan to compare krdict's Chinese translations. `dictionary_matched` needs evidence on both sides; the rest is `candidate`. Nothing is `editor_reviewed`. Run without arguments to see the inputs. Current: 4038 forms, 1863 dictionary_matched, 491 usable (`vocabulary.json`; Korean level 초급/중급, any level for food), 3547 others in `vocabulary-candidates.json`. `ASSISTANT_COMPARED` lists pairs whose two definitions the AI assistant compared and found equal (counts as evidence, not a human review). `fetch-korean-audio.mjs` gets the Lingua Libre recordings (20 words). Optional 5th input `dict-revised.json` (g0v/moedict-data, MOE 重編國語辭典修訂本, CC BY-ND 3.0 TW) adds 注音. `false-friends.json`: 29 pairs chosen by the AI assistant from both dictionaries' definitions (`FALSE_FRIENDS` in the build script), not human-reviewed.

## Sources
Research: 陳彥伶〈語言親緣關係常見的幾個迷思：兼論語言與方言〉, Academia Sinica (https://www.sinica.edu.tw/cp/695) — Taiwanese and Korean are unrelated; the likeness is borrowing plus similar syllable structure. 申祐先《韓國漢字音歷史層次研究》, NTU PhD 2015 (https://tdr.lib.ntu.edu.tw/handle/123456789/52032) — Sino-Korean readings are mainly Middle Chinese, with older and later layers.
Taiwanese text and recordings: MOE, CC BY-ND 3.0 TW (recordings unmodified, `public/…/audio/tw/`). Korean text: 국립국어원, CC BY-SA 2.0 KR. Korean recordings: Lingua Libre (`korean-audio.json`, CC0 / CC BY-SA 4.0). krdict's own recordings are not used: their license is not stated.

## Run
pnpm dev → open /experiments/w1/phonetic-echo

## Status / next
Works; checked in Chrome. Limits: Korean speech depends on the browser having a Korean voice; only 20 words have a human Korean recording; pairs are not human-reviewed.
