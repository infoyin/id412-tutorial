import styles from "./page.module.css";

// Characters with Mandarin 注音 stacked to the right of each one, as on the blocks:
// tone marks ˊˇˋ beside the last symbol, the neutral tone ˙ above. Sized from the font size.
export function Zhuyin({ text, zhuyin }: { text: string; zhuyin: string[] | null }) {
  if (!zhuyin) return <>{text}</>;
  return (
    <span className={styles.zy}>
      {[...text].map((char, i) => {
        const z = zhuyin[i] ?? "";
        const tone = z.match(/[ˊˇˋ]/)?.[0];
        return (
          <span key={i} className={styles.zyPair}>
            <span>{char}</span>
            <span className={styles.zyMarks} aria-hidden>
              {z.startsWith("˙") && <i className={styles.zyLight}>˙</i>}
              {[...z.replace(/[ˊˇˋ˙]/g, "")].map((s, k) => (
                <i key={k}>{s}</i>
              ))}
              {tone && <i className={styles.zyTone}>{tone}</i>}
            </span>
          </span>
        );
      })}
    </span>
  );
}
