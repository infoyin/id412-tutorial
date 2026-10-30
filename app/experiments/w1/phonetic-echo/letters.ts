// The two letter charts in INFO, each letter with what is spoken when it is clicked.
// 한글: the 40 letters (19 consonants incl. doubles, 21 vowels). A consonant can't be said alone,
// so it is spoken with ㅏ (ㄱ → 가); a vowel with the silent ㅇ (ㅏ → 아).
// 注音: the 37 symbols, each through a common example character (ㄅ → 玻), plus the tones.

const syllable = (initial: number, vowel: number) => String.fromCharCode(0xac00 + (initial * 21 + vowel) * 28);

const CONSONANTS: [string, string][] = [
  ["ㄱ", "g/k"], ["ㄲ", "kk"], ["ㄴ", "n"], ["ㄷ", "d/t"], ["ㄸ", "tt"], ["ㄹ", "r/l"], ["ㅁ", "m"],
  ["ㅂ", "b/p"], ["ㅃ", "pp"], ["ㅅ", "s"], ["ㅆ", "ss"], ["ㅇ", "–/ng"], ["ㅈ", "j"], ["ㅉ", "jj"],
  ["ㅊ", "ch"], ["ㅋ", "k"], ["ㅌ", "t"], ["ㅍ", "p"], ["ㅎ", "h"],
];
const VOWELS: [string, string][] = [
  ["ㅏ", "a"], ["ㅐ", "ae"], ["ㅑ", "ya"], ["ㅒ", "yae"], ["ㅓ", "eo"], ["ㅔ", "e"], ["ㅕ", "yeo"],
  ["ㅖ", "ye"], ["ㅗ", "o"], ["ㅘ", "wa"], ["ㅙ", "wae"], ["ㅚ", "oe"], ["ㅛ", "yo"], ["ㅜ", "u"],
  ["ㅝ", "wo"], ["ㅞ", "we"], ["ㅟ", "wi"], ["ㅠ", "yu"], ["ㅡ", "eu"], ["ㅢ", "ui"], ["ㅣ", "i"],
];

export type Letter = { letter: string; label: string; speak: string };

export const HANGUL: { consonants: Letter[]; vowels: Letter[] } = {
  consonants: CONSONANTS.map(([letter, label], i) => ({ letter, label, speak: syllable(i, 0) })),
  vowels: VOWELS.map(([letter, label], i) => ({ letter, label, speak: syllable(11, i) })),
};

// [symbol, pinyin, example character]
const ZHUYIN_ROWS: [string, string, string][] = [
  ["ㄅ", "b", "玻"], ["ㄆ", "p", "坡"], ["ㄇ", "m", "摸"], ["ㄈ", "f", "佛"], ["ㄉ", "d", "得"], ["ㄊ", "t", "特"],
  ["ㄋ", "n", "訥"], ["ㄌ", "l", "勒"], ["ㄍ", "g", "哥"], ["ㄎ", "k", "科"], ["ㄏ", "h", "喝"], ["ㄐ", "j", "基"],
  ["ㄑ", "q", "欺"], ["ㄒ", "x", "希"], ["ㄓ", "zh", "知"], ["ㄔ", "ch", "吃"], ["ㄕ", "sh", "詩"], ["ㄖ", "r", "日"],
  ["ㄗ", "z", "資"], ["ㄘ", "c", "雌"], ["ㄙ", "s", "思"], ["ㄧ", "i", "衣"], ["ㄨ", "u", "烏"], ["ㄩ", "ü", "迂"],
  ["ㄚ", "a", "啊"], ["ㄛ", "o", "喔"], ["ㄜ", "e", "鵝"], ["ㄝ", "ê", "耶"], ["ㄞ", "ai", "哀"], ["ㄟ", "ei", "杯"],
  ["ㄠ", "ao", "熬"], ["ㄡ", "ou", "歐"], ["ㄢ", "an", "安"], ["ㄣ", "en", "恩"], ["ㄤ", "ang", "昂"], ["ㄥ", "eng", "燈"],
  ["ㄦ", "er", "兒"],
];

export const ZHUYIN: Letter[] = ZHUYIN_ROWS.map(([letter, pinyin, example]) => ({ letter, label: `${pinyin} ${example}`, speak: example }));

// The four tones and the neutral tone, said with 媽 麻 馬 罵 嗎.
export const TONES: Letter[] = [
  ["ˉ", "1 媽", "媽"],
  ["ˊ", "2 麻", "麻"],
  ["ˇ", "3 馬", "馬"],
  ["ˋ", "4 罵", "罵"],
  ["˙", "輕 嗎", "嗎"],
].map(([letter, label, speak]) => ({ letter, label, speak }));
