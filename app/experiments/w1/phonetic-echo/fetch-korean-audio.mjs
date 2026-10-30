// Korean recordings from Lingua Libre (Wikimedia Commons), for the words in vocabulary.json.
// krdict's own recordings are not used: their license is set per file and not stated.
//
//   node app/experiments/w1/phonetic-echo/fetch-korean-audio.mjs
//
// Keeps only CC0 / CC BY / CC BY-SA / public-domain files, saves them unmodified to
// public/experiments/w1/phonetic-echo/audio/ko/<krdict id>.<ext>, and writes korean-audio.json
// (word, file, license, author, source page) next to this script.

import fs from "fs";
import path from "path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, "../../../../public/experiments/w1/phonetic-echo/audio/ko");
const UA = { "User-Agent": "ID412 student project (Phonetic Echo)" };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?format=json&" + params;
  for (;;) {
    const res = await fetch(url, { headers: UA });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) return res.json();
    await wait(10000); // rate limited: back off
  }
}

const pairs = JSON.parse(fs.readFileSync(path.join(HERE, "vocabulary.json"), "utf8")).pairs;
const words = new Set(pairs.map((p) => p.korean.hangul));

// 1. All Korean Lingua Libre files whose word is in the vocabulary.
const found = {};
let cont = "";
do {
  const j = await api(`action=query&list=categorymembers&cmtitle=Category:Lingua_Libre_pronunciation-kor&cmtype=file&cmlimit=500${cont}`);
  for (const { title } of j.query.categorymembers) {
    const m = title.match(/^File:LL-Q9176 \(kor\)-(.+?)-(.+)\.(wav|ogg|flac|mp3)$/);
    if (m && words.has(m[2]) && !found[m[2]]) found[m[2]] = title;
  }
  cont = j.continue ? `&cmcontinue=${encodeURIComponent(j.continue.cmcontinue)}` : "";
} while (cont);

// 2. Download each with its license.
fs.mkdirSync(OUT, { recursive: true });
const credits = [];
for (const [word, title] of Object.entries(found)) {
  const j = await api(`action=query&prop=imageinfo&iiprop=url|extmetadata&titles=${encodeURIComponent(title)}`);
  const info = Object.values(j.query.pages)[0].imageinfo[0];
  const license = info.extmetadata.LicenseShortName?.value ?? "";
  if (!/^(CC0|CC BY|Public domain)/i.test(license)) continue;
  const id = pairs.find((p) => p.korean.hangul === word).korean.sourceId;
  const file = `${id}.${info.url.split("?")[0].split(".").pop()}`;
  fs.writeFileSync(path.join(OUT, file), Buffer.from(await (await fetch(info.url, { headers: UA })).arrayBuffer()));
  const author = (info.extmetadata.Artist?.value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  credits.push({ word, krdictId: id, file: `/experiments/w1/phonetic-echo/audio/ko/${file}`, license, author, source: info.descriptionurl });
  console.log(word, file, license);
  await wait(2500);
}
fs.writeFileSync(path.join(HERE, "korean-audio.json"), JSON.stringify(credits, null, 1));
console.log(`${credits.length} recordings for ${words.size} words`);
