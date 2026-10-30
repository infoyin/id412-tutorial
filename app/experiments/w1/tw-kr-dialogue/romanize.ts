// Korean → Revised Romanization (국어의 로마자 표기법), syllable by syllable.
// RR follows pronunciation (독립 → dongnip), so we read krdict's standard pronunciation, with
// one exception RR makes: tensing is not written (학생 [학쌩] → haksaeng), so a tense consonant
// that is plain in the spelling goes back to plain. Good for Sino-Korean words; not a full
// implementation of every RR rule.

const INITIAL = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const FINAL = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
const TENSE_TO_PLAIN: Record<number, number> = { 1: 0, 4: 3, 8: 7, 10: 9, 13: 12 }; // ㄲ ㄸ ㅃ ㅆ ㅉ

const parts = (syllable: string) => {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return { initial: Math.floor(code / 588), vowel: Math.floor((code % 588) / 28), final: code % 28 };
};

export function romanize(hangul: string, pronunciation: string) {
  const spelled = [...hangul];
  const said = [...pronunciation.split("/")[0].replace(/[ːˑ\s-]/g, "")];
  const source = said.length === spelled.length ? said : spelled; // fall back to the spelling
  let out = "";
  let lastFinal = 0;
  source.forEach((syllable, i) => {
    const p = parts(syllable);
    if (!p) return;
    let initial = p.initial;
    const written = parts(spelled[i]);
    if (written && initial in TENSE_TO_PLAIN && written.initial !== initial) initial = TENSE_TO_PLAIN[initial];
    // ㄹ after ㄹ is "ll" (결론 gyeollon): the second one is written l, not r.
    out += lastFinal === 8 && initial === 5 ? "l" : INITIAL[initial];
    out += VOWEL[p.vowel] + FINAL[p.final];
    lastFinal = p.final;
  });
  return out;
}
