#!/usr/bin/env node
'use strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
const ROOT=process.cwd();
const sessionRel='orbit360-platform/core/session-multirol-visibility-v20260716.js',swRel='orbit360-platform/sw.js';
const sessionSrc=fs.readFileSync(path.join(ROOT,sessionRel),'utf8'),swSrc=fs.readFileSync(path.join(ROOT,swRel),'utf8');
const checks=[];const check=(id,ok,detail='')=>checks.push({id,ok:Boolean(ok),detail:String(detail||'').slice(0,220)});
try{
  const listeners={};let role='Asesor',rebuilds=0;
  const productUser={productReadOnly:true,modulesRestricted:[],roles:['Dirección','Operativo','Asesor'],advisorId:'advisor_fixture'};
  const owner=Object.freeze({VERSION:'20260729.3',rol:()=>role,allowedRoles:()=>['Dirección','Operativo','Asesor'],rolesAsignados:()=>['Dirección','Operativo','Asesor'],canSee:route=>route==='cliente360'||(role==='Dirección'&&route==='aseguradoras'),set:target=>{if(!['Dirección','Operativo','Asesor'].includes(target))return false;role=target;return true;}});
  const document={getElementById:()=>null,addEventListener:(name,fn)=>{(listeners[name]||(listeners[name]=[])).push(fn)},dispatchEvent:event=>{(listeners[event.type]||[]).forEach(fn=>fn(event));return true}};
  const windowObj={Orbit:{session:owner,auth:{productUser},router:{rebuildSidebar:()=>{rebuilds+=1}},NAV:[{type:'home',route:'inicio'},{label:'Operación',items:[{route:'aseguradoras'},{route:'cotizador'}]},{label:'CRM',items:[{route:'cliente360'}]}]},ROLES:{Asesor:{modulos:['cliente360','cotizador']},Operativo:{modulos:['cliente360']},Dirección:{modulos:['cliente360','aseguradoras']}}},addEventListener:(name,fn)=>{(listeners['window:'+name]||(listeners['window:'+name]=[])).push(fn)}};
  windowObj.window=windowObj;const context={window:windowObj,Orbit:windowObj.Orbit,document,CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail}},setTimeout:fn=>{fn();return 1},clearTimeout:()=>{},console};
  vm.createContext(context);let executionError='';try{vm.runInContext(sessionSrc,context,{filename:sessionRel});}catch(error){executionError=String(error&&error.stack||error)}
  check('IMPORT_WITH_FROZEN_OWNER',!executionError,executionError);
  check('CANONICAL_OWNER_PRESERVED',Object.isFrozen(owner)&&windowObj.Orbit.session!==owner&&Object.getPrototypeOf(windowObj.Orbit.session)===owner);
  check('FACADE_FROZEN',Object.isFrozen(windowObj.Orbit.session));
  check('MARKER_READY',windowObj.Orbit.session.__multirolVisibilityV20260716?.version==='20260729.2'&&windowObj.Orbit.session.__multirolVisibilityV20260716?.ownerMode==='immutable-delegating-facade'&&windowObj.Orbit.sessionMultirolVisibilityV20260716?.ready===true);
  check('ADVISOR_INSURER_READ_ONLY_VISIBLE',windowObj.Orbit.session.canSee('aseguradoras')===true);
  productUser.modulesRestricted=['aseguradoras'];check('EXPLICIT_RESTRICTION_WINS',windowObj.Orbit.session.canSee('aseguradoras')===false);productUser.modulesRestricted=[];
  check('BASE_PERMISSION_PRESERVED',windowObj.Orbit.session.canSee('cliente360')===true);
  check('UNDECLARED_MODULE_DENIED',windowObj.Orbit.session.canSee('finanzas')===false);
  check('SET_DELEGATES_TO_OWNER',windowObj.Orbit.session.set('Operativo')===true&&role==='Operativo');
  const before=rebuilds;document.dispatchEvent(new context.CustomEvent('orbit:session'));check('SESSION_EVENT_REBUILDS_SIDEBAR',rebuilds>before,String(rebuilds));
  check('NO_DIRECT_MUTATION_PATTERN',!sessionSrc.includes('Orbit.session.set =')&&!sessionSrc.includes('Orbit.session.canSee ='));
  check('PWA_NEW_CACHE_GENERATION',swSrc.includes("var CACHE = 'orbit360-v20260729-11-multirol-owner';"));
  check('PWA_PRECACHE_CONTRACT',swSrc.includes("'/core/session-multirol-visibility-v20260716.js'")&&swSrc.includes('precachePaths(cache, RUNTIME_CONTRACT_PATHS.concat(ESSENTIAL_STYLE_PATHS))'));
  const failed=checks.filter(x=>!x.ok),out={schemaVersion:'orbit360-m5-multirol-owner-remediation-529-fixture-v1',ok:failed.length===0,status:failed.length?'M5_MULTIROL_OWNER_REMEDIATION_529_FIXTURE_FAIL':'M5_MULTIROL_OWNER_REMEDIATION_529_FIXTURE_PASS',passed:checks.length-failed.length,total:checks.length,failed:failed.length,failedCheckIds:failed.map(x=>x.id),checks,canonicalOwnerVersion:'20260729.3',compatibilityOwnerVersion:'20260729.2',pwaCacheGeneration:'orbit360-v20260729-11-multirol-owner',runtime:false,browser:false,secrets:false,firestoreRead:false,firestoreWrites:0,operationalWrites:0,containsPII:false,containsSecrets:false};
  const outPath=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/m5-multirol-owner-remediation-529-fixture-summary.json');fs.mkdirSync(path.dirname(outPath),{recursive:true});fs.writeFileSync(outPath,JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
}catch(error){console.error(String(error&&error.stack||error));process.exit(41)}
