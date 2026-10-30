import type { Lang, Playing } from "./audio";
import type { Entry } from "./words";
import { SIZE } from "./settings";
import { Zhuyin } from "./Zhuyin";
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
  dark: boolean;
  playing: Playing;
  koreanVoice: boolean | null; // null = not known yet
  announce: string;
  pairs: Entry[];
  onToggleSound: () => void;
  onToggleDark: () => void;
  scale: number;
  onScale: (scale: number) => void;
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

// Sound on/off and light/dark as small icons, bottom right.
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" stroke="none" />
      {on ? (
        <>
          <path d="M15.5 9c1.2 1.2 1.2 4.8 0 6" />
          <path d="M18.5 6.5c2.6 2.6 2.6 8.4 0 11" />
        </>
      ) : (
        <path d="M16 9l6 6M22 9l-6 6" />
      )}
    </svg>
  );
}

function ThemeIcon({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      {dark ? (
        <>
          <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M12 2.5v2.5" transform={`rotate(${a} 12 12)`} />
          ))}
        </>
      ) : (
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" stroke="none" />
      )}
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
      <p className={`${styles.intro} ${p.started ? styles.faded : ""}`}>
        <span lang="ko">단어를 끌어 짝을 찾고, 왼쪽 바퀴를 당기거나 세게 튕기거나 눌러 보세요.</span>
        <span lang="zh-Hant">拖動詞語尋找配對；拉動、用力甩或點擊左邊的輪盤。</span>
        <span lang="en">Drag words to their pairs; pull, fling or click the wheel.</span>
      </p>

      {/* Block size: + on top, − below, a short vertical bar between. */}
      <div className={styles.sizeBar} data-size-bar>
        <button onClick={() => p.onScale(p.scale + 0.1)} aria-label="bigger · 크게 · 放大" disabled={p.scale >= SIZE.max}>
          +
        </button>
        <input
          type="range"
          min={SIZE.min}
          max={SIZE.max}
          step={SIZE.step}
          value={p.scale}
          onChange={(e) => p.onScale(Number(e.target.value))}
          aria-label="block size · 크기 · 大小"
        />
        <button onClick={() => p.onScale(p.scale - 0.1)} aria-label="smaller · 작게 · 縮小" disabled={p.scale <= SIZE.min}>
          −
        </button>
      </div>

      <div className={styles.toggles}>
        <button onClick={p.onToggleDark} aria-label={p.dark ? "light mode · 淺色 · 라이트 모드" : "dark mode · 深色 · 다크 모드"} title={p.dark ? "淺色 · 라이트" : "深色 · 다크"}>
          <ThemeIcon dark={p.dark} />
        </button>
        <button onClick={p.onToggleSound} aria-pressed={!p.muted} aria-label={p.muted ? "sound off · 靜音 · 소리 끔" : "sound on · 聲音 · 소리 켬"} title={p.muted ? "靜音 · 소리 끔" : "聲音 · 소리 켬"}>
          <SoundIcon on={!p.muted} />
        </button>
      </div>

      <p className={styles.live} aria-live="polite">
        {p.announce}
      </p>

      {p.open && e && (
        <section
          key={e.id}
          className={`${styles.note} ${p.place.wide ? styles.noteCentered : styles.noteBelow}`}
          style={p.place.wide ? { left: p.place.left, top: p.place.top } : { top: p.place.top }}
        >
          <p className={styles.status}>
            {e.status === "false_friend" ? "≠ 偽友 · 가짜 친구 · false friend" : `● 辭典對應 · 사전 대응 · dictionary matched — ${e.category}`}
          </p>
          <p className={styles.hanja} lang="zh-Hant">
            <Zhuyin text={e.hanja} zhuyin={e.taiwanese.zhuyin} />
          </p>

          <div className={styles.columns}>
            <button className={`${styles.word} ${isPlaying("tw") ? styles.wordOn : ""}`} onClick={() => p.onPlay(e, "tw")} disabled={p.muted} aria-label={`臺語 ${e.taiwanese.written} ${e.taiwanese.tailo} — play`}>
              <small>臺語 · 대만어 · Taiwanese</small>
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

          {e.status === "false_friend" ? (
            <div className={styles.trap}>
              <p>同樣的漢字，不同的意思 · 같은 한자, 다른 뜻</p>
              <p lang="zh-Hant">
                <b>臺 {e.hanja}</b> — {e.falseFriend?.twEnglish}　{e.taiwanese.definition || `與華語「${e.hanja}」同義`}
              </p>
              <p lang="ko">
                <b>한 {e.korean.hangul}</b> — {e.korean.english}　{e.korean.definition}
              </p>
              {e.falseFriend && (
                <>
                  <p lang="ko">→ {e.falseFriend.why.ko}</p>
                  <p lang="zh-Hant">→ {e.falseFriend.why.zh}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className={styles.meaning}>
                {e.korean.english} <small>· 臺語・韓語同義 · 같은 뜻</small>
              </p>
              <p className={styles.small} lang="zh-Hant">
                臺語：{e.taiwanese.definition || `臺華共同詞，與華語「${e.hanja}」同義`} — 教育部辭典
              </p>
              <p className={styles.small} lang="ko">
                「{e.korean.definition}」 — 한국어기초사전
              </p>
            </>
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

          <p className={styles.credits}>
            <a href={e.taiwanese.url} target="_blank" rel="noreferrer">
              教育部辭典 ↗
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
