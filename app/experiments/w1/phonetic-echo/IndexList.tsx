import { useState } from "react";
import type { Lang, Playing } from "./audio";
import { ENTRIES, FALSE_FRIENDS, type Entry } from "./words";
import { Zhuyin } from "./Zhuyin";
import styles from "./page.module.css";

// INDEX: categories first (tabs, like INFO, and tiles before one is chosen). Choosing one shows
// its numbered rows (001. 時間 · 시간 →) in columns. Clicking a row lays a translucent sheet over
// the list, like the comparison wheel, with the word's meanings, examples and two
// pronunciations. Click outside it or × to go back to the list.

const CATEGORIES: [string, string][] = [
  ["everyday", "日常 · 일상 · Everyday"],
  ["time & space", "時空 · 시공간 · Time & Space"],
  ["family", "家庭 · 가족 · Family"],
  ["emotions", "情感 · 감정 · Emotions"],
  ["food", "飲食 · 음식 · Food"],
  ["nature", "自然 · 자연 · Nature"],
  ["education", "教育 · 교육 · Education"],
  ["technology", "科技 · 기술 · Technology"],
  ["society", "社會文化 · 사회 문화 · Society"],
  ["abstract", "抽象 · 추상 · Abstract"],
];

// Numbered once, in the order shown.
const GROUPS = [
  ...CATEGORIES.map(([key, name]) => ({ key, name, entries: ENTRIES.filter((e) => e.category === key).sort((a, b) => a.hanja.localeCompare(b.hanja)) })),
  { key: "false friends", name: "≠ 偽友 · 가짜 친구 · False friends", entries: FALSE_FRIENDS },
];
const NUMBER = new Map<string, number>();
GROUPS.flatMap((g) => g.entries).forEach((e, i) => NUMBER.set(e.id, i + 1));
// ALL comes first in the tabs and tiles: every word, in number order.
const TABS = [{ key: "all", name: "ALL · 全部 · 전체", entries: GROUPS.flatMap((g) => g.entries) }, ...GROUPS];

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
      <p className={styles.detailHanja}>
        <Zhuyin text={e.hanja} zhuyin={e.taiwanese.zhuyin} />
      </p>
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
      {e.falseFriend && (
        <div className={styles.trap}>
          <p>≠ 偽友 · 가짜 친구 · false friend</p>
          <p>
            <b>臺</b> {e.falseFriend.twEnglish} · <b>한</b> {e.korean.english}
          </p>
          <p lang="ko">→ {e.falseFriend.why.ko}</p>
          <p lang="zh-Hant">→ {e.falseFriend.why.zh}</p>
        </div>
      )}
      <dl>
        <dt>臺語 解說</dt>
        <dd>{e.taiwanese.definition || `臺華共同詞：與華語「${e.hanja}」同義`}</dd>
        <dt>한국어 뜻풀이</dt>
        <dd>{e.korean.definition}</dd>
        <dt>English</dt>
        <dd>{e.falseFriend ? `臺 ${e.falseFriend.twEnglish} · 한 ${e.korean.english}` : `${e.korean.english} — 臺語・韓語同義 · 같은 뜻`}</dd>
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
  const [group, setGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const current = TABS.find((g) => g.key === group);

  return (
    <div className={`${styles.indexLayout} ${selected ? styles.indexLayoutOpen : ""}`}>
      <div className={styles.indexTabs} role="tablist">
        {TABS.map((g) => (
          <button
            key={g.key}
            role="tab"
            aria-selected={g.key === group}
            onClick={() => {
              setGroup(g.key);
              setSelected(null);
            }}
          >
            {g.name} <small>{g.entries.length}</small>
          </button>
        ))}
      </div>

      {current ? (
        <ul key={current.key} className={`${styles.index} ${styles.indexColumns}`}>
          {current.entries.map((e) => (
            <li key={e.id}>
              <button className={`${styles.row} ${selected?.id === e.id ? styles.rowOn : ""}`} onClick={() => setSelected(e)}>
                <span className={styles.num}>{String(NUMBER.get(e.id)).padStart(3, "0")}.</span>
                <span className={styles.rowWord}>
                  {e.hanja} {e.status === "false_friend" ? "≠" : "·"} {e.korean.hangul}
                </span>
                <span>→</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.indexTiles}>
          {TABS.map((g) => (
            <button key={g.key} onClick={() => setGroup(g.key)}>
              <b>{g.name}</b>
              <span>{g.entries.length}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className={styles.indexSheet} onClick={() => setSelected(null)}>
          {/* key: a new word re-mounts the box, so its entrance animation plays again */}
          <div className={styles.indexSheetCard} onClick={(ev) => ev.stopPropagation()} aria-live="polite">
            <button className={styles.indexClose} onClick={() => setSelected(null)} aria-label="close · 닫기 · 關閉">
              ×
            </button>
            <Detail key={selected.id} e={selected} {...props} />
          </div>
        </div>
      )}
    </div>
  );
}
