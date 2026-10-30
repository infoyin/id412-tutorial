"use client";

import { Canvas } from "@react-three/fiber";
import { useState } from "react";
import { Blocks, type Throw } from "./Blocks";
import { POEMS, type Poem } from "./poems";
import { Temple } from "./Temple";
import styles from "./page.module.css";

// 擲筊 + 求籤. Throw the two moon blocks until you get 聖筊 (one flat, one round side up);
// then a temple door opens and a fortune stick rises with its poem.

const MEANING: Record<Throw, string> = {
  聖筊: "一平一凸 · 神明應允",
  笑筊: "兩面皆平 · 神明一笑，再擲一次",
  陰筊: "兩面皆凸 · 神明不允，再擲一次",
};

const DOOR_DELAY = 1600; // ms between 聖筊 and the door

export default function JiaobeiFortune() {
  const [throws, setThrows] = useState<Throw[]>([]);
  const [poem, setPoem] = useState<Poem | null>(null);
  const last = throws[throws.length - 1];

  const onResult = (t: Throw) => {
    setThrows((list) => [...list, t]);
    if (t === "聖筊") setTimeout(() => setPoem(POEMS[Math.floor(Math.random() * POEMS.length)]), DOOR_DELAY);
  };

  const again = () => {
    setThrows([]);
    setPoem(null);
  };

  return (
    <main className={styles.root}>
      <Canvas
        className={styles.canvas}
        flat
        dpr={[1, 2]}
        camera={{ position: [0, 4.2, 5.6], fov: 40 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, -0.6)}
      >
        <color attach="background" args={["#fff"]} />
        <fog attach="fog" args={["#fff", 6, 15]} />
        <gridHelper args={[30, 20, "#d8d8d8", "#d8d8d8"]} />
        <Blocks enabled={last !== "聖筊"} onResult={onResult} />
      </Canvas>

      <h1 className={styles.title}>擲筊 · 求籤</h1>

      {last && (
        <div key={throws.length} className={styles.result}>
          <strong>{last}</strong>
          <span>
            第 {throws.length} 擲 · {MEANING[last]}
          </span>
        </div>
      )}

      <p className={styles.hint}>按住滑鼠拿起筊 → 往前甩 → 放開</p>

      {poem && <Temple poem={poem} onAgain={again} />}
    </main>
  );
}
