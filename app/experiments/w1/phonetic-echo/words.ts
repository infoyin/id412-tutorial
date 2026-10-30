// The linguistic dataset: five Taiwanese ↔ Korean pairs that share Chinese characters.
//
// Checked on 2026-10-30 against:
// - Taiwanese: 教育部《臺灣台語常用詞辭典》 https://sutian.moe.edu.tw/ (text + audio CC BY-ND 3.0 TW)
// - Korean: 국립국어원 《한국어기초사전》 https://krdict.korean.go.kr/ (text CC BY-SA 2.0 KR)
//
// What comes from the dictionaries: written forms, Tâi-lô, Korean standard pronunciation,
// the Korean definition (krdict, verbatim), entry ids, and the Taiwanese recordings (unmodified).
// What we wrote ourselves (labelled "ours"): the short glosses, the romanization of Hangul
// (Revised Romanization), and the sound notes. Korean recordings are not bundled: krdict sets
// the license of each multimedia file individually and none is stated, so we link to the entry.
//
// Sharing characters does not mean the words sound the same, mean the same, or share one history.

export type Pair = {
  id: string;
  hanja: string; // the shared Chinese characters
  taiwanese: {
    written: string;
    tailo: string; // Tâi-lô, as given by the dictionary
    audio: string | null; // dictionary recording, unmodified
    source: string;
  };
  korean: {
    hangul: string;
    pronunciation: string; // standard pronunciation as given by krdict ("ː" = long vowel)
    romanization: string; // ours: Revised Romanization of the Hangul
    definition: string; // krdict, verbatim
    audio: string | null; // not bundled, see above
    source: string;
  };
  gloss: { zh: string; en: string }; // ours
  note: { ko: string; zh: string; en: string }; // ours: what the two sounds share
  verified: { taiwanese: boolean; korean: boolean; checked: string };
};

export const PAIRS: Pair[] = [
  {
    id: "time",
    hanja: "時間",
    taiwanese: {
      written: "時間",
      tailo: "sî-kan",
      audio: "/experiments/w1/phonetic-echo/audio/tw-6050.mp3",
      source: "https://sutian.moe.edu.tw/zh-hant/su/6050/",
    },
    korean: {
      hangul: "시간",
      pronunciation: "시간",
      romanization: "sigan",
      definition: "어떤 때에서 다른 때까지의 동안.",
      audio: null,
      source: "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=62841",
    },
    gloss: { zh: "時間；一段時候", en: "time; a span of time" },
    note: {
      ko: "間은 台語로 kan, 한국어로 간 — 둘 다 k로 시작해 n으로 끝납니다.",
      zh: "間：台語 kan、韓語 간 gan，都以 k 起首、以 n 收尾。",
      en: "間: Taiwanese kan, Korean 간 gan — both start with k and end in n.",
    },
    verified: { taiwanese: true, korean: true, checked: "2026-10-30" },
  },
  {
    id: "thanks",
    hanja: "感謝",
    taiwanese: {
      written: "感謝",
      tailo: "kám-siā",
      audio: "/experiments/w1/phonetic-echo/audio/tw-9469.mp3",
      source: "https://sutian.moe.edu.tw/zh-hant/su/9469/",
    },
    korean: {
      hangul: "감사",
      pronunciation: "감ː사",
      romanization: "gamsa",
      definition: "고맙게 여김. 또는 그런 마음.",
      audio: null,
      source: "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=46944",
    },
    gloss: { zh: "感謝；感激", en: "thanks; gratitude" },
    note: {
      ko: "感은 台語 kám, 한국어 감 — 둘 다 받침 m을 지킵니다. 중국 표준어(gǎn)에서는 사라진 소리입니다.",
      zh: "感：台語 kám、韓語 감 gam，都保留 -m 韻尾；華語 gǎn 已經沒有了。",
      en: "感: Taiwanese kám, Korean 감 gam — both keep the final -m that Mandarin gǎn has lost.",
    },
    verified: { taiwanese: true, korean: true, checked: "2026-10-30" },
  },
  {
    id: "marriage",
    hanja: "結婚",
    taiwanese: {
      written: "結婚",
      tailo: "kiat-hun",
      audio: "/experiments/w1/phonetic-echo/audio/tw-22534.mp3",
      source: "https://sutian.moe.edu.tw/zh-hant/su/22534/",
    },
    korean: {
      hangul: "결혼",
      pronunciation: "결혼",
      romanization: "gyeolhon",
      definition: "남자와 여자가 법적으로 부부가 됨.",
      audio: null,
      source: "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=31665",
    },
    gloss: { zh: "結婚", en: "marriage; to marry" },
    note: {
      ko: "結의 台語 발음 kiat의 받침 t는 한국 한자음에서 규칙적으로 ㄹ이 됩니다: 결.",
      zh: "結：台語 kiat 的 -t 韻尾，在韓語漢字音裡規律地變成 ㄹ（결 gyeol）。",
      en: "結: the final -t of Taiwanese kiat regularly becomes ㄹ (l) in Sino-Korean: 결 gyeol.",
    },
    verified: { taiwanese: true, korean: true, checked: "2026-10-30" },
  },
  {
    id: "student",
    hanja: "學生",
    taiwanese: {
      written: "學生",
      tailo: "ha̍k-sing",
      audio: "/experiments/w1/phonetic-echo/audio/tw-11618.mp3",
      source: "https://sutian.moe.edu.tw/zh-hant/su/11618/",
    },
    korean: {
      hangul: "학생",
      pronunciation: "학쌩",
      romanization: "haksaeng",
      definition: "학교에 다니면서 공부하는 사람.",
      audio: null,
      source: "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=31670",
    },
    gloss: { zh: "學生", en: "student" },
    note: {
      ko: "學은 台語 ha̍k, 한국어 학 — 둘 다 받침 k가 남아 있습니다.",
      zh: "學：台語 ha̍k、韓語 학 hak，兩邊都留著 -k 韻尾。",
      en: "學: Taiwanese ha̍k, Korean 학 hak — both keep the final -k.",
    },
    verified: { taiwanese: true, korean: true, checked: "2026-10-30" },
  },
  {
    id: "culture",
    hanja: "文化",
    taiwanese: {
      written: "文化",
      tailo: "bûn-huà",
      audio: "/experiments/w1/phonetic-echo/audio/tw-850.mp3",
      source: "https://sutian.moe.edu.tw/zh-hant/su/850/",
    },
    korean: {
      hangul: "문화",
      pronunciation: "문화",
      romanization: "munhwa",
      definition:
        "사회의 공동체가 일정한 목적 또는 생활 이상을 실현하기 위하여 만들고, 익히고, 공유하고, 전달하는 물질적, 정신적 활동.",
      audio: null,
      source: "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=71460",
    },
    gloss: { zh: "文化", en: "culture" },
    note: {
      ko: "文은 台語 bûn, 한국어 문 — 台語의 b와 한국어의 m은 모두 옛 m 소리에서 왔습니다. 化 huà와 화는 거의 같습니다.",
      zh: "文：台語 bûn、韓語 문 mun，台語的 b 與韓語的 m 都來自古代的 m 聲母；化 huà 與 화 hwa 幾乎相同。",
      en: "文: Taiwanese bûn, Korean 문 mun — Taiwanese b and Korean m both go back to an older m sound; 化 huà and 화 hwa are near twins.",
    },
    verified: { taiwanese: true, korean: true, checked: "2026-10-30" },
  },
];
