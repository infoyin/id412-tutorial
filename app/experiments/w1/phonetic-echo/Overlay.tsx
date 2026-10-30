import { useState } from "react";
import { PAIRS, type Pair } from "./words";
import styles from "./page.module.css";

// The HTML layer over the canvas: title, one short instruction (Korean first, then 中文 and English),
// what a revealed pair shares, sources, and a keyboard fallback that only shows when focused.

type Props = {
  started: boolean;
  revealed: Pair | null;
  onPullPair: (i: number) => void;
};

export function Overlay({ started, revealed, onPullPair }: Props) {
  const [sources, setSources] = useState(false);

  return (
    <>
      <header className={styles.title}>
        <span>PHONETIC ECHO</span>
        <span lang="zh-Hant">臺灣台語 ↔ 한국어</span>
      </header>

      <p className={`${styles.intro} ${started ? styles.faded : ""}`}>
        <span lang="ko">단어를 잡고, 소리의 연결을 발견해 보세요.</span>
        <span lang="zh-Hant">抓住一個詞，找出聲音的連結。</span>
        <span lang="en">Grab a word and find where the sounds meet.</span>
      </p>

      <section className={styles.reveal} aria-live="polite">
        {revealed && (
          <div key={revealed.id} className={styles.revealInner}>
            <p className={styles.hanja} lang="zh-Hant">
              {revealed.hanja}
            </p>
            <p className={styles.caption}>
              <span lang="ko">같은 한자</span> · <span lang="zh-Hant">共同的漢字</span> · <span lang="en">shared characters</span>
            </p>

            <div className={styles.sounds}>
              <div>
                <small>台語 · 대만어 · Taiwanese</small>
                <strong lang="nan-Latn" className={styles.latin}>
                  {revealed.taiwanese.tailo}
                </strong>
              </div>
              <div>
                <small>한국어 · 韓語 · Korean</small>
                <strong lang="ko">
                  {revealed.korean.hangul} [{revealed.korean.pronunciation}]
                </strong>
                <em>{revealed.korean.romanization}</em>
              </div>
            </div>

            <p className={styles.note} lang="ko">
              {revealed.note.ko}
            </p>
            <p className={styles.noteSmall} lang="zh-Hant">
              {revealed.note.zh}
            </p>
            <p className={styles.noteSmall} lang="en">
              {revealed.note.en}
            </p>

            <p className={styles.definition}>
              <span lang="ko">「{revealed.korean.definition}」</span> — 한국어기초사전 · {revealed.gloss.zh} · {revealed.gloss.en}
            </p>

            <p className={styles.audioLine}>
              <span>♪ 台語錄音 · 教育部《臺灣台語常用詞辭典》</span>
              <a href={revealed.korean.source} target="_blank" rel="noreferrer">
                한국어 발음은 사전에서 듣기 ↗
              </a>
            </p>
          </div>
        )}
      </section>

      {/* Keyboard fallback: invisible until a key moves focus here. */}
      <nav className={styles.keys} aria-label="Pairs · 짝 · 配對">
        {PAIRS.map((p, i) => (
          <button key={p.id} onClick={() => onPullPair(i)}>
            {p.taiwanese.written} · {p.korean.hangul}
          </button>
        ))}
      </nav>

      <button className={styles.sourcesToggle} onClick={() => setSources(!sources)} aria-expanded={sources}>
        sources · 출처 · 來源
      </button>

      {sources && (
        <aside className={styles.sources}>
          <p>
            <a href="https://sutian.moe.edu.tw/" target="_blank" rel="noreferrer">
              教育部《臺灣台語常用詞辭典》
            </a>
            <br />
            台語詞形、台羅與錄音 · CC BY-ND 3.0 TW · 錄音未經修改
          </p>
          <p>
            <a href="https://krdict.korean.go.kr/" target="_blank" rel="noreferrer">
              국립국어원 《한국어기초사전》
            </a>
            <br />
            한국어 표기·발음·뜻풀이 · CC BY-SA 2.0 KR · 녹음은 포함하지 않음
          </p>
          <p>
            Sound notes, glosses and romanization of Hangul are ours. Checked 2026-10-30.
            <br />
            <span lang="ko">같은 한자를 쓴다고 해서 발음·뜻·역사가 같은 것은 아닙니다.</span>
            <br />
            <span lang="zh-Hant">共用漢字，不代表發音、意思或歷史相同。</span>
            <br />
            <span lang="en">Shared characters do not mean the same sound, meaning or history.</span>
          </p>
          <p>Keyboard: Tab → choose a pair · 키보드: Tab · 鍵盤：Tab</p>
        </aside>
      )}
    </>
  );
}
