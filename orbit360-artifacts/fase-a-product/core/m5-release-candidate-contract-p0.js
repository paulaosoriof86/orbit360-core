/* Orbit 360 · M5 release candidate + visualización · post-runtime-root-cause remediation */
(function(){
'use strict';window.Orbit=window.Orbit||{};
var VERSION='5.0.6-readiness-academia-remediation-20260729';
var READY='M5_RC_READY_FOR_RUNTIME_SMOKE';
var DELIVERY='M5_RC_READY_LAB_DELIVERY_REQUIRED';
function n(v){return Number(v||0);}function text(v){return String(v==null?'':v).trim();}
function validateActivationBoundary(input){input=input||{};var q=input.request||{},parent=text(input.parentCommit),present=input.requestPresent===true;if(!present)return{ok:true,activationMode:'package_without_request',executionAuthorized:false,allowedExecutions:0};if(text(q.authorizedBaseCommit)!==parent)return{ok:true,activationMode:'historical_request_ignored',executionAuthorized:false,allowedExecutions:0};var ok=q.schemaVersion==='orbit360-m5-runtime-smoke-remediation-static-request-v1'&&q.gateId==='block5-release-candidate-visualization-v20260728'&&q.contractVersion==='5.0.6'&&q.branch==='ays/backend-tenant-lab-v99-20260703'&&q.allowedExecutions===1&&q.staticRemediation===true&&q.remoteLabIntegrityRead===true&&q.secrets===false&&q.firestoreRead===false&&q.browser===false&&q.runtime===false&&q.deploy===false&&q.operationalWrites===false&&q.production===false&&q.policies===false&&q.mergeMain===false&&q.containsPII===false&&q.containsSecrets===false;return{ok:ok,activationMode:ok?'immutable_request_present':'active_request_invalid',executionAuthorized:ok,allowedExecutions:ok?1:0};}
function build(input){input=input||{};var e=[],p=input.prerequisites||{},d=input.dataBaseline||{},v=input.visualReadiness||{},r=input.releaseCandidate||{},lab=input.remoteLab||{},w=input.writes||{};
 if(p.m1Closed!==true||p.m2Closed!==true||p.m3Closed!==true||p.m4Closed!==true||p.m4FinalRevalidationPassed!==true||p.accessBoundaryClosed!==true||p.runtimeStopLineClosed!==true||p.academiaRemediationStaticPassed!==true)e.push('prerequisite_closure_required');
 if(n(d.sourceClients)!==414||n(d.sourceInsurers)!==26||n(d.canonicalTargetConfig)!==1||n(d.canonicalTargetMemberships)!==1||n(d.canonicalTargetClients)!==414||n(d.canonicalTargetInsurers)!==26||n(d.advisors)!==7||n(d.missingClientCurrency)!==0||n(d.targetOnlyClients)!==0||n(d.targetOnlyInsurers)!==0)e.push('canonical_source_target_baseline_invalid');
 if(v.mobileTitleResponsiveContract!==true||v.m1HumanApprovalPresent!==true||v.noKnownBlockingVisualDebt!==true||v.accessRoleBoundaryStatic!==true||v.academiaStaticWritePolicyBound!==true||v.backendRuntimeOwnerAligned!==true)e.push('visual_access_readiness_invalid');
 if(r.allCriticalAssetsPresent!==true||n(r.criticalAssetCount)!==42||text(r.hash).length!==64||r.hashAlgorithm!=='sha256'||r.accessOwnerBound!==true||r.academiaStaticWritePolicyBound!==true)e.push('release_candidate_manifest_invalid');
 if(n(lab.assetsExpected)!==25||n(lab.assetsChecked)!==25||typeof lab.remoteParity!=='boolean'||n(lab.assetsMatched)<0||n(lab.assetsMatched)>25||n(lab.mismatchCount)!==(25-n(lab.assetsMatched))||lab.reviewUrl!=='https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app/ays-lab-preview.html')e.push('lab_integrity_evidence_invalid');
 if(lab.remoteParity===true&&n(lab.assetsMatched)!==25)e.push('lab_parity_inconsistent');
 if(lab.remoteParity===false&&n(lab.mismatchCount)<1)e.push('lab_delivery_requirement_inconsistent');
 if(n(w.operationalWrites)!==0||n(w.clientWrites)!==0||n(w.insurerWrites)!==0||n(w.configurationWrites)!==0||n(w.membershipWrites)!==0)e.push('writes_forbidden');
 if(input.secrets||input.firestoreRead||input.browser||input.runtime||input.deploy||input.rulesDeploy||input.functionsDeploy||input.productionTouched||input.policies||input.mergeMain)e.push('forbidden_capability_used');
 if(input.containsPII!==false||input.containsSecrets!==false)e.push('sanitization_required');
 var ok=e.length===0,parity=lab.remoteParity===true;return{ok:ok,status:ok?(parity?READY:DELIVERY):'DATA_CONTRACT_FAILURE',contractVersion:VERSION,approvalReadyForLabDelivery:ok&&!parity,approvalReadyForRuntimeSmoke:ok&&parity,visualReviewAuthorized:false,block5Closed:false,errors:e,containsPII:false,containsSecrets:false};}
window.Orbit.m5ReleaseCandidateP0=Object.freeze({VERSION:VERSION,READY:READY,DELIVERY:DELIVERY,build:build,validateActivationBoundary:validateActivationBoundary});
})();
