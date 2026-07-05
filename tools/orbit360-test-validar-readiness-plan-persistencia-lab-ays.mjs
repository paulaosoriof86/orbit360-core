#!/usr/bin/env node
/* Orbit 360 A&S — pruebas sintéticas readiness plan persistencia LAB */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-validar-readiness-plan-persistencia-lab-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'readiness-plan-persistencia-lab');
const reports = path.join(root, '_orbit360_reports');
const failures = [];
const results = [];
function writeJson(file, data){ fs.mkdirSync(path.dirname(file), { recursive:true }); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); }
function run(id, plan, expectedExit, needles){
  const file = path.join(tmp, `${id}.plan.json`);
  writeJson(file, plan);
  const res = spawnSync(process.execPath, [tool, '--plan', file, '--tenant', 'alianzas-soluciones'], { cwd:root, encoding:'utf8' });
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expectedExit && needles.every(n => out.includes(n));
  results.push(`${ok ? 'OK' : 'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe validador readiness.'); process.exit(1); }
const doc = (id, overrides={}) => ({
  id, proposal_id:id, tenant_id:'alianzas-soluciones', source_type:'estado_cuenta_bancario', manifest_id:'manifest_readiness_ok', dryrun_id:'dryrun_readiness_ok',
  source_ref:{file:'sintetico.xlsx', sheet:'Hoja1', row_ref:`row-${id}`}, country:'GT', currency:'GTQ', score:96, score_decision:'MATCH_EXACTO', proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION', queue_state:'PROPUESTA', review_state:'PENDIENTE', links:{poliza_id:'pol_sintetica_001', cobro_id:'cob_sintetico_001'}, validation:{status:'LISTO_PARA_PERSISTENCIA_LAB', errors:[], warnings:[]}, createdAt:'2026-07-05T00:00:00.000Z', updatedAt:'2026-07-05T00:00:00.000Z', ...overrides
});
const op = (id, overrides={}) => {
  const document = doc(id, overrides.document || {});
  return { op:'upsert_conciliacion_propuesta', collection:'conciliaciones', tenant_id:document.tenant_id, document_id:id, path_hint:`tenantId/${document.tenant_id}/conciliaciones/${id}`, allowed_store_api:'Orbit.store insert/update only after LAB approval', document, audit_event:{type:'CONCILIACION_PROPUESTA_PREPARADA', tenant_id:document.tenant_id, proposal_id:id, createdAt:'2026-07-05T00:00:00.000Z'}, ...overrides };
};
const basePlan = { version:'synthetic-plan', created_at:'2026-07-05T00:00:00.000Z', decision:'PLAN_LISTO', tenant_id:'alianzas-soluciones', operations:[op('conc_sintetica_001'), op('conc_sintetica_002', {document:{score:82, score_decision:'MATCH_PROBABLE', proposed_action:'PROPONER_REVISION', queue_state:'EN_REVISION'}})], restrictions:['metadata-only','plan-only','no Orbit.store writes','no Firestore writes','no payment application'] };
run('readiness-ok', basePlan, 0, ['Decision: READINESS_LISTO', 'RESULTADO: OK']);
run('readiness-advertencia', {...basePlan, operations:[{...op('conc_sintetica_003'), audit_event:null}]}, 0, ['Decision: READINESS_LISTO_CON_ADVERTENCIAS', 'RESULTADO: OK']);
run('readiness-aplicada-bloquea', {...basePlan, operations:[op('conc_sintetica_004', {document:{queue_state:'APLICADA'}})]}, 1, ['Decision: READINESS_BLOQUEADO', 'RESULTADO: FAIL']);
run('readiness-rawrows-bloquea', {...basePlan, rawRows:[{dato:'prohibido'}]}, 1, ['Decision: READINESS_BLOQUEADO', 'RESULTADO: FAIL']);
run('readiness-tenant-bloquea', {...basePlan, operations:[op('conc_sintetica_005', {document:{tenant_id:'otro-tenant'}})]}, 1, ['Decision: READINESS_BLOQUEADO', 'RESULTADO: FAIL']);
const output = ['============================================================','ORBIT 360 A&S — TEST READINESS PLAN PERSISTENCIA LAB',`Fecha: ${new Date().toISOString()}`,'Restricciones: sintético, sin datos reales, sin writes, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length ? 'RESULTADO: FAIL' : 'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports, { recursive:true });
fs.writeFileSync(path.join(reports, 'TEST-READINESS-PLAN-PERSISTENCIA-LAB-AYS.txt'), output, 'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
