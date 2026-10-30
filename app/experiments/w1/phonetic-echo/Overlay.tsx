import type { Lang, Playing } from "./audio";
import type { Entry } from "./words";
import styles from "./page.module.css";

// The HTML layer over the canvas: a small title, one instruction (한국어 · 中文 · English),
// the sound toggle, the annotation beside the open wheel, and keyboard-only controls.
// In the annotation each word is itself the play button: click 時間 to hear Taiwanese,
// click 시간 to hear Korean, as often as you like.

type Props = {
  started: boolean;
  open: boolean;
  entry: Entry | null;
  place: { left: number; top: number; wide: boolean };
  muted: boolean;
  playing: Playing;
  koreanVoice: boolean | null; // null = not known yet
  announce: string;
  pairs: Entry[];
  onToggleSound: () => void;
  onPlay: (entry: Entry, lang: Lang) => void;
  onStep: (delta: number) => void;
  onOpen: () => void;
  onClose: () => void;
  onShuffle: () => void;
  onBringTogether: (i: number) => void;
};

function Speaker({ active }: { active: boolean }) {
  return (
    <svg className={`${styles.speaker} ${active ? styles.speakerOn : ""}`} viewBox="0 0 20 16" aria-hidden>
      <path d="M2 5h3l4-3v12l-4-3H2z" fill="currentColor" />
      <path d="M12 5c1 .8 1 5.2 0 6" />
      <path d="M14.5 3c2 1.6 2 8.4 0 10" />
    </svg>
  );
}

export function Overlay(p: Props) {
  const e = p.entry;
  const isPlaying = (lang: Lang) => !!e && p.playing?.id === e.id && p.playing.lang === lang;

  let koreanSource = "";
  if (e?.korean.audio) koreanSource = `녹음 · ${e.korean.audio.author.replace(/^Speaker: /, "").split(" Recorder")[0]} · ${e.korean.audio.license} · Lingua Libre`;
  else if (p.koreanVoice === false) koreanSource = "이 브라우저에 한국어 음성이 없습니다 · no Korean voice in this browser";
  else koreanSource = "음성 합성 · 語音合成 · speech synthesis (ko-KR)";

  return (
    <>
      <header className={styles.title}>
        <i className={styles.bar} />
        <span>PHONETIC ECHO</span>
        <span>臺灣台語 ↔ 한국어</span>
      </header>

      <p className={`${styles.intro} ${p.started ? styles.faded : ""}`}>
        <span lang="ko">단어를 끌어 짝을 찾고, 왼쪽 바퀴를 당기거나 세게 튕기거나 눌러 보세요.</span>
        <span lang="zh-Hant">拖動詞語尋找配對；拉動、用力甩或點擊左邊的輪盤。</span>
        <span lang="en">Drag words to their pairs; pull, fling or click the wheel.</span>
      </p>

      <button className={styles.sound} onClick={p.onToggleSound} aria-pressed={!p.muted}>
        {p.muted ? "○ sound off · 소리 끔 · 靜音" : "● sound on · 소리 켬 · 聲音"}
      </button>

      <p className={styles.live} aria-live="polite">
        {p.announce}
      </p>

      {p.open && e && (
        <section
          key={e.id}
          className={`${styles.note} ${p.place.wide ? "" : styles.noteBelow}`}
          style={p.place.wide ? { left: p.place.left, top: p.place.top } : { top: p.place.top }}
        >
          <p className={styles.status}>
            ● 辭典對應 · 사전 대응 · dictionary matched — {e.category}
          </p>
          <p className={styles.hanja} lang="zh-Hant">
            {e.hanja}
          </p>

          <div className={styles.columns}>
            <button className={`${styles.word} ${isPlaying("tw") ? styles.wordOn : ""}`} onClick={() => p.onPlay(e, "tw")} disabled={p.muted} aria-label={`台語 ${e.taiwanese.written} ${e.taiwanese.tailo} — play`}>
              <small>台語 · 대만어 · Taiwanese</small>
              <strong lang="zh-Hant">
                {e.taiwanese.written} <Speaker active={isPlaying("tw")} />
              </strong>
              <em className={styles.latin} lang="nan-Latn">
                {e.taiwanese.tailo}
              </em>
            </button>
            <button className={`${styles.word} ${isPlaying("ko") ? styles.wordOn : ""}`} onClick={() => p.onPlay(e, "ko")} disabled={p.muted} aria-label={`한국어 ${e.korean.hangul} — play`}>
              <small>한국어 · 韓語 · Korean</small>
              <strong lang="ko">
                {e.korean.hangul} <Speaker active={isPlaying("ko")} />
              </strong>
              <em lang="ko">[{e.korean.pronunciation}]</em>
            </button>
          </div>
          {p.muted && <p className={styles.small}>○ sound off · 소리 끔 · 靜音</p>}

          <p className={styles.meaning}>{e.korean.english}</p>
          <p className={styles.small} lang="ko">
            「{e.korean.definition}」 — 한국어기초사전
          </p>
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

          <p className={styles.credits}>
            <a href={e.taiwanese.url} target="_blank" rel="noreferrer">
              教育部台語辭典 ↗
            </a>{" "}
            CC BY-ND 3.0 TW ·{" "}
            <a href={e.korean.url} target="_blank" rel="noreferrer">
              한국어기초사전 ↗
            </a>{" "}
            CC BY-SA 2.0 KR
            <br />
            {e.korean.audio ? (
              <a href={e.korean.audio.source} target="_blank" rel="noreferrer">
                {koreanSource} ↗
              </a>
            ) : (
              koreanSource
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
        <button onClick={p.onShuffle}>⇣ 換詞 · 새 단어 · new words</button>
        {p.pairs.map((pair, i) => (
          <button key={pair.id} onClick={() => p.onBringTogether(i)}>
            {pair.taiwanese.written} · {pair.korean.hangul}
          </button>
        ))}
      </nav>
    </>
  );
}
