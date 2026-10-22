"""Make game pictures with Codex image generation, a few at a time.
Each job: {"name": "mimi_stand", "prompt": "...", "ref": "mimi_stand" (optional, a raw picture made earlier, for matching style)}.
Raw pictures are saved to --raw as <name>.png; jobs whose raw file exists are skipped, so a rerun only makes what is missing.
Run: python tools/make_art.py --jobs tools/art_jobs_cafe.json --raw <work folder> [--only name1,name2] [--workers 4]"""
import argparse
import concurrent.futures
import json
import re
import shutil
import subprocess
from pathlib import Path

GEN = Path.home() / ".codex" / "generated_images"
CODEX = shutil.which("codex") or "codex"
PATH_RE = re.compile(r"generated_images[/\\]([^\s)\]>'\"]+?\.png)")


def make(job, style, raw):
    out = raw / f"{job['name']}.png"
    if out.exists():
        return f"skip {job['name']}"
    prompt = (f"Use your image generation tool to create exactly ONE image. {job['prompt']} {style} "
              "Do not run any shell commands. When done, reply only with the full file path of the generated PNG.")
    cmd = [CODEX, "exec", "--skip-git-repo-check", "-c", 'model_reasoning_effort="low"']
    if job.get("ref"):
        cmd += ["-i", str(raw / f"{job['ref']}.png")]
    cmd.append("-")   # the prompt goes in on stdin, so quotes in it are safe on Windows
    r = subprocess.run(cmd, input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900, shell=False)
    found = PATH_RE.findall(r.stdout + r.stderr)
    for rel in reversed(found):
        src = GEN / Path(rel.replace("\\", "/"))
        if src.exists():
            shutil.copy(src, out)
            return f"made {job['name']}"
    tail = (r.stdout + r.stderr).strip()[-400:]
    return f"FAIL {job['name']} (no picture path found; exit {r.returncode}): {tail}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--raw", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    spec = json.loads(Path(a.jobs).read_text(encoding="utf-8"))
    raw = Path(a.raw); raw.mkdir(parents=True, exist_ok=True)
    jobs = spec["jobs"]
    if a.only:
        keep = set(a.only.split(",")); jobs = [j for j in jobs if j["name"] in keep]
    # jobs whose reference is also being made wait for it: run in waves
    done = {p.stem for p in raw.glob("*.png")}
    todo = list(jobs)
    while todo:
        wave = [j for j in todo if not j.get("ref") or j["ref"] in done]
        if not wave:
            print("FAIL some references were never made:", [j["name"] for j in todo]); break
        with concurrent.futures.ThreadPoolExecutor(a.workers) as ex:
            for msg in ex.map(lambda j: make(j, spec["style"], raw), wave):
                print(msg, flush=True)
        done = {p.stem for p in raw.glob("*.png")}
        todo = [j for j in todo if j not in wave]


if __name__ == "__main__":
    main()
