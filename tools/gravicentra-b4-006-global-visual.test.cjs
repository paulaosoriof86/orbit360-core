'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const css=fs.readFileSync('orbit360-platform/styles/infra.css','utf8');
const start=css.indexOf('/* B4-006 · Patrón transversal de tablas y tarjetas aprobado');
assert(start>=0,'B4006_GLOBAL_STYLE_MISSING');
const rule=css.slice(start);
const required=['table.tbl thead th','table.tbl tbody td','table.tbl tbody tr:nth-child(even)','table.tbl tbody tr:hover','.page .card:has(table.tbl)','.page .grid > .card','.page .kpi','@media(max-width:760px)'];
for(const term of required)assert(rule.includes(term),'B4006_GLOBAL_STYLE_CONTRACT_MISSING:'+term);
assert(/table\.tbl thead th\s*\{[^}]*background:linear-gradient\([^)]*#333e4c,#202832\)[^}]*color:#fff!important[^}]*text-align:center!important/s.test(rule),'B4006_PREMIUM_TABLE_HEADER_CONTRACT');
for(const path of ['orbit360-platform/modules/cliente360.js','orbit360-platform/modules/polizas.js','orbit360-platform/modules/equipo.js','orbit360-platform/modules/cancelaciones.js','orbit360-platform/modules/cobros.js']){
 const source=fs.readFileSync(path,'utf8');
 assert(source.includes('class="tbl'), 'B4006_RENDERER_TABLE_MISSING:'+path);
}
assert(!rule.includes('display:none'), 'B4006_NO_HIDE_TABLE_HEAD');
console.log('B4006_GLOBAL_TABLE_CARD_SHARED_SOURCE_CONTRACT_PASS; VISUAL_AUTHENTICATED_UAT_PENDING; NO_PRODUCTION_ACCEPTANCE');

assert(/@media\(max-width:360px\)\s*\{\s*\.page \.kpi-row\s*\{grid-template-columns:minmax\(0,1fr\)!important;\}\s*\.page \.kpi\{min-width:0;\}/s.test(css), 'B4006_KPI_320_CARDS_MUST_STACK_WITHOUT_CLIPPING');
