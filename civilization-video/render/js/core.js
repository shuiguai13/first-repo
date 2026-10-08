// Shared drawing utilities. Everything is a pure function of time so that any
// frame can be rendered independently (and in parallel) with identical output.

export const W = 1920, H = 1080;
export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
export const smooth = (t) => t * t * (3 - 2 * t);

export const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
};

// Envelope that rises over [a, a+fi] and falls over [b-fo, b].
export function env(t, a, b, fi = 0.5, fo = 0.5) {
  if (t < a || t > b) return 0;
  return Math.min(fi > 0 ? smooth(inv(a, a + fi, t)) : 1, fo > 0 ? smooth(1 - inv(b - fo, b, t)) : 1);
}
// Rises at a (over dur) and stays.
export const rise = (t, a, dur = 0.6, fn = ease.out) => fn(inv(a, a + dur, t));

// Deterministic pseudo-random numbers.
export function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Smooth 1-D value noise in [-1, 1].
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash(i * 7919 + seed * 104729) * 2 - 1, b = hash((i + 1) * 7919 + seed * 104729) * 2 - 1;
  return lerp(a, b, smooth(f));
}
export const fbm1 = (x, seed = 0) => noise1(x, seed) * 0.6 + noise1(x * 2.13, seed + 7) * 0.3 + noise1(x * 4.7, seed + 13) * 0.1;

// ---------- colour ----------
export function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(c, a = 1) {
  const [r, g, b] = typeof c === 'string' ? hexToRgb(c) : c;
  return `rgba(${r | 0},${g | 0},${b | 0},${clamp(a)})`;
}
export const toHex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
export function mix(c1, c2, t) {
  const a = typeof c1 === 'string' ? hexToRgb(c1) : c1, b = typeof c2 === 'string' ? hexToRgb(c2) : c2;
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// ---------- offscreen helpers ----------
export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const glowCache = new Map();
function glowSprite(color) {
  let s = glowCache.get(color);
  if (s) return s;
  s = canvas(256, 256);
  const g = s.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  const [r, gg, b] = hexToRgb(color);
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.18, `rgba(${r},${gg},${b},0.55)`);
  grad.addColorStop(0.45, `rgba(${r},${gg},${b},0.16)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  glowCache.set(color, s);
  return s;
}
// Additive soft glow blob.
export function glow(ctx, x, y, r, color, alpha = 1) {
  if (alpha <= 0.002 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(alpha);
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Vertical gradient background.
export function bgGradient(ctx, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
export function radial(ctx, x, y, r, stops) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------- text ----------
export const FONTS = {
  serif: '"Noto Serif SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  brush: '"Ma Shan Zheng", "Noto Serif SC", serif',
  cinzel: '"Cinzel", "Noto Serif SC", serif',
  inter: '"Inter", "Noto Sans SC", sans-serif',
  mono: '"JetBrains Mono", "Noto Sans SC", monospace',
};

export function text(ctx, str, x, y, o = {}) {
  const {
    size = 40, weight = 400, font = 'sans', color = '#fff', alpha = 1, align = 'center',
    baseline = 'middle', spacing = 0, glow: g = 0, glowColor = color, shadow = 0, maxWidth,
  } = o;
  if (alpha <= 0.003) return 0;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.font = `${weight} ${size}px ${FONTS[font] || font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.letterSpacing = `${spacing}px`;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = shadow; ctx.shadowOffsetY = shadow * 0.15; }
  if (g) { ctx.shadowColor = glowColor; ctx.shadowBlur = g; }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y, maxWidth);
  if (g) ctx.fillText(str, x, y, maxWidth);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

export function measure(ctx, str, o = {}) {
  const { size = 40, weight = 400, font = 'sans', spacing = 0 } = o;
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONTS[font] || font}`;
  ctx.letterSpacing = `${spacing}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Text that types itself in, character by character, with a soft lead-in.
export function typeText(ctx, str, x, y, p, o = {}) {
  const chars = [...str];
  const n = chars.length * clamp(p);
  const full = Math.floor(n);
  const shown = chars.slice(0, full).join('');
  const w = text(ctx, shown, x, y, { ...o, align: 'left' });
  if (full < chars.length && n - full > 0) {
    text(ctx, chars[full], x + w + (o.spacing || 0), y, { ...o, align: 'left', alpha: (o.alpha ?? 1) * (n - full) });
  }
}

// A rounded rectangle path.
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Small label with a leader line pointing at (px, py).
export function callout(ctx, px, py, lx, ly, title, sub, a, o = {}) {
  if (a <= 0.01) return;
  const { color = '#f5d9a8', dot = true, align = lx >= px ? 'left' : 'right', size = 30, subSize = 22 } = o;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = rgba(color, 0.75);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(lx, ly);
  ctx.lineTo(lx + (align === 'left' ? 24 : -24), ly);
  ctx.stroke();
  if (dot) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill();
    glow(ctx, px, py, 28, '#ffcf8a', 0.5);
  }
  const tx = lx + (align === 'left' ? 34 : -34);
  text(ctx, title, tx, ly - (sub ? 16 : 0), { size, weight: 700, font: 'serif', color: '#fff', align, shadow: 8 });
  if (sub) text(ctx, sub, tx, ly + 22, { size: subSize, weight: 400, font: 'sans', color, align, shadow: 6 });
  ctx.restore();
}

// Star field (deterministic, gently twinkling, optional drift).
export function starfield(ctx, t, o = {}) {
  const { count = 500, seed = 1, alpha = 1, drift = 0, color = '#ffffff', bright = 1, region } = o;
  if (alpha <= 0) return;
  const R = rng(seed);
  const x0 = region ? region[0] : 0, y0 = region ? region[1] : 0, w = region ? region[2] : W, h = region ? region[3] : H;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = (R() * w + drift * t * (0.3 + R() * 0.7)) % w + x0;
    const y = R() * h + y0;
    const m = R();
    const size = m < 0.92 ? 0.6 + R() * 0.9 : 1.4 + R() * 1.4;
    const tw = 0.65 + 0.35 * Math.sin(t * (0.8 + R() * 2.4) + R() * TAU);
    const a = alpha * tw * (0.35 + 0.65 * R()) * bright;
    ctx.globalAlpha = clamp(a);
    ctx.fillStyle = m > 0.97 ? '#ffe2b8' : m > 0.94 ? '#bcd4ff' : color;
    ctx.fillRect(x, y, size, size);
    if (size > 2.2) glow(ctx, x + size / 2, y + size / 2, size * 5, '#cfe0ff', a * 0.35);
  }
  ctx.restore();
}

// Vignette overlay.
let vignetteCanvas;
export function vignette(ctx, strength = 0.55) {
  if (!vignetteCanvas) {
    vignetteCanvas = canvas(W, H);
    const g = vignetteCanvas.getContext('2d');
    const grad = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.drawImage(vignetteCanvas, 0, 0);
  ctx.restore();
}

// Fine static dither to keep dark gradients from banding after compression.
let ditherPattern;
export function dither(ctx, amount = 0.035) {
  if (!ditherPattern) {
    const c = canvas(256, 256), g = c.getContext('2d');
    const img = g.createImageData(256, 256);
    const R = rng(99);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = R() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    ditherPattern = ctx.createPattern(c, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ditherPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Draw a polyline progressively (0..1) given an array of [x, y] points.
export function partialPath(pts, p) {
  if (pts.length < 2) return { pts: pts.slice(), head: pts[0] };
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d); total += d;
  }
  let target = total * clamp(p);
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (target >= seg[i - 1]) { out.push(pts[i]); target -= seg[i - 1]; continue; }
    const f = seg[i - 1] ? target / seg[i - 1] : 0;
    out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
    break;
  }
  return { pts: out, head: out[out.length - 1], total };
}

// Catmull-Rom smoothing of a polyline, returns dense points.
export function smoothPts(pts, steps = 12) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function strokePts(ctx, pts) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

// Glowing line: wide faint stroke + thin bright core.
export function glowLine(ctx, pts, color, width = 3, alpha = 1) {
  if (pts.length < 2 || alpha <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(color, 0.18 * alpha);
  ctx.lineWidth = width * 5;
  strokePts(ctx, pts);
  ctx.strokeStyle = rgba(color, 0.4 * alpha);
  ctx.lineWidth = width * 2.2;
  strokePts(ctx, pts);
  ctx.strokeStyle = rgba(mix(color, '#ffffff', 0.55), alpha);
  ctx.lineWidth = width;
  strokePts(ctx, pts);
  ctx.restore();
}

// Panel / glass card.
export function card(ctx, x, y, w, h, o = {}) {
  const { r = 18, fill = 'rgba(12,18,32,0.62)', stroke = 'rgba(255,255,255,0.18)', alpha = 1, glowColor } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 30; }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// Draw `fn` into an offscreen layer and composite it with `alpha` (for
// crossfading between shots inside one scene). Layers are pooled so calls nest.
const layerPool = [];
export function withLayer(ctx, alpha, fn) {
  if (alpha <= 0.002) return;
  if (alpha >= 0.998) { ctx.save(); fn(ctx); ctx.restore(); return; }
  const c = layerPool.pop() || canvas(W, H);
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.clearRect(0, 0, W, H);
  g.save(); fn(g); g.restore();
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(c, 0, 0); ctx.restore();
  layerPool.push(c);
}

// A sequence of shots [{from, fade, draw}]: each fades in over the previous one
// starting at `from`; a shot stops being drawn once the next is fully opaque.
export function shots(ctx, t, list) {
  for (let i = 0; i < list.length; i++) {
    const s = list[i], nx = list[i + 1];
    const from = i === 0 ? -1e9 : s.from;
    const to = nx ? nx.from + (nx.fade ?? 1.0) : 1e9;
    if (t < from || t > to) continue;
    const a = i === 0 ? 1 : smooth(inv(s.from, s.from + (s.fade ?? 1.0), t));
    withLayer(ctx, a, s.draw);
  }
}

// Count-up number formatting.
export const fmt = (n, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
