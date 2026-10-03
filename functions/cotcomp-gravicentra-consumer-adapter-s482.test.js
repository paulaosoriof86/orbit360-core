'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-gravicentra-consumer-adapter-s482');

const D1='1'.repeat(64),D2='2'.repeat(64),R1='a'.repeat(64);

function manifest(version,digest){
  return {
    authority:'GRAVICENTRA',tenantId:'alianzas-soluciones',country:'GT',
    configurationVersion:version,catalogVersion:'veh-v1',
    effectiveAt:'2026-10-03T08:00:00-06:00',
    generatedAt:'2026-10-03T08:00:00-06:00',
    releaseState:'LAB',journeys:['GT_AUTO_MOTO_HYBRID'],
    products:[{id:'auto'}],insurers:[{id:'ins-1'}],digestSha256:digest
  };
}

function proposal(overrides={}){
  return {
    proposalId:'prop-1',proposalVersion:'1',quoteCaseRef:'qc-ref',
    correlationId:'corr-1',tenantId:'alianzas-soluciones',country:'GT',
    insurerId:'ins-1',productId:'auto',executionMode:'HYBRID',
    proposalState:'VALIDATED',validNow:true,
    money:{currency:'GTQ',netPremium:100,totalPremium:123,installments:12,installmentValue:10.25},
    coverages:[],deductibles:[],assistance:[],conditions:[],exclusions:[],paymentOptions:[],
    trace:{
      configurationVersion:'cfg-v1',tariffVersion:'tar-v1',sourceVersion:'src-v1',
      providerBindingVersion:'bind-v1',catalogVersion:'veh-v1',rulesDigest:R1,
      calculatedAt:'2026-10-03T08:05:00-06:00',validityFrom:'2026-10-03',validityTo:'2026-10-10'
    },
    ...overrides
  };
}

test('S4.82 consumes a Gravicentra manifest without local business rules',async()=>{
  const adapter=S.createConsumerAdapter({
    getManifest:async()=>manifest('cfg-v1',D1),
    quote:async()=>{throw new Error('unused')}
  });
  const m=await adapter.loadManifest({tenantId:'alianzas-soluciones',country:'GT'});
  assert.equal(m.authority,'GRAVICENTRA');
  assert.equal(m.configurationVersion,'cfg-v1');
});

test('S4.82 accepts Gravicentra Proposal values exactly as reported and never recomputes them',async()=>{
  const adapter=S.createConsumerAdapter({
    getManifest:async()=>manifest('cfg-v1',D1),
    quote:async(req)=>({
      authority:'GRAVICENTRA',correlationId:req.correlationId,idempotencyKey:req.idempotencyKey,
      executionMode:'HYBRID',status:'QUOTED',
      proposals:[proposal()],comparisonFacts:[],
      responseTrace:{configurationVersion:'cfg-v1'}
    })
  });
  const out=await adapter.requestQuote({
    tenantId:'alianzas-soluciones',country:'GT',journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr-1',idempotencyKey:'idem-1',risk:{vehicleRef:'veh-1'}
  });
  assert.equal(out.proposals[0].money.netPremium,100);
  assert.equal(out.proposals[0].money.totalPremium,123);
  assert.equal(out.proposals[0].money.installmentValue,10.25);
  assert.deepEqual(out.eligibleProposalIds,['prop-1']);
});

test('S4.82 rejects response authority, correlation or idempotency drift',async()=>{
  const baseReq={tenantId:'alianzas-soluciones',country:'GT',journeyId:'GT_AUTO_MOTO_HYBRID',correlationId:'corr-1',idempotencyKey:'idem-1',risk:{}};
  for(const raw of [
    {authority:'COTCOMP',correlationId:'corr-1',idempotencyKey:'idem-1',proposals:[]},
    {authority:'GRAVICENTRA',correlationId:'wrong',idempotencyKey:'idem-1',proposals:[]},
    {authority:'GRAVICENTRA',correlationId:'corr-1',idempotencyKey:'wrong',proposals:[]}
  ]){
    const adapter=S.createConsumerAdapter({getManifest:async()=>manifest('cfg-v1',D1),quote:async()=>raw});
    await assert.rejects(()=>adapter.requestQuote(baseReq));
  }
});

test('S4.82 preserves missing semantics delivered by Gravicentra',async()=>{
  const adapter=S.createConsumerAdapter({
    getManifest:async()=>manifest('cfg-v1',D1),
    quote:async(req)=>({
      authority:'GRAVICENTRA',correlationId:req.correlationId,idempotencyKey:req.idempotencyKey,
      executionMode:'HYBRID',status:'QUOTED',proposals:[proposal()],
      comparisonFacts:[{key:'roadside',label:'Asistencia',comparability:'MISSING',coverageState:'UNKNOWN'}]
    })
  });
  const out=await adapter.requestQuote({
    tenantId:'alianzas-soluciones',country:'GT',journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr-1',idempotencyKey:'idem-1',risk:{}
  });
  assert.equal(out.comparisonFacts[0].comparability,'MISSING');
  assert.equal(out.comparisonFacts[0].coverageState,'UNKNOWN');
});

test('S4.82 blocks invalid missing -> not covered inference',async()=>{
  const adapter=S.createConsumerAdapter({
    getManifest:async()=>manifest('cfg-v1',D1),
    quote:async(req)=>({
      authority:'GRAVICENTRA',correlationId:req.correlationId,idempotencyKey:req.idempotencyKey,
      executionMode:'HYBRID',status:'QUOTED',proposals:[proposal()],
      comparisonFacts:[{key:'roadside',comparability:'MISSING',coverageState:'NOT_COVERED'}]
    })
  });
  await assert.rejects(()=>adapter.requestQuote({
    tenantId:'alianzas-soluciones',country:'GT',journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr-1',idempotencyKey:'idem-1',risk:{}
  }),/S482_COMPARISON_FACT_INVALID/);
});

test('S4.82 selection handoff requires explicit user choice',()=>{
  const adapter=S.createConsumerAdapter({getManifest:async()=>manifest('cfg-v1',D1),quote:async()=>({})});
  assert.throws(()=>adapter.prepareSelection({
    tenantId:'alianzas-soluciones',country:'GT',correlationId:'corr-1',
    selectedProposalId:'prop-1',selectedProposalVersion:'1',explicitUserChoice:false,
    choiceEvidenceRef:'choice-ref',idempotencyKey:'sel-1'
  }),/EXPLICIT_USER_CHOICE_REQUIRED/);
  const ok=adapter.prepareSelection({
    tenantId:'alianzas-soluciones',country:'GT',correlationId:'corr-1',
    selectedProposalId:'prop-1',selectedProposalVersion:'1',explicitUserChoice:true,
    choiceEvidenceRef:'choice-ref',idempotencyKey:'sel-1'
  });
  assert.equal(ok.issued,false);
  assert.equal(ok.bound,false);
  assert.equal(ok.confirmed,false);
});

test('S4.82 new configuration affects new quotes while existing Proposal remains pinned',()=>{
  const adapter=S.createConsumerAdapter({getManifest:async()=>manifest('cfg-v1',D1),quote:async()=>({})});
  const x=adapter.reconcileConfigurationTransition(
    manifest('cfg-v1',D1),manifest('cfg-v2',D2),proposal()
  );
  assert.equal(x.changed,true);
  assert.equal(x.newQuoteConfigurationVersion,'cfg-v2');
  assert.equal(x.existingProposalConfigurationVersion,'cfg-v1');
  assert.equal(x.existingProposalTariffVersion,'tar-v1');
  assert.equal(x.existingProposalRulesDigest,R1);
  assert.equal(x.existingProposalRecalculated,false);
  assert.equal(x.webRedeployRequired,false);
});

test('S4.82 request digest is deterministic for equivalent objects',()=>{
  const a={b:2,a:1,nested:{z:3,y:2}};
  const b={nested:{y:2,z:3},a:1,b:2};
  assert.equal(S.sha256(S.stableJson(a)),S.sha256(S.stableJson(b)));
});

test('S4.82 source has no Firebase, provider, insurer-specific or tariff-rate implementation',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-gravicentra-consumer-adapter-s482.js'),'utf8').toUpperCase();
  for(const forbidden of [
    'FIREBASE-ADMIN','GETFIRESTORE','ONREQUEST','ONCALL',
    'ASEGURADORA GUATEMALTECA','BANTRAB','BANRURAL','COLUMNA',
    '0.12','0.19','13.3','13.6','CALCULATEPREMIUM','CALCULATETAX'
  ]) assert.equal(src.includes(forbidden),false,forbidden);
});
