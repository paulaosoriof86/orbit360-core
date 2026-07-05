#!/usr/bin/env node
/* Synthetic tests for readiness bandeja conciliaciones. No real data. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-generar-readiness-bandeja-conciliaciones-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'readiness-bandeja-conciliaciones');
const reports = path.join(root, '_orbit360_reports');
const failures=[]; const results=[];
function writeJson(file,data){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data,null,2), 'utf8'); }
function item(id, over={}){ return { id, proposal_id:id, tenant_id:'alianzas-soluciones', queue_state:'PROPUESTA', review_state:'PENDIENTE', score:91, score_decision:'MATCH_PROBABLE', source_type:'planilla_comisiones', source_ref:{file:'sintetico.xlsx',sheet:'Hoja1',row_ref:id}, country:'GT', currency:'GTQ', proposed_action:'ENVIAR_A_BANDEJA_VALIDACION', links:{cliente_id:'cliente_demo',poliza_id:'poliza_demo'}, amount:{value:100,currency:'GTQ'}, updatedAt:'2026-07-04T00:00:00Z', ...over }; }
function mirror(items){ return { meta:{tenant_id:'alianzas-soluciones'}, conciliaciones:items, auditLog:[] }; }
function run(id, payload, expected, needles){
  const file = path.join(tmp, `${id}.json`); writeJson(file, payload);
  const res = spawnSync(process.execPath, [tool, '--mirror', file], {cwd:root, encoding:'utf8'});
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expected && needles.every((n)=>out.includes(n));
  results.push(`${ok?'OK':'FAIL'} ${id} exit=${res.status} expected=${expected}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe herramienta readiness.'); process.exit(1); }
run('readiness-ok', mirror([item('r1'), item('r2',{queue_state:'EN_REVISION',review_state:'REQUIERE_VALIDACION',score_decision:'REQUIERE_VALIDACION'})]), 0, ['Decision: READINESS_OK', 'RESULTADO: OK']);
run('moneda-incoherente', mirror([item('r1',{country:'GT',currency:'COP'})]), 1, ['Decision: READINESS_BLOQUEADO', 'País/moneda incoherente']);
run('tenant-invalido', mirror([item('r1',{tenant_id:'otro'})]), 1, ['Decision: READINESS_BLOQUEADO', 'Tenant inválido']);
run('aplicada-bloqueada', mirror([item('r1',{queue_state:'APLICADA'})]), 1, ['Decision: READINESS_BLOQUEADO', 'APLICADA']);
run('faltan-fuente-fila', mirror([item('r1',{source_ref:{file:''}})]), 1, ['Decision: READINESS_BLOQUEADO', 'source_ref']);
const output = ['============================================================','ORBIT 360 - TEST READINESS BANDEJA CONCILIACIONES A&S',`Fecha: ${new Date().toISOString()}`,'Casos sintéticos, sin datos reales, sin writes, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length?'RESULTADO: FAIL':'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports,{recursive:true}); fs.writeFileSync(path.join(reports,'TEST-READINESS-BANDEJA-CONCILIACIONES-AYS.txt'), output, 'utf8'); console.log(output); process.exit(failures.length?1:0);
