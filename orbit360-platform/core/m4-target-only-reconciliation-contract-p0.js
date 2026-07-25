/* Orbit 360 · M4 target-only reconciliation read-only contract */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.7-readonly-20260725';
var STATUS='M4_TARGET_ONLY_RECONCILIATION_READONLY_COMPLETED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){
 input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;
 if(!present)return {ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};
 if(text(q.authorizedBaseCommit)!==parent)return {ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};
 var ok=q.schemaVersion==='orbit360-m4-target-only-reconciliation-request-v1'&&q.gateId==='block4-target-only-reconciliation-readonly-v20260725'&&q.contractVersion==='4.2.7'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.readOnlyReconciliation===true&&n(q.expectedClientTargetOnly)===2&&n(q.expectedInsurerTargetOnly)===2&&q.classificationSet==='expected_duplicate_obsolete_requires_validation'&&q.operationalWrites===false&&q.clientWrites===false&&q.insurerWrites===false&&q.deletes===false&&q.merges===false&&q.inferences===false&&q.containsPII===false&&q.containsSecrets===false;
 return {ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};
}
function sum(o){return n(o.expected)+n(o.duplicate)+n(o.obsolete)+n(o.requiresValidation);}
function build(input){
 input=input||{};var e=[],s=input.sourceCounts||{},t=input.targetCounts||{},r=input.reconciliation||{},c=r.classifications||{},cc=c.clientes||{},ic=c.aseguradoras||{},d=input.diff||{},tr=input.traceability||{},rb=input.rollback||{},scope=input.collectionScope||{};
 if(input.readOnly!==true||input.remoteReadConfirmed!==true)e.push('readonly_remote_required');
 if(input.priorClosureValidated!==true)e.push('prior_closure_required');
 if(n(s.clientes)!==414||n(s.aseguradoras)!==26)e.push('source_counts_changed');
 if(n(t.clientes)!==2||n(t.aseguradoras)!==2)e.push('target_counts_changed');
 if(n(r.clientTargetOnly)!==2||n(r.insurerTargetOnly)!==2||n(r.total)!==4)e.push('exact_target_only_2_2_required');
 if(sum(cc)!==2||sum(ic)!==2||sum(cc)+sum(ic)!==4)e.push('classification_totals_invalid');
 if(r.classificationSet!=='expected_duplicate_obsolete_requires_validation')e.push('classification_set_invalid');
 if(r.rulePriority!=='duplicate_then_obsolete_then_expected_then_requires_validation')e.push('classification_priority_invalid');
 if(r.rawValuesExported!==false||r.recordIdsExported!==false||r.pseudonymousTokensExported!==false)e.push('privacy_required');
 if(n(d.keepExpected)!==n(cc.expected)+n(ic.expected)||n(d.rekeyReview)!==n(cc.duplicate)+n(ic.duplicate)||n(d.retireCandidate)!==n(cc.obsolete)+n(ic.obsolete)||n(d.requiresValidation)!==n(cc.requiresValidation)+n(ic.requiresValidation))e.push('diff_invalid');
 if(n(d.creates)!==0||n(d.updates)!==0||n(d.deletes)!==0||n(d.merges)!==0)e.push('diff_writes_forbidden');
 if(tr.mode!=='aggregate_source_target_comparison'||tr.sourceCollections!==2||tr.targetCollections!==2||tr.beforeAfterPlanned!==true||tr.recordIdsExported!==false)e.push('traceability_required');
 if(rb.mode!=='per_record_before_snapshot_if_future_resolution'||rb.planned!==true||rb.executed!==false||n(rb.snapshotCountPlanned)!==4||rb.snapshotValuesExported!==false)e.push('rollback_required');
 if(n(scope.collectionsRead)!==4||scope.sourceClients!=='tenantId/{tenant}/clientes'||scope.targetClients!=='tenants/{tenant}/data/clientes/items'||scope.sourceInsurers!=='tenantId/{tenant}/aseguradoras'||scope.targetInsurers!=='tenants/{tenant}/data/aseguradoras/items')e.push('collection_scope_invalid');
 if(input.writeAuthorized!==false||input.writeExecuted!==false||input.configurationWrites||input.membershipWrites||input.clientWrites||input.insurerWrites||input.auditWrites||input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.mergeMain)e.push('writes_forbidden');
 if(input.inferenceSourcesUsed!==false||input.policiesRead!==false||input.finmovsRead!==false||input.bankStatementsRead!==false)e.push('inference_forbidden');
 if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)e.push('sanitization_required');
 var requires=n(d.requiresValidation);
 return {ok:e.length===0,status:e.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReadyForTargetOnlyResolutionPlanning:e.length===0&&requires===0,approvalReadyForClientCorrectionWrite:false,approvalReadyForM4Write:false,writeAuthorized:false,writeExecuted:false,errors:e,containsPII:false,containsSecrets:false};
}
window.Orbit.m4TargetOnlyReconciliationP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build,validateActivationBoundary:validateActivationBoundary});
})();
