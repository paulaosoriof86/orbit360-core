#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT=process.cwd();
const TARGET='orbit360-platform/data/academia-v1230-operational-directory-v20260722.js';
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/gate711-academia-operational-idempotence-static-v20260802.json');
const source=fs.readFileSync(path.join(ROOT,TARGET),'utf8');

function clone(v){return JSON.parse(JSON.stringify(v));}
function fakeStore(){
  const data={lecciones:[],evaluaciones:[],config:[{id:'academia'}]};
  const calls=[];
  function idOf(row){return String(row&&row.id||'');}
  return {
    calls,data,__firestoreLabExplicit:false,
    all(collection){data[collection]=data[collection]||[];return data[collection];},
    get(collection,id){return (this.all(collection)||[]).find(row=>idOf(row)===String(id))||null;},
    insert(collection,row){calls.push({operation:'insert',collection,id:idOf(row)});this.all(collection).push(clone(row));return row;},
    update(collection,id,patch){calls.push({operation:'update',collection,id:String(id)});const rows=this.all(collection);const index=rows.findIndex(row=>idOf(row)===String(id));if(index>=0)rows[index]=Object.assign({},rows[index],clone(patch));else rows.push(Object.assign({id:String(id)},clone(patch)));return rows[index>=0?index:rows.length-1];}
  };
}
function runScenario(){
  const listeners={};
  const store=fakeStore();
  const context={
    window:{},location:{search:''},URLSearchParams,
    document:{readyState:'complete',addEventListener(name,fn){(listeners[name]||(listeners[name]=[])).push(fn);},write(){throw new Error('DOCUMENT_WRITE_NOT_EXPECTED');}},
    setTimeout(fn){fn();return 1;},clearTimeout(){},console
  };
  context.window=context;
  context.Orbit={store,academiaStaticContentWritePolicy:{version:'20260730.1',installed:true,install(){return true;}}};
  vm.runInNewContext(source,context,{filename:TARGET});
  const module=context.Orbit.academiaOperationalDirectoryV20260722;
  const afterInitial=store.calls.length;
  const second=module.apply();
  const afterSecond=store.calls.length;
  ['Dirección','Operativo','Asesor'].forEach(role=>(listeners['orbit:session']||[]).forEach(fn=>fn({detail:{role}})));
  const afterRoles=store.calls.length;
  (listeners['orbit:store']||[]).forEach(fn=>fn());
  const afterSameStoreEvent=store.calls.length;
  const replacement=fakeStore();
  context.Orbit.store=replacement;
  (listeners['orbit:store']||[]).forEach(fn=>fn());
  const replacementInitial=replacement.calls.length;
  (listeners['orbit:store']||[]).forEach(fn=>fn());
  const replacementSecond=replacement.calls.length;
  return {listeners,store,module,second,afterInitial,afterSecond,afterRoles,afterSameStoreEvent,replacement,replacementInitial,replacementSecond};
}

let scenario,error='';
try{scenario=runScenario();}catch(e){error=String(e&&e.stack||e);}
const checks=[
  {id:'SOURCE_ROOT_FIX_MARKER',ok:source.includes("F='20260802.1'")&&source.includes('sessionChangeWrites:false')},
  {id:'NO_SESSION_WRITE_LISTENER',ok:!source.includes("addEventListener('orbit:session'")},
  {id:'STORE_REPLACEMENT_LISTENER_ONLY',ok:source.includes("addEventListener('orbit:store',boot)")},
  {id:'NO_COLLECTION_WIDE_REWRITE',ok:!source.includes("filter(function (row)")&&!source.includes('.concat(rows())')&&!source.includes('lessons.forEach')},
  {id:'TARGET_ONLY_UPSERT',ok:source.includes("upsert(S,'lecciones',r)")&&source.includes("upsert(S,'evaluaciones',quiz())")},
  {id:'CONTENT_COMPARISON',ok:source.includes('function same(')&&source.includes('function ready(')},
  {id:'CONFIG_UPDATE_CONDITIONAL',ok:source.includes("if(c.contenidoDirectorioOperativo!==V)")},
  {id:'STATIC_POLICY_REQUIRED_IN_LAB',ok:source.includes('STATIC_CONTENT_WRITE_POLICY_REQUIRED')},
  {id:'SYNTHETIC_EXECUTION',ok:!!scenario&&!error},
  {id:'INITIAL_TARGET_WRITES_EXACTLY_FIVE',ok:!!scenario&&scenario.afterInitial===5},
  {id:'SECOND_APPLY_ZERO_WRITES',ok:!!scenario&&scenario.afterSecond===5&&scenario.second&&scenario.second.writes===0&&scenario.second.code==='ALREADY_CURRENT'},
  {id:'THREE_ROLE_CHANGES_ZERO_WRITES',ok:!!scenario&&scenario.afterRoles===scenario.afterSecond&&(scenario.listeners['orbit:session']||[]).length===0},
  {id:'SAME_STORE_EVENT_ZERO_WRITES',ok:!!scenario&&scenario.afterSameStoreEvent===scenario.afterRoles},
  {id:'NEW_STORE_APPLIED_ONCE',ok:!!scenario&&scenario.replacementInitial===5&&scenario.replacementSecond===5},
  {id:'CONTENT_COUNTS_PRESERVED',ok:!!scenario&&scenario.store.all('lecciones').length===3&&scenario.store.all('evaluaciones').length===1&&scenario.store.get('config','academia').contenidoDirectorioOperativo==='1.232'},
  {id:'NO_BACKEND_OR_DEPLOY_LOGIC',ok:!source.includes('firebase deploy')&&!source.includes('getFirestore(')&&!source.includes('fetch(')}
];
const failed=checks.filter(item=>!item.ok);
const payload={schemaVersion:'orbit360-gate711-academia-operational-idempotence-static-v1',gateId:'block7-canonical-runtime-cumulative-visual-lab-v20260801',classification:failed.length?'FUNCTIONAL_DEFECT':'GO_STATIC_ACADEMIA_OPERATIONAL_IDEMPOTENCE',status:failed.length?'GATE711_ACADEMIA_OPERATIONAL_IDEMPOTENCE_STATIC_FAIL':'GATE711_ACADEMIA_OPERATIONAL_IDEMPOTENCE_STATIC_PASS',owner:TARGET,rootCause:'Academia operational directory reapplied five static store mutations on every orbit:session event',synthetic:{initialCalls:scenario?.afterInitial??null,secondApplyCalls:scenario?.afterSecond??null,afterThreeRoleChanges:scenario?.afterRoles??null,afterSameStoreEvent:scenario?.afterSameStoreEvent??null,newStoreFirst:scenario?.replacementInitial??null,newStoreSecond:scenario?.replacementSecond??null,error:error.slice(0,600)},checks,total:checks.length,passed:checks.length-failed.length,failed:failed.length,failedCheckIds:failed.map(item=>item.id),secretAccess:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,runtimeExecuted:false,browserExecuted:false,reimportExecuted:false,deployExecuted:false,production:false,containsPII:false,containsValues:false,containsSecrets:false,ok:failed.length===0};
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+'\n','utf8');
console.log(JSON.stringify(payload,null,2));
process.exit(payload.ok?0:41);
