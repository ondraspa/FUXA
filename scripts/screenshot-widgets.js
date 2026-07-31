/**
 * Widget Screenshot Utility
 * Captures PNG screenshots of every widget SVG from the FUXA API.
 * Usage: node scripts/screenshot-widgets.js [--port 3001] [--dir screenshots]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '3001');
const OUT_DIR = process.argv.find(a => a.startsWith('--dir='))?.split('=')[1] || 'widget-screenshots';

async function waitForServer(url) {
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, res => { res.resume(); resolve(); });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(); });
      });
      return;
    } catch { await new Promise(r => setTimeout(r, 500)); }
  }
  throw new Error('Server timeout');
}

(async () => {
  const base = `http://127.0.0.1:${PORT}`;
  console.log(`Waiting for FUXA server at ${base}...`);
  await waitForServer(base + '/api/resources/widgets');
  console.log('Server OK.');

  const widgets = await new Promise((resolve, reject) => {
    http.get(base + '/api/resources/widgets', res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const outPath = path.resolve(OUT_DIR);
  fs.mkdirSync(outPath, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Use a single persistent page
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } });

  // Suppress font loading issues
  await page.route('**/*.woff*', r => r.abort());
  await page.route('**/*.ttf*', r => r.abort());

  let total = 0;
  for (const group of widgets.groups) {
    const groupDir = path.join(outPath, group.name);
    fs.mkdirSync(groupDir, { recursive: true });

    for (const item of group.items) {
      const url = base + '/' + item.path;
      const safeName = item.name.replace(/\.svg$/i, '.png');
      const filePath = path.join(groupDir, safeName);

      try {
        // Embed SVG directly in an HTML page to avoid font loading issues
        const resp = await new Promise((resolve, reject) => {
          http.get(url, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(d));
          }).on('error', reject);
        });

        // Extract viewBox to set proper size
        const vb = resp.match(/viewBox="([^"]+)"/);
        const [mw, mh] = vb ? [parseInt(vb[1].split(/\s+/)[2]), parseInt(vb[1].split(/\s+/)[3])] : [400, 400];
        const scale = Math.min(500 / Math.max(mw, mh), 2);
        const w = Math.round(mw * scale);
        const h = Math.round(mh * scale);

        const html = `<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px;background:#f1f5f9">${resp}</body></html>`;

        await page.setContent(html, { waitUntil: 'commit', timeout: 5000 });
        await page.setViewportSize({ width: w + 40, height: h + 40 });
        await page.waitForTimeout(100);
        await page.screenshot({ path: filePath, fullPage: false });
        total++;
        process.stdout.write('█');
      } catch (e) {
        process.stdout.write('✗');
      }
    }
  }

  await browser.close();
  console.log(`\n\nDone. ${total}/${widgets.groups.reduce((a,g) => a + g.items.length, 0)} screenshots captured.`);
  console.log(`Review: open ${outPath}/ in your file browser.`);
})();
