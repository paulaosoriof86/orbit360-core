#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'orbit360-platform/core/access-scope.js');
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const EVIDENCE = path.join(EVIDENCE_DIR, 'r4-access-filter-fastpath-rootfix-v20260815.json');
const oldFilter = `  function filter(collection, rows, moduleKey) {
    return (rows || []).filter(function (r) { return canView(collection, r, moduleKey); });
  }`;
const newFilter = `  function filter(collection, rows, moduleKey) {
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

function exactlyOnce(haystack, needle) { return haystack.split(needle).length - 1 === 1; }
function candidateSource(source) {
  if (!exactlyOnce(source, oldFilter)) throw new Error('ACCESS_FILTER_BASE_CONTRACT_NOT_EXACTLY_ONCE');
  const candidate = source.replace(oldFilter, newFilter);
  if (candidate.includes(oldFilter) || !exactlyOnce(candidate, newFilter)) throw new Error('ACCESS_FILTER_REPLACEMENT_CONTRACT_FAILED');
  return candidate;
}
function syntaxCheck(source) {
  const temp = path.join(os.tmpdir(), `orbit360-access-filter-${process.pid}-${Date.now()}.js`);
  fs.writeFileSync(temp, source, 'utf8');
  try { execFileSync(process.execPath, ['--check', temp], { stdio: 'pipe' }); }
  finally { try { fs.unlinkSync(temp); } catch {} }
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function makeRuntime(source, cfg) {
  let getCalls = 0, allCalls = 0;
  const advisers = clone(cfg.advisers || []);
  const collections = { asesores: advisers, clientes: clone(cfg.clients || []), polizas: clone(cfg.policies || []) };
  const store = {
    all(name) { allCalls += 1; return clone(collections[name] || []); },
    get(name, id) { getCalls += 1; return store.all(name).find(row => String(row.id) === String(id)) || null; },
    where(name, pred) { return store.all(name).filter(pred); },
    insert(){ throw new Error('WRITE_NOT_ALLOWED'); }, update(){ throw new Error('WRITE_NOT_ALLOWED'); }, remove(){ throw new Error('WRITE_NOT_ALLOWED'); }
  };
  const role = cfg.role;
  const advisorId = cfg.advisorId || '';
  const roles = cfg.assignedRoles || [role];
  const visible = cfg.visibleModules || ['cliente360','polizas','ops','leads','aseguradoras'];
  const context = {
    console,
    setTimeout,
    clearTimeout,
    CustomEvent: class CustomEvent { constructor(type, opts){ this.type=type; this.detail=opts && opts.detail; } },
    window: null,
    Orbit: {
      store,
      session: {
        rol: () => role,
        asesorId: () => advisorId,
        rolesAsignados: () => roles.slice(),
        canSee: key => visible.includes(key)
      },
      auth: { user: () => ({ uid:'u1', email:'redacted@example.invalid', rol:role }) },
      tenant: { get: () => ({}), isActive: key => cfg.tenantActive !== false && visible.includes(key) },
      ROLES: {
        'Dirección': { modulos: visible.slice(), scopes:{cliente360:'all',polizas:'all'} },
        'Operativo': { modulos: visible.slice(), scopes:{cliente360:'team',polizas:'team'} },
        'Asesor': { modulos: visible.slice(), scopes:{cliente360:'own',polizas:'own'} }
      }
    }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename:'access-scope.js', timeout:5000 });
  return { access: context.Orbit.access, metrics: () => ({ getCalls, allCalls }) };
}
function ids(rows){ return rows.map(x => x && x.id).filter(Boolean); }
function scenario(name, cfg, collection='clientes', moduleKey='cliente360') {
  const source = fs.readFileSync(SOURCE,'utf8');
  const candidate = candidateSource(source);
  const base = makeRuntime(source,cfg); const fast = makeRuntime(candidate,cfg);
  const baseOut = base.access.filter(collection, clone(cfg[collection] || cfg.clients || []), moduleKey);
  const fastOut = fast.access.filter(collection, clone(cfg[collection] || cfg.clients || []), moduleKey);
  const same = JSON.stringify(ids(baseOut)) === JSON.stringify(ids(fastOut));
  return { name, same, baseCount:baseOut.length, fastCount:fastOut.length, baseMetrics:base.metrics(), fastMetrics:fast.metrics(), ids:ids(fastOut) };
}

const clients = Array.from({length:430}, (_,i)=>({id:`c${i+1}`,asesorId:i%3===0?'a1':i%3===1?'a2':'a3',pais:i%2===0?'GT':'CO'}));
const advisers = [
  {id:'dir',countries:[]},
  {id:'dir-gt',countries:['GT']},
  {id:'a1',countries:[]},
  {id:'op',countries:[],equipoAsesorIds:['a1','a2']},
  {id:'a2',countries:[]},
  {id:'a3',countries:[]}
];
const tests = [];
tests.push(scenario('direction-all-430',{role:'Dirección',advisorId:'dir',advisers,clients}));
tests.push(scenario('direction-country-gt',{role:'Dirección',advisorId:'dir-gt',advisers,clients}));
tests.push(scenario('advisor-own',{role:'Asesor',advisorId:'a1',advisers,clients}));
tests.push(scenario('operative-team',{role:'Operativo',advisorId:'op',advisers,clients}));
tests.push(scenario('module-denied',{role:'Dirección',advisorId:'dir',advisers,clients,tenantActive:false}));
const sensitiveRows=[{id:'s1',pais:'GT'},{id:'s2',pais:'CO'}];
tests.push(scenario('sensitive-nonadmin',{role:'Asesor',advisorId:'a1',advisers,clients:sensitiveRows,auditLog:sensitiveRows},'auditLog','auditLog'));

const direction = tests.find(t=>t.name==='direction-all-430');
const country = tests.find(t=>t.name==='direction-country-gt');
const own = tests.find(t=>t.name==='advisor-own');
const team = tests.find(t=>t.name==='operative-team');
const denied = tests.find(t=>t.name==='module-denied');
const sensitive = tests.find(t=>t.name==='sensitive-nonadmin');
const source = fs.readFileSync(SOURCE,'utf8');
const candidate = candidateSource(source); syntaxCheck(candidate);
const allEquivalent = tests.every(t=>t.same);
const pass = allEquivalent && direction.fastCount===430 && direction.baseMetrics.getCalls>1000 && direction.fastMetrics.getCalls<=6 && country.fastCount===215 && own.fastCount===144 && team.fastCount===287 && denied.fastCount===0 && sensitive.fastCount===0;
const evidence = {
  schemaVersion:'orbit360-r4-access-filter-fastpath-rootfix-v1',
  ok:pass,
  status:pass?'ACCESS_FILTER_FASTPATH_SOURCE_PASS':'ACCESS_FILTER_FASTPATH_SOURCE_FAIL',
  classification:pass?'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_PASS':'FUNCTIONAL_DEFECT_ROOTFIX_SOURCE_FAIL',
  sourcePath:'orbit360-platform/core/access-scope.js',
  baseFilterContractMatched:true,
  syntaxPass:true,
  semanticEquivalence:allEquivalent,
  tests,
  directionOptimization:{baseGetCalls:direction.baseMetrics.getCalls,fastGetCalls:direction.fastMetrics.getCalls,reductionRatio:direction.fastMetrics.getCalls?direction.baseMetrics.getCalls/direction.fastMetrics.getCalls:null},
  writesAuthorized:false,browserExecuted:false,secretAccess:false,dataAccess:false,productionTouched:false,deployExecuted:false,packageRebuilt:false,containsPII:false,containsSecrets:false
};
fs.mkdirSync(EVIDENCE_DIR,{recursive:true});
fs.writeFileSync(EVIDENCE,JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(path.join(EVIDENCE_DIR,'access-scope.fastpath.candidate.js'),candidate,'utf8');
console.log(JSON.stringify(evidence,null,2));
if(!pass) process.exit(41);
