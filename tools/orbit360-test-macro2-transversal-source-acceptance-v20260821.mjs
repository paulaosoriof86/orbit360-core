#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const CANDIDATE = path.resolve(process.env.ORBIT360_MACRO2_CANDIDATE_DIR || process.argv[2] || path.join(ROOT, 'orbit360-platform'));
const rel = p => path.join(CANDIDATE, p);
const read = p => fs.readFileSync(rel(p), 'utf8').replace(/^\uFEFF/, '');
const exists = p => fs.existsSync(rel(p));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const failures = [];
const checks = [];
const check = (ok, id, detail = null) => { checks.push({ id, ok: !!ok, ...(detail == null ? {} : { detail }) }); if (!ok) failures.push(id); };
const forbiddenVisible = /\b(undefined|NaN|Infinity|-Infinity|Invalid Date)\b/;

const ROUTES = ['inicio','cliente360','aseguradoras','ops','leads','polizas','cobros'];
const ROUTE_FILES = Object.fromEntries(ROUTES.map(r => [r, `modules/${r}.js`]));
const ALLOWED_DELTAS = [
  'core/ui.js',
  'core/queries.js',
  'core/client-canonical-view-projection-v20260716.js',
  'core/ciclo.js',
  'data/store-firestore-product-readonly-p0.js',
  'modules/inicio.js',
  'modules/cliente360.js',
  'modules/aseguradoras.js',
  'modules/cobros.js'
].sort();

for (const [route, file] of Object.entries(ROUTE_FILES)) check(exists(file), `ROUTE_SOURCE_PRESENT:${route}`, file);

// 1) Reusable display contract: execute exact candidate helper in a browser-like VM.
const uiCtx = {
  console,
  Date,
  Math,
  setTimeout: () => 0,
  clearTimeout: () => {},
  location: { hash: '' },
  document: { createElement(){ return { style:{}, className:'', appendChild(){}, addEventListener(){}, querySelector(){return null;} }; }, body:{ appendChild(){} } },
  CustomEvent: class { constructor(type, init){ this.type=type; this.detail=init?.detail; } },
  window: null,
  Orbit: { tenant: { demoDate: 'real' }, modules: {} }
};
uiCtx.window = uiCtx;
vm.runInNewContext(read('core/ui.js'), uiCtx, { filename: 'core/ui.js' });
const U = uiCtx.Orbit.ui;
const displayCases = [undefined, null, NaN, Infinity, -Infinity, '', 'undefined', 'NaN', 'Infinity', '-Infinity', 'Invalid Date'];
for (const v of displayCases) {
  const out = U.text(v);
  check(out === '—' && !forbiddenVisible.test(out), `DISPLAY_TEXT_SAFE:${String(v)}`, out);
}
for (const v of [undefined, null, NaN, Infinity, -Infinity, 'NaN', 'Infinity']) {
  const out = U.money(v, 'GTQ');
  check(out === '—' && !forbiddenVisible.test(out), `DISPLAY_MONEY_SAFE:${String(v)}`, out);
  const short = U.moneyShort(v, 'GTQ');
  check(short === '—' && !forbiddenVisible.test(short), `DISPLAY_MONEY_SHORT_SAFE:${String(v)}`, short);
}
check(U.fmtDate('not-a-date') === '—', 'DISPLAY_INVALID_DATE_SAFE', U.fmtDate('not-a-date'));
check(U.daysFromNow('not-a-date') === null, 'DATE_ARITHMETIC_INVALID_SAFE', U.daysFromNow('not-a-date'));
check(!forbiddenVisible.test(U.estadoBadge(undefined)), 'BADGE_UNDEFINED_SAFE', U.estadoBadge(undefined));
check(U.estadoBadge(undefined).includes('Sin estado'), 'BADGE_HONEST_FALLBACK');

// 2) Query/read-model numeric contract with invalid fixture values.
const fixture = {
  clientes: [{id:'c1', nombre:'A', pais:'GT', moneda:'GTQ', segmento:'Premium'}],
  polizas: [
    {id:'p1',clienteId:'c1',estado:'Vigente',prima:NaN,moneda:'GTQ',asesorId:'a1'},
    {id:'p2',clienteId:'c1',estado:'Por renovar',prima:120,moneda:'GTQ',asesorId:'a1'}
  ],
  cobros: [
    {id:'cb1',clienteId:'c1',estado:'Pagado',monto:Infinity,moneda:'GTQ'},
    {id:'cb2',clienteId:'c1',estado:'Pendiente',monto:50,moneda:'GTQ'},
    {id:'cb3',clienteId:'c1',estado:'Vencido',monto:NaN,moneda:'GTQ',vence:'2026-08-01'}
  ],
  comisiones: [{id:'co1',clienteId:'c1',asesorId:'a1',monto:-Infinity,moneda:'GTQ',estado:'Liquidada'}],
  asesores: [{id:'a1',nombre:'A',metaPrima:NaN}],
  actividades:[],cancelaciones:[],vehiculos:[]
};
const qStore = {
  all(c){ return (fixture[c]||[]).map(x=>({...x})); },
  get(c,id){ return (fixture[c]||[]).find(x=>x.id===id) || null; },
  where(c,p){ return (fixture[c]||[]).filter(typeof p==='function'?p:()=>true).map(x=>({...x})); },
  find(c,p){ const x=(fixture[c]||[]).find(p); return x?{...x}:null; }
};
const qCtx = { console, window:null, Orbit:{store:qStore,ui:U,pais:'GT'} }; qCtx.window=qCtx;
vm.runInNewContext(read('core/queries.js'), qCtx, { filename:'core/queries.js' });
const Q = qCtx.Orbit.q;
for (const v of [NaN, Infinity, -Infinity, undefined, null]) check(Q.norm(v,'GTQ') === 0, `NORM_NONFINITE_SAFE:${String(v)}`, Q.norm(v,'GTQ'));
const resumen = Q.clienteResumen('c1');
for (const k of ['primaAnual','cobrado','pendiente','vencido','comisionGen','salud']) check(Number.isFinite(resumen[k]), `CLIENT_SUMMARY_FINITE:${k}`, resumen[k]);
const idx = Q.clientesResumenIndex().get('c1');
for (const k of ['primaAnual','cobrado','pendiente','vencido','comisionGen','salud']) check(Number.isFinite(idx[k]), `CLIENT_INDEX_FINITE:${k}`, idx[k]);
const lb = Q.leaderboard()[0];
for (const k of ['prima','comision','pct','metaPrima']) check(Number.isFinite(lb[k]), `LEADERBOARD_FINITE:${k}`, lb[k]);

// 3) Client↔policy projection performance contract: one policy load, zero where() per client.
const perfCounts = { allClientes:0, allPolizas:0, wherePolizas:0, emit:0 };
const perfClients = Array.from({length:414}, (_,i)=>({id:`c${i+1}`,nombre:`Cliente ${i+1}`,pais:'GT',moneda:'GTQ'}));
const perfPolicies = Array.from({length:620}, (_,i)=>({id:`p${i+1}`,clienteId:`c${(i%414)+1}`,estado:'Vigente'}));
const perfStore = {
  all(c){ if(c==='clientes'){perfCounts.allClientes++; return perfClients;} if(c==='polizas'){perfCounts.allPolizas++; return perfPolicies;} return []; },
  where(c,p){ if(c==='polizas') perfCounts.wherePolizas++; return (c==='polizas'?perfPolicies:[]).filter(p); },
  find(c,p){ const x=(c==='polizas'?perfPolicies:[]).find(p); return x||null; }
};
const projCtx = {
  console, window:null, Orbit:{store:perfStore}, setTimeout:()=>0,
  CustomEvent: class { constructor(type,init){this.type=type;this.detail=init?.detail;} },
  document:{addEventListener(){}},
};
projCtx.window=projCtx; projCtx.window.addEventListener=()=>{}; projCtx.window.dispatchEvent=()=>{perfCounts.emit++;};
vm.runInNewContext(read('core/client-canonical-view-projection-v20260716.js'), projCtx, { filename:'core/client-canonical-view-projection-v20260716.js' });
const perfResult = projCtx.Orbit.clientCanonicalViewProjectionV20260716.applyAll();
check(perfResult.total===414,'PERF_CLIENT_VOLUME_414',perfResult.total);
check(perfCounts.allPolizas===1,'PERF_POLICY_COLLECTION_SINGLE_LOAD',perfCounts);
check(perfCounts.wherePolizas===0,'PERF_ZERO_N_BY_POLICY_WHERE',perfCounts);
check(perfCounts.allClientes===1,'PERF_CLIENT_COLLECTION_SINGLE_LOAD',perfCounts);

// 4) Product read-only store API and clone/scan guard.
const storeSrc = read('data/store-firestore-product-readonly-p0.js');
check(!/function where\([^)]*\)\s*\{\s*var rows = all\(collection\)/m.test(storeSrc),'STORE_WHERE_NO_FULL_COLLECTION_CLONE');
check(/function where\([^)]*\)[\s\S]{0,1200}?var source = cache\[collection\] \|\| \[\][\s\S]{0,1200}?return matches\.map\(clone\)/m.test(storeSrc),'STORE_WHERE_FILTER_THEN_CLONE');
check(/function find\([^)]*\)[\s\S]{0,700}?var source = cache\[collection\] \|\| \[\][\s\S]{0,700}?return row \? clone\(row\) : null/m.test(storeSrc),'STORE_FIND_DIRECT_CACHE_CLONE');
for (const api of ['all','get','where','find','insert','update','remove','_emit']) check(new RegExp(`\\b${api.replace('_','\\_')}\\s*:`).test(storeSrc),`STORE_API_PRESERVED:${api}`);
check(/insert:\s*fail[\s\S]*update:\s*fail[\s\S]*remove:\s*fail/.test(storeSrc),'STORE_WRITES_REMAIN_BLOCKED');

// 5) Route-specific source invariants across all seven F2 routes.
const cobros = read('modules/cobros.js'), inicio=read('modules/inicio.js'), cliente=read('modules/cliente360.js'), aseg=read('modules/aseguradoras.js'), ciclo=read('core/ciclo.js'), polizas=read('modules/polizas.js'), ops=read('modules/ops.js'), leads=read('modules/leads.js');
check(!cobros.includes('${c.cuota}'),'COBROS_NO_RAW_CUOTA');
check(!cobros.includes('${p.numero}'),'COBROS_NO_RAW_POLICY_NUMBER');
check(!/return\s+c\.estado\s*;/.test(cobros),'COBROS_NO_RAW_VALIDATION_STATE');
check(inicio.includes('U.finiteNumber'),'INICIO_USES_FINITE_CONTRACT');
check(!inicio.includes('${c.cuota}'),'INICIO_NO_RAW_CUOTA');
check(cliente.includes("U.text(c.tipo") && cliente.includes("U.text(c.ciudad") && cliente.includes("U.text(c.pais"),'CLIENT360_SAFE_METADATA');
check(ciclo.includes('U.finiteNumber(n.prob)'),'OPS_LEADS_SHARED_PROB_FINITE');
check(!ciclo.includes('${n.prob}%'),'OPS_LEADS_NO_RAW_PROB');
check(ciclo.includes("d == null ? '—'"),'OPS_LEADS_SAFE_DUE_DATE');
check(aseg.includes("U.text(a.pais, 'País pendiente')"),'INSURERS_SAFE_COUNTRY');
check(aseg.includes("U.text(p.estadoAcceso, 'Sin registrar')"),'INSURERS_SAFE_PORTAL_STATE');
check(polizas.includes('numberOrNull') && polizas.includes('policyPremiumTotal'),'POLICIES_FINITE_READMODEL_PRESENT');
check(ops.includes('C().cardNegocio') && ops.includes('C().cardGestion'),'OPS_DELEGATES_SHARED_CARDS');
check(leads.includes('C().cardNegocio') && leads.includes('q.norm'),'LEADS_DELEGATES_SHARED_CARDS_AND_NORM');

// 6) Integrated surfaces exist and use policy/vehicle/receipts relationship owner.
const detailGuard=read('modules/policy-receipts-v1199-detail-guard.js');
check(detailGuard.includes('orbit-policy-fullpage'),'INTEGRATED_POLICY_FULLPAGE_PRESENT');
check(detailGuard.includes('orbit-vehicle-fullpage'),'INTEGRATED_VEHICLE_FULLPAGE_PRESENT');
check(/Recibos y cartera/i.test(detailGuard),'INTEGRATED_RECEIPTS_PORTFOLIO_PRESENT');
check(exists('core/policy-receipts-engine.js') && exists('modules/policy-receipts-v1199-bridge.js'),'INTEGRATED_RECEIPTS_ENGINE_PRESENT');

// 7) Role-view contract is explicit and unchanged in repository source when available.
const roleContractPath = path.join(ROOT,'tools/orbit360-f2-role-view-contract-v20260818.mjs');
const roleFallbackFiles=['core/access-role-session-owner-v20260728.js','core/access-scope.js'];
const roleSrc=fs.existsSync(roleContractPath)?fs.readFileSync(roleContractPath,'utf8'):roleFallbackFiles.map(read).join('\n');
for (const role of ['Dirección','Operativo','Asesor']) check(roleSrc.includes(role),`ROLE_VIEW_PRESENT:${role}`);

// 8) Security/read-only regression surfaces: present and unmodified by Macro2 delta set.
const securityFiles = [
 'core/auth-product-runtime-p0.js','core/membership-multirol-contract-p0.js','core/membership-multirol-effective-p0.js',
 'core/access-scope.js','core/access-role-session-owner-v20260728.js','core/tenant-access-policy-product-p0.js','core/product-app-p0.js'
];
for (const f of securityFiles) check(exists(f),`SECURITY_SURFACE_PRESENT:${f}`);
check(storeSrc.includes('WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'),'WRITE_GUARD_CODE_PRESERVED');

// 9) Delta audit against predecessor manifest before manifest regeneration.
const manifestPath=path.resolve(process.env.ORBIT360_MACRO2_BASE_MANIFEST || rel('orbit360-package-manifest.json'));
check(fs.existsSync(manifestPath),'PREDECESSOR_MANIFEST_PRESENT');
let deltaPaths=[];
if(fs.existsSync(manifestPath)){
 const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 check(Number(m.fileCount)===194 && Array.isArray(m.files) && m.files.length===194,'MANIFEST_194_FILE_BASELINE');
 deltaPaths=m.files.filter(f=>exists(f.path)&&sha(fs.readFileSync(rel(f.path)))!==f.sha256).map(f=>f.path).sort();
 check(JSON.stringify(deltaPaths)===JSON.stringify(ALLOWED_DELTAS),'DELTA_EXACTLY_ALLOWED_TRANSVERSAL_SET',deltaPaths);
 const protectedTouched=deltaPaths.filter(p=>/^(data\/store|core\/backend-lab-|core\/auth\.js|core\/importa\.js|firestore\.rules|tools\/orbit360-)/.test(p));
 check(JSON.stringify(protectedTouched)===JSON.stringify(['data/store-firestore-product-readonly-p0.js']),'PROTECTED_DELTA_ONLY_EXPLICIT_STORE',protectedTouched);
}

// 10) No invalid visible sentinel remains in deterministic helper outputs produced by fixtures.
const fixtureOutputs=[U.text(undefined),U.money(NaN,'GTQ'),U.moneyShort(Infinity,'GTQ'),U.fmtDate('bad'),U.estadoBadge(undefined),U.text('')];
check(fixtureOutputs.every(x=>!forbiddenVisible.test(String(x))),'FIXTURE_VISIBLE_INVALID_ZERO',fixtureOutputs);

const result={
 schemaVersion:'orbit360-macro2-transversal-source-acceptance-v1',
 ok:failures.length===0,
 status:failures.length?'TRANSVERSAL_SOURCE_ACCEPTANCE_FAIL':'TRANSVERSAL_SOURCE_ACCEPTANCE_PASS',
 classification:failures.length?'FUNCTIONAL_DEFECT':'PASS',
 candidateDir:CANDIDATE,
 routes:ROUTES,
 roleViews:['Dirección desktop','Operativo tablet','Asesor mobile'],
 integratedSurfaces:['policyFullPage','vehicleFullPage','receiptsPortfolio'],
 performance:{clients:414,policies:620,...perfCounts},
 allowedDeltaPaths:ALLOWED_DELTAS,
 observedDeltaPaths:deltaPaths,
 protectedDeltaPolicy:'ONLY_EXPLICIT_PRODUCT_READONLY_STORE_ROOTFIX',
 checksTotal:checks.length,
 checksPassed:checks.filter(x=>x.ok).length,
 failures,
 checks,
 runtimeExecuted:false,
 browserExecuted:false,
 secretAccess:false,
 firestoreRead:false,
 firestoreWrites:0,
 authWrites:0,
 operationalWrites:0,
 deployExecuted:false,
 productionTouched:false,
 containsPII:false,
 containsSecrets:false
};
console.log(JSON.stringify(result,null,2));
if(!result.ok) process.exit(41);
