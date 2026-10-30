import { useEffect, useState } from "react";
import styles from "./page.module.css";

// The name: 臺韓對話 (Tâi-Hân Tuì-uē) · 대한 대화 (Dae-han Dae-hwa), "a Taiwan–Korea dialogue".
// Now and then 對 turns into 佳 — 佳話 (ka-uē, 가화) is "a fine story", a near-rhyme — and then
// cracks back, like the false friends in the field.
export function Title() {
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let back = 0;
    const every = window.setInterval(() => {
      setSwapped(true);
      back = window.setTimeout(() => setSwapped(false), 1800);
    }, 11000);
    return () => {
      clearInterval(every);
      clearTimeout(back);
    };
  }, []);

  return (
    <span aria-label="臺韓對話">
      臺韓
      <span key={String(swapped)} className={swapped ? styles.titleSwap : styles.titleBack}>
        {swapped ? "佳" : "對"}
      </span>
      話
    </span>
  );
}
