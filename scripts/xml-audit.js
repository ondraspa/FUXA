const fs = require('fs');
const path = require('path');

const WIDGETS = 'server/_widgets';
const broken = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory() && e.name !== 'node_modules') walk(p);
    else if (e.name.endsWith('.svg')) validate(p);
  }
}

function validate(file) {
  const content = fs.readFileSync(file, 'utf8');
  // Use DOMParser-style validation via a simple XML parser check
  // Node's built-in XML parsing via 'xmldom' isn't available; use regex + manual checks
  const issues = [];

  // 1. Check for unescaped '<' outside of tags (bare '<' in text)
  // 2. Check for stray '&' not followed by valid entity
  const ampCheck = /&(?!amp;|lt;|gt;|quot;|apos;|#)/g;
  let m;
  while ((m = ampCheck.exec(content)) !== null) {
    const line = content.substring(0, m.index).split('\n').length;
    issues.push(`line ${line}: bare '&' (not &amp;)`);
  }

  // 3. Check for '<' in script blocks that's not part of a tag (e.g., 'a < b')
  const scriptMatch = content.match(/<script[\s\S]*?<\/script>/g);
  if (scriptMatch) {
    for (const s of scriptMatch) {
      // Strip CDATA markers
      const inner = s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
      // Look for '<' followed by space or letter but not '/' or tag chars
      const badLt = inner.match(/<(?=\s*[a-zA-Z\s])/g);
      if (badLt && !inner.includes('<![CDATA[') && !inner.includes('&lt;')) {
        issues.push('script block has unescaped < without CDATA');
      }
      if (!s.includes('CDATA') && s.includes('<') && !s.includes('&lt;')) {
        // script without CDATA that contains < might be invalid
        const cleanScript = s.replace(/<\/?script[^>]*>/g, '');
        if (/[<](?!\/?[a-zA-Z])/.test(cleanScript)) {
          issues.push('script missing CDATA wrapper with special chars');
        }
      }
    }
  }

  // 4. Check viewBox is valid
  const vb = content.match(/viewBox="([^"]+)"/);
  if (!vb || vb[1].trim().split(/\s+/).length !== 4) issues.push('invalid viewBox');

  // 5. Check for unclosed tags (basic balance check)
  const selfClose = (content.match(/<[a-zA-Z][^>]*\/>/g) || []).length;
  const openTags = (content.match(/<(?!\s*\/?\s*)([a-zA-Z]+)[^>\/]*>/g) || []).length;
  const closeTags = (content.match(/<\/[a-zA-Z][^>]*>/g) || []).length;
  // svg root should be balanced
  if (!content.trim().endsWith('</svg>')) issues.push('file does not end with </svg>');

  // 6. Real XML parse attempt using a tolerant parser
  try {
    // Simple stack-based tag balance check
    const stack = [];
    const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    let tm;
    let balance = 0;
    while ((tm = tagRe.exec(content)) !== null) {
      const full = tm[0];
      const tag = tm[1];
      if (full.endsWith('/>') || tag === '!DOCTYPE' || full.startsWith('<!--')) continue;
      if (full.startsWith('</')) { balance--; if (balance < 0) { issues.push(`tag imbalance near ${tag}`); break; } }
      else balance++;
    }
    if (balance !== 0) issues.push(`unbalanced tags (balance=${balance})`);
  } catch (e) {
    issues.push('parse exception: ' + e.message);
  }

  // 7. Detect real browser-style XML errors: replicate what browsers reject
  // Browsers reject: bare '<' in text, unescaped '&', invalid nesting, bad attribute quotes
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // attribute with unquoted value containing space (e.g., data-port-id=inlet)
    if (/<[a-zA-Z][^>]*=[^"'\s>][^>\s]*\s/.test(l) && !/<\?/.test(l)) {
      // check for `attr=value ` pattern (missing quotes)
      const badAttr = l.match(/<[^>]*\s([a-zA-Z-]+)=([^"'\s][^\s>]*)\s/);
      if (badAttr && !badAttr[2].startsWith('"') && !badAttr[2].startsWith("'")) {
        issues.push(`line ${i+1}: unquoted attribute value ${badAttr[1]}=${badAttr[2]}`);
      }
    }
  }

  if (issues.length > 0) {
    broken.push({ file, issues });
  }
}

walk(WIDGETS);

console.log(`\n=== XML AUDIT: ${broken.length} broken SVGs ===\n`);
broken.forEach(b => {
  console.log(b.file);
  b.issues.forEach(i => console.log('  - ' + i));
});
if (broken.length === 0) console.log('All SVGs pass basic validity checks.');
console.log('\nNote: browser XML parser is stricter; files passing here may still fail in <object> tags.');
