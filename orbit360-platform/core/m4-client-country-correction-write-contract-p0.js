/* Orbit 360 · M4 atomic write contract for 61 client GT/GTQ corrections */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.11-write-20260728';
var STATUS='M4_CLIENT_COUNTRY_CORRECTION_WRITE_COMPLETED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){
 input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;
 if(!present)return {ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};
 if(text(q.authorizedBaseCommit)!==parent)return {ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};
 var ok=q.schemaVersion==='orbit360-m4-client-country-correction-write-request-v1'&&q.gateId==='block4-client-country-correction-write-v20260728'&&q.contractVersion==='4.2.11'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.atomicClientCorrectionWrite===true&&n(q.expectedClients)===414&&n(q.expectedInsurers)===26&&n(q.expectedCorrections)===61&&q.country==='GT'&&q.currency==='GTQ'&&n(q.snapshotWritesAuthorized)===61&&n(q.auditWritesAuthorized)===61&&n(q.clientUpdatesAuthorized)===61&&q.emergencyRollbackAuthorized===true&&n(q.maxRollbackRestores)===61&&n(q.maxRollbackAuditEvents)===61&&q.insurerWrites===false&&q.targetOverlayWrites===false&&q.configurationWrites===false&&q.membershipWrites===false&&q.deletes===false&&q.merges===false&&q.imports===false&&q.policies===false&&q.applyRules===false&&q.hostingDeploy===false&&q.functionsDeploy===false&&q.production===false&&q.mergeMain===false&&q.containsPII===false&&q.containsSecrets===false;
 return {ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};
}
function build(input){
 input=input||{};var e=[],b=input.before||{},a=input.after||{},s=input.selection||{},w=input.writes||{},r=input.rollback||{},u=input.audit||{},v=input.verification||{},c=input.collectionScope||{};
 if(input.atomicWrite!==true||input.transactionCommitted!==true||input.priorCorrectionDryRunValidated!==true||input.postRetirementRevalidationValidated!==true)e.push('required_closures_and_atomic_commit');
 if(n(b.sourceClients)!==414||n(b.sourceInsurers)!==26||n(b.targetClients)!==0||n(b.targetInsurers)!==0)e.push('before_baseline_invalid');
 if(n(s.records)!==61||n(s.missingCurrency)!==61||n(s.nonCanonicalCountry)!==61||s.country!=='GT'||s.currency!=='GTQ'||s.deterministicSelection!==true)e.push('selection_61_gt_gtq_invalid');
 if(s.recordIdsExported!==false||s.rawValuesExported!==false||s.pseudonymousTokensExported!==false||text(s.selectionDigest).length!==64)e.push('selection_privacy_invalid');
 if(n(w.snapshotWrites)!==61||n(w.auditWrites)!==61||n(w.clientUpdates)!==61||n(w.totalOperationalWrites)!==183)e.push('write_counts_invalid');
 if(n(w.insurerWrites)!==0||n(w.targetOverlayWrites)!==0||n(w.configurationWrites)!==0||n(w.membershipWrites)!==0||n(w.deletes)!==0||n(w.merges)!==0)e.push('out_of_scope_writes');
 if(n(a.sourceClients)!==414||n(a.sourceInsurers)!==26||n(a.targetClients)!==0||n(a.targetInsurers)!==0||n(a.correctedClients)!==61||n(a.missingCurrencyRemaining)!==0)e.push('after_state_invalid');
 if(a.countryCanonicalForCorrected!==true||a.currencyCanonicalForCorrected!==true||a.nonCandidateDigestUnchanged!==true)e.push('post_write_integrity_invalid');
 if(r.mode!=='exact_restore_from_61_before_snapshots'||r.available!==true||n(r.snapshotCount)!==61||n(r.restorePathCount)!==61||r.executed!==false||r.verified!==false)e.push('rollback_contract_invalid');
 if(u.mode!=='append_only'||n(u.eventsWritten)!==61||n(u.eventUpdates)!==0||n(u.eventDeletes)!==0)e.push('audit_contract_invalid');
 if(n(v.snapshotReadback)!==61||n(v.auditReadback)!==61||n(v.correctedClientReadback)!==61||v.sourceCountsUnchanged!==true||v.targetOverlayStillZero!==true||v.operationDigestVerified!==true)e.push('verification_invalid');
 if(c.sourceClients!=='tenantId/{tenant}/clientes'||c.sourceInsurers!=='tenantId/{tenant}/aseguradoras'||c.targetClients!=='tenants/{tenant}/data/clientes/items'||c.targetInsurers!=='tenants/{tenant}/data/aseguradoras/items'||c.snapshots!=='tenants/{tenant}/migrationRollbackSnapshots/{operation}/records'||c.auditEvents!=='tenants/{tenant}/auditEvents')e.push('collection_scope_invalid');
 if(input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.productionTouched||input.mergeMain)e.push('forbidden_delivery_side_effect');
 if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)e.push('sanitization_required');
 return {ok:e.length===0,status:e.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReadyForM4ClosureReview:e.length===0,approvalReadyForPolicies:false,policiesBlocked:true,errors:e,containsPII:false,containsSecrets:false};
}
window.Orbit.m4ClientCountryCorrectionWriteP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build,validateActivationBoundary:validateActivationBoundary});
})();
