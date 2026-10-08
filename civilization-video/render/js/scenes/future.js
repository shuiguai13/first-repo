// The present turning point, three future decades (2026-2056), challenges, epilogue and end card.
import {
  W, H, TAU, clamp, lerp, inv, ease, env, rise, hash, rng, fbm1, rgba, mix, canvas, glow, bgGradient,
  text, callout, starfield, partialPath, glowLine, roundRect, card, shots, strokePts, fmt, measure, toHex,
} from '../core.js';
import { drawGlobe } from '../geo.js';
import { icon } from '../icons.js';
import { space, campfire, embers, dust, texture } from './common.js';
import { series, chartFrame } from './modern.js';

const CY = '#7fdcff', TEAL = '#5af0d0', VIO = '#a08aff', PINK = '#ff7ab0', GOLD = '#ffd27a';

function aurora(g, t, o = {}) {
  const { a = 1, hue = 0 } = o;
  bgGradient(g, [[0, '#02030c'], [0.6, '#050a1c'], [1, '#071226']]);
  starfield(g, t, { count: 380, seed: 121 + hue, alpha: 0.7 * a, drift: 1.2 });
  for (let k = 0; k < 3; k++) {
    const y = 260 + k * 90 + 40 * Math.sin(t * 0.25 + k);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.16 * a;
    const grad = g.createLinearGradient(0, y - 160, 0, y + 160);
    const col = [TEAL, VIO, CY][(k + hue) % 3];
    grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.5, col); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) g.lineTo(x, y + 80 * Math.sin(x * 0.003 + t * 0.4 + k * 2) + 40 * fbm1(x * 0.002 + t * 0.1, k));
    g.lineTo(W, y + 220); g.lineTo(0, y + 220); g.closePath();
    g.fill();
    g.restore();
  }
}

function tag(g, x, y, a, label = '展望') {
  if (a <= 0) return;
  g.save();
  g.globalAlpha = a;
  const w = measure(g, label, { size: 18, font: 'sans', weight: 500 }) + 26;
  roundRect(g, x, y - 16, w, 32, 16);
  g.strokeStyle = 'rgba(127,220,255,0.7)'; g.lineWidth = 1.2; g.stroke();
  g.restore();
  text(g, label, x + w / 2, y + 1, { size: 18, font: 'sans', weight: 500, color: CY, alpha: a });
}

function hud(g, x, y, w, h, a, title, sub, col = CY) {
  card(g, x, y, w, h, { alpha: a, fill: 'rgba(8,18,34,0.62)', stroke: rgba(col, 0.45), r: 14 });
  if (title) text(g, title, x + 26, y + 40, { size: 30, weight: 700, font: 'serif', color: '#ffffff', alpha: a, align: 'left' });
  if (sub) text(g, sub, x + 26, y + 80, { size: 21, font: 'sans', color: col, alpha: a, align: 'left' });
}

// ───────────────────────────── Now: standing at a turning point ─────────────────────────────
const MILESTONES = [
  [3.3e6, '石器'], [1e6, '用火'], [3e5, '智人'], [1.2e4, '农业'], [5200, '文字'], [2500, '轴心时代'],
  [576, '印刷术'], [250, '工业革命'], [57, '登月'], [35, '万维网'], [4, '大语言模型'],
];
function deepTimeline(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.5 });
  const x0 = 140, x1 = 1500, y = 520;
  const X = (ya) => x0 + (1 - Math.log10(ya + 1) / Math.log10(3.3e6 + 1)) * (x1 - x0);
  const a = rise(t, 0.4, 1.0);
  const draw = ease.inOut(inv(0.6, S.ls(0) + 2.6, t));
  g.save();
  g.globalAlpha = a;
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, '#ffb35a'); lg.addColorStop(1, CY);
  g.strokeStyle = lg; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(lerp(x0, x1, draw), y); g.stroke();
  g.restore();
  MILESTONES.forEach(([ya, name], i) => {
    const x = X(ya);
    const ma = clamp((lerp(x0, x1, draw) - x) / 60) * a;
    if (ma <= 0) return;
    const up = i % 2 === 0;
    g.save(); g.globalAlpha = ma; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (up ? -60 : 60)); g.stroke(); g.restore();
    glow(g, x, y, 18, i < 6 ? '#ffb35a' : CY, ma);
    text(g, name, x, y + (up ? -82 : 84), { size: 24, weight: 700, font: 'serif', color: '#ffffff', alpha: ma });
    const lab = ya >= 1e4 ? `${fmt(ya / 1e4, ya >= 1e5 ? 0 : 1)}万年前` : `${fmt(ya)}年前`;
    text(g, lab, x, y + (up ? -116 : 118), { size: 17, font: 'sans', color: '#9fb0c8', alpha: ma });
  });
  const here = rise(t, S.when(0, '2026') - 0.2, 0.6);
  if (here > 0) {
    glow(g, x1, y, 90, GOLD, here * (0.8 + 0.2 * Math.sin(t * 5)));
    g.fillStyle = rgba('#ffffff', here); g.beginPath(); g.arc(x1, y, 9, 0, TAU); g.fill();
    text(g, '你在这里 · 2026', x1, y + 70, { size: 30, weight: 700, font: 'serif', color: GOLD, alpha: here, glow: 12, glowColor: 'rgba(255,210,120,0.5)' });
    const fut = ease.inOut(inv(S.when(0, '转折点') - 0.2, S.le(0) + 0.6, t));
    g.save(); g.setLineDash([10, 10]); glowLine(g, [[x1 + 20, y], [lerp(x1 + 20, 1800, fut), y]], CY, 2, here); g.restore();
    text(g, '2056 ?', 1800, y - 50, { size: 30, font: 'inter', weight: 800, color: CY, alpha: here * fut });
  }
  text(g, '对数时间轴：越靠右，变化越快', (x0 + x1) / 2, 830, { size: 22, font: 'sans', color: '#8fa0b8', alpha: a * 0.9, spacing: 2 });
}
const DOMAINS = [['brain-circuit', '人工智能', '人工智能'], ['sun', '清洁能源', '清洁能源'], ['dna', '生命科学', '生命科学'], ['rocket', '太空探索', '太空探索']];
function accel(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.8, hue: 1 });
  const x0 = 220, y1 = 860;
  const ends = [[1360, 250], [1460, 400], [1540, 550], [1600, 700]];
  DOMAINS.forEach(([ic, name, key], i) => {
    const a = rise(t, S.when(1, key) - 0.2, 0.6);
    if (a <= 0) return;
    const k = ease.inOut(inv(S.when(1, key) - 0.2, S.le(1) + 0.6, t));
    const col = [VIO, GOLD, TEAL, CY][i];
    const rate = 3.4;
    const pts = [];
    for (let u = 0; u <= 1.0001; u += 0.02) {
      const x = lerp(x0, ends[i][0], u);
      const y = y1 - (Math.exp(rate * u) - 1) / (Math.exp(rate) - 1) * (y1 - ends[i][1]);
      pts.push([x, y]);
    }
    const part = partialPath(pts, k);
    glowLine(g, part.pts, col, 3, a);
    const h = part.head;
    icon(g, ic, h[0], h[1] - 50, 56, col, a, { glowAmt: 1 });
    text(g, name, h[0] + 48, h[1] - 50, { size: 28, weight: 700, font: 'serif', color: '#ffffff', alpha: a, align: 'left', shadow: 8 });
  });
  text(g, '同时加速', W / 2, 160, { size: 54, weight: 700, font: 'serif', color: '#e8f6ff', alpha: rise(t, S.when(1, '同时加速') - 0.2, 0.6), spacing: 16, glow: 18, glowColor: 'rgba(120,200,255,0.5)' });
}
function question(g, S) {
  const { t } = S;
  aurora(g, t, { a: 1, hue: 2 });
  const a = rise(t, S.ls(2) - 0.3, 0.8);
  const k = ease.out(inv(S.ls(2), S.ls(2) + 1.4, t));
  text(g, '2026', W / 2 - 330 + (1 - k) * 120, 420, { size: 150, font: 'inter', weight: 800, color: GOLD, alpha: a, glow: 30, glowColor: 'rgba(255,200,100,0.5)' });
  text(g, '→', W / 2, 420, { size: 110, font: 'inter', weight: 300, color: '#ffffff', alpha: a * k });
  text(g, '2056', W / 2 + 330 - (1 - k) * 120, 420, { size: 150, font: 'inter', weight: 800, color: CY, alpha: a * k, glow: 30, glowColor: 'rgba(100,200,255,0.5)' });
  text(g, '世界将会怎样？', W / 2, 600, { size: 56, weight: 700, font: 'serif', color: '#ffffff', alpha: rise(t, S.when(2, '世界将会'), 0.6), spacing: 10 });
  const da = rise(t, S.ls(3) - 0.2, 0.8);
  if (da > 0) {
    card(g, W / 2 - 520, 690, 1040, 120, { alpha: da, fill: 'rgba(8,18,34,0.7)', stroke: 'rgba(127,220,255,0.45)', r: 18 });
    text(g, '以下内容是基于当前趋势、科研进展与公开规划的展望', W / 2, 732, { size: 28, font: 'sans', weight: 500, color: '#e8f6ff', alpha: da });
    text(g, '未来并非注定', W / 2, 778, { size: 24, font: 'sans', color: CY, alpha: rise(t, S.when(3, '未来并非'), 0.6), spacing: 6 });
  }
}
function now(g, S) {
  shots(g, S.t, [
    { draw: (c) => deepTimeline(c, S) },
    { from: S.ls(1) - 0.5, fade: 0.9, draw: (c) => accel(c, S) },
    { from: S.ls(2) - 0.5, fade: 0.9, draw: (c) => question(c, S) },
  ]);
}

// ───────────────────────────── Future I: 2026-2035 ─────────────────────────────
function aiCore(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.7 });
  const cx = W / 2, cy = 500;
  const a = rise(t, 0.3, 1.2);
  const speed = 1 + 2.5 * rise(t, S.when(0, '加快') - 0.3, 1.5);
  glow(g, cx, cy, 380, VIO, 0.45 * a);
  glow(g, cx, cy, 160, '#e8f0ff', 0.7 * a);
  g.save();
  g.translate(cx, cy);
  for (let k = 0; k < 3; k++) {
    g.save();
    g.rotate(t * 0.3 * speed * (k % 2 ? -1 : 1) + k);
    g.scale(1, 0.35 + k * 0.1);
    g.strokeStyle = rgba([CY, VIO, TEAL][k], 0.5 * a);
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 150 + k * 40, 0, TAU); g.stroke();
    g.restore();
  }
  g.restore();
  const tasks = [['code', '编程', '编程', -1, -1], ['flask-conical', '科研', '科研', 1, -1], ['stethoscope', '诊疗', '诊疗', -1, 1], ['graduation-cap', '学习', '学习', 1, 1]];
  tasks.forEach(([ic, name, key, sx, sy]) => {
    const ta = rise(t, S.when(0, key) - 0.2, 0.6);
    if (ta <= 0) return;
    const x = cx + sx * 520, y = cy + sy * 230;
    g.save(); g.globalAlpha = ta; g.strokeStyle = rgba(CY, 0.35); g.setLineDash([4, 8]); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); g.restore();
    for (let k = 0; k < 3; k++) {
      const u = ((t * 0.5 * speed + k / 3) % 1);
      glow(g, lerp(cx, x, u), lerp(cy, y, u), 14, TEAL, ta * 0.9);
    }
    card(g, x - 120, y - 54, 240, 108, { alpha: ta, fill: 'rgba(8,18,34,0.7)', stroke: 'rgba(127,220,255,0.45)', r: 16 });
    icon(g, ic, x - 64, y, 48, CY, ta);
    text(g, name, x + 24, y + 2, { size: 34, weight: 700, font: 'serif', color: '#ffffff', alpha: ta });
  });
  text(g, 'AI 智能体', cx, cy + 4, { size: 40, font: 'inter', weight: 800, color: '#0a1020', alpha: a });
  text(g, '从工具到伙伴', cx, 150, { size: 44, weight: 700, font: 'serif', color: '#e8f6ff', alpha: rise(t, S.when(0, '伙伴') - 0.3, 0.6), spacing: 10 });
  tag(g, 1700, 150, a);
}

function robot(g, x, y, s, t, a) {
  const c = rgba(CY, a), fill = 'rgba(10,24,40,0.85)';
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.globalAlpha = a;
  g.lineWidth = 3;
  g.strokeStyle = c;
  g.fillStyle = fill;
  const sw = Math.sin(t * 3);
  const limb = (x1, y1, a1, l1, a2, l2) => {
    const xa = x1 + Math.sin(a1) * l1, ya = y1 + Math.cos(a1) * l1;
    const xb = xa + Math.sin(a1 + a2) * l2, yb = ya + Math.cos(a1 + a2) * l2;
    g.lineWidth = 18; g.lineCap = 'round'; g.strokeStyle = 'rgba(10,24,40,0.95)';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(xa, ya); g.lineTo(xb, yb); g.stroke();
    g.lineWidth = 3; g.strokeStyle = c;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(xa, ya); g.lineTo(xb, yb); g.stroke();
    g.fillStyle = c; g.beginPath(); g.arc(xa, ya, 6, 0, TAU); g.fill();
  };
  limb(-30, 120, 0.25 * sw, 110, Math.max(0, -0.5 * sw), 110);
  limb(30, 120, -0.25 * sw, 110, Math.max(0, 0.5 * sw), 110);
  g.fillStyle = fill; g.strokeStyle = c; g.lineWidth = 3;
  roundRect(g, -70, -60, 140, 190, 30); g.fill(); g.stroke();
  g.strokeStyle = rgba(CY, 0.5 * a);
  g.beginPath(); g.moveTo(-40, 10); g.lineTo(40, 10); g.stroke();
  glow(g, 0, 40, 30, CY, a * 0.8);
  limb(-80, -40, -0.2 * sw, 100, 0.4, 90);
  limb(80, -40, Math.PI * 0.85 + 0.2 * Math.sin(t * 4), 100, 0.3, 80);
  g.fillStyle = fill; g.strokeStyle = c; g.lineWidth = 3;
  roundRect(g, -45, -150, 90, 80, 26); g.fill(); g.stroke();
  g.strokeStyle = c; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-26, -112); g.lineTo(26, -112); g.stroke();
  glow(g, 0, -112, 40, CY, a);
  g.restore();
}
function robotsCars(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.6, hue: 1 });
  const ra = rise(t, S.ls(1) - 0.3, 0.8);
  robot(g, 520, 470, 1.15, t, ra);
  text(g, '人形机器人', 520, 840, { size: 34, weight: 700, font: 'serif', color: '#ffffff', alpha: ra });
  text(g, '走进工厂与家庭', 520, 884, { size: 22, font: 'sans', color: CY, alpha: ra });
  const ca = rise(t, S.when(1, '自动驾驶') - 0.4, 0.8);
  if (ca > 0) {
    const ox = 1020, oy = 200, sz = 640;
    g.save();
    g.globalAlpha = ca;
    g.beginPath(); g.rect(ox, oy, sz, sz * 0.9); g.clip();
    g.fillStyle = 'rgba(8,16,30,0.9)'; g.fillRect(ox, oy, sz, sz);
    g.strokeStyle = 'rgba(127,220,255,0.18)'; g.lineWidth = 26;
    for (let k = 0; k < 4; k++) {
      g.beginPath(); g.moveTo(ox, oy + 70 + k * 150); g.lineTo(ox + sz, oy + 70 + k * 150); g.stroke();
      g.beginPath(); g.moveTo(ox + 70 + k * 170, oy); g.lineTo(ox + 70 + k * 170, oy + sz); g.stroke();
    }
    g.fillStyle = 'rgba(127,220,255,0.06)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(ox + 90 + i * 170, oy + 90 + j * 150, 130, 110);
    for (let i = 0; i < 16; i++) {
      const horiz = i % 2 === 0, lane = Math.floor(hash(i) * 4);
      const u = ((t * (0.08 + hash(i + 3) * 0.06) + hash(i + 9)) % 1);
      const dir = hash(i + 5) > 0.5 ? 1 : -1;
      const p = dir > 0 ? u : 1 - u;
      const x = horiz ? ox + p * sz : ox + 70 + lane * 170 + (dir > 0 ? 6 : -6);
      const y = horiz ? oy + 70 + lane * 150 + (dir > 0 ? 6 : -6) : oy + p * sz;
      glow(g, x, y, 34, i % 3 ? TEAL : GOLD, 0.35);
      g.fillStyle = i % 3 ? '#bff8ee' : '#ffe6a8';
      g.save(); g.translate(x, y); g.rotate(horiz ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
      roundRect(g, -14, -7, 28, 14, 4); g.fill();
      g.strokeStyle = 'rgba(191,248,238,0.25)'; g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, 26 + 6 * Math.sin(t * 4 + i), 0, TAU); g.stroke();
      g.restore();
    }
    g.restore();
    g.strokeStyle = rgba(CY, 0.5 * ca); g.lineWidth = 1.5; g.strokeRect(ox, oy, sz, sz * 0.9);
    text(g, '自动驾驶', ox + sz / 2, 840, { size: 34, weight: 700, font: 'serif', color: '#ffffff', alpha: ca });
    text(g, '在越来越多的城市普及', ox + sz / 2, 884, { size: 22, font: 'sans', color: CY, alpha: ca });
  }
  tag(g, 1700, 150, ra);
}

let moonTex = null;
function moonDisc(g, x, y, r, a) {
  if (!moonTex) {
    const s = 512, c = canvas(s, s), m = c.getContext('2d');
    const gr = m.createRadialGradient(s * 0.4, s * 0.4, s * 0.05, s / 2, s / 2, s / 2);
    gr.addColorStop(0, '#b8b8bc'); gr.addColorStop(1, '#4a4a52');
    m.fillStyle = gr; m.beginPath(); m.arc(s / 2, s / 2, s / 2, 0, TAU); m.fill();
    m.save(); m.beginPath(); m.arc(s / 2, s / 2, s / 2, 0, TAU); m.clip();
    const R = rng(33);
    for (let i = 0; i < 9; i++) { m.fillStyle = `rgba(70,70,80,${0.25 + R() * 0.2})`; m.beginPath(); m.ellipse(R() * s, R() * s, 30 + R() * 90, 24 + R() * 70, R() * 3, 0, TAU); m.fill(); }
    for (let i = 0; i < 90; i++) {
      const cx = R() * s, cy = R() * s, cr = 2 + Math.pow(R(), 3) * 26;
      m.fillStyle = 'rgba(30,30,36,0.22)';
      m.beginPath(); m.arc(cx, cy, cr, 0, TAU); m.fill();
      m.strokeStyle = 'rgba(255,255,255,0.10)'; m.lineWidth = 1;
      m.beginPath(); m.arc(cx + 0.8, cy + 0.8, cr, Math.PI * 0.2, Math.PI * 1.1); m.stroke();
    }
    const sh = m.createRadialGradient(s * 0.3, s * 0.3, s * 0.2, s * 0.5, s * 0.5, s * 0.6);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.7)');
    m.fillStyle = sh; m.fillRect(0, 0, s, s);
    m.restore();
    moonTex = c;
  }
  g.save(); g.globalAlpha = a;
  glow(g, x, y, r * 1.5, '#9aa8c8', 0.25);
  g.drawImage(moonTex, x - r, y - r, r * 2, r * 2);
  g.restore();
}
function moonBase(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#010207'], [1, '#04060e']]);
  starfield(g, t, { count: 500, seed: 131, alpha: 0.85 });
  const k = ease.out(inv(S.ls(2) - 0.6, S.ls(2) + 3, t));
  const mx = 1050, my = lerp(1350, 880, k), mr = 560;
  moonDisc(g, mx, my, mr, 1);
  const ba = rise(t, S.when(2, '科研基地') - 0.2, 0.9);
  if (ba > 0) {
    g.save();
    g.globalAlpha = ba;
    const bx = mx - 40, by = my - mr + 70;
    [[-90, 46], [0, 64], [100, 40]].forEach(([dx, r]) => {
      const dg = g.createRadialGradient(bx + dx - r * 0.3, by - r * 0.4, 2, bx + dx, by, r);
      dg.addColorStop(0, '#ffffff'); dg.addColorStop(1, '#8a98b0');
      g.fillStyle = dg; g.beginPath(); g.arc(bx + dx, by, r, Math.PI, TAU); g.fill();
      glow(g, bx + dx, by - r * 0.4, r * 0.8, GOLD, 0.35);
    });
    g.fillStyle = '#2a4a8a';
    [[-230, -10], [-180, -10], [190, -14], [240, -14]].forEach(([dx, dy]) => { g.fillRect(bx + dx - 20, by + dy - 34, 40, 26); });
    g.strokeStyle = '#c8d0e0'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(bx + 160, by); g.lineTo(bx + 160, by - 120); g.stroke();
    g.beginPath(); g.arc(bx + 160, by - 120, 18, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    glow(g, bx + 160, by - 120, 30, '#ff6a5a', 0.6 + 0.4 * Math.sin(t * 4));
    g.restore();
  }
  hud(g, 140, 220, 560, 120, rise(t, S.when(2, '重返月球') - 0.3, 0.6), '2030年前后 · 载人重返月球', '中国、美国等均计划载人登月');
  hud(g, 140, 370, 560, 120, ba, '月球科研站', '可长期驻留的科研基地（规划中）');
  tag(g, 1700, 150, rise(t, S.ls(2), 0.6));
}
function renewables(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.7, hue: 2 });
  const a = rise(t, S.when(2, '可再生能源') - 0.4, 0.8);
  const cx = 1300, cy = 500, r = 230;
  const p = ease.inOut(inv(S.when(2, '可再生能源'), S.le(2) + 0.5, t));
  const share = lerp(0.30, 0.46, p);
  g.save();
  g.globalAlpha = a;
  g.lineWidth = 46;
  g.strokeStyle = 'rgba(255,255,255,0.08)';
  g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
  const sg = g.createConicGradient(-Math.PI / 2, cx, cy);
  sg.addColorStop(0, TEAL); sg.addColorStop(share, GOLD); sg.addColorStop(share + 0.0001, 'rgba(0,0,0,0)');
  g.strokeStyle = sg;
  g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * share); g.stroke();
  g.restore();
  text(g, p < 0.98 ? `${Math.round(share * 100)}%` : '近一半', cx, cy - 10, { size: 84, font: p < 0.98 ? 'inter' : 'serif', weight: 800, color: '#ffffff', alpha: a });
  text(g, '可再生能源占全球发电', cx, cy + 60, { size: 24, font: 'sans', color: CY, alpha: a });
  text(g, '2023年约30% → 2030年（IEA预测）', cx, cy + 340, { size: 22, font: 'sans', color: '#9fb8d0', alpha: a });
  // solar field + turbines
  g.save();
  g.globalAlpha = a;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
    const x = 160 + i * 120 + j * 30, y = 640 + j * 70;
    g.fillStyle = '#1a3a7a'; g.strokeStyle = 'rgba(127,220,255,0.6)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 100, y); g.lineTo(x + 80, y + 46); g.lineTo(x - 20, y + 46); g.closePath(); g.fill(); g.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const x = 250 + i * 230, y = 560 - i * 30, h = 300;
    g.strokeStyle = '#d8e8f8'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y); g.stroke();
    for (let b = 0; b < 3; b++) {
      const ang = t * 1.6 + i + (b / 3) * TAU;
      g.lineWidth = 5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * 120, y + Math.sin(ang) * 120); g.stroke();
    }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill();
  }
  g.restore();
  glow(g, 400, 300, 300, GOLD, 0.35 * a);
  tag(g, 1700, 150, a);
}
function quantum(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#04040c'], [1, '#0a0a1a']]);
  glow(g, W / 2, 480, 700, VIO, 0.22);
  const a = rise(t, S.ls(3) - 0.4, 0.8);
  const cx = 760;
  g.save();
  g.globalAlpha = a;
  const tiers = [[180, 240], [150, 380], [120, 510], [92, 630], [64, 740]];
  for (let i = 0; i < tiers.length - 1; i++) {
    for (let k = -3; k <= 3; k++) {
      const x0 = cx + k * tiers[i][0] * 0.28, x1 = cx + k * tiers[i + 1][0] * 0.28;
      g.strokeStyle = 'rgba(230,190,120,0.75)'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(x0, tiers[i][1]); g.bezierCurveTo(x0, tiers[i][1] + 60, x1, tiers[i + 1][1] - 60, x1, tiers[i + 1][1]); g.stroke();
    }
  }
  tiers.forEach(([w, y], i) => {
    const dg = g.createLinearGradient(cx - w, 0, cx + w, 0);
    dg.addColorStop(0, '#7a5a2a'); dg.addColorStop(0.5, '#f0d090'); dg.addColorStop(1, '#7a5a2a');
    g.fillStyle = dg;
    g.beginPath(); g.ellipse(cx, y, w, w * 0.18, 0, 0, TAU); g.fill();
    g.fillRect(cx - w, y - 8, w * 2, 16);
    g.beginPath(); g.ellipse(cx, y + 8, w, w * 0.18, 0, 0, Math.PI); g.fill();
  });
  g.fillStyle = '#c8a0ff'; g.fillRect(cx - 26, 770, 52, 22);
  glow(g, cx, 780, 80, VIO, 0.9);
  g.restore();
  // Bloch sphere
  const bx = 1340, by = 470, br = 180;
  g.save();
  g.globalAlpha = a;
  g.strokeStyle = 'rgba(160,138,255,0.6)'; g.lineWidth = 2;
  g.beginPath(); g.arc(bx, by, br, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(bx, by, br, br * 0.3, 0, 0, TAU); g.stroke();
  g.setLineDash([4, 6]);
  g.beginPath(); g.moveTo(bx, by - br - 20); g.lineTo(bx, by + br + 20); g.stroke();
  g.setLineDash([]);
  const th = 0.9 + 0.3 * Math.sin(t * 0.9), ph = t * 1.4;
  const vx = bx + Math.sin(th) * Math.cos(ph) * br, vy = by - Math.cos(th) * br + Math.sin(th) * Math.sin(ph) * br * 0.3;
  glowLine(g, [[bx, by], [vx, vy]], PINK, 3, 1);
  glow(g, vx, vy, 30, PINK, 1);
  g.restore();
  text(g, '|0⟩', bx, by - br - 44, { size: 28, font: 'inter', color: '#d8ccff', alpha: a });
  text(g, '|1⟩', bx, by + br + 46, { size: 28, font: 'inter', color: '#d8ccff', alpha: a });
  hud(g, 1100, 760, 520, 120, a, '容错量子计算', '有望攻克经典计算机难以胜任的问题', VIO);
  tag(g, 1700, 150, a);
}
function future1(g, S) {
  shots(g, S.t, [
    { draw: (c) => aiCore(c, S) },
    { from: S.ls(1) - 0.5, fade: 0.9, draw: (c) => robotsCars(c, S) },
    { from: S.ls(2) - 0.5, fade: 0.9, draw: (c) => moonBase(c, S) },
    { from: S.when(2, '可再生能源') - 0.7, fade: 0.9, draw: (c) => renewables(c, S) },
    { from: S.ls(3) - 0.6, fade: 0.9, draw: (c) => quantum(c, S) },
  ]);
}

// ───────────────────────────── Future II: 2035-2045 ─────────────────────────────
function fusion(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#05030e'], [1, '#0c0618']]);
  starfield(g, t, { count: 200, seed: 141, alpha: 0.4 });
  const cx = W / 2, cy = 430;
  const on = rise(t, S.when(0, '发电') - 0.6, 1.0);
  const a = rise(t, 0.4, 1.0);
  g.save();
  g.globalAlpha = a;
  for (let k = 0; k < 18; k++) {
    const ang = (k / 18) * TAU + t * 0.05;
    const x = cx + Math.cos(ang) * 420, y = cy + Math.sin(ang) * 120;
    const front = Math.sin(ang) > 0;
    if (front) continue;
    g.strokeStyle = 'rgba(160,170,200,0.5)'; g.lineWidth = 10;
    g.beginPath(); g.ellipse(x, y, 34, 130, 0, 0, TAU); g.stroke();
  }
  g.restore();
  const pulse = 0.85 + 0.15 * Math.sin(t * 6);
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    g.strokeStyle = rgba(k % 2 ? PINK : VIO, (0.18 + 0.12 * k) * on * pulse);
    g.lineWidth = 60 - k * 11;
    g.beginPath(); g.ellipse(cx, cy, 420, 120, 0, 0, TAU); g.stroke();
  }
  g.restore();
  glow(g, cx - 300, cy + 60, 160, PINK, 0.6 * on);
  glow(g, cx + 300, cy + 60, 160, VIO, 0.6 * on);
  g.save();
  g.globalAlpha = a;
  for (let k = 0; k < 18; k++) {
    const ang = (k / 18) * TAU + t * 0.05;
    const x = cx + Math.cos(ang) * 420, y = cy + Math.sin(ang) * 120;
    if (Math.sin(ang) <= 0) continue;
    g.strokeStyle = 'rgba(200,210,240,0.8)'; g.lineWidth = 12;
    g.beginPath(); g.ellipse(x, y, 34, 130, 0, 0, TAU); g.stroke();
  }
  g.restore();
  // power flowing to a city
  const flow = rise(t, S.when(0, '清洁能源') - 1.5, 1.2);
  const city = rise(t, S.when(0, '发电'), 2.0);
  for (let i = 0; i < 26; i++) {
    const x = 120 + i * 66, h = 60 + hash(i) * 160;
    g.fillStyle = '#0a0a14'; g.fillRect(x, 900 - h, 56, h);
    for (let w = 0; w < h / 26; w++) for (let c = 0; c < 3; c++) {
      if (hash(i * 31 + w * 7 + c) > city) continue;
      g.fillStyle = rgba(hash(i + w) > 0.5 ? '#ffe2a8' : '#bfe8ff', 0.85);
      g.fillRect(x + 8 + c * 16, 900 - h + 10 + w * 26, 9, 12);
    }
  }
  if (flow > 0) {
    for (let i = 0; i < 40; i++) {
      const u = ((t * 0.6 + i / 40) % 1);
      const tx = 120 + (i % 26) * 66 + 28;
      const x = lerp(cx + (hash(i) - 0.5) * 500, tx, u), y = lerp(cy + 100, 760, u);
      glow(g, x, y, 14, i % 2 ? PINK : CY, flow * Math.sin(Math.PI * u));
    }
  }
  hud(g, 140, 120, 560, 120, rise(t, S.when(0, '核聚变') - 0.3, 0.6), '核聚变示范电站', '“人造太阳”：几乎取之不尽的清洁能源', PINK);
  tag(g, 1700, 150, a);
}
function medicine(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.6, hue: 1 });
  const cx = 560, y0 = 180, y1 = 800;
  const items = [];
  for (let i = 0; i < 30; i++) {
    const y = lerp(y0, y1, i / 29), ang = t * 1.1 + i * 0.42;
    items.push({ y, xa: cx + Math.cos(ang) * 130, xb: cx + Math.cos(ang + Math.PI) * 130, za: Math.sin(ang), zb: Math.sin(ang + Math.PI), i });
  }
  const edit = rise(t, S.when(1, '基因编辑'), 0.8);
  const fixP = ease.inOut(inv(S.when(1, '基因编辑') + 0.6, S.when(1, '可防可治') + 0.5, t));
  items.forEach(({ y, xa, xb, i }) => {
    const target = i >= 13 && i <= 16;
    const col = target ? rgba(mix(PINK, TEAL, fixP), 0.9) : rgba(i % 2 ? CY : VIO, 0.55);
    g.strokeStyle = col; g.lineWidth = target ? 8 : 5;
    g.beginPath(); g.moveTo(xa, y); g.lineTo(xb, y); g.stroke();
    if (target && edit > 0) glow(g, (xa + xb) / 2, y, 60, fixP > 0.5 ? TEAL : PINK, 0.6 * edit);
  });
  for (const k of ['a', 'b']) glowLine(g, items.map((it) => [k === 'a' ? it.xa : it.xb, it.y]), k === 'a' ? '#9ff0e0' : '#c8b8ff', 3.5, 1);
  callout(g, cx + 140, lerp(y0, y1, 14.5 / 29), cx + 330, 390, '基因编辑', '精准修复致病突变', edit, { color: TEAL });
  const ma = rise(t, S.when(1, 'mRNA') - 0.2, 0.6);
  if (ma > 0) {
    const pts = [];
    for (let i = 0; i <= 60; i++) pts.push([960 + i * 12, 300 + 30 * Math.sin(i * 0.5 + t * 2)]);
    glowLine(g, pts, PINK, 3, ma);
    for (let i = 0; i < 60; i += 3) { g.fillStyle = rgba([TEAL, GOLD, CY, PINK][(i / 3) % 4], ma); g.fillRect(pts[i][0] - 2, pts[i][1], 4, 22); }
    text(g, 'mRNA 疗法', 1320, 240, { size: 30, weight: 700, font: 'inter', color: '#ffffff', alpha: ma });
  }
  const da = rise(t, S.when(1, '新药') - 0.2, 0.6);
  if (da > 0) {
    const atoms = [[1120, 560], [1200, 520], [1280, 560], [1280, 640], [1200, 680], [1120, 640], [1360, 520], [1040, 520]];
    const bonds = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [0, 7]];
    g.save(); g.globalAlpha = da;
    g.translate(1200, 600); g.rotate(t * 0.3); g.translate(-1200, -600);
    g.strokeStyle = 'rgba(200,220,255,0.7)'; g.lineWidth = 4;
    bonds.forEach(([p, q]) => { g.beginPath(); g.moveTo(...atoms[p]); g.lineTo(...atoms[q]); g.stroke(); });
    atoms.forEach(([x, y], i) => { g.fillStyle = [CY, PINK, GOLD, TEAL][i % 4]; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill(); });
    g.restore();
    text(g, 'AI 设计新药', 1200, 780, { size: 30, weight: 700, font: 'serif', color: '#ffffff', alpha: da });
  }
  tag(g, 1700, 150, rise(t, S.ls(1), 0.6));
}
function bci(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.6, hue: 2 });
  const a = rise(t, S.when(1, '脑机接口') - 0.4, 0.8);
  icon(g, 'brain', 640, 470, 460, '#c8b8ff', a, { thin: true, glowAmt: 1 });
  for (let i = 0; i < 16; i++) {
    const x = 560 + (i % 4) * 50, y = 330 + Math.floor(i / 4) * 40;
    glow(g, x, y, 14, TEAL, a * (0.5 + 0.5 * Math.sin(t * 6 + i)));
  }
  const pts = [];
  for (let i = 0; i <= 80; i++) {
    const x = 900 + i * 8;
    pts.push([x, 470 + Math.sin(i * 0.6 - t * 8) * 26 * Math.sin(i * 0.08)]);
  }
  glowLine(g, pts, TEAL, 2.5, a);
  icon(g, 'hand', 1640, 470, 200, CY, a, { thin: true });
  hud(g, 1080, 700, 600, 120, a, '脑机接口', '帮助瘫痪患者重新交流与行动', TEAL);
  tag(g, 1700, 150, a);
}
function mars(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#050204'], [1, '#0e0606']]);
  starfield(g, t, { count: 380, seed: 151, alpha: 0.8 });
  const mx = 1180, my = 1150, mr = 760;
  glow(g, mx, my, mr * 1.25, '#ff6a3a', 0.35);
  g.save();
  g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.clip();
  const mg = g.createRadialGradient(mx - 250, my - 400, 100, mx, my, mr);
  mg.addColorStop(0, '#f0a070'); mg.addColorStop(0.6, '#b8502a'); mg.addColorStop(1, '#4a1a0e');
  g.fillStyle = mg; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
  const R = rng(44);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(${90 + R() * 40},${30 + R() * 20},${20},${0.15 + R() * 0.2})`;
    g.beginPath(); g.ellipse(mx + (R() - 0.5) * mr * 1.6, my + (R() - 0.7) * mr, 40 + R() * 160, 14 + R() * 50, R() * 3, 0, TAU); g.fill();
  }
  g.restore();
  const k = ease.inOut(inv(S.ls(2) - 0.5, S.ls(2) + 4.5, t));
  const sx = lerp(760, 900, k), sy = lerp(80, 360, k);
  g.save();
  g.translate(sx, sy);
  g.rotate(0.12 * (1 - k));
  const bodyG = g.createLinearGradient(-26, 0, 26, 0);
  bodyG.addColorStop(0, '#8a8e98'); bodyG.addColorStop(0.5, '#e8ecf2'); bodyG.addColorStop(1, '#7a7e88');
  g.fillStyle = bodyG;
  g.beginPath(); g.moveTo(-26, 120); g.lineTo(-26, -60); g.quadraticCurveTo(0, -130, 26, -60); g.lineTo(26, 120); g.closePath(); g.fill();
  g.fillStyle = '#5a5e68';
  g.beginPath(); g.moveTo(-26, 80); g.lineTo(-48, 124); g.lineTo(-26, 124); g.fill();
  g.beginPath(); g.moveTo(26, 80); g.lineTo(48, 124); g.lineTo(26, 124); g.fill();
  const fl = 0.8 + 0.2 * Math.sin(t * 30);
  glow(g, 0, 150, 70 * fl, '#ffb070', 0.9);
  g.globalCompositeOperation = 'lighter';
  const fg = g.createLinearGradient(0, 124, 0, 240);
  fg.addColorStop(0, 'rgba(255,240,200,0.95)'); fg.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = fg;
  g.beginPath(); g.moveTo(-18, 124); g.lineTo(0, 124 + 110 * fl); g.lineTo(18, 124); g.fill();
  g.restore();
  hud(g, 140, 200, 580, 120, rise(t, S.ls(2), 0.6), '首次载人登陆火星？', '翻开“多行星文明”的第一页', '#ffb07a');
  tag(g, 1700, 150, rise(t, S.ls(2), 0.6));
}
function future2(g, S) {
  shots(g, S.t, [
    { draw: (c) => fusion(c, S) },
    { from: S.ls(1) - 0.6, fade: 0.9, draw: (c) => medicine(c, S) },
    { from: S.when(1, '脑机接口') - 0.6, fade: 0.9, draw: (c) => bci(c, S) },
    { from: S.ls(2) - 0.6, fade: 0.9, draw: (c) => mars(c, S) },
  ]);
}

// ───────────────────────────── Future III: 2045-2056 ─────────────────────────────
const POPF = [[1950, 2.5], [1960, 3.0], [1970, 3.7], [1980, 4.4], [1990, 5.3], [2000, 6.1], [2010, 6.9], [2020, 7.8], [2026, 8.3]];
const POPP = [[2026, 8.3], [2030, 8.5], [2040, 9.2], [2050, 9.7], [2056, 9.85]];
function popFuture(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.5 });
  const x0 = 260, x1 = 1180, y0 = 220, y1 = 760;
  const a = rise(t, 0.4, 1.0);
  chartFrame(g, x0, x1, y0, y1, '世界人口', '（十亿）', CY, a, [[0, '0', y1], [5, '5', lerp(y1, y0, 0.5)], [10, '10', y0]]);
  for (let yr = 1950; yr <= 2050; yr += 25) text(g, String(yr), lerp(x0, x1, (yr - 1950) / 106), y1 + 30, { size: 20, font: 'inter', color: '#8ea0c0', alpha: a });
  const sp = series(POPF, x0, x1, y0, y1, 1950, 2056, 10);
  const pp = series(POPP, x0, x1, y0, y1, 1950, 2056, 10);
  const p1 = ease.inOut(inv(0.6, S.ls(0) + 0.8, t)), p2 = ease.inOut(inv(S.when(0, '接近') - 0.6, S.when(0, '接近') + 1.4, t));
  glowLine(g, partialPath(sp.map((q) => [q[0], q[1]]), p1).pts, CY, 3.5, a);
  if (p2 > 0) {
    g.save(); g.setLineDash([10, 9]);
    glowLine(g, partialPath(pp.map((q) => [q[0], q[1]]), p2).pts, TEAL, 3, a);
    g.restore();
    const end = pp[pp.length - 1];
    text(g, '约97亿', end[0] - 10, end[1] - 44, { size: 40, font: 'serif', weight: 700, color: '#ffffff', alpha: clamp(p2 * 2 - 1), align: 'right' });
    text(g, '2050年 · 联合国中位预测', end[0] - 10, end[1] - 8, { size: 18, font: 'sans', color: TEAL, alpha: clamp(p2 * 2 - 1), align: 'right' });
  }
  const aa = rise(t, S.when(0, '老龄化') - 0.3, 0.6);
  if (aa > 0) {
    for (let i = 0; i < 6; i++) {
      const old = i === 5;
      const ia = rise(t, S.when(0, '每6个人') + i * 0.12, 0.4);
      icon(g, 'person-standing', 1330 + (i % 3) * 130, 380 + Math.floor(i / 3) * 170, 120, old ? GOLD : '#9fb8d0', aa * ia, { glowAmt: old ? 1.2 : 0.2 });
    }
    text(g, '2050年：每6人中约有1人超过65岁', 1460, 760, { size: 26, font: 'sans', weight: 500, color: '#ffe6b0', alpha: rise(t, S.when(0, '65岁') - 0.3, 0.6) });
    text(g, '社会深度老龄化', 1460, 280, { size: 34, weight: 700, font: 'serif', color: '#ffffff', alpha: aa });
  }
  tag(g, 1700, 150, a, '联合国预测');
}
function lifeCarbon(g, S) {
  const { t } = S;
  aurora(g, t, { a: 0.6, hue: 2 });
  const a = rise(t, S.ls(1) - 0.4, 0.8);
  const k = ease.out(inv(S.ls(1) + 0.2, S.when(1, '左右') + 0.4, t));
  text(g, `${Math.round(lerp(73, 77, k))}岁`, 560, 470, { size: 170, font: 'inter', weight: 800, color: '#ffffff', alpha: a, glow: 30, glowColor: 'rgba(120,220,255,0.5)' });
  text(g, '全球人均预期寿命', 560, 600, { size: 32, weight: 700, font: 'serif', color: CY, alpha: a });
  text(g, '2054年 · 联合国《世界人口展望2024》', 560, 650, { size: 20, font: 'sans', color: '#9fb0c8', alpha: a });
  const ca = rise(t, S.when(1, '主要经济体') - 0.3, 0.8);
  drawGlobe(g, { cx: 1340, cy: 420, r: 210, rot: [-30 - t * 5, -20, 0], alpha: ca, ocean: ['#0e4a6a', '#04182a'], land: rgba(mix('#4a6a3a', '#3ad08a', ca)), coast: 'rgba(200,255,220,0.35)', atmosphere: '#5af0b0' });
  const pledges = [['欧盟', '2050'], ['英国', '2050'], ['日本', '2050'], ['中国', '2060'], ['印度', '2070']];
  pledges.forEach(([n, y], i) => {
    const pa = rise(t, S.when(1, '主要经济体') + 0.4 + i * 0.25, 0.4) * ca;
    const x = 1060 + i * 140, yy = 760;
    card(g, x - 60, yy - 46, 120, 92, { alpha: pa, fill: 'rgba(8,30,26,0.7)', stroke: 'rgba(90,240,176,0.5)', r: 12 });
    text(g, n, x, yy - 14, { size: 24, weight: 700, font: 'serif', color: '#ffffff', alpha: pa });
    text(g, y, x, yy + 22, { size: 22, font: 'inter', weight: 600, color: '#5af0b0', alpha: pa });
  });
  text(g, '碳中和目标年', 1340, 680, { size: 22, font: 'sans', color: '#bff0d8', alpha: ca });
  tag(g, 1700, 150, a);
}
function agi(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#02020a'], [1, '#08061a']]);
  const cx = W / 2, cy = 500;
  const a = rise(t, S.ls(2) - 0.6, 1.0);
  const grow = ease.out(inv(S.ls(2), S.le(2) + 1.5, t));
  const R = rng(9);
  const branches = [];
  for (let i = 0; i < 70; i++) {
    const ang = R() * TAU, len = 200 + R() * 700;
    let x = cx, y = cy;
    const pts = [[x, y]];
    let aa = ang;
    for (let k = 0; k < 6; k++) { aa += (R() - 0.5) * 0.8; x += Math.cos(aa) * len / 6; y += Math.sin(aa) * len / 6 * 0.7; pts.push([x, y]); }
    branches.push(pts);
  }
  branches.forEach((pts, i) => {
    const part = partialPath(pts, grow * (0.6 + 0.4 * hash(i)));
    g.strokeStyle = rgba(i % 3 ? VIO : CY, 0.25 * a); g.lineWidth = 1.2;
    strokePts(g, part.pts);
    glow(g, part.head[0], part.head[1], 10, i % 3 ? VIO : CY, 0.7 * a * grow);
  });
  const dual = rise(t, S.ls(3) - 0.3, 1.0);
  glow(g, cx, cy, 420, VIO, 0.4 * a);
  glow(g, cx, cy, 170, '#ffffff', 0.85 * a);
  if (dual > 0) {
    g.save();
    g.globalAlpha = dual * 0.75;
    g.beginPath(); g.arc(cx, cy, 160, -Math.PI / 2, Math.PI / 2); g.closePath();
    g.fillStyle = 'rgba(8,6,20,0.85)'; g.fill();
    g.restore();
    text(g, '最强大的工具', cx - 360, cy, { size: 40, weight: 700, font: 'serif', color: '#ffffff', alpha: dual, align: 'right', glow: 14, glowColor: 'rgba(160,140,255,0.6)' });
    text(g, '前所未有的挑战', cx + 360, cy, { size: 40, weight: 700, font: 'serif', color: '#ffb0c8', alpha: rise(t, S.when(3, '挑战') - 0.3, 0.6), align: 'left' });
  }
  text(g, '通用人工智能（AGI）？', cx, 170, { size: 48, weight: 700, font: 'serif', color: '#ffffff', alpha: a * rise(t, S.when(2, '通用人工智能') - 0.2, 0.6), spacing: 6 });
  tag(g, 1700, 150, a, '可能');
}
function future3(g, S) {
  shots(g, S.t, [
    { draw: (c) => popFuture(c, S) },
    { from: S.ls(1) - 0.6, fade: 0.9, draw: (c) => lifeCarbon(c, S) },
    { from: S.ls(2) - 0.6, fade: 0.9, draw: (c) => agi(c, S) },
  ]);
}

// ───────────────────────────── Challenges ─────────────────────────────
const CHALLENGES = [['thermometer', '气候变化', '气候变化'], ['shield-alert', 'AI安全与治理', '安全与治理'], ['scale', '贫富分化', '贫富分化'], ['hourglass', '人口老龄化', '老龄化'], ['biohazard', '新发传染病', '传染病'], ['radiation', '核风险', '核风险']];
function challenges(g, S) {
  const { t } = S;
  bgGradient(g, [[0, '#06040a'], [1, '#100a12']]);
  starfield(g, t, { count: 250, seed: 161, alpha: 0.5 });
  const one = 1 - rise(t, S.ls(1) - 0.6, 0.9);
  if (one > 0) {
    g.save();
    g.globalAlpha = one;
    drawGlobe(g, { cx: W / 2, cy: 500, r: 200, rot: [-60 - t * 4, -15, 0], ocean: ['#1a3a5a', '#08121e'], land: '#4a5a4a', coast: 'rgba(255,200,180,0.3)', atmosphere: '#ff8a6a' });
    CHALLENGES.forEach(([ic, name, key], i) => {
      const ang = -Math.PI / 2 + (i / 6) * TAU;
      const x = W / 2 + Math.cos(ang) * 420, y = 500 + Math.sin(ang) * 300;
      const a = rise(t, S.when(0, key) - 0.2, 0.5);
      g.strokeStyle = rgba('#ff8a6a', 0.3 * a); g.lineWidth = 1.5; g.setLineDash([3, 6]);
      g.beginPath(); g.moveTo(W / 2 + Math.cos(ang) * 210, 500 + Math.sin(ang) * 210); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
      card(g, x - 120, y - 46, 240, 92, { alpha: a, fill: 'rgba(30,10,14,0.75)', stroke: 'rgba(255,138,106,0.5)', r: 14 });
      icon(g, ic, x - 76, y, 44, '#ffb09a', a);
      text(g, name, x + 22, y + 2, { size: 26, weight: 700, font: 'serif', color: '#ffffff', alpha: a, maxWidth: 150 });
    });
    g.restore();
  }
  const two = rise(t, S.ls(1) - 0.4, 0.9);
  if (two > 0) {
    const l = rise(t, S.ls(1) - 0.2, 0.6), r = rise(t, S.when(1, '智慧') - 0.2, 0.6);
    card(g, 300, 330, 580, 360, { alpha: two * l, fill: 'rgba(10,16,30,0.75)', stroke: 'rgba(127,220,255,0.45)', r: 22 });
    icon(g, 'zap', 590, 430, 90, CY, two * l);
    text(g, '技术', 590, 540, { size: 50, weight: 700, font: 'serif', color: '#ffffff', alpha: two * l });
    text(g, '决定我们能走多快', 590, 610, { size: 28, font: 'sans', color: CY, alpha: two * l });
    card(g, 1040, 330, 580, 360, { alpha: two * r, fill: 'rgba(30,22,10,0.75)', stroke: 'rgba(255,210,122,0.5)', r: 22 });
    icon(g, 'compass', 1330, 430, 90, GOLD, two * r);
    text(g, '智慧与合作', 1330, 540, { size: 50, weight: 700, font: 'serif', color: '#ffffff', alpha: two * r });
    text(g, '决定我们走向何方', 1330, 610, { size: 28, font: 'sans', color: GOLD, alpha: rise(t, S.when(1, '走向何方') - 0.3, 0.6) });
  }
}

// ───────────────────────────── Epilogue & end ─────────────────────────────
const RIVER = ['flame', 'wheat', 'scroll', 'columns-3', 'compass', 'sailboat', 'telescope', 'cog', 'lightbulb', 'plane', 'rocket', 'cpu', 'dna', 'brain-circuit', 'orbit'];
function epilogue(g, S) {
  const { t } = S;
  const tilt = ease.inOut(inv(S.ls(1) + 0.4, S.ls(2) + 0.8, t));
  space(g, t + 100, { stars: 0.4 + 0.6 * tilt, nebula: 0.4 + 0.8 * tilt, warm: 1 - tilt });
  // the Milky Way band appears as we look up
  if (tilt > 0) {
    const R = rng(77);
    g.save();
    for (let i = 0; i < 900; i++) {
      const u = R(), v = (R() + R() + R() - 1.5) * 0.25;
      const x = u * W, y = lerp(900, 120, u) + v * 500;
      g.fillStyle = rgba(R() > 0.8 ? '#ffe2c0' : '#d8e4ff', tilt * (0.3 + 0.6 * R()));
      g.fillRect(x, y, 1.6, 1.6);
    }
    g.restore();
    for (let k = 0; k < 6; k++) glow(g, lerp(100, W - 100, k / 5), lerp(860, 160, k / 5), 300, k % 2 ? '#5a4a9a' : '#3a5a9a', 0.22 * tilt);
  }
  // river of milestones
  const ra = env(t, S.ls(0) - 0.5, S.ls(1) + 0.6, 0.8, 0.8);
  if (ra > 0) {
    const pts = [];
    for (let x = -100; x <= W + 100; x += 20) pts.push([x, 520 + 110 * Math.sin(x * 0.004 + 0.8)]);
    glowLine(g, pts, GOLD, 2, ra * 0.6);
    RIVER.forEach((ic, i) => {
      const u = ((t * 0.07 + i / RIVER.length) % 1);
      const x = lerp(-80, W + 80, u), y = 520 + 110 * Math.sin(x * 0.004 + 0.8);
      icon(g, ic, x, y - 70, 64, toHex(mix('#ffb35a', CY, i / (RIVER.length - 1))), ra * Math.sin(Math.PI * u));
    });
    text(g, '好奇与勇气', 560, 260, { size: 44, weight: 700, font: 'serif', color: '#fff0d8', alpha: ra * rise(t, S.when(0, '好奇') - 0.2, 0.6), spacing: 10 });
    text(g, '协作与传承', 1360, 800, { size: 44, weight: 700, font: 'serif', color: '#d8ecff', alpha: ra * rise(t, S.when(0, '协作') - 0.2, 0.6), spacing: 10 });
  }
  // the campfire whose sparks become stars
  const fa = env(t, S.ls(1) - 0.6, S.d, 0.8, 0.5);
  if (fa > 0) {
    const fy = lerp(900, 1400, tilt);
    g.save(); g.globalAlpha = fa;
    campfire(g, W / 2, fy, 0.8, t, 1);
    g.restore();
    embers(g, W / 2, fy - 100, t, { count: 90, alpha: fa, seed: 13, spread: 120, height: 900 + 600 * tilt, speed: 0.8 });
  }
  const fin = rise(t, S.when(2, '而是由') - 0.3, 1.2);
  text(g, '未来，由我们共同书写', W / 2, 430, { size: 96, font: 'brush', color: '#fff6e6', alpha: fin, glow: 30, glowColor: 'rgba(255,200,120,0.55)', spacing: 8 });
  text(g, '2026 → 2056', W / 2, 560, { size: 34, font: 'inter', weight: 300, color: '#cfe6ff', alpha: rise(t, S.when(2, '未来30年') - 0.2, 0.8) * (0.4 + 0.6 * fin), spacing: 12 });
}

function end(g, S) {
  const { t } = S;
  space(g, t + 130, { stars: 1, nebula: 1 });
  const a = rise(t, 0.2, 1.2);
  const tg = g.createLinearGradient(W / 2 - 400, 0, W / 2 + 400, 0);
  tg.addColorStop(0, '#ffcf8a'); tg.addColorStop(0.5, '#fff6e6'); tg.addColorStop(1, '#a9d2ff');
  text(g, '从火种到星辰', W / 2, 330, { size: 130, font: 'brush', color: tg, alpha: a, glow: 30, glowColor: 'rgba(255,190,110,0.5)', spacing: 6 });
  text(g, '人类文明进步史与未来三十年', W / 2, 450, { size: 36, font: 'serif', color: '#efe6d8', alpha: a, spacing: 12 });
  const b = rise(t, 1.2, 1.0);
  const lines = [
    '数据与资料：联合国《世界人口展望2024》、世界银行、Our World in Data、国际能源署（IEA）等',
    '未来部分为基于当前趋势、科研进展与公开规划的展望，并非确定的预测',
    `解说：AI合成语音（${(window.TL && window.TL.voiceLabel) || 'Kokoro'}）　·　画面与配乐：程序生成`,
  ];
  lines.forEach((ln, i) => text(g, ln, W / 2, 620 + i * 52, { size: 24, font: 'sans', color: '#aab6cc', alpha: b }));
}

export const SCENES = { now, future1, future2, future3, challenges, epilogue, end };
