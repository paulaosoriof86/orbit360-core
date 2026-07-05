#!/usr/bin/env node
/* Synthetic tests for A&S conciliaciones LAB executor. No real data. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const tool = path.join(root,'tools','orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs');
const tmp = path.join(root,'_orbit360_tmp','executor-conciliaciones-lab-ays');
const reports = path.join(root,'_orbit360_reports');
const failures=[]; const results=[];
function writeJson(file,data){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(data,null,2),'utf8'); }
function op(id, over={}){
  const doc={ id, proposal_id:id, tenant_id:'alianzas-soluciones', source_type:'planilla_comisiones', source_ref:{file:'sintetico.xlsx',sheet:'Hoja1',row_ref:String(id)}, country:'GT', currency:'GTQ', score:92, score_decision:'MATCH_PROBABLE', proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION', queue_state:'PROPUESTA', review_state:'PENDIENTE', validation:{status:'LISTO_PARA_PERSISTENCIA_LAB',errors:[],warnings:[]}, ...over.document };
  return { op:'upsert_conciliacion_propuesta', collection:'conciliaciones', tenant_id:'alianzas-soluciones', document_id:id, document:doc, audit_event:{type:'CONCILIACION_PROPUESTA_PREPARADA',tenant_id:'alianzas-soluciones',proposal_id:id,createdAt:'2026-07-04T00:00:00Z'}, ...over.op };
}
function plan(operations, over={}){ return { version:'test', decision:'PLAN_LISTO', tenant_id:'alianzas-soluciones', source_file:'synthetic', summary:{total:operations.length}, operations, errors:[], warnings:[], restrictions:['test'], ...over }; }
function run(id,payload,args,expected,needles){
  const file=path.join(tmp,`${id}.json`);
  writeJson(file,payload);
  const res=spawnSync(process.execPath,[tool,'--plan',file,...args],{cwd:root,encoding:'utf8'});
  const out=`${res.stdout||''}\n${res.stderr||''}`;
  const ok=res.status===expected && needles.every(n=>out.includes(n));
  results.push(`${ok?'OK':'FAIL'} ${id} exit=${res.status} expected=${expected}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe herramienta.'); process.exit(1); }
run('dry-run-valido', plan([op('conc-1'),op('conc-2')]), ['--mode','dry-run'], 0, ['Decision: DRY_RUN_LISTO','Conciliaciones planificadas: 2']);
run('local-mirror-sin-token', plan([op('conc-1')]), ['--mode','local-mirror'], 1, ['Decision: BLOQUEADO','requiere']);
run('local-mirror-valido', plan([op('conc-1')]), ['--mode','local-mirror','--execute-lab','CONFIRMO_ESCRITURA_LAB_CONCILIACIONES','--lab-store-out',path.join(tmp,'mirror.json')], 0, ['Decision: PERSISTENCIA_LAB_LOCAL_EJECUTADA','Ejecutado local mirror: SI']);
run('plan-con-errores', plan([op('conc-1')],{errors:['error previo']}), ['--mode','dry-run'], 1, ['Decision: BLOQUEADO','errores previos']);
run('op-bloqueada', plan([op('conc-1',{document:{validation:{status:'BLOQUEADO',errors:['x'],warnings:[]}}})]), ['--mode','dry-run'], 1, ['Decision: BLOQUEADO','operación bloqueada']);
run('aplicada-bloqueada', plan([op('conc-1',{document:{queue_state:'APLICADA'}})]), ['--mode','dry-run'], 1, ['Decision: BLOQUEADO','APLICADAS']);
run('tenant-mismatch', plan([op('conc-1',{op:{tenant_id:'otro'}})]), ['--mode','dry-run'], 1, ['Decision: BLOQUEADO','tenant mismatch']);
run('payload-bloqueado', {...plan([op('conc-1')]), rawRows:[{a:1}]}, ['--mode','dry-run'], 1, ['Decision: BLOQUEADO','claves prohibidas']);
const output=['============================================================','ORBIT 360 - TEST EJECUTOR PERSISTENCIA CONCILIACIONES LAB A&S',`Fecha: ${new Date().toISOString()}`,'Casos sintéticos, sin datos reales, sin Firestore, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length?'RESULTADO: FAIL':'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports,{recursive:true});
fs.writeFileSync(path.join(reports,'TEST-EJECUTOR-PERSISTENCIA-CONCILIACIONES-LAB-AYS.txt'),output,'utf8');
console.log(output);
process.exit(failures.length?1:0);
