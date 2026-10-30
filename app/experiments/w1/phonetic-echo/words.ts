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
