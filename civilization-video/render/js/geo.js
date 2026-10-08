// World geometry: a Pacific-centred flat map (as on Chinese world maps) and an
// orthographic globe. Data: Natural Earth via the world-atlas package.
import { W, H, TAU, rng, clamp, glow, rgba, canvas } from './core.js';

const d3 = window.d3, topojson = window.topojson;
export const G = {};

export async function initGeo() {
  const [l110, l50] = await Promise.all([
    fetch('../node_modules/world-atlas/land-110m.json').then((r) => r.json()),
    fetch('../node_modules/world-atlas/land-50m.json').then((r) => r.json()),
  ]);
  G.land110 = topojson.feature(l110, l110.objects.land);
  G.land50 = topojson.feature(l50, l50.objects.land);

  // Flat map: Natural Earth projection rotated so the seam lies in the Atlantic.
  const proj = d3.geoNaturalEarth1().rotate([-150, 0]).fitExtent([[40, 60], [W - 40, H - 60]], { type: 'Sphere' });
  G.flatProj = proj;
  const path = d3.geoPath(proj);
  G.flatLand = new Path2D(path(G.land50));
  G.flatSphere = new Path2D(path({ type: 'Sphere' }));
  G.flatGrat = new Path2D(path(d3.geoGraticule().step([20, 20])()));

  // Equirectangular land mask for point sampling.
  const mw = 1440, mh = 720, mc = canvas(mw, mh), mg = mc.getContext('2d');
  const eq = d3.geoEquirectangular().translate([mw / 2, mh / 2]).scale(mw / TAU);
  mg.fillStyle = '#fff';
  mg.fill(new Path2D(d3.geoPath(eq)(G.land110)));
  const mask = mg.getImageData(0, 0, mw, mh).data;
  G.isLand = (lon, lat) => {
    const x = Math.floor(((lon + 180) / 360) * mw), y = Math.floor(((90 - lat) / 180) * mh);
    return x >= 0 && y >= 0 && x < mw && y < mh && mask[(y * mw + x) * 4] > 128;
  };
  G.lights = sampleLights(2600);
}

// Rough population hot-spots: [lon, lat, weight, spread(deg)].
const HOT = [
  [115, 32, 1.0, 6], [116, 37, 0.8, 4], [104, 30, 0.5, 3], [113, 23, 0.6, 2.5], [121, 31, 0.6, 2],
  [82, 26, 1.0, 6], [78, 12, 0.6, 4], [73, 19, 0.45, 2], [90, 23.5, 0.5, 2], [72, 30, 0.5, 4],
  [137, 36, 0.6, 2.5], [127, 37, 0.45, 1.5], [110, -7, 0.55, 2.5], [121, 14, 0.3, 2.5], [106, 16, 0.3, 4],
  [8, 49, 0.9, 8], [-1.5, 52.5, 0.4, 2], [12, 43, 0.4, 3], [37.6, 55.7, 0.3, 4], [21, 52, 0.3, 4],
  [31, 30, 0.45, 1.5], [7, 8, 0.5, 4], [39, 9, 0.3, 3], [33, -1, 0.3, 4], [28, -26, 0.25, 3],
  [-78, 39, 0.7, 6], [-88, 41, 0.4, 5], [-119, 35, 0.4, 3], [-97, 31, 0.3, 4], [-80, 27, 0.25, 2],
  [-99, 19.5, 0.5, 3], [-46, -22, 0.5, 4], [-58.4, -34.6, 0.3, 2], [-74, 5, 0.3, 3], [-77, -12, 0.2, 2],
  [44, 33, 0.3, 4], [32, 39, 0.35, 4], [51, 35, 0.3, 4], [46, 24, 0.2, 3], [100, 14, 0.3, 3], [151, -33.8, 0.2, 2],
];
function density(lon, lat) {
  let d = 0.04;
  for (const [x, y, w, s] of HOT) {
    let dx = lon - x;
    if (dx > 180) dx -= 360; else if (dx < -180) dx += 360;
    const dy = lat - y;
    d += w * Math.exp(-(dx * dx + dy * dy) / (2 * s * s));
  }
  return Math.min(1, d);
}
function sampleLights(n) {
  const R = rng(4242), pts = [];
  let guard = 0;
  while (pts.length < n && guard++ < 400000) {
    const lon = R() * 360 - 180, lat = (Math.asin(2 * R() - 1) * 180) / Math.PI;
    if (lat < -56 || lat > 72) continue;
    if (!G.isLand(lon, lat)) continue;
    if (R() > density(lon, lat)) continue;
    pts.push([lon, lat, R(), density(lon, lat)]);
  }
  return pts;
}

// ---------- flat map ----------
export const fp = (lon, lat) => G.flatProj([lon, lat]);

// cam = {x, y, z}: map point (x, y) placed at screen centre with zoom z.
export function camApply(ctx, cam) {
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
}
export function camPoint(cam, p) {
  return [(p[0] - cam.x) * cam.z + W / 2, (p[1] - cam.y) * cam.z + H / 2];
}
export function camFor(lon0, lat0, lon1, lat1, pad = 1.0) {
  const a = fp(lon0, lat1), b = fp(lon1, lat0);
  const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
  const z = Math.min(W / Math.abs(b[0] - a[0]), H / Math.abs(b[1] - a[1])) * pad;
  return { x, y, z };
}
export const camLerp = (a, b, t) => ({
  x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t),
});

export function drawFlatMap(ctx, cam, o = {}) {
  const {
    land = '#2a2f3a', coast = 'rgba(255,220,170,0.35)', ocean = null, grat = 'rgba(255,255,255,0.05)',
    alpha = 1, coastWidth = 1.2,
  } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  camApply(ctx, cam);
  if (ocean) { ctx.fillStyle = ocean; ctx.fill(G.flatSphere); }
  if (grat) { ctx.strokeStyle = grat; ctx.lineWidth = 1 / cam.z; ctx.stroke(G.flatGrat); }
  ctx.fillStyle = land;
  ctx.fill(G.flatLand);
  if (coast) { ctx.strokeStyle = coast; ctx.lineWidth = coastWidth / cam.z; ctx.stroke(G.flatLand); }
  ctx.restore();
}

// Dense geographic route through waypoints (great-circle interpolation).
export function geoRoute(points, perSeg = 24) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const f = d3.geoInterpolate(points[i], points[i + 1]);
    for (let s = 0; s < perSeg; s++) out.push(f(s / perSeg));
  }
  out.push(points[points.length - 1]);
  return out;
}
export function routeLength(route) {
  let L = 0;
  for (let i = 1; i < route.length; i++) L += d3.geoDistance(route[i - 1], route[i]);
  return L;
}
// Leading part of a dense route, p in 0..1 (by arc length).
export function routePart(route, p) {
  const L = routeLength(route) * clamp(p);
  let acc = 0;
  const out = [route[0]];
  for (let i = 1; i < route.length; i++) {
    const d = d3.geoDistance(route[i - 1], route[i]);
    if (acc + d >= L) {
      out.push(d3.geoInterpolate(route[i - 1], route[i])(d ? (L - acc) / d : 0));
      return out;
    }
    acc += d;
    out.push(route[i]);
  }
  return out;
}

// ---------- globe ----------
export function globeProj(cx, cy, r, rot) {
  return d3.geoOrthographic().translate([cx, cy]).scale(r).rotate(rot).clipAngle(90).precision(0.5);
}

export function drawGlobe(ctx, o) {
  const {
    cx = W / 2, cy = H / 2, r = 380, rot = [0, -15, 0], alpha = 1,
    ocean = ['#0b2a4a', '#04101f'], land = '#1d3b2a', coast = 'rgba(180,230,255,0.35)',
    grat = 'rgba(160,200,255,0.08)', atmosphere = '#4aa8ff', lights = 0, lightColor = '#ffd27a',
    night = 0, detail = 110,
  } = o;
  if (alpha <= 0) return null;
  const proj = globeProj(cx, cy, r, rot);
  const path = d3.geoPath(proj, ctx);
  ctx.save();
  ctx.globalAlpha *= alpha;
  // atmosphere halo
  glow(ctx, cx, cy, r * 1.35, atmosphere, 0.35);
  // ocean
  const og = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  og.addColorStop(0, ocean[0]);
  og.addColorStop(1, ocean[1]);
  ctx.beginPath(); path({ type: 'Sphere' });
  ctx.fillStyle = og; ctx.fill();
  if (grat) {
    ctx.beginPath(); path(d3.geoGraticule10());
    ctx.strokeStyle = grat; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.beginPath(); path(detail === 50 ? G.land50 : G.land110);
  ctx.fillStyle = land; ctx.fill();
  if (coast) { ctx.strokeStyle = coast; ctx.lineWidth = 1; ctx.stroke(); }
  // limb darkening / lighting
  const lg = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.2, cx, cy, r * 1.02);
  lg.addColorStop(0, 'rgba(255,255,255,0.10)');
  lg.addColorStop(0.55, 'rgba(0,0,0,0)');
  lg.addColorStop(1, `rgba(0,0,0,${0.55 + night * 0.35})`);
  ctx.beginPath(); path({ type: 'Sphere' });
  ctx.fillStyle = lg; ctx.fill();
  if (lights > 0) drawLights(ctx, proj, rot, lights, lightColor);
  // rim
  ctx.beginPath(); path({ type: 'Sphere' });
  ctx.strokeStyle = rgba(atmosphere, 0.55); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  return proj;
}

function drawLights(ctx, proj, rot, amount, color) {
  const center = [-rot[0], -rot[1]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [lon, lat, k, dens] of G.lights) {
    if (k > amount) continue;
    const d = d3.geoDistance(center, [lon, lat]);
    if (d > Math.PI / 2 - 0.05) continue;
    const p = proj([lon, lat]);
    const a = (0.35 + 0.65 * dens) * Math.cos(d) * 0.9;
    ctx.fillStyle = rgba(color, a);
    const s = 1.2 + dens * 1.6;
    ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
  }
  ctx.restore();
}

export function visible(rot, lonlat) {
  return d3.geoDistance([-rot[0], -rot[1]], lonlat) < Math.PI / 2 - 0.02;
}

// Draw a (partial) route on a globe projection.
export function globeRoute(ctx, proj, route, p, color, width = 3, alpha = 1) {
  if (p <= 0) return null;
  const part = routePart(route, p);
  const path = d3.geoPath(proj, ctx);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const [wMul, a] of [[5, 0.16], [2.2, 0.35], [1, 1]]) {
    ctx.beginPath(); path({ type: 'LineString', coordinates: part });
    ctx.strokeStyle = rgba(color, a); ctx.lineWidth = width * wMul; ctx.stroke();
  }
  ctx.restore();
  return part[part.length - 1];
}
