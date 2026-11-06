'use strict';
// B4-003 causal regression: synthetic opportunities stay auditable without
// appearing in ordinary Ops/Leads/Inicio commercial boards and totals.
// Source-only, no network, Firestore, Auth, Rules, live writes or fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('orbit360-platform/core/ciclo.js','utf8');
const a=src.indexOf('  function isSyntheticQaBusiness('),b=src.indexOf('  function gestiones(',a);
assert.ok(a>=0&&b>a,'COMMERCIAL_QA_OWNER_NOT_FOUND');
const fixture=[
  {id:'b4003qa_business_collab_38102224750',pais:'GT',asesorId:'a',__syntheticQa:true},
  {id:'b4003qa_meta_tr_v27_20261025_01',pais:'GT',asesorId:'a'},
  {id:'qa-by-flag',pais:'GT',asesorId:'a',syntheticQa:true},
  {id:'business-GT',pais:'GT',asesorId:'a'},
  {id:'business-CO',pais:'CO',asesorId:'a'},
  {id:'business-hidden',pais:'GT',asesorId:'other'},
  {id:'archived',pais:'GT',asesorId:'a',archivado:true},
  {id:'b2-synthetic',pais:'GT',asesorId:'a',sourceRef:'B2 QA firme — rótulo'}
];
let writes=0;
function run(country,opts,confirmed=true){
  const db={all:key=>key==='negocios'?fixture:[],
    _productStatus:()=>({serverConfirmedCollections:confirmed?['negocios']:[]}),
    set(){writes++;throw Error('UNEXPECTED_WRITE')}};
  const ctx={S:()=>db,paisOK:p=>country==='TODOS'||p===country,
    scopeAllows:id=>id==='a',ensureAdvisorRoster:()=>{},String,Array,Object};
  vm.runInNewContext(src.slice(a,b)+'\nthis.query=negocios;',ctx,{timeout:1000});
  return Array.from(ctx.query(opts),x=>x.id);
}
const same=(actual,expected,msg)=>assert.deepEqual(actual,expected,msg);
same(run('GT',{surface:'ops'}),['business-GT'],'GT_OPS_NORMAL_FILTERS_QA_AND_OTHER_ADVISORS');
same(run('GT',{surface:'leads'}),['business-GT'],'GT_LEADS_NORMAL_FILTERS_QA');
same(run('CO',{surface:'leads'}),['business-CO'],'CO_COUNTRY_SCOPE');
same(run('TODOS',{surface:'leads'}),['business-GT','business-CO'],'COUNTRY_SUM_EQ_ALL');
same(run('GT',{surface:'ops',includeSyntheticQa:true}),
  ['b4003qa_business_collab_38102224750','b4003qa_meta_tr_v27_20261025_01','qa-by-flag','business-GT','b2-synthetic'],
  'AUDIT_MODE_RETAINS_QA_BUT_RESPECTS_ROLE_AND_COUNTRY');
same(run('GT',{surface:'ops',incArchivado:true}),['business-GT','archived'],'ARCHIVED_COMMERCIAL_NOT_QA');
same(run('GT',{surface:'ops'},false),[],'NO_PROVISIONAL_SERVER_SNAPSHOT');
assert.match(src,/function opsBoard\(\) \{\s+const ng = negocios\(\{surface:'ops'\}\)/,'OPS_USES_SINGLE_FILTER');
assert.match(src,/function leadsBoard\(\) \{\s+const ng = negocios\(\{surface:'leads'\}\)/,'LEADS_USES_SINGLE_FILTER');
assert.match(src,/function metricasLeads\(\) \{\s+const ng = negocios\(\{surface:'leads'\}\)/,'KPIS_USE_SINGLE_FILTER');
assert.equal(writes,0,'ZERO_OPERATIVE_WRITES');
console.log('B4_003_COMMERCIAL_PIPELINE_QA_ISOLATION_PASS 11/11 SOURCE_ONLY');
