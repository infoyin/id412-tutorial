import { useState } from "react";
import type { Lang, Playing } from "./audio";
import { ENTRIES, FALSE_FRIENDS, type Entry } from "./words";
import styles from "./page.module.css";

// INDEX: every pair as a numbered row (001. 時間 · 시간 →). Click a row to open it:
// meanings from both dictionaries, example sentences, and the two pronunciations.
// False friends follow in their own section.

const CATEGORY_NAMES: Record<string, string> = {
  everyday: "日常 · 일상",
  "time & space": "時空 · 시공간",
  education: "教育 · 교육",
  family: "家庭 · 가족",
  emotions: "情感 · 감정",
  society: "社會文化 · 사회 문화",
  nature: "自然 · 자연",
  technology: "科技 · 기술",
  food: "飲食 · 음식",
  abstract: "抽象 · 추상",
};

const SORTED = [...ENTRIES].sort((a, b) => a.category.localeCompare(b.category) || a.hanja.localeCompare(b.hanja));

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
      <div className={styles.detailWords}>
        <button className={on("tw") ? styles.wordOn : ""} onClick={() => onPlay(e, "tw")} disabled={muted}>
          <small>台語 · 대만어</small>
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
        <p className={styles.trap}>
          ≠ 偽友 · 가짜 친구 — 韓語辭典的中文翻譯是「{e.korean.chinese}」
        </p>
      )}
      <dl>
        <dt>台語 解說</dt>
        <dd>{e.taiwanese.definition || `臺華共同詞：與華語「${e.hanja}」同義`}</dd>
        <dt>한국어 뜻풀이</dt>
        <dd>{e.korean.definition}</dd>
        <dt>English</dt>
        <dd>{e.korean.english}</dd>
        {ex && (
          <>
            <dt>台語 例句</dt>
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
  const [openId, setOpenId] = useState<string | null>(null);
  let number = 0;
  let lastCategory = "";

  const row = (e: Entry, mark: string) => {
    number++;
    const open = openId === e.id;
    return (
      <li key={e.id}>
        <button className={`${styles.row} ${open ? styles.rowOn : ""}`} onClick={() => setOpenId(open ? null : e.id)} aria-expanded={open}>
          <span className={styles.num}>{String(number).padStart(3, "0")}.</span>
          <span className={styles.rowWord}>
            {e.hanja} {mark} {e.korean.hangul}
          </span>
          <span>{open ? "↓" : "→"}</span>
        </button>
        {open && <Detail e={e} {...props} />}
      </li>
    );
  };

  return (
    <ul className={styles.index}>
      {SORTED.map((e) => {
        const header = e.category !== lastCategory ? <li key={"h-" + e.category} className={styles.indexHead}>{CATEGORY_NAMES[e.category] ?? e.category}</li> : null;
        lastCategory = e.category;
        return [header, row(e, "·")];
      })}
      <li className={styles.indexHead}>≠ 偽友 · 가짜 친구 · {FALSE_FRIENDS.length}</li>
      {FALSE_FRIENDS.map((e) => row(e, "≠"))}
    </ul>
  );
}
