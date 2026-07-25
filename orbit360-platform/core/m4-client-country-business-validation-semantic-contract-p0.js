/* Orbit 360 · M4 semantic repair contract for business validation */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.5-static-20260725';
var STATUS='M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_SEMANTIC_REPAIR_STATIC_READY';
function n(v){return Number(v||0);}
function text(v){return String(v==null?'':v).trim();}
function clone(v){return JSON.parse(JSON.stringify(v));}
function compose(input){
  input=input||{};
  var country=input.countryClosure||{},durableRoot=input.durableClosure||{},durable=durableRoot.dryRunClosure||{},validation=input.businessValidation||{},errors=[];
  if(country.status!=='M4_CLIENT_COUNTRY_VALUES_AUDIT_COMPLETED_DATA_CONTRACT_FAILURE_CONFIRMED')errors.push('country_closure_status_invalid');
  if(n(country.sourceCounts&&country.sourceCounts.clientes)!==414||n(country.sourceCounts&&country.sourceCounts.missingCurrency)!==61)errors.push('country_closure_counts_invalid');
  var dist=country.distribution||{};
  if(n(dist.GT)!==0||n(dist.CO)!==0||n(dist.empty)!==0||n(dist.nonCanonical)!==61||n(dist.conflict)!==0||n(dist.total)!==61)errors.push('country_distribution_invalid');
  if(durableRoot.status!=='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED'||durable.status!=='M4_DURABLE_WRITER_DRYRUN_COMPLETED_DATA_VALIDATION_REQUIRED')errors.push('durable_closure_status_invalid');
  if(n(durable.sourceCounts&&durable.sourceCounts.clientes)!==414||n(durable.sourceCounts&&durable.sourceCounts.aseguradoras)!==26)errors.push('durable_counts_invalid');
  if(n(durable.issues&&durable.issues.clientsMissingCurrency)!==61)errors.push('durable_missing_currency_invalid');
  var clientTargetOnly=n(durable.issues&&durable.issues.clientTargetOnly),insurerTargetOnly=n(durable.issues&&durable.issues.insurerTargetOnly),targetOnlyDeferred=clientTargetOnly+insurerTargetOnly;
  if(clientTargetOnly!==2||insurerTargetOnly!==2||targetOnlyDeferred!==4)errors.push('target_only_composition_invalid');
  if(validation.explicitAuthorization!==true||validation.all61Guatemala!==true)errors.push('business_validation_not_explicit');
  if(text(validation.country)!=='GT'||text(validation.currency)!=='GTQ')errors.push('business_validation_country_currency_invalid');
  if(text(validation.source)!=='explicit_user_business_validation'||text(validation.scope)!=='all_61_missing_currency_clients')errors.push('business_validation_source_scope_invalid');
  if(validation.writeAuthorized!==false||validation.staticOnly!==true)errors.push('business_validation_scope_invalid');
  var baseline={clients:414,insurers:26,missingCurrency:61,nonCanonical:61,clientTargetOnly:clientTargetOnly,insurerTargetOnly:insurerTargetOnly,targetOnlyDeferred:targetOnlyDeferred};
  var proposal={records:61,countryFieldChanges:61,currencyFieldChanges:61,country:'GT',currency:'GTQ',creates:0,deletes:0,targetOnlyDeferred:targetOnlyDeferred,writeAuthorized:false};
  return {ok:errors.length===0,status:errors.length?'M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_SEMANTIC_REPAIR_STATIC_BLOCKED':STATUS,contractVersion:VERSION,validationMode:'executed_contract_fixtures',baseline:baseline,proposal:proposal,traceability:{source:'business_validation_batch',actorRole:'Direccion_AyS',reasonCode:'VALIDACION_EMPRESARIAL_LOTE_61_GT',beforeAfterPlanned:true,recordIdsExported:false},rollback:{mode:'per_record_before_snapshot',planned:true,executed:false},approvalReadyForCorrectionDryRun:errors.length===0,approvalReadyForM4Write:false,writeAuthorized:false,writeExecuted:false,errors:errors,containsPII:false,containsSecrets:false};
}
function validateEvidence(input){
  input=input||{};var errors=[],proposal=input.proposal||{},baseline=input.baseline||{},trace=input.traceability||{},rollback=input.rollback||{};
  if(input.validationMode!=='executed_contract_fixtures')errors.push('semantic_validation_mode_required');
  if(n(baseline.targetOnlyDeferred)!==4||n(baseline.clientTargetOnly)!==2||n(baseline.insurerTargetOnly)!==2)errors.push('composed_baseline_invalid');
  if(n(proposal.records)!==61||proposal.country!=='GT'||proposal.currency!=='GTQ'||n(proposal.targetOnlyDeferred)!==4)errors.push('proposal_invalid');
  if(trace.source!=='business_validation_batch'||trace.beforeAfterPlanned!==true||trace.recordIdsExported!==false)errors.push('traceability_invalid');
  if(rollback.mode!=='per_record_before_snapshot'||rollback.planned!==true||rollback.executed!==false)errors.push('rollback_invalid');
  if(input.writeAuthorized!==false||input.writeExecuted!==false||input.approvalReadyForM4Write!==false)errors.push('write_boundary_invalid');
  if(input.containsPII!==false||input.containsSecrets!==false)errors.push('sanitization_invalid');
  return {ok:errors.length===0,errors:errors};
}
window.Orbit.m4ClientCountryBusinessValidationSemanticP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,compose:compose,validateEvidence:validateEvidence,clone:clone});
})();
