'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const s476=require('./cotcomp-sat2026-normalized-catalog-s476');
const s=require('./cotcomp-dropdown-adapter-alias-s477');

const rows=s476.parseText([
'AUTOMOVIL          TOYOTA              COROLLA                             1800      4           4        GA              5         140,552.13    127,774.66   116,158.78    105,598.89     95,998.99     87,271.81     79,338.01     72,125.46     65,568.60     59,611.45     54,192.23     49,265.67     44,786.97     40,715.43     36,643.89     23,193.60',
'CAMIONETA          MAZDA               CX-5 SPORT AWD                     2500      4           4        GA              5         200,000.00    190,000.00   180,000.00    170,000.00    160,000.00    150,000.00    140,000.00    130,000.00    120,000.00    110,000.00    100,000.00     90,000.00     80,000.00     70,000.00     60,000.00     50,000.00',
'CAMIONETA          HONDA               CR-V EX                            2400      4           5        GA              5         200,000.00    190,000.00   180,000.00    170,000.00    160,000.00    150,000.00    140,000.00    130,000.00    120,000.00    110,000.00    100,000.00     90,000.00     80,000.00     70,000.00     60,000.00     50,000.00'
].join('\n')).rows;
const catalog=s476.buildCatalog(rows);

test('S4.77 brand list is catalog-backed and optionally type-scoped',()=>{
  const all=s.listBrands(catalog);
  assert.deepEqual(all.map(x=>x.label),['HONDA','MAZDA','TOYOTA']);
  const auto=s.listBrands(catalog,{allowedTypes:['AUTOMOVIL']});
  assert.deepEqual(auto.map(x=>x.label),['TOYOTA']);
});

test('S4.77 model search depends on canonical brand selection',()=>{
  assert.equal(s.searchModels(catalog,{query:'COROLLA'}).ok,false);
  const toyota=catalog.entries.find(x=>x.brand==='TOYOTA');
  const out=s.searchModels(catalog,{brandId:toyota.brandId,query:'cor'});
  assert.equal(out.ok,true);
  assert.equal(out.options.length,1);
  assert.equal(out.options[0].label,'COROLLA');
});

test('S4.77 exact selection requires separate year and carries catalog provenance',()=>{
  const toyota=catalog.entries.find(x=>x.brand==='TOYOTA');
  const bad=s.selectModel(catalog,{brandId:toyota.brandId,modelId:toyota.modelId});
  assert.equal(bad.ok,false);
  assert.equal(bad.code,'YEAR_SELECTION_REQUIRED');
  const good=s.selectModel(catalog,{brandId:toyota.brandId,modelId:toyota.modelId,vehicleYear:2006});
  assert.equal(good.ok,true);
  assert.equal(good.state,'CANONICAL_SAT_SELECTION');
  assert.equal(good.vehicleIdentity.year,2006);
  assert.equal(good.vehicleIdentity.modelLabel,'COROLLA');
});

test('S4.77 unapproved alias is never silently selectable',()=>{
  const honda=catalog.entries.find(x=>x.brand==='HONDA');
  const out=s.selectModel(catalog,{brandId:honda.brandId,modelId:'alias:CRV',vehicleYear:2002},[]);
  assert.equal(out.ok,false);
  assert.equal(out.code,'APPROVED_ALIAS_REQUIRED');
});

test('S4.77 approved alias requires explicit registry evidence',()=>{
  const honda=catalog.entries.find(x=>x.brand==='HONDA');
  const crv=catalog.entries.find(x=>x.brand==='HONDA');
  const registry=[{
    status:'APPROVED',type:'CAMIONETA',brand:'HONDA',alias:'CRV',
    canonicalModelIds:[crv.modelId],
    approvalCommitmentSha256:'a'.repeat(64),
    provenance:'OWNER_REVIEWED'
  }];
  const out=s.selectModel(catalog,{brandId:honda.brandId,modelId:'alias:CRV',vehicleYear:2002},registry);
  assert.equal(out.ok,true);
  assert.equal(out.state,'APPROVED_ALIAS_SELECTION');
  assert.equal(out.vehicleIdentity.approvalCommitmentSha256,'a'.repeat(64));
});

test('S4.77 readiness does not overclaim public release',()=>{
  const r=s.readiness(catalog);
  assert.equal(r.adapterContractReady,true);
  assert.equal(r.searchableBrandSelectReady,true);
  assert.equal(r.dependentModelSearchReady,true);
  assert.equal(r.yearSeparateReady,true);
  assert.equal(r.approvedAliasCount,0);
  assert.equal(r.publicReleaseReady,false);
  assert.deepEqual(r.blockers,[
    'GT_AUTO_MOTO_ALLOWED_TYPE_SCOPE_REQUIRED',
    'REVIEWED_ALIAS_DECISIONS_REQUIRED',
    'CATALOG_DELIVERY_SURFACE_REQUIRED'
  ]);
  assert.equal(r.providerEligibilityEmbedded,false);
  assert.equal(r.appDataReads,0);
  assert.equal(r.appDataWrites,0);
  assert.equal(r.deployment,false);
  assert.equal(r.productionTouched,false);
});
