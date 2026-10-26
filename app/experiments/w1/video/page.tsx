import styles from "./page.module.css";

// A 5×5 grid of the same YouTube video, filling the whole screen.
const VIDEO_ID = "1SwA46-lSWk";
const START = 530; // seconds into the video (the &t=530s in the link)
const GRID = 5; // 5 × 5 cells

// autoplay only works when muted; loop needs playlist set to the same video.
const src = `https://www.youtube.com/embed/${VIDEO_ID}?start=${START}&autoplay=1&mute=1&loop=1&playlist=${VIDEO_ID}&controls=0`;

export default function Video() {
  const cells = Array.from({ length: GRID * GRID }, (_, i) => i);

  return (
    <main className={styles.container} style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
      {cells.map((i) => (
        <iframe
          key={i}
          className={styles.cell}
          src={src}
          title={`Video ${i + 1}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ))}
    </main>
  );
}
