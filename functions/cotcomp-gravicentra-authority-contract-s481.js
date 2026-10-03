'use strict';

/**
 * CotComp S4.81 — Gravicentra authority contract v1
 *
 * Source-only integration boundary. This module contains NO tariff tables,
 * insurer-specific rates, premium formulas, provider calls, Firebase access,
 * persistence, or production enablement.
 *
 * Gravicentra is authoritative for quote-domain business configuration and
 * quote results. CotComp owns the public interaction and presentation layer.
 */

const VERSION='ays-cotcomp-gravicentra-authority-contract-v1.0';
const AUTHORITY='GRAVICENTRA';

const COMPARABILITY_STATES=Object.freeze([
  'PRESENT',
  'MISSING',
  'NOT_APPLICABLE',
  'NOT_COMPARABLE',
  'REQUIRES_EXPLANATION'
]);

const COVERAGE_STATES=Object.freeze([
  'COVERED',
  'NOT_COVERED',
  'UNKNOWN',
  'NOT_APPLICABLE'
]);

const PROPOSAL_STATES=Object.freeze([
  'DRAFT',
  'REQUIRES_VALIDATION',
  'VALIDATED',
  'SUPERSEDED',
  'EXPIRED',
  'REJECTED'
]);

const EXECUTION_MODES=Object.freeze([
  'AUTOMATIC',
  'HYBRID',
  'CONSULTATIVE',
  'NOT_AVAILABLE'
]);

function clean(v){return String(v==null?'':v).trim();}
function upper(v){return clean(v).toUpperCase();}
function finiteOrNull(v){
  if(v===null||v===undefined||v==='') return null;
  const n=Number(v);
  return Number.isFinite(n)?n:null;
}
function clone(v){return JSON.parse(JSON.stringify(v==null?null:v));}
function arr(v){return Array.isArray(v)?v.slice():[];}
function isSha256(v){return /^[a-f0-9]{64}$/i.test(clean(v));}

function authorityMatrix(){
  return Object.freeze({
    insurerCatalog:'GRAVICENTRA',
    productPlanCatalog:'GRAVICENTRA',
    providerBindings:'GRAVICENTRA',
    eligibility:'GRAVICENTRA',
    tariffRules:'GRAVICENTRA',
    premiumCalculation:'GRAVICENTRA',
    premiumMinimums:'GRAVICENTRA',
    feesAndTaxes:'GRAVICENTRA',
    assistanceDiscountsSurcharges:'GRAVICENTRA',
    financingAndInstallments:'GRAVICENTRA',
    quoteSourceProvenance:'GRAVICENTRA',
    proposalValidity:'GRAVICENTRA',
    publicJourneyUx:'COTCOMP',
    progressiveCapture:'COTCOMP',
    publicConsentInteraction:'COTCOMP',
    comparisonPresentation:'COTCOMP',
    explicitUserChoiceInteraction:'COTCOMP',
    webFunnelAnalytics:'COTCOMP'
  });
}

function normalizeManifest(input={}){
  return {
    schemaVersion:VERSION,
    authority:upper(input.authority||AUTHORITY),
    tenantId:clean(input.tenantId),
    country:upper(input.country),
    configurationVersion:clean(input.configurationVersion),
    catalogVersion:clean(input.catalogVersion),
    effectiveAt:clean(input.effectiveAt),
    generatedAt:clean(input.generatedAt),
    releaseState:upper(input.releaseState),
    journeys:arr(input.journeys).map(clean).filter(Boolean),
    products:arr(input.products).map(clone),
    insurers:arr(input.insurers).map(clone),
    digestSha256:clean(input.digestSha256).toLowerCase()
  };
}

function validateManifest(m){
  const errors=[];
  if(!m||m.authority!==AUTHORITY) errors.push('AUTHORITY_MUST_BE_GRAVICENTRA');
  if(!clean(m&&m.tenantId)) errors.push('TENANT_REQUIRED');
  if(!clean(m&&m.country)) errors.push('COUNTRY_REQUIRED');
  if(!clean(m&&m.configurationVersion)) errors.push('CONFIGURATION_VERSION_REQUIRED');
  if(!clean(m&&m.effectiveAt)) errors.push('EFFECTIVE_AT_REQUIRED');
  if(!isSha256(m&&m.digestSha256)) errors.push('MANIFEST_DIGEST_REQUIRED');
  return {ok:errors.length===0,errors};
}

function normalizeQuoteRequest(input={}){
  return {
    schemaVersion:VERSION,
    authorityTarget:AUTHORITY,
    tenantId:clean(input.tenantId),
    country:upper(input.country),
    journeyId:clean(input.journeyId),
    intent:upper(input.intent||'COTIZAR'),
    correlationId:clean(input.correlationId),
    idempotencyKey:clean(input.idempotencyKey),
    manifestConfigurationVersion:clean(input.manifestConfigurationVersion),
    risk:clone(input.risk||{}),
    coveragePreferences:clone(input.coveragePreferences||{}),
    paymentPreference:clone(input.paymentPreference||{}),
    consentRefs:arr(input.consentRefs).map(clean).filter(Boolean),
    clientContextRef:clean(input.clientContextRef)
  };
}

function validateQuoteRequest(q){
  const errors=[];
  if(!q||q.authorityTarget!==AUTHORITY) errors.push('AUTHORITY_TARGET_INVALID');
  if(!clean(q&&q.tenantId)) errors.push('TENANT_REQUIRED');
  if(!clean(q&&q.country)) errors.push('COUNTRY_REQUIRED');
  if(!clean(q&&q.journeyId)) errors.push('JOURNEY_REQUIRED');
  if(!clean(q&&q.correlationId)) errors.push('CORRELATION_REQUIRED');
  if(!clean(q&&q.idempotencyKey)) errors.push('IDEMPOTENCY_REQUIRED');
  if(!q||!q.risk||typeof q.risk!=='object'||Array.isArray(q.risk)) errors.push('RISK_REQUIRED');
  return {ok:errors.length===0,errors};
}

function normalizeMoneyBreakdown(input={}){
  // Projection only: values are reported by Gravicentra.
  // No summing, rate application, tax calculation or installment calculation occurs here.
  return {
    currency:upper(input.currency),
    netPremium:finiteOrNull(input.netPremium),
    minimumPremium:finiteOrNull(input.minimumPremium),
    issuanceExpense:finiteOrNull(input.issuanceExpense),
    expeditionExpense:finiteOrNull(input.expeditionExpense),
    assistance:finiteOrNull(input.assistance),
    financingSurcharge:finiteOrNull(input.financingSurcharge),
    taxes:finiteOrNull(input.taxes),
    discounts:finiteOrNull(input.discounts),
    otherCharges:finiteOrNull(input.otherCharges),
    totalPremium:finiteOrNull(input.totalPremium),
    installments:finiteOrNull(input.installments),
    installmentValue:finiteOrNull(input.installmentValue),
    amountBasis:clean(input.amountBasis)
  };
}

function normalizeTrace(input={}){
  return {
    configurationVersion:clean(input.configurationVersion),
    tariffVersion:clean(input.tariffVersion),
    sourceVersion:clean(input.sourceVersion),
    providerBindingVersion:clean(input.providerBindingVersion),
    catalogVersion:clean(input.catalogVersion),
    rulesDigest:clean(input.rulesDigest).toLowerCase(),
    calculatedAt:clean(input.calculatedAt),
    validityFrom:clean(input.validityFrom),
    validityTo:clean(input.validityTo)
  };
}

function normalizeProposalProjection(input={}){
  return {
    schemaVersion:VERSION,
    authority:AUTHORITY,
    proposalId:clean(input.proposalId),
    proposalVersion:clean(input.proposalVersion),
    quoteCaseRef:clean(input.quoteCaseRef),
    correlationId:clean(input.correlationId),
    tenantId:clean(input.tenantId),
    country:upper(input.country),
    insurerId:clean(input.insurerId),
    insurerName:clean(input.insurerName),
    productId:clean(input.productId),
    productName:clean(input.productName),
    planId:clean(input.planId),
    planName:clean(input.planName),
    executionMode:upper(input.executionMode),
    proposalState:upper(input.proposalState),
    validNow:input.validNow===true,
    money:normalizeMoneyBreakdown(input.money||{}),
    coverages:arr(input.coverages).map(clone),
    deductibles:arr(input.deductibles).map(clone),
    assistance:arr(input.assistance).map(clone),
    conditions:arr(input.conditions).map(clone),
    exclusions:arr(input.exclusions).map(clone),
    paymentOptions:arr(input.paymentOptions).map(clone),
    trace:normalizeTrace(input.trace||{})
  };
}

function validateProposalProjection(p){
  const errors=[];
  const warnings=[];
  if(!p||p.authority!==AUTHORITY) errors.push('PROPOSAL_AUTHORITY_INVALID');
  if(!clean(p&&p.proposalId)) errors.push('PROPOSAL_ID_REQUIRED');
  if(!clean(p&&p.proposalVersion)) errors.push('PROPOSAL_VERSION_REQUIRED');
  if(!clean(p&&p.correlationId)) errors.push('CORRELATION_REQUIRED');
  if(!clean(p&&p.tenantId)) errors.push('TENANT_REQUIRED');
  if(!clean(p&&p.country)) errors.push('COUNTRY_REQUIRED');
  if(!clean(p&&p.insurerId)&&!clean(p&&p.insurerName)) errors.push('INSURER_REQUIRED');
  if(!clean(p&&p.productId)&&!clean(p&&p.productName)) errors.push('PRODUCT_REQUIRED');
  if(EXECUTION_MODES.indexOf(upper(p&&p.executionMode))<0) errors.push('EXECUTION_MODE_INVALID');
  if(PROPOSAL_STATES.indexOf(upper(p&&p.proposalState))<0) errors.push('PROPOSAL_STATE_INVALID');
  if(!clean(p&&p.money&&p.money.currency)) errors.push('CURRENCY_REQUIRED');
  if(finiteOrNull(p&&p.money&&p.money.totalPremium)===null) errors.push('TOTAL_PREMIUM_REPORTED_REQUIRED');
  const t=p&&p.trace||{};
  for(const k of ['configurationVersion','tariffVersion','sourceVersion','calculatedAt']){
    if(!clean(t[k])) errors.push('TRACE_'+k.replace(/[A-Z]/g,m=>'_'+m).toUpperCase()+'_REQUIRED');
  }
  if(!isSha256(t.rulesDigest)) errors.push('TRACE_RULES_DIGEST_REQUIRED');
  if(p&&p.proposalState==='VALIDATED'&&p.validNow!==true) warnings.push('VALIDATED_BUT_NOT_CURRENTLY_VALID');
  return {ok:errors.length===0,errors,warnings};
}

function eligibleForComparison(p){
  const v=validateProposalProjection(p);
  return {
    eligible:v.ok && p.proposalState==='VALIDATED' && p.validNow===true,
    reason:!v.ok?'PROPOSAL_CONTRACT_INVALID':
      p.proposalState!=='VALIDATED'?'PROPOSAL_NOT_VALIDATED':
      p.validNow!==true?'PROPOSAL_NOT_CURRENTLY_VALID':'ELIGIBLE'
  };
}

function normalizeComparisonFact(input={}){
  const comparability=upper(input.comparability||'MISSING');
  const coverageState=upper(input.coverageState||'UNKNOWN');
  return {
    key:clean(input.key),
    label:clean(input.label),
    comparability:COMPARABILITY_STATES.includes(comparability)?comparability:'MISSING',
    coverageState:COVERAGE_STATES.includes(coverageState)?coverageState:'UNKNOWN',
    value:input.value===undefined?null:clone(input.value),
    unit:clean(input.unit),
    sourceRef:clean(input.sourceRef),
    explanation:clean(input.explanation)
  };
}

function validateComparisonFact(f){
  const errors=[];
  if(!clean(f&&f.key)) errors.push('FACT_KEY_REQUIRED');
  if(!COMPARABILITY_STATES.includes(upper(f&&f.comparability))) errors.push('COMPARABILITY_INVALID');
  if(!COVERAGE_STATES.includes(upper(f&&f.coverageState))) errors.push('COVERAGE_STATE_INVALID');
  if(f&&f.comparability==='MISSING'&&f.coverageState==='NOT_COVERED'){
    errors.push('MISSING_CANNOT_IMPLY_NOT_COVERED');
  }
  return {ok:errors.length===0,errors};
}

function normalizeSelectionHandoff(input={}){
  return {
    schemaVersion:VERSION,
    authorityTarget:AUTHORITY,
    tenantId:clean(input.tenantId),
    country:upper(input.country),
    correlationId:clean(input.correlationId),
    quoteCaseRef:clean(input.quoteCaseRef),
    selectedProposalId:clean(input.selectedProposalId),
    selectedProposalVersion:clean(input.selectedProposalVersion),
    explicitUserChoice:input.explicitUserChoice===true,
    choiceEvidenceRef:clean(input.choiceEvidenceRef),
    idempotencyKey:clean(input.idempotencyKey),
    issued:false,
    bound:false,
    confirmed:false
  };
}

function validateSelectionHandoff(s){
  const errors=[];
  if(!s||s.authorityTarget!==AUTHORITY) errors.push('AUTHORITY_TARGET_INVALID');
  if(!clean(s&&s.tenantId)) errors.push('TENANT_REQUIRED');
  if(!clean(s&&s.correlationId)) errors.push('CORRELATION_REQUIRED');
  if(!clean(s&&s.selectedProposalId)) errors.push('SELECTED_PROPOSAL_REQUIRED');
  if(!clean(s&&s.selectedProposalVersion)) errors.push('SELECTED_PROPOSAL_VERSION_REQUIRED');
  if(s&&s.explicitUserChoice!==true) errors.push('EXPLICIT_USER_CHOICE_REQUIRED');
  if(!clean(s&&s.choiceEvidenceRef)) errors.push('CHOICE_EVIDENCE_REQUIRED');
  if(!clean(s&&s.idempotencyKey)) errors.push('IDEMPOTENCY_REQUIRED');
  if(s&&(s.issued||s.bound||s.confirmed)) errors.push('SELECTION_CANNOT_ASSERT_ISSUANCE_BINDING_CONFIRMATION');
  return {ok:errors.length===0,errors};
}

function propagationPolicy(){
  return Object.freeze({
    newQuoteConfiguration:'LATEST_ENABLED_EFFECTIVE_GRAVICENTRA_VERSION',
    existingProposal:'PINNED_TO_ORIGINAL_VERSIONS_AND_RULES_DIGEST',
    silentRetroactiveRecalculation:false,
    webRedeployRequiredForOrdinaryTariffChange:false,
    financialLogicInCotComp:false,
    directProviderCallsFromBrowser:false
  });
}

module.exports=Object.freeze({
  VERSION,AUTHORITY,COMPARABILITY_STATES,COVERAGE_STATES,PROPOSAL_STATES,EXECUTION_MODES,
  authorityMatrix,normalizeManifest,validateManifest,
  normalizeQuoteRequest,validateQuoteRequest,
  normalizeMoneyBreakdown,normalizeTrace,normalizeProposalProjection,validateProposalProjection,
  eligibleForComparison,normalizeComparisonFact,validateComparisonFact,
  normalizeSelectionHandoff,validateSelectionHandoff,propagationPolicy
});
