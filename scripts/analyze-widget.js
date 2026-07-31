/**
 * Widget Analysis Utility
 * 
 * Analyzes a widget SVG and suggests visual improvements.
 * Usage: node scripts/analyze-widget.js <path-to-svg-file>
 * 
 * When provided with a screenshot path, this loads the corresponding SVG
 * and analyzes it for visual quality issues.
 */

const fs = require('fs');
const path = require('path');

const svgPath = process.argv[2];
if (!svgPath) {
  console.error('Usage: node scripts/analyze-widget.js <path-to-svg-file>');
  console.error('  Or:  node scripts/analyze-widget.js <path-to-screenshot.png>');
  process.exit(1);
}

const absPath = path.resolve(svgPath);
const isSvg = absPath.endsWith('.svg');

// If a PNG is given, look for the corresponding SVG
let svgFile = absPath;
if (!isSvg) {
  const svgCandidate = absPath.replace(/\.\w+$/, '.svg');
  if (fs.existsSync(svgCandidate)) svgFile = svgCandidate;
  else {
    // Search _widgets for matching filename
    const name = path.basename(absPath).replace(/\.\w+$/, '');
    const find = require('child_process').execSync(`find server/_widgets -name "${name}.svg" 2>/dev/null`).toString().trim();
    if (find) svgFile = path.resolve(find.split('\n')[0]);
  }
}

if (!fs.existsSync(svgFile)) {
  console.error(`Cannot find SVG for: ${absPath}`);
  process.exit(1);
}

const content = fs.readFileSync(svgFile, 'utf8');

// Analysis
const issues = [];

// Check viewBox
const vbMatch = content.match(/viewBox="([^"]+)"/);
if (vbMatch) {
  const parts = vbMatch[1].split(/\s+/).map(Number);
  if (parts[2] && parts[3]) {
    const ratio = parts[2] / parts[3];
    if (ratio < 0.5 || ratio > 2) issues.push(`Non-standard aspect ratio: ${ratio.toFixed(2)} (${vbMatch[1]})`);
  }
}

// Check gradients
const gradCount = (content.match(/<linearGradient/g) || []).length;
if (gradCount < 2) issues.push(`Only ${gradCount} gradients — consider adding depth with metallic/highlight gradients`);

// Check shadows
if (!content.includes('feDropShadow') && !content.includes('filter')) issues.push('No drop shadow — widgets may look flat');

// Check FUXA integration
if (!content.includes('putValue')) issues.push('Missing putValue() — no FUXA data binding');
if (!content.includes('MutationObserver')) issues.push('Missing MutationObserver — no cleanup on DOM removal');
if (!content.includes('//!export-start')) issues.push('Missing variable exports — no configurable properties');
if (!content.includes('data-port-id')) issues.push('Missing connection ports');

// Check animation
if (!content.includes('@keyframes') && !content.includes('requestAnimationFrame')) issues.push('No animations — widget is static');

// Check element IDs for FUXA binding
const ids = content.match(/\sid="([^"]+)"/g);
if (!ids || ids.length < 2) issues.push('Few or no element IDs — FUXA cannot bind to individual parts');

// Summary
console.log(`\n=== Widget Analysis: ${path.basename(svgFile)} ===\n`);
console.log(`Size: ${(content.length / 1024).toFixed(1)} KB`);
console.log(`ViewBox: ${vbMatch ? vbMatch[1] : 'missing'}`);
console.log(`Gradients: ${gradCount}`);
console.log(`Element IDs: ${ids ? ids.length : 0}`);
console.log(`\nIssues (${issues.length}):`);
issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));

if (issues.length === 0) console.log('  ✓ No issues found — widget looks good!\n');

// Quality score
const score = Math.max(0, 10 - issues.length);
const bars = '█'.repeat(score) + '░'.repeat(10 - score);
console.log(`Quality: ${bars} ${score}/10\n`);
