#!/usr/bin/env node
/* Orbit 360 A&S — pruebas sintéticas del orquestador score/propuestas plan-only */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-orquestar-score-propuestas-plan-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'orquestador-score-propuestas-plan');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function run(id, manifest, candidates, expectedExit, needles){
  const mFile = path.join(tmp, `${id}.manifest.json`);
  const cFile = path.join(tmp, `${id}.candidates.json`);
  writeJson(mFile, manifest); writeJson(cFile, candidates);
  const res = spawnSync(process.execPath, [tool, '--manifest', mFile, '--candidates', cFile, '--tenant', 'alianzas-soluciones'], { cwd:root, encoding:'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expectedExit && needles.every(n => out.includes(n));
  results.push(`${ok ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe orquestador score/propuestas plan-only.'); process.exit(1); }
const manifestOk = {
  tenant_id:'alianzas-soluciones', manifest_id:'manifest_score_plan_ok', source_type:'estado_cuenta_bancario', file:'sintetico.xlsx', file_hash:'sha256:synthetic', country:'GT', currency:'GTQ', estimated_rows:2,
  schema:{ fields:['Fecha','Descripción','Monto','Moneda','País','Referencia','Póliza'] }
};
const candidateExact = { state:'LISTO', source_ref:{file:'sintetico.xlsx', sheet:'Hoja1', row_ref:'row-001'}, country:'GT', currency:'GTQ', score:96, score_decision:'MATCH_EXACTO', proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION', links:{poliza_id:'pol_sintetica_001', cobro_id:'cob_sintetico_001', cliente_id:'cli_sintetico_001'} };
const candidateProbable = { state:'LISTO', source_ref:{file:'sintetico.xlsx', sheet:'Hoja1', row_ref:'row-002'}, country:'GT', currency:'GTQ', score:82, score_decision:'MATCH_PROBABLE', proposed_action:'PROPONER_REVISION', links:{poliza_id:'pol_sintetica_002', cobro_id:'cob_sintetico_002'} };
run('score-plan-ok', manifestOk, { candidates:[candidateExact, candidateProbable] }, 0, ['Decision: ORQUESTADOR_PLAN_LISTO', 'plan_persistencia', 'RESULTADO: OK']);
run('score-plan-advertencia', manifestOk, { candidates:[{...candidateExact, proposed_action:'PROPONER_REVISION', source_ref:{...candidateExact.source_ref, row_ref:'row-003'}}] }, 0, ['Decision: ORQUESTADOR_PLAN_LISTO_CON_ADVERTENCIAS', 'score_gate', 'RESULTADO: OK']);
run('score-plan-moneda-bloquea', {...manifestOk, currency:'COP'}, { candidates:[candidateExact] }, 1, ['Decision: ORQUESTADOR_PLAN_BLOQUEADO', 'RESULTADO: FAIL']);
run('score-plan-payload-bloquea', manifestOk, { rawRows:[{dato:'prohibido'}], candidates:[candidateExact] }, 1, ['Decision: ORQUESTADOR_PLAN_BLOQUEADO', 'RESULTADO: FAIL']);
const output = ['============================================================','ORBIT 360 A&S — TEST ORQUESTADOR SCORE/PROPUESTAS PLAN-ONLY',`Fecha: ${new Date().toISOString()}`,'Restricciones: sintético, sin datos reales, sin writes, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports, { recursive:true });
fs.writeFileSync(path.join(reports, 'TEST-ORQUESTADOR-SCORE-PROPUESTAS-PLAN-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
