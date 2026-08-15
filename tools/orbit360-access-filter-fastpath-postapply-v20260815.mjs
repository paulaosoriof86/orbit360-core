#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT=process.cwd();
const TARGET='orbit360-platform/core/access-scope.js';
const BASE='4f70f0dd6e870e8c7443a7638a9dc6e954eace1b';
const EVIDENCE_DIR=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716');
const OUT=path.join(EVIDENCE_DIR,'r4-access-filter-fastpath-postapply-v20260815.json');
const oldFilter=`  function filter(collection, rows, moduleKey) {
    return (rows || []).filter(function (r) { return canView(collection, r, moduleKey); });
  }`;
const newFilter=`  function filter(collection, rows, moduleKey) {
    var list = Array.isArray(rows) ? rows : [];
    if (!list.length) return [];
    try {
      // v20260815: resolve invariant access context once per filter call.
      var role = activeRole();
      if (SENSITIVE.indexOf(collection) >= 0 && ALL_ROLES.indexOf(role) < 0) return [];
      var effectiveModule = moduleKey || OP_COLLS[collection] || collection;
      if (!puedeVerModulo(effectiveModule)) return [];
      var allowedCountries = permittedCountries();
      var scope = dataScope(effectiveModule);
      if (scope === 'none') return [];
      function countryOk(rec) {
        var pais = clean(rec && rec.pais);
        return !allowedCountries.length || !pais || allowedCountries.indexOf(pais) >= 0;
      }
      if (scope === 'all') {
        if (!allowedCountries.length) return list.slice();
        return list.filter(countryOk);
      }
      var ownAdvisorId = actorAdvisorId();
      var teamIds = scope === 'team' ? teamAdvisorIds() : [];
      return list.filter(function (rec) {
        if (!rec || !countryOk(rec)) return false;
        var advisorId = clean(recordAdvisorId(collection, rec));
        if (!advisorId) return false;
        if (scope === 'own') return advisorId === ownAdvisorId;
        if (scope === 'team') return teamIds.indexOf(advisorId) >= 0;
        return false;
      });
    } catch (e) { return []; }
  }`;
const baseline=execFileSync('git',['show',`${BASE}:${TARGET}`],{encoding:'utf8',maxBuffer:4*1024*1024});
const current=fs.readFileSync(path.join(ROOT,TARGET),'utf8');
if((baseline.split(oldFilter).length-1)!==1) throw new Error('CERTIFIED_BASE_FILTER_CONTRACT_INVALID');
const expected=baseline.replace(oldFilter,newFilter);
if(current!==expected) throw new Error('APPLIED_SOURCE_DIFFERS_FROM_CERTIFIED_FASTPATH_CANDIDATE');
execFileSync(process.execPath,['--check',path.join(ROOT,TARGET)],{stdio:'pipe'});
function clone(v){return JSON.parse(JSON.stringify(v));}
function runtime(source,cfg){
 let getCalls=0,allCalls=0;const collections={asesores:clone(cfg.advisers),clientes:clone(cfg.clients)};
 const store={all(n){allCalls++;return clone(collections[n]||[]);},get(n,id){getCalls++;return store.all(n).find(r=>String(r.id)===String(id))||null;},where(n,p){return store.all(n).filter(p);}};
 const visible=['cliente360','polizas','ops','leads','aseguradoras'];
 const ctx={console,setTimeout,clearTimeout,CustomEvent:class{},window:null,Orbit:{store,session:{rol:()=>cfg.role,asesorId:()=>cfg.advisorId,rolesAsignados:()=>[cfg.role],canSee:k=>visible.includes(k)},auth:{user:()=>({uid:'u1',rol:cfg.role})},tenant:{get:()=>({}),isActive:k=>cfg.active!==false&&visible.includes(k)},ROLES:{'Dirección':{modulos:visible,scopes:{cliente360:'all'}},'Operativo':{modulos:visible,scopes:{cliente360:'team'}},'Asesor':{modulos:visible,scopes:{cliente360:'own'}}}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx,{timeout:5000});return{access:ctx.Orbit.access,metrics:()=>({getCalls,allCalls})};
}
const clients=Array.from({length:430},(_,i)=>({id:`c${i+1}`,asesorId:i%3===0?'a1':i%3===1?'a2':'a3',pais:i%2===0?'GT':'CO'}));
const advisers=[{id:'dir',countries:[]},{id:'a1',countries:[]},{id:'a2',countries:[]},{id:'a3',countries:[]},{id:'op',countries:[],equipoAsesorIds:['a1','a2']}];
function run(source,role,advisorId){const r=runtime(source,{role,advisorId,advisers,clients});const out=r.access.filter('clientes',clone(clients),'cliente360');return{count:out.length,ids:out.map(x=>x.id),metrics:r.metrics()};}
const b=run(baseline,'Dirección','dir');const f=run(current,'Dirección','dir');const own=run(current,'Asesor','a1');const team=run(current,'Operativo','op');
const pass=JSON.stringify(b.ids)===JSON.stringify(f.ids)&&f.count===430&&f.metrics.getCalls===4&&b.metrics.getCalls===1720&&own.count===144&&team.count===287;
const ev={schemaVersion:'orbit360-r4-access-filter-fastpath-postapply-v1',ok:pass,status:pass?'ACCESS_FILTER_FASTPATH_APPLIED_PASS':'ACCESS_FILTER_FASTPATH_APPLIED_FAIL',classification:pass?'FUNCTIONAL_DEFECT_ROOTFIX_APPLIED_SOURCE_PASS':'FUNCTIONAL_DEFECT_ROOTFIX_APPLIED_SOURCE_FAIL',target:TARGET,certifiedBaseline:BASE,appliedSourceEqualsExpectedCandidate:true,syntaxPass:true,direction:{baselineCount:b.count,appliedCount:f.count,baselineGetCalls:b.metrics.getCalls,appliedGetCalls:f.metrics.getCalls,reductionRatio:b.metrics.getCalls/f.metrics.getCalls},advisorOwnCount:own.count,operativeTeamCount:team.count,browserExecuted:false,secretAccess:false,dataAccess:false,productionTouched:false,deployExecuted:false,packageRebuilt:false,containsPII:false,containsSecrets:false};fs.mkdirSync(EVIDENCE_DIR,{recursive:true});fs.writeFileSync(OUT,JSON.stringify(ev,null,2)+'\n');console.log(JSON.stringify(ev,null,2));if(!pass)process.exit(41);
