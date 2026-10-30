import { useState } from "react";
import { speakLetter } from "./audio";
import { HANGUL, TONES, ZHUYIN, type Letter } from "./letters";
import { ENTRIES } from "./words";
import styles from "./page.module.css";

// INFO: text in three columns, then the two clickable letter charts side by side below it
// (注音 on the left, 한글 on the right).
// The ending chart is counted from our own pairs; population and vocabulary figures are cited.

// Taiwanese syllable ending (tone marks removed): m n ng p t k h, or "" for an open syllable.
function twFinal(syllable: string) {
  const s = syllable.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/nn$/, "");
  if (s.endsWith("ng")) return "ng";
  const c = s.slice(-1);
  return "mnptkh".includes(c) ? c : "";
}

// Korean final consonant (batchim) of one Hangul syllable, "" for none.
const BATCHIM = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const koFinal = (syllable: string) => BATCHIM[(syllable.charCodeAt(0) - 0xac00) % 28] ?? "";

// For each Taiwanese ending, which Korean endings the same characters have, across all pairs.
function countFinals() {
  const table: Record<string, Record<string, number>> = {};
  for (const e of ENTRIES) {
    const tw = e.taiwanese.tailo.split("/")[0].split("-");
    const ko = [...e.korean.hangul];
    if (tw.length !== ko.length) continue;
    tw.forEach((syllable, i) => {
      const t = twFinal(syllable);
      if (!["m", "n", "ng", "p", "t", "k"].includes(t)) return;
      table[t] ??= {};
      const k = koFinal(ko[i]) || "∅";
      table[t][k] = (table[t][k] ?? 0) + 1;
    });
  }
  return ["m", "n", "ng", "p", "t", "k"].map((t) => {
    const counts = Object.entries(table[t] ?? {}).sort((a, b) => b[1] - a[1]);
    const total = counts.reduce((s, [, n]) => s + n, 0);
    return { t, total, counts };
  });
}

const FILLS = [styles.fillBlack, styles.fillHatch, styles.fillDots, styles.fillWhite];

// A 100% bar from labelled parts, with a legend.
function Bar({ parts }: { parts: { label: string; value: number }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <>
      <div className={styles.bar100}>
        {parts.map((p, i) => (
          <i key={p.label} className={FILLS[i % FILLS.length]} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className={styles.legend}>
        {parts.map((p, i) => (
          <li key={p.label}>
            <i className={FILLS[i % FILLS.length]} />
            <span>{p.label}</span>
            <b>{p.value}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

// A grid of letters; clicking one says it.
function Letters({ letters, language, playing, onPlay }: { letters: Letter[]; language: "ko" | "zh"; playing: string; onPlay: (l: Letter) => void }) {
  return (
    <div className={styles.letters}>
      {letters.map((l) => (
        <button
          key={l.letter}
          className={playing === l.letter ? styles.letterOn : ""}
          onClick={() => {
            onPlay(l);
            speakLetter(l.speak, language);
          }}
          aria-label={`${l.letter} ${l.label}`}
        >
          <b>{l.letter}</b>
          <small>{l.label}</small>
        </button>
      ))}
    </div>
  );
}

export function Info() {
  const finals = countFinals();
  const [playing, setPlaying] = useState(""); // last letter clicked, shown inverted
  const play = (l: Letter) => {
    setPlaying(l.letter);
    setTimeout(() => setPlaying((p) => (p === l.letter ? "" : p)), 900);
  };

  return (
    <div className={styles.info}>
      <div className={styles.infoCols}>
        <div className={styles.infoCol}>
          <section className={styles.lead}>
            <h3>● 這是什麼 · 이 사이트는</h3>
            <p lang="zh-Hant">
              臺語和韓語有許多同字、音近的詞。把方塊拖到它的另一半旁邊，兩塊會接合並唸出發音；裂開的是「偽友」：字同義不同。轉盤：拉動有重力，甩動換詞，點擊對照。
            </p>
            <p lang="ko">
              같은 한자로 쓰고 소리도 닮은 두 언어의 말들. 블록을 짝 옆으로 끌면 붙고 발음이 들립니다. 깨지면 ‘가짜 친구’입니다. 바퀴: 당기면 중력, 튕기면 새 단어, 누르면 비교.
            </p>
          </section>

          <section>
            <h3>● 臺語 · 대만어</h3>
            <p lang="zh-Hant">屬於閩南語，17 世紀起隨漳州、泉州移民來到臺灣。至今保留中古漢語的 -m、-p、-t、-k 韻尾，以及讀書的「文讀」與日常的「白話」兩套讀音。</p>
            <p lang="ko">민남어의 하나로 17세기 이주민과 함께 대만에 왔습니다. 중세 중국어의 -m, -p, -t, -k 받침과 文讀·白話 두 갈래 읽기를 지킵니다.</p>
          </section>

          <section>
            <h3>● 韓語 · 한국어</h3>
            <p lang="zh-Hant">與漢語不同語系，但從文言文借入大量漢字詞，約佔《標準國語大辭典》詞條的 58.5%。</p>
            <p lang="ko">계통은 다르지만 한문에서 한자어를 받아들여, 《표준국어대사전》 표제어의 약 58.5%가 한자어입니다.</p>
            <Bar parts={[{ label: "漢字語", value: 58.5 }, { label: "固有語", value: 25.5 }, { label: "混種語", value: 10.6 }, { label: "外來語", value: 5.4 }]} />
            <p className={styles.cite}>% · 국립국어원 분석 (세계일보 2011)</p>
          </section>

        </div>
        <div className={styles.infoCol}>
          <section>
            <h3>● 為何相像 · 왜 비슷할까</h3>
            <p lang="zh-Hant">多數學者認為，韓國漢字音和臺語文讀音都可追溯到中古漢語（約隋唐）。兩邊都保留了韻尾，-t 在韓語則規律地變成 ㄹ；華語已失去 -p、-t、-k。</p>
            <p lang="ko">한국 한자음과 대만어 文讀은 모두 중세 중국어(대략 수·당)로 거슬러 올라간다고 보는 견해가 많습니다. 둘 다 받침을 지켰고, -t는 한국어에서 ㄹ이 됩니다.</p>
            <p className={styles.chartTitle}>臺語韻尾 → 받침 · {ENTRIES.length}쌍</p>
            <div className={styles.finals}>
              {finals.map(({ t, total, counts }) => (
                <div key={t} className={styles.finalRow}>
                  <b className={styles.latin}>-{t}</b>
                  <div className={styles.bar100}>
                    {counts.slice(0, 3).map(([k, n], i) => (
                      <i key={k} className={FILLS[i]} style={{ width: `${(n / total) * 100}%` }} />
                    ))}
                  </div>
                  <span>
                    {counts[0][0]} {Math.round((counts[0][1] / total) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3>● 使用人口 · 사용 인구</h3>
            <p className={styles.chartTitle}>韓語 · 약 7,720만 명</p>
            <Bar parts={[{ label: "南韓", value: 48.4 }, { label: "北韓", value: 23.3 }, { label: "中國", value: 2.7 }, { label: "其他", value: 2.8 }]} />
            <p className={styles.cite}>백만 명 · Ethnologue (Korea Times)</p>
            <p className={styles.chartTitle}>臺灣 主要使用語言 · 주로 쓰는 언어</p>
            <Bar parts={[{ label: "華語", value: 66.3 }, { label: "臺語", value: 31.7 }, { label: "客語", value: 1.5 }, { label: "其他", value: 0.5 }]} />
            <p className={styles.cite}>% · 2020 人口及住宅普查 (The News Lens 引述)</p>
          </section>

        </div>
        <div className={styles.infoCol}>
          <section>
            <h3>● 注音符號 · 주음부호</h3>
            <p lang="zh-Hant">1913 年讀音統一會議定，1918 年公布為「注音字母」，1930 年改稱注音符號。符號取自古漢字（ㄅ←勹、ㄇ←冂），共 37 個。方塊上的注音是華語讀音；臺語拼音以 2006 年公布的臺羅為主。</p>
            <p lang="ko">1913년 독음통일회에서 정하고 1918년 ‘주음자모’로 공포, 1930년 주음부호로 이름을 바꿨습니다. 옛 한자에서 따온 37개 기호(ㄅ←勹). 블록의 주음은 표준 중국어 읽기입니다.</p>
          </section>

          <section>
            <h3>● 한글 · 韓文字母</h3>
            <p lang="zh-Hant">1443 年世宗大王創製，1446 年以《訓民正音》頒布。子音模仿發音器官（ㄱ 舌根、ㄴ 舌尖、ㅁ 嘴、ㅅ 牙、ㅇ 喉），母音由天（·）地（ㅡ）人（ㅣ）組成。</p>
            <p lang="ko">1443년 세종대왕이 만들고 1446년 《훈민정음》으로 반포했습니다. 자음은 발음 기관을, 모음은 하늘(·)·땅(ㅡ)·사람(ㅣ)을 본떴습니다. 기본 24자, 모두 40자.</p>
          </section>

          <section className={styles.sources}>
            <h3>● 出處 · 출처</h3>
            <p>
              <a href="https://sutian.moe.edu.tw/" target="_blank" rel="noreferrer">教育部臺灣台語常用詞辭典</a> ·{" "}
              <a href="https://dict.revised.moe.edu.tw/" target="_blank" rel="noreferrer">重編國語辭典修訂本</a> ·{" "}
              <a href="https://krdict.korean.go.kr/" target="_blank" rel="noreferrer">한국어기초사전</a> ·{" "}
              <a href="https://www.koreatimes.co.kr/southkorea/20140514/korean-13th-most-widely-spoken-language" target="_blank" rel="noreferrer">Korea Times</a> ·{" "}
              <a href="https://www.thenewslens.com/article/157030" target="_blank" rel="noreferrer">The News Lens</a> ·{" "}
              <a href="https://www.segye.com/newsView/20110630005004" target="_blank" rel="noreferrer">세계일보</a>
            </p>
          </section>
        </div>
      </div>

      <div className={styles.infoCharts}>
        <div>
          <h3>● 注音符號 37 · 주음부호</h3>
          <Letters letters={[...ZHUYIN, ...TONES]} language="zh" playing={playing} onPlay={play} />
          <p className={styles.cite}>點擊發音 · 누르면 들려요 · 以例字發音 (ㄅ → 玻) · 語音合成</p>
        </div>
        <div>
          <h3>● 한글 40자 · 韓文四十音</h3>
          <Letters letters={HANGUL.consonants} language="ko" playing={playing} onPlay={play} />
          <Letters letters={HANGUL.vowels} language="ko" playing={playing} onPlay={play} />
          <p className={styles.cite}>누르면 들려요 · 點擊發音 · ㄱ → 가 · ㅏ → 아 · 음성 합성</p>
        </div>
      </div>
    </div>
  );
}
