'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const s=require('./cotcomp-gravicentra-authority-contract-s481');

const DIGEST='a'.repeat(64);

test('S4.81 freezes Gravicentra as business authority and CotComp as interaction authority',()=>{
  const a=s.authorityMatrix();
  assert.equal(a.tariffRules,'GRAVICENTRA');
  assert.equal(a.premiumCalculation,'GRAVICENTRA');
  assert.equal(a.financingAndInstallments,'GRAVICENTRA');
  assert.equal(a.publicJourneyUx,'COTCOMP');
  assert.equal(a.comparisonPresentation,'COTCOMP');
  assert.equal(a.explicitUserChoiceInteraction,'COTCOMP');
});

test('S4.81 manifest requires Gravicentra authority, configuration version and digest',()=>{
  const m=s.normalizeManifest({
    tenantId:'alianzas-soluciones',country:'GT',configurationVersion:'cfg-v1',
    effectiveAt:'2026-10-03T00:00:00-06:00',digestSha256:DIGEST
  });
  assert.deepEqual(s.validateManifest(m),{ok:true,errors:[]});
  const bad={...m,authority:'COTCOMP'};
  assert.equal(s.validateManifest(bad).ok,false);
});

test('S4.81 QuoteRequest carries context and idempotency but no financial calculation',()=>{
  const q=s.normalizeQuoteRequest({
    tenantId:'alianzas-soluciones',country:'GT',journeyId:'GT_AUTO_MOTO_HYBRID',
    correlationId:'corr-1',idempotencyKey:'idem-1',risk:{vehicleRef:'veh-1'},
    paymentPreference:{mode:'MONTHLY'}
  });
  assert.equal(s.validateQuoteRequest(q).ok,true);
  assert.equal(q.authorityTarget,'GRAVICENTRA');
  assert.equal(Object.prototype.hasOwnProperty.call(q,'premium'),false);
});

test('S4.81 ProposalProjection requires reported total and complete version trace without recomputing it',()=>{
  const p=s.normalizeProposalProjection({
    proposalId:'p1',proposalVersion:'1',correlationId:'corr-1',tenantId:'alianzas-soluciones',
    country:'GT',insurerId:'ins1',productId:'auto',executionMode:'HYBRID',
    proposalState:'VALIDATED',validNow:true,
    money:{currency:'GTQ',netPremium:100,totalPremium:123,installments:12,installmentValue:10.25},
    trace:{configurationVersion:'cfg-v1',tariffVersion:'tar-v2',sourceVersion:'src-v3',
      rulesDigest:DIGEST,calculatedAt:'2026-10-03T08:00:00-06:00'}
  });
  assert.equal(s.validateProposalProjection(p).ok,true);
  assert.equal(p.money.totalPremium,123);
  assert.equal(p.money.installmentValue,10.25);
  assert.deepEqual(s.eligibleForComparison(p),{eligible:true,reason:'ELIGIBLE'});
});

test('S4.81 only validated and current proposals enter comparison',()=>{
  const base=s.normalizeProposalProjection({
    proposalId:'p1',proposalVersion:'1',correlationId:'corr-1',tenantId:'alianzas-soluciones',
    country:'GT',insurerId:'ins1',productId:'auto',executionMode:'AUTOMATIC',
    proposalState:'REQUIRES_VALIDATION',validNow:true,
    money:{currency:'GTQ',totalPremium:100},
    trace:{configurationVersion:'cfg',tariffVersion:'tar',sourceVersion:'src',rulesDigest:DIGEST,calculatedAt:'now'}
  });
  assert.equal(s.eligibleForComparison(base).eligible,false);
  assert.equal(s.eligibleForComparison({...base,proposalState:'VALIDATED',validNow:false}).eligible,false);
});

test('S4.81 preserves missing != not covered',()=>{
  const valid=s.normalizeComparisonFact({key:'rc',comparability:'MISSING',coverageState:'UNKNOWN'});
  assert.equal(s.validateComparisonFact(valid).ok,true);
  const invalid=s.normalizeComparisonFact({key:'rc',comparability:'MISSING',coverageState:'NOT_COVERED'});
  assert.deepEqual(s.validateComparisonFact(invalid),{ok:false,errors:['MISSING_CANNOT_IMPLY_NOT_COVERED']});
});

test('S4.81 requires explicit user choice and cannot assert issued/bound/confirmed',()=>{
  const h=s.normalizeSelectionHandoff({
    tenantId:'alianzas-soluciones',country:'GT',correlationId:'corr-1',
    selectedProposalId:'p1',selectedProposalVersion:'2',explicitUserChoice:true,
    choiceEvidenceRef:'choice-commitment',idempotencyKey:'sel-idem'
  });
  assert.equal(s.validateSelectionHandoff(h).ok,true);
  assert.equal(h.issued,false);
  assert.equal(h.bound,false);
  assert.equal(h.confirmed,false);
  const noChoice={...h,explicitUserChoice:false};
  assert.equal(s.validateSelectionHandoff(noChoice).errors.includes('EXPLICIT_USER_CHOICE_REQUIRED'),true);
});

test('S4.81 propagation policy prevents duplicated financial authority in Web',()=>{
  const p=s.propagationPolicy();
  assert.equal(p.newQuoteConfiguration,'LATEST_ENABLED_EFFECTIVE_GRAVICENTRA_VERSION');
  assert.equal(p.existingProposal,'PINNED_TO_ORIGINAL_VERSIONS_AND_RULES_DIGEST');
  assert.equal(p.silentRetroactiveRecalculation,false);
  assert.equal(p.webRedeployRequiredForOrdinaryTariffChange,false);
  assert.equal(p.financialLogicInCotComp,false);
  assert.equal(p.directProviderCallsFromBrowser,false);
});

test('S4.81 source contains no known A&S tariff constants or insurer-specific business rates',()=>{
  const src=fs.readFileSync(path.join(__dirname,'cotcomp-gravicentra-authority-contract-s481.js'),'utf8');
  for(const forbidden of [
    '0.12','0.19','13.3','13.6',
    'ASEGURADORA GUATEMALTECA','BANTRAB','BANRURAL','COLUMNA',
    'calculatePremium','calculateTax','applyTariffRate'
  ]){
    assert.equal(src.toUpperCase().includes(forbidden.toUpperCase()),false,forbidden);
  }
});
