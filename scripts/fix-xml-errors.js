/**
 * Fix all XML validity errors in widget SVGs.
 * 1. dynamicSVG: re-extract graphics with stack-based balance (removes doc-comment contamination)
 * 2. Generated widgets: remove duplicate class attributes
 * 3. Escape bare & as &amp; in text content
 * 4. sensor-indicator: remove duplicate id attribute
 */
const fs = require('fs');
const path = require('path');
const WIDGETS = 'server/_widgets';

const DEFS = `<defs>
<linearGradient id="gs" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="30%" stop-color="#cbd5e1"/><stop offset="70%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
<linearGradient id="gi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient>
<linearGradient id="gc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fca5a5"/><stop offset="40%" stop-color="#dc2626"/><stop offset="100%" stop-color="#991b1b"/></linearGradient>
<linearGradient id="gb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="40%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>
<filter id="s"><feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.35"/></filter>
<style>.bkg{fill:#dbeafe}.frm{fill:#0f172a;rx:10;filter:url(#s)}.st{fill:url(#gs);stroke:#334155;stroke-width:.5}.ir{fill:url(#gi)}.bl{fill:url(#gb)}.gr{fill:url(#gg)}.cp{fill:url(#gc)}</style></defs>`;
const FRAME = '<rect width="200" height="200" class="bkg"/><rect x="6" y="6" width="188" height="188" class="frm"/>';

const PORTS = {
  'blower3': [{x:150,y:30,d:'right',t:'duct'}],
  'blower4': [{x:150,y:30,d:'right',t:'duct'}],
  'blower3_flipped': [{x:50,y:30,d:'left',t:'duct'}],
  'blower4_flipped': [{x:50,y:30,d:'left',t:'duct'}],
  'checkvalve_closed': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'checkvalve_open': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'checkvalve_closed_flipped': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'checkvalve_open_flipped': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'compressor3': [{x:50,y:30,d:'left',t:'pipe'}],
  'compressor6': [{x:50,y:30,d:'left',t:'pipe'}],
  'condensor_3d_h1': [{x:15,y:50,d:'left',t:'pipe'},{x:185,y:50,d:'right',t:'pipe'}],
  'conveyor': [{x:100,y:30,d:'top',t:'belt'}],
  'conveyor4': [{x:100,y:30,d:'top',t:'belt'}],
  'conveyor_20degdecline': [{x:100,y:30,d:'top',t:'belt'}],
  'conveyor_20degincline': [{x:100,y:30,d:'top',t:'belt'}],
  'cyclonicseparator': [{x:15,y:80,d:'left',t:'pipe'},{x:185,y:80,d:'right',t:'pipe'}],
  'fanblades': [{x:100,y:170,d:'bottom',t:'shaft'}],
  'flange_3d_1': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'flowmeter': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'flowmeter1': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'gaugedial_3d_h1': [{x:100,y:170,d:'bottom',t:'wire'}],
  'generator_1': [{x:50,y:30,d:'left',t:'shaft'}],
  'heatexchanger_pipetopipe': [{x:15,y:60,d:'left',t:'pipe'},{x:185,y:60,d:'right',t:'pipe'}],
  'heatexchanger_shelltube': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'heatexchanger_singlepipetopipe': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'meter_3d_h1': [{x:100,y:170,d:'bottom',t:'wire'}],
  'meter_3d_h2': [{x:100,y:170,d:'bottom',t:'wire'}],
  'mixer1': [{x:100,y:170,d:'bottom',t:'shaft'}],
};

function makePorts(name) {
  return (PORTS[name] || []).map(p => `<circle cx="${p.x}" cy="${p.y}" r="0" data-port-id="${p.t}" data-port-dir="${p.d}" data-port-type="${p.t}"/>`).join('');
}

// Stack-based extraction of the outermost graphics <g>...</g> after <desc>
function extractGraphics(content) {
  const gStart = content.indexOf('<g>');
  if (gStart === -1) return null;
  let depth = 0, i = gStart;
  const len = content.length;
  while (i < len) {
    if (content.startsWith('<g', i) && content[i+2] !== '/' && !content.startsWith('<g/', i)) {
      // could be <g> or <g ...> or <g .../> 
      const close = content.indexOf('>', i);
      if (close === -1) return null;
      if (content[close-1] !== '/') depth++;
      i = close + 1;
    } else if (content.startsWith('</g>', i)) {
      depth--;
      i += 4;
      if (depth === 0) {
        return content.substring(gStart, i);
      }
    } else {
      i++;
    }
  }
  return null;
}

// ===== 1. Fix dynamicSVG =====
const dynFiles = fs.readdirSync(path.join(WIDGETS, 'dynamicSVG')).filter(f => f.endsWith('.svg'));
// We need ORIGINAL content — but files were overwritten. Recover from git.
const { execSync } = require('child_process');

let restored = 0;
try {
  execSync(`git checkout -- server/_widgets/dynamicSVG/`, { cwd: path.resolve(WIDGETS, '../..'), stdio: 'pipe' });
  restored = dynFiles.length;
  console.log(`Restored ${restored} dynamicSVG originals from git`);
} catch (e) {
  console.log('git restore failed, will try to repair in-place:', e.message);
}

for (const file of dynFiles) {
  const name = file.replace('.svg', '');
  const filePath = path.join(WIDGETS, 'dynamicSVG', file);
  const orig = fs.readFileSync(filePath, 'utf8');

  const graphics = extractGraphics(orig);
  if (!graphics) { console.log('SKIP (no graphics):', file); continue; }

  const newSvg = `<svg id="fuxa-dyn-${name}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">${DEFS}${FRAME}
<g transform="translate(50,50)">${makePorts(name)}
${graphics}
</g>
<script><![CDATA[
//!export-start
var _pn_setState=0;
var _pb_boolState=false;
var _pn_setInterval=500;
var _pc_state0Colour='#808080';
var _pc_state1Colour='#22c55e';
var _pc_state2Colour='#eab308';
var _pc_state3Colour='#ef4444';
var _pc_state4Colour='#a855f7';
var _pc_state5Colour='#3b82f6';
//!export-end
function postValue(id,v){console.log('FUXA post:',id,'=',v);}
function putValue(id,v){v=Number(v);switch(id){
  case '_pn_setState':
    _pn_setState=v;
    var colors=[_pc_state0Colour,_pc_state1Colour,_pc_state2Colour,_pc_state3Colour,_pc_state4Colour,_pc_state5Colour];
    var c=colors[Math.min(v,5)]||'#808080';
    var els=document.querySelectorAll('#shape path,#shape circle,#shape rect');
    for(var k=0;k<els.length;k++){els[k].setAttribute('fill',c);}
    break;
  case '_pb_boolState':
    _pb_boolState=v!==0;
    var c2=_pb_boolState?_pc_state1Colour:_pc_state0Colour;
    var els2=document.querySelectorAll('#shape path,#shape circle,#shape rect');
    for(var j=0;j<els2.length;j++){els2[j].setAttribute('fill',c2);}
    break;
}}
var o=new MutationObserver(function(m){m.forEach(function(mu){mu.removedNodes.forEach(function(n){if(n.id==='fuxa-dyn-${name}'){o.disconnect();}});});});
o.observe(document.body,{childList:true,subtree:true});
]]></script>
</svg>`;

  fs.writeFileSync(filePath, newSvg);
}
console.log('Regenerated', dynFiles.length, 'dynamicSVG widgets');

// ===== 2. Fix duplicate class attributes in generated widgets =====
function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory() && e.name !== 'node_modules') walkFiles(p, out);
    else if (e.name.endsWith('.svg')) out.push(p);
  }
  return out;
}

const genDirs = ['hvac', 'instruments', 'piping', 'pressing', 'pressing-plant', 'galvanoplastics', 'atex', 'classic'];
let dupFixed = 0;
for (const d of genDirs) {
  const dirPath = path.join(WIDGETS, d);
  if (!fs.existsSync(dirPath)) continue;
  for (const f of walkFiles(dirPath)) {
    let c = fs.readFileSync(f, 'utf8');
    // Remove duplicate class attribute: class="X" ... class="Y" -> class="X Y"
    const fixed = c.replace(/class="([^"]*)"([^>]*?)class="([^"]*)"/g, (m, a, mid, b) => {
      // only merge if both are CSS classes (not data- etc.)
      if (mid.includes('=')) return m; // has other attrs between — still merge classes
      return `class="${a} ${b}"${mid}`;
    });
    if (fixed !== c) { fs.writeFileSync(f, fixed); dupFixed++; }
  }
}
console.log('Fixed duplicate class attrs in', dupFixed, 'files');

// ===== 3. Escape bare & in text =====
let ampFixed = 0;
for (const f of walkFiles(WIDGETS)) {
  let c = fs.readFileSync(f, 'utf8');
  // Escape & not already an entity
  const fixed = c.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
  if (fixed !== c) { fs.writeFileSync(f, fixed); ampFixed++; }
}
console.log('Escaped bare & in', ampFixed, 'files');

// ===== 4. Fix sensor-indicator duplicate id =====
const siPath = path.join(WIDGETS, 'sensor-indicator.svg');
let si = fs.readFileSync(siPath, 'utf8');
si = si.replace(/<svg id="fuxa-sensor-indicator" id="sensor_indicator_hmi"/, '<svg id="fuxa-sensor-indicator"');
fs.writeFileSync(siPath, si);
console.log('Fixed sensor-indicator duplicate id');

console.log('\nAll XML fixes applied.');
