from copy import deepcopy
from pathlib import Path
from urllib.request import urlopen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph

THEME_URL = "https://raw.githubusercontent.com/qassimtawfiq/My-custom-theme-/02b8942733c21a24fb8846004f43bcd61658dea5/%D8%AE%D8%B7%20%D9%85%D8%AF%D9%85%D8%AC%20%D8%A7%D9%8A%D9%81%D9%88%D9%86%20%D8%B9%D8%B1%D9%8A%D8%B6.ttf"
EMOJI_URL = "https://github.com/qassimtawfiq/ios26-emoji-plugin/releases/download/v1.0/iOS.26.4.Unicode.17.ttf"
OUT = Path("assets/ios26-hybrid.ttf")

def download(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(url) as response, path.open("wb") as f:
        f.write(response.read())

def rename_refs(obj, rename):
    if isinstance(obj, str):
        return rename.get(obj, obj)
    if isinstance(obj, list):
        for i, value in enumerate(obj): obj[i] = rename_refs(value, rename)
        return obj
    if isinstance(obj, tuple):
        return tuple(rename_refs(value, rename) for value in obj)
    if isinstance(obj, dict):
        items = [(rename_refs(k, rename), rename_refs(v, rename)) for k, v in obj.items()]
        obj.clear(); obj.update(items); return obj
    if hasattr(obj, "__dict__"):
        for key, value in list(vars(obj).items()):
            setattr(obj, key, rename_refs(value, rename))
    return obj

def build():
    work = Path(".font-build")
    download(THEME_URL, work / "theme.ttf")
    download(EMOJI_URL, work / "emoji.ttf")
    base = TTFont(work / "theme.ttf", lazy=False)
    emoji = TTFont(work / "emoji.ttf", lazy=False)
    base_order = list(base.getGlyphOrder())
    base_set = set(base_order)
    rename = {name: (name if name == ".notdef" else ("emoji_" + name if name in base_set else name)) for name in emoji.getGlyphOrder()}
    new_order = base_order + [rename[name] for name in emoji.getGlyphOrder() if name != ".notdef"]
    base.setGlyphOrder(new_order)
    for old in emoji.getGlyphOrder():
        new = rename[old]
        if new == ".notdef": continue
        base["glyf"][new] = Glyph()
        base["hmtx"][new] = emoji["hmtx"][old]
    base["maxp"].numGlyphs = len(new_order)
    base["hhea"].numberOfHMetrics = len(new_order)
    base["post"].formatType = 3.0
    for target in base["cmap"].tables:
        if target.platformID == 0 or (target.platformID == 3 and target.platEncID in (1, 10)):
            for source in emoji["cmap"].tables:
                for codepoint, old_name in source.cmap.items():
                    if target.format == 4 and codepoint > 0xffff: continue
                    target.cmap[codepoint] = rename.get(old_name, old_name)
    cbdt = deepcopy(emoji["CBDT"])
    for strike in cbdt.strikeData:
        for old in list(strike.keys()):
            strike[rename.get(old, old)] = strike.pop(old)
    base["CBDT"] = cbdt
    cblc = deepcopy(emoji["CBLC"])
    for strike in cblc.strikes:
        for subtable in strike.indexSubTables:
            subtable.names = [rename.get(name, name) for name in subtable.names]
            subtable.firstGlyphIndex = new_order.index(subtable.names[0])
            subtable.lastGlyphIndex = new_order.index(subtable.names[-1])
    base["CBLC"] = cblc
    gsub = deepcopy(emoji["GSUB"])
    rename_refs(gsub, rename)
    base["GSUB"] = gsub
    OUT.parent.mkdir(parents=True, exist_ok=True)
    base.save(OUT)
    print(f"built {OUT} ({OUT.stat().st_size} bytes, {len(new_order)} glyphs)")

if __name__ == "__main__": build()
