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
      <p className={styles.aboutLead}>臺韓對話 · 대한 대화 · Taiwan–Korea Dialogue</p>
      <p lang="zh-Hant">
        臺灣台語與韓語分屬不同語系，卻因歷史上的漢字文化交流，在許多詞彙中留下共通的漢字來源與部分相近的聲音。
      </p>
      <p lang="zh-Hant">
        在《臺韓對話》中，詞語化為可以拖曳、甩動、連結與聆聽的幾何物件。當兩種語言相遇，原本分離的輪廓逐漸連結、凝聚成形。對話，也可能成為一段佳話。
      </p>
      <p lang="ko">
        대만 민난어(臺灣台語)와 한국어는 서로 다른 어족에 속하지만, 한자 문화권의 역사적 교류를 통해 일부 단어에서 공통된 한자와 비슷한 소리를 발견할 수 있습니다.
      </p>
      <p lang="ko">
        이 작품에서 단어들은 잡고, 흔들고, 연결하고, 들을 수 있는 기하학적 오브제가 됩니다. 두 언어가 만나면 흩어져 있던 윤곽이 연결되고 하나의 형태로 응집됩니다. 서로 다른 소리가 만나 하나의 이야기가 됩니다.
      </p>
      <p lang="en">
        Taiwanese Hokkien and Korean belong to different language families, yet centuries of linguistic and cultural exchange have left traces of shared Chinese-character origins and phonetic similarities.
      </p>
      <p lang="en">
        In Taiwan–Korea Dialogue, words become geometric objects to grab, shake, connect, and hear. As two languages meet, separate outlines converge into solid forms. A dialogue becomes a story worth sharing.
      </p>
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
        <dt>Source</dt>
        <dd>
          <a href="https://www.sinica.edu.tw/cp/695" target="_blank" rel="noreferrer">陳彥伶〈語言親緣關係常見的幾個迷思〉中央研究院</a>
        </dd>
        <dd>
          <a href="https://tdr.lib.ntu.edu.tw/handle/123456789/52032" target="_blank" rel="noreferrer">申祐先《韓國漢字音歷史層次研究》臺大 2015</a>
        </dd>
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
