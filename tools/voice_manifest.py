"""Write <voice dir>/manifest.json from the mp3 files that exist now, so the game can use them while
make_voice.py is still recording the rest. The game reads the manifest to know which sentences have a clip.
Run: python tools/voice_manifest.py --phrases <list.json> --dir game/voice"""
import argparse
import json
from pathlib import Path


def fnv(text):
    h = 0x811c9dc5
    for b in text.encode("utf-8"):
        h ^= b; h = (h * 0x01000193) & 0xffffffff
    return f"{h:08x}"


ap = argparse.ArgumentParser()
ap.add_argument("--phrases", required=True)
ap.add_argument("--dir", required=True)
a = ap.parse_args()
d = Path(a.dir)
have = {p.stem for p in d.glob("*.mp3")}
manifest = {fnv(t): t for t in json.loads(Path(a.phrases).read_text(encoding="utf-8")) if fnv(t) in have}
(d / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"manifest: {len(manifest)} clips listed, {len(have)} mp3 files")
