// Chapters 7-9 and "today": industry, the 20th century, the information age, two centuries of change.
import {
  W, H, TAU, clamp, lerp, inv, ease, env, rise, hash, rng, fbm1, rgba, mix, glow, bgGradient,
  text, callout, starfield, partialPath, glowLine, roundRect, card, shots, strokePts, fmt, measure,
} from '../core.js';
import { G, drawGlobe, geoRoute, globeRoute, visible } from '../geo.js';
import { icon } from '../icons.js';
import { ridge, dust, sparks } from './common.js';

// ───────────────────────────── Chapter 7: the industrial revolution ─────────────────────────────
function gear(g, x, y, r, teeth, ang, color, hub = '#1a1a1e') {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  const tooth = r * 0.12;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * TAU, a1 = ((i + 0.25) / teeth) * TAU, a2 = ((i + 0.5) / teeth) * TAU, a3 = ((i + 0.75) / teeth) * TAU;
    const p = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr];
    const pts = [p(a0, r - tooth), p(a1, r + tooth * 0.2), p(a2, r + tooth * 0.2), p(a3, r - tooth)];
    pts.forEach(([px, py], k) => (i === 0 && k === 0 ? g.moveTo(px, py) : g.lineTo(px, py)));
  }
  g.closePath();
  const gg = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.1);
  gg.addColorStop(0, rgba(mix(color, '#ffffff', 0.25)));
  gg.addColorStop(1, rgba(mix(color, '#000000', 0.45)));
  g.fillStyle = gg;
  g.fill();
  g.strokeStyle = 'rgba(255,220,180,0.25)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = hub;
  g.beginPath(); g.arc(0, 0, r * 0.62, 0, TAU); g.fill();
  g.fillStyle = rgba(mix(color, '#000000', 0.2));
  for (let k = 0; k < 5; k++) {
    g.save(); g.rotate((k / 5) * TAU);
    g.fillRect(-r * 0.07, 0, r * 0.14, r * 0.62);
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill();
  g.fillStyle = '#0c0c0e';
  g.beginPath(); g.arc(0, 0, r * 0.07, 0, TAU); g.fill();
  g.restore();
}

function steam(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#0b0e14'], [0.6, '#15161b'], [1, '#0c0b0c']]);
  glow(g, 260, 900, 700, '#ff6a20', 0.35 + 0.25 * rise(t, S.when(0, '化石能源') - 0.4, 1.2));
  // gears (right)
  const w = t * 0.8;
  gear(g, 1440, 360, 150, 30, w, '#a8743c');
  gear(g, 1440 + 150 + 90 - 4, 360, 90, 18, -w * (150 / 90) + Math.PI / 18, '#8a6a48');
  gear(g, 1440 - 40, 360 + 150 + 120 - 6, 120, 24, -w * (150 / 120) + 0.12, '#7a5a3a');
  gear(g, 1690, 600, 70, 14, w * (150 / 90) * (90 / 70), '#b08050');
  // steam engine: cylinder + piston + flywheel (left)
  const ea = rise(t, 3.0, 0.8);
  g.save();
  g.globalAlpha = ea;
  const fx = 900, fy = 600, fr = 200, crank = 80;
  const th = t * 2.2;
  const cpx = fx + Math.cos(th) * crank, cpy = fy + Math.sin(th) * crank;
  const rodL = 330;
  const px = cpx - Math.sqrt(rodL * rodL - (cpy - fy) ** 2);
  // cylinder
  roundRect(g, 260, 540, 260, 120, 12);
  const cg = g.createLinearGradient(0, 540, 0, 660);
  cg.addColorStop(0, '#6a5a4a'); cg.addColorStop(0.5, '#3a3028'); cg.addColorStop(1, '#1e1814');
  g.fillStyle = cg; g.fill();
  g.strokeStyle = 'rgba(255,210,160,0.35)'; g.lineWidth = 2; g.stroke();
  // piston rod
  g.strokeStyle = '#c8b090'; g.lineWidth = 10;
  g.beginPath(); g.moveTo(480, fy); g.lineTo(px, fy); g.stroke();
  g.fillStyle = '#8a7a64'; g.fillRect(px - 22, fy - 26, 44, 52);
  // connecting rod
  g.strokeStyle = '#a89070'; g.lineWidth = 14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(px, fy); g.lineTo(cpx, cpy); g.stroke();
  // flywheel
  g.strokeStyle = '#5a4a3a'; g.lineWidth = 26;
  g.beginPath(); g.arc(fx, fy, fr, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,210,160,0.25)'; g.lineWidth = 2;
  g.beginPath(); g.arc(fx, fy, fr + 13, 0, TAU); g.stroke();
  g.strokeStyle = '#4a3c30'; g.lineWidth = 12;
  for (let k = 0; k < 6; k++) {
    const a = th + (k / 6) * TAU;
    g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr); g.stroke();
  }
  g.fillStyle = '#2a221c'; g.beginPath(); g.arc(fx, fy, 34, 0, TAU); g.fill();
  g.fillStyle = '#d8c0a0'; g.beginPath(); g.arc(cpx, cpy, 10, 0, TAU); g.fill();
  g.restore();
  // steam puffs
  for (let i = 0; i < 18; i++) {
    const life = 2.4, age = (t + i * (life / 18)) % life, k = age / life;
    const x = 300 + Math.sin(i * 1.7) * 20 + k * 60, y = 530 - k * 360;
    glow(g, x, y, 40 + k * 120, '#d8dce4', ea * 0.22 * (1 - k));
  }
  callout(g, 470, 540, 560, 300, '1769 · 瓦特改良蒸汽机', '人类开始大规模驾驭化石能源', env(t, S.when(0, '瓦特') - 0.2, S.ls(1) + 0.3, 0.6, 0.5));
  dust(g, t, { count: 40, color: '#ffb070', alpha: 0.4 * rise(t, S.when(0, '化石能源') - 0.4, 1), seed: 71, vx: 20, vy: -30 });
}

function industrialLandscape(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#1a1c26'], [0.45, '#4a3a3a'], [0.62, '#b0603a'], [0.7, '#6a3a2a'], [1, '#0e0a0a']]);
  glow(g, W * 0.7, 640, 800, '#ff8a40', 0.35);
  // smoke stacks + factories
  g.fillStyle = '#16120f';
  [[120, 260], [300, 200], [520, 300], [760, 230]].forEach(([x, h], i) => {
    g.fillRect(x, 690 - h, 34, h);
    for (let k = 0; k < 9; k++) {
      const age = ((t * 0.3 + k / 9 + i * 0.21) % 1);
      glow(g, x + 17 + age * 160 + Math.sin(age * 5 + i) * 20, 690 - h - age * 300, 30 + age * 110, '#3a3434', 0.5 * (1 - age));
    }
  });
  g.fillStyle = '#16120f';
  g.fillRect(40, 560, 900, 140);
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(40 + i * 100, 560); g.lineTo(90 + i * 100, 520); g.lineTo(140 + i * 100, 560); g.fill(); }
  g.fillStyle = 'rgba(255,170,80,0.85)';
  for (let i = 0; i < 26; i++) g.fillRect(70 + (i % 13) * 66, 590 + Math.floor(i / 13) * 46, 22, 16);
  // ground, railway bridge
  g.fillStyle = '#0f0c0b';
  g.fillRect(0, 690, W, 120);
  g.fillStyle = '#1c1714';
  g.fillRect(0, 760, W, 14);
  for (let x = 0; x < W; x += 70) g.fillRect(x, 774, 10, 60);
  // train
  const ta = rise(t, S.when(1, '铁路') - 0.6, 0.5);
  const tx = lerp(W + 200, -900, ease.inOut(inv(S.ls(1) - 0.5, S.le(1) + 1.5, t)));
  g.save();
  g.globalAlpha = ta;
  g.fillStyle = '#0a0808';
  g.fillRect(tx, 690, 160, 70); g.fillRect(tx + 20, 650, 30, 40); g.fillRect(tx + 100, 640, 60, 50);
  for (let c = 0; c < 5; c++) g.fillRect(tx + 180 + c * 150, 690, 140, 66);
  g.fillStyle = 'rgba(255,190,100,0.9)';
  for (let c = 0; c < 5; c++) for (let k = 0; k < 4; k++) g.fillRect(tx + 196 + c * 150 + k * 30, 704, 18, 14);
  for (let k = 0; k < 12; k++) {
    const age = ((t * 0.9 + k / 12) % 1);
    glow(g, tx + 35 + age * 380, 640 - age * 150 - Math.sin(age * 4) * 20, 30 + age * 90, '#4a4440', 0.55 * (1 - age));
  }
  g.restore();
  // water + steamship
  const wg = g.createLinearGradient(0, 834, 0, H);
  wg.addColorStop(0, '#2a1a14'); wg.addColorStop(1, '#0a0606');
  g.fillStyle = wg; g.fillRect(0, 834, W, H - 834);
  const sa = rise(t, S.when(1, '轮船') - 0.4, 0.6);
  const sx = lerp(1300, 1700, inv(S.ls(1), S.d, t));
  g.save();
  g.globalAlpha = sa;
  g.fillStyle = '#080606';
  g.beginPath(); g.moveTo(sx - 220, 880); g.lineTo(sx + 200, 880); g.lineTo(sx + 160, 930); g.lineTo(sx - 190, 930); g.closePath(); g.fill();
  g.fillRect(sx - 120, 845, 220, 36); g.fillRect(sx - 40, 790, 34, 60); g.fillRect(sx + 30, 800, 30, 50);
  for (let k = 0; k < 8; k++) { const age = ((t * 0.5 + k / 8) % 1); glow(g, sx - 23 - age * 200, 780 - age * 120, 30 + age * 70, '#3a3434', 0.5 * (1 - age)); }
  g.restore();
  [['工厂', 470, 500, '工厂'], ['铁路', 960, 610, '铁路'], ['轮船', sx, 750, '轮船']].forEach(([n, x, y, k]) => {
    const a = rise(t, S.when(1, k) - 0.1, 0.5);
    text(g, n, x, y, { size: 32, weight: 700, font: 'serif', color: '#ffe2c0', alpha: a, shadow: 10, spacing: 6 });
  });
}

function electricity(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#05070e'], [1, '#0c0e18']]);
  const on = rise(t, S.when(2, '电灯') - 0.1, 0.5, ease.outExpo);
  const flick = on * (0.92 + 0.08 * Math.sin(t * 40) * (1 - clamp((t - S.when(2, '电灯')) / 0.6)));
  const bx = 640, by = 470;
  if (flick > 0) { glow(g, bx, by, 700, '#ffb050', 0.45 * flick); glow(g, bx, by, 200, '#fff0c0', 0.9 * flick); }
  g.save();
  g.translate(bx, by);
  g.strokeStyle = rgba('#e8eef8', 0.6 + 0.3 * flick);
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, -20, 140, Math.PI * 0.78, Math.PI * 2.22);
  g.bezierCurveTo(70, 150, 60, 170, 60, 200);
  g.lineTo(-60, 200);
  g.bezierCurveTo(-60, 170, -70, 150, -95, 85);
  g.closePath();
  g.fillStyle = rgba('#ffffff', 0.04 + 0.06 * flick);
  g.fill(); g.stroke();
  g.fillStyle = '#6a6a72';
  for (let k = 0; k < 4; k++) { roundRect(g, -64, 205 + k * 18, 128, 14, 6); g.fill(); }
  g.strokeStyle = rgba(mix('#8a6a40', '#fff2c0', flick), 1);
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(-30, 200); g.lineTo(-24, 40);
  for (let k = 0; k <= 8; k++) g.lineTo(-24 + k * 6, 40 + (k % 2 ? -14 : 0));
  g.lineTo(30, 200); g.stroke();
  g.restore();
  const chips = [
    ['zap', '1831', '电磁感应 · 法拉第', '电力'], ['radio-tower', '1844', '电报', '电报'],
    ['phone', '1876', '电话', '电话'], ['lightbulb', '1879', '实用白炽灯', '电灯'],
  ];
  chips.forEach(([ic, y, n, k], i) => {
    const a = rise(t, S.when(2, k) - 0.15, 0.5);
    if (a <= 0) return;
    const x = 200 + i * 230, yy = 800;
    card(g, x - 100, yy - 56, 200, 112, { alpha: a, fill: 'rgba(20,24,40,0.7)', stroke: 'rgba(255,220,150,0.3)' });
    icon(g, ic, x - 58, yy - 4, 40, '#ffd27a', a, { glowAmt: 0.6 });
    text(g, y, x + 22, yy - 20, { size: 30, font: 'inter', weight: 600, color: '#ffffff', alpha: a });
    text(g, n, x + 22, yy + 22, { size: 18, font: 'sans', color: '#e8d2a8', alpha: a, maxWidth: 130 });
  });
  // medicine: microscope view
  const ma = rise(t, S.when(2, '疫苗') - 0.4, 0.8);
  if (ma > 0) {
    const mx = 1400, my = 440, mr = 250;
    g.save();
    g.globalAlpha = ma;
    g.beginPath(); g.arc(mx, my, mr, 0, TAU);
    const mg = g.createRadialGradient(mx, my, 20, mx, my, mr);
    mg.addColorStop(0, '#1e3a40'); mg.addColorStop(1, '#081418');
    g.fillStyle = mg; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 26; i++) {
      const x = mx + (hash(i) - 0.5) * 2 * mr * 0.85 + Math.sin(t * 0.6 + i) * 8;
      const y = my + (hash(i + 50) - 0.5) * 2 * mr * 0.85 + Math.cos(t * 0.5 + i) * 8;
      const kill = clamp((t - S.when(2, '对抗') - hash(i + 9) * 1.5) / 0.8);
      g.save(); g.translate(x, y); g.rotate(hash(i + 7) * TAU + t * 0.2);
      g.fillStyle = rgba(mix('#7ae0a0', '#3a4a48', kill), 0.85 * (1 - kill * 0.7));
      roundRect(g, -22, -7, 44, 14, 7); g.fill();
      g.restore();
    }
    g.restore();
    g.strokeStyle = 'rgba(200,240,240,0.6)'; g.lineWidth = 4;
    g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.stroke();
    g.restore();
    [['1796', '牛痘疫苗 · 琴纳'], ['1882', '发现结核杆菌 · 科赫'], ['1885', '狂犬病疫苗 · 巴斯德']].forEach(([y, n], i) => {
      const a = rise(t, S.when(2, '疫苗') + i * 0.5, 0.5);
      text(g, y, 1150 + i * 250, 780, { size: 30, font: 'inter', weight: 600, color: '#bff0d8', alpha: a });
      text(g, n, 1150 + i * 250, 820, { size: 19, font: 'sans', color: '#d8eee4', alpha: a });
    });
  }
}

const POP = [[1000, 2.95], [1100, 3.2], [1200, 3.9], [1300, 3.9], [1400, 3.5], [1500, 4.6], [1600, 5.5], [1700, 6.0], [1750, 7.9], [1800, 9.8], [1850, 12.6], [1900, 16.5], [1927, 20], [1950, 25], [1960, 30.2], [1974, 40], [1987, 50], [1999, 60], [2011, 70], [2022, 80], [2026, 83]];
const LIFE = [[1000, 28], [1200, 28.5], [1400, 27.5], [1500, 28], [1600, 28], [1700, 28.5], [1800, 28.7], [1850, 29.3], [1900, 32], [1913, 34.1], [1920, 33.5], [1930, 37], [1940, 40], [1950, 46.5], [1960, 50.5], [1970, 56.5], [1980, 61], [1990, 64.5], [2000, 67], [2010, 70.2], [2019, 72.8], [2021, 71], [2023, 73.2], [2026, 73.5]];
export function series(data, x0, x1, y0, y1, yr0, yr1, vmax) {
  return data.map(([yr, v]) => [lerp(x0, x1, (yr - yr0) / (yr1 - yr0)), lerp(y1, y0, v / vmax), yr]);
}
export function chartFrame(g, x0, x1, y0, y1, label, unit, color, a, ticks) {
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
  ticks.forEach(([v, lab, yy]) => {
    g.beginPath(); g.moveTo(x0, yy); g.lineTo(x1, yy); g.stroke();
    text(g, lab, x0 - 16, yy, { size: 18, font: 'inter', color: '#9aa3b8', align: 'right' });
  });
  g.restore();
  text(g, label, x0, y0 - 34, { size: 28, weight: 700, font: 'serif', color, align: 'left', alpha: a });
  text(g, unit, x0 + measure(g, label, { size: 28, weight: 700, font: 'serif' }) + 16, y0 - 32, { size: 18, font: 'sans', color: '#9aa3b8', align: 'left', alpha: a });
}
function drawSeries(g, pts, upto, color, fillTop, fillBottom, a, dashedBefore = null) {
  const vis = [];
  for (let i = 0; i < pts.length; i++) {
    if (pts[i][2] <= upto) vis.push(pts[i]);
    else {
      const p0 = pts[i - 1], p1 = pts[i];
      if (p0) { const f = (upto - p0[2]) / (p1[2] - p0[2]); vis.push([lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f), upto]); }
      break;
    }
  }
  if (vis.length < 2) return null;
  g.save();
  g.globalAlpha = a;
  const fg = g.createLinearGradient(0, fillTop, 0, fillBottom);
  fg.addColorStop(0, rgba(color, 0.35)); fg.addColorStop(1, rgba(color, 0));
  g.fillStyle = fg;
  g.beginPath(); g.moveTo(vis[0][0], fillBottom);
  vis.forEach((p) => g.lineTo(p[0], p[1]));
  g.lineTo(vis[vis.length - 1][0], fillBottom); g.closePath(); g.fill();
  g.restore();
  if (dashedBefore) {
    const pre = vis.filter((p) => p[2] <= dashedBefore), post = vis.filter((p) => p[2] >= dashedBefore);
    g.save(); g.setLineDash([8, 8]); glowLine(g, pre, color, 3, a * 0.85); g.restore();
    glowLine(g, post, color, 3.5, a);
  } else glowLine(g, vis, color, 3.5, a);
  const head = vis[vis.length - 1];
  glow(g, head[0], head[1], 40, color, a * 0.9);
  return head;
}

function hockey(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#06080f'], [1, '#0c1018']]);
  const x0 = 300, x1 = 1640;
  const a = rise(t, S.ls(3) - 0.4, 0.8);
  const flat = ease.inOut(inv(S.when(3, '在此之前') - 0.2, S.le(3) - 0.5, t));
  const up = ease.inOut(inv(S.when(4, '曲线') - 0.6, S.le(4) + 1.2, t));
  const upto = 1000 + 800 * flat + 226 * up;
  const pTop = 170, pBot = 440, lTop = 570, lBot = 820;
  chartFrame(g, x0, x1, pTop, pBot, '世界人口', '（亿）', '#ffd27a', a, [[0, '0', pBot], [40, '40', lerp(pBot, pTop, 40 / 90)], [80, '80', lerp(pBot, pTop, 80 / 90)]]);
  chartFrame(g, x0, x1, lTop, lBot, '人均预期寿命', '（岁）', '#7fdcff', a, [[0, '0', lBot], [40, '40', lerp(lBot, lTop, 40 / 85)], [80, '80', lerp(lBot, lTop, 80 / 85)]]);
  for (let yr = 1000; yr <= 2000; yr += 200) {
    const x = lerp(x0, x1, (yr - 1000) / 1026);
    text(g, String(yr), x, lBot + 32, { size: 20, font: 'inter', color: '#9aa3b8', alpha: a });
  }
  const pp = series(POP, x0, x1, pTop, pBot, 1000, 2026, 90);
  const lp = series(LIFE, x0, x1, lTop, lBot, 1000, 2026, 85);
  const ph = drawSeries(g, pp, upto, '#ffd27a', pTop, pBot, a);
  const lh = drawSeries(g, lp, upto, '#7fdcff', lTop, lBot, a, 1800);
  const fa = rise(t, S.when(3, '30岁') - 0.2, 0.6) * (1 - up);
  const p1800 = pp.find((p) => p[2] === 1800), l1800 = lp.find((p) => p[2] === 1800);
  text(g, '约30岁', l1800[0], l1800[1] - 40, { size: 30, weight: 700, font: 'serif', color: '#bff0ff', alpha: fa, shadow: 8 });
  text(g, '约10亿人', p1800[0], p1800[1] - 40, { size: 30, weight: 700, font: 'serif', color: '#ffe8b0', alpha: fa, shadow: 8 });
  text(g, '1800年前的寿命为估算', x0 + 10, lBot - 24, { size: 18, font: 'sans', color: '#8fa0b8', alpha: a * 0.8, align: 'left' });
  const pa = env(t, S.when(3, '极端贫困') - 0.3, S.ls(4) + 0.2, 0.5, 0.5);
  if (pa > 0) {
    card(g, 1180, 470, 470, 74, { alpha: pa, fill: 'rgba(60,20,20,0.6)', stroke: 'rgba(255,140,120,0.4)' });
    text(g, '1820年：约76%的人生活在极端贫困中', 1415, 507, { size: 22, font: 'sans', weight: 500, color: '#ffd8cc', alpha: pa });
  }
  const ea = rise(t, S.le(4) + 0.4, 0.6);
  if (ph && ea > 0) {
    text(g, '80亿+', ph[0] - 10, ph[1] - 30, { size: 40, weight: 800, font: 'inter', color: '#ffe8b0', alpha: ea, align: 'right', glow: 14, glowColor: 'rgba(255,200,100,0.6)' });
    text(g, '73岁', lh[0] - 10, lh[1] - 30, { size: 40, weight: 800, font: 'inter', color: '#d8f6ff', alpha: ea, align: 'right', glow: 14, glowColor: 'rgba(100,200,255,0.6)' });
  }
  const yr = Math.round(upto);
  text(g, `${yr}`, x1, 110, { size: 54, font: 'inter', weight: 800, color: '#ffffff', alpha: a * 0.85, align: 'right', spacing: 2 });
}

function industry(g, S) {
  shots(g, S.t, [
    { draw: (c) => steam(c, S) },
    { from: S.ls(1) - 0.5, fade: 0.9, draw: (c) => industrialLandscape(c, S) },
    { from: S.ls(2) - 0.5, fade: 0.9, draw: (c) => electricity(c, S) },
    { from: S.ls(3) - 0.5, fade: 0.9, draw: (c) => hockey(c, S) },
  ]);
}

// ───────────────────────────── Chapter 8: the accelerating 20th century ─────────────────────────────
function rail(g, S, events, a) {
  const { t } = S;
  const x0 = 260, x1 = 1660, y = 858;
  const X = (yr) => lerp(x0, x1, (yr - 1900) / 100);
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
  for (let yr = 1900; yr <= 2000; yr += 10) {
    g.beginPath(); g.moveTo(X(yr), y - (yr % 50 ? 6 : 12)); g.lineTo(X(yr), y + (yr % 50 ? 6 : 12)); g.stroke();
    if (yr % 20 === 0) text(g, String(yr), X(yr), y + 30, { size: 18, font: 'inter', color: '#aab2c8' });
  }
  let cur = null;
  events.forEach((e) => {
    if (t >= e.at && (!cur || e.at > cur.at)) cur = e;
  });
  events.forEach((e) => {
    const ea = rise(t, e.at, 0.4);
    if (ea <= 0) return;
    if (e.to) {
      g.fillStyle = rgba(e.color, 0.55 * ea);
      g.fillRect(X(e.year), y - 5, X(e.to) - X(e.year), 10);
    }
    glow(g, X(e.year), y, 22, e.color, ea * 0.8);
    g.fillStyle = rgba(e.color, ea);
    g.beginPath(); g.arc(X(e.year), y, 5, 0, TAU); g.fill();
  });
  if (cur) {
    const ca = clamp(inv(cur.at, cur.at + 0.3, t));
    const x = X(cur.year);
    g.strokeStyle = rgba(cur.color, 0.7 * ca); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y - 46); g.stroke();
    text(g, cur.label, x, y - 66, { size: 24, font: 'sans', weight: 500, color: '#ffffff', alpha: ca, shadow: 8 });
  }
  g.restore();
}

function biplane(g, x, y, s, t) {
  // Wright Flyer in side view, flying to the right: canard elevator in front, twin rudder behind.
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.fillStyle = '#16110d';
  g.strokeStyle = '#16110d';
  g.fillRect(-140, -40, 280, 6); g.fillRect(-140, 10, 280, 6);
  g.lineWidth = 2.5;
  [-120, -40, 40, 120].forEach((x0) => { g.beginPath(); g.moveTo(x0, -34); g.lineTo(x0, 10); g.stroke(); });
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(140, -37); g.lineTo(250, -20); g.moveTo(140, 13); g.lineTo(250, -6); g.stroke();
  g.fillRect(232, -26, 56, 4); g.fillRect(232, -10, 56, 4);
  g.beginPath(); g.moveTo(-140, -37); g.lineTo(-250, -18); g.moveTo(-140, 13); g.lineTo(-250, -2); g.stroke();
  g.fillRect(-262, -34, 5, 46); g.fillRect(-248, -34, 5, 46);
  g.fillRect(-10, -6, 34, 16);
  g.beginPath(); g.arc(8, -10, 7, 0, TAU); g.fill();
  const blur = 0.5 + 0.5 * Math.sin((t || 0) * 50);
  g.fillStyle = `rgba(22,17,13,${0.35 + 0.2 * blur})`;
  g.beginPath(); g.ellipse(-150, -12, 6, 26, 0, 0, TAU); g.fill();
  g.restore();
}

function century(g, S) {
  const { t } = S;
  const ev = [
    { year: 1903, label: '1903 · 首次有动力载人飞行', at: S.when(0, '莱特'), color: '#ffd27a' },
    { year: 1905, label: '1905 · 狭义相对论', at: S.when(0, '爱因斯坦'), color: '#bfa8ff' },
    { year: 1914, to: 1918, label: '1914—1918 · 第一次世界大战', at: S.when(1, '两次世界大战'), color: '#ff6a5a' },
    { year: 1928, label: '1928 · 青霉素', at: S.when(0, '弗莱明'), color: '#7ae0a0' },
    { year: 1939, to: 1945, label: '1939—1945 · 第二次世界大战', at: S.when(1, '两次世界大战') + 0.8, color: '#ff6a5a' },
    { year: 1945, label: '1945 · 核武器 / 联合国成立', at: S.when(1, '联合国'), color: '#7fc4ff' },
    { year: 1946, label: '1946 · 第一台通用电子计算机', at: S.when(3, '电子计算机'), color: '#7fdcff' },
    { year: 1947, label: '1947 · 晶体管', at: S.when(3, '晶体管'), color: '#7fdcff' },
    { year: 1953, label: '1953 · DNA双螺旋', at: S.when(2, 'DNA'), color: '#7ae0a0' },
    { year: 1958, label: '1958 · 集成电路', at: S.when(3, '集成电路'), color: '#7fdcff' },
    { year: 1965, label: '1960年代 · 绿色革命', at: S.when(1, '绿色革命'), color: '#b8e05a' },
    { year: 1969, label: '1969 · 阿波罗11号登月', at: S.when(2, '阿波罗'), color: '#e8e8ff' },
    { year: 1980, label: '1980 · 天花被消灭', at: S.when(1, '天花'), color: '#7ae0a0' },
  ];
  shots(g, t, [
    { draw: (c) => sky1903(c, S) },
    { from: S.when(0, '两年后') - 0.4, fade: 0.7, draw: (c) => relativity(c, S) },
    { from: S.when(0, '1928') - 0.4, fade: 0.7, draw: (c) => petri(c, S) },
    { from: S.ls(1) - 0.4, fade: 0.8, draw: (c) => wars(c, S) },
    { from: S.ls(2) - 0.4, fade: 0.8, draw: (c) => helix(c, S) },
    { from: S.when(2, '1969') - 0.4, fade: 0.8, draw: (c) => moon(c, S) },
    { from: S.ls(3) - 0.4, fade: 0.8, draw: (c) => circuit(c, S) },
  ]);
  const ra = rise(t, S.ls(0) - 0.4, 0.8);
  const band = g.createLinearGradient(0, 760, 0, H);
  band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(0.3, `rgba(0,0,0,${0.55 * ra})`); band.addColorStop(1, `rgba(0,0,0,${0.7 * ra})`);
  g.fillStyle = band; g.fillRect(0, 760, W, H - 760);
  rail(g, S, ev, ra);
}

function sky1903(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#2a3a5a'], [0.5, '#c8885a'], [0.72, '#f0c08a'], [1, '#3a2a20']]);
  glow(g, W * 0.3, 640, 500, '#fff0c8', 0.5);
  ridge(g, 700, 20, '#4a3428', 91, { freq: 0.002 });
  ridge(g, 740, 12, '#2a1e18', 92, { freq: 0.003 });
  const k = inv(S.when(0, '莱特') - 0.8, S.when(0, '两年后') + 0.6, t);
  const x = lerp(200, 1500, k), y = 470 - 60 * k + 10 * Math.sin(t * 2.2);
  g.save(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.setLineDash([6, 10]); g.lineWidth = 2;
  g.beginPath(); g.moveTo(80, 560); g.quadraticCurveTo((80 + x) / 2, 520, x - 220, y + 10); g.stroke(); g.restore();
  biplane(g, x, y, 1.0, t);
}
function relativity(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#05050e'], [1, '#0e0a1e']]);
  starfield(g, t, { count: 300, seed: 93, alpha: 0.6 });
  const cx = W / 2, cy = 520, a = 1;
  g.save();
  g.strokeStyle = 'rgba(170,150,255,0.45)'; g.lineWidth = 1.2;
  const dip = (x, y) => -160 * Math.exp(-((x - cx) ** 2 + ((y - cy) * 2.2) ** 2) / (2 * 230 * 230));
  for (let i = -12; i <= 12; i++) {
    g.beginPath();
    for (let j = -20; j <= 20; j++) {
      const x = cx + j * 50, y = cy + i * 22;
      const yy = y - dip(x, y);
      j === -20 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  for (let j = -20; j <= 20; j++) {
    g.beginPath();
    for (let i = -12; i <= 12; i++) {
      const x = cx + j * 50, y = cy + i * 22;
      const yy = y - dip(x, y);
      i === -12 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  g.restore();
  glow(g, cx, cy + 120, 200, '#ffcf8a', 0.8);
  const sg = g.createRadialGradient(cx - 20, cy + 100, 5, cx, cy + 120, 60);
  sg.addColorStop(0, '#fff8e0'); sg.addColorStop(1, '#d88a40');
  g.fillStyle = sg; g.beginPath(); g.arc(cx, cy + 120, 56, 0, TAU); g.fill();
  text(g, 'E = mc²', cx, 230, { size: 110, font: 'serif', weight: 700, color: '#f4eeff', alpha: a, glow: 30, glowColor: 'rgba(170,140,255,0.6)', spacing: 6 });
}
function petri(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#071210'], [1, '#0a1a16']]);
  const cx = W / 2, cy = 470, r = 300;
  const k = clamp((t - S.when(0, '弗莱明')) / 3);
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, TAU);
  const ag = g.createRadialGradient(cx - 60, cy - 60, 20, cx, cy, r);
  ag.addColorStop(0, '#e8d8a0'); ag.addColorStop(1, '#a89458');
  g.fillStyle = ag; g.fill();
  g.clip();
  const mx = cx + 60, my = cy - 30, zone = 40 + 150 * ease.out(k);
  for (let i = 0; i < 220; i++) {
    const x = cx + (hash(i) - 0.5) * 2 * r, y = cy + (hash(i + 99) - 0.5) * 2 * r;
    const d = Math.hypot(x - mx, y - my);
    const alive = d > zone ? 1 : clamp((d - zone + 40) / 40);
    if (alive <= 0) continue;
    g.fillStyle = rgba('#f8f0d0', 0.85 * alive);
    g.beginPath(); g.arc(x, y, 5 + hash(i + 3) * 6, 0, TAU); g.fill();
  }
  g.fillStyle = 'rgba(255,255,240,0.15)';
  g.beginPath(); g.arc(mx, my, zone, 0, TAU); g.fill();
  for (let i = 0; i < 40; i++) {
    const ang = (i / 40) * TAU, rr = 34 + 10 * Math.sin(i * 3.7);
    g.fillStyle = 'rgba(90,140,70,0.85)';
    g.beginPath(); g.arc(mx + Math.cos(ang) * rr * 0.6, my + Math.sin(ang) * rr * 0.6, 14, 0, TAU); g.fill();
  }
  g.fillStyle = '#6a9a4a'; g.beginPath(); g.arc(mx, my, 30, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(220,240,255,0.6)'; g.lineWidth = 6;
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
  callout(g, mx + 30, my - 20, mx + 330, my - 200, '青霉菌', '周围的细菌无法生长', rise(t, S.when(0, '青霉素'), 0.6));
}
function wars(g, S) {
  const { t } = S;
  const warA = 1 - rise(t, S.when(1, '联合国') - 0.5, 1.2);
  bgGradient(g, [[0, rgba(mix('#0a0e1a', '#1a0a0a', warA))], [1, rgba(mix('#0e1424', '#0a0505', warA))]]);
  if (warA > 0) {
    for (let i = 0; i < 90; i++) {
      const x = (hash(i) * W + t * 20 * (0.5 + hash(i + 3))) % W, y = (hash(i + 7) * H + t * 40 * (0.5 + hash(i + 11))) % H;
      g.fillStyle = rgba('#a89890', 0.4 * warA);
      g.fillRect(x, y, 2, 2);
    }
    const ft = t - (S.when(1, '核武器') - 0.1);
    if (ft > 0) {
      const k = clamp(ft / 2.5);
      glow(g, W / 2, 560, 200 + 800 * k, '#fff0d0', warA * (1 - k) * 0.9);
      g.strokeStyle = rgba('#ffd8b0', warA * (1 - k) * 0.7); g.lineWidth = 3;
      g.beginPath(); g.ellipse(W / 2, 600, 100 + 900 * k, 30 + 200 * k, 0, 0, TAU); g.stroke();
    }
    text(g, '两次世界大战 · 核武器的阴影', W / 2, 300, { size: 46, weight: 700, font: 'serif', color: '#ffd8d0', alpha: warA * rise(t, S.ls(1), 0.8), spacing: 6, shadow: 12 });
  }
  const pa = 1 - warA;
  if (pa > 0) {
    drawGlobe(g, { cx: W / 2, cy: 470, r: 230, rot: [-20 - t * 6, -25, 0], alpha: pa, ocean: ['#1a4a8a', '#081a3a'], land: '#4a8acb', coast: 'rgba(220,240,255,0.5)', atmosphere: '#7fc4ff' });
    const items = [['users', '1945 · 联合国成立', '联合国'], ['wheat', '1960年代 · 绿色革命', '绿色革命'], ['shield-check', '1980 · 天花被彻底消灭', '天花']];
    items.forEach(([ic, n, k], i) => {
      const a = rise(t, S.when(1, k) - 0.1, 0.5) * pa;
      const x = 420 + i * 540, y = 780 - 20;
      icon(g, ic, x - 150, y - 60, 46, '#bfe0ff', a);
      text(g, n, x - 110, y - 60, { size: 28, weight: 700, font: 'serif', color: '#ffffff', alpha: a, align: 'left', shadow: 8 });
    });
  }
}
function helix(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#04100c'], [1, '#081a14']]);
  const cx = W / 2, y0 = 160, y1 = 760;
  const rot = t * 1.3;
  const pairs = 34;
  const items = [];
  for (let i = 0; i < pairs; i++) {
    const y = lerp(y0, y1, i / (pairs - 1));
    const ang = rot + i * 0.42;
    const xa = cx + Math.cos(ang) * 170, za = Math.sin(ang);
    const xb = cx + Math.cos(ang + Math.PI) * 170, zb = Math.sin(ang + Math.PI);
    items.push({ y, xa, za, xb, zb, i });
  }
  items.forEach(({ y, xa, za, xb, zb, i }) => {
    const cols = ['#ff7a6a', '#ffd27a', '#7ae0a0', '#7fc4ff'];
    const mid = (xa + xb) / 2;
    g.strokeStyle = rgba(cols[i % 4], 0.65); g.lineWidth = 6;
    g.beginPath(); g.moveTo(xa, y); g.lineTo(mid, y); g.stroke();
    g.strokeStyle = rgba(cols[(i + 2) % 4], 0.65);
    g.beginPath(); g.moveTo(mid, y); g.lineTo(xb, y); g.stroke();
  });
  for (const strand of ['a', 'b']) {
    const pts = items.map((it) => [strand === 'a' ? it.xa : it.xb, it.y]);
    glowLine(g, pts, strand === 'a' ? '#9ff0d0' : '#a8d8ff', 4, 1);
  }
  items.forEach(({ y, xa, za, xb, zb }) => {
    for (const [x, z] of [[xa, za], [xb, zb]]) {
      g.fillStyle = rgba('#ffffff', 0.5 + 0.5 * z);
      g.beginPath(); g.arc(x, y, 6 + 3 * z, 0, TAU); g.fill();
    }
  });
  callout(g, cx + 180, 300, cx + 420, 220, '1953 · DNA双螺旋结构', '沃森、克里克（基于富兰克林的X射线衍射图）', rise(t, S.when(2, 'DNA') + 0.2, 0.6));
}
function moon(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#010104'], [1, '#05060c']]);
  starfield(g, t, { count: 400, seed: 97, alpha: 0.8 });
  const rise2 = ease.out(inv(S.when(2, '1969') - 0.4, S.when(2, '1969') + 4, t));
  drawGlobe(g, { cx: 1300, cy: lerp(760, 360, rise2), r: 150, rot: [60, -10, 0], ocean: ['#1a5aa0', '#082040'], land: '#c8b890', coast: null, grat: null, atmosphere: '#8ac8ff' });
  // lunar horizon
  g.fillStyle = '#5a5a5e';
  g.beginPath(); g.moveTo(0, H); g.lineTo(0, 700);
  for (let x = 0; x <= W; x += 40) g.lineTo(x, 680 + 20 * fbm1(x * 0.004, 5));
  g.lineTo(W, H); g.closePath();
  const lg = g.createLinearGradient(0, 680, 0, H);
  lg.addColorStop(0, '#8a8a8e'); lg.addColorStop(1, '#2a2a2e');
  g.fillStyle = lg; g.fill();
  for (let i = 0; i < 14; i++) {
    const x = hash(i) * W, y = 730 + hash(i + 5) * 300, r = 20 + hash(i + 9) * 60;
    g.strokeStyle = 'rgba(30,30,34,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, y, r, r * 0.3, 0, 0, TAU); g.stroke();
  }
  // lunar module silhouette
  g.save();
  g.translate(620, 690);
  g.fillStyle = '#1a1a1c';
  g.fillRect(-60, -110, 120, 70);
  g.beginPath(); g.moveTo(-40, -110); g.lineTo(-20, -170); g.lineTo(30, -170); g.lineTo(50, -110); g.fill();
  g.strokeStyle = '#1a1a1c'; g.lineWidth = 6;
  [[-60, -40, -100, 0], [60, -40, 100, 0], [-30, -40, -40, 0], [30, -40, 40, 0]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  g.fillStyle = '#c8a040'; g.fillRect(-60, -80, 120, 8);
  g.restore();
  callout(g, 1300 - 110, lerp(760, 360, rise2) + 100, 1080, 560, '1969年7月20日 · 阿波罗11号', '“这是个人的一小步，却是人类的一大步”', rise(t, S.when(2, '阿波罗') + 0.3, 0.6), { align: 'right' });
}
function circuit(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#020a0c'], [1, '#04161a']]);
  const R = rng(7);
  const traces = [];
  for (let i = 0; i < 46; i++) {
    const side = i % 4;
    let x = side === 0 ? 0 : side === 1 ? W : R() * W, y = side === 2 ? 0 : side === 3 ? 780 : R() * 780;
    const pts = [[x, y]];
    for (let k = 0; k < 4; k++) {
      if (k % 2 === 0) x = lerp(x, W / 2 + (R() - 0.5) * 300, 0.5); else y = lerp(y, 420 + (R() - 0.5) * 200, 0.5);
      pts.push([x, y]);
    }
    pts.push([W / 2 + (R() - 0.5) * 220, 420 + (R() - 0.5) * 160]);
    traces.push(pts);
  }
  const grow = ease.out(inv(S.ls(3) - 0.2, S.ls(3) + 2.4, t));
  traces.forEach((pts, i) => {
    const part = partialPath(pts, grow);
    g.strokeStyle = 'rgba(80,220,200,0.25)'; g.lineWidth = 2;
    strokePts(g, part.pts);
    const u = ((t * 0.35 + hash(i)) % 1);
    const q = partialPath(pts, u * grow).head;
    glow(g, q[0], q[1], 16, '#7af0e0', 0.8 * grow);
  });
  card(g, W / 2 - 150, 290, 300, 260, { fill: 'rgba(10,30,34,0.95)', stroke: 'rgba(120,240,220,0.6)', glowColor: 'rgba(80,220,200,0.5)', alpha: grow });
  for (let i = 0; i < 10; i++) {
    g.fillStyle = rgba('#7af0e0', 0.6 * grow);
    g.fillRect(W / 2 - 140 + i * 30, 280, 10, 12); g.fillRect(W / 2 - 140 + i * 30, 548, 10, 12);
  }
  icon(g, 'cpu', W / 2, 420, 150, '#9ff8ec', grow, { thin: true });
  const chips = [['1946', '电子计算机', '电子计算机'], ['1947', '晶体管', '晶体管'], ['1958', '集成电路', '集成电路']];
  chips.forEach(([y, n, k], i) => {
    const a = rise(t, S.when(3, k) - 0.1, 0.5);
    const x = 420 + i * 540;
    text(g, y, x, 650, { size: 40, font: 'inter', weight: 800, color: '#ffffff', alpha: a });
    text(g, n, x, 700, { size: 26, font: 'serif', weight: 700, color: '#9ff8ec', alpha: a });
  });
}

// ───────────────────────────── Chapter 9: the information age ─────────────────────────────
const ARPA = [[-118.44, 34.07], [-122.18, 37.45], [-119.85, 34.41], [-111.85, 40.76]];
const CITIES = [[-74, 40.7], [-0.1, 51.5], [2.35, 48.86], [139.7, 35.7], [116.4, 39.9], [121.5, 31.2], [77.2, 28.6], [72.9, 19.1], [-46.6, -23.5], [-99.1, 19.4], [37.6, 55.8], [28.98, 41.0], [31.2, 30.0], [3.4, 6.5], [36.8, -1.3], [18.4, -33.9], [151.2, -33.9], [103.8, 1.35], [106.8, -6.2], [100.5, 13.75], [126.98, 37.57], [-122.4, 37.8], [-87.6, 41.9], [-43.2, -22.9], [-58.4, -34.6], [55.3, 25.3], [114.2, 22.3], [-79.4, 43.7], [13.4, 52.5], [12.5, 41.9]];
function netGlobe(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#02040a'], [1, '#050a18']]);
  starfield(g, t, { count: 300, seed: 101, alpha: 0.6 });
  const www = rise(t, S.when(0, '万维网') - 0.6, 1.5);
  const lon = lerp(-105, -20, ease.inOut(inv(S.when(0, '1991') - 0.5, S.le(0) + 2, t))) - t * 2;
  const rot = [-lon, -lerp(32, 18, www), 0];
  const proj = drawGlobe(g, { cx: W / 2, cy: 520, r: 380, rot, ocean: ['#0a2040', '#030a18'], land: '#122a40', coast: 'rgba(120,200,255,0.35)', atmosphere: '#3a9aff', lights: 0.35 + 0.65 * www, lightColor: '#9fd8ff', night: 0.5 });
  const ap = rise(t, S.when(0, '阿帕网') - 0.3, 0.8);
  for (let i = 0; i < ARPA.length; i++) {
    for (let k = i + 1; k < ARPA.length; k++) {
      if ((i + k) % 2 && i + k !== 3) continue;
      globeRoute(g, proj, geoRoute([ARPA[i], ARPA[k]], 8), ap, '#ffd27a', 2.2, 1);
    }
    if (visible(rot, ARPA[i])) { const q = proj(ARPA[i]); glow(g, q[0], q[1], 24, '#ffd27a', ap); }
  }
  if (www > 0) {
    for (let i = 0; i < 60; i++) {
      const a = CITIES[i % CITIES.length], b = CITIES[(i * 7 + 3) % CITIES.length];
      if (a === b) continue;
      const st = S.when(0, '万维网') - 0.4 + hash(i) * 2.2;
      const p = ease.out(inv(st, st + 1.2, t));
      if (p <= 0) continue;
      const arc = geoRoute([a, b], 16);
      globeRoute(g, proj, arc, p, i % 3 ? '#6ad8ff' : '#b08aff', 1.6, 0.8);
    }
  }
  if (visible(rot, ARPA[0])) {
    const q = proj(ARPA[0]);
    callout(g, q[0], q[1], q[0] - 260, q[1] - 200, '1969 · 阿帕网', '最初只有4个节点', env(t, S.when(0, '阿帕网'), S.when(0, '1991'), 0.6, 0.5), { align: 'right' });
  }
  const wa = rise(t, S.when(0, '万维网') + 0.4, 0.8);
  text(g, '1991 · 万维网', W / 2, 1000 - 150, { size: 40, weight: 700, font: 'serif', color: '#ffffff', alpha: wa, shadow: 10 });
  text(g, '今天：全球超过55亿人在线', W / 2, 1000 - 100, { size: 26, font: 'sans', color: '#9fd8ff', alpha: wa, shadow: 10 });
}

const CHIPS = [[1971, 2300, 'Intel 4004'], [1978, 29000, '8086'], [1985, 275000, '80386'], [1989, 1.18e6, '80486'], [1993, 3.1e6, 'Pentium'], [2000, 4.2e7, 'Pentium 4'], [2006, 2.91e8, 'Core 2 Duo'], [2010, 1.17e9, ''], [2013, 1e9, ''], [2016, 1.53e10, 'GP100'], [2020, 5.42e10, 'A100'], [2022, 8e10, 'H100'], [2024, 2.08e11, 'Blackwell B200']];
const cnUnits = (n) => (n >= 1e8 ? `${fmt(n / 1e8, n >= 1e10 ? 0 : 1)}亿` : n >= 1e4 ? `${fmt(n / 1e4, 0)}万` : fmt(n));
function moore(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#04080e'], [1, '#08101c']]);
  const x0 = 300, x1 = 1600, y0 = 200, y1 = 780;
  const X = (yr) => lerp(x0, x1, (yr - 1970) / 56), Y = (n) => lerp(y1, y0, (Math.log10(n) - 3) / 9);
  const a = rise(t, S.ls(1) - 0.3, 0.6);
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1;
  for (let e = 3; e <= 12; e += 1) {
    const y = Y(10 ** e);
    g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    if (e % 3 === 0) text(g, ['千', '百万', '十亿', '万亿'][e / 3 - 1], x0 - 18, y, { size: 20, font: 'sans', color: '#8ea0c0', align: 'right' });
  }
  for (let yr = 1970; yr <= 2020; yr += 10) text(g, String(yr), X(yr), y1 + 32, { size: 20, font: 'inter', color: '#8ea0c0' });
  g.restore();
  text(g, '芯片上的晶体管数量', x0, y0 - 60, { size: 30, weight: 700, font: 'serif', color: '#ffffff', align: 'left', alpha: a });
  text(g, '（对数坐标：每格 ×10）', x0 + 290, y0 - 58, { size: 20, font: 'sans', color: '#8ea0c0', align: 'left', alpha: a });
  const p = ease.inOut(inv(S.ls(1) + 0.3, S.le(1) + 0.3, t));
  const upto = 1971 + 53 * p;
  const trend = [[X(1971), Y(2300)], [X(1971 + 53 * p), Y(2300 * Math.pow(2, (53 * p) / 2))]];
  g.save(); g.setLineDash([6, 8]); glowLine(g, trend, '#7f9cff', 1.5, a * 0.5); g.restore();
  let last = null;
  CHIPS.forEach(([yr, n, name]) => {
    if (yr > upto) return;
    const x = X(yr), y = Y(n);
    glow(g, x, y, 26, '#7fdcff', 0.8 * a);
    g.fillStyle = '#e8fbff';
    g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill();
    if (name && (yr === 1971 || yr === 1993 || yr === 2024)) text(g, `${name}`, x + 14, y + 26, { size: 20, font: 'inter', color: '#bfefff', align: 'left', alpha: a });
    last = [x, y, n];
  });
  const shown = 2300 * Math.pow(2, (53 * p) / 2.0);
  const val = Math.min(shown, 2.08e11);
  text(g, cnUnits(Math.round(val)), x1, 330, { size: 92, font: 'inter', weight: 800, color: '#ffffff', align: 'right', alpha: a, glow: 20, glowColor: 'rgba(120,200,255,0.6)' });
  text(g, '个晶体管', x1, 400, { size: 28, font: 'sans', color: '#9fd8ff', align: 'right', alpha: a });
}

function genomePhone(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#050a10'], [1, '#0a1220']]);
  const ga = rise(t, S.ls(2) - 0.4, 0.7);
  g.save();
  g.globalAlpha = ga;
  const cols = { A: '#7ae0a0', T: '#ff7a6a', C: '#7fc4ff', G: '#ffd27a' };
  for (let c = 0; c < 14; c++) {
    for (let r = 0; r < 18; r++) {
      const L = 'ATCG'[Math.floor(hash(c * 31 + r + Math.floor(t * 6 + c) * 97) * 4)];
      const y = ((r * 44 + t * (60 + c * 6)) % 800) + 120;
      text(g, L, 160 + c * 46, y, { size: 30, font: 'mono', weight: 700, color: cols[L], alpha: 0.15 + 0.45 * hash(c + r * 13) });
    }
  }
  g.restore();
  callout(g, 760, 480, 860, 600, '2003 · 人类基因组计划完成', '读出约30亿个碱基对', rise(t, S.when(2, '基因组') - 0.4, 0.6), { dot: false, size: 32, subSize: 24 });
  const pa = rise(t, S.when(2, '2007') - 0.4, 0.8);
  if (pa > 0) {
    const px = 1380, py = 470;
    g.save();
    g.globalAlpha = pa;
    g.translate(px, py + (1 - pa) * 40);
    roundRect(g, -150, -300, 300, 600, 44);
    g.fillStyle = '#0c0e14'; g.fill();
    g.strokeStyle = 'rgba(220,230,255,0.7)'; g.lineWidth = 3; g.stroke();
    roundRect(g, -134, -270, 268, 540, 30);
    const sg = g.createLinearGradient(0, -270, 0, 270);
    sg.addColorStop(0, '#2a3a8a'); sg.addColorStop(1, '#6a2a8a');
    g.fillStyle = sg; g.fill();
    const apps = ['message-circle', 'globe', 'phone', 'mail', 'tv', 'book-open', 'smartphone', 'users', 'sun', 'heart-pulse', 'graduation-cap', 'earth'];
    apps.forEach((ap, i) => {
      const x = -84 + (i % 3) * 84, y = -190 + Math.floor(i / 3) * 96;
      g.fillStyle = 'rgba(255,255,255,0.16)';
      roundRect(g, x - 30, y - 30, 60, 60, 16); g.fill();
      icon(g, ap, x, y, 36, '#ffffff', pa, { glowAmt: 0 });
    });
    g.restore();
    callout(g, px + 160, py - 200, px + 260, py - 330, '2007 · 智能手机', '把世界装进口袋', rise(t, S.when(2, '智能手机'), 0.6), { dot: false, align: 'right' });
  }
}

function ai(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#04050c'], [1, '#0a0a1a']]);
  const na = rise(t, S.ls(3) - 0.3, 0.8);
  const layers = [4, 7, 7, 5, 2], lx = (i) => 140 + i * 110, ly = (i, k) => 500 + (k - (layers[i] - 1) / 2) * 62;
  g.save();
  g.globalAlpha = na;
  for (let i = 0; i < layers.length - 1; i++) {
    for (let a = 0; a < layers[i]; a++) for (let b = 0; b < layers[i + 1]; b++) {
      const act = 0.5 + 0.5 * Math.sin(t * 3 - i * 1.2 + a * 0.7 + b);
      g.strokeStyle = rgba('#7f9cff', 0.08 + 0.25 * act);
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(lx(i), ly(i, a)); g.lineTo(lx(i + 1), ly(i + 1, b)); g.stroke();
    }
  }
  layers.forEach((n, i) => { for (let k = 0; k < n; k++) { const act = 0.5 + 0.5 * Math.sin(t * 3 - i * 1.2 + k); glow(g, lx(i), ly(i, k), 22, '#a8b8ff', 0.4 + 0.5 * act); g.fillStyle = '#e8eeff'; g.beginPath(); g.arc(lx(i), ly(i, k), 7, 0, TAU); g.fill(); } });
  g.restore();
  text(g, '深度神经网络', 360, 260, { size: 30, weight: 700, font: 'serif', color: '#dfe6ff', alpha: na });
  // Go board
  const goA = rise(t, S.when(3, 'AlphaGo') - 0.3, 0.7);
  if (goA > 0) {
    const bx = 960, by = 500, bs = 440, cell = bs / 18;
    g.save();
    g.globalAlpha = goA;
    g.fillStyle = '#d8a860'; roundRect(g, bx - bs / 2 - 26, by - bs / 2 - 26, bs + 52, bs + 52, 8); g.fill();
    g.strokeStyle = 'rgba(40,24,10,0.85)'; g.lineWidth = 1.2;
    for (let i = 0; i < 19; i++) {
      g.beginPath(); g.moveTo(bx - bs / 2, by - bs / 2 + i * cell); g.lineTo(bx + bs / 2, by - bs / 2 + i * cell); g.stroke();
      g.beginPath(); g.moveTo(bx - bs / 2 + i * cell, by - bs / 2); g.lineTo(bx - bs / 2 + i * cell, by + bs / 2); g.stroke();
    }
    const n = Math.floor(clamp((t - S.when(3, 'AlphaGo')) / 3) * 60);
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(hash(i * 3 + 1) * 19), cy = Math.floor(hash(i * 5 + 2) * 19);
      const x = bx - bs / 2 + cx * cell, y = by - bs / 2 + cy * cell;
      const sg = g.createRadialGradient(x - 3, y - 3, 1, x, y, cell * 0.48);
      if (i % 2) { sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#c8c8c8'); } else { sg.addColorStop(0, '#5a5a5a'); sg.addColorStop(1, '#0a0a0a'); }
      g.fillStyle = sg; g.beginPath(); g.arc(x, y, cell * 0.46, 0, TAU); g.fill();
    }
    g.restore();
    text(g, '2016 · AlphaGo 战胜李世石', bx, by + bs / 2 + 80, { size: 28, weight: 700, font: 'serif', color: '#ffffff', alpha: goA });
  }
  // protein ribbon
  const prA = rise(t, S.when(3, 'AlphaFold') - 0.3, 0.7);
  if (prA > 0) {
    const cx = 1580, cy = 500, rot = t * 0.8;
    const pts = [];
    for (let i = 0; i < 220; i++) {
      const u = i / 219;
      const helixPart = (Math.floor(u * 6) % 2) === 0;
      const base = [Math.sin(u * 9.4) * 120, (u - 0.5) * 420, Math.cos(u * 7.1) * 110];
      if (helixPart) { base[0] += Math.cos(u * 90) * 34; base[2] += Math.sin(u * 90) * 34; }
      const x = base[0] * Math.cos(rot) - base[2] * Math.sin(rot), z = base[0] * Math.sin(rot) + base[2] * Math.cos(rot);
      pts.push([cx + x, cy + base[1], z]);
    }
    for (let i = 1; i < pts.length; i++) {
      const z = (pts[i][2] + 160) / 320;
      g.strokeStyle = rgba(mix('#ff7ab0', '#7ae0ff', i / pts.length), prA * (0.35 + 0.65 * z));
      g.lineWidth = 3 + 7 * z;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
    text(g, '2020 · AlphaFold', cx, 860 - 60, { size: 28, weight: 700, font: 'serif', color: '#ffffff', alpha: prA });
    text(g, '预测蛋白质的三维结构', cx, 860 - 18, { size: 20, font: 'sans', color: '#d8c8ff', alpha: prA });
  }
}

function llm(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#06060e'], [1, '#0c0c1c']]);
  glow(g, W / 2, 480, 800, '#4a3aaa', 0.25);
  const a = rise(t, S.ls(4) - 0.5, 0.6);
  card(g, 460, 150, 1000, 640, { alpha: a, fill: 'rgba(16,18,34,0.9)', stroke: 'rgba(170,180,255,0.35)', r: 26 });
  text(g, '大语言模型', 520, 205, { size: 26, weight: 700, font: 'sans', color: '#c8ccff', alpha: a, align: 'left' });
  const q = '用一句话概括人类文明史。';
  const ans = '从一簇火种到满天星辰，人类用数百万年学会了协作、记录与创造——而最精彩的篇章，也许才刚刚开始。';
  const qa = rise(t, S.ls(4) - 0.2, 0.4);
  g.save(); g.globalAlpha = a * qa;
  g.fillStyle = 'rgba(90,110,255,0.85)'; roundRect(g, 1400 - 520, 260, 520, 70, 22); g.fill(); g.restore();
  text(g, q, 1400 - 260, 296, { size: 26, font: 'sans', color: '#ffffff', alpha: a * qa });
  const p = clamp(inv(S.ls(4) + 0.6, S.le(4) + 1.2, t));
  const chars = [...ans];
  const shown = chars.slice(0, Math.floor(chars.length * p)).join('');
  const lines = [];
  for (let i = 0; i < shown.length; i += 24) lines.push(shown.slice(i, i + 24));
  g.save(); g.globalAlpha = a * rise(t, S.ls(4) + 0.4, 0.4);
  g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, 520, 370, 780, 60 + 52 * Math.max(1, Math.ceil(chars.length / 24)), 22); g.fill(); g.restore();
  lines.forEach((ln, i) => text(g, ln, 552, 412 + i * 52, { size: 28, font: 'sans', color: '#eef0ff', alpha: a, align: 'left' }));
  if (p < 1 && Math.sin(t * 12) > 0) {
    const last = lines[lines.length - 1] || '';
    const w = measure(g, last, { size: 28, font: 'sans' });
    g.fillStyle = rgba('#c8ccff', a); g.fillRect(556 + w, 396 + (lines.length - 1) * 52, 3, 32);
  }
  [['message-circle', '对话'], ['feather', '写作'], ['code', '编程']].forEach(([ic, word], i) => {
    const ia = rise(t, S.when(4, word) - 0.1, 0.5);
    icon(g, ic, 700 + i * 260, 720, 54, '#bfc8ff', ia * a);
    text(g, word, 760 + i * 260, 722, { size: 26, font: 'serif', weight: 700, color: '#e8eaff', alpha: ia * a, align: 'left' });
  });
}

function info(g, S) {
  shots(g, S.t, [
    { draw: (c) => netGlobe(c, S) },
    { from: S.ls(1) - 0.5, fade: 0.8, draw: (c) => moore(c, S) },
    { from: S.ls(2) - 0.5, fade: 0.8, draw: (c) => genomePhone(c, S) },
    { from: S.ls(3) - 0.5, fade: 0.8, draw: (c) => ai(c, S) },
    { from: S.ls(4) - 0.6, fade: 0.8, draw: (c) => llm(c, S) },
  ]);
}

// ───────────────────────────── Today: two centuries of change ─────────────────────────────
const METRICS = [
  { name: '人均预期寿命', old: 29, now: 73, max: 80, unit: '岁', oldKey: '寿命约', nowKey: '平均寿命已', fmt: (v) => `${Math.round(v)}岁` },
  { name: '极端贫困人口比例', old: 76, now: 10, max: 100, unit: '%', oldKey: '四分之三', nowKey: '极端贫困', fmt: (v) => `约${Math.round(v)}%` },
  { name: '识字率', old: 12, now: 87, max: 100, unit: '%', oldKey: '识字', nowKey: '近九成', fmt: (v) => `约${Math.round(v)}%` },
  { name: '五岁前儿童死亡率', old: 43, now: 3.7, max: 100, unit: '%', oldKey: null, nowKey: null, fmt: (v) => `${v < 10 ? v.toFixed(1) : Math.round(v)}%` },
];
function todayGlobe(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#02030a'], [1, '#060a18']]);
  starfield(g, t, { count: 400, seed: 111, alpha: 0.7 });
  drawGlobe(g, { cx: W / 2, cy: 610, r: 330, rot: [-80 + t * 4, -20, 0], ocean: ['#081a30', '#02060e'], land: '#0e1a28', coast: 'rgba(120,170,220,0.25)', atmosphere: '#3a7aff', lights: 1, lightColor: '#ffd27a', night: 0.8 });
  const k = ease.out(inv(S.ls(0) + 0.3, S.le(0) + 0.2, t));
  const n = Math.round(lerp(1e9, 8.3e9, k) / 1e6) * 1e6;
  text(g, fmt(n), W / 2, 130, { size: 96, font: 'inter', weight: 800, color: '#ffffff', glow: 26, glowColor: 'rgba(255,200,100,0.55)', spacing: 2, alpha: rise(t, S.ls(0) - 0.2, 0.5) });
  text(g, '世界人口 · 2026', W / 2, 205, { size: 28, font: 'sans', color: '#ffe0a8', spacing: 6, alpha: rise(t, S.ls(0), 0.5) });
}
function compare(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#06080f'], [1, '#0b0f1a']]);
  const a = rise(t, S.ls(1) - 0.5, 0.6);
  const x0 = 640, x1 = 1700;
  text(g, '约200年前', x0, 150, { size: 26, font: 'sans', weight: 500, color: '#c8a070', alpha: a, align: 'left' });
  g.save(); g.globalAlpha = a; g.fillStyle = '#c8a070'; g.fillRect(x0 - 30, 140, 18, 18); g.fillStyle = '#7fdcff'; g.fillRect(x0 + 170, 140, 18, 18); g.restore();
  text(g, '今天', x0 + 200, 150, { size: 26, font: 'sans', weight: 500, color: '#7fdcff', alpha: a, align: 'left' });
  METRICS.forEach((m, i) => {
    const y = 270 + i * 160;
    const ra = rise(t, S.ls(1) - 0.3 + i * 0.15, 0.6);
    text(g, m.name, x0 - 50, y + 26, { size: 32, weight: 700, font: 'serif', color: '#ffffff', alpha: ra, align: 'right' });
    const ot = m.oldKey ? S.when(1, m.oldKey) : S.when(1, '识字') + 0.8;
    const nt = m.nowKey ? S.when(2, m.nowKey) : S.when(2, '近九成') + 1.0;
    const op = ease.out(inv(ot - 0.1, ot + 0.9, t)), np = ease.out(inv(nt - 0.1, nt + 1.1, t));
    const ow = (x1 - x0) * (m.old / m.max) * op, nw = (x1 - x0) * (m.now / m.max) * np;
    g.save();
    g.globalAlpha = ra;
    g.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(g, x0, y - 4, x1 - x0, 30, 6); g.fill(); roundRect(g, x0, y + 34, x1 - x0, 30, 6); g.fill();
    if (ow > 0) { g.fillStyle = '#b08a5a'; roundRect(g, x0, y - 4, Math.max(8, ow), 30, 6); g.fill(); }
    if (nw > 0) {
      const ng = g.createLinearGradient(x0, 0, x0 + nw, 0);
      ng.addColorStop(0, '#2a8ab8'); ng.addColorStop(1, '#7fdcff');
      g.fillStyle = ng; roundRect(g, x0, y + 34, Math.max(8, nw), 30, 6); g.fill();
      glow(g, x0 + nw, y + 49, 40, '#7fdcff', 0.6 * np);
    }
    g.restore();
    if (op > 0) text(g, m.fmt(m.old * Math.min(1, op * 1.2)), x0 + Math.max(8, ow) + 14, y + 12, { size: 24, font: 'inter', weight: 600, color: '#e8c89a', alpha: ra * clamp(op * 3), align: 'left' });
    if (np > 0) text(g, m.fmt(m.now * Math.min(1, np * 1.2)), x0 + Math.max(8, nw) + 14, y + 50, { size: 26, font: 'inter', weight: 800, color: '#dff8ff', alpha: ra * clamp(np * 3), align: 'left' });
  });
  const sa = rise(t, S.ls(2), 0.8);
  text(g, '数据：Our World in Data、联合国、世界银行（约1800—1820年 vs 最新值）', W / 2, 920, { size: 18, font: 'sans', color: '#7a8698', alpha: sa * env(t, 0, S.d, 0, 0.3) });
  const pulse = env(t, S.ls(3), S.d, 0.6, 0.4);
  if (pulse > 0) glow(g, 1300, 520, 700, '#3aa0ff', 0.12 * pulse * (0.8 + 0.2 * Math.sin(t * 3)));
}
function today(g, S) {
  shots(g, S.t, [
    { draw: (c) => todayGlobe(c, S) },
    { from: S.ls(1) - 0.6, fade: 0.9, draw: (c) => compare(c, S) },
  ]);
}

export const SCENES = { industry, century20: century, info, today };
