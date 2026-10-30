import { useEffect, useState } from "react";
import type { Lang, Playing } from "./audio";
import { IndexList } from "./IndexList";
import { Info } from "./Info";
import { ENTRIES, type Entry } from "./words";
import styles from "./page.module.css";

// Two rectangular tabs at the top: INFO (black) and INDEX (gray). Clicking one grows it down
// into a tall block of the same colour, with its content inside. One open at a time;
// click the tab again or press Esc to fold it back.

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
    <nav className={styles.menu} aria-label="INFO / INDEX">
      {tab("info", "INFO", "說明 · 정보", <Info />)}
      {tab("index", "INDEX", `索引 · 색인 ${ENTRIES.length}`, <IndexList {...props} />)}
    </nav>
  );
}
