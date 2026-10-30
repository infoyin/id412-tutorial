import { useState } from "react";
import { speakLetter } from "./audio";
import { HANGUL, TONES, ZHUYIN, type Letter } from "./letters";
import { ENTRIES } from "./words";
import styles from "./page.module.css";

// INFO: a short history of Taiwanese and Korean, why their Sino vocabulary sounds alike,
// and three diagrams. The first diagram is counted from our own 460 pairs; the population
// and vocabulary figures are cited below them.

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
      <section className={styles.lead}>
        <h3>● 這是什麼 · 이 사이트는</h3>
        <p lang="zh-Hant">
          臺語和韓語有許多詞用同樣的漢字寫成，唸起來也相像。漂浮的方塊是這些詞：把一個詞拖到它的另一半旁邊，兩塊會共鳴、接合、變成實心，並唸出兩種發音。有些看起來是一對卻會裂開，那是「偽友」：字一樣，意思不同。拉動左邊的轉盤產生重力，用力甩動換一批詞，點一下轉盤打開對照。INDEX 是全部的單字表。
        </p>
        <p lang="ko">
          대만어(臺語)와 한국어에는 같은 한자로 쓰고 소리도 비슷한 말이 많습니다. 떠다니는 블록이 그런 단어들입니다. 한 단어를 짝 옆으로 끌어오면 두 블록이 울리고, 붙고, 검게 채워지며 두 가지 발음이 들립니다. 짝처럼 보이지만 깨지는 것은 ‘가짜 친구’입니다: 글자는 같아도 뜻이 다릅니다. 왼쪽 바퀴를 당기면 중력이 생기고, 세게 튕기면 새 단어가 오고, 누르면 비교 화면이 열립니다. INDEX는 전체 단어표입니다.
        </p>
      </section>

      <section>
        <h3>● 臺語 · 대만어</h3>
        <p lang="zh-Hant">
          臺灣台語屬於漢語族的閩南語。17 世紀起隨福建漳州、泉州的移民來到臺灣，兩地口音在這裡融合，也吸收了日語等外來詞（例如「自轉車」源自日語）。臺語至今保留許多中古漢語的特徵：-m、-p、-t、-k 韻尾，以及讀書用的「文讀」和日常的「白話」兩套讀音。
        </p>
        <p lang="ko">
          대만어(臺灣台語)는 중국어족 민남어에 속합니다. 17세기부터 푸젠성 장저우·취안저우 이주민과 함께 대만에 들어와 두 지역의 말소리가 섞였고, 일본어에서 온 말도 있습니다(예: 自轉車). 지금도 중세 중국어의 -m, -p, -t, -k 받침과, 글 읽는 소리(文讀)와 일상 소리(白話)라는 두 갈래 읽기를 지키고 있습니다.
        </p>
      </section>

      <section>
        <h3>● 韓語 · 한국어</h3>
        <p lang="zh-Hant">
          韓語和漢語不是同一個語系，但在長期的漢字文化交流中，從文言文借入了大量漢字詞。國立國語院分析《標準國語大辭典》，漢字詞約佔 58.5%。1446 年世宗大王頒布訓民正音後，這些詞也能用韓文字母書寫，今天多半只寫韓文。
        </p>
        <p lang="ko">
          한국어는 중국어와 계통이 다른 언어지만, 오랜 한자 문화 교류 속에서 한문으로부터 수많은 한자어를 받아들였습니다. 국립국어원이 《표준국어대사전》을 분석한 결과 표제어의 약 58.5%가 한자어였습니다. 1446년 훈민정음 반포 이후 이 말들도 한글로 적게 되었고, 오늘날에는 대부분 한글로만 씁니다.
        </p>
        <Bar parts={[{ label: "漢字語 한자어", value: 58.5 }, { label: "固有語 고유어", value: 25.5 }, { label: "混種語 혼종어", value: 10.6 }, { label: "外來語 외래어", value: 5.4 }]} />
        <p className={styles.cite}>% · 《標準國語大辭典》 표제어 · 국립국어원 분석 (세계일보 2011 보도)</p>
      </section>

      <section>
        <h3>● 為何相像 · 왜 비슷할까</h3>
        <p lang="zh-Hant">
          多數學者認為，韓國漢字音和臺語的文讀音，都可以追溯到中古漢語（大約隋唐時期的讀書音）。兩邊各自保存了當時的音節結構，所以韻尾常常對得上：-m 對 ㅁ、-p 對 ㅂ、-k 對 ㄱ，-t 在韓語則規律地變成 ㄹ。華語失去了 -p、-t、-k，-m 也併入 -n。
        </p>
        <p lang="ko">
          한국 한자음과 대만어의 글 읽는 소리(文讀)는 모두 중세 중국어(대략 수·당 시대의 독서음)로 거슬러 올라간다고 보는 견해가 많습니다. 두 언어가 그 음절 구조를 각자 간직해 받침이 자주 맞아떨어집니다: -m↔ㅁ, -p↔ㅂ, -k↔ㄱ, 그리고 -t는 한국어에서 규칙적으로 ㄹ이 됩니다. 표준 중국어는 -p, -t, -k를 잃었고 -m도 -n에 합쳐졌습니다.
        </p>
        <p className={styles.chartTitle}>臺語韻尾 → 韓語받침 · 이 작품의 {ENTRIES.length}쌍에서 센 결과</p>
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
                {counts
                  .slice(0, 2)
                  .map(([k, n]) => `${k} ${Math.round((n / total) * 100)}%`)
                  .join(" · ")}
              </span>
            </div>
          ))}
        </div>
        <p className={styles.cite}>음절 수가 같은 쌍만 · 첫 번째 臺羅 읽기 · n = 음절 수</p>
      </section>

      <section>
        <h3>● 使用人口 · 사용 인구</h3>
        <p className={styles.chartTitle}>韓語 한국어 · 약 7,720만 명 (Ethnologue)</p>
        <Bar parts={[{ label: "南韓 남한", value: 48.4 }, { label: "北韓 북한", value: 23.3 }, { label: "中國 중국", value: 2.7 }, { label: "其他 기타", value: 2.8 }]} />
        <p className={styles.cite}>백만 명 · Ethnologue (Korea Times 2014·2025 인용)</p>

        <p className={styles.chartTitle}>臺灣 主要使用語言 · 대만 주로 쓰는 언어</p>
        <Bar parts={[{ label: "華語 국어", value: 66.3 }, { label: "臺語 대만어", value: 31.7 }, { label: "客語 하카어", value: 1.5 }, { label: "其他 기타", value: 0.5 }]} />
        <p className={styles.cite}>
          % · 2020 人口及住宅普查「主要使用語言」(The News Lens 引述). 臺師大 2024 電話調查（15–59 歲，在家使用）：華語 68.8 · 閩南語 29.7 · 客語 1.4（聯合報）
        </p>
      </section>

      <section>
        <h3>● 注音符號 · 주음부호</h3>
        <p lang="zh-Hant">
          注音符號是為了標注漢字讀音而設計的符號。1913 年「讀音統一會」議定，1918 年由教育部公布為「注音字母」，1930 年改稱「注音符號」。符號多取自筆畫簡單的古漢字，例如 ㄅ 取自「勹」、ㄇ 取自「冂」。共 37 個符號，加上聲調符號。臺灣至今用它學國語、輸入文字；臺語另有擴充的「臺灣方音符號」，教育部臺語辭典則以 2006 年公布的臺羅拼音為主。方塊上漢字右側的注音，是華語讀音（教育部《重編國語辭典修訂本》）。
        </p>
        <p lang="ko">
          주음부호(注音符號)는 한자의 읽는 소리를 적기 위한 기호입니다. 1913년 ‘독음통일회’에서 정하고 1918년 교육부가 ‘주음자모’로 공포했으며, 1930년에 ‘주음부호’로 이름을 바꿨습니다. 기호는 획이 간단한 옛 한자에서 따왔습니다(예: ㄅ←勹, ㄇ←冂). 기호 37개와 성조 부호가 있으며, 대만에서는 지금도 표준 중국어를 배우고 글자를 입력할 때 씁니다. 대만어에는 확장된 ‘대만 방음 부호’가 있지만, 교육부 대만어 사전은 주로 2006년에 공포된 타이로(臺羅) 로마자를 씁니다. 블록의 한자 오른쪽 주음은 표준 중국어 읽기입니다.
        </p>
      </section>

      <section>
        <h3>● 한글 · 韓文字母</h3>
        <p lang="zh-Hant">
          韓文字母（한글）由朝鮮世宗大王在 1443 年創製，1446 年以《訓民正音》頒布。子音的基本字模仿發音器官的形狀：ㄱ 是舌根擋住喉嚨、ㄴ 是舌尖碰到上齒齦、ㅁ 是嘴巴、ㅅ 是牙齒、ㅇ 是喉嚨；母音由天（·）、地（ㅡ）、人（ㅣ）組合而成。現在的基本字母有 24 個（子音 14、母音 10），加上雙子音與複合母音共 40 個（子音 19、母音 21）。
        </p>
        <p lang="ko">
          한글은 1443년 세종대왕이 만들고 1446년 《훈민정음》으로 반포했습니다. 자음 기본자는 발음 기관의 모양을 본떴습니다: ㄱ은 혀뿌리가 목구멍을 막는 모양, ㄴ은 혀끝이 윗잇몸에 닿는 모양, ㅁ은 입, ㅅ은 이, ㅇ은 목구멍. 모음은 하늘(·), 땅(ㅡ), 사람(ㅣ)을 합쳐 만들었습니다. 지금의 기본 자모는 24자(자음 14, 모음 10)이고, 쌍자음과 겹모음을 더하면 40자(자음 19, 모음 21)입니다.
        </p>
      </section>

      <section className={styles.charts}>
        <div>
          <h3>● 한글 40자 · 韓文四十音</h3>
          <p className={styles.chartTitle}>자음 子音 19</p>
          <Letters letters={HANGUL.consonants} language="ko" playing={playing} onPlay={play} />
          <p className={styles.chartTitle}>모음 母音 21</p>
          <Letters letters={HANGUL.vowels} language="ko" playing={playing} onPlay={play} />
          <p className={styles.cite}>누르면 들려요 · 點擊發音 · 자음은 ㅏ와 함께 (ㄱ → 가), 모음은 ㅇ과 함께 (ㅏ → 아)</p>
        </div>
        <div>
          <h3>● 注音符號 · 주음부호 37</h3>
          <p className={styles.chartTitle}>聲母 21 · 介音 3 · 韻母 13</p>
          <Letters letters={ZHUYIN} language="zh" playing={playing} onPlay={play} />
          <p className={styles.chartTitle}>聲調 · 성조</p>
          <Letters letters={TONES} language="zh" playing={playing} onPlay={play} />
          <p className={styles.cite}>點擊發音 · 누르면 들려요 · 以例字發音（ㄅ → 玻）· 瀏覽器語音合成</p>
        </div>
      </section>

      <section className={styles.sources}>
        <h3>● 出處 · 출처</h3>
        <p>
          <a href="https://sutian.moe.edu.tw/" target="_blank" rel="noreferrer">教育部《臺灣台語常用詞辭典》</a> ·{" "}
          <a href="https://dict.revised.moe.edu.tw/" target="_blank" rel="noreferrer">教育部《重編國語辭典修訂本》</a> ·{" "}
          <a href="https://krdict.korean.go.kr/" target="_blank" rel="noreferrer">국립국어원《한국어기초사전》</a> ·{" "}
          <a href="https://www.koreatimes.co.kr/southkorea/20140514/korean-13th-most-widely-spoken-language" target="_blank" rel="noreferrer">Korea Times</a> ·{" "}
          <a href="https://www.thenewslens.com/article/157030" target="_blank" rel="noreferrer">The News Lens</a> ·{" "}
          <a href="https://udn.com/news/story/6898/8344187" target="_blank" rel="noreferrer">聯合報</a> ·{" "}
          <a href="https://www.segye.com/newsView/20110630005004" target="_blank" rel="noreferrer">세계일보</a>
        </p>
      </section>
    </div>
  );
}
