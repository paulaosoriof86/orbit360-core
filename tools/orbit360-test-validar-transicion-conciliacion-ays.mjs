#!/usr/bin/env node
/* Synthetic tests for conciliaciones transition validator. No real data. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root=process.cwd();
const tool=path.join(root,'tools','orbit360-validar-transicion-conciliacion-ays.mjs');
const tmp=path.join(root,'_orbit360_tmp','transicion-conciliacion-ays');
const reports=path.join(root,'_orbit360_reports');
const failures=[]; const results=[];
function writeJson(file,data){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(data,null,2),'utf8'); }
function base(over={}){ return {
  tenant_id:'alianzas-soluciones', id:'conc-demo', queue_state:'PROPUESTA', review_state:'PENDIENTE', score_decision:'MATCH_PROBABLE', country:'GT', currency:'GTQ',
  source_ref:{file:'sintetico.xlsx',sheet:'Hoja1',row_ref:'1'}, links:{cobro_id:'cobro-demo'}, ...over
}; }
function transition(proposal,to,from=proposal.queue_state,extra={}){ return { proposal, from_queue_state:from, to_queue_state:to, actor:{id:'usr-demo',role:'operaciones'}, reason:'Validación sintética suficiente para auditoría.', ...extra }; }
function run(id,payload,expected,needles){
  const file=path.join(tmp,`${id}.json`); writeJson(file,payload);
  const res=spawnSync(process.execPath,[tool,'--transition',file],{cwd:root,encoding:'utf8'});
  const out=`${res.stdout||''}\n${res.stderr||''}`;
  const ok=res.status===expected && needles.every(n=>out.includes(n));
  results.push(`${ok?'OK':'FAIL'} ${id} exit=${res.status} expected=${expected}`);
  if(!ok) failures.push(`CASE ${id}\nExpected ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe herramienta de transición.'); process.exit(1); }
run('propuesta-a-revision', transition(base(),'EN_REVISION'), 0, ['Decision: TRANSICION_VALIDA','PROPUESTA -> EN_REVISION']);
run('revision-a-validada', transition(base({queue_state:'EN_REVISION'}),'VALIDADA'), 0, ['Decision: TRANSICION_VALIDA','EN_REVISION -> VALIDADA']);
run('validada-a-aplicada', transition(base({queue_state:'VALIDADA',score_decision:'MATCH_EXACTO'}),'APLICADA','VALIDADA',{apply_context:{write_enabled:true,approved_by:'usr-demo',target_id:'cobro-demo'}}), 0, ['Decision: TRANSICION_VALIDA','VALIDADA -> APLICADA']);
run('salto-no-permitido', transition(base(),'APLICADA'), 1, ['Decision: BLOQUEADO','Transición no permitida']);
run('bloqueado-no-aplica', transition(base({queue_state:'EN_REVISION',score_decision:'BLOQUEADO'}),'VALIDADA','EN_REVISION'), 1, ['Decision: BLOQUEADO','BLOQUEADO']);
run('falta-actor', {proposal:base(),from_queue_state:'PROPUESTA',to_queue_state:'EN_REVISION',reason:'Validación suficiente'}, 1, ['Decision: BLOQUEADO','Falta actor']);
run('moneda-mala', transition(base({currency:'COP'}),'EN_REVISION'), 1, ['Decision: BLOQUEADO','País/moneda incoherente']);
run('payload-bloqueado', {...transition(base(),'EN_REVISION'), rawRows:[{a:1}]}, 1, ['Decision: BLOQUEADO','Claves prohibidas']);
const output=['============================================================','ORBIT 360 - TEST TRANSICION CONCILIACION A&S',`Fecha: ${new Date().toISOString()}`,'Restricciones: tests sintéticos, sin datos reales, sin deploy, sin merge.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length?'RESULTADO: FAIL':'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports,{recursive:true}); fs.writeFileSync(path.join(reports,'TEST-TRANSICION-CONCILIACION-AYS.txt'),output,'utf8'); console.log(output); process.exit(failures.length?1:0);
