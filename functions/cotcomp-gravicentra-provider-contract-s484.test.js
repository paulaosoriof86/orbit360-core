'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const S=require('./cotcomp-gravicentra-provider-contract-s484');

const MANIFEST_DIGEST='d'.repeat(64);
const RULES_DIGEST='a'.repeat(64);

function field(key,label,type='TEXT',required=true,extra={}){
  return {key,label,type,required,...extra};
}

function manifest(){
  return {
    authority:'GRAVICENTRA',
    tenantId:'alianzas-soluciones',
    country:'GT',
    configurationVersion:'cfg-provider-v1',
    catalogVersion:'catalog-v1',
    effectiveAt:'2026-10-03T11:00:00-06:00',
    generatedAt:'2026-10-03T11:00:00-06:00',
    releaseState:'LAB_SOURCE_ONLY',
    digestSha256:MANIFEST_DIGEST,
    providerContractVersion:'gravicentra-quote-authority-v1',
    providerDeploymentAuthorized:false,
    cotcompRealTransportAuthorized:false,
    capabilities:{
      manifest:true,quote:true,proposal:true,selection:true
    },
    knowledgeRefs:['knowledge://insurers/shared-v1'],
    intakeSchemas:[
      {
        schemaId:'gt-private-mobility-v1',
        schemaVersion:'1',
        enabled:true,
        scope:{country:'GT',lineOfBusiness:'MOBILITY',productId:'private-auto',riskType:'VEHICLE'},
        fields:[
          field('make','Marca','SELECT',true,{optionsRef:'catalog://vehicle/makes'}),
          field('model','Línea / modelo','SELECT',true,{optionsRef:'catalog://vehicle/models'}),
          field('year','Año','INTEGER')
        ],
        knowledgeRefs:['knowledge://mobility/gt']
      },
      {
        schemaId:'gt-business-property-v1',
        schemaVersion:'3',
        enabled:true,
        scope:{country:'GT',lineOfBusiness:'PROPERTY',productId:'business-property',riskType:'COMMERCIAL_LOCATION'},
        fields:[
          field('activity','Actividad','SELECT'),
          field('insuredValue','Valor a proteger','MONEY'),
          field('constructionClass','Tipo de construcción','SELECT',false)
        ],
        knowledgeRefs:['knowledge://property/gt']
      },
      {
        schemaId:'co-cargo-v2',
        schemaVersion:'2',
        enabled:true,
        scope:{country:'CO',lineOfBusiness:'TRANSPORT',productId:'cargo',riskType:'CARGO_MOVEMENT'},
        fields:[
          field('cargoType','Tipo de mercancía','SELECT'),
          field('routeType','Tipo de trayecto','SELECT'),
          field('annualMovement','Movimiento anual','MONEY',false)
        ],
        knowledgeRefs:['knowledge://transport/co']
      }
    ]
  };
}

function proposal(country='GT'){
  return {
    proposalId:'proposal-1',
    proposalVersion:'4',
    quoteCaseRef:'case-1',
    correlationId:'corr-1',
    tenantId:'alianzas-soluciones',
    country,
    insurerId:'insurer-1',
    productId:'product-1',
    planId:'plan-1',
    executionMode:'HYBRID',
    proposalState:'VALIDATED',
    validNow:true,
    money:{currency:country==='CO'?'COP':'GTQ',netPremium:100,totalPremium:123,installments:1,installmentValue:123},
    coverages:[],
    deductibles:[],
    assistance:[],
    conditions:[],
    exclusions:[],
    paymentOptions:[],
    trace:{
      configurationVersion:'cfg-provider-v1',
      tariffVersion:'tariff-7',
      sourceVersion:'source-9',
      providerBindingVersion:'binding-3',
      catalogVersion:'catalog-v1',
      rulesDigest:RULES_DIGEST,
      calculatedAt:'2026-10-03T11:01:00-06:00',
      validityFrom:'2026-10-03',
      validityTo:'2026-10-10'
    }
  };
}

test('S4.84 consumes the frozen provider-side contract while keeping real transport fail-closed',()=>{
  const m=S.normalizeProviderManifest(manifest());
  assert.equal(S.validateProviderManifest(m).ok,true);
  assert.equal(m.providerContractVersion,'gravicentra-quote-authority-v1');
  assert.equal(m.providerDeploymentAuthorized,false);
  assert.equal(m.cotcompRealTransportAuthorized,false);
  const p=S.sourceOnlyPolicy();
  assert.equal(p.localTariffEngine,false);
  assert.equal(p.localFinancialRecalculation,false);
  assert.equal(p.realTransport,'FAIL_CLOSED_UNTIL_LAB_TRANSPORT_PASS');
});

test('S4.84 is multiproduct and resolves schemas from provider data, not one hardcoded ramo',()=>{
  const m=S.normalizeProviderManifest(manifest());
  const contexts=[
    [{tenantId:'alianzas-soluciones',country:'GT',journeyId:'q1',lineOfBusiness:'MOBILITY',productId:'private-auto',riskType:'VEHICLE'},'gt-private-mobility-v1'],
    [{tenantId:'alianzas-soluciones',country:'GT',journeyId:'q2',lineOfBusiness:'PROPERTY',productId:'business-property',riskType:'COMMERCIAL_LOCATION'},'gt-business-property-v1'],
    [{tenantId:'alianzas-soluciones',country:'CO',journeyId:'q3',lineOfBusiness:'TRANSPORT',productId:'cargo',riskType:'CARGO_MOVEMENT'},'co-cargo-v2']
  ];
  for(const [ctx,id] of contexts){
    const resolved=S.resolveIntakeSchema(m,ctx);
    assert.equal(resolved.status,'SCHEMA_RESOLVED');
    assert.equal(resolved.schema.schemaId,id);
  }
});

test('S4.84 has no silent Auto fallback when the provider has not supplied a matching schema',()=>{
  const r=S.resolveIntakeSchema(manifest(),{
    tenantId:'alianzas-soluciones',country:'GT',journeyId:'q4',
    lineOfBusiness:'BENEFITS',productId:'group-health',riskType:'EMPLOYEE_GROUP'
  });
  assert.equal(r.status,'REQUIRES_PROVIDER_SCHEMA');
  assert.equal(r.schema,null);
});

test('S4.84 progressive capture obeys schema conditions instead of local business branching',()=>{
  const schema={
    schemaId:'conditional-v1',schemaVersion:'1',enabled:true,scope:{country:'*'},
    fields:[
      field('hasFinancing','¿Tiene financiamiento?','BOOLEAN'),
      field('financeProvider','Entidad financiera','TEXT',true,{
        conditions:[{fieldKey:'hasFinancing',operator:'EQUALS',value:true}]
      })
    ]
  };
  const off=S.buildCaptureState(schema,{hasFinancing:false});
  assert.deepEqual(off.visibleFields.map(x=>x.key),['hasFinancing']);
  assert.equal(off.complete,true);

  const on=S.buildCaptureState(schema,{hasFinancing:true});
  assert.deepEqual(on.visibleFields.map(x=>x.key),['hasFinancing','financeProvider']);
  assert.deepEqual(on.requiredMissing,['financeProvider']);
});

test('S4.84 quote request carries schema/context/answers but cannot smuggle local financial authority',()=>{
  const q=S.normalizeSchemaDrivenQuoteRequest({
    context:{
      tenantId:'alianzas-soluciones',country:'CO',journeyId:'cargo-quote',
      lineOfBusiness:'TRANSPORT',productId:'cargo',riskType:'CARGO_MOVEMENT'
    },
    correlationId:'corr-1',idempotencyKey:'idem-1',
    manifestConfigurationVersion:'cfg-provider-v1',
    intakeSchemaRef:{schemaId:'co-cargo-v2',schemaVersion:'2'},
    answers:{cargoType:'GENERAL',routeType:'NATIONAL'}
  });
  assert.equal(S.validateSchemaDrivenQuoteRequest(q).ok,true);
  assert.equal(Object.prototype.hasOwnProperty.call(q,'premium'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(q,'taxes'),false);

  const bad={...q,answers:{...q.answers,totalPremium:999}};
  assert.equal(S.validateSchemaDrivenQuoteRequest(bad).errors.includes('FINANCIAL_AUTHORITY_FIELD_FORBIDDEN_IN_ANSWERS'),true);
});

test('S4.84 Proposal values are projected exactly and MISSING remains distinct from NOT_COVERED',async()=>{
  const consumer=S.createSourceOnlyConsumer({
    mode:'FIXTURE_SOURCE_ONLY',
    getManifest:async()=>manifest(),
    quote:async(req)=>({
      providerContractVersion:'gravicentra-quote-authority-v1',
      authority:'GRAVICENTRA',
      correlationId:req.correlationId,
      idempotencyKey:req.idempotencyKey,
      status:'QUOTED',
      executionMode:'HYBRID',
      proposals:[proposal('GT')],
      comparisonFacts:[
        {key:'assistance-x',label:'Asistencia',comparability:'MISSING',coverageState:'UNKNOWN'}
      ],
      responseTrace:{configurationVersion:'cfg-provider-v1'}
    })
  });

  const out=await consumer.requestQuote({
    context:{
      tenantId:'alianzas-soluciones',country:'GT',journeyId:'property-quote',
      lineOfBusiness:'PROPERTY',productId:'business-property',riskType:'COMMERCIAL_LOCATION'
    },
    correlationId:'corr-1',idempotencyKey:'idem-1',
    manifestConfigurationVersion:'cfg-provider-v1',
    intakeSchemaRef:{schemaId:'gt-business-property-v1',schemaVersion:'3'},
    answers:{activity:'WAREHOUSE',insuredValue:500000}
  });

  assert.equal(out.proposals[0].money.netPremium,100);
  assert.equal(out.proposals[0].money.totalPremium,123);
  assert.equal(out.comparisonFacts[0].comparability,'MISSING');
  assert.equal(out.comparisonFacts[0].coverageState,'UNKNOWN');
});

test('S4.84 rejects MISSING -> NOT_COVERED inference from provider response',async()=>{
  const consumer=S.createSourceOnlyConsumer({
    mode:'FIXTURE_SOURCE_ONLY',
    getManifest:async()=>manifest(),
    quote:async(req)=>({
      providerContractVersion:'gravicentra-quote-authority-v1',
      authority:'GRAVICENTRA',
      correlationId:req.correlationId,
      idempotencyKey:req.idempotencyKey,
      status:'QUOTED',executionMode:'HYBRID',
      proposals:[proposal('GT')],
      comparisonFacts:[{key:'x',comparability:'MISSING',coverageState:'NOT_COVERED'}]
    })
  });

  await assert.rejects(()=>consumer.requestQuote({
    context:{
      tenantId:'alianzas-soluciones',country:'GT',journeyId:'q',
      lineOfBusiness:'PROPERTY',productId:'business-property',riskType:'COMMERCIAL_LOCATION'
    },
    correlationId:'corr-1',idempotencyKey:'idem-1',
    intakeSchemaRef:{schemaId:'gt-business-property-v1',schemaVersion:'3'},
    answers:{activity:'OFFICE',insuredValue:1000}
  }),/S484_QUOTE_RESPONSE_INVALID/);
});

test('S4.84 SelectionHandoff remains explicit and non-binding',()=>{
  assert.throws(()=>S.prepareSelectionHandoff({
    tenantId:'alianzas-soluciones',country:'GT',correlationId:'corr-1',
    selectedProposalId:'proposal-1',selectedProposalVersion:'4',
    explicitUserChoice:false,choiceEvidenceRef:'choice-1',idempotencyKey:'sel-1'
  }),/EXPLICIT_USER_CHOICE_REQUIRED/);

  const s=S.prepareSelectionHandoff({
    tenantId:'alianzas-soluciones',country:'GT',correlationId:'corr-1',
    selectedProposalId:'proposal-1',selectedProposalVersion:'4',
    explicitUserChoice:true,choiceEvidenceRef:'choice-1',idempotencyKey:'sel-1'
  });
  assert.equal(s.issued,false);
  assert.equal(s.bound,false);
  assert.equal(s.confirmed,false);
  assert.equal(s.providerContractVersion,'gravicentra-quote-authority-v1');
});

test('S4.84 keeps shared knowledge as references and does not duplicate the knowledge corpus',()=>{
  const m=S.normalizeProviderManifest(manifest());
  assert.deepEqual(m.knowledgeRefs,['knowledge://insurers/shared-v1']);
  assert.equal(Object.prototype.hasOwnProperty.call(m,'documents'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(m,'knowledgeBase'),false);
});

test('S4.84 refuses any non-fixture transport before the LAB transport gate',()=>{
  assert.throws(()=>S.createSourceOnlyConsumer({
    mode:'REAL_HTTP',
    getManifest:async()=>manifest(),
    quote:async()=>({})
  }),/S484_REAL_TRANSPORT_FAIL_CLOSED/);
});

test('S4.84 implementation contains no network/provider calls, financial formulas or product-specific field keys',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-gravicentra-provider-contract-s484.js'),'utf8').toUpperCase();
  for(const forbidden of [
    'FIREBASE-ADMIN','GETFIRESTORE','FETCH(','AXIOS','HTTPS://',
    'CALCULATEPREMIUM','CALCULATETAX','TARIFFRATE','0.12','0.19',
    'VEHICLEMAKE','CARGOTYPE','INSUREDVALUE'
  ]){
    assert.equal(src.includes(forbidden),false,forbidden);
  }
});
