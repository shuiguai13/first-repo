// Frame compositor: picks the active scene(s) for time T, crossfades between
// them, and draws the chapter title cards, subtitles and finishing overlays.
import { W, H, clamp, inv, ease, env, text, vignette, dither, canvas, rgba, measure } from './core.js';
import { initGeo } from './geo.js';
import { initIcons } from './icons.js';
import { SCENES as S1 } from './scenes/history1.js';
import { SCENES as S2 } from './scenes/history2.js';
import { SCENES as S3 } from './scenes/modern.js';
import { SCENES as S4 } from './scenes/future.js';

const DRAW = { ...S1, ...S2, ...S3, ...S4 };
const screen = document.getElementById('screen');
const ctx = screen.getContext('2d');
const layer = canvas(W, H);
const lctx = layer.getContext('2d');
let TL = null;
const DITHER = Number(new URLSearchParams(location.search).get('dither') ?? 0.03);

async function loadFonts() {
  const specs = [
    '400 40px "Noto Serif SC"', '700 40px "Noto Serif SC"', '900 40px "Noto Serif SC"',
    '300 40px "Noto Sans SC"', '400 40px "Noto Sans SC"', '500 40px "Noto Sans SC"', '700 40px "Noto Sans SC"',
    '400 40px "Ma Shan Zheng"', '400 40px "Cinzel"', '700 40px "Cinzel"', '300 40px "Inter"', '400 40px "Inter"',
    '600 40px "Inter"', '800 40px "Inter"', '400 40px "JetBrains Mono"', '700 40px "JetBrains Mono"',
    '400 40px "Noto Sans Devanagari"', '400 40px "Noto Naskh Arabic"',
  ];
  await Promise.all(specs.map((s) => document.fonts.load(s, '文明 Aa1 ० ٠')));
}

// Scene-local helpers handed to every draw function.
function makeState(sc, T) {
  const t = T - sc.start;
  const L = sc.lines.map((l) => ({
    s: l.start - sc.start, e: l.end - sc.start, text: l.text,
    clauses: l.clauses.map((c) => ({ s: c.start - sc.start, e: c.end - sc.start, text: c.text })),
  }));
  const S = {
    t, T, d: sc.end - sc.start, sc, L,
    speech0: (sc.speechStart ?? sc.start) - sc.start,
    // local time at which substring `sub` of line i is spoken (approximate within a clause)
    when(i, sub, frac = 0) {
      const line = L[i];
      if (!line) return 0;
      if (!sub) return line.s + (line.e - line.s) * frac;
      for (const c of line.clauses) {
        const k = c.text.indexOf(sub);
        if (k >= 0) {
          const n = [...c.text].length;
          const pos = [...c.text.slice(0, k)].length + frac * [...sub].length;
          return c.s + (c.e - c.s) * (pos / Math.max(1, n - 0.6));
        }
      }
      return line.s;
    },
    ls: (i) => (L[i] ? L[i].s : S.d),
    le: (i) => (L[i] ? L[i].e : S.d),
    lp: (i) => (L[i] ? inv(L[i].s, L[i].e, t) : 0),
  };
  return S;
}

const INTRO_IN = 0.85, INTRO_OUT = 3.05;

const hasIntro = (sc) => sc.chapter && !['prologue', 'title', 'end'].includes(sc.id);

// Big chapter title, drawn over the composited frame (not crossfaded with the scene).
function chapterIntro(g, S) {
  const { sc, t } = S;
  if (!hasIntro(sc)) return;
  const a = env(t, INTRO_IN, INTRO_OUT, 0.6, 0.55);
  if (a > 0) {
    g.save();
    const bg = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 900);
    bg.addColorStop(0, `rgba(0,0,0,${0.7 * a})`);
    bg.addColorStop(1, `rgba(0,0,0,${0.3 * a})`);
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const k = ease.out(inv(INTRO_IN, INTRO_IN + 1.2, t));
    const lift = (1 - k) * 18;
    const futureish = sc.id.startsWith('future') || sc.id === 'now';
    const gold = futureish ? '#9fe6ff' : '#e2c48a';
    const cw = measure(g, sc.chapter, { size: 34, weight: 700, font: 'serif', spacing: 14 });
    text(g, sc.chapter, W / 2 + 7, 405 + lift, { size: 34, weight: 700, font: 'serif', color: gold, spacing: 14, alpha: a });
    g.globalAlpha = a * 0.8;
    g.strokeStyle = gold;
    g.lineWidth = 1.2;
    const lw = 70 + 90 * k;
    g.beginPath();
    g.moveTo(W / 2 - cw / 2 - 30, 405 + lift); g.lineTo(W / 2 - cw / 2 - 30 - lw, 405 + lift);
    g.moveTo(W / 2 + cw / 2 + 30, 405 + lift); g.lineTo(W / 2 + cw / 2 + 30 + lw, 405 + lift);
    g.stroke();
    g.globalAlpha = 1;
    const blur = (1 - k) * 10;
    if (blur > 0.3) g.filter = `blur(${blur.toFixed(1)}px)`;
    text(g, sc.name, W / 2, 535, {
      size: 150, font: 'brush', color: '#fff8ec', alpha: a, glow: 28, glowColor: futureish ? 'rgba(80,200,255,0.55)' : 'rgba(255,170,80,0.5)',
    });
    g.filter = 'none';
    if (sc.era) text(g, sc.era, W / 2, 660, { size: 30, weight: 300, font: 'sans', color: '#e9e2d6', spacing: 6, alpha: a * k });
    g.restore();
  }
}

// Small persistent chapter tag in the corner (part of the scene layer).
function chapterTag(g, S) {
  const { sc, t } = S;
  if (!hasIntro(sc)) return;
  const b = clamp(inv(INTRO_OUT - 0.3, INTRO_OUT + 0.6, t));
  if (b > 0) {
    const futureish = sc.id.startsWith('future') || sc.id === 'now';
    const gold = futureish ? '#8fdcff' : '#e2c48a';
    g.save();
    g.globalAlpha = b * 0.95;
    g.fillStyle = gold;
    g.fillRect(72, 64, 3, 58);
    text(g, `${sc.chapter} · ${sc.name}`, 92, 82, { size: 28, weight: 700, font: 'serif', color: '#fbf6ee', align: 'left', shadow: 10 });
    if (sc.era) text(g, sc.era, 92, 112, { size: 20, weight: 400, font: 'sans', color: gold, align: 'left', spacing: 1, shadow: 8 });
    g.restore();
  }
}

function drawScene(g, sc, T) {
  const S = makeState(sc, T);
  g.save();
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const fn = DRAW[sc.id];
  if (fn) fn(g, S);
  g.restore();
  g.save();
  chapterTag(g, S);
  g.restore();
}

function subtitles(g, T) {
  const cues = TL.cues;
  let cue = null, next = null;
  for (let i = 0; i < cues.length; i++) {
    if (T >= cues[i].start - 0.08 && T < cues[i].end + 0.35) { cue = cues[i]; next = cues[i + 1]; }
  }
  if (!cue) return;
  const end = Math.min(cue.end + 0.35, next ? next.start - 0.06 : 1e9);
  const a = env(T, cue.start - 0.08, end, 0.12, 0.16);
  if (a <= 0) return;
  g.save();
  const grad = g.createLinearGradient(0, H - 230, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${0.5 * a})`);
  g.fillStyle = grad;
  g.fillRect(0, H - 230, W, 230);
  text(g, cue.text, W / 2, H - 86, { size: 46, weight: 500, font: 'sans', color: '#ffffff', alpha: a, shadow: 14, spacing: 2 });
  g.restore();
}

window.renderFrame = (T) => {
  const act = TL.scenes.filter((s) => T >= s.start && T < s.end);
  if (!act.length) act.push(TL.scenes[TL.scenes.length - 1]);
  drawScene(ctx, act[0], T);
  if (act.length > 1) {
    const b = act[1];
    drawScene(lctx, b, T);
    ctx.save();
    ctx.globalAlpha = ease.sine(inv(b.start, b.start + TL.xfade, T));
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }
  vignette(ctx, 0.5);
  for (const sc of act) {
    ctx.save();
    chapterIntro(ctx, makeState(sc, T));
    ctx.restore();
  }
  subtitles(ctx, T);
  const fade = Math.min(inv(0, 1.2, T), 1 - inv(TL.duration - 1.6, TL.duration - 0.05, T));
  if (fade < 1) {
    ctx.fillStyle = rgba('#000000', 1 - fade);
    ctx.fillRect(0, 0, W, H);
  }
  if (DITHER > 0) dither(ctx, DITHER);
};

window.frameJPEG = (T, q = 0.93) => {
  window.renderFrame(T);
  return screen.toDataURL('image/jpeg', q);
};

window.ready = (async () => {
  TL = await fetch('../build/timeline.json').then((r) => r.json());
  window.TL = TL;
  await Promise.all([loadFonts(), initGeo(), initIcons()]);
  return { duration: TL.duration, frames: TL.frames, fps: TL.fps };
})();
