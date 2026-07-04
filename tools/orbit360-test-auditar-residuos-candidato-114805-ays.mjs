#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(),'orbit360-residual-114805-'));
const cand = path.join(root,'orbit360-platform');
fs.mkdirSync(path.join(cand,'core'), {recursive:true});
fs.mkdirSync(path.join(cand,'modules'), {recursive:true});
fs.mkdirSync(path.join(cand,'tools'), {recursive:true});

fs.writeFileSync(path.join(cand,'core','importa.js'), `
const paisHoja='GT', sn='GT Enero';
const monedaHoja = detectaMoneda(sn) || monedaDe(paisHoja), periodoHoja = detectaPeriodo(sn);
function build(rec){ rec.pais = normPais(rec.pais); rec.moneda = rec.pais === 'CO' ? 'COP' : 'GTQ'; }
const SCOPE = { 'documentos': { crea: ['clientes'], label: ['Documentos'] } };
`);
fs.writeFileSync(path.join(cand,'tools','orbit360-validate-marketing-integraciones.mjs'), `check('core/integraciones-panel.js contiene Simular')`);
fs.writeFileSync(path.join(cand,'core','integraciones.js'), `const d='2026-01-01';`);
fs.writeFileSync(path.join(cand,'core','ui.js'), ``);
fs.writeFileSync(path.join(cand,'modules','portal.js'), ``);
fs.writeFileSync(path.join(cand,'modules','siniestros.js'), ``);

const script = path.resolve('tools/orbit360-auditar-residuos-candidato-114805-ays.mjs');
const r = spawnSync(process.execPath, [script, '--candidate', cand], {encoding:'utf8'});
if(r.status !== 1){ console.error('Esperaba BLOQUEADO'); console.error(r.stdout); console.error(r.stderr); process.exit(1); }
const out = JSON.parse(r.stdout);
const codes = new Set(out.findings.map(f => f.code));
for(const c of ['MONEDA_HOJA_INFERIDA_POR_PAIS','CLIENTE_DEFAULT_GUATE_GTQ','SCOPE_DOCUMENTOS_CLIENTES','VALIDADOR_SIMULAR_OBSOLETO']){
  if(!codes.has(c)){ console.error('Falta código', c, out); process.exit(1); }
}
console.log('OK - auditor residual 114805 detecta bloqueos y revisión esperados.');
