const fs = require('fs');
const path = require('path');

const BASE = 'server/_widgets';

// === 1. Fix atex-duct-3d.svg ===
const duct = `<svg id="fuxa-atex-duct-3d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
<defs>
<linearGradient id="gs" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="30%" stop-color="#cbd5e1"/><stop offset="70%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
<linearGradient id="gi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient>
<linearGradient id="gb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="40%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>
<linearGradient id="gy" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="40%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient>
<filter id="s"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.45"/></filter>
<style>.bg{fill:#dbeafe}.fm{fill:url(#gi);rx:12;filter:url(#s)}.st{fill:url(#gs);stroke:#475569;stroke-width:1.5}.bl{fill:url(#gb)}.ir{fill:url(#gi)}.yw{fill:url(#gy)}.tg{font:9px/1 sans-serif;fill:#64748b;text-anchor:middle;font-weight:600}@keyframes ff{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}.fl{animation:ff .8s linear infinite}
</style></defs>
<rect width="400" height="400" class="bg"/><rect x="12" y="12" width="376" height="376" class="fm"/>
<g transform="translate(200,180)">
<rect x="-80" y="-50" width="160" height="100" rx="8" class="st" filter="url(#s)"/>
<rect x="-75" y="-45" width="150" height="90" rx="5" fill="#1e293b" stroke="#334155"/>
<rect x="-70" y="-35" width="60" height="70" rx="3" fill="#0f172a" stroke="#475569"/>
<rect x="-5" y="-35" width="75" height="70" rx="3" fill="#0f172a" stroke="#475569"/>
<path d="M5,-20 L35,0 L5,20" class="bl" stroke-width="2.5" fill="none" class="fl"/>
<path d="M20,-20 L50,0 L20,20" class="bl" stroke-width="2" fill="none" opacity="0.5" class="fl"/>
<rect x="-10" y="-55" width="20" height="10" rx="3" class="yw"/>
<text x="0" y="-60" class="tg" font-size="8" fill="#f59e0b">ATEX DUCT</text>
<circle cx="15" cy="0" r="6" class="bl"/><circle cx="0" cy="-80" r="0" data-port-id="inlet" data-port-dir="top" data-port-type="duct"/>
<line x1="-85" y1="-20" x2="-80" y2="-20" class="ir" stroke-width="6"/><line x1="80" y1="-20" x2="85" y2="-20" class="ir" stroke-width="6"/>
<text x="0" y="62" class="tg">ATEX DUCT SECTION</text></g>
<script><![CDATA[
//!export-start
var _pn_flow=50;var _pb_status=true;
//!export-end
function postValue(id,v){console.log('FUXA post:',id,'=',v);}
function putValue(id,v){v=Number(v);switch(id){case '_pn_flow':break;}}
var o=new MutationObserver(function(m){m.forEach(function(mu){mu.removedNodes.forEach(function(n){if(n.id==='fuxa-atex-duct-3d'){o.disconnect();}});});});
o.observe(document.body,{childList:true,subtree:true});
]]></script></svg>`;

fs.writeFileSync(path.join(BASE, 'atex', 'atex-duct-3d.svg'), duct);
console.log('Fixed atex-duct-3d.svg');

// === 2. Fix atex-filter-stage-3d.svg ===
const filterStage = `<svg id="fuxa-atex-filter-stage-3d" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
<defs>
<linearGradient id="gs" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f1f5f9"/><stop offset="30%" stop-color="#cbd5e1"/><stop offset="70%" stop-color="#94a3b8"/><stop offset="100%" stop-color="#64748b"/></linearGradient>
<linearGradient id="gi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#94a3b8"/><stop offset="50%" stop-color="#64748b"/><stop offset="100%" stop-color="#334155"/></linearGradient>
<linearGradient id="gb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="40%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient>
<linearGradient id="gy" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbbf24"/><stop offset="40%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#b45309"/></linearGradient>
<filter id="s"><feDropShadow dx="3" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.45"/></filter>
<style>.bg{fill:#dbeafe}.fm{fill:url(#gi);rx:12;filter:url(#s)}.st{fill:url(#gs);stroke:#475569;stroke-width:1.5}.bl{fill:url(#gb)}.ir{fill:url(#gi)}.yw{fill:url(#gy)}.tg{font:9px/1 sans-serif;fill:#64748b;text-anchor:middle;font-weight:600}@keyframes fa{0%,100%{opacity:1}50%{opacity:0.3}}.ala{animation:fa 1s infinite}
</style></defs>
<rect width="400" height="400" class="bg"/><rect x="12" y="12" width="376" height="376" class="fm"/>
<g transform="translate(200,180)">
<rect x="-70" y="-55" width="140" height="110" rx="6" class="st" filter="url(#s)"/>
<rect x="-65" y="-50" width="130" height="100" rx="4" fill="#1e293b" stroke="#334155"/>
<rect x="-55" y="-40" width="45" height="80" rx="3" fill="#0f172a" stroke="#475569"/>
<rect x="-5" y="-40" width="60" height="80" rx="3" fill="#0f172a" stroke="#475569"/>
<path d="M10,-20 Q25,-35 40,-20 Q25,-5 10,-20" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3" id="filter-media"/>
<path d="M10,-5 Q25,-20 40,-5 Q25,10 10,-5" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3"/>
<path d="M10,10 Q25,-5 40,10 Q25,25 10,10" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3 3"/>
<rect x="-8" y="-60" width="16" height="10" rx="3" class="yw"/>
<text x="0" y="-65" class="tg" font-size="8" fill="#f59e0b">ATEX FILTER</text>
<circle cx="0" cy="-80" r="0" data-port-id="inlet" data-port-dir="top" data-port-type="duct"/>
<circle cx="15" cy="-25" r="3" class="ala"/>
<line x1="-80" y1="-10" x2="-70" y2="-10" class="ir" stroke-width="5"/><line x1="70" y1="-10" x2="80" y2="-10" class="ir" stroke-width="5"/>
<text x="0" y="65" class="tg">ATEX FILTER STAGE</text></g>
<script><![CDATA[
//!export-start
var _pn_dp=25;var _pb_blocked=false;
//!export-end
function postValue(id,v){console.log('FUXA post:',id,'=',v);}
function putValue(id,v){v=Number(v);switch(id){case '_pn_dp':break;case '_pb_blocked':var e=document.getElementById('filter-media');e.setAttribute('stroke',v!==0?'#ef4444':'#94a3b8');break;}}
var o=new MutationObserver(function(m){m.forEach(function(mu){mu.removedNodes.forEach(function(n){if(n.id==='fuxa-atex-filter-stage-3d'){o.disconnect();}});});});
o.observe(document.body,{childList:true,subtree:true});
]]></script></svg>`;

fs.writeFileSync(path.join(BASE, 'atex', 'atex-filter-stage-3d.svg'), filterStage);
console.log('Fixed atex-filter-stage-3d.svg');

// === 3. Fix sensor-indicator.svg (root) ===
const sensorContent = fs.readFileSync(path.join(BASE, 'sensor-indicator.svg'), 'utf8');
// Add port, shadow, and observer support
const fixedSensor = sensorContent
  .replace('<svg', '<svg id="fuxa-sensor-indicator"')
  .replace('</defs>', `<filter id="s"><feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.35"/></filter>\n<style>\n@keyframes fa{0%,100%{opacity:1}50%{opacity:0.3}}.ala{animation:fa 1s infinite}\n</style>\n</defs>`)
  .replace('<g transform="translate(200,180)">', '<g transform="translate(200,180)"><circle cx="0" cy="-80" r="0" data-port-id="signal" data-port-dir="top" data-port-type="wire"/>')
  .replace('var o=new MutationObserver', 'function startBlinking(){} var o=new MutationObserver');

fs.writeFileSync(path.join(BASE, 'sensor-indicator.svg'), fixedSensor);
console.log('Fixed sensor-indicator.svg');

console.log('\nAll remaining widgets fixed.');
