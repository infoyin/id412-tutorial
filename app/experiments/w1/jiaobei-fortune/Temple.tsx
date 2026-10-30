import type { Poem } from "./poems";
import styles from "./page.module.css";

// After 聖筊: the screen turns white, a temple door appears and swings open,
// a fortune stick rises out of the tube, then its poem fades in.
// All timing is CSS animation (delays in page.module.css), nothing runs in JS.

function Door({ side }: { side: "left" | "right" }) {
  return (
    <div className={`${styles.door} ${side === "left" ? styles.doorLeft : styles.doorRight}`}>
      <div className={styles.panel}>
        {Array.from({ length: 35 }, (_, i) => (
          <i key={i} className={styles.stud} />
        ))}
      </div>
      <div className={styles.knocker} />
    </div>
  );
}

export function Temple({ poem, onAgain }: { poem: Poem; onAgain: () => void }) {
  return (
    <div className={styles.temple}>
      <div className={styles.inside}>
        <div className={styles.tube}>
          {Array.from({ length: 7 }, (_, i) => (
            <i key={i} className={styles.peek} style={{ left: 18 + i * 14, transform: `rotate(${(i - 3) * 3}deg)` }} />
          ))}
          <div className={styles.stick}>{poem.number}</div>
          <div className={styles.tubeFront}>籤</div>
        </div>

        <article className={styles.poem}>
          <h2>
            {poem.number} · {poem.luck}
          </h2>
          <p className={styles.verse}>
            {poem.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
          <p className={styles.meaning}>解曰：{poem.meaning}</p>
          <button className={styles.again} onClick={onAgain}>
            再求一次
          </button>
        </article>
      </div>

      <Door side="left" />
      <Door side="right" />
      <div className={styles.plaque}>有求必應</div>
    </div>
  );
}
