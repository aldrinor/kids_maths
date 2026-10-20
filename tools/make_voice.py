"""Turn a JSON list of English sentences into small mono MP3 files using Kokoro (kokoro-onnx).

File name = FNV-1a 32-bit hash of the UTF-8 text as 8 lowercase hex chars + ".mp3".
Also writes <out>/manifest.json = {hash: text}. Existing mp3 files are skipped.
Nothing is ever played on the speakers.
"""
import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import lameenc
from kokoro_onnx import Kokoro

TTS_ROOT = Path(__file__).resolve().parents[2] / "tts"
SAMPLE_RATE = 24000
SILENCE_THRESHOLD = 0.01  # absolute amplitude below this counts as silence


def fnv1a_32(text: str) -> str:
    h = 0x811C9DC5
    for byte in text.encode("utf-8"):
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def trim_silence(samples: np.ndarray, rate: int, keep_ms: int) -> np.ndarray:
    loud = np.flatnonzero(np.abs(samples) > SILENCE_THRESHOLD)
    if loud.size == 0:
        raise ValueError("audio is entirely silent")
    keep = int(rate * keep_ms / 1000)
    start = max(0, loud[0] - keep)
    end = min(len(samples), loud[-1] + 1 + keep)
    return samples[start:end]


def encode_mp3(samples: np.ndarray, rate: int, kbps: int) -> bytes:
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(pcm.tobytes()) + enc.flush())


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--phrases", required=True, help="JSON array of strings")
    p.add_argument("--out", required=True, help="output folder")
    p.add_argument("--voice", default="af_heart")
    p.add_argument("--speed", type=float, default=0.95)
    p.add_argument("--kbps", type=int, default=48)
    p.add_argument("--trim_ms", type=int, default=80, help="max leading/trailing silence kept")
    p.add_argument("--model", default=str(TTS_ROOT / "models" / "kokoro-v1.0.onnx"))
    p.add_argument("--voices", default=str(TTS_ROOT / "models" / "voices-v1.0.bin"))
    p.add_argument("--lang", default="en-us")
    args = p.parse_args()

    phrases = json.loads(Path(args.phrases).read_text(encoding="utf-8"))
    if not isinstance(phrases, list) or not all(isinstance(s, str) and s.strip() for s in phrases):
        raise SystemExit("phrases file must be a JSON array of non-empty strings")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    hashes = {}
    for text in phrases:
        h = fnv1a_32(text)
        if h in hashes and hashes[h] != text:
            raise SystemExit(f"hash collision {h}: {hashes[h]!r} vs {text!r}")
        hashes[h] = text

    kokoro = None
    made = skipped = 0
    total = len(hashes)
    for i, (h, text) in enumerate(hashes.items(), 1):
        target = out / f"{h}.mp3"
        if target.exists() and target.stat().st_size > 0:
            skipped += 1
            print(f"[{i}/{total}] skip {h}.mp3  {text!r}", flush=True)
            continue
        if kokoro is None:
            kokoro = Kokoro(args.model, args.voices)
        t0 = time.perf_counter()
        samples, rate = kokoro.create(text, voice=args.voice, speed=args.speed, lang=args.lang)
        if rate != SAMPLE_RATE:
            raise RuntimeError(f"unexpected sample rate {rate}")
        samples = trim_silence(samples, rate, args.trim_ms)
        data = encode_mp3(samples, rate, args.kbps)
        if not data:
            raise RuntimeError(f"empty mp3 for {text!r}")
        target.write_bytes(data)
        made += 1
        print(f"[{i}/{total}] made {h}.mp3  {len(data)} B  {len(samples)/rate:.2f}s  "
              f"{time.perf_counter()-t0:.2f}s to make  {text!r}", flush=True)

    manifest_path = out / "manifest.json"
    manifest = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.update(hashes)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"done: {made} made, {skipped} skipped, {total} total, manifest has {len(manifest)} entries")
    return 0


if __name__ == "__main__":
    sys.exit(main())
