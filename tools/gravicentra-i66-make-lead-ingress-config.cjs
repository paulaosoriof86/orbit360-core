'use strict';

// Invoked by the existing protected Preview/LIVE release lane, never by Make
// or the browser. All configuration/audit paths are outside operational /data.
const c=require('../functions/product-lead-ingress-contract');
const support=require('../functions/product-lead-ingress-owner-support');
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{1,179}$/;
const ROOT='tenants/'+c.TENANT;
const sha40=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const sha64=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const copy=v=>JSON.parse(JSON.stringify(v));
function authority(a,preview){
  c.need(a&&a.scopeContractBlob===c.SCOPE_CONTRACT_BLOB&&sha40(a.receiptBlobSha)&&sha40(a.sourceSha),
    'INGRESS_CONFIG_REVIEWED_AUTHORITY_REQUIRED');
  c.need(a.phase===(preview?'preview':'live')&&a.functionName===(preview?'orbit360MakeLeadIngressPreview':'orbit360MakeLeadIngress')&&
    a.region===(preview?'us-east1':'us-central1')&&a.authContextEventType==='google.cloud.firestore.document.v1.created.withAuthContext'&&
    typeof a.functionRevision==='string'&&a.functionRevision.length>0&&a.runtimeIdentityVerified===true&&
    a.queueRulesDenyClient===true&&a.sourceAndArtifactVerified===true,'INGRESS_CONFIG_DEPLOYMENT_PROOF_REQUIRED');
  return a;
}
function closedGrant(a,{previewOnly,nonce,nowMs}){
  authority(a,previewOnly);c.need(sha64(nonce),'INGRESS_CONFIG_PROBE_NONCE_REQUIRED');
  return{schema:c.GRANT_SCHEMA,enabled:false,state:'CLOSED',tenantId:c.TENANT,country:c.COUNTRY,provider:'greenapi',
    instanceId:c.INSTANCE,scenarioId:c.SCENARIO,firestoreConnectionId:c.FIRESTORE_CONNECTION,integrationId:c.INTEGRATION,
    phase:previewOnly?'preview':'live',operation:'create_business',module:'leads',sourceType:'ad',
    externalSendAllowed:false,policyWritesAllowed:false,membershipWritesAllowed:false,
    authType:'',principalSha256:'',assignment:'pending_operations',maxSourceAgeSeconds:900,
    authority:{scopeContractBlob:c.SCOPE_CONTRACT_BLOB,receiptBlobSha:a.receiptBlobSha,sourceSha:a.sourceSha,principalObserved:false},
    deployedFunction:{name:a.functionName,region:a.region,revision:a.functionRevision},
    probe:{enabled:true,nonce,expiresAt:new Date(nowMs+300000).toISOString()}};
}
function verifyProbe(before,proof,queue,requestId,makeExecution,preview){
  c.need(before&&before.enabled===false&&before.state==='CLOSED'&&!before.principalSha256,'INGRESS_CONFIG_BIND_REQUIRES_CLOSED');
  c.need(proof?.schema==='GI_I66_MAKE_LEAD_PRINCIPAL_PROBE_RESULT_V1'&&proof.status==='PRINCIPAL_OBSERVED_ONLY'&&
    proof.phase===(preview?'preview':'live')&&proof.requestId===requestId&&proof.tenantId===c.TENANT&&proof.country===c.COUNTRY&&
    proof.provider==='greenapi'&&proof.instanceId===c.INSTANCE&&proof.scenarioId===c.SCENARIO&&
    proof.firestoreConnectionId===c.FIRESTORE_CONNECTION&&proof.grantDigest===c.digest(before)&&
    proof.nonce===before.probe.nonce&&proof.envelopeDigest===c.digest(queue)&&
    queue?.schema===c.PROBE_SCHEMA&&queue.nonce===before.probe.nonce,
    'INGRESS_CONFIG_PRINCIPAL_PROBE_BINDING_MISMATCH');
  const unsigned={...proof};delete unsigned.proofDigest;
  c.need(proof.proofDigest===c.digest(unsigned)&&['service_account','unknown'].includes(proof.authType)&&sha64(proof.principalSha256)&&
    proof.canonicalLeadWrites===0&&proof.canonicalAuditWrites===0&&proof.notificationsCreated===0&&
    proof.externalMessagesSent===0&&proof.providerRequests===0&&proof.principalBound===false,
    'INGRESS_CONFIG_PRINCIPAL_PROBE_NOT_INNOCUOUS');
  const document=`projects/ays-orbit-360-lab/databases/(default)/documents/${ROOT}/${preview?c.PREVIEW_QUEUE:c.QUEUE}/${requestId}`;
  c.need(makeExecution&&makeExecution.status==='success'&&makeExecution.scenarioId===c.SCENARIO&&
    makeExecution.connectionId===c.FIRESTORE_CONNECTION&&makeExecution.module==='google-cloud-firestore:createDocument'&&
    makeExecution.documentName===document&&typeof makeExecution.executionId==='string'&&makeExecution.executionId.length>=8&&
    sha40(makeExecution.receiptBlobSha),'INGRESS_CONFIG_MAKE_EXECUTION_BINDING_REQUIRED');
}
function previewEvidence(p,a){
  c.need(p?.schema==='GI_I66_MAKE_LEAD_INGRESS_PREVIEW_PROOF_V1'&&p.sourceSha===a.sourceSha&&sha64(p.artifactSha256)&&
    sha64(p.reportSha256)&&sha40(p.reportBlobSha)&&p.authenticatedMakeQueue===true&&p.providerFixtureIsSynthetic===true&&
    p.pendingOperationsCanonicalLead===true&&p.canonicalReadback===true&&p.replayCanonicalWrites===0&&
    p.rejectCanonicalWrites===0&&p.externalMessagesSent===0&&p.noOtherOperationalMutations===true,
    'INGRESS_CONFIG_SIGNED_PREVIEW_PROOF_REQUIRED');
}
async function transition({db,action,previewOnly=false,expectedDigest,authority:auth,nonce,probeRequestId,makeExecution,
  qaFixture,previewProof,providerReadiness,nowMs=Date.now()}){
  c.need(db&&Number.isFinite(nowMs)&&['INITIALIZE_CLOSED','PREPARE_CLOSED','BIND_PRINCIPAL','ACTIVATE','CLOSE'].includes(action),'INGRESS_CONFIG_ACTION_INVALID');
  authority(auth,previewOnly);c.need(expectedDigest==='ABSENT'||sha64(expectedDigest),'INGRESS_CONFIG_EXPECTED_DIGEST_REQUIRED');
  const ref=support.grantRef(db,previewOnly),auditKey=c.sha(action+'|'+ref.path+'|'+expectedDigest+'|'+auth.receiptBlobSha);
  const auditRef=db.doc(ROOT+'/leadIngressConfigurationAudit/'+auditKey);
  const requestDigest=c.digest({action,previewOnly,expectedDigest,authority:auth,nonce,probeRequestId,makeExecution,qaFixture,previewProof,providerReadiness});
  const committed=await db.runTransaction(async tx=>{
    const [gs,oldAudit]=await Promise.all([tx.get(ref),tx.get(auditRef)]),before=gs.exists?gs.data():null;
    if(oldAudit.exists){
      const old=oldAudit.data();c.need(old.requestDigest===requestDigest,'INGRESS_CONFIG_REPLAY_INTENT_CHANGED');
      c.need(before&&c.digest(before)===old.afterDigest,'INGRESS_CONFIG_REPLAY_CURRENT_STATE_CHANGED');
      return{...old,reused:true,configurationWrites:0,auditWrites:0};
    }
    c.need((before?c.digest(before):'ABSENT')===expectedDigest,'INGRESS_CONFIG_CAS_PREIMAGE_CHANGED');
    let next;
    if(action==='INITIALIZE_CLOSED'||action==='PREPARE_CLOSED'){
      if(action==='INITIALIZE_CLOSED')c.need(before===null,'INGRESS_CONFIG_ALREADY_EXISTS');
      else c.need(before?.schema===c.GRANT_SCHEMA&&before.authority?.scopeContractBlob===c.SCOPE_CONTRACT_BLOB&&
        before.phase===(previewOnly?'preview':'live')&&before.enabled===false&&before.state==='CLOSED','INGRESS_CONFIG_SUCCESSOR_REQUIRES_CLOSED');
      next=closedGrant(auth,{previewOnly,nonce,nowMs});
    }else{
      c.need(before?.schema===c.GRANT_SCHEMA&&before.authority?.scopeContractBlob===c.SCOPE_CONTRACT_BLOB&&
        before.phase===(previewOnly?'preview':'live'),'INGRESS_CONFIG_SCOPE_MISMATCH');
      c.need(before.authority.sourceSha===auth.sourceSha&&before.deployedFunction?.revision===auth.functionRevision,
        'INGRESS_CONFIG_DEPLOYMENT_CHANGED');
      next=copy(before);
      if(action==='BIND_PRINCIPAL'){
        c.need(SAFE_ID.test(probeRequestId||''),'INGRESS_CONFIG_PROBE_ID_REQUIRED');
        const [proofSnap,queueSnap]=await Promise.all([
          tx.get(db.doc(`${ROOT}/${previewOnly?'previewLeadIngressResults':'leadIngressResults'}/${probeRequestId}`)),
          tx.get(db.doc(`${ROOT}/${previewOnly?c.PREVIEW_QUEUE:c.QUEUE}/${probeRequestId}`))]);
        c.need(proofSnap.exists&&queueSnap.exists,'INGRESS_CONFIG_PROBE_READBACK_REQUIRED');
        const proof=proofSnap.data();verifyProbe(before,proof,queueSnap.data(),probeRequestId,makeExecution,previewOnly);
        next.state='BOUND';next.enabled=false;next.authType=proof.authType;next.principalSha256=proof.principalSha256;
        next.probe.enabled=false;next.authority={...next.authority,receiptBlobSha:auth.receiptBlobSha,principalObserved:true,
          principalProbeDigest:proof.proofDigest,principalProbeRequestId:probeRequestId,makeExecutionReceiptBlob:makeExecution.receiptBlobSha};
      }else if(action==='ACTIVATE'){
        c.need(before.state==='BOUND'&&before.enabled===false&&before.authority.principalObserved===true&&
          sha64(before.principalSha256)&&sha64(before.authority.principalProbeDigest),'INGRESS_CONFIG_ACTIVATION_REQUIRES_BOUND');
        if(previewOnly){
          c.need(qaFixture&&sha64(qaFixture.nonce)&&qaFixture.providerPacketSha256===c.digest(qaFixture.packet)&&
            qaFixture.packet?.type==='incoming'&&qaFixture.packet?.extendedTextMessage?.sourceType==='ad'&&
            qaFixture.packet.timestamp*1000>=nowMs&&qaFixture.packet.timestamp*1000<=nowMs+300000,
            'INGRESS_CONFIG_APPROVED_SYNTHETIC_FIXTURE_REQUIRED');
          next.qaFixture=copy(qaFixture);
        }else{
          previewEvidence(previewProof,auth);
          c.need(providerReadiness?.secretVersionAccessible===true&&providerReadiness.rootTenantCountryInstanceMatch===true&&
            providerReadiness.apiTokenFormatUsable===true&&providerReadiness.apiOriginAllowed===true&&
            providerReadiness.runtimeSecretAccessVerified===true&&providerReadiness.providerAuthorized===true&&
            providerReadiness.settingsIdentityMatches===true,'INGRESS_CONFIG_PROVIDER_READINESS_REQUIRED');
          next.authority.previewReportBlobSha=previewProof.reportBlobSha;next.authority.previewReportSha256=previewProof.reportSha256;
        }
        next.state='ACTIVE';next.enabled=true;next.probe.enabled=false;
        // This timestamp is created by the protected transition, never copied
        // from an older message. Polling cannot implicitly backfill history.
        next.activationNotBefore=new Date(nowMs).toISOString();next.authority.receiptBlobSha=auth.receiptBlobSha;
      }else{next.state='CLOSED';next.enabled=false;next.probe.enabled=false;next.closedAt=new Date(nowMs).toISOString();}
    }
    const record={schema:'GI_I66_MAKE_LEAD_CONFIGURATION_TRANSITION_V1',action,phase:previewOnly?'preview':'live',
      sourceSha:auth.sourceSha,authorityReceiptBlob:auth.receiptBlobSha,requestDigest,beforeDigest:expectedDigest,afterDigest:c.digest(next),
      beforeSnapshot:before,afterSnapshot:next,
      state:next.state,enabled:next.enabled,configurationWrites:1,auditWrites:1,canonicalLeadWrites:0,
      notificationsCreated:0,externalMessagesSent:0,principalSha256:next.principalSha256||'',recordedAt:new Date(nowMs).toISOString()};
    tx.set(ref,next,{merge:false});tx.create(auditRef,record);return record;
  });
  try{
    const after=await ref.get(),audit=await auditRef.get();
    c.need(after.exists&&audit.exists&&c.digest(after.data())===committed.afterDigest&&
      audit.data().afterDigest===committed.afterDigest,'INGRESS_CONFIG_COMMITTED_READBACK_HOLD');
    const safe={...committed};delete safe.beforeSnapshot;delete safe.afterSnapshot;
    return{...safe,configReadback:true,auditReadback:true};
  }catch(error){error.ingressConfigCommitOutcome={configurationWrites:committed.configurationWrites,
    auditWrites:committed.auditWrites,canonicalLeadWrites:0};throw error;}
}
module.exports={authority,closedGrant,verifyProbe,previewEvidence,transition};
