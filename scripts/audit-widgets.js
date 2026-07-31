const fs = require('fs');
const path = require('path');

const WIDGETS = 'server/_widgets';
const results = [];

function walk(dir, cat) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = dir + '/' + e.name;
    if (e.isDirectory() && e.name !== 'node_modules') walk(p, e.name);
    else if (e.name.endsWith('.svg')) analyze(p, cat || path.basename(dir), e.name);
  }
}

function analyze(file, cat, fname) {
  const content = fs.readFileSync(file, 'utf8');
  let issues = 0;
  const details = [];

  const g = (content.match(/<linearGradient/g) || []).length;
  const r = (content.match(/<radialGradient/g) || []).length;
  if (g + r < 2) { issues++; details.push('gradients=' + (g+r)); }

  if (!content.includes('feDropShadow')) { issues++; details.push('no-shadow'); }
  if (!content.includes('data-port-id')) { issues++; details.push('no-ports'); }
  if (!content.includes('!export-start')) { issues++; details.push('no-exports'); }
  if (!content.includes('putValue')) { issues++; details.push('no-putValue'); }
  if (!content.includes('MutationObserver')) { issues++; details.push('no-observer'); }
  if (!content.includes('@keyframes') && !content.includes('requestAnimationFrame')) { issues++; details.push('no-anim'); }
  const ids = (content.match(/\sid="/g) || []).length;
  if (ids < 2) { issues++; details.push('ids=' + ids); }

  results.push({ file: fname, cat, score: Math.max(0, 10 - issues), issues, details });
}

walk(WIDGETS, 'root');

results.sort((a, b) => a.score - b.score);

console.log('=== WORST WIDGETS (needs fixes) ===');
results.filter(r => r.score < 7).forEach(r => {
  console.log('  ' + r.cat + '/' + r.file + '  score=' + r.score + '/10  ' + (r.details.length ? r.details.join(', ') : ''));
});

console.log('\n=== PERFECT SCORE (10/10) ===');
results.filter(r => r.score === 10).forEach(r => {
  console.log('  ' + r.cat + '/' + r.file);
});

console.log('\n=== SUMMARY ===');
console.log('Total: ' + results.length + ' widgets');
console.log('Need fixes (score<7): ' + results.filter(r => r.score < 7).length);
console.log('Good (score 7-9): ' + results.filter(r => r.score >= 7 && r.score < 10).length);
console.log('Perfect (score 10): ' + results.filter(r => r.score === 10).length);

console.log('\n=== BY CATEGORY ===');
const byCat = {};
results.forEach(r => {
  if (!byCat[r.cat]) byCat[r.cat] = { total: 0, bad: 0, avg: 0 };
  byCat[r.cat].total++;
  if (r.score < 7) byCat[r.cat].bad++;
  byCat[r.cat].avg += r.score;
});
Object.entries(byCat).sort().forEach(([c, v]) => {
  console.log('  ' + c + ': ' + v.total + ' widgets, ' + v.bad + ' bad, avg=' + (v.avg/v.total).toFixed(1));
});
