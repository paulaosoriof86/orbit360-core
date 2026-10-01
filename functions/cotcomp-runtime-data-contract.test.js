'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('./cotcomp-runtime-data-contract');

test('runtime/write/deploy stay hard off', () => {
  assert.equal(c.RUNTIME_ENABLED,false);
  assert.equal(c.WRITES_ENABLED,false);
  assert.equal(c.DEPLOY_ALLOWED,false);
});

test('physical paths are isolated under tenant cotcomp namespace', () => {
  assert.equal(c.pathFor('alianzas-soluciones',c.ENTITY.QUOTE_CASE,'qcase_1'),
    'tenants/alianzas-soluciones/cotcomp/quoteCases/items/qcase_1');
  assert.equal(c.pathFor('alianzas-soluciones',c.ENTITY.PROPOSAL,'prop_1'),
    'tenants/alianzas-soluciones/cotcomp/proposals/items/prop_1');
});

test('case and projection ids are deterministic from idempotency key', () => {
  const a=c.deriveCaseIds({tenantId:'alianzas-soluciones',idempotencyKey:'idem-001'});
  const b=c.deriveCaseIds({tenantId:'alianzas-soluciones',idempotencyKey:'idem-001'});
  assert.deepEqual(a,b);
  assert.match(a.caseId,/^qcase_/);
  assert.match(a.correlationId,/^corr_/);
});

test('quote case preserves explicit correlation identifiers and PII separately', () => {
  const r=c.buildQuoteCase({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr_1',country:'GT',source:'PUBLIC_WEB',intent:'COTIZAR',
    riskOrProductCandidate:'AUTO',contact:{name:'Paula',whatsapp:'+50255555555',email:'PAULA@EXAMPLE.COM'}
  });
  assert.equal(r.ok,true);
  assert.equal(r.value.contact.email,'paula@example.com');
  assert.equal(r.value.projectionStatus.lead,'PENDING');
  assert.equal(r.value.projectionStatus.ops,'PENDING');
});

test('proposal is not comparable unless VALIDATED and current', () => {
  const base={proposalId:'p1',validationState:'VALIDATED'};
  assert.equal(c.eligibleForComparison(base,{currentValidityConfirmed:true}),true);
  assert.equal(c.eligibleForComparison(base,{currentValidityConfirmed:false}),false);
  assert.equal(c.eligibleForComparison({...base,validationState:'RECEIVED'},{currentValidityConfirmed:true}),false);
});

test('comparison set freezes no-ranking semantics', () => {
  const r=c.buildComparisonSet({tenantId:'alianzas-soluciones',caseId:'qcase_1',proposalIds:['p2','p1']});
  assert.equal(r.ok,true);
  assert.equal(r.value.rankingPolicy,'NONE_BY_DEFAULT');
  assert.equal(r.value.silentWeighting,false);
  assert.equal(r.value.missingSemantics,'MISSING_IS_NOT_NOT_COVERED');
});

test('selection requires explicit user choice and is never issuance', () => {
  assert.equal(c.buildSelection({explicitUserChoice:false}).code,'EXPLICIT_USER_CHOICE_REQUIRED');
  const r=c.buildSelection({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',comparisonSetId:'cmp_1',
    proposalId:'p1',selectionRequestKey:'sel-req-1',explicitUserChoice:true
  });
  assert.equal(r.ok,true);
  assert.equal(r.value.status,'USER_SELECTED_FOR_CONTINUATION');
  assert.equal(r.value.issuanceState,'NOT_ISSUED');
  assert.equal(r.value.bindingState,'NOT_BOUND');
  assert.equal(r.value.coverageState,'NOT_CONFIRMED');
});

test('case access stores hash only', () => {
  const r=c.buildCaseAccessRecord({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',rawToken:'secret-token',expiresAt:'2026-09-30T12:00:00Z'
  });
  assert.equal(r.ok,true);
  assert.equal(r.value.rawTokenStored,false);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value,'rawToken'),false);
  assert.notEqual(r.value.tokenHash,'secret-token');
});

test('public comparison DTO strips internal validation and provenance fields', () => {
  const set=c.buildComparisonSet({tenantId:'alianzas-soluciones',caseId:'qcase_1',proposalIds:['p1']}).value;
  const dto=c.buildPublicComparisonDto({
    caseId:'qcase_1',comparisonSet:set,
    proposals:[{
      proposalId:'p1',insurerDisplayName:'Aseguradora A',planName:'Plan A',currency:'GTQ',premium:2100,
      coverages:{rc:'COVERED'},provenance:{secret:'internal'},validatedBy:'user1',validationState:'VALIDATED'
    }]
  });
  assert.equal(dto.alternatives.length,1);
  assert.equal(Object.prototype.hasOwnProperty.call(dto.alternatives[0],'provenance'),false);
  assert.equal(Object.prototype.hasOwnProperty.call(dto.alternatives[0],'validatedBy'),false);
  assert.equal(dto.rankingPolicy,'NONE_BY_DEFAULT');
});

test('workflow projection is canonicalV2 and requires schema extension', () => {
  const p=c.projectionContract({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr_1',country:'GT',product:'AUTO',contactName:'Paula'
  });
  assert.equal(p.workflowStorageRequired,'canonicalV2');
  assert.equal(p.lead.commercialStatus,'lead_recibido');
  assert.equal(p.ops.opsList,'Cotizaciones');
  assert.equal(p.existingDomainExtensionRequired,true);
});

test('save-first sequence preserves case before projections and notifications', () => {
  assert.deepEqual(c.SAVE_FIRST_SEQUENCE.slice(0,4),[
    'VALIDATE_PAYLOAD','COMMIT_QUOTE_CASE_IDEMPOTENTLY','PROJECT_LEAD','PROJECT_OPS'
  ]);
  assert.ok(c.SAVE_FIRST_SEQUENCE.indexOf('PREPARE_NOTIFICATIONS') > c.SAVE_FIRST_SEQUENCE.indexOf('PROJECT_OPS'));
});

test('PII policy forbids URL/analytics and binds to Owner S4.26 internal retention policy', () => {
  assert.equal(c.PII_POLICY.urlQueryStringAllowed,false);
  assert.equal(c.PII_POLICY.analyticsAllowed,false);
  assert.equal(c.PII_POLICY.retentionPolicyVersion,'ays-cotcomp-governance-policy-s426-v1.0');
  assert.equal(c.PII_POLICY.retentionPolicyStatus,'OWNER_INTERNAL_POLICY_ACTIVE');
  assert.equal(c.PII_POLICY.legalComplianceVerified,false);
  assert.equal(c.PII_POLICY.retention.inactiveDraftDays,30);
  assert.equal(c.PII_POLICY.retention.submittedNotConvertedMonths,12);
  assert.equal(c.PII_POLICY.retention.caseAccessDays,7);
  assert.equal(c.PII_POLICY.retention.rawTokenPersistenceAllowed,false);
  assert.equal(c.PII_POLICY.retention.convertedCaseGovernance,'GRAVICENTRA_CLIENT_POLICY_GOVERNANCE');
});

test('selection identity is request-bound so changed proposal cannot silently create a second selection identity', () => {
  const base={
    tenantId:'alianzas-soluciones',caseId:'qcase_1',comparisonSetId:'cmp_1',
    selectionRequestKey:'sel-req-stable',explicitUserChoice:true
  };
  const a=c.buildSelection({...base,proposalId:'p1'});
  const b=c.buildSelection({...base,proposalId:'p2'});
  assert.equal(a.ok,true);
  assert.equal(b.ok,true);
  assert.equal(a.value.selectionRequestId,b.value.selectionRequestId);
  assert.equal(a.value.selectionId,b.value.selectionId);
  assert.notEqual(a.value.proposalId,b.value.proposalId);
  assert.match(a.value.selectionRequestId,/^selreq_/);
});

test('selection request key itself is not persisted in selection payload', () => {
  const r=c.buildSelection({
    tenantId:'alianzas-soluciones',caseId:'qcase_1',comparisonSetId:'cmp_1',
    proposalId:'p1',selectionRequestKey:'opaque-client-key',explicitUserChoice:true
  });
  assert.equal(r.ok,true);
  assert.equal(Object.prototype.hasOwnProperty.call(r.value,'selectionRequestKey'),false);
  assert.equal(typeof r.value.selectionRequestId,'string');
});

