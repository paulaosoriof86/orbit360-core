#!/usr/bin/env node
/* Orbit 360 A&S — pruebas sintéticas adaptador candidatos metadata-only
   No datos reales, no writes, no deploy.
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs');
const validator = path.join(root, 'tools', 'orbit360-validar-dryrun-report-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'adaptar-candidatos-dryrun');
const reports = path.join(root, '_orbit360_reports');
const failures=[]; const results=[];
function writeJson(file,data){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(data,null,2), 'utf8'); }
function dryrun(source_type='estado_cuenta_bancario'){ return { tenant_id:'alianzas-soluciones', source_type, manifest_id:'manifest_test', source_ref:{file:'sintetico.xlsx'}, country:'GT', currency:'GTQ', summary:{rows_total:0, rows_ready:0, rows_requires_validation:0, rows_blocked:0, rows_omitted:0, rows_probable_duplicate:0} }; }
function cand(over={}){ return { state:'LISTO', source_ref:{file:'sintetico.xlsx', sheet:'Hoja1', row_ref:'row-001'}, country:'GT', currency:'GTQ', score:96, score_decision:'MATCH_EXACTO', proposed_action:'PROPONER_APLICACION_CON_CONFIRMACION', links:{poliza_id:'pol_demo', cobro_id:'cobro_demo'}, ...over }; }
function run(id, d, c, expectedExit, needles, validate=false){
  const dFile=path.join(tmp, `${id}.dryrun.json`); const cFile=path.join(tmp, `${id}.candidates.json`);
  writeJson(dFile,d); writeJson(cFile,c);
  const res=spawnSync(process.execPath,[tool,'--dryrun',dFile,'--candidates',cFile],{cwd:root,encoding:'utf8'});
  const out=`${res.stdout||''}\n${res.stderr||''}`;
  let ok=res.status===expectedExit && needles.every(n=>out.includes(n));
  if(ok && validate && res.status===0){
    const match=out.match(/JSON: (.+\.json)/);
    if(match){
      const val=spawnSync(process.execPath,[validator,'--report',match[1]],{cwd:root,encoding:'utf8'});
      ok = val.status===0 && (val.stdout||'').includes('RESULTADO: OK');
      if(!ok) failures.push(`VALIDATOR ${id}\n${val.stdout}\n${val.stderr}`);
    } else { ok=false; failures.push(`No JSON path for ${id}`); }
  }
  results.push(`${ok?'OK':'FAIL'} ${id} exit=${res.status} expected=${expectedExit}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe adaptador.'); process.exit(1); }
if(!fs.existsSync(validator)){ console.error('No existe validador dryRun.'); process.exit(1); }

run('banco-listo-valida', dryrun(), {candidates:[cand()]}, 0, ['Decision: DRYRUN_CANDIDATES_LISTO','Readiness score: SI'], true);
run('score-faltante-bloquea', dryrun(), {candidates:[cand({score:null})]}, 1, ['Decision: DRYRUN_CANDIDATES_BLOQUEADO','score inválido']);
run('moneda-mala-bloquea', dryrun(), {candidates:[cand({currency:'COP'})]}, 1, ['Decision: DRYRUN_CANDIDATES_BLOQUEADO','país/moneda incoherente']);
run('rowref-faltante-bloquea', dryrun(), {candidates:[cand({source_ref:{file:'sintetico.xlsx', sheet:'Hoja1'}})]}, 1, ['Decision: DRYRUN_CANDIDATES_BLOQUEADO','row_ref']);
run('bloqueado-no-aplicar', dryrun(), {candidates:[cand({state:'BLOQUEADO', score:10, score_decision:'BLOQUEADO', proposed_action:'NO_APLICAR'})]}, 0, ['Decision: DRYRUN_CANDIDATES_LISTO'], true);
run('match-exacto-advertencia', dryrun(), {candidates:[cand({proposed_action:'PROPONER_REVISION'})]}, 0, ['Decision: DRYRUN_CANDIDATES_LISTO_CON_ADVERTENCIAS','match exacto']);
run('sin-candidatos-bloquea', dryrun(), {candidates:[]}, 1, ['Decision: DRYRUN_CANDIDATES_BLOQUEADO','No hay candidates']);

const output=['============================================================','ORBIT 360 A&S — TEST ADAPTAR CANDIDATOS DRYRUN',`Fecha: ${new Date().toISOString()}`,'Restricciones: sintético, sin datos reales, sin writes, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length?'RESULTADO: FAIL':'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports,{recursive:true}); fs.writeFileSync(path.join(reports,'TEST-ADAPTAR-CANDIDATOS-DRYRUN-METADATA-AYS.txt'), output, 'utf8'); console.log(output); process.exit(failures.length?1:0);
