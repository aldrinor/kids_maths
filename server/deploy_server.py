"""Deploy the Kids Maths Google script (backup + daily email) with clasp, then set the family key and the two
email addresses. Run after the parent has run `npx @google/clasp login` once with the parent's Google account.

    python server/deploy_server.py --emails parent1@example.com,parent2@example.com --code-file "C:/Family Office/16_kids_maths/setup_code.txt"

The setup code (KM1:<url>|<key>) is written to --code-file only, never printed in full and never put in the repo.
It is typed once into the Parent area of each device."""
import argparse
import json
import re
import secrets
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent


def clasp(*args):
    r = subprocess.run(["npx", "--yes", "@google/clasp", *args], cwd=HERE, capture_output=True, text=True, shell=sys.platform == "win32")
    if r.returncode:
        sys.exit(f"clasp {' '.join(args)} failed:\n{r.stdout}\n{r.stderr}")
    return r.stdout + r.stderr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emails", required=True, help="comma-separated parent addresses")
    ap.add_argument("--code-file", required=True, help="private file for the setup code")
    a = ap.parse_args()
    if not (Path.home() / ".clasprc.json").exists():
        sys.exit("Not logged in to Google yet. The parent must run: npx @google/clasp login")
    if not (HERE / ".clasp.json").exists():
        clasp("create", "--type", "webapp", "--title", "Kids Maths", "--rootDir", ".")
    clasp("push", "--force")
    out = clasp("deploy", "--description", "Kids Maths")
    m = re.findall(r"(AKfy[\w-]+)", out)
    if not m:
        sys.exit("Could not read the deployment id from clasp:\n" + out)
    url = f"https://script.google.com/macros/s/{m[-1]}/exec"
    key = secrets.token_urlsafe(32)
    q = urllib.request.urlopen(f"{url}?action=setup&key={key}&emails={urllib.parse.quote(a.emails)}", timeout=60).read().decode()
    res = json.loads(q) if q.strip().startswith("{") else {"ok": False, "error": q[:200]}
    code = f"KM1:{url}|{key}"
    link = "https://aldrinor.github.io/kids_maths/#setup=" + urllib.parse.quote(code, safe="")
    Path(a.code_file).write_text(f"Setup code: {code}\nSetup link (open once on each iPad): {link}\n", encoding="utf-8")
    print("deployed:", url)
    print("setup answer:", res)
    print("setup code saved to:", a.code_file)


if __name__ == "__main__":
    main()
