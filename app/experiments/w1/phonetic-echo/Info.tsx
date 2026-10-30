import { useState } from "react";
import { speakLetter } from "./audio";
import { HANGUL, TONES, ZHUYIN, type Letter, type Tone } from "./letters";
import { ENTRIES } from "./words";
import styles from "./page.module.css";

// INFO (a short intro lives in the About panel under the title). Two views, so neither needs
// scrolling: the languages (text in three columns) and the letters (注音 and 聲調 on the left,
// 한글 on the right, all clickable).
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

// The five tones, one card each: mark, name, example, how the pitch moves. Click to hear.
function Tones({ playing, onPlay }: { playing: string; onPlay: (l: Letter) => void }) {
  return (
    <div className={styles.tones}>
      {TONES.map((t: Tone) => (
        <button
          key={t.letter}
          className={playing === t.letter ? styles.letterOn : ""}
          onClick={() => {
            onPlay(t);
            speakLetter(t.speak, "zh");
          }}
          aria-label={`${t.name} ${t.label}`}
        >
          <b>{t.letter}</b>
          <span>
            {t.name} · {t.label}
          </span>
          <small>
            {t.zh} · {t.ko}
          </small>
          <small lang="en">{t.en}</small>
        </button>
      ))}
    </div>
  );
}

export function Info() {
  const finals = countFinals();
  const [view, setView] = useState<"text" | "letters">("text");
  const [playing, setPlaying] = useState(""); // last letter clicked, shown inverted
  const play = (l: Letter) => {
    setPlaying(l.letter);
    setTimeout(() => setPlaying((p) => (p === l.letter ? "" : p)), 900);
  };

  return (
    <div className={styles.info}>
      <div className={styles.infoViews} role="tablist">
        <button role="tab" aria-selected={view === "text"} onClick={() => setView("text")}>
          語言 · 언어 · Languages
        </button>
        <button role="tab" aria-selected={view === "letters"} onClick={() => setView("letters")}>
          字母與聲調 · 글자와 성조 · Letters & Tones
        </button>
      </div>

      {view === "text" && (
        <div className={styles.infoCols}>
          <div className={styles.infoCol}>

            <section>
              <h3>● 臺語 · 대만어 · Taiwanese</h3>
              <p lang="zh-Hant">屬於閩南語，17 世紀起隨漳州、泉州移民來到臺灣。至今保留中古漢語的 -m、-p、-t、-k 韻尾，以及讀書的「文讀」與日常的「白話」兩套讀音。</p>
              <p lang="ko">민남어의 하나로 17세기 이주민과 함께 대만에 왔습니다. 중세 중국어의 -m, -p, -t, -k 받침과 文讀·白話 두 갈래 읽기를 지킵니다.</p>
              <p lang="en">A Southern Min (Hokkien) language, brought to Taiwan by settlers from Zhangzhou and Quanzhou from the 17th century. It keeps the Middle Chinese endings -m, -p, -t, -k, and two layers of readings: literary (文讀) and colloquial (白話).</p>
            </section>

            <section>
              <h3>● 韓語 · 한국어 · Korean</h3>
              <p lang="zh-Hant">與漢語不同語系，但從文言文借入大量漢字詞，約佔《標準國語大辭典》詞條的 58.5%。</p>
              <p lang="ko">계통은 다르지만 한문에서 한자어를 받아들여, 《표준국어대사전》 표제어의 약 58.5%가 한자어입니다.</p>
              <p lang="en">Not related to Chinese, but it borrowed widely from Classical Chinese: about 58.5% of the headwords in the Standard Korean Language Dictionary are Sino-Korean.</p>
              <Bar parts={[{ label: "漢字語", value: 58.5 }, { label: "固有語", value: 25.5 }, { label: "混種語", value: 10.6 }, { label: "外來語", value: 5.4 }]} />
              <p className={styles.cite}>% · 국립국어원 분석 (세계일보 2011)</p>
            </section>


          </div>
          <div className={styles.infoCol}>
            <section>
              <h3>● 為何相像 · 왜 비슷할까 · Why they sound alike</h3>
              <p lang="zh-Hant">多數學者認為，韓國漢字音和臺語文讀音都可追溯到中古漢語（約隋唐）。兩邊都保留了韻尾，-t 在韓語則規律地變成 ㄹ；華語已失去 -p、-t、-k。</p>
              <p lang="ko">한국 한자음과 대만어 文讀은 모두 중세 중국어(대략 수·당)로 거슬러 올라간다고 보는 견해가 많습니다. 둘 다 받침을 지켰고, -t는 한국어에서 ㄹ이 됩니다.</p>
              <p lang="en">Many scholars trace both Sino-Korean readings and Taiwanese literary readings to Middle Chinese (roughly Sui–Tang). Both kept the syllable endings; Korean regularly turned -t into ㄹ (l), while Mandarin lost -p, -t, -k.</p>
              <p className={styles.chartTitle}>臺語韻尾 → 받침 · Taiwanese endings → Korean finals · {ENTRIES.length}쌍</p>
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
              <h3>● 使用人口 · 사용 인구 · Speakers</h3>
              <p className={styles.chartTitle}>韓語 · 약 7,720만 명 · Korean, about 77.2 million speakers</p>
              <Bar parts={[{ label: "南韓", value: 48.4 }, { label: "北韓", value: 23.3 }, { label: "中國", value: 2.7 }, { label: "其他", value: 2.8 }]} />
              <p className={styles.cite}>백만 명 · Ethnologue (Korea Times)</p>
              <p className={styles.chartTitle}>臺灣 主要使用語言 · 주로 쓰는 언어 · Taiwan, main language used</p>
              <Bar parts={[{ label: "華語", value: 66.3 }, { label: "臺語", value: 31.7 }, { label: "客語", value: 1.5 }, { label: "其他", value: 0.5 }]} />
              <p className={styles.cite}>% · 2020 人口及住宅普查 (The News Lens 引述)</p>
            </section>

          </div>
          <div className={styles.infoCol}>
            <section>
              <h3>● 注音符號 · 주음부호 · Bopomofo · Zhuyin</h3>
              <p lang="zh-Hant">英文 Bopomofo，取自前四個符號 ㄅㄆㄇㄈ。1913 年議定、1918 年公布，1930 年定名注音符號；37 個符號取自古漢字（ㄅ←勹）。一字由「聲母＋介音＋韻母」加聲調組成，寫在字右側：學 ㄒㄩㄝˊ。方塊上是華語讀音。</p>
              <p lang="ko">보포모포(Bopomofo)는 첫 네 기호 ㄅㄆㄇㄈ에서 온 이름. 1913년 정하고 1918년 공포, 1930년 주음부호로 정착; 37개 기호는 옛 한자에서 왔습니다(ㄅ←勹). ‘성모+개음+운모’와 성조를 글자 오른쪽에 씁니다: 學 ㄒㄩㄝˊ.</p>
              <p lang="en">Named after its first four symbols, ㄅㄆㄇㄈ (bo po mo fo). Agreed in 1913, published in 1918, named in 1930; its 37 symbols come from old character forms (ㄅ from 勹). A syllable is initial + medial + final plus a tone, written to the right of the character: 學 ㄒㄩㄝˊ. On the blocks it gives the Mandarin reading.</p>
            </section>


            <section>
              <h3>● 한글 · 韓文字母 · Hangul</h3>
              <p lang="zh-Hant">1443 年世宗大王創製，1446 年以《訓民正音》頒布。子音模仿發音器官（ㄱ 舌根、ㄴ 舌尖、ㅁ 嘴、ㅅ 牙、ㅇ 喉），母音由天（·）地（ㅡ）人（ㅣ）組成。</p>
              <p lang="ko">1443년 세종대왕이 만들고 1446년 《훈민정음》으로 반포했습니다. 자음은 발음 기관을, 모음은 하늘(·)·땅(ㅡ)·사람(ㅣ)을 본떴습니다. 기본 24자, 모두 40자.</p>
              <p lang="en">Created by King Sejong in 1443 and promulgated in 1446 as Hunminjeongeum. The consonants picture the speech organs; the vowels combine heaven (·), earth (ㅡ) and person (ㅣ). 24 basic letters, 40 in all.</p>
            </section>

            <section className={styles.sources}>
              <h3>● 出處 · 출처 · Sources</h3>
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

      )}

      {view === "letters" && (
        <div className={styles.infoCharts}>
          <div>
            <h3>● 注音符號 37 · 주음부호 · Bopomofo · Zhuyin</h3>
            <Letters letters={ZHUYIN} language="zh" playing={playing} onPlay={play} />
            <p className={styles.cite}>點擊發音 · 누르면 들려요 · Click to hear · 以例字發音 (ㄅ → 玻) · 語音合成</p>
          </div>
          <div>
            <h3>● 한글 40자 · 韓文四十音 · Hangul 40</h3>
            <Letters letters={[...HANGUL.consonants, ...HANGUL.vowels]} language="ko" playing={playing} onPlay={play} />
            <p className={styles.cite}>누르면 들려요 · 點擊發音 · Click to hear · ㄱ → 가 · ㅏ → 아 · 음성 합성</p>
          </div>
          <div className={styles.tonesRow}>
            <h3 className={styles.tonesTitle}>● 聲調 · 성조 · Tones — 同一個 ma，五種音高 · one ma, five pitches</h3>
            <Tones playing={playing} onPlay={play} />
          </div>
        </div>
      )}
    </div>
  );
}
