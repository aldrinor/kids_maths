"""make_offline_files.py - writes the FILES list, the ART list and VERSION inside game/sw.js.
FILES = game/index.html, the web app manifest, the icons, and every script and style the page links (the exact ?v= spelling).
ART   = every picture under game/scene/art, game/rewards/art and game/world/art, and the icons. (The voice folder is never listed.)
VERSION = "v" + the first 8 letters of a hash of every listed file, so a changed file makes a new cache by itself.
Run: python tools/make_offline_files.py          (writes sw.js)      python tools/make_offline_files.py --check   (exit 1 if sw.js is out of date)"""
import hashlib
import re
import sys
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent / "game"
SW = GAME / "sw.js"
ART_DIRS = ["scene/art", "rewards/art", "world/art"]
BLOCK = re.compile(r"/\*FILES-BEGIN\*/.*?/\*FILES-END\*/", re.S)


def page_files():
    html = (GAME / "index.html").read_text(encoding="utf-8")
    refs = re.findall(r'<script[^>]+src="([^"]+)"', html) + re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', html)
    local = [r for r in refs if not re.match(r"https?:", r)]
    files = ["index.html", "app.webmanifest", "sw.js"] + sorted(p.name and "icons/" + p.name for p in (GAME / "icons").glob("*.png")) + local
    seen, out = set(), []
    for f in files:
        if f not in seen and f != "sw.js":
            seen.add(f); out.append(f)
    return out


def art_files():
    out = []
    for d in ART_DIRS:
        out += sorted(str(p.relative_to(GAME)).replace("\\", "/") for p in (GAME / d).rglob("*") if p.suffix.lower() in (".png", ".webp", ".svg", ".jpg"))
    return out


def build():
    files, art = page_files(), art_files()
    h = hashlib.sha256()
    for rel in files + art:
        p = (GAME / rel.split("?")[0]).resolve()
        if not p.exists():
            raise SystemExit(f"make_offline_files: the page lists {rel} but the file does not exist")
        h.update(rel.encode()); h.update(p.read_bytes())
    lines = ["/*FILES-BEGIN*/", f'const VERSION = "v{h.hexdigest()[:8]}";', "const FILES = [", ",\n".join(f'  "{f}"' for f in files), "];",
             "const ART = [", ",\n".join(f'  "{a}"' for a in art), "];", "/*FILES-END*/"]
    return "\n".join(lines)


if __name__ == "__main__":
    text = SW.read_text(encoding="utf-8")
    new = BLOCK.sub(lambda m: build(), text, count=1)
    if "--check" in sys.argv:
        sys.exit(0 if new == text else 1)
    SW.write_text(new, encoding="utf-8")
    print("sw.js updated:", len(page_files()), "files,", len(art_files()), "pictures")
