import falseFriends from "./false-friends.json";
import koreanAudio from "./korean-audio.json";
import { romanize } from "./romanize";
import vocabulary from "./vocabulary.json";

// The vocabulary: Taiwanese ↔ Korean words written with the same Chinese characters.
//
// vocabulary.json is built offline by build-vocabulary.py from the two official dictionary
// downloads (教育部《臺灣台語常用詞辭典》 kautian.ods, 국립국어원《한국어기초사전》 JSON) plus
// Unicode Unihan. Only "usable" pairs are in it: status dictionary_matched (meaning shown to
// correspond on both sides by dictionary data), Korean level 초급/중급, with a Taiwanese
// recording. Everything else that matched by characters is in vocabulary-candidates.json.
//
// Status values: "dictionary_matched" | "candidate" | "editor_reviewed". Nothing is
// editor_reviewed yet: that is set by hand, by a person, after checking a pair.
//
// false-friends.json: same characters, different meanings (新聞 news / 신문 newspaper), chosen by
// the AI assistant from both dictionaries' definitions, not human-reviewed. In the field they
// attract like partners, then crack apart instead of connecting.
//
// Korean audio: Lingua Libre recordings (korean-audio.json, CC0 / CC BY-SA) where they exist,
// otherwise the browser's ko-KR speech synthesis (see audio.ts).

export type Status = "dictionary_matched" | "candidate" | "editor_reviewed" | "false_friend";

export type Entry = {
  id: string;
  hanja: string;
  category: string;
  status: Status;
  taiwanese: {
    written: string;
    tailo: string;
    audio: string;
    url: string;
    definition: string; // MOE, verbatim ("" for 臺華共同詞: same as Mandarin)
    zhuyin: string[] | null; // Mandarin 注音 per character (MOE revised Mandarin dictionary)
    example: { han: string; tailo: string; zh: string } | null; // MOE 例句
  };
  korean: {
    hangul: string;
    pronunciation: string; // krdict standard pronunciation, "ː" = long vowel
    romanization: string; // Revised Romanization, from the pronunciation (romanize.ts)
    definition: string; // krdict, verbatim
    english: string; // krdict's English equivalent
    chinese: string; // krdict's Chinese equivalent (simplified)
    example: string; // krdict example
    url: string;
    audio: { file: string; license: string; author: string; source: string } | null;
  };
  note: { ko: string; zh: string; en: string } | null; // ours, for a few pairs
  falseFriend: { twEnglish: string; why: { zh: string; ko: string } } | null; // ours, false friends only
};

// False friends: the Taiwanese meaning in English, and how the two differ (written by us from
// the two dictionaries' definitions, 2026-10-31; for Taiwanese and Korean readers).
const FALSE_FRIEND_NOTES: Record<string, NonNullable<Entry["falseFriend"]>> = {
  新聞: { twEnglish: "news (the report itself)", why: { zh: "臺語指報導的消息本身；韓語 신문 指刊登消息的報紙。", ko: "대만어는 소식(뉴스) 자체, 한국어 신문은 그것을 싣는 종이 신문입니다." } },
  工夫: { twEnglish: "kung fu; skill, craft", why: { zh: "原意是花費的時間與功夫。臺語指武術、技藝；韓語 공부 成了「讀書、學習」。", ko: "본래 들인 시간과 노력. 대만어는 무술·솜씨, 한국어 공부는 ‘배우고 익힘’이 되었습니다." } },
  點心: { twEnglish: "snack, light refreshment", why: { zh: "臺語指正餐之外的小吃；韓語 점심 是中午那一餐。", ko: "대만어는 끼니 사이의 간식, 한국어 점심은 낮에 먹는 끼니입니다." } },
  料理: { twEnglish: "to handle, to take care of", why: { zh: "臺語指辦理、處理事情；韓語 요리 是烹調、做菜。", ko: "대만어는 일을 처리함, 한국어 요리는 음식을 만듦입니다." } },
  安寧: { twEnglish: "peaceful, calm", why: { zh: "臺語形容安詳寧靜；韓語 안녕 從「平安」變成見面、道別的問候語。", ko: "대만어는 평온함, 한국어 안녕은 ‘평안’에서 만나고 헤어질 때의 인사말이 되었습니다." } },
  便宜: { twEnglish: "cheap, inexpensive", why: { zh: "臺語（和華語一樣）指價格低；韓語 편의 是「方便」。", ko: "대만어는 값이 쌈, 한국어 편의는 ‘편리함’입니다." } },
  人事: { twEnglish: "personnel matters", why: { zh: "臺語指機關中人員的任免調動；韓語 인사 最常用的意思是打招呼、問候。", ko: "대만어는 사람의 임용·이동, 한국어 인사는 흔히 ‘안부를 전하는 말’을 뜻합니다." } },
  試驗: { twEnglish: "experiment", why: { zh: "臺語指實驗；韓語 시험 主要指考試。", ko: "대만어는 실험, 한국어 시험은 주로 시험(exam)입니다." } },
  操心: { twEnglish: "to worry, to wear oneself out", why: { zh: "臺語指勞神、費心；韓語 조심 是小心、注意。", ko: "대만어는 마음 고생함, 한국어 조심은 ‘주의함’입니다." } },
  千萬: { twEnglish: "by all means, be sure to", why: { zh: "臺語當副詞「務必」；韓語 천만 是數字一千萬。", ko: "대만어는 ‘부디, 꼭’, 한국어 천만은 숫자 10,000,000입니다." } },
  階段: { twEnglish: "stage, phase", why: { zh: "臺語指事情發展的階段；韓語 계단 是樓梯。", ko: "대만어는 단계, 한국어 계단은 층계입니다." } },
  新婦: { twEnglish: "daughter-in-law", why: { zh: "臺語指兒子的妻子（媳婦）；韓語 신부 是新娘。", ko: "대만어는 며느리, 한국어 신부는 결혼하는 여자입니다." } },
  焦燥: { twEnglish: "dry", why: { zh: "臺語讀 ta-sò，指乾燥；韓語 초조 是焦慮、著急。", ko: "대만어는 건조함, 한국어 초조는 애가 타는 마음입니다." } },
  豆乳: { twEnglish: "fermented tofu", why: { zh: "臺語指豆腐乳；韓語 두유 是豆漿。", ko: "대만어는 삭힌 두부(두부유), 한국어 두유는 콩 음료입니다." } },
  經理: { twEnglish: "manager", why: { zh: "臺語指部門主管；韓語 경리 是會計、帳務工作。", ko: "대만어는 부서 책임자(매니저), 한국어 경리는 회계 업무입니다." } },
  汽車: { twEnglish: "car, automobile", why: { zh: "臺語（和華語一樣）指汽車；韓語 기차 是「蒸汽車」，指火車。", ko: "대만어는 자동차, 한국어 기차는 ‘증기차’에서 온 열차입니다." } },
  人間: { twEnglish: "the human world", why: { zh: "臺語（和華語一樣）指人世間；韓語 인간 指人、人類。", ko: "대만어는 사람 사는 세상, 한국어 인간은 ‘사람’입니다." } },
  質問: { twEnglish: "to interrogate, to call to account", why: { zh: "臺語是質詢、責問；韓語 질문 是一般的提問。", ko: "대만어는 따져 물음, 한국어 질문은 보통의 물음입니다." } },
  交代: { twEnglish: "to instruct, to tell someone to do", why: { zh: "臺語指囑咐、吩咐；韓語 교대 是輪班、交替。", ko: "대만어는 당부함, 한국어 교대는 번갈아 맡음입니다." } },
  斟酌: { twEnglish: "careful, cautious", why: { zh: "臺語形容做事小心謹慎；韓語 짐작 是估計、猜想。", ko: "대만어는 조심스러움, 한국어 짐작은 어림잡아 헤아림입니다." } },
  種種: { twEnglish: "all kinds of", why: { zh: "臺語指各種各樣；韓語 종종 是「有時、偶爾」。", ko: "대만어는 여러 가지, 한국어 종종은 ‘가끔’입니다." } },
  境界: { twEnglish: "level of attainment", why: { zh: "臺語指學問或技藝達到的程度；韓語 경계 是邊界。", ko: "대만어는 도달한 경지, 한국어 경계는 경계선입니다." } },
  白飯: { twEnglish: "plain cooked rice", why: { zh: "臺語指白米飯；韓語 백반 是飯、湯加小菜的家常套餐。", ko: "대만어는 흰 쌀밥, 한국어 백반은 밥·국·반찬이 나오는 한 상입니다." } },
  生菜: { twEnglish: "raw greens, lettuce", why: { zh: "臺語指可生吃的青菜；韓語 생채 是不煮、加調味拌的涼拌菜。", ko: "대만어는 날로 먹는 채소(상추 등), 한국어 생채는 양념한 무침입니다." } },
  花菜: { twEnglish: "cauliflower", why: { zh: "臺語指花椰菜；韓語 화채 是加水果的冰涼甜飲。", ko: "대만어는 콜리플라워, 한국어 화채는 과일을 띄운 차가운 음료입니다." } },
  鰱魚: { twEnglish: "silver carp", why: { zh: "臺語指白鰱、黑鰱等淡水魚；韓語 연어 是鮭魚。", ko: "대만어는 민물고기 백련어, 한국어 연어는 바다에서 돌아오는 연어입니다." } },
  饅頭: { twEnglish: "steamed bun", why: { zh: "臺語指發酵蒸成的饅頭；韓語 만두 是包餡的餃子。", ko: "대만어는 소 없는 찐빵, 한국어 만두는 소를 넣은 만두입니다." } },
  石花: { twEnglish: "agar seaweed (for jelly)", why: { zh: "臺語指石花菜，一種紅藻；韓語 석화 是牡蠣。", ko: "대만어는 우뭇가사리(해초), 한국어 석화는 굴입니다." } },
  正宗: { twEnglish: "authentic, genuine", why: { zh: "臺語（和華語一樣）指道地、正統；韓語 정종 是日本清酒。", ko: "대만어는 ‘정통의, 진짜’, 한국어 정종은 일본식 청주입니다." } },
};

// Short notes on what the two sounds share (written by us, 2026-10-30).
const NOTES: Record<string, Entry["note"]> = {
  時間: {
    ko: "間은 台語로 kan, 한국어로 간 — 둘 다 k로 시작해 n으로 끝납니다.",
    zh: "間：台語 kan、韓語 간 gan，都以 k 起首、以 n 收尾。",
    en: "間: Taiwanese kan, Korean 간 gan — both start with k and end in n.",
  },
  感謝: {
    ko: "感은 台語 kám, 한국어 감 — 둘 다 받침 m을 지킵니다. 중국 표준어(gǎn)에서는 사라진 소리입니다.",
    zh: "感：台語 kám、韓語 감 gam，都保留 -m 韻尾；華語 gǎn 已經沒有了。",
    en: "感: Taiwanese kám, Korean 감 gam — both keep the final -m that Mandarin gǎn has lost.",
  },
  結婚: {
    ko: "結의 台語 발음 kiat의 받침 t는 한국 한자음에서 규칙적으로 ㄹ이 됩니다: 결.",
    zh: "結：台語 kiat 的 -t 韻尾，在韓語漢字音裡規律地變成 ㄹ（결 gyeol）。",
    en: "結: the final -t of Taiwanese kiat regularly becomes ㄹ (l) in Sino-Korean: 결 gyeol.",
  },
  學生: {
    ko: "學은 台語 ha̍k, 한국어 학 — 둘 다 받침 k가 남아 있습니다.",
    zh: "學：台語 ha̍k、韓語 학 hak，兩邊都留著 -k 韻尾。",
    en: "學: Taiwanese ha̍k, Korean 학 hak — both keep the final -k.",
  },
  文化: {
    ko: "文은 台語 bûn, 한국어 문 — 台語의 b와 한국어의 m은 모두 옛 m 소리에서 왔습니다.",
    zh: "文：台語 bûn、韓語 문 mun，台語的 b 與韓語的 m 都來自古代的 m 聲母。",
    en: "文: Taiwanese bûn, Korean 문 mun — Taiwanese b and Korean m both go back to an older m sound.",
  },
};

const audioById = new Map(koreanAudio.map((a) => [a.krdictId, a]));

type Raw = (typeof vocabulary.pairs)[number];

const toEntry = (p: Raw): Entry => ({
  id: p.id,
  hanja: p.hanja,
  category: p.category,
  status: p.status as Status,
  taiwanese: {
    written: p.taiwanese.written,
    tailo: p.taiwanese.tailo,
    audio: p.taiwanese.audio,
    url: p.taiwanese.url,
    definition: p.taiwanese.definition,
    zhuyin: (p.taiwanese as { zhuyin?: string[] | null }).zhuyin ?? null,
    example: p.taiwanese.example,
  },
  korean: {
    hangul: p.korean.hangul,
    pronunciation: p.korean.pronunciation,
    romanization: romanize(p.korean.hangul, p.korean.pronunciation),
    definition: p.korean.definition,
    english: p.korean.english,
    chinese: p.korean.chinese,
    example: p.korean.example,
    url: p.korean.url,
    audio: audioById.get(p.korean.sourceId) ?? null,
  },
  note: NOTES[p.hanja] ?? null,
  falseFriend: p.status === "false_friend" ? (FALSE_FRIEND_NOTES[p.hanja] ?? null) : null,
});

export const ENTRIES: Entry[] = vocabulary.pairs.map(toEntry);
export const FALSE_FRIENDS: Entry[] = (falseFriends.pairs as Raw[]).map(toEntry);
export const COUNTS = vocabulary.counts;

// Picks the next set of pairs to show: avoids what was shown recently, mixes categories.
export class Rotation {
  private recent: string[] = [];
  private recentTraps: string[] = [];
  private memory: number;

  constructor(memory = Math.floor(ENTRIES.length * 0.6)) {
    this.memory = memory;
  }

  // `count` pairs, one or two of them false friends.
  next(count: number): Entry[] {
    const tricks = FALSE_FRIENDS.filter((e) => !this.recentTraps.includes(e.id)).sort(() => Math.random() - 0.5);
    const traps = (tricks.length ? tricks : [...FALSE_FRIENDS].sort(() => Math.random() - 0.5)).slice(0, count >= 8 ? 2 : 1);
    count -= traps.length;
    const fresh = ENTRIES.filter((e) => !this.recent.includes(e.id));
    const pool = fresh.length >= count ? fresh : ENTRIES;
    // Group by category, shuffle each, then take one per category in turn.
    const groups = new Map<string, Entry[]>();
    for (const e of [...pool].sort(() => Math.random() - 0.5)) {
      if (!groups.has(e.category)) groups.set(e.category, []);
      groups.get(e.category)!.push(e);
    }
    const order = [...groups.values()].sort(() => Math.random() - 0.5);
    const picked: Entry[] = [];
    while (picked.length < count && order.some((g) => g.length)) {
      for (const g of order) if (g.length && picked.length < count) picked.push(g.shift()!);
    }
    this.recent = [...this.recent, ...picked.map((e) => e.id)].slice(-this.memory);
    this.recentTraps = [...this.recentTraps, ...traps.map((e) => e.id)].slice(-12);
    return [...picked, ...traps].sort(() => Math.random() - 0.5);
  }
}
