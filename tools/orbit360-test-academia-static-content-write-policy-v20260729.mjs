#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const ROOT=process.cwd();
const source=fs.readFileSync(path.join(ROOT,'orbit360-platform/core/academia-static-content-write-policy-v20260729.js'),'utf8');
const cache={cursos:[],lecciones:[],evaluaciones:[],config:[],clientes:[]};
const durableCalls=[];
let listener=null;
const rowId=row=>row&&(row.id||row.uid||row.codigo||row.numero||row.key)||'';
const store={
  __firestoreLabExplicit:true,
  all(collection){cache[collection]=cache[collection]||[];return cache[collection];},
  get(collection,id){return this.all(collection).find(row=>String(rowId(row))===String(id))||null;},
  insert(collection,payload){durableCalls.push({method:'insert',collection,id:rowId(payload)});const row=JSON.parse(JSON.stringify(payload||{}));this.all(collection).push(row);return row;},
  update(collection,id,patch){durableCalls.push({method:'update',collection,id});const rows=this.all(collection);const idx=rows.findIndex(row=>String(rowId(row))===String(id));const row=Object.assign({},idx>=0?rows[idx]:{id},JSON.parse(JSON.stringify(patch||{})));if(idx>=0)rows[idx]=row;else rows.push(row);return row;},
  remove(collection,id){durableCalls.push({method:'remove',collection,id});cache[collection]=this.all(collection).filter(row=>String(rowId(row))!==String(id));return true;},
  on(_collection,callback){listener=callback;return()=>{};},
  _emit(){}
};
const events=[];
const context={
  window:{Orbit:{store}},
  document:{dispatchEvent(event){events.push(event&&event.type||'');}},
  CustomEvent:class CustomEvent{constructor(type,init){this.type=type;this.detail=init&&init.detail||{};}},
  setTimeout(fn){fn();return 1;},
  clearTimeout(){},
  console
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context,{filename:'academia-static-content-write-policy-v20260729.js'});

const checks=[];
const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'')});
const policy=context.window.Orbit.academiaStaticContentWritePolicy;
check('POLICY_INSTALLED',store.__academiaStaticWritePolicyVersion==='20260729.1');
check('POLICY_EVENT',events.includes('orbit:academia-static-write-policy'));

store.insert('cursos',{id:'cur_static_test',titulo:'Curso estático',cat:'Producto',lecciones:[],_cv:999});
check('STATIC_COURSE_TRANSIENT',durableCalls.length===0,JSON.stringify(durableCalls));
check('STATIC_COURSE_VISIBLE',store.get('cursos','cur_static_test')?.titulo==='Curso estático');

store.insert('lecciones',{id:'m1_static_lesson',titulo:'Lección',rol:'Dirección',secciones:[],_m1v:999});
store.update('lecciones','m1_static_lesson',{titulo:'Lección actualizada',secciones:[],_m1v:1000});
store.insert('evaluaciones',{id:'eval_static_test',titulo:'Evaluación',preguntas:[],_m1v:999});
store.update('config','academia',{contenidoM1:'1.999',actualizadoAt:'2026-07-29T00:00:00.000Z'});
check('STATIC_LESSON_EVALUATION_CONFIG_TRANSIENT',durableCalls.length===0,JSON.stringify(durableCalls));

store.update('cursos','cur_static_test',{progreso:55,certificado:true});
check('USER_PROGRESS_DURABLE',durableCalls.some(call=>call.method==='update'&&call.collection==='cursos'&&call.id==='cur_static_test'));

store.insert('cursos',{id:'custom_course_user',titulo:'Curso creado por usuario',cat:'Personal'});
store.insert('clientes',{id:'cli_test',nombre:'Cliente de prueba'});
store.remove('cursos','custom_course_user');
check('CUSTOM_COURSE_DURABLE',durableCalls.some(call=>call.method==='insert'&&call.collection==='cursos'&&call.id==='custom_course_user'));
check('CLIENT_DURABLE',durableCalls.some(call=>call.method==='insert'&&call.collection==='clientes'&&call.id==='cli_test'));
check('REMOVE_DURABLE',durableCalls.some(call=>call.method==='remove'&&call.collection==='cursos'&&call.id==='custom_course_user'));

cache.cursos=[{id:'cur_static_test',progreso:80,certificado:true,titulo:'Servidor antiguo'}];
if(listener)listener('cursos');
const restored=store.get('cursos','cur_static_test');
check('SNAPSHOT_REAPPLY_STATIC_CONTENT',restored?.titulo==='Curso estático');
check('SNAPSHOT_PRESERVES_USER_PROGRESS',restored?.progreso===80&&restored?.certificado===true,JSON.stringify(restored));

const staticClassification=store._writePolicy('insert','cursos','cur_x',{id:'cur_x',titulo:'X',cat:'Producto',lecciones:[],_cv:1});
const progressClassification=store._writePolicy('update','cursos','cur_x',{progreso:10});
const clientClassification=store._writePolicy('insert','clientes','cli_x',{id:'cli_x',nombre:'X'});
check('CLASSIFY_STATIC',staticClassification.mode==='transient_static_content');
check('CLASSIFY_PROGRESS_DURABLE',progressClassification.mode==='durable_operational');
check('CLASSIFY_CLIENT_DURABLE',clientClassification.mode==='durable_operational');

const status=store._transientStaticStatus();
check('STATUS_SANITIZED',status&&status.version==='20260729.1'&&Array.isArray(status.recent)&&status.recent.every(row=>!('payload' in row)&&!('data' in row)));
check('NO_SECRET_OR_PII_LITERALS',!/(password|contraseña|secret|token|@)/i.test(JSON.stringify(status)));

const failed=checks.filter(item=>!item.ok);
const out={schemaVersion:'orbit360-academia-static-content-write-policy-test-v1',ok:failed.length===0,status:failed.length?'FAIL':'PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,durableCalls,transientStatus:status,containsPII:false,containsSecrets:false};
const outPath=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-academia-static-write-policy-test.json');
fs.mkdirSync(path.dirname(outPath),{recursive:true});
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out,null,2));
if(!out.ok)process.exit(41);
