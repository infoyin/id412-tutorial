import { useState } from "react";
import type { Lang, Playing } from "./audio";
import { ENTRIES, FALSE_FRIENDS, type Entry } from "./words";
import styles from "./page.module.css";

// INDEX: every pair as a numbered row (001. 時間 · 시간 →), grouped by category into blocks
// that flow into columns. Click a row: its meanings, example sentences and the two
// pronunciations appear in the pane on the right. False friends are the last block.

const CATEGORIES: [string, string][] = [
  ["everyday", "日常 · 일상"],
  ["time & space", "時空 · 시공간"],
  ["family", "家庭 · 가족"],
  ["emotions", "情感 · 감정"],
  ["food", "飲食 · 음식"],
  ["nature", "自然 · 자연"],
  ["education", "教育 · 교육"],
  ["technology", "科技 · 기술"],
  ["society", "社會文化 · 사회 문화"],
  ["abstract", "抽象 · 추상"],
];

// Numbered once, in the order shown.
const GROUPS = [
  ...CATEGORIES.map(([key, name]) => ({ name, entries: ENTRIES.filter((e) => e.category === key).sort((a, b) => a.hanja.localeCompare(b.hanja)) })),
  { name: "≠ 偽友 · 가짜 친구", entries: FALSE_FRIENDS },
];
const NUMBER = new Map<string, number>();
GROUPS.flatMap((g) => g.entries).forEach((e, i) => NUMBER.set(e.id, i + 1));

type Props = {
  playing: Playing;
  muted: boolean;
  onPlay: (entry: Entry, lang: Lang) => void;
};

function Detail({ e, playing, muted, onPlay }: { e: Entry } & Props) {
  const on = (lang: Lang) => playing?.id === e.id && playing.lang === lang;
  const ex = e.taiwanese.example;
  return (
    <div className={styles.detail}>
      <p className={styles.detailNum}>{String(NUMBER.get(e.id)).padStart(3, "0")}.</p>
      <p className={styles.detailHanja}>{e.hanja}</p>
      <div className={styles.detailWords}>
        <button className={on("tw") ? styles.wordOn : ""} onClick={() => onPlay(e, "tw")} disabled={muted}>
          <small>臺語 · 대만어</small>
          <strong>{e.taiwanese.written} ▸</strong>
          <em className={styles.latin}>{e.taiwanese.tailo}</em>
        </button>
        <button className={on("ko") ? styles.wordOn : ""} onClick={() => onPlay(e, "ko")} disabled={muted}>
          <small>한국어 · 韓語</small>
          <strong>{e.korean.hangul} ▸</strong>
          <em>[{e.korean.pronunciation}]</em>
        </button>
      </div>
      {e.status === "false_friend" && (
        <p className={styles.trap}>≠ 偽友 · 가짜 친구 — 韓語辭典的中文翻譯是「{e.korean.chinese}」</p>
      )}
      <dl>
        <dt>臺語 解說</dt>
        <dd>{e.taiwanese.definition || `臺華共同詞：與華語「${e.hanja}」同義`}</dd>
        <dt>한국어 뜻풀이</dt>
        <dd>{e.korean.definition}</dd>
        <dt>English</dt>
        <dd>{e.korean.english}</dd>
        {ex && (
          <>
            <dt>臺語 例句</dt>
            <dd>
              {ex.han}
              <br />
              <span className={styles.latin}>{ex.tailo}</span>
              <br />
              {ex.zh}
            </dd>
          </>
        )}
        {e.korean.example && (
          <>
            <dt>한국어 예문</dt>
            <dd>{e.korean.example}</dd>
          </>
        )}
      </dl>
      <p className={styles.detailLinks}>
        <a href={e.taiwanese.url} target="_blank" rel="noreferrer">教育部辭典 ↗</a>
        <a href={e.korean.url} target="_blank" rel="noreferrer">기초사전 ↗</a>
      </p>
    </div>
  );
}

export function IndexList(props: Props) {
  const [selected, setSelected] = useState<Entry | null>(null);

  return (
    <div className={styles.indexLayout}>
      <div className={styles.indexColumns}>
        {GROUPS.map((g) => (
          <section key={g.name} className={styles.indexGroup}>
            <h4 className={styles.indexHead}>{g.name}</h4>
            <ul className={styles.index}>
              {g.entries.map((e) => {
                const on = selected?.id === e.id;
                return (
                  <li key={e.id}>
                    <button className={`${styles.row} ${on ? styles.rowOn : ""}`} onClick={() => setSelected(on ? null : e)} aria-pressed={on}>
                      <span className={styles.num}>{String(NUMBER.get(e.id)).padStart(3, "0")}.</span>
                      <span className={styles.rowWord}>
                        {e.hanja} {e.status === "false_friend" ? "≠" : "·"} {e.korean.hangul}
                      </span>
                      <span>→</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <aside className={styles.indexPane} aria-live="polite">
        {selected ? <Detail e={selected} {...props} /> : <p className={styles.indexHint}>點一個詞 · 단어를 고르세요 →</p>}
      </aside>
    </div>
  );
}
