const fs = require('fs');
const file = process.argv[2] || 'server/_widgets/dynamicSVG/blower3.svg';
const c = fs.readFileSync(file, 'utf8');
const opens = (c.match(/<g[\s>]/g) || []).length;
const closes = (c.match(/<\/g>/g) || []).length;
console.log(file);
console.log('<g> count:', opens, '  </g> count:', closes);

// Show structure: where does wrapper g end?
const wrapIdx = c.indexOf('scale(1)">');
console.log('\n--- content right after wrapper g ---');
console.log(c.substring(wrapIdx, wrapIdx + 200));
console.log('\n--- content before <script> ---');
const scriptIdx = c.indexOf('<script>');
console.log(c.substring(scriptIdx - 250, scriptIdx));
