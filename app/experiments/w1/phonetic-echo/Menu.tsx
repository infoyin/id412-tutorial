import { useEffect, useState } from "react";
import type { Lang, Playing } from "./audio";
import { IndexList } from "./IndexList";
import { Info } from "./Info";
import type { Entry } from "./words";
import styles from "./page.module.css";

// The row of rectangles at the top left: the title (paper), INFO (ink) and INDEX (gray).
// Clicking INFO or INDEX grows it down into a tall block of the same colour; INDEX also widens
// to the right so the word list can spread out in columns. One open at a time; click the tab
// again or press Esc to fold it back.

type Tab = "info" | "index";

type Props = {
  playing: Playing;
  muted: boolean;
  onPlay: (entry: Entry, lang: Lang) => void;
};

export function Menu(props: Props) {
  const [open, setOpen] = useState<Tab | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tab = (id: Tab, title: string, sub: string, content: React.ReactNode) => (
    <div className={`${styles.tab} ${id === "info" ? styles.tabInfo : styles.tabIndex} ${open === id ? styles.tabOpen : ""}`}>
      <button className={styles.tabLabel} onClick={() => setOpen(open === id ? null : id)} aria-expanded={open === id}>
        <span>{title}</span>
        <span>{sub}</span>
      </button>
      {open === id && <div className={styles.tabBody}>{content}</div>}
    </div>
  );

  return (
    <nav className={styles.menu} aria-label="PHONETIC ECHO · INFO · INDEX">
      <div className={`${styles.tab} ${styles.tabTitle}`}>
        <div className={styles.tabLabel}>
          <span>PHONETIC ECHO</span>
          <span>臺語 ↔ 한국어</span>
        </div>
      </div>
      {tab("info", "INFO", "說明 · 정보", <Info />)}
      {tab("index", "INDEX", "索引 · 색인", <IndexList {...props} />)}
    </nav>
  );
}
