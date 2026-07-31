/**
 * Rebuild all dynamicSVG widgets cleanly.
 * Extracts only the named graphics groups (shape/dark/light/hlight/shadow/linear)
 * from current files and rewraps them — drops desc, doc-comment, and wrapper contamination.
 */
const fs = require('fs');
const path = require('path');
const DIR = 'server/_widgets/dynamicSVG';

const DEFS = `<defs>
<linearGradient id="gs" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="30%" stop-color="#cbd5e1"/><stop offset="70%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
<linearGradient id="gi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient>
<linearGradient id="gc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fca5a5"/><stop offset="40%" stop-color="#dc2626"/><stop offset="100%" stop-color="#991b1b"/></linearGradient>
<linearGradient id="gb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="40%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>
<filter id="s"><feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.35"/></filter>
<style>.bkg{fill:#dbeafe}.frm{fill:#0f172a;rx:10;filter:url(#s)}</style></defs>`;
const FRAME = '<rect width="200" height="200" class="bkg"/><rect x="6" y="6" width="188" height="188" class="frm"/>';

const PORTS = {
  'blower3': [{x:150,y:30,d:'right',t:'duct'}], 'blower4': [{x:150,y:30,d:'right',t:'duct'}],
  'blower3_flipped': [{x:50,y:30,d:'left',t:'duct'}], 'blower4_flipped': [{x:50,y:30,d:'left',t:'duct'}],
  'checkvalve_closed': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'checkvalve_open': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'checkvalve_closed_flipped': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'checkvalve_open_flipped': [{x:15,y:100,d:'left',t:'pipe'},{x:185,y:100,d:'right',t:'pipe'}],
  'compressor3': [{x:50,y:30,d:'left',t:'pipe'}], 'compressor6': [{x:50,y:30,d:'left',t:'pipe'}],
  'condensor_3d_h1': [{x:15,y:50,d:'left',t:'pipe'},{x:185,y:50,d:'right',t:'pipe'}],
  'conveyor': [{x:100,y:30,d:'top',t:'belt'}], 'conveyor4': [{x:100,y:30,d:'top',t:'belt'}],
  'conveyor_20degdecline': [{x:100,y:30,d:'top',t:'belt'}], 'conveyor_20degincline': [{x:100,y:30,d:'top',t:'belt'}],
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
  'meter_3d_h1': [{x:100,y:170,d:'bottom',t:'wire'}], 'meter_3d_h2': [{x:100,y:170,d:'bottom',t:'wire'}],
  'mixer1': [{x:100,y:170,d:'bottom',t:'shaft'}],
};

function makePorts(name) {
  return (PORTS[name] || []).map(p => `<circle cx="${p.x}" cy="${p.y}" r="0" data-port-id="${p.t}" data-port-dir="${p.d}" data-port-type="${p.t}"/>`).join('');
}

// Extract balanced <g id="NAME">...</g> groups
function extractGroups(content, names) {
  const parts = [];
  for (const name of names) {
    const marker = `<g id="${name}"`;
    let start = content.indexOf(marker);
    if (start === -1) continue;
    let depth = 0, i = start;
    while (i < content.length) {
      if (content.startsWith('<g', i)) {
        const close = content.indexOf('>', i);
        if (close === -1) break;
        if (content[close - 1] !== '/') depth++;
        i = close + 1;
      } else if (content.startsWith('</g>', i)) {
        depth--; i += 4;
        if (depth === 0) { parts.push(content.substring(start, i)); break; }
      } else i++;
    }
  }
  return parts.join('\n');
}

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.svg'));
const GROUP_IDS = ['shape', 'dark', 'light', 'hlight', 'shadow', 'linear'];
let ok = 0, fail = 0;

for (const file of files) {
  const name = file.replace('.svg', '');
  const filePath = path.join(DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const graphics = extractGroups(content, GROUP_IDS);
  if (!graphics) { console.log('FAIL (no groups):', file); fail++; continue; }

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
  ok++;
}
console.log(`\nRebuilt ${ok} dynamicSVG widgets, ${fail} failed`);
