import { useEffect, useRef, useState } from "react";
import type { Lang, Playing } from "./audio";
import { IndexList } from "./IndexList";
import { Info } from "./Info";
import { Title } from "./Title";
import type { Entry } from "./words";
import styles from "./page.module.css";

// The row of rectangles at the top left: the title (paper), INFO (ink) and INDEX (gray).
// Clicking one unfolds a block of the same colour from under it toward the middle of the
// screen: the title opens a short "about", INFO the background, INDEX the word list. One open at a time; click the tab again, click anywhere outside the
// block, or press Esc to fold it back. The page keeps floating words out of this row.

type Tab = "about" | "info" | "index";

// What the piece is, and who made it.
function About() {
  return (
    <div className={styles.about}>
      <p className={styles.aboutLead}>臺韓對話 · 대한 대화 — Same Letters, Two Voices</p>
      <p lang="zh-Hant">臺語和韓語有數百個詞以相同的漢字書寫，跨越千年仍彼此呼應。在這裡，它們是可以拖曳、甩動、聆聽的方塊。名字本身也是一對：臺韓對話，臺語唸 Tâi-Hân Tuì-uē，韓語唸 대한 대화。偶爾「對」會變成「佳」——佳話，一個近乎押韻的偽友。</p>
      <p lang="ko">대만어와 한국어에는 같은 한자로 쓰는 말이 수백 개 있고, 천 년을 건너 지금도 서로의 소리를 닮아 있습니다. 여기서 그 말들은 끌고, 튕기고, 들을 수 있는 블록이 됩니다. 이름도 한 쌍입니다: 臺韓對話는 대만어로 Tâi-Hân Tuì-uē, 한국어로 대한 대화. 가끔 ‘對’가 ‘佳(가화)’로 바뀝니다.</p>
      <p lang="en">The name is itself a pair: 臺韓對話, “a Taiwan–Korea dialogue”, read Tâi-Hân Tuì-uē in Taiwanese and Dae-han Dae-hwa in Korean. Now and then 對 (dialogue) slips into 佳 (a fine story) and cracks back.</p>
      <dl>
        <dt>Project</dt>
        <dd>Mini Project [ID412] Interactive Space</dd>
        <dt>Created by</dt>
        <dd>Yin Jie Chen · 진윤제 · 陳胤傑</dd>
        <dd>
          Research Intern [at]{" "}
          <a href="https://visual-instruments.kaist.ac.kr/" target="_blank" rel="noreferrer">
            KAIST Visual Instruments Lab
          </a>
        </dd>
        <dd>Exchange Student [from] NTUST · Taiwan Tech</dd>
        <dt>Data</dt>
        <dd>教育部《臺灣台語常用詞辭典》《重編國語辭典修訂本》 · 국립국어원《한국어기초사전》 · Lingua Libre</dd>
      </dl>
    </div>
  );
}

type Props = {
  playing: Playing;
  muted: boolean;
  onPlay: (entry: Entry, lang: Lang) => void;
};

export function Menu(props: Props) {
  const [open, setOpen] = useState<Tab | null>(null);
  const [closing, setClosing] = useState<Tab | null>(null); // still on screen, folding away
  const timer = useRef(0);

  // Fold the open block back (the animation runs, then it is removed), optionally opening another.
  const switchTo = (next: Tab | null) => {
    if (open) {
      setClosing(open);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setClosing(null), 450);
    }
    setOpen(next);
  };
  const close = () => open && switchTo(null);

  useEffect(() => {
    // Re-subscribed every render, so `close` always sees the current tab.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  useEffect(() => () => clearTimeout(timer.current), []); // on unmount only

  const tab = (id: Tab, title: string, sub: string, content: React.ReactNode) => (
    <div className={`${styles.tab} ${id === "info" ? styles.tabInfo : styles.tabIndex}`}>
      <button className={styles.tabLabel} onClick={() => switchTo(open === id ? null : id)} aria-expanded={open === id}>
        <span>{title}</span>
        <span>{sub}</span>
      </button>
      {(open === id || closing === id) && <div className={`${styles.tabBody} ${open === id ? "" : styles.tabBodyClosing}`}>{content}</div>}
    </div>
  );

  return (
    <nav className={styles.menu} aria-label="臺韓對話 · INFO · INDEX" data-menu>
      {open && <div className={styles.backdrop} onClick={close} />}
      <div className={`${styles.tab} ${styles.tabTitle}`}>
        <button className={styles.tabLabel} onClick={() => switchTo(open === "about" ? null : "about")} aria-expanded={open === "about"}>
          <span>
            <Title />
          </span>
          <span>대한 대화</span>
        </button>
        {(open === "about" || closing === "about") && (
          <div className={`${styles.tabBody} ${open === "about" ? "" : styles.tabBodyClosing}`}>
            <About />
          </div>
        )}
      </div>
      {tab("info", "INFO", "說明 · 정보", <Info />)}
      {tab("index", "INDEX", "索引 · 색인", <IndexList {...props} />)}
    </nav>
  );
}
