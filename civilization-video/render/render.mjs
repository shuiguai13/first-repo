// Render every frame of the video to frames/NNNNNN.jpg using several headless
// Chromium pages in parallel. Re-running skips frames that already exist.
//   node render/render.mjs [--workers 4] [--from 0] [--to N] [--quality 0.93] [--force]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './server.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
};
const tl = JSON.parse(fs.readFileSync(path.join(root, 'build/timeline.json'), 'utf8'));
const workers = Number(arg('workers', 4));
const from = Number(arg('from', 0));
const to = Number(arg('to', tl.frames));
const quality = Number(arg('quality', 0.93));
const outDir = path.join(root, arg('out', 'frames'));
fs.mkdirSync(outDir, { recursive: true });

const name = (i) => path.join(outDir, `${String(i).padStart(6, '0')}.jpg`);
const todo = [];
const force = process.argv.includes('--force');
for (let i = from; i < to; i++) if (force || !fs.existsSync(name(i))) todo.push(i);
console.log(`${todo.length} of ${to - from} frames to render with ${workers} workers`);

const CHUNK = 60;
const chunks = [];
for (let i = 0; i < todo.length; i += CHUNK) chunks.push(todo.slice(i, i + CHUNK));

const server = await serve(root);
const url = `http://127.0.0.1:${server.address().port}/render/index.html?dither=${arg('dither', 0.03)}`;
const browser = await playwright.chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
let done = 0;
const t0 = Date.now();

async function worker(id) {
  const page = await browser.newPage({ viewport: { width: tl.width, height: tl.height } });
  page.on('pageerror', (e) => console.log(`[worker ${id}] page error:`, e.message));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  while (chunks.length) {
    const chunk = chunks.shift();
    for (const i of chunk) {
      const data = await page.evaluate(([T, q]) => window.frameJPEG(T, q), [i / tl.fps, quality]);
      fs.writeFileSync(name(i), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
      done++;
      if (done % 300 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${todo.length} frames  ${(done / el).toFixed(1)} fps  ETA ${((todo.length - done) / (done / el) / 60).toFixed(1)} min`);
      }
    }
  }
  await page.close();
}

await Promise.all(Array.from({ length: workers }, (_, k) => worker(k)));
await browser.close();
server.close();
console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
