/**
 * Browser XML-validity audit for widget SVGs.
 * Loads each SVG in a headless browser exactly like an <object> tag would,
 * and captures the XML parser error (line/column) if it fails.
 * Usage: node scripts/xml-audit-browser.js [--port 3001]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '3001';
const WIDGETS = 'server/_widgets';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory() && e.name !== 'node_modules') walk(p, out);
    else if (e.name.endsWith('.svg')) out.push(p.replace('server/_widgets/', ''));
  }
  return out;
}

(async () => {
  const files = walk(WIDGETS);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const base = `http://127.0.0.1:${PORT}/_widgets/`;

  const broken = [];

  for (const f of files) {
    try {
      const resp = await page.goto(base + f, { waitUntil: 'commit', timeout: 8000 });
      await page.waitForTimeout(150);
      const bodyText = await page.evaluate(() => document.body?.innerText || '');
      if (bodyText.includes('This page contains the following errors') ||
          bodyText.includes('error on line') ||
          bodyText.includes('XML Parsing Error') ||
          bodyText.includes('Below is a rendering of the page')) {
        // Extract error line info
        const lineMatch = bodyText.match(/error on line (\d+) at column (\d+)/);
        broken.push({
          file: f,
          error: lineMatch ? `line ${lineMatch[1]} col ${lineMatch[2]}` : 'unknown XML error',
        });
        process.stdout.write('✗');
      } else {
        process.stdout.write('█');
      }
    } catch (e) {
      process.stdout.write('?');
    }
  }

  await browser.close();

  console.log(`\n\n=== ${broken.length} SVGs FAIL browser XML parse ===\n`);
  broken.forEach(b => console.log(`${b.file}  →  ${b.error}`));

  // Save for the fix step
  fs.writeFileSync('broken-svgs.json', JSON.stringify(broken, null, 2));
  console.log('\nSaved list to broken-svgs.json');
})();
