'use strict';
// Read-only verification for one canonical, compensated Preview retry.
// The original claim stays consumed. Every successor uses create-once CAS on
// a name derived from the previous claim, never a caller-chosen nonce.
const assert=require('node:assert/strict');
const pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const preview=require('./gravicentra-i6-6-cloud-build-preview.cjs');
const scope=require('./gravicentra-i66-make-release-scope.cjs');
const {C,sha,blob,digest}=pkg;
const SCHEMA='GI_I66_COMPENSATED_RETRY_REFERENCE_V1';
const ADMISSION_SCHEMA='GI_I66_COMPENSATED_RETRY_ADMISSION_V1';
const CONSTRAINTS=Object.freeze({productSourceChanges:0,rebuilds:0,livePromotion:false,claimReuse:false,
  realCustomerWrites:0,realFinancialWrites:0,externalMessagesSent:0});
const need=(v,c)=>assert.ok(v,'I66_COMPENSATED_RETRY_'+c);
const equal=(a,b,c)=>assert.deepEqual(a,b,'I66_COMPENSATED_RETRY_'+c);
const keys=(v,k,c)=>{need(v&&typeof v==='object'&&!Array.isArray(v),c+'_OBJECT');equal(Object.keys(v).sort(),k.slice().sort(),c+'_KEYS');};
const sha40=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v),sha64=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(v);
const generation=v=>typeof v==='string'&&/^[1-9][0-9]{0,24}$/.test(v);
const bindingKeys=['phase','requestVersion','sourceSha','artifactId','artifactDigest','priorBuildId','priorClaim','hold'];
function binding(ref){return Object.fromEntries(bindingKeys.map(k=>[k,ref[k]]));}
function originalLockName(p,phase){return 'i66/operational-locks/request-'+p.providerBinding.requestVersion+'-'+phase+'-'+p.sourceSha+'-'+p.artifactDigest.slice(7)+'.json';}
function validateReference(ref,p,phase){
  if(ref===undefined)return null;
  keys(ref,['schema',...bindingKeys,'admission'],'REFERENCE');equal(ref.schema,SCHEMA,'REFERENCE_SCHEMA');
  equal([phase,ref.phase],['preview','preview'],'PREVIEW_ONLY');
  equal([p.executionProvider,ref.requestVersion,p.providerBinding?.requestVersion],[C.provider,35,35],'REQUEST35_NATIVE_BOUNDARY');
  need(sha40(ref.sourceSha)&&uuid(ref.priorBuildId),'SOURCE_AND_PREVIOUS_BUILD');
  equal([ref.sourceSha,ref.artifactId,ref.artifactDigest],[p.sourceSha,p.artifactId,p.artifactDigest],'SAME_IMMUTABLE_PACKAGE');
  equal(preview.artifactIdentity(p.sourceSha,p.buildRunId,p.artifactId,p.artifactDigest).requestVersion,35,'PACKAGE_REQUEST35');
  equal([p.makeIngressComposite,p.syntheticRecordsOnly,p.noRealFinancialOrCustomerWrites],[true,true,true],'EXISTING_SYNTHETIC_SCOPE');
  preview.objectRef(ref.priorClaim);preview.objectRef(ref.hold);
  const base=originalLockName(p,phase),claim=ref.priorClaim.uri.slice(('gs://'+C.bucket+'/').length);
  need(claim===base||new RegExp('^'+base.slice(0,-5)+'\\.retry-[a-f0-9]{64}\\.json$').test(claim),'PREVIOUS_CLAIM_BOUNDARY');
  equal(ref.hold.uri,'gs://'+C.bucket+'/i66/operational-attempts/'+ref.priorBuildId+'/hold.json','EXACT_PREVIOUS_HOLD');
  keys(ref.admission,['commit','path','blob','sha256'],'ADMISSION_REFERENCE');
  need(sha40(ref.admission.commit)&&sha40(ref.admission.blob)&&sha64(ref.admission.sha256),'ADMISSION_GIT_PIN');
  need(/^artifacts\/orbit360-recovery\/release-control\/I6_6_[A-Z0-9_]+\.json$/.test(ref.admission.path),'ADMISSION_CANONICAL_PATH');
  return ref;
}
function retryLockName(baseName,ref){
  if(ref===undefined)return baseName;
  equal(baseName,'i66/operational-locks/request-'+ref.requestVersion+'-'+ref.phase+'-'+ref.sourceSha+'-'+ref.artifactDigest.slice(7)+'.json','LOCK_BASE');
  // A newly written admission for the same consumed predecessor cannot mint
  // another concurrent attempt. Only a different proven predecessor can.
  return baseName.slice(0,-5)+'.retry-'+digest({priorBuildId:ref.priorBuildId,priorClaim:ref.priorClaim})+'.json';
}
function candidateContract(p){
  const out=structuredClone(p);delete out.providerBinding.mechanism;delete out.providerBinding.compensatedRetry;return out;
}
function validateAdmission(value,ref){
  const evidenceKeys=Object.hasOwn(value,'executionLog')?['executionLog']:[];
  keys(value,['schema','status','recordedAtUtc',...bindingKeys,'constraints',...evidenceKeys],'ADMISSION');
  if(evidenceKeys.length){
    preview.objectRef(value.executionLog);
    equal(value.executionLog.uri,ref.hold.uri.replace(/\/hold\.json$/,'/hold-execution.log'),'EXACT_EXECUTION_LOG');
  }
  equal([value.schema,value.status],[ADMISSION_SCHEMA,'EXACT_COMPENSATED_PREVIEW_RETRY_ADMITTED'],'EXPLICIT_ADMISSION');
  equal(binding(value),binding(ref),'ADMISSION_EXACT_PREDECESSOR');equal(value.constraints,CONSTRAINTS,'NO_SCOPE_EXPANSION');
  need(Number.isFinite(Date.parse(value.recordedAtUtc)),'ADMISSION_TIME');return value;
}
function canonicalService(value){
  const suffix='/locations/'+scope.ADDED.preview.region+'/services/'+scope.ADDED.preview.name.toLowerCase();
  need([C.projectId,C.projectNumber].some(p=>value==='projects/'+p+suffix),'TRIGGER_SERVICE_SCOPE');return 'projects/'+C.projectId+suffix;
}
function validateFunction(fn,p){
  keys(fn,['name','region','revision','runtimePrincipal','eventType','database','document','retryPolicy','trigger','service','configurationDigest'],'FUNCTION_PROJECTION');
  equal([fn.name,fn.region],[scope.ADDED.preview.name,scope.ADDED.preview.region],'TRIGGER_IDENTITY');
  equal([fn.runtimePrincipal,fn.eventType,fn.database,fn.document,fn.retryPolicy],
    [p.makeIngress.runtimeAccess.principal,scope.EVENT_TYPE,'(default)','tenants/alianzas-soluciones/previewLeadIngressRequests/{requestId}','RETRY_POLICY_RETRY'],'TRIGGER_EXISTING_SCOPE');
  const service=canonicalService(fn.service),short=service.split('/').at(-1);
  need(new RegExp('^'+short+'-[a-z0-9-]+$').test(fn.revision),'FUNCTION_REVISION');
  need(typeof fn.trigger==='string'&&fn.trigger.length>0,'EVENTARC_TRIGGER_REQUIRED');
  const {configurationDigest,...projection}=fn;equal(configurationDigest,digest(projection),'FUNCTION_PROJECTION_DIGEST');return fn;
}
function validateTraffic(traffic,fn){
  keys(traffic,['schema','phase','service','serviceUid','generation','observedFrom','targets','observationDigest'],'TRAFFIC_PROJECTION');
  equal([traffic.schema,traffic.phase,traffic.observedFrom],['GI_I66_MAKE_CLOUD_RUN_TRAFFIC_V1','preview','CLOUD_RUN_V2_TRAFFIC_STATUSES'],'REAL_TRAFFIC_PROJECTION');
  equal(traffic.service,canonicalService(fn.service),'TRAFFIC_SAME_SERVICE');need(uuid(traffic.serviceUid)&&generation(traffic.generation),'TRAFFIC_IDENTITY_GENERATION');
  need(Array.isArray(traffic.targets)&&traffic.targets.length===1,'NO_SPLIT_TRAFFIC');keys(traffic.targets[0],['revision','percent'],'TRAFFIC_TARGET');
  equal(traffic.targets[0].percent,100,'FULL_PREVIOUS_REVISION');
  need(new RegExp('^'+scope.ADDED.preview.name.toLowerCase()+'-[a-z0-9-]+$').test(traffic.targets[0].revision),'TRAFFIC_REVISION_SCOPE');
  const {observationDigest,...projection}=traffic;equal(observationDigest,digest(projection),'TRAFFIC_PROJECTION_DIGEST');return traffic;
}
async function retainedBytes(io,ref,build){
  preview.objectRef(ref);const value=await io.object(ref),bytes=Buffer.from(value.data),meta=value.meta;
  equal([meta?.bucket,meta?.name,String(meta?.generation),Number(meta?.size),bytes.length,sha(bytes)],
    [C.bucket,ref.uri.slice(('gs://'+C.bucket+'/').length),ref.generation,ref.bytes,ref.bytes,ref.sha256],'RETAINED_OBJECT_EXACT');
  need(!meta.acl?.some(x=>['allUsers','allAuthenticatedUsers'].includes(x.entity)),'PRIVATE_RETAINED_OBJECT');
  pkg.validateObjectTime(build,meta);return {bytes,meta};
}
async function object(io,ref,build){
  const {bytes,meta}=await retainedBytes(io,ref,build);
  return {value:JSON.parse(bytes),meta};
}
async function verifyFailureCode(hold,admission,io,build,holdMeta){
  const cause='INGRESS_CONFIGURATION_PROOF_PENDING';
  if(hold.code===cause&&!admission.executionLog)return;
  equal(hold.code,'I66_CLOUD_BUILD_COMMAND_FAILED_gi-i66-operational-execution.log','EXACT_COMPENSATED_HOLD');
  need(admission.executionLog,'SIGNED_EXECUTION_LOG_REQUIRED');
  const log=await retainedBytes(io,admission.executionLog,build);
  need(Date.parse(log.meta.timeCreated)<=Date.parse(holdMeta.timeCreated),'EXECUTION_LOG_PRECEDES_HOLD');
  const lines=log.bytes.toString('utf8').trimEnd().split(/\r?\n/);
  equal(lines.at(-2),cause,'TERMINAL_CONFIGURATION_FAILURE');
  const prefix='I66_MAKE_PROTECTED_OPERATION_RESULT=';
  need(lines.at(-1)?.startsWith(prefix),'TERMINAL_ROLLBACK_REPORT');
  const result=JSON.parse(lines.at(-1).slice(prefix.length));
  equal([result.action,result.phase,result.status,result.sourceSha],
    ['rollback',hold.phase,hold.rollback.proof.status,hold.sourceSha],'TERMINAL_ROLLBACK_IDENTITY');
  equal(result.reportSha256,sha(Buffer.from(JSON.stringify(hold.rollback.proof,null,2)+'\n')),'TERMINAL_ROLLBACK_DIGEST');
}
function compensationState(hold,p){
  equal(hold.rollback?.status,'COMPENSATION_COMMAND_SUCCEEDED','COMPENSATION_COMMAND');const proof=hold.rollback.proof;
  equal([proof?.schema,proof?.phase,proof?.sourceSha,proof?.artifactDigest,proof?.status],
    ['GI_I66_MAKE_RELEASE_COMPENSATION_V1','preview',p.sourceSha,p.artifactDigest,'COMPENSATION_READBACK_VERIFIED'],'COMPENSATION_PROVEN');
  equal(proof.failures,[],'NO_ROLLBACK_FAILURE');need(!proof.failureCodes||Object.keys(proof.failureCodes).length===0,'NO_ROLLBACK_FAILURE_CODES');
  equal([proof.canonicalLeadWrites,proof.externalMessagesSent,proof.secretIam],[0,0,null],'NO_REAL_WRITES_OR_IAM');
  equal([proof.configuration?.status,proof.configuration?.configurationWrites],['CLOSED_CONFIG_READBACK_VERIFIED',0],'CLOSED_CONFIGURATION_VERIFIED');
  need(sha64(proof.configuration.afterDigest),'CLOSED_CONFIGURATION_DIGEST');
  const trigger=proof.trigger;need(['EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED','EXACT_PREVIOUS_PREVIEW_REVISION_ALREADY_RESTORED'].includes(trigger?.status),'PREVIOUS_TRIGGER_RESTORED');
  equal([trigger.functionDeletes,trigger.trafficWrites],[0,trigger.status.endsWith('ALREADY_RESTORED')?0:1],'EXACT_COMPENSATION_MUTATIONS');
  need(sha64(trigger.trafficReadbackDigest),'COMPENSATED_TRAFFIC_DIGEST');
  const observations=proof.triggerObservations;need(Array.isArray(observations)&&observations.length>0,'RETAINED_TRIGGER_OBSERVATIONS_REQUIRED');
  const fn=observations.filter(row=>row.kind==='FUNCTION_PROJECTION').at(-1)?.function;
  const traffic=observations.filter(row=>row.kind==='TRAFFIC_PROJECTION'&&row.traffic?.observationDigest===trigger.trafficReadbackDigest).at(-1)?.traffic;
  validateFunction(fn,p);validateTraffic(traffic,fn);equal(traffic.targets[0].revision,trigger.restoredRevision,'RESTORED_REVISION_READBACK');
  return {configurationDigest:proof.configuration.afterDigest,function:fn,traffic};
}
async function verifyCompensatedRetry(p,phase,io,options={}){
  const ref=validateReference(p.providerBinding?.compensatedRetry,p,phase);if(!ref)return null;
  const {readGitBytes,verifyAdmissionAncestry,validateFailedBuild,readPriorCandidate,readCurrentState,currentBuildId,authorityHead}=options;
  for(const [name,fn] of Object.entries({readGitBytes,verifyAdmissionAncestry,validateFailedBuild,readPriorCandidate,readCurrentState}))need(typeof fn==='function','READER_'+name);
  need(io&&typeof io.object==='function'&&typeof io.api==='function','READONLY_PROVIDER_IO');
  need(uuid(currentBuildId)&&currentBuildId!==ref.priorBuildId&&sha40(authorityHead),'NEW_EXECUTION_AND_AUTHORITY');
  equal(await verifyAdmissionAncestry(ref.admission.commit,authorityHead),true,'ADMISSION_IN_CURRENT_AUTHORITY');
  const admissionBytes=Buffer.from(await readGitBytes(ref.admission.commit,ref.admission.path));
  equal([blob(admissionBytes),sha(admissionBytes)],[ref.admission.blob,ref.admission.sha256],'ADMISSION_EXACT_GIT_BYTES');
  const admission=validateAdmission(JSON.parse(admissionBytes),ref);
  const build=await io.api('https://cloudbuild.googleapis.com/v1/projects/'+C.projectId+'/locations/'+C.region+'/builds/'+ref.priorBuildId);
  equal([build?.id,build?.status,build?.projectId],[ref.priorBuildId,'FAILURE',C.projectId],'ACTUAL_PREVIOUS_FAILURE');
  const steps=build.steps?.filter(s=>s.id==='i66-native-operational-gates');need(steps?.length===1,'ONE_PREVIOUS_OPERATIONAL_STEP');
  const args=steps[0].args;need(Array.isArray(args)&&args.length===3&&args[0]==='tools/gravicentra-i6-6-cloud-build-operational.cjs'&&args[1]==='worker','PREVIOUS_WORKER_PLAN');
  const plan=JSON.parse(args[2]);equal([plan.phase,plan.sourceSha,plan.requestVersion],['preview',p.sourceSha,35],'PREVIOUS_PLAN_SCOPE');
  equal(await validateFailedBuild(plan,build),build,'CANONICAL_FAILED_BUILD_VALIDATION');
  need(Number.isFinite(Date.parse(build.finishTime))&&Date.parse(admission.recordedAtUtc)>=Date.parse(build.finishTime),'ADMISSION_AFTER_FINISHED_FAILURE');
  const priorCandidate=await readPriorCandidate(plan);
  equal(digest(priorCandidate),plan.candidateSha256,'PREVIOUS_CANONICAL_CANDIDATE');
  equal(candidateContract(p),candidateContract(priorCandidate),'SAME_PRODUCT_PAYLOAD_AND_SCOPE');
  validateReference(priorCandidate.providerBinding.compensatedRetry,priorCandidate,phase);
  const priorLock=retryLockName(originalLockName(priorCandidate,phase),priorCandidate.providerBinding.compensatedRetry);
  equal(ref.priorClaim.uri,'gs://'+C.bucket+'/'+priorLock,'EXACT_PREVIOUS_CLAIM_NAME');
  const [claimRead,holdRead]=await Promise.all([object(io,ref.priorClaim,build),object(io,ref.hold,build)]);
  const claim=claimRead.value,hold=holdRead.value;
  equal(claim,{schema:'GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',executionProvider:C.provider,buildId:build.id,phase,
    sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,authorityHead:plan.authorityHead,planSha256:digest(plan),candidateSha256:plan.candidateSha256},'ACTUAL_CONSUMED_CLAIM');
  keys(hold,['schema','executionProvider','buildId','phase','sourceSha','artifactId','artifactDigest','planSha256','claim','retainedBefore','rollback','code','productionAccepted'],'HOLD');
  equal([hold.schema,hold.executionProvider,hold.buildId,hold.phase,hold.sourceSha,hold.artifactId,hold.artifactDigest,hold.planSha256,hold.productionAccepted],
    ['GI_I66_NATIVE_OPERATIONAL_HOLD_V1',C.provider,build.id,phase,p.sourceSha,p.artifactId,p.artifactDigest,digest(plan),false],'EXACT_COMPENSATED_HOLD');
  await verifyFailureCode(hold,admission,io,build,holdRead.meta);
  equal(hold.claim,ref.priorClaim,'HOLD_SAME_CONSUMED_CLAIM');need(Date.parse(claimRead.meta.timeCreated)<=Date.parse(holdRead.meta.timeCreated),'CLAIM_PRECEDES_HOLD');
  const expected=compensationState(hold,p),now=typeof options.nowMs==='function'?options.nowMs:()=>options.nowMs??Date.now(),started=now();
  const current=await readCurrentState({p,phase,priorBuild:build,priorPlan:plan,hold,expected,requestedAtUtc:new Date(started).toISOString()});
  keys(current,['observedAtUtc','configuration','function','traffic'],'CURRENT_READBACK');
  need(Number.isFinite(Date.parse(current.observedAtUtc))&&Date.parse(current.observedAtUtc)>=started&&Date.parse(current.observedAtUtc)<=now(),'FRESH_CURRENT_READBACK');
  need(current.configuration&&typeof current.configuration==='object'&&!Array.isArray(current.configuration),'CURRENT_GRANT');
  equal([current.configuration.state,current.configuration.enabled],['CLOSED',false],'CURRENT_CONFIGURATION_CLOSED');
  equal(digest(current.configuration),expected.configurationDigest,'CURRENT_CONFIGURATION_EXACT');
  validateFunction(current.function,p);equal(current.function,expected.function,'CURRENT_FUNCTION_UNCHANGED');
  validateTraffic(current.traffic,current.function);equal([current.traffic.service,current.traffic.serviceUid,current.traffic.targets],
    [expected.traffic.service,expected.traffic.serviceUid,expected.traffic.targets],'CURRENT_PREVIOUS_TRAFFIC');
  need(BigInt(current.traffic.generation)>=BigInt(expected.traffic.generation),'CURRENT_TRAFFIC_GENERATION');
  return {schema:'GI_I66_COMPENSATED_RETRY_VERIFIED_V1',status:'EXACT_COMPENSATED_PREVIEW_RETRY_READBACK_VERIFIED',phase,
    priorBuildId:build.id,priorClaim:ref.priorClaim,hold:ref.hold,admission:ref.admission,priorPlanSha256:digest(plan),
    currentBuildId,authorityHead,retryClaimName:retryLockName(originalLockName(p,phase),ref),verifiedAtUtc:current.observedAtUtc,
    verifiedCurrentBefore:{configurationDigest:expected.configurationDigest,function:current.function,traffic:current.traffic},
    productSourceChanges:0,rebuilds:0,claimWrites:0,businessWrites:0,livePromotion:false};
}
module.exports={SCHEMA,ADMISSION_SCHEMA,CONSTRAINTS,binding,originalLockName,validateReference,retryLockName,validateAdmission,
  candidateContract,validateFunction,validateTraffic,compensationState,verifyCompensatedRetry};
