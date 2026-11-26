'use strict';
// Synthetic fixtures only. No provider receipt, retry admission, claim,
// release, business write, deployment or external request is produced here.
const test=require('node:test'),assert=require('node:assert/strict');
const helper=require('./gravicentra-i6-6-cloud-build-compensated-retry.cjs');
const pkg=require('./gravicentra-i6-6-cloud-build-package.cjs');
const scope=require('./gravicentra-i66-make-release-scope.cjs');
const {C,sha,blob,digest}=pkg;
const clone=x=>structuredClone(x),bytes=x=>Buffer.from(JSON.stringify(x)+'\n');
const priorId='12345678-1234-4234-8234-123456789035',newId='22345678-1234-4234-8234-123456789035',packageId='32345678-1234-4234-8234-123456789035';
const now=Date.parse('2026-11-25T13:05:00Z');
function fixture(){
 const fn={name:scope.ADDED.preview.name,region:scope.ADDED.preview.region,revision:'orbit360makeleadingresspreview-00022-new',
  runtimePrincipal:scope.RUNTIME,eventType:scope.EVENT_TYPE,database:'(default)',document:'tenants/alianzas-soluciones/previewLeadIngressRequests/{requestId}',
  retryPolicy:'RETRY_POLICY_RETRY',trigger:'projects/'+C.projectId+'/locations/us-east1/triggers/synthetic',
  service:'projects/'+C.projectId+'/locations/us-east1/services/orbit360makeleadingresspreview'};
 fn.configurationDigest=digest(fn);
 const traffic={schema:'GI_I66_MAKE_CLOUD_RUN_TRAFFIC_V1',phase:'preview',service:fn.service,serviceUid:'42345678-1234-4234-8234-123456789035',
  generation:'14',observedFrom:'CLOUD_RUN_V2_TRAFFIC_STATUSES',targets:[{revision:'orbit360makeleadingresspreview-00020-old',percent:100}]};
 traffic.observationDigest=digest(traffic);
 const grant={state:'CLOSED',enabled:false,syntheticFixture:true};
 const priorCandidate={executionProvider:C.provider,sourceSha:'a'.repeat(40),buildRunId:packageId,
  artifactId:'gs://'+C.bucket+'/i66/packages/request-35/'+'a'.repeat(40)+'/'+packageId+'/gi-i66-exact-package.tar.gz#10000000000001',artifactDigest:'sha256:'+'b'.repeat(64),
  makeIngressComposite:true,syntheticRecordsOnly:true,noRealFinancialOrCustomerWrites:true,
  makeIngress:{runtimeAccess:{principal:scope.RUNTIME},permissions:{projectIamWrites:0},targetBefore:{preview:{state:'EXISTING_APPROVED',name:fn.name,region:fn.region,revision:traffic.targets[0].revision}},outboundEnabled:false},
  providerBinding:{requestVersion:35,mechanism:{commit:'c'.repeat(40)}}};
 const p=clone(priorCandidate);p.providerBinding.mechanism={commit:'d'.repeat(40)};
 const plan={schema:'GI_I66_CLOUD_BUILD_OPERATIONAL_PLAN_V1',provider:C.provider,phase:'preview',sourceSha:p.sourceSha,requestVersion:35,
  authorityHead:'e'.repeat(40),mechanismSha:priorCandidate.providerBinding.mechanism.commit,candidateSha256:digest(priorCandidate)};
 const build={id:priorId,projectId:C.projectId,status:'FAILURE',startTime:'2026-11-25T12:00:00Z',finishTime:'2026-11-25T12:10:00Z',
  steps:[{id:'i66-native-operational-gates',args:[]}],sourceProvenance:{resolvedGitSource:{revision:plan.authorityHead}}};
 const claim={schema:'GI_I66_NATIVE_OPERATIONAL_CLAIM_V1',executionProvider:C.provider,buildId:priorId,phase:'preview',sourceSha:p.sourceSha,
  artifactId:p.artifactId,artifactDigest:p.artifactDigest,authorityHead:plan.authorityHead,planSha256:digest(plan),candidateSha256:plan.candidateSha256};
 const hold={schema:'GI_I66_NATIVE_OPERATIONAL_HOLD_V1',executionProvider:C.provider,buildId:priorId,phase:'preview',sourceSha:p.sourceSha,
  artifactId:p.artifactId,artifactDigest:p.artifactDigest,planSha256:digest(plan),claim:null,retainedBefore:{},
  rollback:{status:'COMPENSATION_COMMAND_SUCCEEDED',proof:{schema:'GI_I66_MAKE_RELEASE_COMPENSATION_V1',phase:'preview',sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
   status:'COMPENSATION_READBACK_VERIFIED',configuration:{status:'CLOSED_CONFIG_READBACK_VERIFIED',configurationWrites:0,afterDigest:digest(grant)},
   trigger:{status:'EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED',functionDeletes:0,trafficWrites:1,restoredRevision:traffic.targets[0].revision,trafficReadbackDigest:traffic.observationDigest},
   secretIam:null,canonicalLeadWrites:0,externalMessagesSent:0,failures:[],triggerObservations:[{kind:'FUNCTION_PROJECTION',function:clone(fn)},{kind:'TRAFFIC_PROJECTION',traffic:clone(traffic)}]}},
  code:'INGRESS_CONFIGURATION_PROOF_PENDING',productionAccepted:false};
 let admission,admissionBytes,ref;const objects=new Map(),calls=[];
 const current={observedAtUtc:new Date(now).toISOString(),configuration:clone(grant),function:clone(fn),traffic:clone(traffic)};
 const state={fn,traffic,grant,p,priorCandidate,plan,build,claim,hold,current,calls,objects,
  seal(){
   plan.candidateSha256=digest(priorCandidate);build.steps[0].args=['tools/gravicentra-i6-6-cloud-build-operational.cjs','worker',JSON.stringify(plan)];
   claim.planSha256=digest(plan);claim.candidateSha256=plan.candidateSha256;hold.planSha256=digest(plan);
   objects.clear();
   function retain(name,value,generation,time){const data=bytes(value),uri='gs://'+C.bucket+'/'+name,reference={uri,generation,sha256:sha(data),bytes:data.length};
    objects.set(uri,{data,meta:{bucket:C.bucket,name,generation,size:String(data.length),timeCreated:time}});return reference;}
   const priorClaim=retain(helper.originalLockName(priorCandidate,'preview'),claim,'10000000000002','2026-11-25T12:01:00Z');hold.claim=priorClaim;
   const holdRef=retain('i66/operational-attempts/'+priorId+'/hold.json',hold,'10000000000003','2026-11-25T12:09:00Z');
   ref={schema:helper.SCHEMA,phase:'preview',requestVersion:35,sourceSha:p.sourceSha,artifactId:p.artifactId,artifactDigest:p.artifactDigest,
    priorBuildId:priorId,priorClaim,hold:holdRef,admission:null};
   admission={schema:helper.ADMISSION_SCHEMA,status:'EXACT_COMPENSATED_PREVIEW_RETRY_ADMITTED',recordedAtUtc:'2026-11-25T13:00:00Z',...helper.binding(ref),constraints:clone(helper.CONSTRAINTS)};
   admissionBytes=bytes(admission);ref.admission={commit:'f'.repeat(40),path:'artifacts/orbit360-recovery/release-control/I6_6_SYNTHETIC_RETRY_ADMISSION.json',blob:blob(admissionBytes),sha256:sha(admissionBytes)};
   p.providerBinding.compensatedRetry=ref;state.ref=ref;state.admission=admission;return state;
  },
  rewriteAdmission(){admissionBytes=bytes(admission);ref.admission.blob=blob(admissionBytes);ref.admission.sha256=sha(admissionBytes);},
  io:{api:async url=>{calls.push(['build',url]);return build;},object:async reference=>{calls.push(['object',reference.uri]);return objects.get(reference.uri);},retain(){throw Error('NO_CLAIM_WRITE_ALLOWED');}},
  options:{currentBuildId:newId,authorityHead:'1'.repeat(40),nowMs:now,
   readGitBytes:async(commit,path)=>{calls.push(['git',commit,path]);return admissionBytes;},verifyAdmissionAncestry:async()=>true,
   validateFailedBuild:async(pl,b)=>{calls.push(['canonicalFailedBuild']);assert.equal(b.status,'FAILURE');assert.equal(b.sourceProvenance.resolvedGitSource.revision,pl.authorityHead);return b;},
   readPriorCandidate:async()=>priorCandidate,readCurrentState:async()=>{calls.push(['currentReadback']);return current;}}
 };
 return state.seal();
}
const run=f=>helper.verifyCompensatedRetry(f.p,'preview',f.io,f.options);

module.exports={fixture,priorId,newId,packageId,now};
if(require.main===module){
function wrappedFailure({cause='INGRESS_CONFIGURATION_PROOF_PENDING',source,shaOverride}={}){
 const f=fixture();
 f.hold.code='I66_CLOUD_BUILD_COMMAND_FAILED_gi-i66-operational-execution.log';f.seal();
 const uri=f.ref.hold.uri.replace(/\/hold\.json$/,'/hold-execution.log');
 const rollback={action:'rollback',phase:'preview',status:f.hold.rollback.proof.status,sourceSha:source||f.hold.sourceSha,
   reportSha256:shaOverride||sha(Buffer.from(JSON.stringify(f.hold.rollback.proof,null,2)+'\n'))};
 const data=Buffer.from('earlier diagnostic: INGRESS_CONFIGURATION_PROOF_PENDING\n'+cause+'\nI66_MAKE_PROTECTED_OPERATION_RESULT='+JSON.stringify(rollback)+'\n');
 const generation='10000000000007';
 f.admission.executionLog={uri,generation,bytes:data.length,sha256:sha(data)};
 f.objects.set(uri,{data,meta:{bucket:C.bucket,name:uri.slice(('gs://'+C.bucket+'/').length),generation,size:String(data.length),timeCreated:'2026-11-25T12:08:00Z'}});
 f.rewriteAdmission();return f;
}
test('wrapper resolves through its signed terminal log and identical rollback receipt',async()=>{
 assert.equal((await run(wrappedFailure())).claimWrites,0);
});
test('wrapper alone cannot authorize a retry',async()=>{
 const f=wrappedFailure();delete f.admission.executionLog;f.rewriteAdmission();await assert.rejects(run(f),/SIGNED_EXECUTION_LOG_REQUIRED/);
});
test('earlier diagnostic cannot substitute for terminal cause',async()=>{
 await assert.rejects(run(wrappedFailure({cause:'OTHER_ERROR'})),/TERMINAL_CONFIGURATION_FAILURE/);
});
test('rollback from a different attempt or log object is rejected',async()=>{
 await assert.rejects(run(wrappedFailure({shaOverride:'0'.repeat(64)})),/TERMINAL_ROLLBACK_DIGEST/);
 await assert.rejects(run(wrappedFailure({source:'0'.repeat(40)})),/TERMINAL_ROLLBACK_IDENTITY/);
 const f=wrappedFailure();f.admission.executionLog.uri=f.ref.hold.uri;f.rewriteAdmission();await assert.rejects(run(f),/EXACT_EXECUTION_LOG/);
});

test('verified compensation permits a distinct create-once retry name while leaving the original claim immutable',async()=>{
 const f=fixture(),before=clone(f.p),claimBefore=Buffer.from(f.objects.get(f.ref.priorClaim.uri).data),result=await run(f);
 assert.equal(result.status,'EXACT_COMPENSATED_PREVIEW_RETRY_READBACK_VERIFIED');assert.equal(result.claimWrites,0);
 assert.notEqual('gs://'+C.bucket+'/'+result.retryClaimName,f.ref.priorClaim.uri);assert.equal(result.livePromotion,false);
 assert.deepEqual(f.p,before);assert.deepEqual(f.objects.get(f.ref.priorClaim.uri).data,claimBefore);
 assert.equal(f.calls.filter(x=>x[0]==='currentReadback').length,1);assert.equal(result.verifiedCurrentBefore.function.revision,f.fn.revision);
 assert.notEqual(result.verifiedCurrentBefore.function.revision,result.verifiedCurrentBefore.traffic.targets[0].revision,'traffic restoration never fabricates Functions metadata restoration');
});
test('normal claims retain exactly their historic name and have no additional I/O',async()=>{
 const f=fixture();delete f.p.providerBinding.compensatedRetry;const base=helper.originalLockName(f.p,'preview');
 assert.equal(helper.retryLockName(base,undefined),base);assert.equal(await run(f),null);assert.equal(f.calls.length,0);
});
test('new admission bytes for the same predecessor cannot mint a parallel retry lock',()=>{
 const f=fixture(),base=helper.originalLockName(f.p,'preview'),first=helper.retryLockName(base,f.ref),second=clone(f.ref);
 second.admission.commit='2'.repeat(40);second.admission.blob='3'.repeat(40);second.admission.sha256='4'.repeat(64);
 assert.equal(helper.retryLockName(base,second),first);second.priorClaim.generation='10000000000009';assert.notEqual(helper.retryLockName(base,second),first);
});
for(const [name,change,code] of [
 ['unknown reference field',f=>f.ref.nonce='caller-chosen','REFERENCE_KEYS'],
 ['LIVE retry',f=>f.ref.phase='live','PREVIEW_ONLY'],
 ['request 36',f=>f.ref.requestVersion=36,'REQUEST35_NATIVE_BOUNDARY'],
 ['foreign product source',f=>f.ref.sourceSha='2'.repeat(40),'SAME_IMMUTABLE_PACKAGE'],
 ['unversioned old claim',f=>f.ref.priorClaim.generation='','OBJECT_GENERATION'],
 ['foreign bucket',f=>f.ref.hold.uri=f.ref.hold.uri.replace(C.bucket,'other'),'PRIVATE_BUCKET'],
 ['another build hold',f=>f.ref.hold.uri=f.ref.hold.uri.replace(priorId,newId),'EXACT_PREVIOUS_HOLD'],
 ['caller-selected lock path',f=>f.ref.priorClaim.uri='gs://'+C.bucket+'/i66/operational-locks/arbitrary.json','PREVIOUS_CLAIM_BOUNDARY'],
 ['mutable admission ref',f=>f.ref.admission.commit='HEAD','ADMISSION_GIT_PIN'],
 ['product source admission path',f=>f.ref.admission.path='functions/bootstrap.js','ADMISSION_CANONICAL_PATH'],
 ['real data enabled',f=>f.p.noRealFinancialOrCustomerWrites=false,'EXISTING_SYNTHETIC_SCOPE']
])test('reference rejects '+name,()=>{const f=fixture();change(f);assert.throws(()=>helper.validateReference(f.ref,f.p,'preview'),new RegExp(code));});
for(const status of ['SUCCESS','WORKING','QUEUED','CANCELLED','TIMEOUT'])test('rejects previous provider status '+status,async()=>{
 const f=fixture();f.build.status=status;await assert.rejects(run(f),/ACTUAL_PREVIOUS_FAILURE/);
});
for(const [name,change,code] of [
 ['same build pretending to retry',f=>f.options.currentBuildId=priorId,'NEW_EXECUTION'],
 ['admission outside canonical ancestry',f=>f.options.verifyAdmissionAncestry=async()=>false,'ADMISSION_IN_CURRENT_AUTHORITY'],
 ['missing fresh provider reader',f=>delete f.options.readCurrentState,'READER_readCurrentState'],
 ['missing prior canonical candidate reader',f=>delete f.options.readPriorCandidate,'READER_readPriorCandidate'],
 ['wrong pinned admission bytes',f=>f.options.readGitBytes=async()=>Buffer.from('{}'),'ADMISSION_EXACT_GIT_BYTES'],
 ['canonical provider validation failure',f=>f.options.validateFailedBuild=async()=>{throw Error('CANONICAL_PROVIDER_CONFIG_CHANGED');},'CANONICAL_PROVIDER_CONFIG_CHANGED'],
 ['wrong resolved provider authority',f=>f.build.sourceProvenance.resolvedGitSource.revision='8'.repeat(40),'strictly equal'],
 ['new Make permissions',f=>f.p.makeIngress.permissions.projectIamWrites=1,'SAME_PRODUCT_PAYLOAD_AND_SCOPE'],
 ['outbound activation added to payload',f=>f.p.makeIngress.outboundEnabled=true,'SAME_PRODUCT_PAYLOAD_AND_SCOPE'],
 ['changed object generation',f=>f.objects.get(f.ref.hold.uri).meta.generation='10000000000004','RETAINED_OBJECT_EXACT'],
 ['changed retained bytes',f=>f.objects.get(f.ref.hold.uri).data=Buffer.from('{}'),'RETAINED_OBJECT_EXACT'],
 ['object created after prior build',f=>f.objects.get(f.ref.hold.uri).meta.timeCreated='2026-11-25T13:00:00Z','ARTIFACT_FROM_CURRENT_BUILD'],
 ['public evidence object',f=>f.objects.get(f.ref.hold.uri).meta.acl=[{entity:'allUsers'}],'PRIVATE_RETAINED_OBJECT'],
 ['stale current-state observation',f=>f.current.observedAtUtc='2026-11-25T12:09:00Z','FRESH_CURRENT_READBACK'],
 ['current grant reactivated',f=>f.current.configuration.enabled=true,'CURRENT_CONFIGURATION_CLOSED'],
 ['different closed configuration',f=>f.current.configuration.unapproved='changed','CURRENT_CONFIGURATION_EXACT'],
 ['missing retained Functions projection',f=>{f.hold.rollback.proof.triggerObservations=f.hold.rollback.proof.triggerObservations.filter(x=>x.kind!=='FUNCTION_PROJECTION');f.seal();},'FUNCTION_PROJECTION_OBJECT'],
 ['different current function metadata',f=>{f.current.function.revision='orbit360makeleadingresspreview-00023-other';delete f.current.function.configurationDigest;f.current.function.configurationDigest=digest(f.current.function);},'CURRENT_FUNCTION_UNCHANGED'],
 ['different service instance',f=>{f.current.traffic.serviceUid='52345678-1234-4234-8234-123456789035';delete f.current.traffic.observationDigest;f.current.traffic.observationDigest=digest(f.current.traffic);},'CURRENT_PREVIOUS_TRAFFIC'],
 ['regressed traffic generation',f=>{f.current.traffic.generation='13';delete f.current.traffic.observationDigest;f.current.traffic.observationDigest=digest(f.current.traffic);},'CURRENT_TRAFFIC_GENERATION'],
 ['traffic moved to newly deployed revision',f=>{f.current.traffic.targets[0].revision=f.fn.revision;delete f.current.traffic.observationDigest;f.current.traffic.observationDigest=digest(f.current.traffic);},'CURRENT_PREVIOUS_TRAFFIC'],
 ['current traffic digest invented',f=>f.current.traffic.observationDigest='1'.repeat(64),'TRAFFIC_PROJECTION_DIGEST'],
 ['boolean restoration instead of provider projection',f=>f.options.readCurrentState=async()=>({ready:true}),'CURRENT_READBACK_KEYS']
])test('verification holds on '+name,async()=>{const f=fixture();change(f);await assert.rejects(run(f),new RegExp(code));});
for(const [name,change,code] of [
 ['another failure reason',f=>f.hold.code='ANOTHER_FAILURE','EXACT_COMPENSATED_HOLD'],
 ['false production acceptance',f=>f.hold.productionAccepted=true,'EXACT_COMPENSATED_HOLD'],
 ['compensation command unresolved',f=>f.hold.rollback.status='COMPENSATION_HOLD','COMPENSATION_COMMAND'],
 ['readback not verified',f=>f.hold.rollback.proof.status='HOLD','COMPENSATION_PROVEN'],
 ['rollback failures retained',f=>f.hold.rollback.proof.failures=['TRIGGER_ROLLBACK_UNVERIFIED'],'NO_ROLLBACK_FAILURE'],
 ['real lead write',f=>f.hold.rollback.proof.canonicalLeadWrites=1,'NO_REAL_WRITES_OR_IAM'],
 ['unknown configuration transition',f=>f.hold.rollback.proof.configuration.status='NO_CONFIGURATION_TRANSITION_RECORDED','CLOSED_CONFIGURATION_VERIFIED'],
 ['trigger deletion substituted',f=>f.hold.rollback.proof.trigger.status='ABSENCE_READBACK_VERIFIED','PREVIOUS_TRIGGER_RESTORED'],
 ['compensated traffic digest unmatched',f=>f.hold.rollback.proof.trigger.trafficReadbackDigest='1'.repeat(64),'TRAFFIC_PROJECTION_OBJECT']
])test('retained evidence rejects '+name+' even with valid object pins',async()=>{const f=fixture();change(f);f.seal();await assert.rejects(run(f),new RegExp(code));});
test('a valid already-restored compensation performs no claimed traffic write',async()=>{
 const f=fixture();f.hold.rollback.proof.trigger.status='EXACT_PREVIOUS_PREVIEW_REVISION_ALREADY_RESTORED';f.hold.rollback.proof.trigger.trafficWrites=0;f.seal();assert.equal((await run(f)).claimWrites,0);
});
test('re-admission requires an actual receipt after failure and never accepts the narrative checkpoint alone',async()=>{
 const f=fixture();f.admission.status='FAILURE';f.rewriteAdmission();await assert.rejects(run(f),/EXPLICIT_ADMISSION/);
 const early=fixture();early.admission.recordedAtUtc='2026-11-25T12:00:00Z';early.rewriteAdmission();await assert.rejects(run(early),/ADMISSION_AFTER_FINISHED_FAILURE/);
});

}
