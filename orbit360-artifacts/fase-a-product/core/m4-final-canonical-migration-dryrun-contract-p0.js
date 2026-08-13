/* Orbit 360 · M4 final canonical target migration · read-only dry-run */
(function(){'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.3.0-readonly-20260728',STATUS='M4_FINAL_CANONICAL_MIGRATION_DRYRUN_READY';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;if(!present)return{ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};if(text(q.authorizedBaseCommit)!==parent)return{ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};var ok=q.schemaVersion==='orbit360-m4-final-canonical-migration-dryrun-request-v1'&&q.gateId==='block4-final-canonical-migration-dryrun-v20260728'&&q.contractVersion==='4.3.0'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.readOnlyDryRun===true&&q.secrets===true&&q.firestoreRead===true&&q.writes===false&&q.browser===false&&q.deploy===false&&q.production===false&&q.policies===false&&q.mergeMain===false&&q.containsPII===false&&q.containsSecrets===false;return{ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};}
function build(input){input=input||{};var e=[],s=input.sourceCounts||{},t=input.targetCounts||{},d=input.diff||{},sec=input.security||{};function diff(k){return d[k]||{};}function z(k){var x=diff(k);return n(x.update)===0&&n(x.requires_validation)===0&&n(x.targetOnly)===0;}
 if(input.m4Reopened!==true)e.push('m4_reopened_required');
 if(n(s.configuration_catalog)!==1||n(s.memberships)<1||n(s.clientes)!==414||n(s.aseguradoras)!==26||n(s.quality_audit)!==2)e.push('source_counts_invalid');
 if(n(t.configuration_catalog)!==0||n(t.clientes)!==0||n(t.aseguradoras)!==0||n(t.memberships)!==n(s.memberships))e.push('canonical_target_precondition_invalid');
 if(n(diff('configuration_catalog').create)!==1||!z('configuration_catalog'))e.push('config_diff_invalid');
 if(n(diff('memberships').omit)!==n(s.memberships)||n(diff('memberships').create)!==0||!z('memberships'))e.push('membership_diff_invalid');
 if(n(diff('clientes').create)!==414||n(diff('clientes').omit)!==0||!z('clientes'))e.push('client_diff_invalid');
 if(n(diff('aseguradoras').create)!==26||n(diff('aseguradoras').omit)!==0||!z('aseguradoras'))e.push('insurer_diff_invalid');
 if(n(diff('quality_audit').create)!==2||!z('quality_audit'))e.push('quality_audit_plan_invalid');
 if(n(input.requiresValidation)!==0||input.approvalReady!==true)e.push('validation_remaining');
 if(!/^[a-f0-9]{64}$/.test(text(input.idempotencyKey))||input.sameInputSameIdempotencyKey!==true||text(input.batchId).indexOf('m4-final-')!==0)e.push('idempotency_invalid');
 if(input.auditPlan!=='append_only'||input.rollbackPlan!=='durable'||n(input.rollbackSnapshotCountPlanned)!==441)e.push('audit_rollback_invalid');
 if(n(input.secretValueCount)!==0||sec.containsPII!==false||sec.containsSecrets!==false)e.push('sanitization_invalid');
 if(input.writeAuthorized||input.writeExecuted||n(input.operationalWrites)!==0||input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.productionTouched||input.mergeMain)e.push('forbidden_side_effect');
 var ok=e.length===0;return{ok:ok,status:ok?STATUS:'DATA_CONTRACT_FAILURE',contractVersion:VERSION,approvalReadyForCanonicalWrite:ok,writeAuthorized:false,writeExecuted:false,errors:e,containsPII:false,containsSecrets:false};}
window.Orbit.m4FinalCanonicalMigrationDryrunP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build,validateActivationBoundary:validateActivationBoundary});})();
