"""Build the live site from src/: run the topic step, wrap the page like the publisher does, add the head tags,
and copy the modules and topics next to index.html. Run from the repo folder: python build_site.py"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
HEAD = ('<meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'
        '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Kids Maths">')

subprocess.run([sys.executable, str(SRC / "integrate_topics.py")], check=True, env={"PYTHONIOENCODING": "utf8", **__import__("os").environ})
subprocess.run([sys.executable, str(ROOT / "tests" / "wrap_like_publish.py"), str(SRC / "kitty_world4.html"), str(ROOT / "index.html")], check=True)
page = (ROOT / "index.html").read_text(encoding="utf-8")
page = page.replace('<meta charset="utf-8">', HEAD, 1)
# The calm look (modules/theme.js) loads last on every page.
page = page.replace("</body>", '<script src="modules/world.js"></script><script src="modules/theme.js"></script></body>', 1)
(ROOT / "index.html").write_text(page, encoding="utf-8")
for folder in ["modules", "topics"]:
    (ROOT / folder).mkdir(exist_ok=True)
    for f in (SRC / folder).glob("*.js"):
        shutil.copy2(f, ROOT / folder / f.name)
# The preview: the same game with the new look (modules/theme.js), at /preview/, for the parents to check first.
prev = page.replace("<head>", '<head><base href="../">', 1)
(ROOT / "preview").mkdir(exist_ok=True)
(ROOT / "preview" / "index.html").write_text(prev, encoding="utf-8")
print("built index.html and preview/index.html", len(page), "characters")
