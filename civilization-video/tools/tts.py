#!/usr/bin/env python3
"""Synthesize the Chinese narration and build the master timeline.

Uses Kokoro v1.1-zh through sherpa-onnx (fully offline). Every clause is
synthesized separately so that its start/end time is known exactly; the
renderer uses those times for subtitles and for syncing visual beats.

Outputs
  build/narration.wav     48 kHz mono narration track (full video length)
  build/timeline.json     scene / line / clause / subtitle timings
  output/subtitles.srt    the subtitles as a standalone file
"""
import argparse
import hashlib
import json
import os
import re
import sys

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR_OUT = 48000

# Pacing, in seconds.
XFADE = 1.0          # visual crossfade between consecutive scenes
LEAD_TITLE = 3.2     # chapter title is shown alone before the narration starts
LEAD_PLAIN = 1.6
TAIL = 1.3           # breathing room after the last line of a scene
CLAUSE_PAUSE = {"，": 0.16, "：": 0.26, "；": 0.32, "？": 0.42, "！": 0.42, "。": 0.42}
LINE_GAP = {"；": 0.42, "？": 0.62, "。": 0.62}

CLAUSE_RE = re.compile(r"[^，；：。？！]+[，；：。？！]?")
CUE_MAX = 22         # max display width of one subtitle cue (CJK char = 1)


def split_clauses(text):
    return [c for c in CLAUSE_RE.findall(text) if c.strip()]


def speech_form(clause):
    s = clause.replace("：", "，")
    return re.sub(r"[“”《》]", "", s)


def width(s):
    return sum(0.55 if ord(ch) < 128 else 1.0 for ch in s)


class Kokoro:
    def __init__(self, model_dir, sid, speed, cache_dir):
        import sherpa_onnx
        m = model_dir
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                    model=f"{m}/model.onnx", voices=f"{m}/voices.bin",
                    tokens=f"{m}/tokens.txt", data_dir=f"{m}/espeak-ng-data",
                    dict_dir=f"{m}/dict",
                    lexicon=f"{m}/lexicon-us-en.txt,{m}/lexicon-zh.txt"),
                num_threads=4, provider="cpu"),
            rule_fsts=f"{m}/date-zh.fst,{m}/phone-zh.fst,{m}/number-zh.fst",
            max_num_sentences=1)
        self.tts = sherpa_onnx.OfflineTts(cfg)
        self.sid, self.speed, self.cache = sid, speed, cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def __call__(self, text):
        key = hashlib.sha1(f"{self.sid}|{self.speed}|{text}".encode()).hexdigest()[:16]
        path = os.path.join(self.cache, key + ".wav")
        if not os.path.exists(path):
            a = self.tts.generate(text, sid=self.sid, speed=self.speed)
            x = np.asarray(a.samples, dtype=np.float32)
            x = resample_poly(x, SR_OUT // 8000, a.sample_rate // 8000).astype(np.float32)
            sf.write(path, trim(x), SR_OUT, subtype="FLOAT")
        x, _ = sf.read(path, dtype="float32")
        return x


def trim(x, thresh_db=-42.0, pad=0.025):
    env = np.abs(x)
    thr = env.max() * 10 ** (thresh_db / 20)
    idx = np.nonzero(env > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * SR_OUT))
    b = min(len(x), idx[-1] + int(pad * SR_OUT))
    y = x[a:b].copy()
    f = int(0.012 * SR_OUT)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y


def make_cues(clauses):
    """Group a line's clauses into subtitle cues no wider than CUE_MAX."""
    cues, cur = [], []
    for c in clauses:
        if cur and width("".join(x["text"] for x in cur) + c["text"]) > CUE_MAX:
            cues.append(cur)
            cur = []
        cur.append(c)
    if cur:
        cues.append(cur)
    out = []
    for group in cues:
        text = "".join(x["text"] for x in group)
        text = re.sub(r"[，；。：]$", "", text)
        text = re.sub(r"[，；。](?=.)", "　", text)
        out.append({"start": group[0]["start"], "end": group[-1]["end"], "text": text})
    return out


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True, help="kokoro-multi-lang-v1_1 directory")
    ap.add_argument("--asr", help="sense-voice model directory (optional pronunciation check)")
    ap.add_argument("--sid", type=int, default=60)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args()

    script = json.load(open(os.path.join(ROOT, "script", "script.json"), encoding="utf-8"))
    tts = Kokoro(args.model, args.sid, args.speed, os.path.join(ROOT, ".cache", "tts"))

    scenes, cues, pieces = [], [], []  # pieces: (start_time, samples)
    t = 0.0
    for si, sc in enumerate(script["scenes"]):
        start = 0.0 if si == 0 else t - XFADE
        entry = {k: sc.get(k, "") for k in ("id", "chapter", "name", "era")}
        entry["start"] = round(start, 3)
        lines = []
        if sc["lines"]:
            cur = start + (LEAD_TITLE if sc.get("chapter") and si > 0 else LEAD_PLAIN)
            entry["speechStart"] = round(cur, 3)
            for li, line in enumerate(sc["lines"]):
                disp = split_clauses(line["text"])
                say = split_clauses(line.get("say", line["text"]))
                if len(disp) != len(say):
                    sys.exit(f"clause mismatch in {sc['id']} line {li}:\n{disp}\n{say}")
                clauses = []
                line_start = cur
                for ci, (d, s) in enumerate(zip(disp, say)):
                    x = tts(speech_form(s))
                    pieces.append((cur, x))
                    dur = len(x) / SR_OUT
                    clauses.append({"text": d, "say": speech_form(s),
                                    "start": round(cur, 3), "end": round(cur + dur, 3)})
                    cur += dur
                    if ci < len(disp) - 1:
                        cur += CLAUSE_PAUSE.get(s[-1], 0.16)
                line_end = cur
                lines.append({"text": line["text"], "start": round(line_start, 3),
                              "end": round(line_end, 3), "clauses": clauses})
                cues.extend(make_cues(clauses))
                end_punct = line.get("say", line["text"])[-1]
                cur += LINE_GAP.get(end_punct, 0.55)
            end = line_end + TAIL + XFADE
        else:
            end = start + float(sc.get("hold", 4.0))
        entry["end"] = round(end, 3)
        entry["lines"] = lines
        scenes.append(entry)
        t = end
        print(f"{sc['id']:>11}: {start:7.2f} → {end:7.2f}  ({end - start:5.2f}s, {len(lines)} lines)")

    total = scenes[-1]["end"]
    n_frames = int(np.ceil(total * args.fps))
    total = n_frames / args.fps
    track = np.zeros(int(np.ceil(total * SR_OUT)) + SR_OUT, dtype=np.float32)
    for st, x in pieces:
        i = int(round(st * SR_OUT))
        track[i:i + len(x)] += x
    track = track[:int(round(total * SR_OUT))]
    peak = np.abs(track).max()
    track *= 0.89 / peak  # ≈ -1 dBFS peak; loudness is normalised again at mux time

    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
    sf.write(os.path.join(ROOT, "build", "narration.wav"), track, SR_OUT, subtype="PCM_16")
    timeline = {"fps": args.fps, "width": 1920, "height": 1080, "duration": round(total, 3),
                "frames": n_frames, "xfade": XFADE, "title": script["title"],
                "subtitle": script["subtitle"], "scenes": scenes, "cues": cues}
    with open(os.path.join(ROOT, "build", "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)
    with open(os.path.join(ROOT, "output", "subtitles.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1):
            f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n\n")
    print(f"total {total:.2f}s = {total / 60:.2f} min, {n_frames} frames, {len(cues)} cues")

    if args.asr:
        check_pronunciation(args.asr, scenes, track)


def check_pronunciation(asr_dir, scenes, track):
    """Transcribe each line with SenseVoice and report the character error rate."""
    import sherpa_onnx
    rec = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=f"{asr_dir}/model.int8.onnx", tokens=f"{asr_dir}/tokens.txt",
        num_threads=4, use_itn=False, language="zh")
    norm = lambda s: re.sub(r"[^一-鿿A-Za-z0-9]", "", s).lower()

    def cer(r, h):
        r, h = norm(r), norm(h)
        d = list(range(len(h) + 1))
        for i in range(1, len(r) + 1):
            prev, d[0] = d[0], i
            for j in range(1, len(h) + 1):
                cur = d[j]
                d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
                prev = cur
        return d[len(h)] / max(1, len(r))

    worst = []
    for sc in scenes:
        for li, line in enumerate(sc["lines"]):
            a = int(line["start"] * SR_OUT)
            b = int(line["end"] * SR_OUT) + int(0.1 * SR_OUT)
            s = rec.create_stream()
            s.accept_waveform(SR_OUT, track[a:b])
            rec.decode_stream(s)
            ref = "".join(c["say"] for c in line["clauses"])
            e = cer(ref, s.result.text)
            worst.append((e, sc["id"], li, ref, s.result.text))
    worst.sort(reverse=True)
    print("\nPronunciation check (SenseVoice CER, worst first):")
    for e, sid, li, ref, hyp in worst[:15]:
        print(f"  {e:5.3f} {sid}[{li}]\n        ref: {norm(ref)}\n        asr: {norm(hyp)}")
    print(f"  mean CER {np.mean([w[0] for w in worst]):.3f} over {len(worst)} lines")


if __name__ == "__main__":
    main()
