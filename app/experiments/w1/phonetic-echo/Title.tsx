import { useEffect, useState } from "react";
import styles from "./page.module.css";

// The name: 臺韓對話 (Tâi-Hân Tuì-uē) · 대한 대화 (Dae-han Dae-hwa), "a Taiwan–Korea dialogue".
// Now and then it turns into its English, TW-KR DIALOGUE, for a few seconds.
export function Title() {
  const [english, setEnglish] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let back = 0;
    const every = window.setInterval(() => {
      setEnglish(true);
      back = window.setTimeout(() => setEnglish(false), 3000);
    }, 12000);
    return () => {
      clearInterval(every);
      clearTimeout(back);
    };
  }, []);

  return (
    <span key={String(english)} className={`${styles.titleName} ${english ? styles.titleEnglish : ""}`} aria-label="臺韓對話 · TW-KR Dialogue">
      {english ? "TW-KR DIALOGUE" : "臺韓對話"}
    </span>
  );
}
