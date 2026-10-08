// Chapters 4-6: the Axial Age, inventions & exchange, voyages & the scientific revolution.
import {
  W, H, TAU, clamp, lerp, inv, ease, env, rise, hash, rng, fbm1, rgba, mix, canvas, glow, bgGradient,
  text, callout, starfield, partialPath, glowLine, roundRect, card, shots, strokePts,
} from '../core.js';
import { G, fp, camApply, camPoint, camFor, camLerp, drawFlatMap, geoRoute, drawGlobe, globeRoute, routePart, visible } from '../geo.js';
import { icon } from '../icons.js';
import { dust, texture } from './common.js';

const d3 = window.d3;

// ───────────────────────────── Chapter 4: the Axial Age ─────────────────────────────
const SAGES = [
  { region: '中国', lon: 116, lat: 35, names: ['孔子', '老子'], key: '中国', off: [[40, -80], [-120, -150]] },
  { region: '印度', lon: 84, lat: 26, names: ['释迦牟尼'], key: '印度', off: [[30, 110]] },
  { region: '希腊', lon: 23.7, lat: 38, names: ['苏格拉底', '柏拉图', '亚里士多德'], key: '希腊', off: [[-40, -150], [80, -230], [170, -120]] },
];
const SILK = [[108.9, 34.3], [103.8, 36.1], [94.7, 40.1], [87.6, 43.8], [76, 39.5], [67, 39.7], [61.8, 37.6], [51.4, 35.7], [44.6, 33.1], [36.2, 36.2], [28, 36], [20, 37], [15.5, 38.2], [12.5, 41.9]];

function axial(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#03040c'], [0.55, '#070a1c'], [1, '#0b0e1e']]);
  const burst = rise(t, S.when(0, '群星') - 0.3, 2.0);
  starfield(g, t, { count: 420, seed: 51, alpha: 0.75 });
  starfield(g, t, { count: 380, seed: 52, alpha: burst, bright: 1.4 });
  glow(g, W * 0.3, H * 0.25, 700, '#2a2a7a', 0.3);
  const cam = camFor(-22, 4, 136, 58, 0.98);
  const qDim = 1 - 0.75 * env(t, S.ls(2) - 0.3, S.ls(3) + 0.4, 0.8, 0.9);
  const mapA = rise(t, 0.5, 2.0) * qDim;
  drawFlatMap(g, cam, { land: rgba('#1a2036', 0.9), coast: 'rgba(170,190,255,0.32)', ocean: null, grat: 'rgba(160,180,255,0.05)', alpha: mapA });
  // constellations of thinkers
  SAGES.forEach((sg, si) => {
    const at = S.when(1, sg.key);
    const a = rise(t, at - 0.1, 0.8) * qDim;
    if (a <= 0) return;
    const p = camPoint(cam, fp(sg.lon, sg.lat));
    glow(g, p[0], p[1], 120, '#9fb8ff', a * 0.7);
    g.fillStyle = rgba('#ffffff', a);
    g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill();
    text(g, sg.region, p[0], p[1] + 34, { size: 24, font: 'sans', color: '#aebcf0', alpha: a * 0.9, spacing: 4, shadow: 6 });
    const stars = sg.names.map((n, k) => [p[0] + sg.off[k][0], p[1] + sg.off[k][1]]);
    stars.forEach((q, k) => {
      const nk = rise(t, at + 0.35 + k * 0.45, 0.6) * qDim;
      if (nk <= 0) return;
      const prev = k === 0 ? p : stars[k - 1];
      g.strokeStyle = rgba('#c8d6ff', 0.45 * nk);
      g.lineWidth = 1.2;
      g.setLineDash([2, 6]);
      g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(lerp(prev[0], q[0], nk), lerp(prev[1], q[1], nk)); g.stroke();
      g.setLineDash([]);
      glow(g, q[0], q[1], 46, '#ffe6b8', nk * (0.8 + 0.2 * Math.sin(t * 3 + k)));
      g.fillStyle = rgba('#fff6e0', nk);
      g.beginPath(); g.arc(q[0], q[1], 3.5, 0, TAU); g.fill();
      text(g, sg.names[k], q[0], q[1] - 30, { size: 34, weight: 700, font: 'serif', color: '#fff4dc', alpha: nk, glow: 14, glowColor: 'rgba(255,210,140,0.5)' });
    });
  });
  // the questions
  const q1 = env(t, S.when(2, '人应当') - 0.2, S.ls(3) + 0.3, 0.8, 0.8);
  const q2 = env(t, S.when(2, '世界的') - 0.2, S.ls(3) + 0.3, 0.8, 0.8);
  text(g, '人应当如何生活？', W / 2, 400, { size: 76, weight: 700, font: 'serif', color: '#fff3dd', alpha: q1, glow: 26, glowColor: 'rgba(255,200,120,0.45)', spacing: 8 });
  text(g, '世界的本原是什么？', W / 2, 560, { size: 76, weight: 700, font: 'serif', color: '#e6efff', alpha: q2, glow: 26, glowColor: 'rgba(140,180,255,0.45)', spacing: 8 });
  // Qin, Rome, Silk Road
  const qin = rise(t, S.when(3, '秦朝') - 0.1, 0.7), rome = rise(t, S.when(3, '罗马') - 0.1, 0.7);
  if (qin > 0) {
    const p = camPoint(cam, fp(108.9, 34.3));
    glow(g, p[0], p[1], 90, '#ff7a5a', qin);
    callout(g, p[0], p[1], p[0] + 90, p[1] + 150, '秦 · 公元前221年', '统一中国', qin * env(t, 0, S.d, 0, 0.3), { color: '#ffc2a8' });
  }
  if (rome > 0) {
    const p = camPoint(cam, fp(12.5, 41.9));
    glow(g, p[0], p[1], 90, '#ff7a5a', rome);
    callout(g, p[0], p[1], p[0] + 40, p[1] + 190, '罗马', '称雄地中海', rome, { color: '#ffc2a8', align: 'left' });
  }
  const sp = ease.inOut(inv(S.when(3, '丝绸之路') - 0.2, S.le(3) + 0.4, t));
  if (sp > 0) {
    const pts = geoRoute(SILK, 10).map(([lo, la]) => camPoint(cam, fp(lo, la)));
    const part = partialPath(pts, sp);
    glowLine(g, part.pts, '#ffcf6a', 3.2, 1);
    glow(g, part.head[0], part.head[1], 40, '#fff0b8', 0.9);
    // caravans
    if (sp >= 1) {
      for (let k = 0; k < 7; k++) {
        const u = ((t * 0.07 + k / 7) % 1);
        const q = partialPath(pts, u).head;
        glow(g, q[0], q[1], 16, '#ffe6a0', 0.9);
      }
    }
    const mid = camPoint(cam, fp(70, 41));
    text(g, '丝绸之路', mid[0], mid[1] - 46, { size: 36, weight: 700, font: 'serif', color: '#ffe2a0', alpha: clamp(sp * 2 - 0.6), spacing: 10, shadow: 10 });
    [['长安', 108.9, 34.3, 0, 40], ['撒马尔罕', 67, 39.7, 0, 40]].forEach(([n, lo, la, dx, dy]) => {
      const q = camPoint(cam, fp(lo, la));
      text(g, n, q[0] + dx, q[1] + dy, { size: 24, font: 'sans', weight: 500, color: '#ffe9c0', alpha: clamp(sp * 2), shadow: 8 });
    });
  }
}

// ───────────────────────────── Chapter 5: inventions & exchange ─────────────────────────────
function paperArt(g, t, a) {
  for (let k = 0; k < 4; k++) {
    g.save();
    g.rotate(-0.12 + k * 0.07 + (k === 3 ? 0.04 * Math.sin(t * 1.5) : 0));
    g.translate(k * 4, -k * 10 - (k === 3 ? 8 * Math.sin(t * 1.5) : 0));
    g.fillStyle = rgba(mix('#d9c8a0', '#fff6e2', k / 3), a);
    g.fillRect(-80, -100, 160, 200);
    g.strokeStyle = rgba('#7a6440', 0.25 * a);
    g.lineWidth = 1;
    g.strokeRect(-80, -100, 160, 200);
    if (k === 3) {
      g.strokeStyle = rgba('#3a2a18', 0.45 * a);
      for (let c = 0; c < 6; c++) { g.beginPath(); g.moveTo(52 - c * 22, -78); g.lineTo(52 - c * 22, 70 - (c % 2) * 30); g.stroke(); }
    }
    g.restore();
  }
}
function typeArt(g, t, a) {
  const chars = '文明之光传承万代';
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3), c = i % 3;
    const lift = i === 4 ? 10 * Math.max(0, Math.sin(t * 2)) : 0;
    g.save();
    g.translate(-66 + c * 66, -66 + r * 66 - lift);
    g.fillStyle = rgba('#6a4a2a', a);
    roundRect(g, -28, -28, 56, 56, 6); g.fill();
    g.fillStyle = rgba('#8a6438', a);
    roundRect(g, -24, -24, 48, 48, 5); g.fill();
    g.scale(-1, 1);
    text(g, chars[i % chars.length], 0, 2, { size: 34, weight: 900, font: 'serif', color: rgba('#2a1a0c', a) });
    g.restore();
  }
}
function compassArt(g, t, a) {
  g.fillStyle = rgba('#3a2a1a', a);
  roundRect(g, -100, -100, 200, 200, 10); g.fill();
  g.strokeStyle = rgba('#d8b878', 0.8 * a); g.lineWidth = 2;
  roundRect(g, -88, -88, 176, 176, 8); g.stroke();
  g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.stroke();
  g.beginPath(); g.arc(0, 0, 42, 0, TAU); g.stroke();
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * TAU;
    g.beginPath(); g.moveTo(Math.cos(ang) * 70, Math.sin(ang) * 70); g.lineTo(Math.cos(ang) * 80, Math.sin(ang) * 80); g.stroke();
  }
  const ang = Math.PI / 2 + 0.6 * Math.exp(-t * 0.8) * Math.sin(t * 3.2);
  g.save();
  g.rotate(ang);
  const sg = g.createLinearGradient(-30, 0, 70, 0);
  sg.addColorStop(0, rgba('#f2e2b8', a)); sg.addColorStop(1, rgba('#a88a58', a));
  g.fillStyle = sg;
  g.beginPath(); g.ellipse(-12, 0, 30, 22, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(10, -6); g.lineTo(78, -2); g.lineTo(78, 2); g.lineTo(10, 6); g.closePath(); g.fill();
  g.restore();
}
function fireworkArt(g, t, a) {
  for (let b = 0; b < 3; b++) {
    const period = 1.8, ph = (t + b * 0.6) % period, k = ph / period;
    const cx = [-50, 40, 0][b], cy = [-30, -60, 20][b];
    const col = ['#ffb347', '#ff6a5a', '#ffe08a'][b];
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * TAU, r = 90 * ease.out(k);
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r + 30 * k * k;
      const al = a * (1 - k);
      g.fillStyle = rgba(col, al);
      g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
      if (i % 3 === 0) glow(g, x, y, 14, col, al * 0.6);
    }
  }
}
const INVENTIONS = [
  { name: '造纸术', sub: '东汉 · 蔡伦改进', key: '造纸术', art: paperArt },
  { name: '印刷术', sub: '唐代雕版 · 北宋活字', key: '印刷术', art: typeArt },
  { name: '指南针', sub: '宋代用于航海', key: '指南针', art: compassArt },
  { name: '火药', sub: '唐代炼丹家发现', key: '火药', art: fireworkArt },
];
function inventions(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#120806'], [0.6, '#1e0e0a'], [1, '#0c0605']]);
  glow(g, W / 2, H * 0.48, 1000, '#8a2a1a', 0.3);
  dust(g, t, { count: 60, color: '#ffcf9a', alpha: 0.3, seed: 61 });
  INVENTIONS.forEach((iv, i) => {
    const x = 375 + i * 390, y = 500;
    const at = S.when(0, iv.key) - 0.1;
    const k = ease.outBack(inv(at, at + 0.7, t));
    const a = clamp(inv(at, at + 0.4, t));
    const frame = rise(t, S.ls(0) - 0.2 + i * 0.2, 0.7);
    card(g, x - 165, y - 230, 330, 440, { alpha: frame * (1 - a) * 0.8, fill: 'rgba(40,18,12,0.35)', stroke: 'rgba(255,200,150,0.18)' });
    if (a <= 0) return;
    g.save();
    g.translate(x, y + (1 - k) * 40);
    card(g, -165, -230, 330, 440, { alpha: a, fill: 'rgba(40,18,12,0.55)', stroke: 'rgba(255,200,150,0.25)' });
    g.translate(0, -50);
    iv.art(g, t - at, a);
    g.restore();
    text(g, iv.name, x, y + 120 + (1 - k) * 40, { size: 40, weight: 700, font: 'serif', color: '#fff0dc', alpha: a, shadow: 8, spacing: 4 });
    text(g, iv.sub, x, y + 168 + (1 - k) * 40, { size: 22, font: 'sans', color: '#e8b890', alpha: a, spacing: 1 });
  });
}

const SEA_SILK = [[118.6, 24.9], [113.3, 21.5], [109, 12], [104.5, 1.6], [98, 5], [88, 6], [80.2, 5.6], [75.8, 11.25], [66, 19], [57, 24], [56.3, 26.5], [52, 23], [45, 12.5], [39, 20], [34, 27], [32.5, 30], [29.9, 31.2], [22, 34.5], [16, 37.5], [12.3, 43]];
function silkMap(g, S) {
  const { t } = S;
  g.fillStyle = '#070708';
  g.fillRect(0, 0, W, H);
  const cam = camFor(-16, -8, 136, 55, 0.98);
  drawFlatMap(g, cam, { land: '#231a14', coast: 'rgba(255,200,140,0.35)', ocean: '#08090c', grat: 'rgba(255,255,255,0.03)' });
  const p = ease.inOut(inv(S.when(0, '并经由') - 0.3, S.le(0) + 0.2, t));
  const land = geoRoute(SILK, 10).map(([lo, la]) => camPoint(cam, fp(lo, la)));
  const sea = geoRoute(SEA_SILK, 10).map(([lo, la]) => camPoint(cam, fp(lo, la)));
  const lp = partialPath(land, p), sp = partialPath(sea, p);
  glowLine(g, lp.pts, '#ffcf6a', 3, 1);
  glowLine(g, sp.pts, '#6ad8ff', 3, 1);
  ['scroll', 'printer', 'compass', 'sparkles'].forEach((n, i) => {
    const u = clamp(p * 1.15 - i * 0.05);
    const q = partialPath(i % 2 ? sea : land, u).head;
    icon(g, n, q[0], q[1] - 34, 40, i % 2 ? '#bfefff' : '#ffe7b0', clamp(p * 4));
  });
  const la = clamp(p * 3 - 0.3);
  const q1 = camPoint(cam, fp(80, 44)), q2 = camPoint(cam, fp(70, -2));
  text(g, '陆上丝绸之路', q1[0], q1[1] - 40, { size: 32, weight: 700, font: 'serif', color: '#ffe2a0', alpha: la, shadow: 10, spacing: 4 });
  text(g, '海上丝绸之路', q2[0], q2[1] - 10, { size: 32, weight: 700, font: 'serif', color: '#bfefff', alpha: la, shadow: 10, spacing: 4 });
}

let starTile = null;
function islamicPattern() {
  if (starTile) return starTile;
  const s = 160, c = canvas(s, s), g = c.getContext('2d');
  g.strokeStyle = 'rgba(214,176,96,0.55)';
  g.lineWidth = 2;
  const star = (cx, cy, r) => {
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * TAU + Math.PI / 8, rr = i % 2 ? r * 0.72 : r;
      const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.stroke();
  };
  [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]].forEach(([x, y]) => star(x, y, 56));
  g.strokeStyle = 'rgba(214,176,96,0.25)';
  g.strokeRect(s / 2 - 28, s / 2 - 28, 56, 56);
  g.save(); g.translate(s / 2, s / 2); g.rotate(Math.PI / 4); g.strokeRect(-28, -28, 56, 56); g.restore();
  starTile = c;
  return c;
}

const DIGITS = [
  { label: '印度', chars: ['१', '२', '३', '४', '५', '६', '७', '८', '९', '०'], font: '"Noto Sans Devanagari"', key: '印度' },
  { label: '阿拉伯世界', chars: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '٠'], font: '"Noto Naskh Arabic"', key: '阿拉伯' },
  { label: '欧洲', chars: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], font: '"Cinzel"', key: '欧洲' },
];
const TRANSLATIONS = [['ΓΕΩΜΕΤΡΙΑ', 'هندسة', '几何'], ['ΑΣΤΡΟΝΟΜΙΑ', 'علم الفلك', '天文'], ['ΙΑΤΡΙΚΗ', 'طب', '医学']];

function wisdom(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#060b1e'], [0.5, '#0b1530'], [1, '#050814']]);
  g.save();
  g.globalAlpha = 0.5;
  g.fillStyle = g.createPattern(islamicPattern(), 'repeat');
  g.translate(-((t * 6) % 160), 0);
  g.fillRect(0, 0, W + 160, H);
  g.restore();
  const vg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 1000);
  vg.addColorStop(0, 'rgba(6,11,30,0.2)'); vg.addColorStop(1, 'rgba(6,11,30,0.92)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // arch
  const aa = rise(t, S.ls(1) - 0.4, 1.0);
  g.save();
  g.globalAlpha = aa;
  g.strokeStyle = 'rgba(232,196,120,0.75)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W / 2 - 330, 900); g.lineTo(W / 2 - 330, 420);
  g.quadraticCurveTo(W / 2 - 330, 200, W / 2, 130); g.quadraticCurveTo(W / 2 + 330, 200, W / 2 + 330, 420); g.lineTo(W / 2 + 330, 900);
  g.stroke();
  g.restore();
  glow(g, W / 2, 480, 600, '#d8a850', 0.18 * aa);
  const translating = env(t, S.ls(1) + 0.2, S.when(1, '源自印度') + 0.2, 0.6, 0.6);
  text(g, '巴格达 · 智慧宫', W / 2, 250, { size: 44, weight: 700, font: 'serif', color: '#ffe9b8', alpha: aa * translating, spacing: 8, glow: 16, glowColor: 'rgba(255,200,110,0.5)' });
  text(g, '约公元9世纪', W / 2, 305, { size: 24, font: 'sans', color: '#d8c08a', alpha: aa * translating, spacing: 4 });
  TRANSLATIONS.forEach(([gr, ar, zh], i) => {
    const at = S.when(1, '翻译') + i * 0.5;
    const m = ease.inOut(inv(at + 0.6, at + 1.8, t));
    const a = rise(t, at, 0.6) * translating;
    const y = 420 + i * 120;
    text(g, gr, W / 2 - 165, y, { size: 34, font: 'cinzel', weight: 700, color: '#cfe0ff', alpha: a * (1 - m * 0.65), spacing: 3 });
    g.save();
    g.globalAlpha = a * m;
    g.strokeStyle = 'rgba(232,196,120,0.6)';
    g.beginPath(); g.moveTo(W / 2 - 30, y); g.lineTo(W / 2 + 20, y); g.stroke();
    g.restore();
    text(g, ar, W / 2 + 110, y - 4, { size: 44, font: '"Noto Naskh Arabic"', color: '#ffe0a0', alpha: a * m });
    text(g, zh, W / 2 + 205, y, { size: 22, font: 'sans', color: '#bba070', alpha: a * m, align: 'left' });
  });
  // numerals travelling from India through the Arab world to Europe
  const nA = rise(t, S.when(1, '源自印度') - 0.3, 0.8);
  if (nA > 0) {
    DIGITS.forEach((row, r) => {
      const at = r === 0 ? S.when(1, '源自印度') : r === 1 ? S.when(1, '阿拉伯') : S.when(1, '欧洲');
      const a = rise(t, at - 0.2, 0.7) * nA;
      const y = 420 + r * 150;
      text(g, row.label, W / 2 - 560, y, { size: 26, font: 'serif', weight: 700, color: '#e8d4a8', alpha: a, align: 'right' });
      row.chars.forEach((ch, i) => {
        const x = W / 2 - 470 + i * 104;
        const zero = i === 9;
        const ca = clamp(a * 1.5 - i * 0.05);
        if (zero) glow(g, x, y, 70, '#ffcf6a', ca * (0.6 + 0.2 * Math.sin(t * 4)));
        text(g, ch, x, y + (r === 1 ? -6 : 0), { size: zero ? 64 : 56, font: row.font, color: zero ? '#ffe7a8' : '#f4ead6', alpha: ca });
      });
      if (r > 0) {
        g.save();
        g.globalAlpha = a * 0.6;
        g.strokeStyle = '#e8c478';
        g.beginPath(); g.moveTo(W / 2 - 600, y - 115); g.lineTo(W / 2 - 600, y - 45); g.stroke();
        g.restore();
      }
    });
    text(g, '“零”', W / 2 + 470 + 70, 420 + 150, { size: 30, font: 'serif', weight: 700, color: '#ffd27a', alpha: rise(t, S.when(1, '零') - 0.1, 0.6) * nA, align: 'left' });
  }
}

function press(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#0e0a08'], [0.6, '#17110c'], [1, '#0a0705']]);
  glow(g, 520, 520, 700, '#a8743a', 0.28);
  const ap = rise(t, S.ls(2) - 0.6, 0.8);
  const press = 0.5 - 0.5 * Math.cos(Math.max(0, t - S.when(2, '古腾堡')) * 2.4);
  const pages = Math.max(0, t - S.when(2, '古腾堡') - 1.0);
  g.save();
  g.globalAlpha = ap;
  g.translate(500, 520);
  g.fillStyle = '#4a321e';
  g.fillRect(-190, -330, 40, 640); g.fillRect(150, -330, 40, 640);
  g.fillRect(-210, -350, 420, 50); g.fillRect(-210, 250, 420, 40);
  g.fillStyle = '#6a4a2c';
  g.fillRect(-190, 120, 380, 30);
  g.strokeStyle = '#c8a070'; g.lineWidth = 6;
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-14, -300 + i * 22); g.lineTo(14, -290 + i * 22); g.stroke(); }
  const hl = 150 * Math.cos(press * 2.4); g.fillStyle = '#7a5434'; g.fillRect(-Math.abs(hl) - 8, -183, Math.abs(hl) * 2 + 16, 16); g.fillStyle = '#a07a50'; g.beginPath(); g.arc(hl, -175, 12, 0, TAU); g.fill();
  g.fillStyle = '#8a6a44';
  g.fillRect(-140, -150 + press * 200, 280, 26);
  g.fillStyle = '#f2e6cc';
  g.fillRect(-120, 92, 240, 26);
  g.restore();
  // pages multiplying
  const n = Math.min(160, Math.floor(Math.pow(2, pages * 2.2)));
  for (let i = 0; i < n; i++) {
    const born = Math.log2(i + 1) / 2.2;
    const age = pages - born;
    const k = ease.out(clamp(age / 1.1));
    const col = i % 16, row = Math.floor(i / 16);
    const tx = 860 + col * 62, ty = 230 + row * 58;
    const x = lerp(560, tx, k), y = lerp(600, ty, k);
    g.save();
    g.translate(x, y);
    g.rotate((1 - k) * (hash(i) - 0.5) * 2);
    g.fillStyle = '#f2e6cc';
    g.fillRect(-20, -26, 40, 52);
    g.fillStyle = 'rgba(60,40,20,0.55)';
    for (let l = 0; l < 6; l++) g.fillRect(-14, -18 + l * 7, 28, 2);
    g.fillStyle = 'rgba(160,30,20,0.8)';
    g.fillRect(-14, -18, 6, 8);
    g.restore();
  }
  callout(g, 640, 300, 760, 170, '约1450年 · 古腾堡印刷机', '书籍从此变得廉价', env(t, S.when(2, '古腾堡') + 0.4, S.d, 0.6, 0.3));
}

const EU_CITIES = [[8.27, 50.0], [6.96, 50.94], [7.59, 47.56], [12.34, 45.44], [12.5, 41.9], [2.35, 48.86], [-0.13, 51.5], [4.9, 52.37], [11.58, 48.14], [13.4, 52.52], [14.42, 50.08], [16.37, 48.21], [19.04, 47.5], [9.19, 45.46], [11.25, 43.77], [-3.7, 40.42], [-9.14, 38.72], [2.17, 41.39], [4.83, 45.76], [10, 53.55], [18.07, 59.33], [12.57, 55.68], [21.0, 52.23], [30.5, 50.45], [23.7, 37.98], [-6.26, 53.35], [-1.55, 47.22], [3.06, 50.63], [10.4, 63.43], [24.94, 60.17], [17.1, 48.15], [15.98, 45.81], [8.54, 47.37], [-5.98, 37.39], [14.27, 40.85]];
function europeSpread(g, S) {
  const { t } = S;
  g.fillStyle = '#080706'; g.fillRect(0, 0, W, H);
  const cam = camFor(-12, 34, 34, 62, 0.95);
  drawFlatMap(g, cam, { land: '#2a2018', coast: 'rgba(255,210,150,0.35)', ocean: '#0a0a0c', grat: null });
  const t0 = S.when(2, '知识') - 0.4;
  EU_CITIES.forEach(([lo, la], i) => {
    const d = Math.hypot(lo - 8.27, la - 50.0);
    const at = t0 + d * 0.07 + hash(i) * 0.3;
    const a = rise(t, at, 0.4);
    if (a <= 0) return;
    const p = camPoint(cam, fp(lo, la));
    glow(g, p[0], p[1], 40 + 30 * (1 - a), '#ffcf6a', a * 0.9);
    g.fillStyle = rgba('#fff2c8', a);
    g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill();
    if (i > 0) {
      const src = camPoint(cam, fp(8.27, 50.0));
      g.strokeStyle = rgba('#ffcf6a', 0.25 * a * (1 - clamp((t - at - 0.6) / 1.2)));
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(src[0], src[1]); g.lineTo(p[0], p[1]); g.stroke();
    }
  });
  const m = camPoint(cam, fp(8.27, 50.0));
  callout(g, m[0], m[1], m[0] + 140, m[1] - 170, '美因茨', '印刷术从这里传遍欧洲', rise(t, t0 + 0.2, 0.6));
}

function exchange(g, S) {
  shots(g, S.t, [
    { draw: (c) => inventions(c, S) },
    { from: S.when(0, '并经由') - 0.5, fade: 0.8, draw: (c) => silkMap(c, S) },
    { from: S.ls(1) - 0.5, fade: 0.9, draw: (c) => wisdom(c, S) },
    { from: S.ls(2) - 0.6, fade: 0.9, draw: (c) => press(c, S) },
    { from: S.when(2, '知识') - 0.8, fade: 0.9, draw: (c) => europeSpread(c, S) },
  ]);
}

// ───────────────────────────── Chapter 6: voyages & the scientific revolution ─────────────────────────────
const ZHENG = [[121.1, 31.5], [122, 26], [116, 21], [109.2, 13.8], [106, 7], [104.3, 1.4], [102.25, 2.2], [98, 5], [90, 6.5], [81, 5.8], [77, 8], [75.8, 11.25], [68, 18], [60, 22.5], [56.3, 26.6], [57, 22], [52, 16], [45, 12.5], [48, 7], [44, 0.5], [40.1, -3.2]];
const COLUMBUS = [[-6.9, 37.2], [-12, 32], [-15.4, 28.1], [-30, 27], [-50, 26], [-65, 25], [-74.5, 24.1]];
const MAGELLAN = [[-6.35, 36.8], [-15, 28], [-22, 12], [-30, 0], [-36, -10], [-43.2, -22.9], [-55, -34], [-66, -47], [-70.9, -53.5], [-76, -50], [-80, -35], [-90, -22], [-110, -12], [-135, -4], [-160, 4], [175, 11], [160, 13.5], [144.8, 13.4], [133, 11.5], [123.9, 10.3], [125.5, 5], [127.4, 0.8], [125, -6], [124, -9.5], [112, -18], [90, -28], [60, -36], [35, -36], [18.5, -34.6], [10, -22], [-3, -5], [-15, 5], [-23.5, 15], [-20, 27], [-10, 34], [-6.35, 36.8]];
let magDense = null, magUnwrap = null;

function voyagesGlobe(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#03060f'], [0.6, '#06102a'], [1, '#040812']]);
  starfield(g, t, { count: 380, seed: 71, alpha: 0.7, drift: 1.5 });
  const zt = [S.when(0, '郑和') - 0.1, S.when(0, '七下西洋') + 1.2];
  const ct = [S.when(0, '哥伦布') - 0.2, S.when(0, '大西洋') + 1.0];
  const mt = [S.when(0, '麦哲伦') - 0.2, S.ls(1) + 2.6];
  if (!magDense) {
    magDense = geoRoute(MAGELLAN, 14);
    magUnwrap = [];
    let prev = magDense[0][0], acc = prev;
    for (const [lo] of magDense) {
      let d = lo - prev;
      if (d > 180) d -= 360; else if (d < -180) d += 360;
      acc += d; prev = lo; magUnwrap.push(acc);
    }
  }
  const zp = ease.inOut(inv(zt[0], zt[1], t)), cp = ease.inOut(inv(ct[0], ct[1], t)), mp = ease.inOut(inv(mt[0], mt[1], t));
  // camera longitude/latitude
  let lon = lerp(112, 78, ease.inOut(inv(zt[0], zt[1], t))), lat = 12;
  const toAtl = ease.inOut(inv(zt[1] - 0.3, ct[0] + 0.6, t));
  lon = lerp(lon, -38, toAtl); lat = lerp(lat, 22, toAtl);
  const toMag = ease.inOut(inv(ct[1] - 0.2, mt[0] + 0.6, t));
  lon = lerp(lon, -20, toMag); lat = lerp(lat, 5, toMag);
  if (mp > 0) {
    const idx = Math.min(magDense.length - 1, Math.floor(routePart(magDense, mp).length - 1));
    const follow = magUnwrap[idx] + 12;
    const k = clamp(inv(mt[0], mt[0] + 1.5, t));
    lon = lerp(lon, follow, k);
    lat = lerp(lat, clamp(magDense[idx][1] * 0.5, -25, 25), k * 0.6);
  }
  const rot = [-lon, -lat * 0.6, 0];
  const R = 400;
  const cx = W / 2 + 120, cy = 520;
  const proj = drawGlobe(g, {
    cx, cy, r: R, rot, ocean: ['#16406a', '#061428'], land: '#c9b083', coast: 'rgba(90,60,30,0.55)',
    grat: 'rgba(230,200,140,0.14)', atmosphere: '#7ab8ff', detail: 50,
  });
  const routes = [[ZHENG, zp, '#ffcf5a'], [COLUMBUS, cp, '#ff7a6a'], [null, mp, '#6af0ff']];
  routes.forEach(([pts, p, col], i) => {
    if (p <= 0) return;
    const dense = i === 2 ? magDense : geoRoute(pts, 12);
    const head = globeRoute(g, proj, dense, p, col, 3, 1);
    if (head && visible(rot, head)) {
      const q = proj(head);
      icon(g, 'sailboat', q[0], q[1] - 26, 38, col, 1, { glowAmt: 1 });
    }
  });
  // legend
  const items = [['郑和下西洋', '1405—1433', '#ffcf5a', zt[0]], ['哥伦布横渡大西洋', '1492', '#ff7a6a', ct[0]], ['麦哲伦船队环球航行', '1519—1522', '#6af0ff', mt[0]]];
  items.forEach(([n, y, col, at], i) => {
    const a = rise(t, at, 0.6);
    if (a <= 0) return;
    const yy = 380 + i * 110;
    g.save();
    g.globalAlpha = a;
    g.fillStyle = col;
    g.fillRect(150, yy - 26, 5, 56);
    g.restore();
    text(g, n, 175, yy - 8, { size: 32, weight: 700, font: 'serif', color: '#ffffff', alpha: a, align: 'left', shadow: 8 });
    text(g, y, 175, yy + 30, { size: 24, font: 'inter', weight: 400, color: col, alpha: a, align: 'left', spacing: 1 });
  });
  const wa = rise(t, S.ls(1), 0.8);
  text(g, '世界第一次连成一个整体', cx, 970 - 90, { size: 34, weight: 700, font: 'serif', color: '#e8f4ff', alpha: wa * env(t, 0, S.ls(2), 0, 0.6), spacing: 6, shadow: 10 });
}

const PLANETS = [
  { r: 120, s: 9, col: '#b8b0a0', p: 0.24 }, { r: 170, s: 13, col: '#e8c890', p: 0.62 },
  { r: 230, s: 14, col: '#4a90e8', p: 1.0, earth: true }, { r: 290, s: 10, col: '#d86a4a', p: 1.88 },
  { r: 420, s: 30, col: '#d8b088', p: 11.86, jup: true }, { r: 560, s: 24, col: '#e8d098', p: 29.4, sat: true },
];
function solar(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#02030a'], [1, '#060a18']]);
  starfield(g, t, { count: 500, seed: 81, alpha: 0.8, drift: 0.8 });
  const cx = W / 2, cy = 560, tilt = 0.38;
  const zoom = lerp(1.0, 0.86, ease.inOut(inv(S.ls(3), S.d, t)));
  const helio = rise(t, S.when(2, '日心说') - 0.3, 1.2);
  const tt = t * 0.9;
  g.save();
  g.translate(cx, cy);
  g.scale(zoom, zoom);
  PLANETS.forEach((pl) => {
    g.strokeStyle = pl.earth ? rgba('#7ab8ff', 0.35 + 0.4 * helio) : 'rgba(200,210,255,0.16)';
    g.lineWidth = pl.earth ? 2 : 1.2;
    g.beginPath(); g.ellipse(0, 0, pl.r, pl.r * tilt, 0, 0, TAU); g.stroke();
  });
  glow(g, 0, 0, 260, '#ffb040', 0.7);
  glow(g, 0, 0, 90, '#fff2c0', 1);
  g.fillStyle = '#fff6d8';
  g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill();
  const pos = [];
  PLANETS.forEach((pl, i) => {
    const ang = tt * (0.9 / Math.pow(pl.p, 0.62)) + i * 1.7;
    const x = Math.cos(ang) * pl.r, y = Math.sin(ang) * pl.r * tilt;
    pos.push([x, y]);
    const pg = g.createRadialGradient(x - pl.s * 0.4, y - pl.s * 0.4, 1, x, y, pl.s);
    pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.25, pl.col); pg.addColorStop(1, rgba(mix(pl.col, '#000000', 0.6)));
    if (pl.sat) {
      g.strokeStyle = 'rgba(232,208,152,0.7)'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, y, pl.s * 2.1, pl.s * 0.7, -0.3, 0, TAU); g.stroke();
    }
    g.fillStyle = pg;
    g.beginPath(); g.arc(x, y, pl.s, 0, TAU); g.fill();
    if (pl.earth) {
      glow(g, x, y, 50, '#4aa0ff', 0.5 * helio);
      const ma = tt * 3.2;
      g.fillStyle = '#d8d8d8';
      g.beginPath(); g.arc(x + Math.cos(ma) * 30, y + Math.sin(ma) * 30 * tilt * 1.6, 4, 0, TAU); g.fill();
    }
    if (pl.jup) {
      for (let k = 0; k < 4; k++) {
        const a2 = tt * (3.4 / (k + 1)) + k;
        g.fillStyle = '#f0f0f0';
        g.beginPath(); g.arc(x + Math.cos(a2) * (44 + k * 14), y + Math.sin(a2) * (44 + k * 14) * 0.3, 2.6, 0, TAU); g.fill();
      }
    }
  });
  g.restore();
  const ep = [cx + pos[2][0] * zoom, cy + pos[2][1] * zoom];
  callout(g, ep[0], ep[1], ep[0] + (ep[0] > cx ? 130 : -130), ep[1] - 150, '1543 · 哥白尼', '日心说：地球绕太阳运行', env(t, S.when(2, '哥白尼') + 0.2, S.when(2, '伽利略') + 0.4, 0.6, 0.5), { align: ep[0] > cx ? 'left' : 'right' });
  // Galileo's telescope view of Jupiter
  const ga = env(t, S.when(2, '伽利略') - 0.1, S.when(2, '牛顿') + 0.2, 0.7, 0.7);
  if (ga > 0) {
    const jx = cx + pos[4][0] * zoom, jy = cy + pos[4][1] * zoom;
    const vx = 1580, vy = 300, vr = 170;
    g.save();
    g.globalAlpha = ga;
    g.strokeStyle = 'rgba(220,230,255,0.35)'; g.lineWidth = 1.2; g.setLineDash([4, 6]);
    g.beginPath(); g.moveTo(jx, jy); g.lineTo(vx - vr * 0.7, vy + vr * 0.7); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#04060c';
    g.beginPath(); g.arc(vx, vy, vr, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(vx, vy, vr, 0, TAU); g.clip();
    const jg = g.createRadialGradient(vx - 18, vy - 18, 4, vx, vy, 52);
    jg.addColorStop(0, '#fff2dc'); jg.addColorStop(0.5, '#d8b088'); jg.addColorStop(1, '#6a4a30');
    g.fillStyle = jg; g.beginPath(); g.arc(vx, vy, 48, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(140,90,60,0.6)'; g.lineWidth = 4;
    [-14, 4, 18].forEach((dy) => { g.beginPath(); g.moveTo(vx - 46, vy + dy); g.lineTo(vx + 46, vy + dy); g.stroke(); });
    [-120, -84, 80, 126].forEach((dx, k) => { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(vx + dx + 6 * Math.sin(t + k), vy + 2, 4, 0, TAU); g.fill(); glow(g, vx + dx, vy + 2, 14, '#cfe0ff', 0.6); });
    g.restore();
    g.strokeStyle = 'rgba(220,230,255,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.arc(vx, vy, vr, 0, TAU); g.stroke();
    g.restore();
    text(g, '1610 · 伽利略', vx, vy + vr + 44, { size: 30, weight: 700, font: 'serif', color: '#ffffff', alpha: ga, shadow: 8 });
    text(g, '望远镜中的木星与四颗卫星', vx, vy + vr + 84, { size: 22, font: 'sans', color: '#bcd0ff', alpha: ga });
  }
  // Newton
  const na = rise(t, S.when(2, '1687') - 0.2, 0.9);
  if (na > 0) {
    const y = 200;
    text(g, 'F = G · m₁m₂ / r²', W / 2, y, { size: 76, font: 'serif', weight: 700, color: '#fff3d8', alpha: na, glow: 24, glowColor: 'rgba(255,200,120,0.55)', spacing: 4 });
    text(g, '1687 · 牛顿《自然哲学的数学原理》', W / 2, y + 70, { size: 28, font: 'serif', weight: 700, color: '#e8d2a8', alpha: na, spacing: 2 });
    const ua = rise(t, S.when(2, '统一了') - 0.2, 0.8);
    if (ua > 0) {
      // the apple and the Moon obey the same law
      const ax = 300, ay = 600;
      const ft = ((t - S.when(2, '统一了')) % 1.6) / 1.6;
      g.save();
      g.globalAlpha = ua;
      g.strokeStyle = 'rgba(255,220,160,0.5)'; g.setLineDash([3, 6]);
      g.beginPath(); g.moveTo(ax, ay - 140); g.lineTo(ax, ay + 80); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#e8483a';
      g.beginPath(); g.arc(ax, ay - 140 + 220 * ft * ft, 14, 0, TAU); g.fill();
      g.strokeStyle = '#6a4a2a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(ax, ay - 152 + 220 * ft * ft); g.lineTo(ax + 4, ay - 164 + 220 * ft * ft); g.stroke();
      g.restore();
      text(g, '地上：苹果落地', ax, ay + 130, { size: 26, font: 'serif', weight: 700, color: '#ffe2b8', alpha: ua });
      text(g, '天上：月球绕地', W - 300, ay + 130, { size: 26, font: 'serif', weight: 700, color: '#cfe0ff', alpha: ua });
      const mx = W - 300, my = ay - 30;
      g.save();
      g.globalAlpha = ua;
      g.fillStyle = '#4a90e8'; g.beginPath(); g.arc(mx, my, 26, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(207,224,255,0.5)'; g.beginPath(); g.ellipse(mx, my, 110, 110, 0, 0, TAU); g.stroke();
      const ma = t * 1.5;
      g.fillStyle = '#e0e0e0'; g.beginPath(); g.arc(mx + Math.cos(ma) * 110, my + Math.sin(ma) * 110, 10, 0, TAU); g.fill();
      g.restore();
      text(g, '同一个定律', W / 2, 330, { size: 30, font: 'serif', weight: 700, color: '#ffd27a', alpha: ua, spacing: 8 });
    }
  }
}

function voyages(g, S) {
  shots(g, S.t, [
    { draw: (c) => voyagesGlobe(c, S) },
    { from: S.ls(2) - 0.6, fade: 1.0, draw: (c) => solar(c, S) },
  ]);
}

export const SCENES = { axial, exchange, voyages };
