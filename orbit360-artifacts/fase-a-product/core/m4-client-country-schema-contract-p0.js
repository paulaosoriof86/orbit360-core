/* Orbit 360 · M4 client country schema audit contract P0 · read-only */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='4.2.2-readonly-20260725';
  var STATUS='M4_CLIENT_COUNTRY_SCHEMA_AUDIT_COMPLETED';
  var COLLECTION='tenantId/{tenant}/clientes';
  function n(v){return Number(v||0);}
  function safeFields(fields){
    return Array.isArray(fields)&&fields.every(function(item){
      if(!item||typeof item.name!=='string'||!item.name.trim()||!Number.isFinite(Number(item.presentCount)))return false;
      return Object.keys(item).every(function(key){return key==='name'||key==='presentCount'||key==='explicitCountryCandidate';});
    });
  }
  function build(input){
    input=input||{};var errors=[],warnings=[];
    var counts=input.sourceCounts||{},currency=input.currencyResolution||{},audit=input.schemaAudit||{},scope=input.collectionScope||{};
    if(input.readOnly!==true)errors.push('read_only_required');
    if(input.remoteReadConfirmed!==true)errors.push('remote_read_required');
    if(input.writeAuthorized!==false||input.writeExecuted!==false)errors.push('writes_forbidden');
    if(scope.source!==COLLECTION||scope.collectionsRead!==1||scope.insurersRead!==false||scope.targetRead!==false)errors.push('collection_scope_invalid');
    if(n(counts.clientes)!==414)errors.push('client_count_414_required');
    if(n(currency.missingCurrency)!==61)errors.push('missing_currency_baseline_61_required');
    if(audit.privacyMode!=='field_names_and_counts_only'||audit.valuesExported!==false||n(audit.recordsAudited)!==61||!safeFields(audit.candidateFields))errors.push('schema_audit_contract_required');
    var explicitNames=Array.isArray(audit.explicitCountryFieldNames)?audit.explicitCountryFieldNames:[];
    if(!Array.isArray(audit.explicitCountryFieldNames)||!explicitNames.every(function(v){return typeof v==='string';}))errors.push('explicit_country_field_names_required');
    if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)errors.push('sanitization_required');
    if(input.configurationWrites||input.membershipWrites||input.clientWrites||input.insurerWrites||input.auditWrites||input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.mergeMain)errors.push('scope_violation');
    if(explicitNames.length===0)warnings.push('explicit_country_field_absent');
    else warnings.push('explicit_country_field_requires_value_validation');
    return {ok:errors.length===0,status:errors.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReady:false,errors:errors,warnings:warnings,writeAuthorized:false,writeExecuted:false,containsPII:false,containsSecrets:false};
  }
  window.Orbit.m4ClientCountrySchemaP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,COLLECTION:COLLECTION,build:build});
})();
