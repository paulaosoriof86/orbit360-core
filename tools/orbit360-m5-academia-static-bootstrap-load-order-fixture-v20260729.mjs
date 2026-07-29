#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-academia-static-bootstrap-load-order-test.json');
const index=fs.readFileSync(path.join(ROOT,'orbit360-platform/index.html'),'utf8');
const ownerSource=fs.readFileSync(path.join(ROOT,'orbit360-platform/core/academia-static-content-write-policy-v20260729.js'),'utf8');
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,220)});
try{
  const storeBasePos=index.indexOf('data/store.js?v1291');
  const ownerPos=index.indexOf('core/academia-static-content-write-policy-v20260729.js?v=20260729-2');
  const firestoreStorePos=index.indexOf('data/store-firestore-lab.local.js?v=lab-store-20260703');
  const seedPos=index.indexOf('data/seed.js?v1291');
  const firstAcademiaPos=index.indexOf('data/academia-plus.js?v1356');
  check('INDEX_STORE_BASE_PRESENT',storeBasePos>=0);
  check('INDEX_OWNER_PRESENT',ownerPos>=0);
  check('INDEX_FIRESTORE_STORE_PRESENT',firestoreStorePos>=0);
  check('INDEX_SEED_PRESENT',seedPos>=0);
  check('INDEX_ACADEMIA_PRESENT',firstAcademiaPos>=0);
  check('INDEX_OWNER_AFTER_BASE_STORE',storeBasePos<ownerPos);
  check('INDEX_OWNER_BEFORE_FIRESTORE_ASSIGNMENT',ownerPos<firestoreStorePos);
  check('INDEX_OWNER_BEFORE_SEED',ownerPos<seedPos);
  check('INDEX_OWNER_BEFORE_ACADEMIA',ownerPos<firstAcademiaPos);

  const events=[];
  const sandbox={
    console:{log(){},warn(){},error(){}},
    location:{search:'?orbitBackend=firestore-lab&tenant=alianzas-soluciones'},
    URLSearchParams,
    CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options&&options.detail||{};}},
    document:{dispatchEvent(event){events.push(event&&event.type||'');},addEventListener(){}},
    setTimeout(){return 0;},
    clearTimeout(){},
    Orbit:{}
  };
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(ownerSource,sandbox,{filename:'academia-static-content-write-policy-v20260729.js'});
  const descriptor=Object.getOwnPropertyDescriptor(sandbox.Orbit,'store');
  check('OWNER_WATCHES_STORE_ASSIGNMENT',Boolean(descriptor&&typeof descriptor.set==='function'));

  const durableCalls=[];
  const cache={cursos:[],lecciones:[],evaluaciones:[],config:[],clientes:[]};
  const rowId=row=>row&&(row.id||row.uid||row.codigo||row.numero||row.key)||'';
  const baseStore={
    __firestoreLabExplicit:true,
    all(collection){cache[collection]=cache[collection]||[];return cache[collection];},
    get(collection,id){return this.all(collection).find(row=>String(rowId(row))===String(id))||null;},
    insert(collection,payload){durableCalls.push({operation:'insert',collection});this.all(collection).push({...payload});return payload;},
    update(collection,id,patch){durableCalls.push({operation:'update',collection});const rows=this.all(collection);const at=rows.findIndex(row=>String(rowId(row))===String(id));const next={...(at>=0?rows[at]:{id}),...patch,id};if(at>=0)rows[at]=next;else rows.push(next);return next;},
    remove(collection,id){durableCalls.push({operation:'remove',collection});return true;},
    init(){return this;},
    on(){return ()=>{};},
    _emit(){},
    setPref(key,value){durableCalls.push({operation:'setPref',collection:'__prefs'});return value;}
  };
  sandbox.Orbit.store=baseStore;
  const store=sandbox.Orbit.store;
  check('POLICY_INSTALLED_SYNCHRONOUSLY',store.__academiaStaticWritePolicyVersion==='20260729.2'&&sandbox.Orbit.academiaStaticContentWritePolicy&&sandbox.Orbit.academiaStaticContentWritePolicy.installed===true);

  const lesson={id:'m1_operational_directory_direccion_1232',titulo:'Directorio operativo y edición',rol:'Dirección',obligatoria:true,_m1operationalv:1232,secciones:[]};
  const evaluation={id:'eval_m1_operational_directory_1232',titulo:'Caso aplicado',_m1operationalv:1232,preguntas:[]};
  store.insert('lecciones',lesson);
  store.insert('evaluaciones',evaluation);
  store.update('config','academia',{contenidoDirectorioOperativo:'1.232',actualizadoAt:'2026-07-29T00:00:00.000Z'});
  check('STATIC_BOOTSTRAP_ZERO_DURABLE_CALLS',durableCalls.length===0,JSON.stringify(durableCalls));
  const status=store._transientStaticStatus();
  check('LESSON_TRANSIENT',Boolean(store.get('lecciones',lesson.id))&&status.collections.includes('lecciones'));
  check('EVALUATION_TRANSIENT',Boolean(store.get('evaluaciones',evaluation.id))&&status.collections.includes('evaluaciones'));
  check('CONFIG_TRANSIENT',Boolean(store.get('config','academia'))&&status.collections.includes('config'));
  check('STATIC_REASONS_RECORDED',status.recent.some(row=>row.collection==='lecciones'&&row.reason==='versioned_static_lecciones')&&status.recent.some(row=>row.collection==='evaluaciones'&&row.reason==='versioned_static_evaluaciones')&&status.recent.some(row=>row.collection==='config'&&row.reason==='static_academia_content_version'));

  store.update('lecciones',lesson.id,{progreso:50,updatedByUserAt:'2026-07-29T00:00:00.000Z'});
  store.update('clientes','client_fixture',{nombre:'Cambio operativo'});
  check('USER_PROGRESS_REMAINS_DURABLE',durableCalls.some(row=>row.operation==='update'&&row.collection==='lecciones'));
  check('OPERATIONAL_MUTATION_REMAINS_DURABLE',durableCalls.some(row=>row.operation==='update'&&row.collection==='clientes'));
  check('OWNER_EVENT_EMITTED',events.includes('orbit:academia-static-write-policy'));
}catch(error){check('FIXTURE_EXCEPTION',false,error&&error.stack||error);}
const failed=checks.filter(item=>!item.ok);
const out={schemaVersion:'orbit360-m5-academia-static-bootstrap-load-order-test-v1',generatedAt:new Date().toISOString(),ok:failed.length===0,status:failed.length?'M5_ACADEMIA_STATIC_BOOTSTRAP_LOAD_ORDER_FAIL':'M5_ACADEMIA_STATIC_BOOTSTRAP_LOAD_ORDER_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),checks,secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtime:false,browser:false,deploy:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
