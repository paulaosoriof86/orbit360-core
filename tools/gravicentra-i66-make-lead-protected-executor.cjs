'use strict';
// Executor for the two existing protected I6.6 release workflows. Make can
// enqueue only; every configuration/IAM transition is exact-authority CAS.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const scope=require('./gravicentra-i66-make-release-scope.cjs');
const access=require('./gravicentra-i66-make-lead-runtime-access.cjs');
const config=require('./gravicentra-i66-make-lead-ingress-config.cjs');
const c=require('../functions/product-lead-ingress-contract');
const support=require('../functions/product-lead-ingress-owner-support');
const g=require('./gravicentra-i6-6-operational-release-candidate.cjs');
const PROJECT='ays-orbit-360-lab',ROOT='tenants/'+c.TENANT;
const sha40=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const sha64=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const sha256=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const gitBlob=b=>require('node:crypto').createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const resource=(phase)=>`projects/${PROJECT}/locations/${scope.ADDED[phase].region}/functions/${scope.ADDED[phase].name}`;
// Only invariant codes defined by this owner may cross the diagnostic boundary.
// Provider codes and messages cannot enlarge this explicit finite allowlist.
const SAFE_FAILURE_CODES=new Set([
  'INGRESS_AFTER_CREATE_SNAPSHOT_ALREADY_DIFFERENT','INGRESS_AFTER_CREATE_SNAPSHOT_TIME_DRIFT','INGRESS_AFTER_CREATE_SNAPSHOT_TIME_REQUIRED',
  'INGRESS_APPROVED_QUEUE_RULESET_PREIMAGE_CHANGED','INGRESS_AUTH_CONTEXT_EVENT_REQUIRED','INGRESS_BEFORE_REPLAY_SNAPSHOT_REQUIRED',
  'INGRESS_BOUND_RECEIPT_CHANGED','INGRESS_BOUND_RECEIPT_DIGEST_CHANGED','INGRESS_CANDIDATE_CHANGED_DURING_CONFIGURATION',
  'INGRESS_CANONICAL_CHANGED_AFTER_CREATE','INGRESS_CAPTURE_DIRECTORY_REQUIRED','INGRESS_CAPTURE_PHASE_REQUIRED',
  'INGRESS_CHECKOUT_SOURCE_OR_QA_CHANGED','INGRESS_CLOSED_CONFIG_AUTHORITY_REQUIRED','INGRESS_CONFIGURATION_PROOF_PENDING',
  'INGRESS_CONFIG_CHANGED_DURING_PROOF','INGRESS_CONFIG_DEPLOYMENT_REVISION_CHANGED','INGRESS_DEPLOYED_FUNCTION_IDENTITY',
  'INGRESS_DEPLOYED_FUNCTION_NOT_ACTIVE','INGRESS_DEPLOYED_QUEUE_FILTER_DRIFT','INGRESS_DEPLOYED_REVISION_NOT_SERVING',
  'INGRESS_DEPLOYED_REVISION_REQUIRED','INGRESS_DEPLOYED_RULESET_FILES_UNEXPECTED','INGRESS_DEPLOYED_RULES_BYTES_CHANGED',
  'INGRESS_DEPLOYED_RUNTIME_DRIFT','INGRESS_EVENTARC_AND_PROJECT_IAM_PREFLIGHT_HOLD','INGRESS_EVENTARC_BEFORE_PROOF_REQUIRED',
  'INGRESS_EVENT_FILTERS_REQUIRED','INGRESS_EVENT_RETRY_REQUIRED','INGRESS_EXACT_PACKAGE_REQUIRED',
  'INGRESS_EXECUTION_PROVIDER_UNKNOWN','INGRESS_EXECUTION_PROVIDER_MISMATCH','INGRESS_NATIVE_GITHUB_CONTEXT_FORBIDDEN','INGRESS_NATIVE_PIN_OWNER_REQUIRED',
  'INGRESS_FUNCTION_CHANGED_DURING_TRAFFIC_READ','INGRESS_GITHUB_READ_CREDENTIAL_REQUIRED','INGRESS_IAM_UNKNOWN_COMMIT_REQUIRES_RECONCILIATION',
  'INGRESS_OPERATION_AUTHORITY_EXPIRED','INGRESS_OPERATION_CURRENT_ARTIFACT_REQUIRED','INGRESS_OPERATION_CURRENT_BACKEND_REQUIRED',
  'INGRESS_OPERATION_CURRENT_CANDIDATE_CHANGED','INGRESS_OPERATION_CURRENT_SOURCE_REQUIRED','INGRESS_OPERATION_FIVE_TARGET_RECEIPT_REQUIRED',
  'INGRESS_OPERATION_NEEDS_READBACK_OWNER','INGRESS_OPERATION_REVOKED_OR_REPLACED','INGRESS_PREDEPLOY_CONFIG_PREIMAGE_CHANGED',
  'INGRESS_PREDEPLOY_MUST_BE_CLOSED','INGRESS_PREVIEW_NONCE_MISMATCH','INGRESS_PREVIEW_REPORT_DIGEST_REQUIRED',
  'INGRESS_PREVIEW_ROLLBACK_SERVICE_CHANGED','INGRESS_PREVIEW_TRAFFIC_POSTIMAGE_CHANGED','INGRESS_PREVIEW_TRAFFIC_PREIMAGE_CHANGED',
  'INGRESS_PREVIEW_TRAFFIC_RESTORE_UNVERIFIED','INGRESS_PREVIOUS_TRAFFIC_PROOF_REQUIRED','INGRESS_PREVIOUS_TRIGGER_SNAPSHOT_REQUIRED',
  'INGRESS_PROBE_CONFIG_PREIMAGE_CHANGED','INGRESS_PROBE_QUEUE_AND_RESULT_REQUIRED','INGRESS_PROJECT_IAM_CHANGED_DURING_DEPLOY',
  'INGRESS_PROTECTED_ACTION_UNKNOWN','INGRESS_QUEUE_AUTHENTIC_CREATE_TIME_REQUIRED','INGRESS_READBACK_GRANT_REVISION_CHANGED',
  'INGRESS_READBACK_GRANT_SOURCE_CHANGED','INGRESS_REAL_ACTIVATION_REQUIRES_COMMITTED_RELEASE','INGRESS_REAL_PROOF_REQUIRES_COMMITTED_RELEASE',
  'INGRESS_RETRY_EXISTING_TRIGGER_REQUIRED','INGRESS_RETRY_FUNCTION_PREIMAGE_CHANGED','INGRESS_RETRY_TRAFFIC_PREIMAGE_CHANGED',
  'INGRESS_REJECTION_MUST_BE_EXACT_WRONG_NONCE_ONLY','INGRESS_REJECT_CHANGED_CANONICAL_POSTIMAGE','INGRESS_REJECT_MUST_FOLLOW_CANONICAL_SNAPSHOT',
  'INGRESS_REPLAY_CHANGED_CANONICAL_POSTIMAGE','INGRESS_REPLAY_MUST_FOLLOW_CANONICAL_SNAPSHOT','INGRESS_ROLLBACK_CONFIG_MISSING',
  'INGRESS_ROLLBACK_CONFIG_POSTIMAGE_CHANGED','INGRESS_ROLLBACK_UNVERIFIED','INGRESS_RULES_SOURCE_PIN',
  'INGRESS_RUNTIME_FIRESTORE_CAPABILITIES_CHANGED','INGRESS_SIGNED_QUEUE_RESULT_REQUIRED','INGRESS_SOURCE_OR_QA_CHANGED_DURING_CONFIGURATION',
  'INGRESS_SYNTHETIC_RESTORE_CAS_CHANGED','INGRESS_SYNTHETIC_RESTORE_READBACK_HOLD','INGRESS_TRAFFIC_ALIGNMENT_EXISTING_PREIMAGE_REQUIRED',
  'INGRESS_TRAFFIC_ALIGNMENT_PREIMAGE_CHANGED','INGRESS_TRAFFIC_ALLOCATION_UNSUPPORTED','INGRESS_TRAFFIC_CAS_CONFLICT',
  'INGRESS_TRAFFIC_CAS_ETAG_REQUIRED','INGRESS_TRAFFIC_CAS_PREIMAGE_CHANGED','INGRESS_TRAFFIC_GENERATION_REGRESSED',
  'INGRESS_TRAFFIC_GENERATION_REQUIRED','INGRESS_TRAFFIC_GENERATION_UNOBSERVED','INGRESS_TRAFFIC_GRANT_AUTHORITY_REQUIRED',
  'INGRESS_TRAFFIC_GRANT_MUST_BE_CLOSED','INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED','INGRESS_TRAFFIC_GRANT_READER_REQUIRED',
  'INGRESS_TRAFFIC_LATEST_NOT_OBSERVED','INGRESS_TRAFFIC_NOT_READY','INGRESS_TRAFFIC_PATCH_PROVIDER_FAILED',
  'INGRESS_TRAFFIC_PERCENT_REQUIRED','INGRESS_TRAFFIC_PHASE_DENIED','INGRESS_TRAFFIC_PROOF_DIGEST_CHANGED',
  'INGRESS_TRAFFIC_PROOF_SERVICE_CHANGED','INGRESS_TRAFFIC_RECONCILING','INGRESS_TRAFFIC_REVISION_SCOPE_DENIED',
  'INGRESS_TRAFFIC_ROUTING_GENERATION_CHANGED','INGRESS_TRAFFIC_ROUTING_TARGET_CHANGED','INGRESS_TRAFFIC_SERVICE_IDENTITY_CHANGED',
  'INGRESS_TRAFFIC_SERVICE_RECREATED','INGRESS_TRAFFIC_SERVICE_SCOPE_DENIED','INGRESS_TRAFFIC_SERVICE_UID_REQUIRED',
  'INGRESS_TRAFFIC_SPLIT_UNSUPPORTED','INGRESS_TRAFFIC_TAGGED_TARGET_UNSUPPORTED','INGRESS_TRAFFIC_V1_GENERATION_CHANGED',
  'INGRESS_TRAFFIC_V1_METADATA_CHANGED','INGRESS_TRAFFIC_V1_RESOURCE_VERSION_REQUIRED','INGRESS_TRAFFIC_V1_ROLLBACK_POSTIMAGE_CHANGED',
  'INGRESS_TRAFFIC_V1_SERVICE_REQUIRED','INGRESS_TRAFFIC_V1_SERVICE_SCOPE_CHANGED','INGRESS_TRAFFIC_V1_SERVICE_UID_CHANGED',
  'INGRESS_TRAFFIC_V1_TEMPLATE_CHANGED','INGRESS_TRAFFIC_V1_TEMPLATE_REQUIRED','INGRESS_TRAFFIC_V1_TRAFFIC_CHANGED',
  'INGRESS_TRIGGER_NON_REVISION_CONFIGURATION_CHANGED','INGRESS_TRIGGER_POSTIMAGE_REQUIRED_FOR_DELETE','INGRESS_TRIGGER_POSTIMAGE_REQUIRED_FOR_RESTORE',
  'INGRESS_TRIGGER_PREIMAGE_CONFIGURATION_CHANGED','INGRESS_TRIGGER_PREIMAGE_MISSING','INGRESS_TRIGGER_PREIMAGE_NOT_ABSENT',
  'INGRESS_TRIGGER_REVISION_NOT_CHANGED','INGRESS_TRIGGER_ROLLBACK_ABSENCE_UNVERIFIED','INGRESS_TRIGGER_ROLLBACK_POSTIMAGE_CHANGED'
]);
function safeFailureCode(error){
  const explicit=String(error?.code||'');if(SAFE_FAILURE_CODES.has(explicit))return explicit;
  const message=String(error?.message||'').match(/^(INGRESS_[A-Z0-9_]+)(?:\s|$)/);
  return message&&SAFE_FAILURE_CODES.has(message[1])?message[1]:'I66_MAKE_PROTECTED_EXECUTION_HOLD';
}
function safeRoutingObservation(row,phase){
  const prefix=scope.ADDED[phase].name.toLowerCase()+'-';
  const revision=value=>typeof value==='string'&&new RegExp('^'+prefix+'[a-z0-9-]+$').test(value)?value:null;
  return{responseSha256:c.digest(row),serviceNameMatchesExpected:
    row?.name==='projects/'+PROJECT+'/locations/'+scope.ADDED[phase].region+'/services/'+scope.ADDED[phase].name.toLowerCase(),
    serviceUid:/^[a-f0-9-]{36}$/i.test(String(row?.uid||''))?row.uid:null,
    generation:/^[0-9]+$/.test(String(row?.generation||''))?String(row.generation):null,
    observedGeneration:/^[0-9]+$/.test(String(row?.observedGeneration||''))?String(row.observedGeneration):null,
    reconciling:typeof row?.reconciling==='boolean'?row.reconciling:null,
    condition:['CONDITION_SUCCEEDED','CONDITION_PENDING','CONDITION_FAILED','CONDITION_RECONCILING'].includes(row?.terminalCondition?.state)?row.terminalCondition.state:null,
    etagSha256:typeof row?.etag==='string'?sha256(row.etag):null,
    trafficCount:Array.isArray(row?.trafficStatuses)?row.trafficStatuses.length:null,
    targets:Array.isArray(row?.trafficStatuses)?row.trafficStatuses.slice(0,8).map(value=>{const t=value&&typeof value==='object'?value:{};return{revision:revision(t.revision),
      percent:Number.isSafeInteger(t.percent)?t.percent:null,tagPresent:t.tag!==undefined&&t.tag!=='',
      allocation:['TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST','TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION'].includes(t.type)?t.type:null};}):null};
}
function captureRecorders(directory,phase){
  assert.ok(path.isAbsolute(directory),'INGRESS_CAPTURE_DIRECTORY_REQUIRED');
  assert.ok(['preview','live'].includes(phase),'INGRESS_CAPTURE_PHASE_REQUIRED');
  const write=(suffix,value)=>fs.writeFileSync(path.join(directory,`gi-make-${phase}-${suffix}.json`),JSON.stringify(value,null,2)+'\n');
  return{retainDiagnostic:value=>write('capture-trigger-observation',value),retainPostimage:value=>write('capture-trigger',value)};
}
function fnProjection(fn,p,phase){
  assert.equal(fn?.name,resource(phase),'INGRESS_DEPLOYED_FUNCTION_IDENTITY');
  assert.equal(fn.state,'ACTIVE','INGRESS_DEPLOYED_FUNCTION_NOT_ACTIVE');
  assert.equal(fn.serviceConfig?.serviceAccountEmail,p.makeIngress.runtimeAccess.principal,'INGRESS_DEPLOYED_RUNTIME_DRIFT');
  const filters=fn.eventTrigger?.eventFilters;assert.ok(Array.isArray(filters),'INGRESS_EVENT_FILTERS_REQUIRED');
  assert.equal(fn.eventTrigger.eventType,scope.EVENT_TYPE,'INGRESS_AUTH_CONTEXT_EVENT_REQUIRED');
  const expected=[{attribute:'database',value:'(default)'},{attribute:'namespace',value:'(default)'},
    {attribute:'document',value:`${ROOT}/${phase==='preview'?c.PREVIEW_QUEUE:c.QUEUE}/{requestId}`,operator:'match-path-pattern'}];
  assert.deepEqual([...filters].sort((a,b)=>a.attribute.localeCompare(b.attribute)),expected.sort((a,b)=>a.attribute.localeCompare(b.attribute)),
    'INGRESS_DEPLOYED_QUEUE_FILTER_DRIFT');
  assert.equal(fn.eventTrigger.retryPolicy,'RETRY_POLICY_RETRY','INGRESS_EVENT_RETRY_REQUIRED');
  assert.match(String(fn.serviceConfig?.revision||''),/^[a-z][a-z0-9-]+$/,'INGRESS_DEPLOYED_REVISION_REQUIRED');
  const projection={name:scope.ADDED[phase].name,region:scope.ADDED[phase].region,revision:fn.serviceConfig.revision,
    runtimePrincipal:fn.serviceConfig.serviceAccountEmail,eventType:fn.eventTrigger.eventType,database:'(default)',
    document:`${ROOT}/${phase==='preview'?c.PREVIEW_QUEUE:c.QUEUE}/{requestId}`,
    retryPolicy:fn.eventTrigger.retryPolicy,trigger:fn.eventTrigger.trigger,
    service:fn.serviceConfig.service};
  return{...projection,configurationDigest:c.digest(projection)};
}
function requireOperation(op,p,phase,nowMs=Date.now()){
  assert.equal(op?.schema,'GI_I66_MAKE_INGRESS_PROTECTED_OPERATION_V1');
  assert.equal(op.phase,phase);assert.equal(op.scopeContractBlob,scope.CONTRACT_BLOB);
  assert.equal(op.sourceSha,p.sourceSha);assert.equal(op.artifactDigest,p.artifactDigest);
  assert.equal(op.approvedByDirection,true);assert.equal(op.externalMessagesSent,0);
  assert.ok(['BIND_PRINCIPAL','ACTIVATE','CLOSE','VERIFY_PROBE','CAPTURE_AFTER_CREATE','VERIFY_PREVIEW','VERIFY_REAL'].includes(op.action),'INGRESS_PROTECTED_ACTION_UNKNOWN');
  assert.ok(Number.isSafeInteger(op.version)&&op.version>0);assert.ok(sha64(op.expectedConfigDigest));
  const expires=Date.parse(op.expiresAt);assert.ok(expires>nowMs&&expires<=nowMs+900000,'INGRESS_OPERATION_AUTHORITY_EXPIRED');
  return op;
}
function resolveCandidate(control,phase,operation=false){
  assert.ok(['preview','live'].includes(phase));
  let p;
  if(operation&&control.status==='OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED'&&!control.scopedBackendPreviewI66&&!control.operationalReleaseCandidate){
    p=control.lastConsumedOperationalCandidate;
    assert.equal(control.currentPhysicalHostingRelease?.sourceSha,p?.sourceSha,'INGRESS_OPERATION_CURRENT_SOURCE_REQUIRED');
    assert.equal(control.currentPhysicalHostingRelease?.artifactDigest,p?.artifactDigest,'INGRESS_OPERATION_CURRENT_ARTIFACT_REQUIRED');
    assert.equal(control.currentPhysicalBackendRelease?.sourceSha,p?.sourceSha,'INGRESS_OPERATION_CURRENT_BACKEND_REQUIRED');
    assert.equal(control.currentPhysicalBackendRelease?.functionsChanged,5,'INGRESS_OPERATION_FIVE_TARGET_RECEIPT_REQUIRED');
  }else p=g.candidateForPhase(control,phase);
  scope.validateCandidate(p,phase);return p;
}
function readBoundJson(binding,read=fs.readFileSync){
  assert.match(String(binding?.path||''),/^artifacts\/orbit360-recovery\/release-control\/I6_6_[A-Z0-9_]+\.json$/);
  assert.ok(sha40(binding.gitBlobSha));const b=read(binding.path);assert.equal(gitBlob(b),binding.gitBlobSha,'INGRESS_BOUND_RECEIPT_CHANGED');
  if(binding.sha256!==undefined)assert.equal(sha256(b),binding.sha256,'INGRESS_BOUND_RECEIPT_DIGEST_CHANGED');
  return JSON.parse(b);
}
function verifyMakeExecution(binding,read){
  const r=readBoundJson(binding,read);assert.equal(r.schema,'GI_I66_MAKE_QUEUE_EXECUTION_RECEIPT_V1');
  assert.equal(r.status,'success');assert.equal(r.scenarioId,c.SCENARIO);assert.equal(r.connectionId,c.FIRESTORE_CONNECTION);
  assert.equal(r.module,'google-cloud-firestore:createDocument');assert.equal(r.externalMessagesSent,0);
  assert.match(String(r.executionId||''),/^[A-Za-z0-9-]{8,100}$/);assert.match(String(r.documentName||''),/^projects\/ays-orbit-360-lab\/databases\/\(default\)\/documents\/tenants\/alianzas-soluciones\/(previewLeadIngressRequests|leadIngressRequests)\/[A-Za-z0-9._:-]+$/);
  return{...r,receiptBlobSha:binding.gitBlobSha};
}
async function deployedRules(auth,p){
  const pin=p.makeIngress.queueRules;
  assert.ok(['firestore.rules','firestore.b4-003-scoped-candidate.rules'].includes(pin?.sourcePath));assert.ok(sha40(pin?.sourceBlob));
  const source=execFileSync('git',['show',p.sourceSha+':'+pin.sourcePath]);assert.equal(gitBlob(source),pin.sourceBlob,'INGRESS_RULES_SOURCE_PIN');
  // Both allowlisted source owners deny the outside-/data queue. Require the
  // deployed ruleset bytes, not a boolean supplied by the operation request.
  assert.match(source.toString(),/match \/\{document=\*\*\}/);assert.match(source.toString(),/allow read, write: if false/);
  const release=await auth.request({url:`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/cloud.firestore`,method:'GET'});
  const name=release.data?.rulesetName;assert.match(String(name||''),/^projects\/ays-orbit-360-lab\/rulesets\/[A-Za-z0-9-]+$/);
  const response=await auth.request({url:'https://firebaserules.googleapis.com/v1/'+name,method:'GET'}),files=response.data?.source?.files;
  assert.ok(Array.isArray(files)&&files.length===1,'INGRESS_DEPLOYED_RULESET_FILES_UNEXPECTED');
  const actual=Buffer.from(files[0].content||'');assert.equal(gitBlob(actual),pin.sourceBlob,'INGRESS_DEPLOYED_RULES_BYTES_CHANGED');
  return{queueRulesDenyClient:true,rulesetName:name,rulesSourceBlob:pin.sourceBlob,rulesSourceSha256:sha256(actual)};
}
async function deployedFunction(auth,p,phase,observe){
  const response=await auth.request({url:'https://cloudfunctions.googleapis.com/v2/'+resource(phase),method:'GET'});
  if(observe)observe({kind:'FUNCTION_RESPONSE',responseSha256:c.digest(response.data),
    nameMatchesExpected:response.data?.name===resource(phase),active:response.data?.state==='ACTIVE'});
  const projection=fnProjection(response.data,p,phase);
  if(observe)observe({kind:'FUNCTION_PROJECTION',function:projection});return projection;
}
async function optionalFunction(auth,p,phase){
  try{return await deployedFunction(auth,p,phase);}catch(error){if(Number(error?.response?.status)===404)return null;throw error;}
}
function trafficServiceResource(service,phase){
  assert.ok(['preview','live'].includes(phase),'INGRESS_TRAFFIC_PHASE_DENIED');
  const target=scope.ADDED[phase],suffix='/locations/'+target.region+'/services/'+target.name.toLowerCase();
  assert.ok(['projects/'+PROJECT+suffix,'projects/646761409743'+suffix].includes(service),
    'INGRESS_TRAFFIC_SERVICE_SCOPE_DENIED');
  return 'projects/'+PROJECT+suffix;
}
function trafficRevision(value,service,phase){
  const canonical=trafficServiceResource(service,phase),short=canonical.split('/').at(-1),prefix=canonical+'/revisions/';
  let revision=String(value||'');
  for(const project of [PROJECT,'646761409743']){
    const candidate=prefix.replace('projects/'+PROJECT+'/','projects/'+project+'/');
    if(revision.startsWith(candidate)){revision=revision.slice(candidate.length);break;}
  }
  assert.ok(new RegExp('^'+short+'-[a-z0-9-]+$').test(revision),'INGRESS_TRAFFIC_REVISION_SCOPE_DENIED');
  return revision;
}
function trafficProjection(row,fn,phase){
  const service=trafficServiceResource(fn.service,phase);
  assert.equal(fn.name,scope.ADDED[phase].name);assert.equal(fn.region,scope.ADDED[phase].region);
  assert.equal(trafficServiceResource(row?.name,phase),service,'INGRESS_TRAFFIC_SERVICE_IDENTITY_CHANGED');
  assert.ok(row.reconciling===undefined||row.reconciling===false,'INGRESS_TRAFFIC_RECONCILING');
  assert.equal(row.terminalCondition?.state,'CONDITION_SUCCEEDED','INGRESS_TRAFFIC_NOT_READY');
  assert.ok(typeof row.generation==='string'&&/^[1-9][0-9]*$/.test(row.generation),'INGRESS_TRAFFIC_GENERATION_REQUIRED');
  assert.equal(row.observedGeneration,row.generation,'INGRESS_TRAFFIC_GENERATION_UNOBSERVED');
  assert.match(String(row.uid||''),/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
    'INGRESS_TRAFFIC_SERVICE_UID_REQUIRED');
  const rows=row.trafficStatuses;
  assert.ok(Array.isArray(rows)&&rows.length===1,'INGRESS_TRAFFIC_SPLIT_UNSUPPORTED');
  const target=rows[0];
  assert.equal(target.percent,100,'INGRESS_TRAFFIC_PERCENT_REQUIRED');
  assert.ok(target.tag===undefined||target.tag==='','INGRESS_TRAFFIC_TAGGED_TARGET_UNSUPPORTED');
  assert.ok(['TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST','TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION'].includes(target.type),
    'INGRESS_TRAFFIC_ALLOCATION_UNSUPPORTED');
  const revision=trafficRevision(target.revision,service,phase);
  if(target.type==='TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST')
    assert.equal(trafficRevision(row.latestReadyRevision,service,phase),revision,'INGRESS_TRAFFIC_LATEST_NOT_OBSERVED');
  const observed={schema:'GI_I66_MAKE_CLOUD_RUN_TRAFFIC_V1',phase,service,serviceUid:row.uid,
    generation:row.generation,observedFrom:'CLOUD_RUN_V2_TRAFFIC_STATUSES',
    targets:[{revision,percent:100}]};
  return{...observed,observationDigest:c.digest(observed)};
}
function validateTrafficProof(proof,fn,phase){
  assert.equal(proof?.schema,'GI_I66_MAKE_CLOUD_RUN_TRAFFIC_V1','INGRESS_PREVIOUS_TRAFFIC_PROOF_REQUIRED');
  assert.equal(proof.phase,phase);assert.equal(proof.observedFrom,'CLOUD_RUN_V2_TRAFFIC_STATUSES');
  assert.equal(proof.service,trafficServiceResource(fn.service,phase),'INGRESS_TRAFFIC_PROOF_SERVICE_CHANGED');
  assert.match(String(proof.serviceUid||''),/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  assert.ok(typeof proof.generation==='string'&&/^[1-9][0-9]*$/.test(proof.generation));
  assert.ok(Array.isArray(proof.targets)&&proof.targets.length===1,'INGRESS_TRAFFIC_SPLIT_UNSUPPORTED');
  const target=proof.targets[0];assert.deepEqual(Object.keys(target).sort(),['percent','revision']);assert.equal(target.percent,100);
  assert.equal(trafficRevision(target.revision,proof.service,phase),target.revision);
  const {observationDigest,...observed}=proof;
  assert.equal(c.digest(observed),observationDigest,'INGRESS_TRAFFIC_PROOF_DIGEST_CHANGED');
  return{service:proof.service,serviceUid:proof.serviceUid,targets:proof.targets};
}
function trafficV1Url(service,phase){
  const canonical=trafficServiceResource(service,phase),target=scope.ADDED[phase];
  return 'https://'+target.region+'-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/'+PROJECT+'/services/'+canonical.split('/').at(-1);
}
function trafficV1Preimage(row,traffic,phase){
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  assert.ok(object(row)&&row.apiVersion==='serving.knative.dev/v1'&&row.kind==='Service','INGRESS_TRAFFIC_V1_SERVICE_REQUIRED');
  const meta=row.metadata,service=trafficServiceResource(traffic.service,phase);
  assert.ok(object(meta)&&meta.name===service.split('/').at(-1)&&[PROJECT,'646761409743'].includes(meta.namespace),
    'INGRESS_TRAFFIC_V1_SERVICE_SCOPE_CHANGED');
  assert.equal(meta.uid,traffic.serviceUid,'INGRESS_TRAFFIC_V1_SERVICE_UID_CHANGED');
  assert.equal(String(meta.generation),traffic.generation,'INGRESS_TRAFFIC_V1_GENERATION_CHANGED');
  assert.ok(typeof meta.resourceVersion==='string'&&meta.resourceVersion.length>0&&meta.resourceVersion.length<=512&&
    !/[\x00-\x1f\x7f]/.test(meta.resourceVersion),'INGRESS_TRAFFIC_V1_RESOURCE_VERSION_REQUIRED');
  assert.ok(object(row.spec)&&object(row.spec.template),'INGRESS_TRAFFIC_V1_TEMPLATE_REQUIRED');
  assert.ok(Array.isArray(row.status?.traffic)&&row.status.traffic.length===1,'INGRESS_TRAFFIC_V1_TRAFFIC_CHANGED');
  const target=row.status.traffic[0];
  assert.equal(trafficRevision(target.revisionName,service,phase),traffic.targets[0].revision,'INGRESS_TRAFFIC_V1_TRAFFIC_CHANGED');
  assert.equal(target.percent,100,'INGRESS_TRAFFIC_V1_TRAFFIC_CHANGED');
  assert.ok(target.tag===undefined||target.tag==='','INGRESS_TRAFFIC_V1_TRAFFIC_CHANGED');
  return{responseSha256:c.digest(row),service,serviceUid:meta.uid,generation:String(meta.generation),
    resourceVersionSha256:sha256(meta.resourceVersion),templateSha256:c.digest(row.spec.template)};
}
function trafficV1Data(row,traffic,phase,revision){
  trafficV1Preimage(row,traffic,phase);
  assert.equal(trafficRevision(revision,traffic.service,phase),revision,'INGRESS_TRAFFIC_REVISION_SCOPE_DENIED');
  const data=structuredClone(row);delete data.status;
  data.spec.traffic=[{revisionName:revision,percent:100,latestRevision:false}];
  assert.deepEqual(data.metadata,row.metadata,'INGRESS_TRAFFIC_V1_METADATA_CHANGED');
  assert.deepEqual(data.spec.template,row.spec.template,'INGRESS_TRAFFIC_V1_TEMPLATE_CHANGED');
  return data;
}
function trafficV1Request(row,traffic,phase,revision){
  return{url:trafficV1Url(traffic.service,phase),method:'PUT',data:trafficV1Data(row,traffic,phase,revision),
    timeout:30000,retry:false,maxRedirects:0};
}
async function routingObservation(auth,p,phase,fn,observe,withV1=false){
  const service=trafficServiceResource(fn.service,phase);
  const response=await auth.request({url:'https://run.googleapis.com/v2/'+service,method:'GET'});
  if(observe)observe({kind:'CLOUD_RUN_RESPONSE',...safeRoutingObservation(response.data,phase)});
  const traffic=trafficProjection(response.data,fn,phase);
  if(observe)observe({kind:'TRAFFIC_PROJECTION',traffic});
  let v1,v1Proof;
  if(withV1){
    const received=await auth.request({url:trafficV1Url(service,phase),method:'GET',timeout:30000,retry:false,maxRedirects:0});
    if(observe)observe({kind:'CLOUD_RUN_V1_RESPONSE',responseSha256:c.digest(received.data)});
    v1=structuredClone(received.data);v1Proof=trafficV1Preimage(v1,traffic,phase);
    if(observe)observe({kind:'CLOUD_RUN_V1_PREIMAGE',...v1Proof});
  }
  // A Functions deploy during the independent routing reads invalidates the
  // observation. Its API revision is never a substitute for serving traffic.
  assert.deepEqual(await deployedFunction(auth,p,phase,observe),fn,'INGRESS_FUNCTION_CHANGED_DURING_TRAFFIC_READ');
  return{traffic,etag:response.data.etag,...(withV1?{runResponseSha256:c.digest(response.data),v1,v1Proof}:{})};
}
async function deployedTraffic(auth,p,phase,fn,observe){
  return(await routingObservation(auth,p,phase,fn,observe)).traffic;
}
function sameTriggerConfiguration(before,after){
  const view=fn=>Object.fromEntries(Object.entries(fn||{}).filter(([key])=>!['revision','configurationDigest'].includes(key)));
  assert.deepEqual(view(after),view(before),'INGRESS_TRIGGER_NON_REVISION_CONFIGURATION_CHANGED');
}
function retryPreimage(p,phase,report){
  const value=require('./gravicentra-i6-6-cloud-build-operational.cjs').validateRetryReadback(p,phase,report);
  return value?.verifiedCurrentBefore||null;
}
function closedPreimageDigest(p,phase,report){return retryPreimage(p,phase,report)?.configurationDigest||p.makeIngress.closedConfiguration?.[phase]?.expectedDigest;}
function validateSnapshotPreimage(p,phase,snapshot,report){
  const before=p.makeIngress.targetBefore[phase],retry=retryPreimage(p,phase,report);
  assert.equal(snapshot.previousState,before.state);
  if(retry){
    assert.equal(before.state,'EXISTING_APPROVED','INGRESS_RETRY_EXISTING_TRIGGER_REQUIRED');
    assert.deepEqual(snapshot.function,retry.function,'INGRESS_RETRY_FUNCTION_PREIMAGE_CHANGED');
    assert.deepEqual(validateTrafficProof(snapshot.traffic,snapshot.function,phase),validateTrafficProof(retry.traffic,retry.function,phase),'INGRESS_RETRY_TRAFFIC_PREIMAGE_CHANGED');
    assert.ok(BigInt(snapshot.traffic.generation)>=BigInt(retry.traffic.generation),'INGRESS_TRAFFIC_GENERATION_REGRESSED');
  }else if(before.state!=='ABSENT'){
    assert.equal(snapshot.function?.revision,before.revision);assert.equal(snapshot.function?.configurationDigest,before.configurationDigest,'INGRESS_TRIGGER_PREIMAGE_CONFIGURATION_CHANGED');
  }
  return snapshot;
}
async function snapshotTrigger({auth,p,phase,retryReadback}){
  const actual=await optionalFunction(auth,p,phase),before=p.makeIngress.targetBefore[phase];
  if(before.state==='ABSENT')assert.equal(actual,null,'INGRESS_TRIGGER_PREIMAGE_NOT_ABSENT');
  else assert.ok(actual,'INGRESS_TRIGGER_PREIMAGE_MISSING');
  return validateSnapshotPreimage(p,phase,{schema:'GI_I66_MAKE_TRIGGER_SNAPSHOT_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    previousState:before.state,function:actual,traffic:actual?await deployedTraffic(auth,p,phase,actual):null},retryReadback);
}
async function requireClosedTrafficGrant({db,p,phase,retryReadback},expected=closedPreimageDigest(p,phase,retryReadback)){
  assert.ok(db&&typeof db.collection==='function','INGRESS_TRAFFIC_GRANT_READER_REQUIRED');
  assert.ok(expected==='ABSENT'||sha64(expected),'INGRESS_TRAFFIC_GRANT_AUTHORITY_REQUIRED');
  const grant=await support.grantRef(db,phase==='preview').get(),row=grant.exists?grant.data():null;
  const digest=grant.exists?c.digest(row):'ABSENT';
  assert.equal(digest,expected,'INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED');
  if(grant.exists)assert.ok(row.state==='CLOSED'&&row.enabled===false,'INGRESS_TRAFFIC_GRANT_MUST_BE_CLOSED');
  return{exists:grant.exists,digest,state:grant.exists?'CLOSED':'ABSENT'};
}
async function captureTrigger({db,auth,p,phase,snapshot,retryReadback,retainDiagnostic=()=>{},retainPostimage=()=>{},
  pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  const diagnostic={schema:'GI_I66_MAKE_TRIGGER_CAPTURE_DIAGNOSTIC_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    status:'OBSERVED_NOT_ACCEPTED',stage:'START',observations:[],routing:{attempted:false,trafficWrites:0},
    iamWrites:0,configurationWrites:0,canonicalLeadWrites:0,externalMessagesSent:0};
  const retain=()=>retainDiagnostic(structuredClone(diagnostic));
  const observe=row=>{diagnostic.observations.push(row);retain();};
  const postimage=(fn,traffic,status,v1Proof)=>({schema:'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1',phase,sourceSha:p.sourceSha,
    artifactDigest:p.artifactDigest,previousState:snapshot.previousState,previousRevision:snapshot.function?.revision||null,
    status,function:fn,traffic,...(v1Proof?{trafficV1:v1Proof}:{}),routing:structuredClone(diagnostic.routing)});
  retain();
  try{
    assert.equal(snapshot?.schema,'GI_I66_MAKE_TRIGGER_SNAPSHOT_V1');assert.equal(snapshot.phase,phase);
    assert.equal(snapshot.sourceSha,p.sourceSha);assert.equal(snapshot.artifactDigest,p.artifactDigest);
    diagnostic.stage='POSTDEPLOY_OBSERVATION';
    const fn=await deployedFunction(auth,p,phase,observe);
    if(snapshot.function)assert.notEqual(fn.revision,snapshot.function.revision,'INGRESS_TRIGGER_REVISION_NOT_CHANGED');
    let observed=await routingObservation(auth,p,phase,fn,observe,true),traffic=observed.traffic;
    // Keep every observed pair as diagnostics before asserting its meaning.
    // Only exact prior routing or the exact deployed revision may become a
    // rollback postimage; an unknown concurrent route never grants a write.
    observe({kind:'POSTDEPLOY_PAIR',function:fn,traffic});
    if(snapshot.traffic)assert.equal(traffic.serviceUid,snapshot.traffic.serviceUid,'INGRESS_TRAFFIC_SERVICE_RECREATED');
    if(traffic.targets[0].revision!==fn.revision){
      diagnostic.stage='EXACT_PREVIOUS_TRAFFIC_CAS';retain();
      assert.equal(snapshot.previousState,'EXISTING_APPROVED','INGRESS_TRAFFIC_ALIGNMENT_EXISTING_PREIMAGE_REQUIRED');
      validateSnapshotPreimage(p,phase,snapshot,retryReadback);
      sameTriggerConfiguration(snapshot.function,fn);
      assert.deepEqual(validateTrafficProof(traffic,fn,phase),validateTrafficProof(snapshot.traffic,snapshot.function,phase),
        'INGRESS_TRAFFIC_ALIGNMENT_PREIMAGE_CHANGED');
      assert.ok(BigInt(traffic.generation)>=BigInt(snapshot.traffic.generation),'INGRESS_TRAFFIC_GENERATION_REGRESSED');
      retainPostimage(postimage(fn,traffic,'OBSERVED_NOT_ACCEPTED',observed.v1Proof));
      assert.ok(typeof observed.etag==='string'&&observed.etag.length>0&&observed.etag.length<=512&&
        !/[\x00-\x1f\x7f]/.test(observed.etag),'INGRESS_TRAFFIC_CAS_ETAG_REQUIRED');
      const fresh=await routingObservation(auth,p,phase,fn,observe,true);
      assert.deepEqual(fresh,observed,'INGRESS_TRAFFIC_CAS_PREIMAGE_CHANGED');
      const request=trafficV1Request(fresh.v1,traffic,phase,fn.revision),data=request.data;
      // The earlier predeploy check cannot authorize a later routing write.
      // This fresh read is the final awaited operation before the resourceVersion PUT.
      diagnostic.stage='CLOSED_GRANT_PRE_PUT';retain();
      const closedGrantBefore=await requireClosedTrafficGrant({db,p,phase,retryReadback});
      diagnostic.routing={attempted:true,trafficWrites:null,beforeDigest:traffic.observationDigest,closedGrantBefore,
        etagSha256:sha256(observed.etag),resourceVersionSha256:fresh.v1Proof.resourceVersionSha256,
        templateSha256:fresh.v1Proof.templateSha256,targetRevision:fn.revision,percent:100,requestSha256:c.digest(data)};
      diagnostic.stage='TRAFFIC_V1_PUT_ATTEMPTED';retain();
      try{
        const response=await auth.request(request);
        observe({kind:'TRAFFIC_V1_PUT_RESPONSE',responseSha256:c.digest(response.data)});
        assert.ok(!response.data?.error,'INGRESS_TRAFFIC_PATCH_PROVIDER_FAILED');
      }catch(error){
        const http=Number(error?.response?.status);
        if([400,401,403,404,409,412].includes(http))diagnostic.routing.trafficWrites=0;
        if(Number.isInteger(http))diagnostic.routing.httpStatus=http;
        if([409,412].includes(http))throw Object.assign(Error('INGRESS_TRAFFIC_CAS_CONFLICT'),{code:'INGRESS_TRAFFIC_CAS_CONFLICT'});
        throw error;
      }
      diagnostic.stage='TRAFFIC_V1_PUT_READBACK';retain();
      let serving=false;
      for(let attempt=0;attempt<30;attempt++){
        try{
          const read=await routingObservation(auth,p,phase,fn,observe,true),current=read.traffic;
          observe({kind:'POST_ROUTING_PAIR',function:fn,traffic:current,trafficV1:read.v1Proof});
          assert.equal(current.serviceUid,traffic.serviceUid,'INGRESS_TRAFFIC_SERVICE_RECREATED');
          assert.equal(read.v1Proof.templateSha256,fresh.v1Proof.templateSha256,'INGRESS_TRAFFIC_V1_TEMPLATE_CHANGED');
          if(current.targets[0].revision===fn.revision){
            assert.equal(BigInt(current.generation),BigInt(traffic.generation)+1n,'INGRESS_TRAFFIC_ROUTING_GENERATION_CHANGED');
            retainPostimage(postimage(fn,current,'OBSERVED_NOT_ACCEPTED',read.v1Proof));
            traffic=current;observed=read;serving=true;break;
          }
          assert.deepEqual(validateTrafficProof(current,fn,phase),validateTrafficProof(traffic,fn,phase),
            'INGRESS_TRAFFIC_ROUTING_TARGET_CHANGED');
        }catch(error){
          if(!['INGRESS_TRAFFIC_RECONCILING','INGRESS_TRAFFIC_GENERATION_UNOBSERVED','INGRESS_TRAFFIC_NOT_READY'].includes(safeFailureCode(error)))throw error;
        }
        if(attempt<29)await pause(2000);
      }
      assert.ok(serving,'INGRESS_DEPLOYED_REVISION_NOT_SERVING');
      diagnostic.routing.trafficWrites=1;diagnostic.routing.afterDigest=traffic.observationDigest;
      retainPostimage(postimage(fn,traffic,'OBSERVED_NOT_ACCEPTED',observed.v1Proof));
      diagnostic.stage='CLOSED_GRANT_POST_READ';retain();
      const closedGrantAfter=await requireClosedTrafficGrant({db,p,phase,retryReadback});
      assert.deepEqual(closedGrantAfter,closedGrantBefore,'INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED');
      diagnostic.routing.closedGrantAfter=closedGrantAfter;
    }
    assert.equal(traffic.targets[0].revision,fn.revision,'INGRESS_DEPLOYED_REVISION_NOT_SERVING');
    diagnostic.stage='COMPLETE';diagnostic.status='DEPLOYED_REVISION_SERVING_VERIFIED';retain();
    const report=postimage(fn,traffic,diagnostic.status,observed.v1Proof);retainPostimage(report);return report;
  }catch(error){diagnostic.status='HOLD';diagnostic.errorCode=safeFailureCode(error);retain();throw error;}
}
async function rollbackCreatedTrigger({db,auth,p,phase,snapshot,postimage,deleteFunction,restorePreviousRevision,observe,
  rollbackClosedDigest,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
  assert.equal(snapshot?.schema,'GI_I66_MAKE_TRIGGER_SNAPSHOT_V1');assert.equal(snapshot.phase,phase);
  assert.equal(snapshot.sourceSha,p.sourceSha);assert.equal(snapshot.artifactDigest,p.artifactDigest);
  if(snapshot.previousState!=='ABSENT'){
    if(phase==='live')return{status:'RESTORE_PREVIOUS_REVISION_BY_EXISTING_OWNER',functionDeletes:0};
    assert.ok(snapshot.function,'INGRESS_PREVIOUS_TRIGGER_SNAPSHOT_REQUIRED');
    // V1 snapshots remain readable. An old EXISTING_APPROVED snapshot without
    // observed traffic cannot authorize either a restore or an unchanged claim.
    const previousTraffic=validateTrafficProof(snapshot.traffic,snapshot.function,phase);
    const current=await deployedFunction(auth,p,phase,observe);
    assert.equal(current.service,snapshot.function.service,'INGRESS_PREVIEW_ROLLBACK_SERVICE_CHANGED');
    const currentTraffic=await deployedTraffic(auth,p,phase,current,observe);
    assert.equal(currentTraffic.serviceUid,previousTraffic.serviceUid,'INGRESS_TRAFFIC_SERVICE_RECREATED');
    if(c.digest(current)===c.digest(snapshot.function)){
      assert.deepEqual(currentTraffic,snapshot.traffic,'INGRESS_PREVIEW_TRAFFIC_PREIMAGE_CHANGED');
      return{status:'PREVIOUS_TRIGGER_UNCHANGED_NO_RESTORE_REQUIRED',functionDeletes:0,trafficWrites:0};
    }
    // A failed capture may have observed a new Functions revision while the
    // previously approved revision kept all traffic. Prove that routing from
    // fresh reads before requiring the postimage that the failed capture could
    // not finish. This claims no restoration of Functions metadata.
    if(c.digest(validateTrafficProof(currentTraffic,current,phase))===c.digest(previousTraffic)){
      sameTriggerConfiguration(snapshot.function,current);
      assert.ok(BigInt(currentTraffic.generation)>=BigInt(snapshot.traffic.generation),'INGRESS_TRAFFIC_GENERATION_REGRESSED');
      if(postimage){
        assert.equal(postimage.schema,'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1');
        assert.equal(postimage.phase,phase);assert.equal(postimage.sourceSha,p.sourceSha);assert.equal(postimage.artifactDigest,p.artifactDigest);
        assert.deepEqual(current,postimage.function,'INGRESS_TRIGGER_ROLLBACK_POSTIMAGE_CHANGED');
      }
      return{status:'EXACT_PREVIOUS_PREVIEW_REVISION_ALREADY_RESTORED',functionDeletes:0,trafficWrites:0,
        restoredRevision:previousTraffic.targets[0].revision,observedFunctionRevision:current.revision,
        functionMetadataRestored:false,trafficReadbackDigest:currentTraffic.observationDigest};
    }
    assert.equal(postimage?.schema,'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1','INGRESS_TRIGGER_POSTIMAGE_REQUIRED_FOR_RESTORE');
    assert.equal(postimage.phase,phase);assert.equal(postimage.sourceSha,p.sourceSha);assert.equal(postimage.artifactDigest,p.artifactDigest);
    assert.deepEqual(current,postimage.function,'INGRESS_TRIGGER_ROLLBACK_POSTIMAGE_CHANGED');
    validateTrafficProof(postimage.traffic,postimage.function,phase);
    assert.equal(currentTraffic.serviceUid,previousTraffic.serviceUid,'INGRESS_TRAFFIC_SERVICE_RECREATED');
    assert.deepEqual(currentTraffic,postimage.traffic,'INGRESS_PREVIEW_TRAFFIC_POSTIMAGE_CHANGED');
    const target={service:previousTraffic.service,region:scope.ADDED[phase].region,
      revision:previousTraffic.targets[0].revision,percent:100};
    const before=await routingObservation(auth,p,phase,current,observe,true);
    assert.deepEqual(before.traffic,currentTraffic,'INGRESS_PREVIEW_TRAFFIC_POSTIMAGE_CHANGED');
    assert.ok(typeof before.etag==='string'&&before.etag.length>0&&before.etag.length<=512&&
      !/[\x00-\x1f\x7f]/.test(before.etag),'INGRESS_TRAFFIC_CAS_ETAG_REQUIRED');
    if(postimage.trafficV1)assert.deepEqual(before.v1Proof,postimage.trafficV1,'INGRESS_TRAFFIC_V1_ROLLBACK_POSTIMAGE_CHANGED');
    const fresh=await routingObservation(auth,p,phase,current,observe,true);
    assert.deepEqual(fresh,before,'INGRESS_TRAFFIC_CAS_PREIMAGE_CHANGED');
    const request=trafficV1Request(fresh.v1,fresh.traffic,phase,target.revision);
    // The rollback coordinator passes only the digest it just verified or
    // produced through closeForRollback; no CLI/input digest override exists.
    const closedBefore=await requireClosedTrafficGrant({db,p,phase},rollbackClosedDigest);
    if(observe)observe({kind:'ROLLBACK_TRAFFIC_V1_PUT_ATTEMPTED',requestSha256:c.digest(request.data),
      resourceVersionSha256:fresh.v1Proof.resourceVersionSha256,templateSha256:fresh.v1Proof.templateSha256,
      targetRevision:target.revision,trafficWrites:null,closedGrantBefore:closedBefore});
    try{
      const response=restorePreviousRevision?await restorePreviousRevision(target,request):await auth.request(request);
      if(observe)observe({kind:'ROLLBACK_TRAFFIC_V1_PUT_RESPONSE',responseSha256:response?.data?c.digest(response.data):null});
      assert.ok(!response?.data?.error,'INGRESS_TRAFFIC_PATCH_PROVIDER_FAILED');
    }catch(error){
      const http=Number(error?.response?.status);
      if(observe)observe({kind:'ROLLBACK_TRAFFIC_V1_PUT_HOLD',httpStatus:Number.isInteger(http)?http:null,
        trafficWrites:[400,401,403,404,409,412].includes(http)?0:null,errorCode:safeFailureCode(error)});
      if([409,412].includes(http))throw Object.assign(Error('INGRESS_TRAFFIC_CAS_CONFLICT'),{code:'INGRESS_TRAFFIC_CAS_CONFLICT'});
      throw error;
    }
    let restored;
    for(let attempt=0;attempt<30;attempt++){
      try{
        const after=await routingObservation(auth,p,phase,current,observe,true);
        if(observe)observe({kind:'ROLLBACK_TRAFFIC_POSTIMAGE',traffic:after.traffic,trafficV1:after.v1Proof});
        assert.equal(after.traffic.serviceUid,before.traffic.serviceUid,'INGRESS_TRAFFIC_SERVICE_RECREATED');
        assert.equal(after.v1Proof.templateSha256,before.v1Proof.templateSha256,'INGRESS_TRAFFIC_V1_TEMPLATE_CHANGED');
        if(after.traffic.targets[0].revision===target.revision){
          assert.equal(BigInt(after.traffic.generation),BigInt(before.traffic.generation)+1n,'INGRESS_TRAFFIC_ROUTING_GENERATION_CHANGED');
          assert.deepEqual(validateTrafficProof(after.traffic,current,phase),previousTraffic,'INGRESS_PREVIEW_TRAFFIC_RESTORE_UNVERIFIED');
          restored=after;break;
        }
        assert.deepEqual(validateTrafficProof(after.traffic,current,phase),validateTrafficProof(before.traffic,current,phase),
          'INGRESS_TRAFFIC_ROUTING_TARGET_CHANGED');
      }catch(error){
        if(!['INGRESS_TRAFFIC_RECONCILING','INGRESS_TRAFFIC_GENERATION_UNOBSERVED','INGRESS_TRAFFIC_NOT_READY'].includes(safeFailureCode(error)))throw error;
      }
      if(attempt<29)await pause(2000);
    }
    assert.ok(restored,'INGRESS_PREVIEW_TRAFFIC_RESTORE_UNVERIFIED');
    const closedAfter=await requireClosedTrafficGrant({db,p,phase},rollbackClosedDigest);
    assert.deepEqual(closedAfter,closedBefore,'INGRESS_TRAFFIC_GRANT_PREIMAGE_CHANGED');
    return{status:'EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED',functionDeletes:0,trafficWrites:1,
      restoredRevision:target.revision,trafficReadbackDigest:restored.traffic.observationDigest,
      trafficV1:restored.v1Proof,closedGrantBefore:closedBefore,closedGrantAfter:closedAfter};
  }
  const current=await optionalFunction(auth,p,phase);
  if(current===null)return{status:'ABSENCE_READBACK_VERIFIED',functionDeletes:0};
  assert.equal(postimage?.schema,'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1','INGRESS_TRIGGER_POSTIMAGE_REQUIRED_FOR_DELETE');
  assert.equal(postimage.phase,phase);assert.equal(postimage.sourceSha,p.sourceSha);assert.equal(postimage.artifactDigest,p.artifactDigest);
  assert.deepEqual(current,postimage.function,'INGRESS_TRIGGER_ROLLBACK_POSTIMAGE_CHANGED');
  // Historical ABSENT snapshots still prove absence; no prior traffic is
  // inferred. Newly captured postimages also retain their observed routing.
  if(postimage.traffic)assert.deepEqual(await deployedTraffic(auth,p,phase,current),postimage.traffic,
    'INGRESS_PREVIEW_TRAFFIC_POSTIMAGE_CHANGED');
  // Cloud Functions DELETE has no revision/etag precondition. Serialize in the
  // existing workflow, compare the exact observed postimage immediately before
  // deletion, and require absence afterwards; never claim an atomic IAM CAS here.
  await deleteFunction(scope.ADDED[phase]);
  assert.equal(await optionalFunction(auth,p,phase),null,'INGRESS_TRIGGER_ROLLBACK_ABSENCE_UNVERIFIED');
  return{status:'EXACT_CREATED_FUNCTION_DELETED_ABSENCE_VERIFIED',functionDeletes:1};
}
async function proveCurrentDeployment(auth,p,phase,binding,read){
  const prior=readBoundJson(binding,read);assert.equal(prior.schema,'GI_I66_MAKE_CLOSED_DEPLOYMENT_RECEIPT_V1');
  assert.equal(prior.phase,phase);assert.equal(prior.sourceSha,p.sourceSha);assert.equal(prior.artifactDigest,p.artifactDigest);
  const actual=await deployedFunction(auth,p,phase);assert.deepEqual(actual,prior.function,'INGRESS_CONFIG_DEPLOYMENT_REVISION_CHANGED');
  validateProjectIamReadback(prior.projectIamReadback);
  return{...actual,...await deployedRules(auth,p),projectIamReadback:prior.projectIamReadback};
}
function validateProjectIamReadback(proof){
  assert.equal(proof?.status,'PROJECT_IAM_UNCHANGED_AND_CLI_WRITES_FORBIDDEN');
  assert.equal(proof.projectIamWrites,0);assert.equal(proof.cliVersion,'14.10.1');
  assert.equal(proof.beforeDigest,proof.afterDigest);assert.ok(sha64(proof.beforeDigest));return proof;
}
async function verifyProjectIamUnchanged(auth,before){
  assert.equal(before?.status,'EVENTARC_RUNTIME_AND_PROJECT_IAM_READY','INGRESS_EVENTARC_BEFORE_PROOF_REQUIRED');
  assert.equal(before.projectIamWrites,0);assert.ok(sha64(before.projectPolicyDigest));
  const r=await auth.request({url:`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`,
    method:'POST',data:{options:{requestedPolicyVersion:3}}});
  const afterDigest=access.policyDigest(r.data);
  assert.equal(afterDigest,before.projectPolicyDigest,'INGRESS_PROJECT_IAM_CHANGED_DURING_DEPLOY');
  return validateProjectIamReadback({status:'PROJECT_IAM_UNCHANGED_AND_CLI_WRITES_FORBIDDEN',cliVersion:'14.10.1',
    beforeDigest:before.projectPolicyDigest,afterDigest,projectIamWrites:0});
}
function configAuthority(p,phase,fn,receiptBlobSha){return{scopeContractBlob:scope.CONTRACT_BLOB,receiptBlobSha,sourceSha:p.sourceSha,
  phase,functionName:fn.name,region:fn.region,functionRevision:fn.revision,authContextEventType:fn.eventType,
  runtimeIdentityVerified:fn.runtimePrincipal===p.makeIngress.runtimeAccess.principal,queueRulesDenyClient:fn.queueRulesDenyClient===true,
  sourceAndArtifactVerified:true};}
async function verifyProbeReadback({db,p,phase,fn,op,makeExecution}){
  const preview=phase==='preview',gs=await support.grantRef(db,preview).get();assert.ok(gs.exists);
  const grant=gs.data();assert.equal(c.digest(grant),op.expectedConfigDigest,'INGRESS_PROBE_CONFIG_PREIMAGE_CHANGED');
  const id=op.probeRequestId;assert.match(String(id||''),/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/);
  const [qs,rs]=await Promise.all([db.doc(`${ROOT}/${preview?c.PREVIEW_QUEUE:c.QUEUE}/${id}`).get(),db.doc(`${ROOT}/${preview?'previewLeadIngressResults':'leadIngressResults'}/${id}`).get()]);
  assert.ok(qs.exists&&rs.exists,'INGRESS_PROBE_QUEUE_AND_RESULT_REQUIRED');const proof=rs.data();
  config.verifyProbe(grant,proof,qs.data(),id,makeExecution,preview);
  return{...fn,closedConfigurationVerified:true,probeOnly:true,realAuthContextObserved:true,
    principalProbeDigest:proof.proofDigest,principalSha256:proof.principalSha256,authType:proof.authType,
    canonicalLeadWrites:0,canonicalAuditWrites:0,notificationsCreated:0,externalMessagesSent:0,providerRequests:0};
}
async function runtimeServices(sourceClient,principal,requireFrom){
  const {GoogleAuth,Impersonated}=requireFrom('google-auth-library'),{SecretManagerServiceClient}=requireFrom('@google-cloud/secret-manager');
  const runtime=new Impersonated({sourceClient,targetPrincipal:principal,delegates:[],targetScopes:['https://www.googleapis.com/auth/cloud-platform'],lifetime:600});
  await runtime.getAccessToken();
  const secret=()=>new SecretManagerServiceClient({projectId:PROJECT,auth:new GoogleAuth({authClient:runtime,projectId:PROJECT})});
  const capabilities=async()=>{
    const r=await runtime.request({url:`https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:testIamPermissions`,method:'POST',data:{permissions:[...access.REQUIRED_FIRESTORE_PERMISSIONS]}});
    return access.REQUIRED_FIRESTORE_PERMISSIONS.every(v=>r.data?.permissions?.includes(v));
  };
  const readSecret=async()=>{const client=secret();try{const[v]=await client.accessSecretVersion({name:access.SECRET+'/versions/1'});
    assert.ok(v?.payload?.data&&v.payload.data.length<=8000);return JSON.parse(Buffer.from(v.payload.data).toString('utf8'));}finally{await client.close();}};
  return{runtime,secret,capabilities,readSecret};
}
async function beforeDeploy({db,auth,p,phase,requireFrom,privateFile,authorityBlob,retryReadback}){
  const grant=await support.grantRef(db,phase==='preview').get(),expected=closedPreimageDigest(p,phase,retryReadback);
  assert.equal(grant.exists?c.digest(grant.data()):'ABSENT',expected,'INGRESS_PREDEPLOY_CONFIG_PREIMAGE_CHANGED');
  if(grant.exists)assert.ok(grant.data().state==='CLOSED'&&grant.data().enabled===false,'INGRESS_PREDEPLOY_MUST_BE_CLOSED');
  const services=await runtimeServices(auth,p.makeIngress.runtimeAccess.principal,requireFrom);
  assert.equal(await services.capabilities(),true,'INGRESS_RUNTIME_FIRESTORE_CAPABILITIES_CHANGED');
  const readiness=await access.eventarcPreflight({sourceClient:auth,runtimeClientFor:async principal=>{
    assert.equal(principal,p.makeIngress.runtimeAccess.principal);return services.runtime;}});
  assert.equal(readiness.status,'EVENTARC_RUNTIME_AND_PROJECT_IAM_READY','INGRESS_EVENTARC_AND_PROJECT_IAM_PREFLIGHT_HOLD');
  assert.deepEqual({sourcePath:readiness.queueRules?.sourcePath,sourceBlob:readiness.queueRules?.sourceBlob},
    p.makeIngress.queueRules,'INGRESS_APPROVED_QUEUE_RULESET_PREIMAGE_CHANGED');
  // Preview uses a server-approved synthetic packet and requires no Secret grant.
  if(phase==='preview')return{status:'PREVIEW_RUNTIME_VERIFIED_NO_SECRET_IAM_NEEDED',iamWrites:0,eventarcReadiness:readiness};
  const {SecretManagerServiceClient}=requireFrom('@google-cloud/secret-manager'),client=new SecretManagerServiceClient();
  try{
    const [policy]=await client.getIamPolicy({resource:access.SECRET,options:{requestedPolicyVersion:3}});
    const plan=access.exactGrantPlan(policy,p.makeIngress.runtimeAccess.principal,{scopeContractBlob:scope.CONTRACT_BLOB,
      secretResource:access.SECRET,role:access.ROLE,principal:p.makeIngress.runtimeAccess.principal,
      firestoreCapabilitiesVerified:true,sourceSha:p.sourceSha,receiptBlobSha:authorityBlob});
    fs.writeFileSync(privateFile,JSON.stringify({plan}),{mode:0o600});
    const receipt=await access.grantExact({client,plan,verifyRuntimeCapabilities:services.capabilities,verifyRuntimeAccess:async()=>{
      const value=await services.readSecret();return value.tenantId===c.TENANT&&value.pais===c.COUNTRY&&value.idInstance===c.INSTANCE;
    }});
    fs.writeFileSync(privateFile,JSON.stringify({plan,receipt}),{mode:0o600});return{...receipt,eventarcReadiness:readiness};
  }catch(error){if(error.ingressIamOutcome?.rollbackReceipt){const before=JSON.parse(fs.readFileSync(privateFile));
    fs.writeFileSync(privateFile,JSON.stringify({...before,receipt:error.ingressIamOutcome.rollbackReceipt}),{mode:0o600});}throw error;}
  finally{await client.close();}
}
async function closeForRollback({db,p,phase,deployment,expectedDigest,authorityBlob}){
  if(!deployment)return{status:'NO_CONFIGURATION_TRANSITION_RECORDED',configurationWrites:0};
  assert.equal(deployment.sourceSha,p.sourceSha);assert.equal(deployment.artifactDigest,p.artifactDigest);assert.equal(deployment.phase,phase);
  const gs=await support.grantRef(db,phase==='preview').get();assert.ok(gs.exists,'INGRESS_ROLLBACK_CONFIG_MISSING');
  assert.equal(c.digest(gs.data()),expectedDigest,'INGRESS_ROLLBACK_CONFIG_POSTIMAGE_CHANGED');
  if(gs.data().state==='CLOSED'&&gs.data().enabled===false)return{status:'CLOSED_CONFIG_READBACK_VERIFIED',configurationWrites:0,afterDigest:expectedDigest};
  const fn={...deployment.function,...deployment.rules};
  return config.transition({db,action:'CLOSE',previewOnly:phase==='preview',expectedDigest,
    authority:configAuthority(p,phase,fn,authorityBlob)});
}
async function initializeClosed({db,auth,p,phase,authorityBlob,eventarcBefore,retryReadback,nowMs=Date.now()}){
  const projectIamReadback=await verifyProjectIamUnchanged(auth,eventarcBefore);
  const fn=await deployedFunction(auth,p,phase),rules=await deployedRules(auth,p),spec=p.makeIngress.closedConfiguration?.[phase];
  assert.ok(spec&&(spec.expectedDigest==='ABSENT'||sha64(spec.expectedDigest))&&sha64(spec.nonce),'INGRESS_CLOSED_CONFIG_AUTHORITY_REQUIRED');
  const expectedDigest=closedPreimageDigest(p,phase,retryReadback);
  const result=await config.transition({db,action:expectedDigest==='ABSENT'?'INITIALIZE_CLOSED':'PREPARE_CLOSED',previewOnly:phase==='preview',
    expectedDigest,authority:configAuthority(p,phase,{...fn,...rules},authorityBlob),nonce:spec.nonce,nowMs});
  return{schema:'GI_I66_MAKE_CLOSED_DEPLOYMENT_RECEIPT_V1',status:'CLOSED_PENDING_AUTH_CONTEXT_PROBE',phase,
    sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,authorityBlob,function:fn,rules,projectIamReadback,config:result,
    canonicalLeadWrites:0,externalMessagesSent:0,a13RealLeadAccepted:false};
}
const dataRef=(db,coll,id)=>db.doc(`${ROOT}/data/${coll}/items/${id}`);
const auditRef=(db,coll,id)=>db.doc(`${ROOT}/${coll}/${id}`);
function proofContext(row,packet,grant,preview,nowMs){
  const proof=c.providerProof(packet,row,grant,nowMs,preview);
  const identityKey=c.digest({tenantId:c.TENANT,provider:'greenapi',instanceId:c.INSTANCE,phone:proof.phone,sourceId:proof.sourceId});
  const messageKey=c.digest({tenantId:c.TENANT,provider:'greenapi',instanceId:c.INSTANCE,messageId:proof.messageId}),prefix=preview?'b4003qa_':'';
  // This is a readback context, not a fabricated authenticated event. Actual
  // AuthContext is proven by the trigger result and the bound server grant.
  return{proof,identityKey,messageKey,businessId:prefix+'neg_make_'+identityKey.slice(0,24),workflowRequestId:prefix+'wf_make_'+messageKey.slice(0,28),
    previewOnly:preview,actor:{uid:'integration:'+c.INTEGRATION,transportPrincipalSha256:grant.principalSha256}};
}
function canonicalRefs(db,ctx,result){return[
  dataRef(db,'negocios',ctx.businessId),support.messageRef(db,ctx),
  auditRef(db,ctx.previewOnly?'previewWorkflowRequests':'workflowRequests',ctx.workflowRequestId),
  auditRef(db,ctx.previewOnly?'previewWorkflowEvents':'workflowEvents',result.eventId),
  auditRef(db,ctx.previewOnly?'previewNotificationOutbox':'notificationOutbox',result.eventId)];}
async function snapshotRefs(refs){const rows=await Promise.all(refs.map(async ref=>{const snap=await ref.get();return{path:ref.path,exists:snap.exists,
  digest:snap.exists?c.digest(snap.data()):null};}));return{rows,digest:c.digest(rows)};}
async function readResult({db,p,phase,binding,grant,read,packetFor,nowMs}){
  const execution=verifyMakeExecution(binding,read),preview=phase==='preview',prefix=`projects/${PROJECT}/databases/(default)/documents/`;
  const queuePath=execution.documentName.slice(prefix.length);assert.ok(queuePath.startsWith(`${ROOT}/${preview?c.PREVIEW_QUEUE:c.QUEUE}/`));
  const requestId=queuePath.split('/').at(-1),[qs,rs]=await Promise.all([db.doc(queuePath).get(),auditRef(db,preview?'previewLeadIngressResults':'leadIngressResults',requestId).get()]);
  assert.ok(qs.exists&&rs.exists,'INGRESS_SIGNED_QUEUE_RESULT_REQUIRED');const row=qs.data(),result=rs.data();
  assert.equal(result.schema,'GI_I66_MAKE_LEAD_INGRESS_RESULT_V1');assert.equal(result.phase,phase);assert.equal(result.requestId,requestId);
  assert.equal(result.envelopeDigest,c.digest(row));assert.equal(result.transportPrincipalSha256,grant.principalSha256);
  assert.equal(result.authType,grant.authType);assert.equal(result.externalMessagesSent,0);
  assert.ok(typeof qs.createTime?.toMillis==='function','INGRESS_QUEUE_AUTHENTIC_CREATE_TIME_REQUIRED');
  return{execution,row,result,packetFor:()=>packetFor(row),requestId,queueCreateTimeMs:qs.createTime.toMillis()};
}
async function inspectCanonical({db,phase,item,grant,packet,nowMs}){
  const ctx=proofContext(item.row,packet,grant,phase==='preview',nowMs),result={...item.result,
    eventId:item.result.eventId,requestId:ctx.workflowRequestId,entityId:ctx.businessId};
  assert.equal(item.result.entityId,ctx.businessId);assert.equal(item.result.workflowRequestId,ctx.workflowRequestId);
  assert.equal(item.result.canonicalCommitState,'COMMITTED_VERIFIED');
  const back=await support.readback({db,ctx,result,dataRef:(_t,coll,id)=>dataRef(db,coll,id),
    requestRef:(_t,id,preview)=>auditRef(db,preview?'previewWorkflowRequests':'workflowRequests',id),
    eventRef:(_t,id,preview)=>auditRef(db,preview?'previewWorkflowEvents':'workflowEvents',id),
    outboxRef:(_t,id,preview)=>auditRef(db,preview?'previewNotificationOutbox':'notificationOutbox',id)});
  assert.equal(back.canonicalReadback,true);assert.equal(back.internalNoticeVerified,true);
  const refs=canonicalRefs(db,ctx,result),snapshot=await snapshotRefs(refs);assert.ok(snapshot.rows.every(r=>r.exists));
  return{ctx,result,back,refs,snapshot};
}
async function captureOrVerify({db,auth,p,phase,op,authority,fn,read,requireFrom,nowMs,committed}){
  const preview=phase==='preview',gs=await support.grantRef(db,preview).get();assert.ok(gs.exists);
  const grant=gs.data();assert.equal(c.digest(grant),op.expectedConfigDigest,'INGRESS_CONFIG_CHANGED_DURING_PROOF');
  assert.equal(grant.state,'ACTIVE');assert.equal(grant.enabled,true);
  assert.equal(grant.authority?.sourceSha,p.sourceSha,'INGRESS_READBACK_GRANT_SOURCE_CHANGED');
  assert.equal(grant.deployedFunction?.revision,fn.revision,'INGRESS_READBACK_GRANT_REVISION_CHANGED');
  if(!preview)assert.equal(committed,true,'INGRESS_REAL_PROOF_REQUIRES_COMMITTED_RELEASE');
  const services=preview?null:await runtimeServices(auth,p.makeIngress.runtimeAccess.principal,requireFrom);
  const packetFor=preview?async()=>grant.qaFixture.packet:async row=>{
    const bridge=requireFrom('./make-lead-ingress-bridge.js').__makeLeadIngress;
    return bridge.getSourcePacket(row,{readSecret:services.readSecret});};
  const create=await readResult({db,p,phase,binding:op.createExecutionReceipt,grant,read,packetFor,nowMs});
  assert.equal(create.result.status,'APPLIED_VERIFIED');assert.equal(create.result.canonicalLeadWrites,1);assert.equal(create.result.canonicalAuditWrites,4);
  const checked=await inspectCanonical({db,phase,item:create,grant,packet:await create.packetFor(),nowMs});
  assert.equal(checked.back.assignment,'pending_operations');
  const snapshotId=c.sha(p.sourceSha+'|'+p.artifactDigest+'|'+checked.ctx.messageKey),snapshotRef=auditRef(db,preview?'previewLeadIngressQaEvidence':'leadIngressQaEvidence',snapshotId);
  if(op.action==='CAPTURE_AFTER_CREATE'){
    const body={schema:'GI_I66_MAKE_LEAD_AFTER_CREATE_SNAPSHOT_V1',sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
      phase,grantDigest:op.expectedConfigDigest,createExecutionReceiptBlob:op.createExecutionReceipt.gitBlobSha,
      requestId:create.requestId,messageKey:checked.ctx.messageKey,identityKey:checked.ctx.identityKey,
      canonicalSnapshot:checked.snapshot,canonicalLeadWrites:1,canonicalAuditWrites:4,externalMessagesSent:0};
    await db.runTransaction(async tx=>{const old=await tx.get(snapshotRef);if(old.exists)assert.deepEqual(old.data(),body,'INGRESS_AFTER_CREATE_SNAPSHOT_ALREADY_DIFFERENT');else tx.create(snapshotRef,body);});
    return{schema:body.schema,status:'CANONICAL_CREATE_READBACK_CAPTURED',sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
      snapshotId,snapshotDigest:c.digest(body),canonicalSnapshotDigest:checked.snapshot.digest,canonicalLeadWrites:1,canonicalAuditWrites:4,
      operationalWritesByVerifier:0,externalMessagesSent:0};
  }
  assert.equal(op.action,preview?'VERIFY_PREVIEW':'VERIFY_REAL');
  const stored=await snapshotRef.get();assert.ok(stored.exists,'INGRESS_BEFORE_REPLAY_SNAPSHOT_REQUIRED');const before=stored.data();
  assert.ok(typeof stored.createTime?.toMillis==='function','INGRESS_AFTER_CREATE_SNAPSHOT_TIME_REQUIRED');
  const snapshotTime=stored.createTime.toMillis();assert.ok(create.queueCreateTimeMs<=snapshotTime,'INGRESS_AFTER_CREATE_SNAPSHOT_TIME_DRIFT');
  assert.equal(before.sourceSha,p.sourceSha);assert.equal(before.artifactDigest,p.artifactDigest);assert.equal(before.grantDigest,op.expectedConfigDigest);
  assert.equal(before.createExecutionReceiptBlob,op.createExecutionReceipt.gitBlobSha);
  assert.deepEqual(checked.snapshot,before.canonicalSnapshot,'INGRESS_CANONICAL_CHANGED_AFTER_CREATE');
  const replay=await readResult({db,p,phase,binding:op.replayExecutionReceipt,grant,read,packetFor,nowMs});
  assert.notEqual(replay.requestId,create.requestId);assert.deepEqual(replay.row,create.row);assert.equal(replay.result.status,'REPLAY_VERIFIED');
  assert.ok(replay.queueCreateTimeMs>snapshotTime,'INGRESS_REPLAY_MUST_FOLLOW_CANONICAL_SNAPSHOT');
  assert.equal(replay.result.canonicalLeadWrites,0);assert.equal(replay.result.canonicalAuditWrites,0);
  const again=await inspectCanonical({db,phase,item:replay,grant,packet:await replay.packetFor(),nowMs});
  assert.deepEqual(again.snapshot,before.canonicalSnapshot,'INGRESS_REPLAY_CHANGED_CANONICAL_POSTIMAGE');
  let restoredConfiguration;
  if(preview){
    const reject=await readResult({db,p,phase,binding:op.rejectExecutionReceipt,grant,read,packetFor,nowMs});
    assert.notEqual(reject.requestId,create.requestId);assert.notEqual(reject.requestId,replay.requestId);
    assert.ok(reject.queueCreateTimeMs>snapshotTime,'INGRESS_REJECT_MUST_FOLLOW_CANONICAL_SNAPSHOT');
    assert.equal(reject.result.status,'HOLD');assert.equal(reject.result.canonicalCommitState,'NOT_ATTEMPTED');
    assert.equal(reject.result.canonicalLeadWrites,0);assert.equal(reject.result.canonicalAuditWrites,0);
    assert.equal(reject.result.code,'INGRESS_PREVIEW_NONCE_MISMATCH');
    assert.deepEqual({...reject.row,qaNonce:create.row.qaNonce},create.row,'INGRESS_REJECTION_MUST_BE_EXACT_WRONG_NONCE_ONLY');
    assert.notEqual(reject.row.qaNonce,create.row.qaNonce);
    assert.deepEqual(await snapshotRefs(checked.refs),before.canonicalSnapshot,'INGRESS_REJECT_CHANGED_CANONICAL_POSTIMAGE');
    restoredConfiguration=await config.transition({db,action:'CLOSE',previewOnly:true,expectedDigest:op.expectedConfigDigest,authority,nowMs});
    await db.runTransaction(async tx=>{const rows=await Promise.all(checked.refs.map(ref=>tx.get(ref)));
      const now={rows:rows.map((s,i)=>({path:checked.refs[i].path,exists:s.exists,digest:s.exists?c.digest(s.data()):null}))};
      assert.deepEqual(now.rows,before.canonicalSnapshot.rows,'INGRESS_SYNTHETIC_RESTORE_CAS_CHANGED');
      assert.ok(checked.ctx.businessId.startsWith('b4003qa_neg_make_'));
      for(const ref of checked.refs)tx.delete(ref);});
    assert.ok((await snapshotRefs(checked.refs)).rows.every(r=>!r.exists),'INGRESS_SYNTHETIC_RESTORE_READBACK_HOLD');
  }
  const result={schema:preview?'GI_I66_MAKE_LEAD_INGRESS_PREVIEW_PROOF_V1':'GI_I66_MAKE_LEAD_INGRESS_REAL_PROOF_V1',
    status:'PASS',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,authenticatedMakeQueue:true,
    providerFixtureIsSynthetic:preview,pendingOperationsCanonicalLead:true,canonicalReadback:true,sameImmutableArtifact:true,
    createdCanonicalLeads:1,replayCanonicalWrites:0,rejectCanonicalWrites:preview?0:null,externalMessagesSent:0,
    noOtherOperationalMutations:true,operationalSnapshotScope:'CANONICAL_LEAD_AND_FOUR_RELATED_AUDIT_DOCUMENTS',
    syntheticRestoreComplete:preview,realLeadAccepted:!preview,canonicalSnapshotDigest:checked.snapshot.digest,
    ...(restoredConfiguration?{afterDigest:restoredConfiguration.afterDigest,configurationWrites:restoredConfiguration.configurationWrites,
      syntheticDocumentsRestored:checked.refs.length}:{}),
    createExecutionReceiptBlob:op.createExecutionReceipt.gitBlobSha,replayExecutionReceiptBlob:op.replayExecutionReceipt.gitBlobSha,
    ...(preview?{rejectExecutionReceiptBlob:op.rejectExecutionReceipt.gitBlobSha}:{}),
    closedTrigger:readBoundJson(op.closedTriggerProof,read).closedTrigger};
  if(preview)scope.validateTrigger(p,'preview',result.closedTrigger);
  return result;
}
async function operate({db,auth,p,phase,op,authorityBlob,read=fs.readFileSync,requireFrom,nowMs=Date.now(),committed=false,deployment}){
  requireOperation(op,p,phase,nowMs);
  let fn;
  if(deployment){
    assert.equal(deployment.schema,'GI_I66_MAKE_CLOSED_DEPLOYMENT_RECEIPT_V1');assert.equal(deployment.phase,phase);
    assert.equal(deployment.sourceSha,p.sourceSha);assert.equal(deployment.artifactDigest,p.artifactDigest);
    const actual=await deployedFunction(auth,p,phase);assert.deepEqual(actual,deployment.function,'INGRESS_CONFIG_DEPLOYMENT_REVISION_CHANGED');
    validateProjectIamReadback(deployment.projectIamReadback);
    fn={...actual,...await deployedRules(auth,p),projectIamReadback:deployment.projectIamReadback};
  }else fn=await proveCurrentDeployment(auth,p,phase,op.deploymentReceipt,read);
  const authority=configAuthority(p,phase,fn,authorityBlob);
  const base={db,action:op.action,previewOnly:phase==='preview',expectedDigest:op.expectedConfigDigest,authority,nowMs};
  if(op.action==='BIND_PRINCIPAL'||op.action==='VERIFY_PROBE'){
    const makeExecution=verifyMakeExecution(op.makeExecutionReceipt,read);
    const closedTrigger=await verifyProbeReadback({db,p,phase,fn,op,makeExecution});
    if(op.action==='VERIFY_PROBE')return{schema:'GI_I66_MAKE_CLOSED_TRIGGER_PROOF_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
      closedTrigger,canonicalLeadWrites:0,externalMessagesSent:0};
    return config.transition({...base,probeRequestId:op.probeRequestId,makeExecution});
  }
  if(op.action==='CLOSE')return config.transition(base);
  if(['CAPTURE_AFTER_CREATE','VERIFY_PREVIEW','VERIFY_REAL'].includes(op.action))
    return captureOrVerify({db,auth,p,phase,op,authority,fn,read,requireFrom,nowMs,committed});
  if(op.action==='ACTIVATE'){
    if(phase==='preview')return config.transition({...base,qaFixture:op.qaFixture});
    assert.equal(committed,true,'INGRESS_REAL_ACTIVATION_REQUIRES_COMMITTED_RELEASE');
    assert.ok(sha64(op.previewProof?.sha256),'INGRESS_PREVIEW_REPORT_DIGEST_REQUIRED');
    const previewProof={...readBoundJson(op.previewProof,read),reportBlobSha:op.previewProof.gitBlobSha,reportSha256:op.previewProof.sha256};
    scope.validatePreviewProof(p,previewProof);
    const services=await runtimeServices(auth,p.makeIngress.runtimeAccess.principal,requireFrom);
    const secret=await services.readSecret(),provider=require('./gravicentra-i66-greenapi-existing-config-readonly.cjs');
    const inspection=provider.inspectSecret(secret).report;
    const readiness=await provider.probeProviderReadiness(secret,{runtimeReader:async()=>services.readSecret()});
    return config.transition({...base,previewProof:{...previewProof,artifactSha256:p.artifactDigest.slice(7)},
      providerReadiness:{secretVersionAccessible:true,...inspection,...readiness}});
  }
  throw Object.assign(Error('INGRESS_OPERATION_NEEDS_READBACK_OWNER'),{code:'INGRESS_OPERATION_NEEDS_READBACK_OWNER'});
}
function nativeExecution(p,env=process.env){
  assert.ok(p?.executionProvider===undefined||p.executionProvider==='CLOUD_BUILD','INGRESS_EXECUTION_PROVIDER_UNKNOWN');
  const selected=env.GRAVICENTRA_BUILD_PROVIDER;
  assert.ok(selected===undefined||selected===''||selected==='CLOUD_BUILD','INGRESS_EXECUTION_PROVIDER_UNKNOWN');
  const native=p.executionProvider==='CLOUD_BUILD';
  assert.equal(native,selected==='CLOUD_BUILD','INGRESS_EXECUTION_PROVIDER_MISMATCH');
  if(native)for(const key of Object.keys(env))if(key.startsWith('GITHUB_'))
    assert.ok(!env[key],'INGRESS_NATIVE_GITHUB_CONTEXT_FORBIDDEN');
  return native;
}
async function verifyExecutionRuntime(p,{phase,action,env=process.env,cwd=process.cwd(),verifyNative,verifyOwners=g.verifyPinnedOwners}={}){
  if(!nativeExecution(p,env)){
    assert.equal(env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');
    assert.equal(env.GITHUB_REF_NAME,'recovery/fase-a-clean-20260831');
    return null;
  }
  // The operational provider owner verifies real Build UUID/config/plan,
  // authority head and SDK runtime identity before any SDK/provider operation.
  // Its exact closed QA allowlist keeps frozen product source separate from
  // mechanism-only credential changes; it does not widen product pins.
  assert.equal(typeof verifyOwners,'function','INGRESS_NATIVE_PIN_OWNER_REQUIRED');
  verifyOwners(p,{head:'HEAD',cwd});
  const verify=verifyNative||require('./gravicentra-i6-6-cloud-build-operational.cjs').verifyRuntimeAuthority;
  return await verify(p,{phase,action});
}
function refreshAuthority(p,{env=process.env,cwd=process.cwd(),exec=execFileSync,verifyOwners=g.verifyPinnedOwners}={}){
  const native=nativeExecution(p,env),remote='https://github.com/paulaosoriof86/orbit360-core.git',branch='recovery/fase-a-clean-20260831';
  let args=['fetch','--no-tags',remote,branch];
  if(!native){
    const token=env.GH_TOKEN;assert.ok(token,'INGRESS_GITHUB_READ_CREDENTIAL_REQUIRED');
    // Preserve the existing authenticated GitHub path; the native runtime
    // reads this same public repository without any borrowed GitHub identity.
    const header='Authorization: basic '+Buffer.from('x-access-token:'+token).toString('base64');
    args=['-c','http.https://github.com/.extraheader='+header,...args];
  }
  exec('git',args,{cwd,stdio:'pipe',timeout:30000});
  const head=exec('git',['rev-parse','FETCH_HEAD'],{cwd,encoding:'utf8'}).trim();
  exec('git',['merge-base','--is-ancestor',p.sourceSha,head],{cwd,stdio:'pipe'});
  if(native){assert.equal(typeof verifyOwners,'function','INGRESS_NATIVE_PIN_OWNER_REQUIRED');verifyOwners(p,{head,cwd});}
  else assert.equal(exec('git',['diff','--name-only',p.sourceSha,head,'--',...g.PINNED_OWNER_PATHS],{cwd,encoding:'utf8'}).trim(),'',
    'INGRESS_SOURCE_OR_QA_CHANGED_DURING_CONFIGURATION');
  const read=file=>exec('git',['show',head+':'+file],{cwd});
  return{head,read,control:JSON.parse(read(g.CONTROL)),authorityBlob:gitBlob(read(g.CONTROL))};
}
async function waitConfiguration({db,auth,p,phase,requireFrom,stopAtProbe=false,deadlineMs=Date.now()+20*60*1000}){
  const deployment=JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-initialize-closed.json`)));
  const progressFile=path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-last-operation.json`);
  let lastVersion=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile)).version:0;
  console.log('I66_MAKE_WAITING_FOR_EXISTING_SCENARIO_AUTHENTICATED_PROBE phase='+phase+' configDigest='+deployment.config.afterDigest);
  while(Date.now()<deadlineMs){
    const current=refreshAuthority(p),op=current.control.makeIngressProtectedOperation;
    assert.deepEqual(resolveCandidate(current.control,phase,true),p,'INGRESS_CANDIDATE_CHANGED_DURING_CONFIGURATION');
    if(op?.phase===phase&&op.sourceSha===p.sourceSha&&Number.isSafeInteger(op.version)&&op.version>lastVersion){
      const result=await operate({db,auth,p,phase,op,authorityBlob:current.authorityBlob,read:current.read,requireFrom,deployment});
      lastVersion=op.version;
      const previous=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile)):{};
      fs.writeFileSync(progressFile,JSON.stringify({version:lastVersion,authorityBlob:current.authorityBlob,
        afterDigest:result.afterDigest||previous.afterDigest||deployment.config.afterDigest}));
      const file=path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-operation-${op.version}.json`);
      fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
      console.log('I66_MAKE_CONFIGURATION_READBACK='+JSON.stringify({version:op.version,action:op.action,
        status:result.status||result.state,afterDigest:result.afterDigest||null,snapshotId:result.snapshotId||null,
        reportBlobSha:gitBlob(fs.readFileSync(file)),reportSha256:sha256(fs.readFileSync(file)),canonicalLeadWrites:result.canonicalLeadWrites||0,
        canonicalAuditWrites:result.canonicalAuditWrites||0,externalMessagesSent:0}));
      if(op.action==='VERIFY_PROBE'){
        fs.writeFileSync(path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-closed-trigger.json`),JSON.stringify(result,null,2)+'\n');
        if(phase==='live'||stopAtProbe)return result;
      }
      if(op.action==='VERIFY_PREVIEW'&&phase==='preview'){
        const proof={...result,reportBlobSha:gitBlob(fs.readFileSync(file)),reportSha256:sha256(fs.readFileSync(file))};
        scope.validatePreviewProof(p,proof);
        fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'gi-make-preview-proof.json'),JSON.stringify(proof,null,2)+'\n');return proof;
      }
    }
    await new Promise(resolve=>setTimeout(resolve,15000));
  }
  throw Object.assign(Error('INGRESS_CONFIGURATION_PROOF_PENDING'),{code:'INGRESS_CONFIGURATION_PROOF_PENDING'});
}
async function rollback({db,auth,p,phase,requireFrom,authorityBlob,retryReadback,directory=process.env.RUNNER_TEMP,deleteFunction,restorePreviousRevision}){
  const readOptional=name=>{const file=path.join(directory,name);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;};
  const deployment=readOptional(`gi-make-${phase}-initialize-closed.json`),progress=readOptional(`gi-make-${phase}-last-operation.json`);
  const report={schema:'GI_I66_MAKE_RELEASE_COMPENSATION_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    status:'HOLD',configuration:null,trigger:null,secretIam:null,canonicalLeadWrites:0,externalMessagesSent:0,failures:[]};
  const retain=()=>fs.writeFileSync(path.join(directory,`gi-make-${phase}-rollback.json`),JSON.stringify(report,null,2)+'\n');
  const observe=entry=>{(report.triggerObservations||=([])).push(entry);retain();};
  const failed=(label,error)=>{report.failures.push(label);(report.failureCodes||={})[label]=safeFailureCode(error);retain();};
  retain();
  try{report.configuration=await closeForRollback({db,p,phase,deployment,
    expectedDigest:progress?.afterDigest||deployment?.config?.afterDigest,authorityBlob});}
  catch(error){failed('CONFIGURATION_CLOSE_UNVERIFIED',error);}
  // Do not remove the endpoint or its permission while a known active grant
  // could be left behind. Both LIVE and Preview begin with CLOSED/absent grants.
  if(!report.failures.length){
    const snapshot=readOptional(`gi-make-${phase}-snapshot-trigger.json`),postimage=readOptional(`gi-make-${phase}-capture-trigger.json`);
    try{report.trigger=snapshot?await rollbackCreatedTrigger({db,auth,p,phase,snapshot,postimage,deleteFunction,restorePreviousRevision,observe,
      rollbackClosedDigest:report.configuration?.afterDigest||closedPreimageDigest(p,phase,retryReadback)}):
      {status:'NO_TRIGGER_MUTATION_STARTED',functionDeletes:0};}catch(error){failed('TRIGGER_ROLLBACK_UNVERIFIED',error);}
    if(phase==='live'){
      const saved=readOptional('gi-make-secret-iam-private.json');
      try{
        if(!saved)report.secretIam={status:'NO_IAM_TRANSITION_STARTED',iamWrites:0};
        else if(!saved.receipt){
          const {SecretManagerServiceClient}=requireFrom('@google-cloud/secret-manager'),client=new SecretManagerServiceClient();
          try{const[actual]=await client.getIamPolicy({resource:access.SECRET,options:{requestedPolicyVersion:3}});
            assert.equal(access.policyDigest(actual),saved.plan.beforeDigest,'INGRESS_IAM_UNKNOWN_COMMIT_REQUIRES_RECONCILIATION');
            report.secretIam={status:'PRIOR_IAM_PREIMAGE_UNCHANGED',iamWrites:0};}finally{await client.close();}
        }else{
          const {SecretManagerServiceClient}=requireFrom('@google-cloud/secret-manager'),client=new SecretManagerServiceClient();
          try{report.secretIam=await access.rollbackExact({client,plan:saved.plan,receipt:saved.receipt});}finally{await client.close();}
        }
      }catch(error){failed('EXACT_SECRET_IAM_ROLLBACK_UNVERIFIED',error);}
    }
  }
  report.status=report.failures.length?'HOLD':'COMPENSATION_READBACK_VERIFIED';
  fs.writeFileSync(path.join(directory,`gi-make-${phase}-rollback.json`),JSON.stringify(report,null,2)+'\n');
  if(report.failures.length)throw Object.assign(Error('INGRESS_ROLLBACK_UNVERIFIED'),{code:'INGRESS_ROLLBACK_UNVERIFIED',report});
  return report;
}
async function main(){
  const [action,phase]=process.argv.slice(2);assert.ok(['before-deploy','snapshot-trigger','capture-trigger','initialize-closed','operate','wait-probe','wait-config','rollback'].includes(action));
  const control=JSON.parse(fs.readFileSync(g.CONTROL)),p=resolveCandidate(control,phase,action==='operate');
  await verifyExecutionRuntime(p,{phase,action});
  const retryReadback=require('./gravicentra-i6-6-cloud-build-operational.cjs').readRetryReadback(p,phase);
  scope.verifySourcePins(p);
  if(p.executionProvider!=='CLOUD_BUILD')assert.equal(execFileSync('git',['diff','--name-only',p.sourceSha,'HEAD','--',...g.PINNED_OWNER_PATHS],{encoding:'utf8'}).trim(),'',
    'INGRESS_CHECKOUT_SOURCE_OR_QA_CHANGED');
  const root=process.env.I66_PACKAGE_ROOT;assert.ok(root,'INGRESS_EXACT_PACKAGE_REQUIRED');
  const requireFrom=createRequire(path.join(root,'bundle/backend/package.json'));
  const {GoogleAuth}=requireFrom('google-auth-library'),auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform'],projectId:PROJECT}).getClient();
  const {getApps,initializeApp,applicationDefault}=requireFrom('firebase-admin/app'),{getFirestore}=requireFrom('firebase-admin/firestore');
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT}),db=getFirestore(app);
  const authorityBlob=execFileSync('git',['rev-parse','HEAD:'+g.CONTROL],{encoding:'utf8'}).trim();
  let report;
  if(action==='before-deploy')report=await beforeDeploy({db,auth,p,phase,requireFrom,authorityBlob,retryReadback,
    privateFile:path.join(process.env.RUNNER_TEMP,'gi-make-secret-iam-private.json')});
  else if(action==='snapshot-trigger')report=await snapshotTrigger({auth,p,phase,retryReadback});
  else if(action==='capture-trigger')report=await captureTrigger({db,auth,p,phase,retryReadback,
    snapshot:JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-snapshot-trigger.json`))),
    ...captureRecorders(process.env.RUNNER_TEMP,phase)});
  else if(action==='rollback')report=await rollback({db,auth,p,phase,requireFrom,authorityBlob,retryReadback,deleteFunction:async target=>{
    execFileSync('gcloud',['functions','delete',target.name,'--gen2','--region',target.region,'--project',PROJECT,'--quiet'],{stdio:'pipe',timeout:180000});}});
  else if(action==='initialize-closed')report=await initializeClosed({db,auth,p,phase,authorityBlob,retryReadback,
    eventarcBefore:JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-before-deploy.json`))).eventarcReadiness});
  else if(action==='wait-config'||action==='wait-probe')report=await waitConfiguration({db,auth,p,phase,requireFrom,stopAtProbe:action==='wait-probe'});
  else{
    // The job may wait for SDK installation. Re-read the current committed
    // authority and exact operation immediately before configuration/CAS.
    const current=refreshAuthority(p);
    assert.deepEqual(resolveCandidate(current.control,phase,true),p,'INGRESS_OPERATION_CURRENT_CANDIDATE_CHANGED');
    assert.deepEqual(current.control.makeIngressProtectedOperation,control.makeIngressProtectedOperation,'INGRESS_OPERATION_REVOKED_OR_REPLACED');
    const owner=require('./gravicentra-i66-frontend-control.cjs');
    owner.physicalGuard(JSON.parse(current.read(owner.P.cp)),JSON.parse(current.read(owner.P.state)),current.control,
      {readFileSync:(file,encoding)=>{const bytes=current.read(file);return encoding?bytes.toString('utf8'):bytes;}});
    report=await operate({db,auth,p,phase,op:current.control.makeIngressProtectedOperation,authorityBlob:current.authorityBlob,requireFrom,
      read:current.read,committed:current.control.status==='OPERATIONAL_EXACT_LIVE_ACCEPTED_LOCKED'&&current.control.currentPhysicalHostingRelease?.sourceSha===p.sourceSha});
  }
  const file=path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-${action}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
  console.log('I66_MAKE_PROTECTED_OPERATION_RESULT='+JSON.stringify({action,phase,status:report.status||report.state,
    sourceSha:p.sourceSha,iamWrites:report.iamWrites||0,configurationWrites:report.configurationWrites||report.config?.configurationWrites||0,
    trafficWrites:report.routing?report.routing.trafficWrites:(report.trigger?.trafficWrites??0),
    configDigest:report.afterDigest||report.config?.afterDigest||null,canonicalLeadWrites:report.canonicalLeadWrites||0,
    externalMessagesSent:0,reportBlobSha:gitBlob(fs.readFileSync(file)),reportSha256:sha256(fs.readFileSync(file))}));
}
if(require.main===module)main().catch(error=>{console.error(safeFailureCode(error));process.exitCode=1;});
module.exports={trafficV1Url,trafficV1Preimage,trafficV1Data,trafficV1Request,fnProjection,requireOperation,resolveCandidate,readBoundJson,verifyMakeExecution,deployedRules,deployedFunction,
  trafficServiceResource,trafficRevision,trafficProjection,validateTrafficProof,deployedTraffic,safeFailureCode,safeRoutingObservation,captureRecorders,
  optionalFunction,retryPreimage,closedPreimageDigest,validateSnapshotPreimage,requireClosedTrafficGrant,snapshotTrigger,captureTrigger,rollbackCreatedTrigger,closeForRollback,rollback,
  proveCurrentDeployment,configAuthority,verifyProbeReadback,runtimeServices,beforeDeploy,initializeClosed,operate,
  verifyProjectIamUnchanged,validateProjectIamReadback,
  proofContext,canonicalRefs,snapshotRefs,readResult,inspectCanonical,captureOrVerify,nativeExecution,verifyExecutionRuntime,refreshAuthority,waitConfiguration};
