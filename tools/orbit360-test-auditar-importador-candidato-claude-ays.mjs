#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-import-audit-'));
const cand = path.join(root,'orbit360-platform');
fs.mkdirSync(path.join(cand,'core'), { recursive:true });
fs.mkdirSync(path.join(cand,'modules'), { recursive:true });

function write(rel, txt){ const p = path.join(cand, rel); fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, txt); }

write('core/importa.js', `
function monedaDe(pais){ return pais === 'GT' ? 'GTQ' : 'COP'; }
function finmovShape(rec){ const pais = rec.pais || rec._paisHoja || ''; const cur = rec.moneda || monedaDe(pais) || rec._monedaHoja || ''; return {pais, moneda:cur}; }
const IMPORT_MAP = { 'planillas-comision': { coll:'comisiones', fields:{ aseguradora:['aseguradora'], monto:['monto'] } }, 'documentos': { coll:'clientes', scopedUpdate:true } };
function x(row){ row._origenHoja='GT'; row._numeroFila=2; const rec = {}; Object.keys(idx).forEach(f => { const v = cells[idx[f]]; if (v != null && v !== '') rec[f] = v; }); }
function tarifasDetect(){}; Orbit.comeng.aplicarPlanilla([]);
`);
write('core/integraciones-panel.js', 'const x = "LAB Simular";');
write('modules/configuracion.js', 'const y = "Pendiente de backend";');
write('modules/correo.js', 'const z = "modo demo";');
write('core/config.js', "const cierre='2026-04';");
write('core/ia.js', ''); write('core/integraciones.js',''); write('modules/finanzas.js',''); write('modules/siniestros.js',''); write('modules/portal.js','');

const script = path.resolve('tools/orbit360-auditar-importador-candidato-claude-ays.mjs');
const r = spawnSync(process.execPath, [script, '--candidate', cand], { encoding:'utf8' });
if(r.status !== 1) { console.error('Esperaba exit 1 por bloqueos'); console.error(r.stdout); console.error(r.stderr); process.exit(1); }
const out = JSON.parse(r.stdout);
const codes = new Set(out.findings.map(f => f.code));
for(const c of ['TRACE_NOT_COPIED','CURRENCY_DEFAULT_WRITE','COMMISSION_SHEET_CONTRACT','COMMISSION_SHEET_COUNTRY_CURRENCY','DOCUMENTS_UPDATE_CLIENTS']){
  if(!codes.has(c)){ console.error('Falta código', c, out); process.exit(1); }
}
console.log('OK - auditor importador candidato detecta bloqueos P0 sintéticos.');
