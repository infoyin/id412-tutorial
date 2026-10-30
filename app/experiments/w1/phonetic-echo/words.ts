// The vocabulary: Taiwanese ↔ Korean words written with the same Chinese characters.
//
// Sources
// - Taiwanese: 教育部《臺灣台語常用詞辭典》 https://sutian.moe.edu.tw/ (text + audio CC BY-ND 3.0 TW)
// - Korean: 국립국어원《한국어기초사전》 https://krdict.korean.go.kr/ (text CC BY-SA 2.0 KR)
//
// Status
// - "verified": both entries checked by hand, meanings compared (2026-10-30). These float in the field.
// - "candidate": suggested (AI-assisted) and found in both dictionaries by check-candidates.mjs,
//   but meaning and usage not yet compared by a person. Shown on the wheel, marked as candidates.
// - "unverified": suggested only, not looked up yet.
//
// From the dictionaries: Tâi-lô, Korean pronunciation, Korean definition (verbatim), entry links,
// Taiwanese recordings (unmodified). Ours: meanings in English/中文, sound notes, Hangul romanization.
// Korean recordings are not bundled: krdict licenses each audio file separately and none is stated.
// Sharing characters does not mean sharing sound, meaning or history.

export type Status = "verified" | "candidate" | "unverified";

export type Entry = {
  id: string;
  hanja: string;
  taiwanese: { written: string; tailo: string | null; audio: string | null; source: string | null };
  korean: {
    hangul: string;
    pronunciation: string | null; // krdict standard pronunciation, "ː" = long vowel
    romanization: string; // ours (Revised Romanization)
    definition: string | null; // krdict, verbatim
    audio: string | null;
    source: string | null;
  };
  meaning: { en: string; zh: string }; // ours
  note: { ko: string; zh: string; en: string } | null; // ours: what the sounds share
  status: Status;
  checked: string | null;
  uncertainty: string | null; // what still needs checking
};

const SUTIAN = "https://sutian.moe.edu.tw/zh-hant/su/";
const KRDICT = "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=";
const AUDIO = "/experiments/w1/phonetic-echo/audio/";

export const ENTRIES: Entry[] = [
  // ---- verified ----
  {
    id: "time",
    hanja: "時間",
    taiwanese: { written: "時間", tailo: "sî-kan", audio: AUDIO + "tw-6050.mp3", source: SUTIAN + "6050/" },
    korean: { hangul: "시간", pronunciation: "시간", romanization: "sigan", definition: "어떤 때에서 다른 때까지의 동안.", audio: null, source: KRDICT + "62841" },
    meaning: { en: "time; a span of time", zh: "時間；一段時候" },
    note: {
      ko: "間은 台語로 kan, 한국어로 간 — 둘 다 k로 시작해 n으로 끝납니다.",
      zh: "間：台語 kan、韓語 간 gan，都以 k 起首、以 n 收尾。",
      en: "間: Taiwanese kan, Korean 간 gan — both start with k and end in n.",
    },
    status: "verified",
    checked: "2026-10-30",
    uncertainty: null,
  },
  {
    id: "thanks",
    hanja: "感謝",
    taiwanese: { written: "感謝", tailo: "kám-siā", audio: AUDIO + "tw-9469.mp3", source: SUTIAN + "9469/" },
    korean: { hangul: "감사", pronunciation: "감ː사", romanization: "gamsa", definition: "고맙게 여김. 또는 그런 마음.", audio: null, source: KRDICT + "46944" },
    meaning: { en: "thanks; gratitude", zh: "感謝；感激" },
    note: {
      ko: "感은 台語 kám, 한국어 감 — 둘 다 받침 m을 지킵니다. 중국 표준어(gǎn)에서는 사라진 소리입니다.",
      zh: "感：台語 kám、韓語 감 gam，都保留 -m 韻尾；華語 gǎn 已經沒有了。",
      en: "感: Taiwanese kám, Korean 감 gam — both keep the final -m that Mandarin gǎn has lost.",
    },
    status: "verified",
    checked: "2026-10-30",
    uncertainty: null,
  },
  {
    id: "marriage",
    hanja: "結婚",
    taiwanese: { written: "結婚", tailo: "kiat-hun", audio: AUDIO + "tw-22534.mp3", source: SUTIAN + "22534/" },
    korean: { hangul: "결혼", pronunciation: "결혼", romanization: "gyeolhon", definition: "남자와 여자가 법적으로 부부가 됨.", audio: null, source: KRDICT + "31665" },
    meaning: { en: "marriage; to marry", zh: "結婚" },
    note: {
      ko: "結의 台語 발음 kiat의 받침 t는 한국 한자음에서 규칙적으로 ㄹ이 됩니다: 결.",
      zh: "結：台語 kiat 的 -t 韻尾，在韓語漢字音裡規律地變成 ㄹ（결 gyeol）。",
      en: "結: the final -t of Taiwanese kiat regularly becomes ㄹ (l) in Sino-Korean: 결 gyeol.",
    },
    status: "verified",
    checked: "2026-10-30",
    uncertainty: null,
  },
  {
    id: "student",
    hanja: "學生",
    taiwanese: { written: "學生", tailo: "ha̍k-sing", audio: AUDIO + "tw-11618.mp3", source: SUTIAN + "11618/" },
    korean: { hangul: "학생", pronunciation: "학쌩", romanization: "haksaeng", definition: "학교에 다니면서 공부하는 사람.", audio: null, source: KRDICT + "31670" },
    meaning: { en: "student", zh: "學生" },
    note: {
      ko: "學은 台語 ha̍k, 한국어 학 — 둘 다 받침 k가 남아 있습니다.",
      zh: "學：台語 ha̍k、韓語 학 hak，兩邊都留著 -k 韻尾。",
      en: "學: Taiwanese ha̍k, Korean 학 hak — both keep the final -k.",
    },
    status: "verified",
    checked: "2026-10-30",
    uncertainty: null,
  },
  {
    id: "culture",
    hanja: "文化",
    taiwanese: { written: "文化", tailo: "bûn-huà", audio: AUDIO + "tw-850.mp3", source: SUTIAN + "850/" },
    korean: {
      hangul: "문화",
      pronunciation: "문화",
      romanization: "munhwa",
      definition: "사회의 공동체가 일정한 목적 또는 생활 이상을 실현하기 위하여 만들고, 익히고, 공유하고, 전달하는 물질적, 정신적 활동.",
      audio: null,
      source: KRDICT + "71460",
    },
    meaning: { en: "culture", zh: "文化" },
    note: {
      ko: "文은 台語 bûn, 한국어 문 — 台語의 b와 한국어의 m은 모두 옛 m 소리에서 왔습니다. 化 huà와 화는 거의 같습니다.",
      zh: "文：台語 bûn、韓語 문 mun，台語的 b 與韓語的 m 都來自古代的 m 聲母；化 huà 與 화 hwa 幾乎相同。",
      en: "文: Taiwanese bûn, Korean 문 mun — Taiwanese b and Korean m both go back to an older m sound; 化 huà and 화 hwa are near twins.",
    },
    status: "verified",
    checked: "2026-10-30",
    uncertainty: null,
  },

  // ---- candidates: found in both dictionaries (check-candidates.mjs, 2026-10-30), meanings not compared yet ----
  candidate("phone", "電話", "tiān-uē", "10333", "전화", "전ː화", "jeonhwa", "20260", "전화기를 통해 사람들끼리 말을 주고받음. 또는 그렇게 하여 전달되는 내용.", "telephone; phone call", "電話"),
  candidate("school", "學校", "ha̍k-hāu", "11622", "학교", "학꾜", "hakgyo", "73276", "일정한 목적, 교과 과정, 제도 등에 따라 학생을 교육하는 기관.", "school", "學校"),
  candidate("exercise", "運動", "ūn-tōng", "10207", "운동", "운ː동", "undong", "69521", "몸을 단련하거나 건강을 위해 몸을 움직이는 일.", "exercise; sport; movement", "運動"),
  candidate("news", "新聞", "sin-bûn", "9547", "신문", "신문", "sinmun", "65337", "정기적으로 세상에서 일어나는 새로운 일들을 알려 주는 간행물.", "news / newspaper", "新聞", "Korean 신문 is the newspaper; check whether Taiwanese sin-bûn means the news itself."),
  candidate("family", "家庭", "ka-tîng", "22190", "가정", "가정", "gajeong", "59900", "한 가족으로 이루어진 공동체나 그들이 생활하는 집.", "family; household", "家庭"),
  candidate("world", "世界", "sè-kài", "1345", "세계", "세ː계", "segye", "62444", "지구 위에 있는 모든 나라.", "world", "世界"),
  candidate("attention", "注意", "tsù-ì", "4361", "주의", "주ː의", "juui", "25965", "마음에 새겨 두고 조심함.", "attention; caution", "注意"),
  candidate("problem", "問題", "būn-tê/būn-tuê", "22102", "문제", "문ː제", "munje", "66246", "답을 요구하는 물음.", "problem; question", "問題", "Two Taiwanese readings are listed."),
  candidate("history", "歷史", "li̍k-sú", "11745", "역사", "역싸", "yeoksa", "62515", "인간 사회가 시간이 지남에 따라 흥하고 망하면서 변해 온 과정. 또는 그 기록.", "history", "歷史"),
  candidate("university", "大學", "tāi-ha̍k", "527", "대학", "대ː학", "daehak", "61281", "고등학교를 마치고 진학하는 고등 교육 기관.", "university", "大學"),
  candidate("safety", "安全", "an-tsuân", "22169", "안전", "안전", "anjeon", "71373", "위험이 생기거나 사고가 날 염려가 없음. 또는 그러한 상태.", "safety; safe", "安全"),
  candidate("freedom", "自由", "tsū-iû", "2648", "자유", "자유", "jayu", "62415", "무엇에 얽매이거나 구속되지 않고 자기의 생각과 의지대로 할 수 있는 상태.", "freedom", "自由"),
];

function candidate(
  id: string,
  hanja: string,
  tailo: string,
  sutianId: string,
  hangul: string,
  pronunciation: string,
  romanization: string,
  krdictId: string,
  definition: string,
  en: string,
  zh: string,
  uncertainty: string | null = null,
): Entry {
  return {
    id,
    hanja,
    taiwanese: { written: hanja, tailo, audio: null, source: SUTIAN + sutianId + "/" },
    korean: { hangul, pronunciation, romanization, definition, audio: null, source: KRDICT + krdictId },
    meaning: { en, zh },
    note: null,
    status: "candidate",
    checked: null,
    uncertainty: uncertainty ?? "Found in both dictionaries; meaning and usage not yet compared.",
  };
}

export const VERIFIED = ENTRIES.filter((e) => e.status === "verified");
