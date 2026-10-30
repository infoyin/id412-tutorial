import type { Entry } from "./words";
import styles from "./page.module.css";

// The HTML layer over the canvas: a small title, one instruction (한국어 · 中文 · English),
// the sound toggle, the annotation beside the open wheel, and keyboard-only controls.

type Props = {
  started: boolean;
  open: boolean;
  entry: Entry;
  place: { left: number; top: number; wide: boolean }; // where the annotation sits
  muted: boolean;
  announce: string; // last connected pair, for screen readers
  pairs: Entry[]; // verified pairs, for the keyboard fallback
  onToggleSound: () => void;
  onPlay: (entry: Entry) => void;
  onStep: (delta: number) => void;
  onOpen: () => void;
  onClose: () => void;
  onBringTogether: (pair: number) => void;
};

export function Overlay(p: Props) {
  const e = p.entry;
  const verified = e.status === "verified";

  return (
    <>
      <header className={styles.title}>
        <i className={styles.bar} />
        <span>PHONETIC ECHO</span>
        <span>臺灣台語 ↔ 한국어</span>
      </header>

      <p className={`${styles.intro} ${p.started ? styles.faded : ""}`}>
        <span lang="ko">단어를 끌어 짝을 찾고, 왼쪽 바퀴를 당기거나 눌러 보세요.</span>
        <span lang="zh-Hant">拖動詞語尋找配對；拉動或點擊左邊的輪盤。</span>
        <span lang="en">Drag words to their pairs; pull or click the wheel.</span>
      </p>

      <button className={styles.sound} onClick={p.onToggleSound} aria-pressed={!p.muted}>
        {p.muted ? "○ sound off · 소리 끔 · 靜音" : "● sound on · 소리 켬 · 聲音"}
      </button>

      <p className={styles.live} aria-live="polite">
        {p.announce}
      </p>

      {p.open && (
        <section
          key={e.id}
          className={`${styles.note} ${p.place.wide ? "" : styles.noteBelow}`}
          style={p.place.wide ? { left: p.place.left, top: p.place.top } : { top: p.place.top }}
          aria-live="polite"
        >
          <p className={styles.status}>
            {verified ? "● verified · 已查證 · 확인됨 · " + e.checked : "○ candidate · 待查證 · 확인 필요"}
          </p>
          <p className={styles.hanja} lang="zh-Hant">
            {e.hanja}
          </p>

          <div className={styles.columns}>
            <div>
              <small>台語 · 대만어 · Taiwanese</small>
              <strong className={styles.latin} lang="nan-Latn">
                {e.taiwanese.tailo ?? "—"}
              </strong>
            </div>
            <div>
              <small>한국어 · 韓語 · Korean</small>
              <strong lang="ko">
                {e.korean.hangul}
                {e.korean.pronunciation && ` [${e.korean.pronunciation}]`}
              </strong>
              <em>{e.korean.romanization}</em>
            </div>
          </div>

          <p className={styles.meaning}>
            {e.meaning.zh} · {e.meaning.en}
          </p>
          {e.korean.definition && (
            <p className={styles.small} lang="ko">
              「{e.korean.definition}」 — 한국어기초사전
            </p>
          )}
          {e.note && (
            <>
              <p className={styles.soundNote} lang="ko">
                {e.note.ko}
              </p>
              <p className={styles.small} lang="zh-Hant">
                {e.note.zh}
              </p>
              <p className={styles.small} lang="en">
                {e.note.en}
              </p>
            </>
          )}
          {e.uncertainty && <p className={styles.small}>? {e.uncertainty}</p>}

          <p className={styles.links}>
            {e.taiwanese.audio && (
              <button onClick={() => p.onPlay(e)} disabled={p.muted}>
                ▶ 台語
              </button>
            )}
            {e.taiwanese.source && (
              <a href={e.taiwanese.source} target="_blank" rel="noreferrer">
                辭典 ↗
              </a>
            )}
            {e.korean.source && (
              <a href={e.korean.source} target="_blank" rel="noreferrer">
                사전 · 발음 듣기 ↗
              </a>
            )}
          </p>

          <p className={styles.links}>
            <button onClick={() => p.onStep(-1)}>↑ 前 · 이전</button>
            <button onClick={() => p.onStep(1)}>↓ 後 · 다음</button>
            <button onClick={p.onClose}>× 返回 · 돌아가기</button>
          </p>
        </section>
      )}

      {/* Keyboard fallback: invisible until a key moves focus here. */}
      <nav className={styles.keys} aria-label="Phonetic Echo">
        <button onClick={p.onOpen}>○ 對照 · 비교 · compare</button>
        {p.pairs.map((pair, i) => (
          <button key={pair.id} onClick={() => p.onBringTogether(i)}>
            {pair.taiwanese.written} · {pair.korean.hangul}
          </button>
        ))}
      </nav>
    </>
  );
}
