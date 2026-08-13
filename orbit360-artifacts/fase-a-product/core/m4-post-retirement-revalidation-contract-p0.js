/* Orbit 360 · M4 post-retirement durable revalidation · read-only */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.10-readonly-20260728';
var STATUS='M4_POST_RETIREMENT_REVALIDATION_READONLY_COMPLETED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){
 input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;
 if(!present)return {ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};
 if(text(q.authorizedBaseCommit)!==parent)return {ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};
 var ok=q.schemaVersion==='orbit360-m4-post-retirement-revalidation-request-v1'&&q.gateId==='block4-post-retirement-revalidation-readonly-v20260728'&&q.contractVersion==='4.2.10'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.readOnlyRevalidation===true&&n(q.expectedSourceClients)===414&&n(q.expectedSourceInsurers)===26&&n(q.expectedTargetClients)===0&&n(q.expectedTargetInsurers)===0&&n(q.expectedSnapshotsReadable)===4&&n(q.expectedAuditEventsReadable)===4&&q.operationalWrites===false&&q.configurationWrites===false&&q.membershipWrites===false&&q.clientWrites===false&&q.insurerWrites===false&&q.auditWrites===false&&q.snapshotWrites===false&&q.deletes===false&&q.merges===false&&q.imports===false&&q.policies===false&&q.applyRules===false&&q.hostingDeploy===false&&q.functionsDeploy===false&&q.production===false&&q.mergeMain===false&&q.containsPII===false&&q.containsSecrets===false;
 return {ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};
}
function build(input){
 input=input||{};var e=[],s=input.sourceCounts||{},t=input.targetCounts||{},a=input.artifacts||{},w=input.writes||{},scope=input.collectionScope||{};
 if(input.readOnly!==true||input.remoteReadConfirmed!==true||input.priorWriteClosureValidated!==true)e.push('readonly_and_prior_closure_required');
 if(n(s.clientes)!==414||n(s.aseguradoras)!==26)e.push('source_counts_changed');
 if(n(t.clientes)!==0||n(t.aseguradoras)!==0||n(t.total)!==0)e.push('target_only_not_zero');
 if(n(a.snapshotsReadable)!==4||n(a.auditEventsReadable)!==4||n(a.snapshotsMissing)!==0||n(a.auditEventsMissing)!==0)e.push('durable_artifacts_invalid');
 if(a.snapshotGateBindingValid!==true||a.auditGateBindingValid!==true||a.auditAppendOnlyValid!==true||a.recordIdsExported!==false||a.rawValuesExported!==false||a.pseudonymousTokensExported!==false)e.push('artifact_binding_or_privacy_invalid');
 if(n(w.operationalWrites)!==0||n(w.configurationWrites)!==0||n(w.membershipWrites)!==0||n(w.clientWrites)!==0||n(w.insurerWrites)!==0||n(w.auditWrites)!==0||n(w.snapshotWrites)!==0||n(w.deletes)!==0||n(w.merges)!==0)e.push('writes_not_zero');
 if(scope.sourceClients!=='tenantId/{tenant}/clientes'||scope.targetClients!=='tenants/{tenant}/data/clientes/items'||scope.sourceInsurers!=='tenantId/{tenant}/aseguradoras'||scope.targetInsurers!=='tenants/{tenant}/data/aseguradoras/items'||scope.snapshots!=='tenants/{tenant}/migrationRollbackSnapshots/*/records'||scope.auditEvents!=='tenants/{tenant}/auditEvents')e.push('collection_scope_invalid');
 if(input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.productionTouched||input.mergeMain)e.push('forbidden_side_effect');
 if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)e.push('sanitization_required');
 return {ok:e.length===0,status:e.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReadyForClientCorrectionWrite:e.length===0,clientCorrectionWriteAuthorized:false,approvalReadyForM4Write:false,errors:e,containsPII:false,containsSecrets:false};
}
window.Orbit.m4PostRetirementRevalidationP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build,validateActivationBoundary:validateActivationBoundary});
})();
