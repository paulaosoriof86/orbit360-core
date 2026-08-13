/* Orbit 360 · M4 atomic retirement dry-run for four obsolete target-only records */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.8-readonly-20260725';
var STATUS='M4_TARGET_ONLY_RETIREMENT_DRYRUN_COMPLETED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){
 input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;
 if(!present)return {ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};
 if(text(q.authorizedBaseCommit)!==parent)return {ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};
 var ok=q.schemaVersion==='orbit360-m4-target-only-retirement-dryrun-request-v1'&&q.gateId==='block4-target-only-retirement-dryrun-v20260725'&&q.contractVersion==='4.2.8'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.atomicRetirementDryRunReadOnly===true&&n(q.expectedClientObsolete)===2&&n(q.expectedInsurerObsolete)===2&&n(q.expectedTotalObsolete)===4&&q.deterministicSelection===true&&q.snapshotCountPlanned===4&&q.rollbackExactPlanned===true&&q.auditAppendOnlyPlanned===true&&q.operationalWrites===false&&q.clientWrites===false&&q.insurerWrites===false&&q.auditWrites===false&&q.deletes===false&&q.merges===false&&q.containsPII===false&&q.containsSecrets===false;
 return {ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};
}
function build(input){
 input=input||{};var e=[],s=input.sourceCounts||{},t=input.targetCollectionCounts||{},sel=input.selection||{},d=input.diff||{},a=input.afterProjection||{},tr=input.traceability||{},rb=input.rollback||{},au=input.auditPlan||{},scope=input.collectionScope||{};
 if(input.readOnly!==true||input.remoteReadConfirmed!==true)e.push('readonly_remote_required');
 if(input.priorReconciliationClosureValidated!==true)e.push('prior_reconciliation_closure_required');
 if(n(s.clientes)!==414||n(s.aseguradoras)!==26)e.push('source_counts_changed');
 if(input.targetCollectionSemantic!=='target_only_overlay'||n(t.clientes)!==2||n(t.aseguradoras)!==2)e.push('target_only_overlay_counts_changed');
 if(n(sel.clientSelected)!==2||n(sel.insurerSelected)!==2||n(sel.totalSelected)!==4)e.push('exact_selection_2_2_required');
 if(sel.classification!=='obsolete'||sel.selectionRule!=='target_only_and_technical_marker_and_no_source_equivalence')e.push('selection_rule_invalid');
 if(sel.deterministicOrder!=='collection_then_document_id_asc'||sel.deterministicSelection!==true||!text(sel.selectionDigest)||!text(sel.snapshotDigest))e.push('deterministic_selection_required');
 if(sel.allTargetOnly!==true||sel.allTechnicalMarker!==true||sel.allNoSourceIdMatch!==true||sel.allNoFingerprintMatch!==true)e.push('selection_proof_invalid');
 if(sel.rawValuesExported!==false||sel.recordIdsExported!==false||sel.pseudonymousTokensExported!==false)e.push('selection_privacy_invalid');
 if(n(d.retireCandidates)!==4||n(d.wouldDeleteClients)!==2||n(d.wouldDeleteInsurers)!==2||n(d.actualDeletes)!==0||n(d.actualUpdates)!==0||n(d.actualCreates)!==0||n(d.actualMerges)!==0)e.push('dryrun_diff_invalid');
 if(n(a.targetClientsAfterHypotheticalRetirement)!==0||n(a.targetInsurersAfterHypotheticalRetirement)!==0||n(a.targetOnlyRemaining)!==0||a.approvalReadyForM4Write!==false)e.push('after_projection_invalid');
 if(tr.mode!=='deterministic_target_only_retirement_plan'||tr.sourceCollections!==2||tr.targetCollections!==2||tr.beforeAfterPlanned!==true||tr.recordIdsExported!==false)e.push('traceability_required');
 if(rb.mode!=='exact_restore_from_four_before_snapshots'||rb.planned!==true||rb.executed!==false||n(rb.snapshotCountPlanned)!==4||n(rb.restorePathCountPlanned)!==4||rb.restoreOrder!=='reverse_deterministic_selection'||rb.snapshotValuesExported!==false||!text(rb.snapshotDigest))e.push('rollback_required');
 if(au.mode!=='append_only'||au.planned!==true||au.executed!==false||n(au.plannedEvents)!==4)e.push('audit_plan_required');
 if(n(scope.collectionsRead)!==4||scope.sourceClients!=='tenantId/{tenant}/clientes'||scope.targetClients!=='tenants/{tenant}/data/clientes/items'||scope.sourceInsurers!=='tenantId/{tenant}/aseguradoras'||scope.targetInsurers!=='tenants/{tenant}/data/aseguradoras/items')e.push('collection_scope_invalid');
 if(input.writeAuthorized!==false||input.writeExecuted!==false||input.configurationWrites||input.membershipWrites||input.clientWrites||input.insurerWrites||input.auditWrites||input.deletes||input.merges||input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.mergeMain)e.push('writes_forbidden');
 if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)e.push('sanitization_required');
 return {ok:e.length===0,status:e.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReadyForTargetOnlyRetirementWrite:e.length===0,approvalReadyForClientCorrectionWrite:false,approvalReadyForM4Write:false,writeAuthorized:false,writeExecuted:false,errors:e,containsPII:false,containsSecrets:false};
}
window.Orbit.m4TargetOnlyRetirementDryrunP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build,validateActivationBoundary:validateActivationBoundary});
})();
