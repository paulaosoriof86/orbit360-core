/* Orbit 360 · M4 client country values aggregate contract P0 · read-only */
(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  var VERSION='4.2.3-readonly-20260725';
  var STATUS='M4_CLIENT_COUNTRY_VALUES_AUDIT_COMPLETED';
  var COLLECTION='tenantId/{tenant}/clientes';
  var KEYS=['GT','CO','empty','nonCanonical','conflict','total'];
  function n(v){return Number(v||0);}
  function exactKeys(obj){return obj&&JSON.stringify(Object.keys(obj).sort())===JSON.stringify(KEYS.slice().sort());}
  function forbidden(obj){
    var found=false;
    (function walk(v){
      if(found||v==null)return;
      if(Array.isArray(v)){v.forEach(walk);return;}
      if(typeof v==='object')Object.keys(v).forEach(function(k){
        if(/^(ids?|names?|samples?|raw|rawValues?|values?|records?|items?|documents?)$/i.test(k))found=true;
        else walk(v[k]);
      });
    })(obj);
    return found;
  }
  function build(input){
    input=input||{};var errors=[],warnings=[];
    var counts=input.sourceCounts||{},dist=input.distribution||{},scope=input.collectionScope||{},proposal=input.currencyProposal||{};
    if(input.readOnly!==true||input.remoteReadConfirmed!==true)errors.push('remote_readonly_required');
    if(input.writeAuthorized!==false||input.writeExecuted!==false)errors.push('writes_forbidden');
    if(scope.source!==COLLECTION||scope.collectionsRead!==1||scope.insurersRead!==false||scope.targetRead!==false)errors.push('collection_scope_invalid');
    if(n(counts.clientes)!==414||n(counts.missingCurrency)!==61)errors.push('baseline_counts_invalid');
    if(input.privacyMode!=='aggregate_categories_only'||input.rawValuesExported!==false||input.individualRecordsExported!==false)errors.push('privacy_contract_invalid');
    if(!exactKeys(dist))errors.push('distribution_keys_invalid');
    var sum=n(dist.GT)+n(dist.CO)+n(dist.empty)+n(dist.nonCanonical)+n(dist.conflict);
    if(n(dist.total)!==61||sum!==61||[dist.GT,dist.CO,dist.empty,dist.nonCanonical,dist.conflict].some(function(v){return !Number.isInteger(Number(v))||Number(v)<0;}))errors.push('distribution_balance_invalid');
    var unresolved=n(dist.empty)+n(dist.nonCanonical)+n(dist.conflict);
    if(proposal.GT!=='GTQ'||proposal.CO!=='COP'||n(proposal.resolved)!==n(dist.GT)+n(dist.CO)||n(proposal.unresolved)!==unresolved||proposal.writeAuthorized!==false)errors.push('currency_proposal_invalid');
    if(forbidden(input))errors.push('individual_or_raw_data_forbidden');
    if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)errors.push('sanitization_required');
    if(input.configurationWrites||input.membershipWrites||input.clientWrites||input.insurerWrites||input.auditWrites||input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.mergeMain)errors.push('scope_violation');
    if(unresolved)warnings.push('country_values_require_validation');
    else warnings.push('aggregate_currency_proposal_ready_write_not_authorized');
    return {ok:errors.length===0,status:errors.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReady:false,currencyProposalReady:errors.length===0&&unresolved===0,errors:errors,warnings:warnings,writeAuthorized:false,writeExecuted:false,containsPII:false,containsSecrets:false};
  }
  window.Orbit.m4ClientCountryValuesP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,COLLECTION:COLLECTION,build:build});
})();
