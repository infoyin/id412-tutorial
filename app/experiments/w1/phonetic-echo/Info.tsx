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

// The four tones, one card each: mark, name, example, how the pitch moves. Then the neutral
// tone on its own, since it is not a fifth tone. Click any card to hear it.
function Tones({ playing, onPlay }: { playing: string; onPlay: (l: Letter) => void }) {
  const neutral = TONES[4];
  return (
    <div className={styles.tones}>
      {TONES.slice(0, 4).map((t: Tone) => (
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
          <small lang="zh-Hant">{t.zh}</small>
          <small lang="ko">{t.ko}</small>
          <small lang="en">{t.en}</small>
        </button>
      ))}
      <button
        className={`${styles.toneNeutral} ${playing === neutral.letter ? styles.letterOn : ""}`}
        onClick={() => {
          onPlay(neutral);
          speakLetter(neutral.speak, "zh");
        }}
        aria-label={`${neutral.name} ${neutral.label}`}
      >
        <b>{neutral.letter}</b>
        <span>
          +1 {neutral.name} · {neutral.label}
        </span>
        <small lang="zh-Hant">不算第五聲：唸得又輕又短，音高隨前一個字。˙ 寫在注音上方。</small>
        <small lang="ko">다섯 번째 성조가 아니라, 가볍고 짧게 앞 글자를 따라 읽습니다. ˙는 위에 씁니다.</small>
        <small lang="en">Not a fifth tone: light and short, its pitch follows the syllable before. ˙ goes on top.</small>
      </button>
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
              <p lang="zh-Hant">與濟州語同屬韓語系，和漢語不同源，但從漢字文化圈借入大量漢字詞，約佔《標準國語大辭典》詞條的 58.5%。</p>
              <p lang="ko">제주어와 함께 한국어족에 속하며 중국어와 계통이 다르지만, 한자 문화권에서 많은 한자어를 받아들여 《표준국어대사전》 표제어의 약 58.5%가 한자어입니다.</p>
              <p lang="en">With Jejueo it forms the Koreanic family, unrelated to Chinese, yet it borrowed so widely that about 58.5% of the headwords in the Standard Korean Language Dictionary are Sino-Korean.</p>
              <Bar parts={[{ label: "漢字語", value: 58.5 }, { label: "固有語", value: 25.5 }, { label: "混種語", value: 10.6 }, { label: "外來語", value: 5.4 }]} />
              <p className={styles.cite}>% · 국립국어원 분석 (세계일보 2011)</p>
            </section>


          </div>
          <div className={styles.infoCol}>
            <section>
              <h3>● 為何相像 · 왜 비슷할까 · Why They Sound Alike?</h3>
              <p lang="zh-Hant">兩者沒有親緣關係，相似來自漢字詞的借用。臺語保留中古漢語的入聲韻尾 -p、-t、-k，韓語音節也允許這類韻尾，所以「結婚」kiat-hun 與 결혼 聽來相近；華語已失去入聲（陳彥伶）。韓國漢字音以中古漢語為主，也混有更早與更晚的層次（申祐先 2015）。</p>
              <p lang="ko">두 언어는 친족 관계가 아니며, 닮은 말은 한자어 차용에서 왔습니다. 대만어는 중세 중국어의 입성 받침 -p, -t, -k를 지켰고 한국어도 이런 받침을 허용해 結婚 kiat-hun과 결혼이 비슷하게 들립니다. 한국 한자음은 중세 중국어가 중심이지만 더 이른 층과 늦은 층도 섞여 있습니다.</p>
              <p lang="en">They are not related; the likeness comes from borrowed Sino words. Taiwanese keeps the Middle Chinese stop endings -p, -t, -k and Korean syllables allow such endings too, so 結婚 kiat-hun and 결혼 sound close, while Mandarin lost them. Sino-Korean readings rest mainly on Middle Chinese, with older and later layers mixed in.</p>
              <p className={styles.chartTitle}>臺語韻尾 → 받침 · Taiwanese Endings → Korean Finals · {ENTRIES.length}쌍</p>
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
              <p className={styles.chartTitle}>韓語 · 약 7,720만 명 · Korean, About 77.2 Million Speakers</p>
              <Bar parts={[{ label: "南韓", value: 48.4 }, { label: "北韓", value: 23.3 }, { label: "中國", value: 2.7 }, { label: "其他", value: 2.8 }]} />
              <p className={styles.cite}>백만 명 · Ethnologue (Korea Times)</p>
              <p className={styles.chartTitle}>臺灣 主要使用語言 · 주로 쓰는 언어 · Taiwan, Main Language Used</p>
              <Bar parts={[{ label: "華語", value: 66.3 }, { label: "臺語", value: 31.7 }, { label: "客語", value: 1.5 }, { label: "其他", value: 0.5 }]} />
              <p className={styles.cite}>% · 2020 人口及住宅普查 (The News Lens 引述)</p>
            </section>

          </div>
          <div className={styles.infoCol}>
            <section>
              <h3>● 注音符號 · 주음부호 · Bopomofo · Zhuyin</h3>
              <p lang="zh-Hant">英文稱 Bopomofo（取自前四個符號 ㄅㄆㄇㄈ）或 Zhuyin（注音）。1913 年議定、1918 年公布，1930 年定名注音符號；37 個符號取自古漢字（ㄅ←勹）。一字由「聲母＋介音＋韻母」加聲調組成，寫在字右側：學 ㄒㄩㄝˊ。方塊上是華語讀音。</p>
              <p lang="ko">주음(注音, Zhuyin)은 영어로 보포모포(Bopomofo)라고도 하며, 첫 네 기호 ㄅㄆㄇㄈ에서 온 이름입니다. 1913년 정하고 1918년 공포, 1930년 주음부호로 정착; 37개 기호는 옛 한자에서 왔습니다(ㄅ←勹). ‘성모+개음+운모’와 성조를 글자 오른쪽에 씁니다: 學 ㄒㄩㄝˊ.</p>
              <p lang="en">Zhuyin (注音), also called Bopomofo after its first four symbols ㄅㄆㄇㄈ (bo po mo fo). Agreed in 1913, published in 1918, named in 1930; its 37 symbols come from old character forms (ㄅ from 勹). A syllable is initial + medial + final plus a tone, written to the right of the character: 學 ㄒㄩㄝˊ. On the blocks it gives the Mandarin reading.</p>
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
              <p>
                <a href="https://www.sinica.edu.tw/cp/695" target="_blank" rel="noreferrer">陳彥伶〈語言親緣關係常見的幾個迷思：兼論語言與方言〉中央研究院</a> ·{" "}
                <a href="https://tdr.lib.ntu.edu.tw/handle/123456789/52032" target="_blank" rel="noreferrer">申祐先《韓國漢字音歷史層次研究》臺大博士論文 2015</a>
              </p>
            </section>
          </div>
        </div>

      )}

      {view === "letters" && (
        <div className={styles.infoCharts}>
          <div>
            <h3>● 注音符號 (37) · 주음부호 · Bopomofo · Zhuyin</h3>
            <Letters letters={ZHUYIN} language="zh" playing={playing} onPlay={play} />
            <p className={styles.cite}>點擊發音 · 누르면 들려요 · Click to hear · 以例字發音 (ㄅ → 玻) · 語音合成</p>
          </div>
          <div>
            <h3>● 한글 (40) · 韓文 · Hangul</h3>
            <Letters letters={[...HANGUL.consonants, ...HANGUL.vowels]} language="ko" playing={playing} onPlay={play} />
            <p className={styles.cite}>누르면 들려요 · 點擊發音 · Click to hear · ㄱ → 가 · ㅏ → 아 · 음성 합성</p>
          </div>
          <div className={styles.tonesRow}>
            <h3 className={styles.tonesTitle}>● 注音聲調 (4+1) · 주음 성조 · Zhuyin Tones — 同一個 ma，四個聲調加輕聲 · One Ma, Four Tones + Neutral</h3>
            <Tones playing={playing} onPlay={play} />
          </div>
        </div>
      )}
    </div>
  );
}
