'use strict';
// B4-003 P0 QA segregation. Synthetic-only functional checks; no Firestore
// access, deletion, mutation, credentials, backend or deployment.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const renewalSource=fs.readFileSync('orbit360-platform/modules/renovaciones.js','utf8');
const start=renewalSource.indexOf('const countryCode =');
const stop=renewalSource.indexOf('const renewabilityState =',start);
assert.ok(start>=0&&stop>start,'preserve canonical renewal country/QA boundary');
const selectionSource=renewalSource.slice(start,stop);
assert.match(renewalSource,/function renewalLifecycleSnapshot\(\)\s*\{\s*const store=S\(\),rows=\(store\.all\('polizas'\)\|\|\[\]\)\.filter\(p=>p&&p\.id&&!isSyntheticQaPolicy\(p\)\)/,
  'renewal lineage projection must share the same QA exclusion as the board');

const qaMarker=row=>!!row&&(row.__syntheticQa===true||row.syntheticQa===true||
  /^B2 QA firme(?:\s|$)/i.test(String(row.sourceRef||'').trim()));
function included(policy,selected='TODOS',clients={},withShared=true){
  const sandbox={
    Orbit:{pais:selected},p:policy,
    q:withShared?{isSyntheticQaRecord:qaMarker}:{},
    S:()=>({get:(collection,id)=>collection==='clientes'?clients[String(id)]||null:null})
  };
  vm.runInNewContext(selectionSource+'\nthis.output=selectedCountry(p);',sandbox,{timeout:1000});
  return sandbox.output;
}
test('3 source-backed B2 QA orphan policies never leak into GT/CO/TODOS renewals',()=>{
  for(const id of ['pol_mulsmxsk','pol_mulssmuz','pol_mulsxofx']){
    const row={id,pais:'GT',sourceRef:'B2 QA firme 2026',vigenciaFin:'2026-12-01'};
    for(const country of ['TODOS','GT','CO']){
      assert.equal(included(row,country),false);
      assert.equal(included(row,country,{},false),false,'fallback keeps B2 excluded without helper');
    }
  }
});
test('14 cancelled-run synthetic QA fixtures and QA-linked clients remain non-commercial',()=>{
  for(let i=0;i<14;i++)for(const country of ['TODOS','GT','CO']){
    assert.equal(included({id:'fixture-'+i,pais:'GT',__syntheticQa:true},country),false);
  }
  assert.equal(included({pais:'GT',syntheticQa:true},'GT'),false);
  assert.equal(included({pais:'GT',clienteId:'qa-client'},'GT',
    {'qa-client':{id:'qa-client',__syntheticQa:true}}),false);
});
test('approved real-country renewals survive while wrong-country rows stay excluded',()=>{
  assert.equal(included({id:'real-gt',pais:'GT',clienteId:'real-client'},'TODOS',
    {'real-client':{id:'real-client',pais:'GT'}}),true);
  assert.equal(included({pais:'GT'},'GT'),true);
  assert.equal(included({pais:'GT'},'CO'),false);
  assert.equal(included({pais:'CO'},'CO'),true);
  assert.equal(included({pais:'CO'},'GT'),false);
  assert.equal(included({pais:'GT',sourceRef:'B2 QA firmeza comercial'},'GT'),true);
});
test('frozen bounded provenance lists 14 QA roots, 3 B2 orphans and 12 finance links',()=>{
  const path='artifacts/orbit360-recovery/release-control/I6_5_B4_003_EXACT_QA_RESIDUE_DEPENDENCIES_READBACK_20261030.json';
  const r=JSON.parse(fs.readFileSync(path,'utf8')).sections.exactQaResidue;
  assert.equal(r.declaredRelationCoverageComplete,true);
  assert.equal(r.universalDependencyGraphComplete,false,'do not over-certify the dependency graph');
  assert.equal(r.disposition,'HOLD_NO_CLEANUP_OR_ACCEPTANCE');
  const b2=r.roots.filter(x=>x.collection==='polizas'&&/^pol_muls/.test(x.id));
  const cancelled=r.roots.filter(x=>!b2.some(b=>b.collection===x.collection&&b.id===x.id));
  assert.equal(b2.length,3);
  assert.equal(cancelled.length,14);
  for(const root of cancelled){
    const entry=r.records.find(x=>x.collection===root.collection&&x.id===root.id);
    assert.ok(entry?.exists&&entry.synthetic?.explicit,'each cancelled-run root must carry verified QA marker');
  }
  const parents=new Set(b2.map(x=>'data/polizas/items/'+x.id));
  const links=r.edges.filter(x=>parents.has(x.from)&&
    /^data\/(recibosEsperados|carteraPrimas)\/items\//.test(x.to));
  assert.equal(links.filter(x=>x.to.includes('/recibosEsperados/')).length,6);
  assert.equal(links.filter(x=>x.to.includes('/carteraPrimas/')).length,6);
  assert.equal(new Set(links.map(x=>x.to)).size,12);
  for(const link of links)assert.equal(r.records.find(x=>x.document===link.to)?.exists,true);
  assert.equal(r.issues?.length||0,0);
});