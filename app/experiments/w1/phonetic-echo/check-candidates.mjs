// Vocabulary expansion helper. Looks up candidate pairs in both dictionaries and prints JSON.
//
//   node app/experiments/w1/phonetic-echo/check-candidates.mjs 電話:전화 學校:학교
//
// For each "漢字:한글" it finds, if they exist:
// - the Taiwanese headword in 教育部《臺灣台語常用詞辭典》: Tâi-lô, entry id, recording path
// - the Korean entry in 《한국어기초사전》 whose 원어 is the same 漢字: pronunciation, first definition
// The output is only a lookup. Pairs stay status "candidate" in words.ts until a person has
// compared the meanings and usage; finding both entries does not make them equivalent.

const UA = { "User-Agent": "Mozilla/5.0 (ID412 student project)" };
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function taiwanese(hanja) {
  const url = `https://sutian.moe.edu.tw/zh-hant/tshiau/?lui=tai_su&tsha=${encodeURIComponent(hanja)}`;
  const html = await (await fetch(url, { headers: UA })).text();
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const id = row.match(/href="\/zh-hant\/su\/(\d+)\/"/)?.[1];
    if (!id || !strip(row).startsWith(`詞目 ${hanja} 音讀`)) continue;
    const tailo = strip(row).match(/音讀 (\S+)/)?.[1] ?? null;
    const audio = row.match(/(\/media\/senn\/mp3\/[^&"]+\.mp3)/)?.[1] ?? null;
    return { tailo, id, source: `https://sutian.moe.edu.tw/zh-hant/su/${id}/`, audio: audio && `https://sutian.moe.edu.tw${audio}` };
  }
  return null;
}

let cookie = "";
async function korean(hangul, hanja) {
  if (!cookie) {
    const res = await fetch("https://krdict.korean.go.kr/kor/mainAction", { headers: UA });
    cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  }
  const url = `https://krdict.korean.go.kr/kor/dicMarinerSearch/search?nationCode=&ParaWordNo=&mainSearchWord=${encodeURIComponent(hangul)}`;
  const html = await (await fetch(url, { headers: { ...UA, Cookie: cookie } })).text();
  for (const entry of html.match(/<dl id="article\d+"[\s\S]*?<\/dl>/g) ?? []) {
    if (!entry.includes(`(${hanja})`)) continue;
    const wordNo = entry.match(/checkSubmit\('(\d+)'/)?.[1];
    const pronunciation = entry.match(/\[([^<\]]+)<a href="javascript:fnSoundPlay/)?.[1]?.trim() ?? null;
    const definition = strip(entry.match(/<dd[\s\S]*?<\/dd>/)?.[0] ?? "").replace(/^1 \. /, "") || null;
    return { wordNo, pronunciation, definition, source: `https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo=${wordNo}` };
  }
  return null;
}

const out = [];
for (const arg of process.argv.slice(2)) {
  const [hanja, hangul] = arg.split(":");
  const [tw, ko] = [await taiwanese(hanja), await korean(hangul, hanja)];
  out.push({ hanja, hangul, taiwanese: tw, korean: ko, foundInBoth: Boolean(tw && ko) });
}
console.log(JSON.stringify(out, null, 2));
