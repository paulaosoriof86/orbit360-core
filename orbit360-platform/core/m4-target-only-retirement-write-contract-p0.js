/* Orbit 360 · M4 atomic retirement write of four obsolete target-only records */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.9-write-20260726';
var STATUS='M4_TARGET_ONLY_RETIREMENT_WRITE_COMPLETED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){
 input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;
 if(!present)return {ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};
 if(text(q.authorizedBaseCommit)!==parent)return {ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};
 var ok=q.schemaVersion==='orbit360-m4-target-only-retirement-write-request-v1'&&q.gateId==='block4-target-only-retirement-write-v20260726'&&q.contractVersion==='4.2.9'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.atomicRetirementWrite===true&&n(q.expectedClientObsolete)===2&&n(q.expectedInsurerObsolete)===2&&n(q.expectedTotalObsolete)===4&&n(q.snapshotWritesAuthorized)===4&&n(q.auditWritesAuthorized)===4&&n(q.clientDeletesAuthorized)===2&&n(q.insurerDeletesAuthorized)===2&&q.emergencyRollbackAuthorized===true&&n(q.maxRollbackRestores)===4&&q.gtGtqWrite===false&&q.otherClientWrites===false&&q.otherInsurerWrites===false&&q.merges===false&&q.imports===false&&q.policies===false&&q.deploy===false&&q.production===false&&q.mergeMain===false&&q.containsPII===false&&q.containsSecrets===false;
 return {ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};
}
function build(input){
 input=input||{};var e=[],b=input.before||{},a=input.after||{},s=input.selection||{},w=input.writes||{},r=input.rollback||{},au=input.audit||{},v=input.verification||{},scope=input.collectionScope||{};
 if(input.atomicWrite!==true||input.transactionCommitted!==true||input.priorDryRunClosureValidated!==true)e.push('atomic_write_and_closure_required');
 if(n(b.sourceClients)!==414||n(b.sourceInsurers)!==26||n(a.sourceClients)!==414||n(a.sourceInsurers)!==26)e.push('source_counts_changed');
 if(input.targetCollectionSemantic!=='target_only_overlay'||n(b.targetClients)!==2||n(b.targetInsurers)!==2||n(a.targetClients)!==0||n(a.targetInsurers)!==0)e.push('target_overlay_projection_invalid');
 if(n(s.clientSelected)!==2||n(s.insurerSelected)!==2||n(s.totalSelected)!==4||s.classification!=='obsolete'||s.deterministicSelection!==true||s.allTargetOnly!==true||s.allTechnicalMarker!==true||s.allNoSourceIdMatch!==true||s.allNoFingerprintMatch!==true)e.push('selection_invalid');
 if(s.recordIdsExported!==false||s.rawValuesExported!==false||s.pseudonymousTokensExported!==false||String(s.selectionDigest||'').length!==64)e.push('selection_privacy_invalid');
 if(n(w.snapshotWrites)!==4||n(w.auditWrites)!==4||n(w.clientDeletes)!==2||n(w.insurerDeletes)!==2||n(w.totalOperationalWrites)!==12)e.push('write_counts_invalid');
 if(n(w.clientUpdates)!==0||n(w.insurerUpdates)!==0||n(w.createsOutsideSnapshotsAndAudits)!==0||n(w.merges)!==0||n(w.gtGtqWrites)!==0||n(w.configurationWrites)!==0||n(w.membershipWrites)!==0)e.push('out_of_scope_writes');
 if(r.mode!=='exact_restore_from_four_before_snapshots'||r.available!==true||r.snapshotCount!==4||r.restorePathCount!==4||r.restoreOrder!=='reverse_deterministic_selection'||r.executed!==false||r.verified!==false)e.push('rollback_contract_invalid');
 if(au.mode!=='append_only'||au.eventsWritten!==4||au.eventUpdates!==0||au.eventDeletes!==0)e.push('audit_contract_invalid');
 if(v.snapshotReadback!==4||v.auditReadback!==4||v.deletedTargetReadback!==4||v.targetOnlyRemaining!==0||v.sourceCountsUnchanged!==true||v.operationDigestVerified!==true)e.push('post_write_verification_invalid');
 if(scope.sourceClients!=='tenantId/{tenant}/clientes'||scope.targetClients!=='tenants/{tenant}/data/clientes/items'||scope.sourceInsurers!=='tenantId/{tenant}/aseguradoras'||scope.targetInsurers!=='tenants/{tenant}/data/aseguradoras/items'||scope.snapshots!=='tenants/{tenant}/migrationRollbackSnapshots/{operation}/records'||scope.auditEvents!=='tenants/{tenant}/auditEvents')e.push('collection_scope_invalid');
 if(input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.productionTouched||input.mergeMain)e.push('forbidden_delivery_side_effect');
 if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)e.push('sanitization_required');
 return {ok:e.length===0,status:e.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReadyForPostRetirementRevalidation:e.length===0,approvalReadyForClientCorrectionWrite:false,approvalReadyForM4Write:false,errors:e,containsPII:false,containsSecrets:false};
}
window.Orbit.m4TargetOnlyRetirementWriteP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build,validateActivationBoundary:validateActivationBoundary});
})();