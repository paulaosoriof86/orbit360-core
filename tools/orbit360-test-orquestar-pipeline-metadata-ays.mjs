#!/usr/bin/env node
/* Orbit 360 A&S — pruebas sintéticas del orquestador metadata-only */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-orquestar-pipeline-metadata-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'orquestador-pipeline-metadata');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function run(id, manifest, candidates, expectedExit, needles){
  const mFile = path.join(tmp, `${id}.manifest.json`);
  const cFile = path.join(tmp, `${id}.candidates.json`);
  writeJson(mFile, manifest); writeJson(cFile, candidates);
  const res = spawnSync(process.execPath, [tool, '--manifest', mFile, '--candidates', cFile], { cwd:root, encoding:'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expectedExit && needles.every(n => out.includes(n));
  results.push(`${ok ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe orquestador.'); process.exit(1); }
const manifestOk = {
  tenant_id:'alianzas-soluciones', manifest_id:'manifest_orq_ok', source_type:'estado_cuenta_bancario', file:'sintetico.xlsx', file_hash:'sha256:synthetic', country:'GT', currency:'GTQ', estimated_rows:1,
  schema:{ fields:['Fecha','Descripción','Monto','Moneda','País','Referencia'] }
};
const candOk = { candidates:[{ state:'LISTO', source_ref:{file:'sintetico.xlsx', sheet:'Hoja1', row_ref:'row-001'}, country:'GT', currency:'GTQ', score:96, score_decision:'MATCH_EXACTO', proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION' }] };
run('pipeline-ok', manifestOk, candOk, 0, ['Decision: PIPELINE_LISTO', 'validar_dryrun', 'RESULTADO: OK']);
run('pipeline-moneda-bloquea', {...manifestOk, currency:'COP'}, candOk, 1, ['Decision: PIPELINE_BLOQUEADO']);
run('pipeline-candidato-bloquea', manifestOk, { candidates:[{...candOk.candidates[0], source_ref:{file:'sintetico.xlsx', sheet:'Hoja1'}}] }, 1, ['Decision: PIPELINE_BLOQUEADO']);
run('pipeline-advertencia', manifestOk, { candidates:[{...candOk.candidates[0], proposed_action:'PROPONER_REVISION'}] }, 0, ['Decision: PIPELINE_LISTO_CON_ADVERTENCIAS']);
const output = ['============================================================','ORBIT 360 A&S — TEST ORQUESTADOR PIPELINE METADATA',`Fecha: ${new Date().toISOString()}`,'Restricciones: sintético, sin datos reales, sin writes, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports, { recursive:true });
fs.writeFileSync(path.join(reports, 'TEST-ORQUESTADOR-PIPELINE-METADATA-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
