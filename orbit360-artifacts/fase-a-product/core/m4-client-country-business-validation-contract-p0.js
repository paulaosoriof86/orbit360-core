/* Orbit 360 · M4 business validation GT/GTQ dry-run contract P0 */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='4.2.4-readonly-20260725',STATUS='M4_CLIENT_COUNTRY_BUSINESS_VALIDATION_DRYRUN_COMPLETED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function build(input){input=input||{};var errors=[];var s=input.sourceCounts||{},d=input.sourceDistribution||{},p=input.proposal||{},t=input.traceability||{},r=input.rollback||{};
if(input.readOnly!==true||input.remoteReadConfirmed!==true)errors.push('readonly_remote_required');
if(input.writeAuthorized!==false||input.writeExecuted!==false)errors.push('writes_forbidden');
if(n(s.clientes)!==414||n(s.missingCurrency)!==61)errors.push('baseline_414_61_required');
if(n(d.nonCanonical)!==61||n(d.GT)||n(d.CO)||n(d.empty)||n(d.conflict))errors.push('source_distribution_changed');
if(n(p.records)!==61||n(p.countryFieldChanges)!==61||n(p.currencyFieldChanges)!==61||p.country!=='GT'||p.currency!=='GTQ')errors.push('proposal_61_gt_gtq_required');
if(n(p.creates)!==0||n(p.deletes)!==0||n(p.targetOnlyDeferred)!==4)errors.push('proposal_scope_invalid');
if(t.source!=='business_validation_batch'||t.actorRole!=='Direccion_AyS'||t.reasonCode!=='VALIDACION_EMPRESARIAL_LOTE_61_GT'||t.beforeAfterPlanned!==true||t.recordIdsExported!==false)errors.push('traceability_required');
if(r.mode!=='per_record_before_snapshot'||r.planned!==true||r.executed!==false)errors.push('rollback_required');
if(input.auditPlan!=='append_only'||input.privacyMode!=='aggregate_proposal_only'||input.rawValuesExported!==false||input.individualRecordsExported!==false)errors.push('privacy_audit_required');
if(input.collectionScope?.collectionsRead!==1||input.collectionScope?.insurersRead!==false||input.collectionScope?.targetRead!==false)errors.push('collection_scope_invalid');
if(input.containsPII!==false||input.containsSecrets!==false||n(input.secretValueCount)!==0)errors.push('sanitization_required');
if(input.configurationWrites||input.membershipWrites||input.clientWrites||input.insurerWrites||input.auditWrites||input.rulesChanged||input.hostingDeploy||input.functionsDeploy||input.imports||input.policies||input.mergeMain)errors.push('scope_violation');
return {ok:errors.length===0,status:errors.length?'DATA_CONTRACT_FAILURE':STATUS,contractVersion:VERSION,approvalReadyForClientCorrection:errors.length===0,approvalReadyForM4Write:false,errors:errors,writeAuthorized:false,writeExecuted:false,containsPII:false,containsSecrets:false};}
window.Orbit.m4ClientCountryBusinessValidationP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build});})();
