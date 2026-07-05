#!/usr/bin/env node
/* Synthetic tests for Firestore LAB adapter static validator. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const root = process.cwd();
const tool = path.join(root, 'tools', 'orbit360-validar-adapter-conciliaciones-firestore-lab-ays.mjs');
const tmp = path.join(root, '_orbit360_tmp', 'adapter-conciliaciones-firestore-lab');
const reports = path.join(root, '_orbit360_reports');
const failures=[]; const results=[];
function write(file, text){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, text, 'utf8'); }
function sample(extraCollections='', extraText=''){
  return `
(function(){
  var mode = 'firestore-lab';
  var tenantId = 'alianzas-soluciones';
  if (mode !== 'firestore-lab' || tenantId !== 'alianzas-soluciones') return;
  var COLLECTIONS = ['clientes','cobros','conciliaciones','auditLog'${extraCollections}];
  function canonicalCollectionPath(collection){ return 'tenantId/' + tenantId + '/' + collection; }
  function collectionRef(collection){ return { onSnapshot:function(){}, doc:function(){ return { set:function(){}, delete:function(){} }; } }; }
  function all(collection){ return []; }
  function where(collection){ return []; }
  function insert(collection,payload){ return payload; }
  function update(collection,id,patch){ return patch; }
  function remove(collection,id){ return true; }
  function pref(key,def){ return def; }
  function setPref(key,value){ return value; }
  function raw(){ return {}; }
  function cleanForWrite(row){ return row; }
  var api = { all:all, where:where, insert:insert, update:update, remove:remove, pref:pref, setPref:setPref, raw:raw, _emit:function(){}, _attachSnapshots:function(){ return collectionRef('x').onSnapshot; } };
  var x = 'onSnapshot';
  ${extraText}
})();`;
}
function run(id, text, expected, needles){
  const file = path.join(tmp, `${id}.js`); write(file, text);
  const res = spawnSync(process.execPath, [tool, '--store', file], {cwd:root, encoding:'utf8'});
  const out = `${res.stdout || ''}\n${res.stderr || ''}`;
  const ok = res.status === expected && needles.every((n)=>out.includes(n));
  results.push(`${ok?'OK':'FAIL'} ${id} exit=${res.status} expected=${expected}`);
  if(!ok) failures.push(`CASE ${id}\nNEEDLES ${needles.join(' | ')}\n${out}`);
}
if(!fs.existsSync(tool)){ console.error('No existe validador.'); process.exit(1); }
run('adapter-valido', sample(), 0, ['Decision: ADAPTER_VALIDO', 'RESULTADO: OK']);
run('sin-conciliaciones', sample().replace("'conciliaciones',", ''), 1, ['Decision: BLOQUEADO', 'No se detecta colección requerida: conciliaciones']);
run('sin-auditlog', sample().replace(",'auditLog'", ''), 1, ['Decision: BLOQUEADO', 'No se detecta colección requerida: auditLog']);
run('sin-tenant-gate', sample().replace("if (mode !== 'firestore-lab' || tenantId !== 'alianzas-soluciones') return;", "if (!mode) return;"), 1, ['Decision: BLOQUEADO', 'gate firestore-lab']);
run('texto-prohibido', sample('', "function peligro(){ postRecaudo(); }"), 1, ['Decision: BLOQUEADO', 'postRecaudo']);
const output = ['============================================================','ORBIT 360 - TEST VALIDAR ADAPTER CONCILIACIONES FIRESTORE LAB',`Fecha: ${new Date().toISOString()}`,'Casos sintéticos, sin Firestore, sin secretos, sin deploy.','============================================================','',`Casos: ${results.length}`,`FAIL: ${failures.length}`,'',...results,'',...failures,'',failures.length?'RESULTADO: FAIL':'RESULTADO: OK'].join('\n');
fs.mkdirSync(reports,{recursive:true});
fs.writeFileSync(path.join(reports,'TEST-VALIDAR-ADAPTER-CONCILIACIONES-FIRESTORE-LAB-AYS.txt'),output,'utf8');
console.log(output);
process.exit(failures.length ? 1 : 0);
