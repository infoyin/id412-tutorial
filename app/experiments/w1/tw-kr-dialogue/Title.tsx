import styles from "./page.module.css";

// The name: 臺韓對話 (Tâi-Hân Tuì-uē) · 대한 대화 (Dae-han Dae-hwa), "a Taiwan–Korea dialogue".
// Pointing at the title (or focusing it) shows the English, TW-KR DIALOGUE. Pure CSS: both are
// here and the stylesheet shows one.
export function Title() {
  return (
    <span aria-label="臺韓對話 · TW-KR Dialogue">
      <span className={styles.titleZh} aria-hidden>
        臺韓對話
      </span>
      <span className={styles.titleEn} aria-hidden>
        TW-KR DIALOGUE
      </span>
    </span>
  );
}
