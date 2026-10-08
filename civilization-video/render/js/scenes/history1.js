// Prologue, title, and chapters 1-3 (fire & stone, agriculture, dawn of civilisation).
import {
  W, H, TAU, clamp, lerp, inv, ease, env, rise, hash, rng, fbm1, rgba, mix, canvas, glow, bgGradient,
  text, callout, starfield, partialPath, smoothPts, strokePts, glowLine, roundRect, shots, fmt, toHex,
} from '../core.js';
import { G, fp, camPoint, camFor, camLerp, drawFlatMap, geoRoute } from '../geo.js';
import { icon } from '../icons.js';
import { space, campfire, embers, ridge, dust, texture, sparks } from './common.js';

// ───────────────────────────── Prologue: the cosmic day ─────────────────────────────
const CLOCK_EVENTS = [
  { h: 3.91, name: '生命出现', sub: '约38亿年前', lx: 1.32, ly: -0.62 },
  { h: 21.16, name: '寒武纪生命大爆发', sub: '约5.4亿年前', lx: -1.42, ly: -0.62 },
  { h: 22.78, name: '恐龙出现', sub: '约2.3亿年前', lx: -1.05, ly: -1.22 },
];
const hhmmss = (h) => {
  const s = Math.floor(h * 3600 + 1e-6);
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
};

function drawClock(g, S, a, move) {
  const { t } = S;
  const cx = lerp(W / 2, 520, move), cy = lerp(500, 500, move), sc = lerp(1, 0.78, move), R = 300 * sc;
  const appear = ease.out(inv(1.4, 2.6, t));
  const hrs = (24 - 6 / 3600) * ease.inOut(inv(2.1, 7.4, t));
  g.save();
  g.globalAlpha = a;
  g.translate(cx, cy);
  g.scale(lerp(0.92, 1, appear), lerp(0.92, 1, appear));
  // face
  glow(g, 0, 0, R * 1.6, '#2a3b8a', 0.25);
  g.strokeStyle = 'rgba(200,215,255,0.28)';
  g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(200,215,255,0.1)';
  g.beginPath(); g.arc(0, 0, R - 26 * sc, 0, TAU); g.stroke();
  for (let i = 0; i < 24 * 4; i++) {
    const ang = (i / 96) * TAU - Math.PI / 2, major = i % 24 === 0, hour = i % 4 === 0;
    const r0 = R - (major ? 22 : hour ? 14 : 7) * sc;
    g.strokeStyle = major ? 'rgba(255,255,255,0.8)' : hour ? 'rgba(220,230,255,0.45)' : 'rgba(220,230,255,0.18)';
    g.lineWidth = major ? 3 : 1.5;
    g.beginPath(); g.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); g.lineTo(Math.cos(ang) * R, Math.sin(ang) * R); g.stroke();
  }
  [0, 6, 12, 18].forEach((hh) => {
    const ang = (hh / 24) * TAU - Math.PI / 2;
    text(g, String(hh), Math.cos(ang) * (R - 50 * sc), Math.sin(ang) * (R - 50 * sc), { size: 24 * sc, font: 'inter', weight: 300, color: '#c9d4ff' });
  });
  // dinosaur era arc
  const dinoA = clamp((hrs - 22.78) / 0.3);
  if (dinoA > 0) {
    g.strokeStyle = `rgba(120,230,160,${0.8 * dinoA})`;
    g.lineWidth = 10 * sc;
    g.beginPath();
    g.arc(0, 0, R + 16 * sc, (22.78 / 24) * TAU - Math.PI / 2, (Math.min(hrs, 23.65) / 24) * TAU - Math.PI / 2);
    g.stroke();
  }
  // progress arc
  if (hrs > 0) {
    const grad = g.createConicGradient(-Math.PI / 2, 0, 0);
    grad.addColorStop(0, '#3a6bff');
    grad.addColorStop(0.6, '#9a5bff');
    grad.addColorStop(1, '#ffb45a');
    g.strokeStyle = grad;
    g.lineWidth = 6 * sc;
    g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, (hrs / 24) * TAU - Math.PI / 2); g.stroke();
  }
  // hand
  const ha = (hrs / 24) * TAU - Math.PI / 2;
  g.strokeStyle = 'rgba(255,240,220,0.9)';
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(Math.cos(ha) * R * 0.52, Math.sin(ha) * R * 0.52); g.lineTo(Math.cos(ha) * (R - 8), Math.sin(ha) * (R - 8)); g.stroke();
  glow(g, Math.cos(ha) * R, Math.sin(ha) * R, 46 * sc, '#ffd9a0', 0.9 * appear);
  // events
  for (const ev of CLOCK_EVENTS) {
    const ea = clamp((hrs - ev.h) / 0.6) * (1 - move);
    if (ea <= 0) continue;
    const ang = (ev.h / 24) * TAU - Math.PI / 2;
    const px = Math.cos(ang) * R, py = Math.sin(ang) * R;
    callout(g, px, py, ev.lx * R, ev.ly * R, ev.name, ev.sub, ea, { size: 26, subSize: 20, color: '#bcd0ff' });
  }
  // the final seconds: Homo sapiens at the top
  const sap = clamp(inv(6.9, 7.6, t));
  if (sap > 0) {
    glow(g, 0, -R, 120 * sc, '#ffcf80', sap * (0.8 + 0.2 * Math.sin(t * 6)));
    text(g, '智人登场  23:59:54', 0, -R - 58 * sc, { size: 32 * sc, weight: 700, font: 'serif', color: '#ffe2b0', alpha: sap, shadow: 10 });
  }
  // digital readout
  text(g, hhmmss(hrs), 0, -18 * sc, { size: 66 * sc, font: 'mono', weight: 700, color: '#ffffff', spacing: 2, glow: 16, glowColor: 'rgba(120,150,255,0.6)' });
  text(g, '地球46亿年 = 1天', 0, 46 * sc, { size: 26 * sc, font: 'sans', color: '#c7d2f5', spacing: 2 });
  text(g, '1秒 ≈ 5.3万年', 0, 86 * sc, { size: 22 * sc, font: 'sans', weight: 300, color: '#8f9cc8', spacing: 2 });
  g.restore();
}

function drawLastSeconds(g, S, a) {
  const { t } = S;
  const x0 = 960, x1 = 1760, y = 520;
  const grow = ease.out(inv(S.ls(1) + 0.3, S.ls(1) + 1.6, t));
  g.save();
  g.globalAlpha = a;
  text(g, '午夜前的最后 6 秒', (x0 + x1) / 2, 300, { size: 36, weight: 700, font: 'serif', color: '#ffffff', spacing: 4 });
  g.strokeStyle = 'rgba(220,230,255,0.6)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, grow), y); g.stroke();
  for (let s = 0; s <= 6; s++) {
    const x = lerp(x0, x1, s / 6);
    if (x > lerp(x0, x1, grow) + 1) continue;
    g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x, y + 10); g.stroke();
    text(g, s === 6 ? '0' : `-${6 - s}s`, x, y + 36, { size: 20, font: 'inter', color: '#aab6dd' });
  }
  // Homo sapiens at -6 s
  const sa = rise(t, S.ls(1) + 0.6, 0.6);
  glow(g, x0, y, 50, '#ffcf80', sa);
  callout(g, x0, y, x0 + 60, y - 110, '智人出现', '约30万年前', sa, { size: 26, subSize: 20 });
  // written civilisation: last 0.1 s
  const wa = rise(t, S.when(1, '只占') - 0.1, 0.5);
  const xs = x1 - (0.1 / 6) * (x1 - x0);
  if (wa > 0) {
    g.fillStyle = rgba('#ffd27a', 0.95 * wa);
    g.fillRect(xs, y - 16, x1 - xs, 32);
    glow(g, (xs + x1) / 2, y, 90, '#ffb347', wa * (0.8 + 0.2 * Math.sin(t * 5)));
    callout(g, (xs + x1) / 2, y - 18, x1 - 40, y - 140, '有文字记载的文明', '最后的 0.1 秒（约5000年）', wa, { size: 26, subSize: 20, align: 'right' });
    const ia = rise(t, S.when(1, '十分之一') + 0.4, 0.6);
    callout(g, x1, y + 16, x1 - 60, y + 120, '工业革命以来', '约最后 0.005 秒', ia, { size: 22, subSize: 18, align: 'right', color: '#9fc4ff' });
  }
  g.restore();
}

const MONTAGE = [
  { icon: 'flame', name: '火', era: '约100万年前', key: '点燃了火' },
  { icon: 'wheat', name: '农业', era: '约1.2万年前', key: '种下了粮食' },
  { icon: 'scroll', name: '文字', era: '约5000年前', key: '写下了文字' },
  { icon: 'cog', name: '机器', era: '约250年前', key: '造出了机器' },
  { icon: 'moon', name: '登月', era: '1969年', key: '登上了月球' },
  { icon: 'brain-circuit', name: '人工智能', era: '今天', key: '学会了思考' },
];

function drawMontage(g, S, a) {
  const { t } = S;
  MONTAGE.forEach((m, i) => {
    const x = 360 + i * 240, y = 470;
    const at = S.when(2, m.key) + 0.05;
    const k = ease.outBack(inv(at, at + 0.55, t));
    const fade = 1 - inv(S.ls(3) + 0.3 + i * 0.25, S.ls(3) + 1.3 + i * 0.25, t);
    const al = clamp(inv(at, at + 0.35, t)) * a * fade;
    if (al <= 0) return;
    const col = rgba(mix('#ffb35a', '#7fdcff', i / 5));
    const hex = toHex(mix('#ffb35a', '#7fdcff', i / 5));
    if (i > 0) {
      const px = 360 + (i - 1) * 240;
      const lp = ease.out(inv(at - 0.3, at + 0.2, t));
      g.save();
      g.globalAlpha = al * 0.7;
      g.strokeStyle = col;
      g.setLineDash([4, 8]);
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(px + 80, y); g.lineTo(lerp(px + 80, x - 80, lp), y); g.stroke();
      g.restore();
    }
    g.save();
    g.translate(x, y - (1 - k) * 20);
    g.scale(lerp(0.6, 1, k), lerp(0.6, 1, k));
    icon(g, m.icon, 0, 0, 118, hex, al, { glowAmt: 1.2 });
    g.restore();
    text(g, m.name, x, y + 108, { size: 32, weight: 700, font: 'serif', color: '#ffffff', alpha: al, shadow: 8 });
    text(g, m.era, x, y + 150, { size: 20, font: 'sans', color: col, alpha: al * 0.9, spacing: 1 });
  });
}

function prologue(g, S) {
  const { t } = S;
  space(g, t, { stars: rise(t, 0, 2.0), nebula: rise(t, 0, 3.0) });
  const clockA = env(t, 1.3, S.ls(2) + 0.7, 1.0, 0.8);
  const move = ease.inOut(inv(S.ls(1) - 0.3, S.ls(1) + 0.9, t));
  if (clockA > 0) drawClock(g, S, clockA, move);
  const insetA = env(t, S.ls(1) + 0.2, S.ls(2) + 0.7, 0.7, 0.8);
  if (insetA > 0) drawLastSeconds(g, S, insetA);
  drawMontage(g, S, 1);
  // a single ember rising: the spark that becomes the title
  const ea = rise(t, S.ls(3) + 0.8, 1.2);
  if (ea > 0) {
    const k = ease.inOut(inv(S.ls(3) + 0.8, S.d - 0.4, t));
    const x = W / 2 + 14 * Math.sin(t * 1.7), y = lerp(860, 470, k);
    glow(g, x, y, lerp(60, 150, k), '#ff9a3a', ea * (0.85 + 0.15 * Math.sin(t * 11)));
    glow(g, x, y, 20, '#fff2d0', ea);
    embers(g, x, y + 10, t, { count: 14, spread: 20, height: 120, alpha: ea * 0.7, seed: 9 });
  }
}

// ───────────────────────────── Title ─────────────────────────────
function title(g, S) {
  const { t } = S;
  space(g, t + 30, { stars: 1, nebula: 1.15, seed: 11 });
  const cx = W / 2, cy = 470;
  // the ember bursts into stars
  const bt = t - 0.25;
  if (bt < 0.4) glow(g, cx, cy, 150 + bt * 400, '#ffb050', 1 - Math.max(0, bt) / 0.4);
  if (bt > 0) {
    for (let i = 0; i < 160; i++) {
      const ang = hash(i * 3 + 1) * TAU, sp = 160 + 900 * Math.pow(hash(i * 7 + 2), 1.6);
      const d = sp * (1 - Math.exp(-bt * 1.6)) / 1.6;
      const x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d * 0.62;
      const heat = Math.exp(-bt * 1.4);
      const col = rgba(mix('#cfe0ff', '#ffb050', heat), 0.9 - 0.3 * hash(i));
      g.fillStyle = col;
      const s = 1.2 + 1.8 * hash(i * 5);
      g.fillRect(x, y, s, s);
      if (i % 4 === 0) glow(g, x, y, 10 + 12 * heat, heat > 0.4 ? '#ff9a3a' : '#9cc0ff', 0.5);
    }
  }
  const a = rise(t, 0.55, 1.3);
  const blur = (1 - ease.out(inv(0.55, 1.9, t))) * 14;
  g.save();
  if (blur > 0.3) g.filter = `blur(${blur.toFixed(1)}px)`;
  const tg = g.createLinearGradient(cx - 480, 0, cx + 480, 0);
  tg.addColorStop(0, '#ffcf8a');
  tg.addColorStop(0.5, '#fff6e6');
  tg.addColorStop(1, '#a9d2ff');
  text(g, '从火种到星辰', cx, cy, { size: 176, font: 'brush', color: tg, alpha: a, glow: 36, glowColor: 'rgba(255,190,110,0.55)', spacing: 6 });
  g.restore();
  const b = rise(t, 1.5, 1.0);
  const lw = 420 * ease.out(inv(1.4, 2.6, t));
  g.save();
  g.globalAlpha = b * 0.8;
  const lg = g.createLinearGradient(cx - lw, 0, cx + lw, 0);
  lg.addColorStop(0, 'rgba(255,220,170,0)');
  lg.addColorStop(0.5, 'rgba(255,220,170,0.9)');
  lg.addColorStop(1, 'rgba(255,220,170,0)');
  g.fillStyle = lg;
  g.fillRect(cx - lw, cy + 118, lw * 2, 1.5);
  g.restore();
  text(g, '人类文明进步史与未来三十年', cx, cy + 178, { size: 42, weight: 400, font: 'serif', color: '#efe6d8', alpha: b, spacing: 14 });
}

// ───────────────────────────── Chapter 1: fire & stone ─────────────────────────────
function handAxePath(g) {
  g.beginPath();
  for (let i = 0; i <= 72; i++) {
    const th = (i / 72) * TAU;
    const f = Math.pow((1 - Math.cos(th)) / 2, 0.52);
    const wob = 1 + 0.045 * Math.sin(th * 7 + 1) + 0.03 * Math.sin(th * 13);
    const x = Math.sin(th) * 128 * f * wob, y = (-Math.cos(th) * 175 - 25) * (1 + 0.02 * Math.sin(th * 5));
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

function handAxe(g, x, y, s, light, t) {
  g.save();
  g.translate(x, y);
  g.rotate(-0.12 + 0.02 * Math.sin(t * 0.5));
  g.scale(s, s);
  g.shadowColor = 'rgba(0,0,0,0.6)';
  g.shadowBlur = 40;
  handAxePath(g);
  const fill = g.createRadialGradient(-40, -40, 10, 0, 0, 230);
  fill.addColorStop(0, '#8a7c6a');
  fill.addColorStop(0.55, '#5a4d40');
  fill.addColorStop(1, '#2e2620');
  g.fillStyle = fill;
  g.fill();
  g.shadowBlur = 0;
  g.save();
  handAxePath(g);
  g.clip();
  // knapped facets: fan of flake scars from the rim towards a central ridge
  const R = rng(17), N = 18;
  const rim = [];
  for (let i = 0; i < N; i++) {
    const th = ((i + 0.5 * R()) / N) * TAU, f = Math.pow((1 - Math.cos(th)) / 2, 0.52);
    rim.push([Math.sin(th) * 140 * f, -Math.cos(th) * 190 - 25]);
  }
  for (let i = 0; i < N; i++) {
    const a = rim[i], b = rim[(i + 1) % N];
    const my = (a[1] + b[1]) / 2, ridgeX = 6 * Math.sin(my * 0.02);
    const c = [ridgeX + (a[0] + b[0]) * 0.08, my * 0.9 - 6];
    const shade = 0.55 + 0.45 * Math.cos(Math.atan2(b[1] - a[1], b[0] - a[0]) - 2.2) * (a[0] < 0 ? 1 : -0.6);
    g.fillStyle = `rgba(${Math.round(70 + 90 * shade)},${Math.round(60 + 78 * shade)},${Math.round(48 + 62 * shade)},0.55)`;
    g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2 * 0.9, (a[1] + b[1]) / 2, b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(25,18,12,0.5)'; g.lineWidth = 1.4; g.stroke();
    g.strokeStyle = 'rgba(255,235,210,0.14)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(a[0] + 2, a[1] + 2); g.lineTo(c[0] + 2, c[1] + 2); g.stroke();
  }
  g.restore();
  // firelit rim
  if (light > 0) {
    handAxePath(g);
    const rim = g.createLinearGradient(-130, 0, 130, 0);
    rim.addColorStop(0, 'rgba(255,150,70,0)');
    rim.addColorStop(1, `rgba(255,160,80,${0.75 * light})`);
    g.strokeStyle = rim;
    g.lineWidth = 4;
    g.stroke();
  }
  handAxePath(g);
  g.strokeStyle = 'rgba(20,14,10,0.7)';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
}

function fireNight(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#04050b'], [0.5, '#0a0a12'], [0.74, '#1b100b'], [1, '#0b0705']]);
  starfield(g, t, { count: 320, seed: 21, alpha: 0.65, region: [0, 0, W, 660] });
  const fireOn = ease.out(inv(S.ls(1) + 0.15, S.ls(1) + 1.6, t));
  const flare = 1 + 0.3 * ease.inOut(inv(S.when(1, '也让黑夜'), S.when(1, '光亮') + 0.6, t));
  const fx = W / 2 + 140, fy = 820;
  ridge(g, 640, 40, '#0c0a10', 31, { freq: 0.0025 });
  ridge(g, 700, 30, '#0f0b0a', 32, { freq: 0.004 });
  if (fireOn > 0) glow(g, fx, fy - 120, 1100 * flare, '#ff6a1a', 0.32 * fireOn);
  // ground
  g.save();
  ridge(g, 780, 18, '#120b07', 33, { freq: 0.003 });
  g.clip();
  if (fireOn > 0) {
    const gl = g.createRadialGradient(fx, fy, 20, fx, fy, 900 * flare);
    gl.addColorStop(0, `rgba(255,140,60,${0.55 * fireOn})`);
    gl.addColorStop(0.4, `rgba(140,60,20,${0.25 * fireOn})`);
    gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, W, H);
  }
  g.restore();
  // the stone tool
  const toolA = rise(t, 2.8, 0.9);
  const mv = ease.inOut(inv(S.ls(1) - 0.2, S.ls(1) + 1.4, t));
  const tx = lerp(W / 2, 560, mv), ty = lerp(480, 790, mv), ts = lerp(1.0, 0.42, mv);
  if (toolA > 0) {
    g.save();
    g.globalAlpha = toolA;
    glow(g, tx, ty, 380 * ts, '#5a6a9a', 0.25 * (1 - fireOn));
    handAxe(g, tx, ty, ts, Math.max(fireOn, 0.25), t);
    g.restore();
    for (const [k, st] of [[0, 4.9], [1, 5.9], [2, 6.9]]) {
      sparks(g, tx - 105 * ts, ty - 70 * ts + k * 40 * ts, t, st, { n: 22, seed: k + 3, dir: -2.6, cone: 1.6, speed: 460 });
    }
    callout(g, tx + 70, ty - 90, tx + 300, ty - 230, '约330万年前', '已知最早的石器', env(t, 3.4, S.ls(1) + 0.2, 0.6, 0.5));
  }
  const logsA = rise(t, S.ls(1) - 0.5, 0.6);
  if (logsA > 0) { g.save(); g.globalAlpha = logsA; campfire(g, fx, fy, 1.0, t, fireOn * flare); g.restore(); }
  embers(g, fx, fy - 120, t, { count: 70, alpha: fireOn, seed: 4, spread: 160, height: 700 });
  callout(g, fx + 70, fy - 170, fx + 300, fy - 380, '约100万年前', '人类的祖先开始用火', env(t, S.ls(1) + 1.2, S.ls(2) + 0.5, 0.6, 0.6));
}

const MIGRATION = [
  { name: '欧洲', t0: 0.0, dur: 2.4, pts: [[33, 12], [32.5, 29], [35, 33], [37, 38], [30, 41], [22, 44], [14, 47], [6, 48]] },
  { name: '东亚', t0: 0.2, dur: 2.6, pts: [[38, 5], [43.3, 12.5], [52, 17], [58, 23], [67, 27], [80, 29], [95, 28], [105, 31], [114, 34]] },
  { name: '澳大利亚', t0: 0.1, dur: 3.2, pts: [[38, 5], [43.3, 12.5], [52, 17], [58, 23], [67, 24], [78, 15], [88, 21], [98, 15], [104, 2], [110, -6], [118, -8.5], [126, -10], [132, -14], [134, -23]] },
  { name: '美洲', t0: 0.5, dur: 3.2, pts: [[38, 5], [43.3, 12.5], [52, 17], [58, 23], [67, 33], [76, 42], [92, 48], [110, 53], [130, 61], [155, 64], [175, 66], [-170, 65], [-155, 62], [-135, 58], [-124, 49], [-114, 37], [-102, 25], [-90, 15], [-79, 4], [-75, -10], [-70, -30], [-70, -45]] },
];
let migScreen = null;
function fireMap(g, S) {
  const { t } = S;
  g.fillStyle = '#05070b';
  g.fillRect(0, 0, W, H);
  const out = S.L[3] ? S.L[3].clauses[1].s : S.d;
  const camA = camFor(-25, -38, 60, 40, 0.92);
  const camW = { x: W / 2, y: H / 2 + 20, z: 1.0 };
  const k = ease.inOut(inv(out - 0.9, out + 1.3, t));
  const cam = camLerp(camA, camW, k);
  drawFlatMap(g, cam, { land: '#211b14', coast: 'rgba(255,190,120,0.38)', ocean: '#070a10', grat: 'rgba(255,255,255,0.035)' });
  const af = camPoint(cam, fp(22, 3));
  const pa = rise(t, S.ls(2) - 0.4, 1.0);
  glow(g, af[0], af[1], 260 * cam.z, '#ff9a3a', pa * (0.5 + 0.12 * Math.sin(t * 3)));
  callout(g, af[0] + 10, af[1] - 10, af[0] + 220, af[1] - 210, '约30万年前', '智人出现于非洲', env(t, S.ls(2) + 0.2, out + 0.6, 0.6, 0.5));
  if (!migScreen) migScreen = MIGRATION.map((m) => geoRoute(m.pts, 16).map(([lo, la]) => fp(lo, la)));
  MIGRATION.forEach((m, i) => {
    const p = ease.inOut(inv(out + m.t0, out + m.t0 + m.dur, t));
    if (p <= 0) return;
    const pts = migScreen[i].map((q) => camPoint(cam, q));
    const part = partialPath(pts, p);
    glowLine(g, part.pts, '#ffb062', 3.2, 0.95);
    glow(g, part.head[0], part.head[1], 34, '#ffd9a0', p < 1 ? 1 : 0.5);
    const la = clamp((p - 0.92) / 0.08);
    if (la > 0) {
      const e = pts[pts.length - 1];
      text(g, m.name, e[0] + (m.name === '欧洲' ? -10 : 14), e[1] + (m.name === '美洲' ? 34 : -26), {
        size: 28, weight: 700, font: 'serif', color: '#ffe7c4', alpha: la, shadow: 10, align: m.name === '欧洲' ? 'right' : 'left',
      });
    }
  });
}

function handPath(g) {
  // palm + five fingers as overlapping rounded shapes (hand pointing up)
  g.beginPath();
  g.roundRect(-46, -12, 92, 96, 34);
  g.roundRect(-34, 70, 68, 70, 18);
  const fingers = [[-62, 34, -0.95, 72, 26], [-33, -6, -0.12, 100, 25], [-8, -14, -0.02, 112, 25], [17, -8, 0.08, 102, 24], [38, 6, 0.24, 78, 22]];
  for (const [x, y, a, len, w] of fingers) {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.roundRect(-w / 2, -len, w, len + 18, w / 2);
    g.restore();
  }
}
const stencils = [];
function stencil(i) {
  if (stencils[i]) return stencils[i];
  const c = canvas(520, 520), s = c.getContext('2d');
  const R = rng(100 + i);
  s.translate(260, 270);
  for (let k = 0; k < 3200; k++) {
    const ang = R() * TAU, r = Math.abs((R() + R() + R() - 1.5) * 150) + 40 * R();
    const x = Math.cos(ang) * r, y = Math.sin(ang) * r * 1.05;
    s.fillStyle = `rgba(${150 + R() * 40},${50 + R() * 25},${28 + R() * 14},${0.08 + R() * 0.25})`;
    s.beginPath(); s.arc(x, y, 1 + R() * 4.5, 0, TAU); s.fill();
  }
  const cloud = s.createRadialGradient(0, 0, 40, 0, 0, 200);
  cloud.addColorStop(0, 'rgba(165,62,34,0.55)');
  cloud.addColorStop(1, 'rgba(165,62,34,0)');
  s.fillStyle = cloud;
  s.fillRect(-260, -270, 520, 520);
  s.globalCompositeOperation = 'destination-out';
  s.filter = 'blur(2.5px)';
  s.rotate((R() - 0.5) * 0.6);
  s.scale(1.05, 1.05);
  handPath(s);
  s.fillStyle = '#000';
  s.fill();
  stencils[i] = c;
  return c;
}

function cave(g, S) {
  const { t } = S;
  const tex = texture('cave', W, H, { base: '#6b4a33', blobs: 1100, dark: '#2e1d12', light: '#a07a58', seed: 7, cracks: 40, grain: 18 });
  g.drawImage(tex, 0, 0);
  const t0 = S.when(3, '洞穴') - 0.2;
  const spots = [[700, 470, 0.95, 0], [1010, 420, 0.85, 1], [1300, 520, 1.0, 2], [880, 700, 0.8, 3], [1520, 380, 0.7, 4]];
  spots.forEach(([x, y, s, i], k) => {
    const a = rise(t, t0 + k * 0.45, 0.7);
    if (a <= 0) return;
    const c = stencil(i);
    g.save();
    g.globalAlpha = a * 0.9;
    g.translate(x, y);
    g.scale(s, s);
    g.drawImage(c, -260, -270);
    g.restore();
  });
  // engraved cross-hatching (Blombos-style)
  const ea = rise(t, t0 + 0.6, 1.6, ease.linear);
  if (ea > 0) {
    g.save();
    g.translate(420, 760);
    g.rotate(-0.1);
    g.strokeStyle = 'rgba(245,215,175,0.38)';
    g.lineWidth = 2;
    const R2 = rng(12), lines = [[0, 0, 290, -6], [4, 34, 296, 30], [-2, 66, 288, 64]];
    for (let k = 0; k < 9; k++) {
      const x = 14 + k * 32 + (R2() - 0.5) * 8;
      lines.push([x, -2, x + 30 + (R2() - 0.5) * 10, 66]);
      lines.push([x + 30, -4, x + (R2() - 0.5) * 10, 64]);
    }
    lines.forEach(([a, b, c, d], i) => {
      const p = clamp(ea * lines.length - i);
      if (p <= 0) return;
      g.beginPath(); g.moveTo(a, b); g.lineTo(lerp(a, c, p) + Math.sin(i * 3.1) * 1.5, lerp(b, d, p)); g.stroke();
    });
    g.restore();
  }
  // flickering firelight from below
  const fl = 0.78 + 0.22 * fbm1(t * 4.2, 77);
  glow(g, W * 0.42, H * 1.08, 1500, '#ff7a2a', 0.42 * fl);
  const dk = g.createRadialGradient(W * 0.45, H * 0.85, 200, W * 0.45, H * 0.7, 1300);
  dk.addColorStop(0, 'rgba(0,0,0,0)');
  dk.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = dk;
  g.fillRect(0, 0, W, H);
  callout(g, 1300, 520, 1480, 690, '洞穴艺术', '距今数万年', env(t, t0 + 0.8, S.d, 0.6, 0.3), { dot: false });
}

function fire(g, S) {
  shots(g, S.t, [
    { draw: (c) => fireNight(c, S) },
    { from: S.ls(2) - 0.6, fade: 1.0, draw: (c) => fireMap(c, S) },
    { from: S.when(3, '洞穴') - 0.8, fade: 1.0, draw: (c) => cave(c, S) },
  ]);
}

// ───────────────────────────── Chapter 2: the agricultural revolution ─────────────────────────────
function latBand(latA, latB) {
  const p = new Path2D();
  const pts = [];
  const lons = [];
  for (let lon = -29.8; lon <= 329.8; lon += 3.98) lons.push(lon);
  lons.push(329.8);
  for (const lon of lons) pts.push(fp(lon > 180 ? lon - 360 : lon, latA));
  for (const lon of lons.slice().reverse()) pts.push(fp(lon > 180 ? lon - 360 : lon, latB));
  pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  p.closePath();
  return p;
}

const CENTERS = [
  { name: '新月沃地', crop: '小麦 · 大麦', lon: 40, lat: 35, key: '新月沃地', cropKey: '小麦', icon: 'wheat', dx: -230, dy: -140 },
  { name: '黄河流域', crop: '粟', lon: 112, lat: 36, key: '黄河', cropKey: '粟', icon: 'sprout', dx: -60, dy: -190 },
  { name: '长江流域', crop: '水稻', lon: 115, lat: 29.5, key: '长江', cropKey: '水稻', icon: 'sprout', dx: 150, dy: 120 },
  { name: '中美洲', crop: '玉米', lon: -97, lat: 18, key: '中美洲', cropKey: '玉米', icon: 'sprout', dx: -190, dy: -150 },
];
const MINOR = [[-72, -13], [145, -6], [5, 12], [39, 9], [-85, 38]];

function farmMap(g, S) {
  const { t } = S;
  const thaw = ease.inOut(inv(S.ls(0) + 0.4, S.ls(1) - 0.2, t));
  g.fillStyle = '#04070b';
  g.fillRect(0, 0, W, H);
  const cam = { x: W / 2, y: H / 2 + 10, z: 1.0 };
  drawFlatMap(g, cam, {
    land: rgba(mix('#3b4757', '#2b2a1b', thaw)), coast: rgba(mix('#bfe3ff', '#e8d6a0', thaw), 0.4), ocean: '#060a10', grat: 'rgba(255,255,255,0.035)',
  });
  // retreating ice sheets
  g.save();
  g.clip(G.flatSphere);
  const north = latBand(89.5, lerp(44, 68, thaw)), south = latBand(lerp(-52, -64, thaw), -89.5);
  for (const band of [north, south]) {
    g.fillStyle = `rgba(225,240,255,${lerp(0.5, 0.28, thaw)})`;
    g.fill(band);
    g.strokeStyle = 'rgba(235,248,255,0.45)';
    g.lineWidth = 1.5;
    g.stroke(band);
  }
  g.restore();
  text(g, '末次冰期结束 · 约1.2万年前', W / 2, 150, { size: 34, weight: 700, font: 'serif', color: '#e8f3ff', alpha: env(t, S.ls(0) + 0.3, S.ls(1) + 0.4, 0.6, 0.6), spacing: 4, shadow: 10 });
  // domestication centres
  CENTERS.forEach((c) => {
    const at = S.when(1, c.key), ct = S.when(1, c.cropKey);
    const a = rise(t, at - 0.1, 0.6);
    if (a <= 0) return;
    const p = fp(c.lon, c.lat);
    glow(g, p[0], p[1], 110, '#ffd27a', a * (0.6 + 0.15 * Math.sin(t * 3 + c.lon)));
    const ring = ((t - at) % 1.6) / 1.6;
    g.strokeStyle = rgba('#ffd27a', a * (1 - ring) * 0.8);
    g.lineWidth = 2;
    g.beginPath(); g.arc(p[0], p[1], 10 + ring * 46, 0, TAU); g.stroke();
    const lx = p[0] + c.dx, ly = p[1] + c.dy;
    callout(g, p[0], p[1], lx, ly, c.name, '', a, { size: 30 });
    const ca = rise(t, ct - 0.05, 0.5);
    if (ca > 0) {
      const right = c.dx >= 0;
      const ix = lx + (right ? 70 : -70) + (right ? 1 : -1) * (c.name.length * 30 + 30);
      icon(g, c.icon, ix, ly, 44, '#ffd27a', ca);
      text(g, c.crop, ix + (right ? 34 : -34), ly + 2, { size: 26, font: 'sans', weight: 500, color: '#ffe2a8', alpha: ca, align: right ? 'left' : 'right', shadow: 8 });
    }
  });
  const ma = rise(t, S.when(1, '人们各自') - 0.1, 0.8);
  MINOR.forEach(([lo, la], i) => {
    const p = fp(lo, la);
    glow(g, p[0], p[1], 50, '#ffd27a', ma * 0.6);
    g.fillStyle = rgba('#ffe6b0', ma);
    g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill();
  });
  text(g, '多个地区独立发展出农业', W / 2, H - 200, { size: 26, font: 'sans', color: '#e9dcc0', alpha: ma * env(t, 0, S.ls(2), 0, 0.5), spacing: 3, shadow: 10 });
}

let stalks = null;
function makeStalks() {
  const R = rng(55), out = [];
  const rows = [
    { n: 230, y0: 712, y1: 770, h0: 36, h1: 62, w: 1.2, col: '#b98a3c', head: '#e6b45c' },
    { n: 160, y0: 790, y1: 900, h0: 120, h1: 200, w: 2.0, col: '#8a6228', head: '#e9b250' },
    { n: 85, y0: 960, y1: 1140, h0: 260, h1: 420, w: 3.2, col: '#2a1a0c', head: '#3a250f' },
  ];
  rows.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      out.push({ ri, x: R() * (W + 80) - 40, y: lerp(r.y0, r.y1, R()), h: lerp(r.h0, r.h1, R()), ph: R() * TAU, lean: (R() - 0.5) * 0.25, ...r });
    }
  });
  out.sort((a, b) => a.y - b.y);
  return out;
}

function wheatField(g, S) {
  const { t } = S;
  const lt = t - (S.ls(2) - 0.6);
  bgGradient(g, [[0, '#121a36'], [0.28, '#4a3a62'], [0.5, '#c46a48'], [0.62, '#f2a556'], [0.66, '#ffd38a'], [1, '#2a1a0c']]);
  const sunY = 640 - 70 * ease.out(clamp(lt / 9));
  glow(g, W * 0.62, sunY, 700, '#ffb35a', 0.65);
  glow(g, W * 0.62, sunY, 140, '#fff4d8', 0.95);
  g.fillStyle = '#fff1d0';
  g.beginPath(); g.arc(W * 0.62, sunY, 46, 0, TAU); g.fill();
  ridge(g, 618, 12, '#5a3e30', 61, { freq: 0.003 });
  const fg = g.createLinearGradient(0, 610, 0, 760);
  fg.addColorStop(0, '#7a5232'); fg.addColorStop(1, '#3a2614');
  g.fillStyle = fg;
  g.fillRect(0, 640, W, H - 640);
  // villages along the horizon, multiplying as population grows
  const grow = ease.inOut(inv(S.when(2, '村落') - 0.3, S.le(2) + 0.6, t));
  const n = 5 + Math.floor(22 * grow);
  const R = rng(77);
  for (let i = 0; i < 27; i++) {
    const x = 80 + R() * (W - 160), s = 0.6 + R() * 0.6, round = R() < 0.5;
    const ai = clamp(5 + 22 * grow - i);
    if (i >= n + 1 || ai <= 0) continue;
    const y = 628 + R() * 14;
    g.save();
    g.globalAlpha = ai;
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = '#3a2418';
    if (round) { g.beginPath(); g.ellipse(0, 0, 26, 22, 0, Math.PI, TAU); g.fill(); g.fillRect(-26, -2, 52, 6); }
    else { g.fillRect(-22, -20, 44, 22); g.beginPath(); g.moveTo(-28, -18); g.lineTo(0, -40); g.lineTo(28, -18); g.fill(); }
    g.fillStyle = 'rgba(255,190,90,0.9)';
    g.fillRect(-4, -12, 6, 7);
    for (let k = 0; k < 5; k++) {
      const age = ((t * 0.35 + k / 5 + i * 0.13) % 1);
      glow(g, 6 + age * 30 + Math.sin(age * 6 + i) * 6, -40 - age * 110, 18 + age * 30, '#c8b8a8', (1 - age) * 0.18);
    }
    g.restore();
  }
  // wheat
  if (!stalks) stalks = makeStalks();
  for (const s of stalks) {
    const sway = s.lean + 0.06 * Math.sin(t * 1.3 + s.x * 0.006 + s.ph * 0.3) + 0.04 * fbm1(t * 0.6 + s.x * 0.002, 3);
    const tipX = s.x + Math.sin(sway) * s.h, tipY = s.y - Math.cos(sway) * s.h;
    g.strokeStyle = s.col;
    g.lineWidth = s.w;
    g.beginPath();
    g.moveTo(s.x, s.y);
    g.quadraticCurveTo(s.x + Math.sin(sway) * s.h * 0.3, s.y - s.h * 0.6, tipX, tipY);
    g.stroke();
    const hl = s.h * 0.22, nx = Math.sin(sway), ny = -Math.cos(sway);
    g.fillStyle = s.head;
    for (let k = 0; k < 7; k++) {
      const f = k / 7, cx = tipX - nx * hl * f, cy = tipY - ny * hl * f, side = k % 2 ? 1 : -1;
      g.beginPath();
      g.ellipse(cx + ny * side * s.w * 1.3, cy - nx * side * s.w * 1.3, s.w * 1.5 + 0.8, s.w * 3 + 1.5, sway, 0, TAU);
      g.fill();
    }
    if (s.ri === 2) {
      g.strokeStyle = 'rgba(255,190,100,0.35)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX + nx * 26, tipY + ny * 26); g.stroke();
    }
  }
  glow(g, W * 0.62, 600, 900, '#ff9a40', 0.18);
  dust(g, t, { count: 60, color: '#ffe0a0', alpha: 0.35, seed: 8, vx: 8, vy: -6 });
  const la = env(t, S.when(2, '定居') - 0.2, S.d, 0.7, 0.3);
  callout(g, 700, 610, 560, 470, '定居 · 村落 · 城镇', '人口开始成倍增长', la, { color: '#ffe0b0', align: 'right' });
}

function farming(g, S) {
  shots(g, S.t, [
    { draw: (c) => farmMap(c, S) },
    { from: S.ls(2) - 0.6, fade: 1.1, draw: (c) => wheatField(c, S) },
  ]);
}

// ───────────────────────────── Chapter 3: dawn of civilisation ─────────────────────────────
function tablet(g, x, y, t, p, a) {
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.rotate(-0.05);
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 40; g.shadowOffsetY = 16;
  roundRect(g, -190, -240, 380, 480, 46);
  const tg = g.createLinearGradient(-190, -240, 190, 240);
  tg.addColorStop(0, '#a26a42'); tg.addColorStop(1, '#5a3620');
  g.fillStyle = tg; g.fill();
  g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,220,180,0.25)'; g.lineWidth = 3; g.stroke();
  const rows = 9, perRow = 7, total = rows * perRow;
  const shown = p * total;
  const R = rng(5);
  for (let r = 0; r < rows; r++) {
    g.strokeStyle = 'rgba(40,20,10,0.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-160, -205 + r * 50 + 22); g.lineTo(160, -205 + r * 50 + 22); g.stroke();
    for (let c = 0; c < perRow; c++) {
      const k = r * perRow + c;
      const q = clamp(shown - k);
      const nW = 1 + Math.floor(R() * 3);
      if (q <= 0) continue;
      for (let w = 0; w < nW; w++) {
        const wx = -150 + c * 44 + w * 12, wy = -210 + r * 50 + (R() < 0.3 ? 8 : 0), vertical = R() < 0.6;
        g.save();
        g.translate(wx, wy);
        if (!vertical) g.rotate(-Math.PI / 2 + 0.2);
        g.globalAlpha = a * q;
        g.fillStyle = 'rgba(35,18,8,0.85)';
        g.beginPath(); g.moveTo(-6, 0); g.lineTo(6, 0); g.lineTo(0, 9); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(35,18,8,0.8)'; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(0, 6); g.lineTo(0, 26); g.stroke();
        g.strokeStyle = 'rgba(255,215,170,0.25)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(1.5, 8); g.lineTo(1.5, 26); g.stroke();
        g.restore();
      }
    }
  }
  g.restore();
}

const GLYPHS = [
  (g) => { g.beginPath(); g.ellipse(0, 0, 26, 14, 0, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-8, 14); g.quadraticCurveTo(-12, 26, -20, 30); g.stroke(); },
  (g) => { g.beginPath(); g.moveTo(-26, 10); g.quadraticCurveTo(-6, -24, 18, -14); g.lineTo(26, -20); g.moveTo(18, -14); g.quadraticCurveTo(14, 10, -2, 14); g.lineTo(-26, 10); g.moveTo(-6, 14); g.lineTo(-10, 28); g.moveTo(4, 14); g.lineTo(2, 28); g.stroke(); },
  (g) => { g.beginPath(); for (let i = 0; i < 7; i++) g.lineTo(-27 + i * 9, i % 2 ? -8 : 8); g.stroke(); },
  (g) => { g.beginPath(); g.moveTo(0, 30); g.lineTo(0, -24); g.quadraticCurveTo(14, -30, 10, -14); g.stroke(); },
  (g) => { g.beginPath(); g.ellipse(0, -16, 10, 13, 0, 0, TAU); g.moveTo(0, -3); g.lineTo(0, 30); g.moveTo(-18, 4); g.lineTo(18, 4); g.stroke(); },
  (g) => { g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 4, 0, TAU); g.fill(); },
  (g) => { g.beginPath(); g.moveTo(-26, 16); g.bezierCurveTo(-14, -16, -2, 26, 10, -2); g.quadraticCurveTo(16, -14, 26, -8); g.stroke(); },
  (g) => { g.beginPath(); g.arc(0, 8, 22, Math.PI, TAU); g.closePath(); g.stroke(); },
];

function papyrus(g, x, y, t, p, a) {
  g.save();
  g.globalAlpha = a;
  g.translate(x, y);
  g.rotate(0.03);
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 40; g.shadowOffsetY = 16;
  g.fillStyle = '#d6bf8e';
  g.fillRect(-190, -240, 380, 480);
  g.shadowColor = 'transparent';
  const pg = g.createLinearGradient(-190, 0, 190, 0);
  pg.addColorStop(0, 'rgba(120,90,40,0.25)'); pg.addColorStop(0.5, 'rgba(255,240,200,0.1)'); pg.addColorStop(1, 'rgba(120,90,40,0.3)');
  g.fillStyle = pg; g.fillRect(-190, -240, 380, 480);
  g.strokeStyle = 'rgba(120,90,50,0.08)'; g.lineWidth = 1;
  for (let i = 0; i < 64; i++) { const x = -190 + i * 6 + hash(i) * 4; g.beginPath(); g.moveTo(x, -240); g.lineTo(x + 2 - hash(i + 9) * 4, 240); g.stroke(); }
  g.strokeStyle = 'rgba(120,90,50,0.05)';
  for (let i = 0; i < 40; i++) { const y = -240 + i * 12 + hash(i + 40) * 6; g.beginPath(); g.moveTo(-190, y); g.lineTo(190, y + 2); g.stroke(); }
  g.strokeStyle = 'rgba(60,30,15,0.5)'; g.lineWidth = 2;
  for (const cx of [-95, 0, 95]) { g.beginPath(); g.moveTo(cx + 47, -215); g.lineTo(cx + 47, 215); g.stroke(); }
  const total = 18;
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let k = 0; k < total; k++) {
    const q = clamp(p * total - k);
    if (q <= 0) continue;
    const col = Math.floor(k / 6), row = k % 6;
    g.save();
    g.translate(-95 + col * 95, -185 + row * 74);
    g.globalAlpha = a * q;
    g.strokeStyle = '#2a1608'; g.fillStyle = '#2a1608'; g.lineWidth = 3.4;
    GLYPHS[(k * 5 + col) % GLYPHS.length](g);
    g.restore();
  }
  g.restore();
}

function writingShot(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#0e0a07'], [0.6, '#1c140c'], [1, '#0c0805']]);
  glow(g, W / 2, H * 0.55, 900, '#7a4a20', 0.3);
  dust(g, t, { count: 90, color: '#ffd9a0', alpha: 0.35, seed: 31, vx: 10, vy: -3 });
  const dim = 1 - 0.45 * ease.inOut(inv(S.ls(1), S.ls(1) + 1.2, t));
  const ta = rise(t, 3.0, 0.8), pa = rise(t, S.when(0, '古埃及') - 0.6, 0.8);
  const tp = clamp(inv(S.when(0, '苏美尔') - 0.2, S.when(0, '古埃及') + 0.3, t));
  const pp = clamp(inv(S.when(0, '古埃及'), S.le(0) + 0.4, t));
  tablet(g, 600, 470, t, tp, ta * dim);
  papyrus(g, 1320, 470, t, pp, pa * dim);
  text(g, '楔形文字', 600, 790, { size: 34, weight: 700, font: 'serif', color: '#ffe8c8', alpha: ta, shadow: 10 });
  text(g, '苏美尔 · 约公元前3200年', 600, 834, { size: 22, color: '#e0b884', alpha: ta, spacing: 1 });
  text(g, '象形文字', 1320, 790, { size: 34, weight: 700, font: 'serif', color: '#ffe8c8', alpha: pa, shadow: 10 });
  text(g, '古埃及 · 约公元前3200年', 1320, 834, { size: 22, color: '#e0b884', alpha: pa, spacing: 1 });
  // knowledge travelling: glyph light streaming across time and space
  const st = t - S.ls(1);
  if (st > 0) {
    for (let i = 0; i < 150; i++) {
      const src = i % 2 ? [600 + (hash(i) - 0.5) * 300, 470 + (hash(i + 1) - 0.5) * 400] : [1320 + (hash(i + 2) - 0.5) * 300, 470 + (hash(i + 3) - 0.5) * 400];
      const delay = hash(i * 7) * 1.6, life = 2.6 + hash(i * 9);
      const k = (st - delay) / life;
      if (k <= 0 || k >= 1) continue;
      const e = ease.inOut(k);
      const x = lerp(src[0], W + 120, e), y = lerp(src[1], 300 + 300 * hash(i * 13), e) + Math.sin(e * 6 + i) * 30;
      const al = Math.sin(Math.PI * k) * rise(t, S.ls(1), 0.6);
      g.fillStyle = rgba('#ffe1a8', al);
      g.fillRect(x, y, 2.2, 2.2);
      glow(g, x, y, 16, '#ffbf6a', al * 0.6);
    }
  }
}

function desert(g, S) {
  const { t } = S;
  const lt = t - S.ls(2);
  bgGradient(g, [[0, '#120c2a'], [0.3, '#3e2347'], [0.52, '#a8483a'], [0.64, '#f09a52'], [0.66, '#ffcf88'], [1, '#1a0f08']]);
  starfield(g, t, { count: 120, seed: 41, alpha: 0.4, region: [0, 0, W, 300] });
  glow(g, W * 0.5, 700, 900, '#ff9a4a', 0.5);
  g.fillStyle = '#ffe2a8';
  g.beginPath(); g.arc(W * 0.5, 716, 70, Math.PI, TAU); g.fill();
  glow(g, W * 0.5, 700, 200, '#fff0c8', 0.6);
  const horizon = 712;
  // city (ziggurat) at left
  const ca = rise(t, S.ls(2) - 0.2, 1.0);
  g.save();
  g.globalAlpha = ca;
  g.fillStyle = '#2a1712';
  [[150, 60, 300], [190, 120, 220], [225, 175, 150], [255, 222, 90]].forEach(([x, h, w]) => g.fillRect(x, horizon - h, w, h));
  g.fillRect(470, horizon - 46, 120, 46); g.fillRect(600, horizon - 30, 90, 30); g.fillRect(60, horizon - 36, 90, 36);
  g.restore();
  callout(g, 300, horizon - 230, 260, horizon - 330, '最早的城市', '美索不达米亚', env(t, S.ls(2) + 0.2, S.d, 0.6, 0.3), { align: 'right' });
  // pyramids rising from the ground
  const pk = ease.out(inv(S.when(2, '金字塔') - 0.3, S.when(2, '金字塔') + 1.6, t));
  g.save();
  g.beginPath(); g.rect(0, 0, W, horizon + 1); g.clip();
  [[1010, 560, 330], [1370, 420, 250], [1600, 270, 160]].forEach(([x, bw, h], i) => {
    const y = horizon + (1 - pk) * (h + 20) + i * 4;
    g.fillStyle = '#c8864c';
    g.beginPath(); g.moveTo(x - bw / 2, y); g.lineTo(x, y - h); g.lineTo(x + bw * 0.12, y); g.closePath(); g.fill();
    g.fillStyle = '#6e3f22';
    g.beginPath(); g.moveTo(x + bw * 0.12, y); g.lineTo(x, y - h); g.lineTo(x + bw / 2, y); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x - bw / 2, y); g.lineTo(x, y - h); g.stroke();
  });
  g.restore();
  callout(g, 1010, horizon - 330, 880, horizon - 450, '吉萨金字塔', '约公元前2560年', env(t, S.when(2, '金字塔') + 0.8, S.d, 0.6, 0.3), { align: 'right' });
  // sand
  const sg = g.createLinearGradient(0, horizon, 0, H);
  sg.addColorStop(0, '#5a3420'); sg.addColorStop(1, '#140b06');
  g.fillStyle = sg; g.fillRect(0, horizon, W, H - horizon);
  // Hammurabi stele
  const sa = rise(t, S.when(2, '汉谟拉比') - 0.3, 0.9);
  if (sa > 0) {
    g.save();
    g.globalAlpha = sa;
    g.translate(1660, 900);
    g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 30;
    g.beginPath(); g.moveTo(-80, 0); g.lineTo(-80, -300); g.quadraticCurveTo(-80, -390, 0, -395); g.quadraticCurveTo(80, -390, 80, -300); g.lineTo(80, 0); g.closePath();
    const st = g.createLinearGradient(-80, 0, 80, 0);
    st.addColorStop(0, '#1d1c22'); st.addColorStop(0.6, '#3a3844'); st.addColorStop(1, '#141318');
    g.fillStyle = st; g.fill();
    g.shadowColor = 'transparent';
    g.strokeStyle = 'rgba(255,200,150,0.35)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,220,180,0.12)';
    g.beginPath(); g.arc(0, -320, 34, 0, TAU); g.fill();
    const lines = clamp(inv(S.when(2, '汉谟拉比'), S.le(2) + 1.0, t)) * 16;
    g.strokeStyle = 'rgba(255,220,180,0.4)'; g.lineWidth = 2;
    for (let i = 0; i < Math.floor(lines); i++) {
      g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(-62, -260 + i * 15); g.lineTo(62, -260 + i * 15); g.stroke();
    }
    g.restore();
    callout(g, 1640, 560, 1560, 380, '《汉谟拉比法典》', '约公元前1754年', env(t, S.when(2, '汉谟拉比') + 0.5, S.d, 0.6, 0.3), { align: 'right' });
  }
  dust(g, t, { count: 70, color: '#ffd9a0', alpha: 0.3, seed: 3, vx: 30, vy: 0 });
}

const ORACLE = [
  { ch: '日', strokes: [{ e: [50, 50, 32, 38] }, { l: [[36, 52], [64, 50]] }] },
  { ch: '月', strokes: [{ c: [[64, 8], [6, 26], [6, 74], [64, 92]] }, { c: [[64, 8], [34, 30], [34, 70], [64, 92]] }, { l: [[26, 50], [40, 50]] }] },
  { ch: '山', strokes: [{ l: [[6, 88], [22, 52], [36, 88]] }, { l: [[36, 88], [50, 14], [64, 88]] }, { l: [[64, 88], [78, 52], [94, 88]] }, { l: [[4, 90], [96, 90]] }] },
  { ch: '水', strokes: [{ c: [[52, 6], [36, 36], [66, 62], [48, 94]] }, { l: [[22, 22], [30, 32]] }, { l: [[18, 50], [28, 56]] }, { l: [[22, 76], [30, 84]] }, { l: [[80, 20], [72, 30]] }, { l: [[84, 48], [74, 56]] }, { l: [[80, 74], [72, 84]] }] },
  { ch: '人', strokes: [{ c: [[58, 8], [52, 40], [40, 70], [24, 94]] }, { l: [[50, 44], [76, 66]] }] },
  { ch: '木', strokes: [{ l: [[50, 6], [50, 94]] }, { l: [[50, 34], [24, 10]] }, { l: [[50, 34], [76, 10]] }, { l: [[50, 66], [24, 92]] }, { l: [[50, 66], [76, 92]] }] },
];

function drawStroke(g, s, p) {
  if (p <= 0) return;
  g.beginPath();
  if (s.l) {
    const pts = partialPath(s.l, p).pts;
    pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  } else if (s.c) {
    const [a, b, c, d] = s.c, pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, v = 1 - u;
      pts.push([v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]);
    }
    partialPath(pts, p).pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
  } else if (s.e) {
    const [cx, cy, rx, ry] = s.e;
    g.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + TAU * p);
  }
  g.stroke();
}

function oracle(g, S) {
  const { t } = S;
  const tex = texture('dark-warm', W, H, { base: '#120d09', blobs: 500, dark: '#060403', light: '#2a1d12', seed: 3, grain: 10 });
  g.drawImage(tex, 0, 0);
  glow(g, 560, 520, 700, '#a8743a', 0.25);
  // bone plate
  const ba = rise(t, S.ls(3) - 0.6, 0.9);
  g.save();
  g.globalAlpha = ba;
  g.translate(560, 520);
  g.rotate(-0.08);
  g.shadowColor = 'rgba(0,0,0,0.8)'; g.shadowBlur = 50;
  g.beginPath();
  g.moveTo(-170, -300); g.quadraticCurveTo(0, -340, 170, -300); g.quadraticCurveTo(230, -60, 190, 160);
  g.quadraticCurveTo(140, 330, 0, 330); g.quadraticCurveTo(-140, 330, -190, 160); g.quadraticCurveTo(-230, -60, -170, -300);
  const bg = g.createRadialGradient(-40, -80, 30, 0, 0, 380);
  bg.addColorStop(0, '#d8c69e'); bg.addColorStop(0.6, '#b49a6a'); bg.addColorStop(1, '#7c6440');
  g.fillStyle = bg; g.fill();
  g.shadowColor = 'transparent';
  g.save();
  g.clip();
  g.globalAlpha = 0.35;
  g.globalCompositeOperation = 'multiply';
  g.drawImage(texture('bone', 600, 700, { base: '#d8c8a0', blobs: 260, dark: '#7a6040', light: '#f0e4c8', seed: 12, cracks: 14, grain: 22 }), -300, -350);
  g.restore();
  g.strokeStyle = 'rgba(80,50,20,0.5)'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(70,40,20,0.65)'; g.lineWidth = 2.5;
  [[-100, -180], [60, -150], [-60, 20], [110, 60], [-20, 190]].forEach(([x, y], i) => {
    g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x, y + 40); g.moveTo(x, y); g.lineTo(x + (i % 2 ? -28 : 28), y - 22); g.stroke();
  });
  g.lineWidth = 3; g.strokeStyle = 'rgba(60,35,18,0.75)'; g.lineCap = 'round';
  ORACLE.forEach((o, i) => {
    g.save();
    g.translate(-150 + (i % 2) * 190 + (i > 3 ? 40 : 0), -260 + Math.floor(i / 2) * 170 + 60);
    g.scale(0.55, 0.55);
    o.strokes.forEach((s) => drawStroke(g, s, 1));
    g.restore();
  });
  g.restore();
  callout(g, 700, 300, 820, 210, '甲骨文', '商代 · 约公元前1250年', env(t, S.ls(3) + 0.1, S.d, 0.6, 0.3));
  // pictographs drawn stroke by stroke, then their modern forms
  const dp = clamp(inv(S.ls(3) - 0.1, S.when(3, '一脉相承') + 0.2, t));
  const mp = rise(t, S.when(3, '一脉相承'), 0.9);
  ORACLE.forEach((o, i) => {
    const x = 1010 + i * 140, y = 330;
    const local = clamp(dp * ORACLE.length - i * 0.75);
    g.save();
    g.translate(x - 50, y - 50);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#f3e3c0'; g.lineWidth = 5.5;
    g.shadowColor = 'rgba(255,190,110,0.7)'; g.shadowBlur = 14;
    o.strokes.forEach((s, k) => drawStroke(g, s, clamp(local * o.strokes.length - k)));
    g.restore();
    const ma = clamp(mp * 1.6 - i * 0.12);
    if (ma > 0) {
      g.save();
      g.globalAlpha = ma;
      g.strokeStyle = 'rgba(243,227,192,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y + 72); g.lineTo(x, y + 150); g.moveTo(x - 8, y + 140); g.lineTo(x, y + 152); g.lineTo(x + 8, y + 140); g.stroke();
      g.restore();
      text(g, o.ch, x, y + 230, { size: 92, weight: 900, font: 'serif', color: '#fff6e0', alpha: ma, glow: 18, glowColor: 'rgba(255,190,110,0.5)' });
    }
  });
  const la = rise(t, S.when(3, '绵延') - 0.2, 0.8);
  text(g, '一脉相承 · 绵延三千多年', 1360, 760, { size: 34, weight: 700, font: 'serif', color: '#ffd9a0', alpha: la, spacing: 6, shadow: 10 });
}

function dawn(g, S) {
  shots(g, S.t, [
    { draw: (c) => writingShot(c, S) },
    { from: S.ls(2) - 0.5, fade: 1.0, draw: (c) => desert(c, S) },
    { from: S.ls(3) - 0.7, fade: 0.9, draw: (c) => oracle(c, S) },
  ]);
}

export const SCENES = { prologue, title, fire, farming, dawn };
