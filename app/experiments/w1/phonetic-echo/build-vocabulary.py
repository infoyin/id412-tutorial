"""Build vocabulary.json: Taiwanese ↔ Korean words written with the same Chinese characters.

Offline, standard library only. Inputs are the two official full-dictionary downloads:
  1. 教育部《臺灣台語常用詞辭典》 kautian.ods  https://sutian.moe.edu.tw/zh-hant/siongkuantsuguan/
  2. 국립국어원《한국어기초사전》 JSON zip, unzipped  https://krdict.korean.go.kr → 사전 전체 내려받기

  3. Unicode Unihan_Variants.txt (from Unihan.zip)  https://www.unicode.org/Public/UCD/latest/ucd/

  4. (optional) sutiau-mp3.zip, the MOE recordings: the usable words' files are copied unmodified
     to public/experiments/w1/phonetic-echo/audio/tw/ (renamed 6050(1).mp3 → 6050-1.mp3).

  python3 build-vocabulary.py kautian.ods path/to/krdict-json-folder Unihan_Variants.txt [sutiau-mp3.zip]

How pairs are found
  - Korean entries whose 원어 (origin) is all Chinese characters (Sino-Korean words).
  - The origin is NFC-normalised (Korean compatibility ideographs → standard ones) and a small,
    explicit table maps Korean variant glyphs to the Taiwanese form (敎 → 教). No simplified ↔
    traditional conversion of the words themselves; different characters are never merged.
  - A pair exists when a Taiwanese main entry (主詞目) is written with exactly those characters.

Status — "dictionary_matched" needs evidence on both sides:
  - Korean: krdict's own Chinese translation of the Korean word is the same word (simplified
    characters compared through Unicode's kTraditionalVariant table).
  - Taiwanese: the MOE dictionary lists it as 臺華共同詞 (used as in Mandarin), or its definition
    contains the word, or it is one of ASSISTANT_COMPARED (definitions compared one by one by the
    AI assistant on 2026-10-30; not a human review).
  Otherwise "candidate": same characters, meaning not shown to correspond (e.g. 新聞 → 报纸
  "newspaper"; 食醋 = vinegar in Korean but "to be jealous" in Taiwanese). Needs a person.
  - "editor_reviewed" is never set here. Only a person who has checked a pair sets it, by hand.

Output: vocabulary.json (usable: common words with a Taiwanese recording) and
vocabulary-candidates.json (everything else that matched), next to this file.
"""

import collections
import glob
import json
import os
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
HAN = re.compile(r"^[㐀-䶿一-鿿豈-﫿]+$")

# Korean variant glyph → the form the Taiwanese dictionary uses. Same character, different glyph.
VARIANTS = {"敎": "教", "硏": "研", "靑": "青", "眞": "真", "爲": "為", "淸": "清", "晩": "晚", "呑": "吞", "卽": "即", "旣": "既", "槪": "概", "緖": "緒", "鷄": "雞", "姸": "妍"}

# False friends: same characters, clearly different meanings in the two dictionaries' own
# definitions (新聞 = news vs 신문 = newspaper). Chosen by the AI assistant (2026-10-31) by reading
# both definitions; not human-reviewed. Written to false-friends.json.
FALSE_FRIENDS = ["新聞", "工夫", "點心", "料理", "安寧", "便宜", "人事", "試驗", "操心", "千萬", "階段",
                 "新婦", "焦燥", "豆乳", "經理", "汽車", "人間", "質問", "交代", "斟酌", "種種", "境界"]

# Pairs whose two definitions the AI assistant compared entry by entry (2026-10-30).
ASSISTANT_COMPARED = {"時間", "感謝", "結婚", "學生", "文化"}

# krdict semantic category (first part) → the categories used in the piece.
CATEGORIES = [
    ("시간", "time & space"), ("공간", "time & space"), ("위치", "time & space"),
    ("교육", "education"), ("학문", "education"), ("언어", "education"),
    ("친족", "family"), ("가족", "family"), ("사람의 종류", "family"),
    ("감정", "emotions"), ("성격", "emotions"), ("태도", "emotions"),
    ("음식", "food"), ("식생활", "food"),
    ("자연", "nature"), ("동식물", "nature"), ("날씨", "nature"), ("천체", "nature"),
    ("과학", "technology"), ("교통", "technology"), ("통신", "technology"), ("기계", "technology"),
    ("사회", "society"), ("문화", "society"), ("경제", "society"), ("정치", "society"), ("종교", "society"), ("예술", "society"),
    ("개념", "abstract"), ("인지", "abstract"),
    ("삶", "everyday"), ("주생활", "everyday"), ("의생활", "everyday"), ("인간", "everyday"),
]

ODS = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
OFFICE = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}"
TEXT = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"


def ods_sheets(path, wanted):
    root = ET.fromstring(zipfile.ZipFile(path).read("content.xml"))
    sheets = {}
    for table in root.iter(ODS + "table"):
        name = table.get(ODS + "name")
        if name not in wanted:
            continue
        rows = []
        for row in table.iter(ODS + "table-row"):
            cells = []
            for cell in row.findall(ODS + "table-cell"):
                repeat = min(int(cell.get(ODS + "number-columns-repeated", "1")), 20)
                text = "\n".join("".join(p.itertext()) for p in cell.findall(TEXT + "p"))
                cells += [cell.get(OFFICE + "value") or text] * repeat
            if any(c.strip() for c in cells):
                rows.append(cells)
        header = rows[0]
        sheets[name] = [dict(zip(header, r)) for r in rows[1:]]
    return sheets


def taiwanese(path):
    sheets = ods_sheets(path, {"詞目", "義項", "例句"})
    senses = collections.defaultdict(list)
    for s in sheets["義項"]:
        senses[s["詞目id"].split(".")[0]].append(s.get("解說", ""))
    examples = {}
    for x in sheets["例句"]:
        examples.setdefault(x["詞目id"].split(".")[0], {"han": x.get("漢字", ""), "tailo": x.get("羅馬字", ""), "zh": x.get("華語", "")})
    words = {}
    for e in sheets["詞目"]:
        kind = e.get("詞目類型")
        if kind not in ("主詞目", "臺華共同詞") or not HAN.match(e.get("漢字", "")):
            continue
        if e["漢字"] in words and words[e["漢字"]]["kind"] == "主詞目":
            continue  # keep the main entry when both exist
        sid = e["詞目id"].split(".")[0]
        words[e["漢字"]] = {
            "kind": kind,
            "id": sid,
            "tailo": e.get("羅馬字", ""),
            "category": e.get("分類", ""),
            "audioFile": e.get("羅馬字音檔檔名", ""),
            "definition": next((d for d in senses[sid] if d.strip()), ""),
            "example": examples.get(sid),
            "url": f"https://sutian.moe.edu.tw/zh-hant/su/{sid}/",
        }
    return words


def feats(node):
    items = node.get("feat", [])
    items = items if isinstance(items, list) else [items]
    return {f["att"]: f.get("val", "") for f in items}


def as_list(x):
    return x if isinstance(x, list) else ([] if x is None else [x])


def korean(folder):
    entries = []
    for path in sorted(glob.glob(os.path.join(folder, "*.json"))):
        data = json.load(open(path, encoding="utf8"))
        for e in data["LexicalResource"]["Lexicon"]["LexicalEntry"]:
            f = feats(e)
            origin = unicodedata.normalize("NFC", f.get("origin", ""))
            if f.get("lexicalUnit") != "단어" or not HAN.match(origin) or not 2 <= len(origin) <= 4:
                continue
            forms = [feats(w) for w in as_list(e.get("WordForm")) if feats(w).get("type") == "발음"]
            first = as_list(e.get("Sense"))[0] if e.get("Sense") else {}
            equivalents = {feats(q).get("language"): feats(q).get("lemma", "") for q in as_list(first.get("Equivalent"))}
            samples = [feats(x) for x in as_list(first.get("SenseExample"))]
            # A full sentence if there is one, else a phrase.
            sample = next((x for x in samples if x.get("type") == "문장"), samples[0] if samples else {})
            entries.append({
                "id": e["val"],
                "hangul": feats(as_list(e["Lemma"])[0])["writtenForm"],
                "origin": "".join(VARIANTS.get(c, c) for c in origin),
                "variantNormalised": any(c in VARIANTS for c in origin),
                "homonym": int(f.get("homonym_number", "0") or 0),
                "pos": f.get("partOfSpeech", ""),
                "level": f.get("vocabularyLevel", ""),
                "semantic": f.get("semanticCategory", ""),
                "pronunciation": forms[0].get("pronunciation", "") if forms else "",
                "definition": feats(first).get("definition", "").strip(),
                "english": equivalents.get("영어", ""),
                "chinese": equivalents.get("중국어", ""),
                "example": sample.get("example", "").strip(),
                "url": f"https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo={e['val']}",
            })
    return entries


def traditional_forms(unihan_variants):
    """Simplified → set of traditional characters, from Unicode's Unihan_Variants.txt
    (kTraditionalVariant). One-to-many is kept: 发 → {發, 髮}."""
    forms = {}
    for line in open(unihan_variants, encoding="utf8"):
        parts = line.rstrip("\n").split("\t")
        if len(parts) == 3 and parts[1] == "kTraditionalVariant":
            forms[chr(int(parts[0][2:], 16))] = {chr(int(u[2:], 16)) for u in parts[2].split()}
    return forms


def same_word(translation, hanja, forms):
    """Is this simplified-Chinese translation the same word as the traditional characters?"""
    return len(translation) == len(hanja) and all(t == s or t in forms.get(s, ()) for s, t in zip(translation, hanja))


def category(semantic):
    for key, name in CATEGORIES:
        if key in semantic:
            return name
    return "everyday"


def main(ods_path, kr_folder, unihan_variants, mp3_zip=None):
    tw = taiwanese(ods_path)
    ko = korean(kr_folder)
    forms = traditional_forms(unihan_variants)
    level_rank = {"초급": 0, "중급": 1, "고급": 2}

    best = {}  # one Korean entry per written form: the commonest, then the first homonym
    for k in ko:
        if k["origin"] not in tw:
            continue
        key = (level_rank.get(k["level"], 3), k["homonym"])
        if k["origin"] not in best or key < best[k["origin"]][0]:
            best[k["origin"]] = (key, k)

    pairs = []
    for hanja, (_, k) in sorted(best.items()):
        t = tw[hanja]
        options = [o for o in re.split(r"[,，;；、/ ]+", k["chinese"]) if o]
        korean_side = any(same_word(o, hanja, forms) for o in options)
        taiwanese_side = t["kind"] == "臺華共同詞" or hanja in t["definition"] or hanja in ASSISTANT_COMPARED
        same_meaning = korean_side and taiwanese_side
        pairs.append({
            "id": f"{hanja}-{k['id']}",
            "hanja": hanja,
            "category": category(k["semantic"]),
            "status": "dictionary_matched" if same_meaning else "candidate",
            "evidence": {
                "sameWrittenForm": True,
                "variantNormalised": k["variantNormalised"],
                "krdictChineseTranslation": k["chinese"],
                "translationIsSameWord": korean_side,
                "taiwaneseEntryType": t["kind"],
                "taiwaneseDefinitionHasWord": hanja in t["definition"],
                "assistantCompared": hanja in ASSISTANT_COMPARED,
                "editorReviewed": False,
            },
            "taiwanese": {
                "written": hanja,
                "tailo": t["tailo"],
                "definition": t["definition"],
                "example": t["example"],
                "audioFile": t["audioFile"],
                "sourceId": t["id"],
                "url": t["url"],
            },
            "korean": {
                "hangul": k["hangul"],
                "pronunciation": k["pronunciation"],
                "definition": k["definition"],
                "english": k["english"],
                "chinese": k["chinese"],
                "example": k["example"],
                "level": k["level"],
                "pos": k["pos"],
                "semantic": k["semantic"],
                "sourceId": k["id"],
                "url": k["url"],
            },
        })

    usable = [p for p in pairs
              if p["status"] == "dictionary_matched" and p["korean"]["level"] in ("초급", "중급")
              and p["taiwanese"]["audioFile"] and p["korean"]["pronunciation"]]
    rest = [p for p in pairs if p not in usable]
    by_hanja = {p["hanja"]: p for p in pairs}
    false_friends = [{**by_hanja[h], "status": "false_friend"} for h in FALSE_FRIENDS if h in by_hanja]

    for p in usable + false_friends:
        name = p["taiwanese"]["audioFile"]  # e.g. 6050(1)
        p["taiwanese"]["audio"] = "/experiments/w1/phonetic-echo/audio/tw/" + name.replace("(", "-").rstrip(")") + ".mp3"
    if mp3_zip:
        out = os.path.join(HERE, "../../../../public/experiments/w1/phonetic-echo/audio/tw")
        os.makedirs(out, exist_ok=True)
        archive = zipfile.ZipFile(mp3_zip)
        for p in usable + false_friends:
            name = p["taiwanese"]["audioFile"]
            folder = str(int(name.split("(")[0]) // 1000)
            data = archive.read(f"{folder}/{name}.mp3")
            open(os.path.join(out, os.path.basename(p["taiwanese"]["audio"])), "wb").write(data)
    meta = {
        "sources": {
            "taiwanese": "教育部《臺灣台語常用詞辭典》 kautian.ods, CC BY-ND 3.0 TW",
            "korean": "국립국어원《한국어기초사전》 full JSON download, CC BY-SA 2.0 KR",
        },
        "counts": {"matchedForms": len(pairs), "usable": len(usable),
                   "dictionaryMatched": sum(p["status"] == "dictionary_matched" for p in pairs),
                   "candidate": sum(p["status"] == "candidate" for p in pairs)},
    }
    # Compact: the page loads this file.
    json.dump({**meta, "pairs": usable}, open(os.path.join(HERE, "vocabulary.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({**meta, "pairs": rest}, open(os.path.join(HERE, "vocabulary-candidates.json"), "w"), ensure_ascii=False, indent=1)
    json.dump({"note": "Chosen by the AI assistant from both dictionaries' definitions; not human-reviewed.", "pairs": false_friends},
              open(os.path.join(HERE, "false-friends.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print("false friends:", len(false_friends), "missing:", [h for h in FALSE_FRIENDS if h not in by_hanja])
    print(json.dumps(meta["counts"]), "| categories:", dict(collections.Counter(p["category"] for p in usable)))


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(*sys.argv[1:5])
