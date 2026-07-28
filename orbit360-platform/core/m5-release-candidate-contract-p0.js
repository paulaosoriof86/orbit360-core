/* Orbit 360 · M5 release candidate + visualización · readiness contract */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='5.0.0-readiness-20260728';
var READY='M5_RC_READY_FOR_RUNTIME_SMOKE';
var DELIVERY='M5_RC_READY_LAB_DELIVERY_REQUIRED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){
 input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;
 if(!present)return {ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};
 if(text(q.authorizedBaseCommit)!==parent)return {ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};
 var ok=q.schemaVersion==='orbit360-m5-release-candidate-readiness-request-v1'&&q.gateId==='block5-release-candidate-visualization-v20260728'&&q.contractVersion==='5.0.0'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.explicitAuthorization===true&&n(q.allowedExecutions)===1&&q.readinessStatic===true&&q.remoteLabIntegrityRead===true&&q.secrets===false&&q.firestoreRead===false&&q.browser===false&&q.deploy===false&&q.operationalWrites===false&&q.production===false&&q.policies===false&&q.mergeMain===false&&q.containsPII===false&&q.containsSecrets===false;
 return {ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};
}
function build(input){
 input=input||{};var e=[],p=input.prerequisites||{},d=input.dataBaseline||{},v=input.visualReadiness||{},r=input.releaseCandidate||{},lab=input.remoteLab||{},w=input.writes||{};
 if(p.m1Closed!==true||p.m2Closed!==true||p.m3Closed!==true||p.m4Closed!==true)e.push('m1_m4_closure_required');
 if(n(d.clients)!==414||n(d.insurers)!==26||n(d.advisors)!==7||n(d.missingClientCurrency)!==0||n(d.targetOnlyClients)!==0||n(d.targetOnlyInsurers)!==0)e.push('canonical_data_baseline_invalid');
 if(v.mobileTitleResponsiveContract!==true||v.m1HumanApprovalPresent!==true||v.noKnownBlockingVisualDebt!==true)e.push('visual_readiness_invalid');
 if(r.allCriticalAssetsPresent!==true||n(r.criticalAssetCount)!==40||text(r.hash).length!==64||r.hashAlgorithm!=='sha256')e.push('release_candidate_manifest_invalid');
 if(n(lab.assetsExpected)!==22||n(lab.assetsChecked)!==22||typeof lab.remoteParity!=='boolean'||n(lab.assetsMatched)<0||n(lab.assetsMatched)>22||n(lab.mismatchCount)!==(22-n(lab.assetsMatched))||lab.reviewUrl!=='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html')e.push('lab_integrity_evidence_invalid');
 if(lab.remoteParity===true&&n(lab.assetsMatched)!==22)e.push('lab_parity_inconsistent');
 if(lab.remoteParity===false&&n(lab.mismatchCount)<1)e.push('lab_delivery_requirement_inconsistent');
 if(n(w.operationalWrites)!==0||n(w.clientWrites)!==0||n(w.insurerWrites)!==0||n(w.configurationWrites)!==0||n(w.membershipWrites)!==0)e.push('writes_forbidden');
 if(input.secrets||input.firestoreRead||input.browser||input.deploy||input.rulesDeploy||input.functionsDeploy||input.productionTouched||input.policies||input.mergeMain)e.push('forbidden_capability_used');
 if(input.containsPII!==false||input.containsSecrets!==false)e.push('sanitization_required');
 var ok=e.length===0,parity=lab.remoteParity===true;
 return {ok:ok,status:ok?(parity?READY:DELIVERY):'DATA_CONTRACT_FAILURE',contractVersion:VERSION,approvalReadyForLabDelivery:ok&&!parity,approvalReadyForRuntimeSmoke:ok&&parity,visualReviewAuthorized:false,block5Closed:false,errors:e,containsPII:false,containsSecrets:false};
}
window.Orbit.m5ReleaseCandidateP0=Object.freeze({VERSION:VERSION,READY:READY,DELIVERY:DELIVERY,build:build,validateActivationBoundary:validateActivationBoundary});
})();
