// Render individual timestamps to JPEG for inspection:
//   node render/preview.mjs <outdir> <t1> <t2> ...   (seconds, or scene:offset e.g. fire:12.5)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './server.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outDir, ...times] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const server = await serve(root);
const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/render/index.html`);
await page.evaluate(() => window.ready);
const tl = JSON.parse(fs.readFileSync(path.join(root, 'build/timeline.json'), 'utf8'));
for (const spec of times) {
  let T = Number(spec);
  if (Number.isNaN(T)) {
    const [id, off] = spec.split(':');
    T = tl.scenes.find((s) => s.id === id).start + Number(off || 0);
  }
  const t0 = Date.now();
  const url = await page.evaluate((T) => window.frameJPEG(T, 0.9), T);
  const ms = Date.now() - t0;
  const file = path.join(outDir, `${spec.replace(':', '_')}.jpg`);
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`${file}  T=${T.toFixed(2)}  ${ms}ms`);
}
await browser.close();
server.close();
