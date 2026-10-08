// Visual building blocks shared by several scenes.
import { W, H, TAU, clamp, lerp, hash, fbm1, rgba, glow, bgGradient, starfield, roundRect, canvas, rng } from '../core.js';

export function space(ctx, t, o = {}) {
  const { stars = 1, nebula = 1, seed = 11, drift = 2.5, warm = 0 } = o;
  bgGradient(ctx, [[0, '#020309'], [0.6, '#04071a'], [1, '#090c20']]);
  glow(ctx, W * 0.22, H * 0.28, 760, '#33246e', 0.38 * nebula);
  glow(ctx, W * 0.8, H * 0.66, 860, '#123a74', 0.32 * nebula);
  glow(ctx, W * 0.62, H * 0.16, 520, '#5e2463', 0.2 * nebula);
  if (warm > 0) glow(ctx, W * 0.5, H * 0.95, 900, '#7a3a14', 0.35 * warm);
  starfield(ctx, t, { count: 700, seed, alpha: stars, drift });
}

function flameTongue(ctx, x, y, w, h, sway, a, hot) {
  const g = ctx.createLinearGradient(0, y, 0, y - h);
  g.addColorStop(0, `rgba(255,${hot ? 246 : 225},${hot ? 214 : 160},${0.95 * a})`);
  g.addColorStop(0.22, `rgba(255,196,96,${0.8 * a})`);
  g.addColorStop(0.58, `rgba(255,118,36,${0.5 * a})`);
  g.addColorStop(1, 'rgba(255,60,10,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.bezierCurveTo(x - w / 2, y - h * 0.38, x - w * 0.18 + sway * 0.45, y - h * 0.68, x + sway, y - h);
  ctx.bezierCurveTo(x + w * 0.18 + sway * 0.45, y - h * 0.68, x + w / 2, y - h * 0.38, x + w / 2, y);
  ctx.closePath();
  ctx.fill();
}

// Campfire centred on its base at (x, y); `k` scales the flames (0 = unlit).
export function campfire(ctx, x, y, s, t, k = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (k > 0) glow(ctx, 0, -40, 560 * (0.6 + 0.4 * k), '#ff7424', 0.5 * k * (0.9 + 0.1 * fbm1(t * 6, 3)));
  // logs
  for (const [ang, len, dy] of [[-0.32, 230, 0], [0.3, 230, 0], [0.04, 200, 6]]) {
    ctx.save();
    ctx.rotate(ang);
    roundRect(ctx, -len / 2, dy - 15, len, 30, 15);
    const lg = ctx.createLinearGradient(0, dy - 15, 0, dy + 15);
    lg.addColorStop(0, '#5a3a22');
    lg.addColorStop(1, '#1e120a');
    ctx.fillStyle = lg;
    ctx.fill();
    if (k > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,110,30,${0.35 * k * (0.7 + 0.3 * fbm1(t * 5 + ang * 10, 9))})`;
      roundRect(ctx, -len * 0.25, dy - 12, len * 0.5, 10, 5);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  if (k > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const N = 11;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1) - 0.5;
      const fx = u * 150 + 8 * fbm1(t * 1.7 + i, i + 20);
      const base = (190 + 150 * (1 - Math.abs(u) * 1.7)) * k;
      const h = base * (0.72 + 0.4 * (0.5 + 0.5 * fbm1(t * 3.3 + i * 7.3, i)));
      const w = (52 + 26 * hash(i + 3)) * (0.7 + 0.3 * k);
      const sway = 26 * fbm1(t * 2.4 + i * 3.1, i + 50);
      flameTongue(ctx, fx, -6, w, h, sway, 0.75, i % 3 === 0);
    }
    glow(ctx, 0, -60, 150 * k, '#fff0c0', 0.55 * k);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

// Rising sparks/embers.
export function embers(ctx, x, y, t, o = {}) {
  const { count = 60, spread = 140, height = 620, seed = 3, alpha = 1, speed = 1, color = '#ffb14a' } = o;
  if (alpha <= 0) return;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const life = 2.0 + 2.6 * hash(i * 13 + seed);
    const off = hash(i * 31 + seed) * life;
    const age = (t * speed + off) % life;
    const k = age / life;
    const px = x + (hash(i * 7 + seed) - 0.5) * spread + Math.sin(age * 2.3 + i) * 24 * k + fbm1(age * 0.8 + i, i) * 40 * k;
    const py = y - k * height * (0.55 + 0.6 * hash(i * 17 + seed));
    const a = alpha * Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(t * 9 + i));
    if (a <= 0.01) continue;
    const r = 1.4 + 2.2 * hash(i * 5 + seed);
    ctx.fillStyle = rgba(color, a);
    ctx.beginPath();
    ctx.arc(px, py, r * (1 - k * 0.5), 0, TAU);
    ctx.fill();
    glow(ctx, px, py, 12 * r, '#ff8a2a', a * 0.45);
  }
  ctx.restore();
}

// Rolling silhouette ridge from x=0..W at baseline y.
export function ridge(ctx, y, amp, color, seed, o = {}) {
  const { freq = 0.004, bottom = H } = o;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= W; x += 16) {
    ctx.lineTo(x, y + amp * fbm1(x * freq, seed) + amp * 0.35 * fbm1(x * freq * 3.7, seed + 4));
  }
  ctx.lineTo(W, bottom);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// Seeded particle dust drifting across the frame.
export function dust(ctx, t, o = {}) {
  const { count = 80, color = '#ffd9a0', alpha = 0.4, seed = 5, vx = 12, vy = -4 } = o;
  const R = rng(seed);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = ((R() * W + vx * t * (0.5 + R())) % W + W) % W;
    const y = ((R() * H + vy * t * (0.5 + R())) % H + H) % H;
    const a = alpha * (0.3 + 0.7 * R()) * (0.6 + 0.4 * Math.sin(t * (1 + R() * 2) + i));
    ctx.fillStyle = rgba(color, a);
    const s = 1 + R() * 2;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

// A procedural rock/clay texture (cached by key).
const texCache = new Map();
export function texture(key, w, h, o) {
  if (texCache.has(key)) return texCache.get(key);
  const { base, blobs, dark, light, seed = 1, cracks = 0, grain = 14 } = o;
  const c = canvas(w, h), g = c.getContext('2d');
  const R = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < blobs; i++) {
    const x = R() * w, y = R() * h, r = 20 + R() * 220;
    const col = R() < 0.5 ? dark : light;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, 0.12 + R() * 0.22));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.strokeStyle = rgba(dark, 0.55);
  for (let i = 0; i < cracks; i++) {
    let x = R() * w, y = R() * h;
    g.lineWidth = 0.6 + R() * 1.6;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (R() - 0.5) * 70; y += (R() - 0.3) * 50; g.lineTo(x, y); }
    g.stroke();
  }
  const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (R() - 0.5) * grain;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  texCache.set(key, c);
  return c;
}

// Burst of sparks from (x, y) that started at time t0.
export function sparks(ctx, x, y, t, t0, o = {}) {
  const { n = 26, seed = 1, speed = 520, color = '#ffd27a', dir = -Math.PI / 2, cone = 2.2, life = 0.75, grav = 900 } = o;
  const dt = t - t0;
  if (dt < 0 || dt > life + 0.2) return;
  glow(ctx, x, y, 90, '#ffe6b0', clamp(1 - dt / 0.25) * 0.9);
  for (let i = 0; i < n; i++) {
    const a = dir + (hash(i * 3 + seed) - 0.5) * cone;
    const v = speed * (0.35 + 0.65 * hash(i * 11 + seed));
    const l = life * (0.5 + 0.5 * hash(i * 7 + seed));
    if (dt > l) continue;
    const px = x + Math.cos(a) * v * dt, py = y + Math.sin(a) * v * dt + 0.5 * grav * dt * dt;
    const al = 1 - dt / l;
    ctx.strokeStyle = rgba(color, al);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(a) * v * 0.02, py - (Math.sin(a) * v + grav * dt) * 0.02);
    ctx.stroke();
  }
}

export { lerp };
