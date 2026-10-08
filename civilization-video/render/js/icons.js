// Lucide line icons (ISC licence), rasterised once and tinted on demand.
import { canvas, glow, clamp } from './core.js';

const NAMES = [
  'flame', 'wheat', 'scroll', 'landmark', 'ship', 'compass', 'telescope', 'atom', 'factory', 'train-front',
  'lightbulb', 'plane', 'rocket', 'dna', 'cpu', 'smartphone', 'globe', 'bot', 'brain', 'sun', 'wind', 'zap',
  'orbit', 'moon', 'satellite', 'flask-conical', 'microscope', 'book-open', 'pyramid', 'house', 'printer', 'cog',
  'car', 'syringe', 'heart-pulse', 'leaf', 'thermometer', 'users', 'scale', 'shield-alert', 'biohazard',
  'radiation', 'graduation-cap', 'hand', 'sprout', 'pickaxe', 'mountain', 'sparkles', 'hourglass', 'network',
  'brain-circuit', 'sailboat', 'anchor', 'columns-3', 'feather', 'code', 'stethoscope', 'battery-charging',
  'earth', 'person-standing', 'pill', 'telescope', 'radio-tower', 'message-circle', 'mail', 'phone', 'tv',
  'bug', 'baby', 'trending-up', 'shield-check', 'handshake', 'eye', 'gem', 'tractor', 'tent', 'bird', 'fish',
];
const base = new Map();
const tinted = new Map();
const SIZE = 384;

export async function initIcons() {
  await Promise.all([...new Set(NAMES)].map(async (n) => {
    const r = await fetch(`../node_modules/lucide-static/icons/${n}.svg`);
    if (!r.ok) return;
    let svg = await r.text();
    for (const sw of [1.25, 2]) {
      let s = svg.replace(/width="24"/, `width="${SIZE}"`).replace(/height="24"/, `height="${SIZE}"`)
        .replace(/stroke="currentColor"/, 'stroke="#ffffff"').replace(/stroke-width="2"/, `stroke-width="${sw}"`);
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
      await img.decode();
      base.set(`${n}|${sw}`, img);
    }
  }));
}

function tint(name, color, sw) {
  const key = `${name}|${color}|${sw}`;
  let c = tinted.get(key);
  if (c) return c;
  const img = base.get(`${name}|${sw}`);
  if (!img) return null;
  c = canvas(SIZE, SIZE);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, SIZE, SIZE);
  tinted.set(key, c);
  return c;
}

// Draw icon centred at (x, y).
export function icon(ctx, name, x, y, size, color = '#ffffff', alpha = 1, o = {}) {
  if (alpha <= 0.003) return;
  const { thin = false, glowAmt = 0.6, glowColor = color } = o;
  const c = tint(name, color, thin ? 1.25 : 2);
  if (!c) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  if (glowAmt > 0) glow(ctx, x, y, size * 1.1, glowColor, 0.35 * glowAmt * alpha);
  ctx.drawImage(c, x - size / 2, y - size / 2, size, size);
  ctx.restore();
}
