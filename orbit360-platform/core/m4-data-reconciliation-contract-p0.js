/* Orbit 360 · M4 data reconciliation contract P0 · read-only */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='4.2.1-readonly-20260725';
  var STATUS='M4_DATA_RECONCILIATION_COMPLETED';
  var MAP=Object.freeze({GT:'GTQ',CO:'COP'});
  var RECOMMENDATIONS=Object.freeze(['conservar','actualizar_rekey','retirar_candidato','requiere_validacion']);
  function n(v){return Number(v||0);}
  function build(input){
    input=input||{};var errors=[],warnings=[];
    var currency=input.currencyResolution||{},target=input.targetOnlyResolution||{},counts=input.sourceCounts||{},audit=input.schemaAudit||{};
    var resolved=n(currency.resolvedGTQ)+n(currency.resolvedCOP),missing=n(currency.missingCurrency),unresolved=n(currency.unresolved);
    var recs=target.recommendations||{};
    var targetTotal=n(target.total),recTotal=RECOMMENDATIONS.reduce(function(sum,key){return sum+n(recs[key]);},0);
    if(input.readOnly!==true)errors.push('read_only_required');
    if(input.remoteReadConfirmed!==true)errors.push('remote_read_required');
    if(input.writeAuthorized!==false||input.writeExecuted!==false)errors.push('writes_forbidden');
    if(n(counts.clientes)!==414)errors.push('client_count_414_required');
    if(n(counts.aseguradoras)!==26)errors.push('insurer_count_26_required');
    if(missing!==61)errors.push('missing_currency_baseline_61_required');
    if(resolved+unresolved!==missing)errors.push('currency_balance_invalid');
    if(currency.countryCurrencyMap&&JSON.stringify(currency.countryCurrencyMap)!==JSON.stringify(MAP))errors.push('country_currency_map_invalid');
    if(targetTotal!==4)errors.push('target_only_baseline_4_required');
    if(recTotal!==targetTotal)errors.push('target_only_balance_invalid');
    if(n(target.clientTotal)!==2||n(target.insurerTotal)!==2)errors.push('target_only_collection_counts_invalid');
    if(n(input.secretValueCount)!==0)errors.push('secret_values_detected');
    if(input.containsPII!==false||input.containsSecrets!==false)errors.push('sanitization_required');
    if(audit.privacyMode!=='field_names_and_counts_only'||audit.valuesExported!==false||!Array.isArray(audit.candidateFields))errors.push('schema_audit_contract_required');
    if(input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.mergeMain)errors.push('scope_violation');
    if(unresolved)warnings.push('currency_unresolved:'+unresolved);
    if(n(recs.requiere_validacion))warnings.push('target_only_unresolved:'+n(recs.requiere_validacion));
    var approvalReady=errors.length===0&&unresolved===0&&n(recs.requiere_validacion)===0;
    return {ok:errors.length===0,status:errors.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReady:approvalReady,errors:errors,warnings:warnings,writeAuthorized:false,writeExecuted:false,containsPII:false,containsSecrets:false};
  }
  window.Orbit.m4DataReconciliationP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,COUNTRY_CURRENCY:MAP,RECOMMENDATIONS:RECOMMENDATIONS,build:build});
})();
