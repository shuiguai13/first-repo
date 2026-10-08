#!/usr/bin/env python3
"""Procedural soundtrack + sound effects, synced to build/timeline.json.

Each scene gets a chord progression and a small arrangement (pads, bass,
arpeggios, bells, percussion). Transitions get a noise swell, chapter titles
a low boom. The music is ducked under the narration and everything is mixed
to build/mix.wav (48 kHz stereo).
"""
import json
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, oaconvolve, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
RNG = np.random.default_rng(7)

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
QUAL = {"maj": [0, 4, 7], "min": [0, 3, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10],
        "add9": [0, 4, 7, 14], "min9": [0, 3, 7, 10, 14], "6": [0, 4, 7, 9], "sus2": [0, 2, 7]}

# scene -> (progression, seconds per chord, arp bpm or None, arp subdivision, drums, bells, level)
ARR = {
    "prologue":   (["D:min9", "Bb:maj7", "F:maj7", "C:6"], 6.0, None, 0, None, 0.5, 0.80),
    "title":      (["F:add9"], 6.0, None, 0, "boom", 1.0, 1.00),
    "fire":       (["D:min", "C:maj", "Bb:maj", "C:maj"], 4.0, None, 0, "heart", 0.0, 0.72),
    "farming":    (["F:maj", "C:maj", "D:min", "Bb:maj"], 4.0, 80, 1, None, 0.0, 0.72),
    "dawn":       (["D:min", "G:min", "Bb:maj", "A:maj"], 4.0, None, 0, "toms", 0.0, 0.74),
    "axial":      (["A:min", "F:maj", "C:maj", "G:maj"], 5.0, None, 0, None, 0.6, 0.72),
    "exchange":   (["F:maj", "A:min", "Bb:maj", "C:maj"], 4.0, 90, 2, None, 0.0, 0.72),
    "voyages":    (["D:maj", "G:maj", "B:min", "A:maj"], 4.0, 96, 2, "toms", 0.0, 0.76),
    "industry":   (["E:min", "C:maj", "G:maj", "D:maj"], 4.0, 104, 2, "machine", 0.0, 0.76),
    "century20":  (["C:min", "Ab:maj", "Eb:maj", "Bb:maj"], 4.0, 100, 2, "toms", 0.0, 0.76),
    "info":       (["A:min", "F:maj", "C:maj", "G:maj"], 3.6, 110, 4, "ticks", 0.0, 0.76),
    "today":      (["F:maj", "G:maj", "A:min", "C:maj"], 4.0, 84, 1, None, 0.5, 0.76),
    "now":        (["D:min", "Bb:maj", "F:maj", "C:maj"], 4.0, 96, 2, "build", 0.0, 0.80),
    "future1":    (["C:maj7", "A:min7", "F:maj7", "G:6"], 4.0, 108, 4, "ticks", 0.6, 0.80),
    "future2":    (["D:maj7", "B:min7", "G:maj7", "A:6"], 4.0, 100, 2, "toms", 0.6, 0.80),
    "future3":    (["Eb:maj7", "C:min7", "Ab:maj7", "Bb:6"], 4.5, 90, 2, None, 0.7, 0.80),
    "challenges": (["D:min", "Bb:maj", "G:min", "A:maj"], 4.0, None, 0, "heart", 0.0, 0.72),
    "epilogue":   (["F:maj", "C:maj", "D:min", "Bb:maj"], 4.0, 88, 2, "build", 0.8, 0.88),
    "end":        (["F:add9"], 9.0, None, 0, None, 1.0, 0.90),
}


def chord(name, base=48):
    root, q = name.split(":")
    r = NOTE[root]
    notes = [base + r + iv for iv in QUAL[q]]
    return r, notes


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


TABLE = 4096


def saw_table(bright):
    x = np.arange(TABLE) / TABLE
    tab = np.zeros(TABLE)
    for k in range(1, 40):
        tab += np.sin(2 * np.pi * k * x) / k * np.exp(-k / bright)
    return tab / np.abs(tab).max()


PAD_TAB = saw_table(4.0)
PLUCK_TAB = saw_table(2.5)


def osc(tab, f, n, phase=0.0):
    ph = (phase + np.arange(n) * f / SR) % 1.0
    return tab[(ph * TABLE).astype(np.int64) % TABLE]


def env_ar(n, att, rel):
    e = np.ones(n)
    a, r = min(n, int(att * SR)), min(n, int(rel * SR))
    if a:
        e[:a] = np.linspace(0, 1, a) ** 1.5
    if r:
        e[-r:] *= np.linspace(1, 0, r) ** 1.5
    return e


class Bus:
    def __init__(self, n):
        self.x = np.zeros((n, 2), dtype=np.float32)

    def add(self, t, sig, pan=0.0, gain=1.0):
        i = int(t * SR)
        if i >= len(self.x) or len(sig) == 0:
            return
        if i < 0:
            sig = sig[-i:]
            i = 0
        sig = sig[: len(self.x) - i] * gain
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.x[i:i + len(sig), 0] += (sig * l).astype(np.float32)
        self.x[i:i + len(sig), 1] += (sig * r).astype(np.float32)


def pad(bus, notes, t0, t1, level):
    n = int((t1 - t0) * SR)
    e = env_ar(n, 1.4, 1.8)
    for k, m in enumerate(notes):
        for d, pan in ((-0.07, -0.6), (0.0, 0.0), (0.07, 0.6)):
            f = hz(m + d)
            bus.add(t0, osc(PAD_TAB, f, n, RNG.random()) * e, pan, level * 0.05)


def bass(bus, m, t0, t1, level):
    n = int((t1 - t0) * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    bus.add(t0, s * env_ar(n, 0.4, 1.2), 0.0, level * 0.12)


def pluck(bus, m, t0, level, pan):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    f = hz(m)
    s = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.45), (3, 0.22), (4.01, 0.1)):
        s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.2 + 1.6 * k))
    s *= np.minimum(1, t / 0.004)
    bus.add(t0, s, pan, level * 0.07)


def bell(bus, m, t0, level, pan):
    n = int(4.0 * SR)
    t = np.arange(n) / SR
    f = hz(m)
    idx = 2.2 * np.exp(-t * 1.5)
    s = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 0.9)
    s *= np.minimum(1, t / 0.003)
    bus.add(t0, s, pan, level * 0.05)


def tom(bus, t0, level, pitch=1.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = (55 + 95 * np.exp(-t * 18)) * pitch
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 5.5) + 0.15 * RNG.standard_normal(n) * np.exp(-t * 60)
    bus.add(t0, s, 0.0, level * 0.30)


def tick(bus, t0, level, pan=0.0):
    n = int(0.05 * SR)
    s = RNG.standard_normal(n) * np.exp(-np.arange(n) / SR * 120)
    s = sosfilt(butter(2, 5000, "highpass", fs=SR, output="sos"), s)
    bus.add(t0, s, pan, level * 0.05)


def swell(bus, t_peak, dur, level):
    n = int(dur * SR)
    noise = RNG.standard_normal(n)
    shaped = np.zeros(n)
    for k, (lo, hi) in enumerate(((300, 1200), (900, 3000), (2500, 8000))):
        sos = butter(2, [lo, hi], "bandpass", fs=SR, output="sos")
        part = sosfilt(sos, noise)
        shaped += part * np.linspace(0, 1, n) ** (2.5 - k * 0.6)
    shaped *= np.linspace(0, 1, n) ** 2.2
    tail = int(0.25 * SR)
    shaped[-tail:] *= np.linspace(1, 0, tail)
    bus.add(t_peak - dur, shaped, 0.0, level * 0.05)


def boom(bus, t0, level):
    n = int(3.0 * SR)
    t = np.arange(n) / SR
    f = 32 + 40 * np.exp(-t * 6)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    s += sosfilt(butter(2, 400, "lowpass", fs=SR, output="sos"), RNG.standard_normal(n)) * np.exp(-t * 4) * 0.6
    bus.add(t0, s, 0.0, level * 0.4)


def reverb_ir(seconds=3.4):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = RNG.standard_normal((n, 2)) * np.exp(-t * 6.9 / seconds)[:, None]
    sos = butter(2, 5200, "lowpass", fs=SR, output="sos")
    ir = sosfilt(sos, ir, axis=0)
    ir[: int(0.012 * SR)] = 0
    return (ir / np.sqrt((ir ** 2).sum(axis=0))).astype(np.float32)


def main():
    tl = json.load(open(os.path.join(ROOT, "build", "timeline.json"), encoding="utf-8"))
    total = tl["duration"]
    n = int(total * SR) + SR
    music, perc, fx = Bus(n), Bus(n), Bus(n)

    for si, sc in enumerate(tl["scenes"]):
        prog, clen, bpm, sub, drums, bells, level = ARR[sc["id"]]
        s0, s1 = sc["start"], sc["end"]
        t = s0
        ci = 0
        while t < s1 - 0.5:
            t_end = min(s1 + 0.6, t + clen + 1.2)
            r, notes = chord(prog[ci % len(prog)])
            voiced = [notes[0]] + [m + 12 for m in notes[1:]]
            pad(music, voiced, t, t_end, level)
            bass(music, 36 + r, t, t_end, level)
            if bells > 0 and RNG.random() < bells:
                for k in range(2):
                    bell(music, notes[(ci + k) % len(notes)] + 24 + 12 * (k % 2), t + 0.6 + k * clen * 0.45, level * bells, RNG.uniform(-0.7, 0.7))
            t += clen
            ci += 1
        if bpm:
            step = 60.0 / bpm / sub
            k = 0
            t = s0 + 0.5
            while t < s1 - 0.8:
                ci = int((t - s0) // clen)
                _, notes = chord(prog[ci % len(prog)])
                pattern = [0, 1, 2, 3, 2, 1] if len(notes) > 3 else [0, 1, 2, 1]
                m = notes[pattern[k % len(pattern)] % len(notes)] + 24
                fade = min(1.0, (t - s0) / 2.5, (s1 - t) / 1.5)
                pluck(music, m, t, level * fade * (0.8 + 0.2 * (k % 2 == 0)), -0.5 + (k % 4) / 3)
                t += step
                k += 1
        beat = 60.0 / (bpm or 60)
        t = s0 + 0.5
        k = 0
        while drums and t < s1 - 1.0:
            fade = min(1.0, (t - s0) / 2.0, (s1 - t) / 1.5)
            if drums == "heart":
                if k % 4 in (0, 1):
                    tom(perc, t + (0.22 if k % 4 == 1 else 0), level * fade * 0.8, 0.8)
                t += beat / 2
            elif drums == "toms":
                if k % 4 == 0:
                    tom(perc, t, level * fade * 0.7)
                if k % 8 == 6:
                    tom(perc, t, level * fade * 0.4, 1.4)
                t += beat / 2
            elif drums == "machine":
                tick(perc, t, level * fade * (1.0 if k % 2 == 0 else 0.6), 0.3 * ((k % 2) * 2 - 1))
                if k % 8 == 0:
                    tom(perc, t, level * fade * 0.6, 0.9)
                t += beat / 4
            elif drums == "ticks":
                tick(perc, t, level * fade * (1.0 if k % 2 == 0 else 0.5), 0.4 * ((k % 2) * 2 - 1))
                t += beat / 2
            elif drums == "build":
                prog_k = (t - s0) / (s1 - s0)
                if k % 4 == 0 or (prog_k > 0.5 and k % 2 == 0):
                    tom(perc, t, level * fade * (0.3 + 0.6 * prog_k))
                t += beat / 2
            elif drums == "boom":
                break
            k += 1
        # transitions
        if si > 0:
            swell(fx, s0 + tl["xfade"] * 0.6, 1.6, 1.0)
        if sc.get("chapter") and sc["id"] not in ("prologue",):
            boom(fx, s0 + 0.3, 0.9)
        if sc["id"] == "title":
            boom(fx, s0 + 0.3, 1.3)
            for k in range(6):
                bell(fx, 77 + [0, 4, 7, 12, 14, 19][k], s0 + 0.35 + k * 0.12, 0.8, -0.6 + k * 0.24)

    # reverb on the musical buses
    ir = reverb_ir()
    wet = np.stack([oaconvolve(music.x[:, c] + 0.5 * fx.x[:, c], ir[:, c])[:n] for c in range(2)], axis=1)
    bed = music.x * 0.75 + wet * 0.55 + perc.x * 0.9 + fx.x * 0.6
    bed = sosfilt(butter(1, 30, "highpass", fs=SR, output="sos"), bed, axis=0)

    # narration and ducking
    voice, vsr = sf.read(os.path.join(ROOT, "build", "narration.wav"), dtype="float32")
    assert vsr == SR
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    win = int(0.05 * SR)
    rms = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, mode="same"))
    target = np.clip(rms / 0.06, 0, 1)
    duck = np.zeros_like(target)
    a_att, a_rel = np.exp(-1 / (0.08 * SR)), np.exp(-1 / (0.6 * SR))
    acc = 0.0
    # one-pole envelope follower, decimated for speed
    step = 240
    for i in range(0, n, step):
        x = target[i]
        acc = x + (acc - x) * (a_att ** step if x > acc else a_rel ** step)
        duck[i:i + step] = acc
    gain = 1.0 - 0.72 * duck
    bed *= gain[:, None]

    bed *= 0.28 / (np.percentile(np.abs(bed), 99.9) + 1e-9)
    mix = bed + voice[:, None] * 0.92
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix *= 0.98 / peak
    total_n = int(round(total * SR))
    fade = int(1.5 * SR)
    mix[total_n - fade:total_n] *= np.linspace(1, 0, fade)[:, None]
    sf.write(os.path.join(ROOT, "build", "mix.wav"), mix[:total_n], SR, subtype="PCM_24")
    sf.write(os.path.join(ROOT, "build", "music.wav"), bed[:total_n], SR, subtype="PCM_16")
    print(f"wrote build/mix.wav ({total_n / SR:.2f}s)")


if __name__ == "__main__":
    main()
