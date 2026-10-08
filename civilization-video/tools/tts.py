#!/usr/bin/env python3
"""Synthesize the Chinese narration and build the master timeline.

Default engine: Microsoft neural voices through edge-tts (needs network access
to speech.platform.bing.com). Every script line is synthesized as one
utterance, so intonation flows naturally across commas, and the service's
word boundaries give exact clause timings for subtitles and visual sync.
`--engine kokoro` is a fully offline fallback (Kokoro v1.1-zh via sherpa-onnx).

Outputs
  build/narration.wav     48 kHz mono narration track (full video length)
  build/timeline.json     scene / line / clause / subtitle timings
  output/subtitles.srt    the subtitles as a standalone file
"""
import argparse
import asyncio
import hashlib
import io
import json
import os
import re
import ssl
import subprocess
import sys
import time

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
LINE_GAP = {"；": 0.45, "？": 0.65, "。": 0.65}

CLAUSE_RE = re.compile(r"[^，；：。？！]+[，；：。？！]?")
CUE_MAX = 22         # max display width of one subtitle cue (CJK char = 1)

VOICE_LABELS = {
    "zh-CN-YunjianNeural": "微软神经语音「云健」", "zh-CN-YunyangNeural": "微软神经语音「云扬」",
    "zh-CN-YunxiNeural": "微软神经语音「云希」", "zh-CN-XiaoxiaoNeural": "微软神经语音「晓晓」",
}

# The script's "say" text was tuned for Kokoro; the neural voices read these forms better.
EDGE_SAY = {"D N A": "DNA", "阿尔法围棋": "AlphaGo", "阿尔法折叠": "AlphaFold"}


def split_clauses(text):
    return [c for c in CLAUSE_RE.findall(text) if c.strip()]


def width(s):
    return sum(0.55 if ord(ch) < 128 else 1.0 for ch in s)


def trim(x, thresh_db=-45.0, pad=0.03):
    """Trim silence at both ends; returns (audio, seconds removed at the start)."""
    env = np.abs(x)
    idx = np.nonzero(env > env.max() * 10 ** (thresh_db / 20))[0]
    if len(idx) == 0:
        return x, 0.0
    a = max(0, idx[0] - int(pad * SR_OUT))
    b = min(len(x), idx[-1] + int(pad * SR_OUT))
    y = x[a:b].copy()
    f = int(0.01 * SR_OUT)
    y[:f] *= np.linspace(0, 1, f)
    y[-f:] *= np.linspace(1, 0, f)
    return y, a / SR_OUT


class EdgeVoice:
    """Microsoft neural TTS via edge-tts; audio and word boundaries are cached on disk."""

    def __init__(self, voice, rate, cache_dir):
        import edge_tts
        import edge_tts.communicate as ec
        ca = os.environ.get("SSL_CERT_FILE")
        if not ca and os.path.exists("/root/.ccr/ca-bundle.crt"):
            ca = "/root/.ccr/ca-bundle.crt"  # TLS-intercepting egress proxy: trust its bundle
        if ca:
            ec._SSL_CTX = ssl.create_default_context(cafile=ca)
        self.edge_tts = edge_tts
        self.voice, self.rate = voice, rate
        self.proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
        self.cache = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    async def _fetch(self, text):
        c = self.edge_tts.Communicate(text, self.voice, rate=self.rate, boundary="WordBoundary", proxy=self.proxy)
        audio, words = bytearray(), []
        async for ch in c.stream():
            if ch["type"] == "audio":
                audio += ch["data"]
            elif ch["type"] == "WordBoundary":
                words.append([ch["offset"] / 1e7, ch["duration"] / 1e7, ch["text"]])
        return bytes(audio), words

    def __call__(self, text):
        key = hashlib.sha1(f"edge|{self.voice}|{self.rate}|{text}".encode()).hexdigest()[:16]
        mp3 = os.path.join(self.cache, key + ".mp3")
        meta = os.path.join(self.cache, key + ".json")
        if not (os.path.exists(mp3) and os.path.exists(meta)):
            for attempt in range(6):
                try:
                    audio, words = asyncio.run(self._fetch(text))
                    if audio and words:
                        break
                except Exception as e:  # network hiccups: retry with backoff
                    print(f"  edge-tts retry {attempt + 1}: {e}", file=sys.stderr)
                time.sleep(2 ** attempt)
            else:
                sys.exit(f"edge-tts failed for: {text}")
            with open(mp3, "wb") as f:
                f.write(audio)
            with open(meta, "w", encoding="utf-8") as f:
                json.dump(words, f, ensure_ascii=False)
        wav = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "wav", "-ac", "1", "-ar", str(SR_OUT), "pipe:1"],
                             capture_output=True, check=True).stdout
        x, _ = sf.read(io.BytesIO(wav), dtype="float32")
        with open(meta, encoding="utf-8") as f:
            return x, json.load(f)


class KokoroVoice:
    """Offline fallback: Kokoro v1.1-zh through sherpa-onnx (no word timings)."""

    def __init__(self, model_dir, sid, speed, cache_dir):
        import sherpa_onnx
        m = model_dir
        self.tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                    model=f"{m}/model.onnx", voices=f"{m}/voices.bin", tokens=f"{m}/tokens.txt",
                    data_dir=f"{m}/espeak-ng-data", dict_dir=f"{m}/dict",
                    lexicon=f"{m}/lexicon-us-en.txt,{m}/lexicon-zh.txt"),
                num_threads=4, provider="cpu"),
            rule_fsts=f"{m}/date-zh.fst,{m}/phone-zh.fst,{m}/number-zh.fst"))
        self.sid, self.speed, self.cache = sid, speed, cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def __call__(self, text):
        key = hashlib.sha1(f"kokoro|{self.sid}|{self.speed}|{text}".encode()).hexdigest()[:16]
        path = os.path.join(self.cache, key + ".wav")
        if not os.path.exists(path):
            a = self.tts.generate(text.replace("：", "，"), sid=self.sid, speed=self.speed)
            x = resample_poly(np.asarray(a.samples, dtype=np.float32), SR_OUT // 8000, a.sample_rate // 8000)
            sf.write(path, x.astype(np.float32), SR_OUT, subtype="FLOAT")
        x, _ = sf.read(path, dtype="float32")
        return x, None


def clause_times(clauses, words, shift, dur):
    """Start/end of each clause (seconds into the trimmed line audio).

    Word boundaries are located in the spoken text; clauses that no word could
    be matched to fall back to a character-proportional estimate.
    """
    full = "".join(clauses)
    spans, pos = [], 0
    for c in clauses:
        spans.append((pos, pos + len(c)))
        pos += len(c)
    placed, cur = [], 0
    for t0, d, w in words or []:
        w = w.strip()
        k = full.find(w, cur) if w else -1
        if k < 0:
            continue
        placed.append((k, max(0.0, t0 - shift), max(0.0, t0 - shift + d)))
        cur = k + len(w)
    out = []
    for a, b in spans:
        ws = [p for p in placed if a <= p[0] < b]
        out.append([min(p[1] for p in ws), max(p[2] for p in ws)] if ws else None)
    n = max(1, len(full))
    for i, (a, b) in enumerate(spans):
        if out[i] is None:
            out[i] = [dur * a / n, dur * b / n]
    for i in range(len(out)):
        out[i][0] = min(max(out[i][0], out[i - 1][1] if i else 0.0), dur)
        out[i][1] = min(max(out[i][1], out[i][0] + 0.2), dur)
    return out


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
    ap.add_argument("--engine", choices=["edge", "kokoro"], default="edge")
    ap.add_argument("--voice", default="zh-CN-YunjianNeural", help="edge-tts voice")
    ap.add_argument("--rate", default="-4%", help="edge-tts speaking rate")
    ap.add_argument("--model", help="kokoro-multi-lang-v1_1 directory (kokoro engine)")
    ap.add_argument("--sid", type=int, default=60)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--asr", help="sense-voice model directory (optional pronunciation check)")
    ap.add_argument("--fps", type=int, default=30)
    args = ap.parse_args()

    script = json.load(open(os.path.join(ROOT, "script", "script.json"), encoding="utf-8"))
    if args.engine == "edge":
        tts = EdgeVoice(args.voice, args.rate, os.path.join(ROOT, ".cache", "tts-edge"))
    else:
        tts = KokoroVoice(args.model, args.sid, args.speed, os.path.join(ROOT, ".cache", "tts"))

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
                say = line.get("say", line["text"])
                if args.engine == "edge":
                    for a, b in EDGE_SAY.items():
                        say = say.replace(a, b)
                say = re.sub(r"[“”《》]", "", say)
                disp, spoken = split_clauses(line["text"]), split_clauses(say)
                if len(disp) != len(spoken):
                    sys.exit(f"clause mismatch in {sc['id']} line {li}:\n{disp}\n{spoken}")
                x, words = tts(say)
                x, shift = trim(x)
                dur = len(x) / SR_OUT
                times = clause_times(spoken, words, shift, dur)
                pieces.append((cur, x))
                clauses = [{"text": d, "say": s, "start": round(cur + a, 3), "end": round(cur + b, 3)}
                           for d, s, (a, b) in zip(disp, spoken, times)]
                lines.append({"text": line["text"], "start": round(cur, 3), "end": round(cur + dur, 3), "clauses": clauses})
                cues.extend(make_cues(clauses))
                cur += dur + LINE_GAP.get(say[-1], 0.55)
            end = lines[-1]["end"] + TAIL + XFADE
        else:
            end = start + float(sc.get("hold", 4.0))
        entry["end"] = round(end, 3)
        entry["lines"] = lines
        scenes.append(entry)
        t = end
        print(f"{sc['id']:>11}: {start:7.2f} → {end:7.2f}  ({end - start:5.2f}s, {len(lines)} lines)", flush=True)

    n_frames = int(np.ceil(scenes[-1]["end"] * args.fps))
    total = n_frames / args.fps
    track = np.zeros(int(np.ceil(total * SR_OUT)) + SR_OUT, dtype=np.float32)
    for st, x in pieces:
        i = int(round(st * SR_OUT))
        track[i:i + len(x)] += x
    track = track[:int(round(total * SR_OUT))]
    track *= 0.89 / np.abs(track).max()  # ≈ -1 dBFS peak; loudness is normalised again at mux time

    os.makedirs(os.path.join(ROOT, "build"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "output"), exist_ok=True)
    sf.write(os.path.join(ROOT, "build", "narration.wav"), track, SR_OUT, subtype="PCM_16")
    timeline = {"fps": args.fps, "width": 1920, "height": 1080, "duration": round(total, 3),
                "frames": n_frames, "xfade": XFADE, "title": script["title"],
                "subtitle": script["subtitle"], "voice": args.voice if args.engine == "edge" else f"kokoro:{args.sid}",
                "voiceLabel": VOICE_LABELS.get(args.voice, args.voice) if args.engine == "edge" else "Kokoro",
                "scenes": scenes, "cues": cues}
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
            worst.append((cer(ref, s.result.text), sc["id"], li, ref, s.result.text))
    worst.sort(reverse=True)
    print("\nPronunciation check (SenseVoice CER, worst first):")
    for e, sid, li, ref, hyp in worst[:12]:
        print(f"  {e:5.3f} {sid}[{li}]\n        ref: {norm(ref)}\n        asr: {norm(hyp)}")
    print(f"  mean CER {np.mean([w[0] for w in worst]):.3f} over {len(worst)} lines")


if __name__ == "__main__":
    main()
