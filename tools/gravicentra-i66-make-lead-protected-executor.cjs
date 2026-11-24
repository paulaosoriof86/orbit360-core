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
async function deployedFunction(auth,p,phase){
  const response=await auth.request({url:'https://cloudfunctions.googleapis.com/v2/'+resource(phase),method:'GET'});
  return fnProjection(response.data,p,phase);
}
async function optionalFunction(auth,p,phase){
  try{return await deployedFunction(auth,p,phase);}catch(error){if(Number(error?.response?.status)===404)return null;throw error;}
}
async function snapshotTrigger({auth,p,phase}){
  const actual=await optionalFunction(auth,p,phase),before=p.makeIngress.targetBefore[phase];
  if(before.state==='ABSENT')assert.equal(actual,null,'INGRESS_TRIGGER_PREIMAGE_NOT_ABSENT');
  else{assert.ok(actual,'INGRESS_TRIGGER_PREIMAGE_MISSING');assert.equal(actual.revision,before.revision);
    assert.equal(actual.configurationDigest,before.configurationDigest,'INGRESS_TRIGGER_PREIMAGE_CONFIGURATION_CHANGED');}
  return{schema:'GI_I66_MAKE_TRIGGER_SNAPSHOT_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    previousState:before.state,function:actual};
}
async function captureTrigger({auth,p,phase,snapshot}){
  assert.equal(snapshot?.schema,'GI_I66_MAKE_TRIGGER_SNAPSHOT_V1');assert.equal(snapshot.phase,phase);
  assert.equal(snapshot.sourceSha,p.sourceSha);assert.equal(snapshot.artifactDigest,p.artifactDigest);
  const fn=await deployedFunction(auth,p,phase);
  if(snapshot.function)assert.notEqual(fn.revision,snapshot.function.revision,'INGRESS_TRIGGER_REVISION_NOT_CHANGED');
  return{schema:'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    previousState:snapshot.previousState,previousRevision:snapshot.function?.revision||null,function:fn};
}
async function rollbackCreatedTrigger({auth,p,phase,snapshot,postimage,deleteFunction,restorePreviousRevision}){
  assert.equal(snapshot?.schema,'GI_I66_MAKE_TRIGGER_SNAPSHOT_V1');assert.equal(snapshot.phase,phase);
  assert.equal(snapshot.sourceSha,p.sourceSha);assert.equal(snapshot.artifactDigest,p.artifactDigest);
  if(snapshot.previousState!=='ABSENT'){
    if(phase==='live')return{status:'RESTORE_PREVIOUS_REVISION_BY_EXISTING_OWNER',functionDeletes:0};
    assert.ok(snapshot.function,'INGRESS_PREVIOUS_TRIGGER_SNAPSHOT_REQUIRED');
    const current=await deployedFunction(auth,p,phase);
    assert.equal(current.service,snapshot.function.service,'INGRESS_PREVIEW_ROLLBACK_SERVICE_CHANGED');
    if(c.digest(current)===c.digest(snapshot.function))
      return{status:'PREVIOUS_TRIGGER_UNCHANGED_NO_RESTORE_REQUIRED',functionDeletes:0,trafficWrites:0};
    assert.equal(postimage?.schema,'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1','INGRESS_TRIGGER_POSTIMAGE_REQUIRED_FOR_RESTORE');
    assert.equal(postimage.phase,phase);assert.equal(postimage.sourceSha,p.sourceSha);assert.equal(postimage.artifactDigest,p.artifactDigest);
    assert.deepEqual(current,postimage.function,'INGRESS_TRIGGER_ROLLBACK_POSTIMAGE_CHANGED');
    assert.equal(typeof restorePreviousRevision,'function');await restorePreviousRevision(snapshot.function);
    return{status:'EXACT_PREVIOUS_PREVIEW_REVISION_RESTORED',functionDeletes:0};
  }
  const current=await optionalFunction(auth,p,phase);
  if(current===null)return{status:'ABSENCE_READBACK_VERIFIED',functionDeletes:0};
  assert.equal(postimage?.schema,'GI_I66_MAKE_TRIGGER_POSTIMAGE_V1','INGRESS_TRIGGER_POSTIMAGE_REQUIRED_FOR_DELETE');
  assert.equal(postimage.phase,phase);assert.equal(postimage.sourceSha,p.sourceSha);assert.equal(postimage.artifactDigest,p.artifactDigest);
  assert.deepEqual(current,postimage.function,'INGRESS_TRIGGER_ROLLBACK_POSTIMAGE_CHANGED');
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
async function beforeDeploy({db,auth,p,phase,requireFrom,privateFile,authorityBlob}){
  const grant=await support.grantRef(db,phase==='preview').get(),expected=p.makeIngress.closedConfiguration[phase].expectedDigest;
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
  if(gs.data().state==='CLOSED'&&gs.data().enabled===false)return{status:'CLOSED_CONFIG_READBACK_VERIFIED',configurationWrites:0};
  const fn={...deployment.function,...deployment.rules};
  return config.transition({db,action:'CLOSE',previewOnly:phase==='preview',expectedDigest,
    authority:configAuthority(p,phase,fn,authorityBlob)});
}
async function initializeClosed({db,auth,p,phase,authorityBlob,eventarcBefore,nowMs=Date.now()}){
  const projectIamReadback=await verifyProjectIamUnchanged(auth,eventarcBefore);
  const fn=await deployedFunction(auth,p,phase),rules=await deployedRules(auth,p),spec=p.makeIngress.closedConfiguration?.[phase];
  assert.ok(spec&&(spec.expectedDigest==='ABSENT'||sha64(spec.expectedDigest))&&sha64(spec.nonce),'INGRESS_CLOSED_CONFIG_AUTHORITY_REQUIRED');
  const result=await config.transition({db,action:spec.expectedDigest==='ABSENT'?'INITIALIZE_CLOSED':'PREPARE_CLOSED',previewOnly:phase==='preview',
    expectedDigest:spec.expectedDigest,authority:configAuthority(p,phase,{...fn,...rules},authorityBlob),nonce:spec.nonce,nowMs});
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
function refreshAuthority(p){
  const token=process.env.GH_TOKEN;assert.ok(token,'INGRESS_GITHUB_READ_CREDENTIAL_REQUIRED');
  // No token is echoed, persisted or placed in a shell command.
  const header='Authorization: basic '+Buffer.from('x-access-token:'+token).toString('base64');
  execFileSync('git',['-c','http.https://github.com/.extraheader='+header,'fetch','--no-tags',
    'https://github.com/paulaosoriof86/orbit360-core.git','recovery/fase-a-clean-20260831'],{stdio:'pipe',timeout:30000});
  const head=execFileSync('git',['rev-parse','FETCH_HEAD'],{encoding:'utf8'}).trim();
  execFileSync('git',['merge-base','--is-ancestor',p.sourceSha,head],{stdio:'pipe'});
  assert.equal(execFileSync('git',['diff','--name-only',p.sourceSha,head,'--',...g.PINNED_OWNER_PATHS],{encoding:'utf8'}).trim(),'',
    'INGRESS_SOURCE_OR_QA_CHANGED_DURING_CONFIGURATION');
  const read=file=>execFileSync('git',['show',head+':'+file]);
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
async function rollback({db,auth,p,phase,requireFrom,authorityBlob,directory=process.env.RUNNER_TEMP,deleteFunction,restorePreviousRevision}){
  const readOptional=name=>{const file=path.join(directory,name);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;};
  const deployment=readOptional(`gi-make-${phase}-initialize-closed.json`),progress=readOptional(`gi-make-${phase}-last-operation.json`);
  const report={schema:'GI_I66_MAKE_RELEASE_COMPENSATION_V1',phase,sourceSha:p.sourceSha,artifactDigest:p.artifactDigest,
    status:'HOLD',configuration:null,trigger:null,secretIam:null,canonicalLeadWrites:0,externalMessagesSent:0,failures:[]};
  try{report.configuration=await closeForRollback({db,p,phase,deployment,
    expectedDigest:progress?.afterDigest||deployment?.config?.afterDigest,authorityBlob});}
  catch{report.failures.push('CONFIGURATION_CLOSE_UNVERIFIED');}
  // Do not remove the endpoint or its permission while a known active grant
  // could be left behind. Both LIVE and Preview begin with CLOSED/absent grants.
  if(!report.failures.length){
    const snapshot=readOptional(`gi-make-${phase}-snapshot-trigger.json`),postimage=readOptional(`gi-make-${phase}-capture-trigger.json`);
    try{report.trigger=snapshot?await rollbackCreatedTrigger({auth,p,phase,snapshot,postimage,deleteFunction,restorePreviousRevision}):
      {status:'NO_TRIGGER_MUTATION_STARTED',functionDeletes:0};}catch{report.failures.push('TRIGGER_ROLLBACK_UNVERIFIED');}
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
      }catch{report.failures.push('EXACT_SECRET_IAM_ROLLBACK_UNVERIFIED');}
    }
  }
  report.status=report.failures.length?'HOLD':'COMPENSATION_READBACK_VERIFIED';
  fs.writeFileSync(path.join(directory,`gi-make-${phase}-rollback.json`),JSON.stringify(report,null,2)+'\n');
  if(report.failures.length)throw Object.assign(Error('INGRESS_ROLLBACK_UNVERIFIED'),{code:'INGRESS_ROLLBACK_UNVERIFIED',report});
  return report;
}
async function main(){
  assert.equal(process.env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core');assert.equal(process.env.GITHUB_REF_NAME,'recovery/fase-a-clean-20260831');
  const [action,phase]=process.argv.slice(2);assert.ok(['before-deploy','snapshot-trigger','capture-trigger','initialize-closed','operate','wait-probe','wait-config','rollback'].includes(action));
  const control=JSON.parse(fs.readFileSync(g.CONTROL)),p=resolveCandidate(control,phase,action==='operate');scope.verifySourcePins(p);
  assert.equal(execFileSync('git',['diff','--name-only',p.sourceSha,'HEAD','--',...g.PINNED_OWNER_PATHS],{encoding:'utf8'}).trim(),'',
    'INGRESS_CHECKOUT_SOURCE_OR_QA_CHANGED');
  const root=process.env.I66_PACKAGE_ROOT;assert.ok(root,'INGRESS_EXACT_PACKAGE_REQUIRED');
  const requireFrom=createRequire(path.join(root,'bundle/backend/package.json'));
  const {GoogleAuth}=requireFrom('google-auth-library'),auth=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform'],projectId:PROJECT}).getClient();
  const {getApps,initializeApp,applicationDefault}=requireFrom('firebase-admin/app'),{getFirestore}=requireFrom('firebase-admin/firestore');
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT}),db=getFirestore(app);
  const authorityBlob=execFileSync('git',['rev-parse','HEAD:'+g.CONTROL],{encoding:'utf8'}).trim();
  let report;
  if(action==='before-deploy')report=await beforeDeploy({db,auth,p,phase,requireFrom,authorityBlob,
    privateFile:path.join(process.env.RUNNER_TEMP,'gi-make-secret-iam-private.json')});
  else if(action==='snapshot-trigger')report=await snapshotTrigger({auth,p,phase});
  else if(action==='capture-trigger')report=await captureTrigger({auth,p,phase,
    snapshot:JSON.parse(fs.readFileSync(path.join(process.env.RUNNER_TEMP,`gi-make-${phase}-snapshot-trigger.json`)))});
  else if(action==='rollback')report=await rollback({db,auth,p,phase,requireFrom,authorityBlob,deleteFunction:async target=>{
    execFileSync('gcloud',['functions','delete',target.name,'--gen2','--region',target.region,'--project',PROJECT,'--quiet'],{stdio:'pipe',timeout:180000});},
    restorePreviousRevision:async fn=>{const service=String(fn.service||'').split('/').at(-1);assert.match(service,/^[a-z][a-z0-9-]+$/);
      execFileSync('gcloud',['run','services','update-traffic',service,'--region',fn.region,'--project',PROJECT,'--to-revisions',fn.revision+'=100','--quiet'],{stdio:'pipe',timeout:120000});
      const row=JSON.parse(execFileSync('gcloud',['run','services','describe',service,'--region',fn.region,'--project',PROJECT,'--format=json'],{encoding:'utf8',stdio:'pipe'}));
      const active=(row.status?.traffic||row.traffic||[]).filter(v=>Number(v.percent)>0);assert.equal(active.length,1);
      assert.equal(Number(active[0].percent),100);assert.equal(active[0].revisionName||active[0].revision,fn.revision);}});
  else if(action==='initialize-closed')report=await initializeClosed({db,auth,p,phase,authorityBlob,
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
    configDigest:report.afterDigest||report.config?.afterDigest||null,canonicalLeadWrites:report.canonicalLeadWrites||0,
    externalMessagesSent:0,reportBlobSha:gitBlob(fs.readFileSync(file)),reportSha256:sha256(fs.readFileSync(file))}));
}
if(require.main===module)main().catch(error=>{console.error(/^INGRESS_[A-Z0-9_]+$/.test(error?.code||'')?error.code:'I66_MAKE_PROTECTED_EXECUTION_HOLD');process.exitCode=1;});
module.exports={fnProjection,requireOperation,resolveCandidate,readBoundJson,verifyMakeExecution,deployedRules,deployedFunction,
  optionalFunction,snapshotTrigger,captureTrigger,rollbackCreatedTrigger,closeForRollback,rollback,
  proveCurrentDeployment,configAuthority,verifyProbeReadback,runtimeServices,beforeDeploy,initializeClosed,operate,
  verifyProjectIamUnchanged,validateProjectIamReadback,
  proofContext,canonicalRefs,snapshotRefs,readResult,inspectCanonical,captureOrVerify,refreshAuthority,waitConfiguration};
