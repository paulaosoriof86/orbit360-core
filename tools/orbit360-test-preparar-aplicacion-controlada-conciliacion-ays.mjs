#!/usr/bin/env node
/* Synthetic tests for controlled application planner. No real data. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const tool = path.join(root,'tools','orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs');
const tmp = path.join(root,'_orbit360_tmp','aplicacion-controlada-conciliacion');
const reports = path.join(root,'_orbit360_reports');
const failures=[]; const results=[];
function writeJson(file,data){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(data,null,2),'utf8'); }
function proposal(over={}){ return { id:'conc_apply_001', proposal_id:'conc_apply_001', tenant_id:'alianzas-soluciones', queue_state:'VALIDADA', review_state:'VALIDADA', score:96, score_decision:'MATCH_EXACTO', source_type:'planilla_comisiones', source_ref:{file:'sintetico.xlsx',sheet:'Junio',row_ref:'row-001'}, country:'GT', currency:'GTQ', amount:{value:1200,currency:'GTQ'}, proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION', links:{cobro_id:'cobro_demo_001', poliza_id:'poliza_demo_001'}, ...over }; }
function actor(over={}){ return { id:'usr_operaciones', role:'operaciones', approval_phrase:'CONFIRMO_PREPARAR_APLICACION_CONTROLADA', reason:'Motivo sintético suficiente para preparar aplicación controlada.', ...over }; }
function run(id,p,a,expected,needles){
  const pFile=path.join(tmp,`${id}-proposal.json`); const aFile=path.join(tmp,`${id}-actor.json`);
  writeJson(pFile,p); writeJson(aFile,a);
  const res=spawnSync(process.execPath,[tool,'--proposal',pFile,'--actor',aFile],{cwd:root,encoding:'utf8'});
  const out=`${res.stdout||''}\n${res.stderr||''}`;
  const ok=res.status===expected && needles.every(n=>out.includes(n));
  results.push(`${ok?'OK':'FAIL'} ${id} exit=${res.status} expected=${expected}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe herramienta.'); process.exit(1); }
run('lista', proposal(), actor(), 0, ['Decision: APLICACION_LISTA','RESULTADO: OK']);
run('no-validada', proposal({queue_state:'EN_REVISION'}), actor(), 1, ['Decision: APLICACION_BLOQUEADA','Solo propuestas VALIDADA']);
run('sin-target', proposal({links:{}}), actor(), 1, ['Decision: APLICACION_BLOQUEADA','Falta target operativo']);
run('moneda-mala', proposal({country:'GT',currency:'COP'}), actor(), 1, ['Decision: APLICACION_BLOQUEADA','País/moneda incoherente']);
run('sin-frase', proposal(), actor({approval_phrase:'OK'}), 1, ['Decision: APLICACION_BLOQUEADA','approval_phrase']);
run('payload-prohibido', {...proposal(), rawRows:[{a:1}]}, actor(), 1, ['Decision: APLICACION_BLOQUEADA','Claves prohibidas']);
run('score-bajo-advertencia', proposal({score:69}), actor(), 0, ['Decision: APLICACION_LISTA_CON_ADVERTENCIAS','Score bajo']);
const output=['============================================================','ORBIT 360 - TEST APLICACION CONTROLADA CONCILIACION A&S',`Fecha: ${new Date().toISOString()}`,'Casos sintéticos, sin datos reales, sin writes, sin pagos.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length?'RESULTADO: FAIL':'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports,{recursive:true}); fs.writeFileSync(path.join(reports,'TEST-APLICACION-CONTROLADA-CONCILIACION-AYS.txt'), output, 'utf8'); console.log(output); process.exit(failures.length?1:0);
