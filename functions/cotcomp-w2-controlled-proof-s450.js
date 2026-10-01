'use strict';

const crypto=require('node:crypto');
const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const w2=require('./cotcomp-w2-workflow-projection-candidate-s446');
const h=require('./cotcomp-w2-readiness-harness-s448');

const VERSION='ays-cotcomp-s450-w2-controlled-write-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const TENANT_ID='alianzas-soluciones';
const TARGET_ADVISOR_ID='ase-paula-osorio';
const OWNER_CALLABLE='orbit360OpsLeadsCommand';
const STORAGE_MODE='legacyCompatible';

function clean(v,max=240){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function stable(v){
  if(v==null)return v;
  if(Array.isArray(v))return v.map(stable);
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){return sha(JSON.stringify(stable(v)));}
function eventId(requestId){return 'evt_'+sha(TENANT_ID+'|'+requestId).slice(0,28);}
function conflictRequestId(base){return clean(base+'-conflict',180);}
function fixtureFor(proofRunId){
  const run=clean(proofRunId,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  if(!/^s450-[A-Za-z0-9._:-]{4,90}$/.test(run)) throw new Error('S450_PROOF_RUN_ID_INVALID');
  const caseId='case_'+run;
  const journeyId='journey_'+run;
  const correlationId='corr_'+run;
  const projection=w2.buildSyntheticProjection({
    synthetic:true,
    projectId:PROJECT_ID,
    environment:'LAB',
    tenantId:TENANT_ID,
    caseId,
    journeyId,
    correlationId,
    quoteCasePath:'tenants/'+TENANT_ID+'/cotcomp/quoteCases/items/'+caseId,
    selectedProposalId:'proposal_'+run,
    product:'AUTO_SYNTHETIC',
    line:'AUTO_SYNTHETIC',
    country:'GT',
    currency:'GTQ',
    realData:false,
    production:false
  });
  if(!projection.ok) throw new Error('S450_PROJECTION_INVALID:'+projection.reasons.join(','));
  const journal=h.buildJournal({storageMode:STORAGE_MODE,projection});
  if(!journal.ok||journal.expectedCreatedDocuments!==8) throw new Error('S450_JOURNAL_INVALID');
  return {proofRunId:run,projection,journal};
}
function conflictJournal(projection){
  const entries=[];
  for(const command of projection.commands){
    const reqId=conflictRequestId(command.requestId);
    const evtId=eventId(reqId);
    entries.push(
      {component:'workflow_request',operation:command.operation,path:['tenants',TENANT_ID,'workflowRequests',reqId].join('/')},
      {component:'workflow_event',operation:command.operation,path:['tenants',TENANT_ID,'workflowEvents',evtId].join('/')},
      {component:'notification_outbox',operation:command.operation,path:['tenants',TENANT_ID,'notificationOutbox',evtId].join('/')}
    );
  }
  return Object.freeze(entries.map(Object.freeze));
}
function commandEnvelope(command,payloadOverride){
  const payload=Object.assign({},command.payload,payloadOverride||{});
  return {
    tenantId:TENANT_ID,
    operation:command.operation,
    entityId:command.entityId,
    requestId:command.requestId,
    reason:'CotComp S4.50 synthetic W2 controlled-write proof',
    payload
  };
}
function conflictEnvelope(command){
  return {
    tenantId:TENANT_ID,
    operation:command.operation,
    entityId:command.entityId,
    requestId:conflictRequestId(command.requestId),
    reason:'CotComp S4.50 synthetic W2 conflict-deny proof',
    payload:Object.assign({},command.payload,{
      prioridad:'Alta',
      nota:command.operation==='create_management'?'S450 conflict payload - must be denied':command.payload.nota
    })
  };
}
function assertExpectedOwned(entry,data,fixture,actorUid){
  if(!data||typeof data!=='object')throw new Error('S450_OWNERSHIP_DATA_REQUIRED');
  const command=fixture.projection.commands.find(c=>c.operation===entry.operation);
  if(!command)throw new Error('S450_OWNERSHIP_COMMAND_MISSING');
  const reqId=command.requestId;
  const evtId=eventId(reqId);
  if(entry.component==='workflow_entity'){
    if(!data.cotcompRef||data.cotcompRef.caseId!==fixture.projection.cotcompRefs[entry.operation==='create_business'?'business':'management'].caseId)throw new Error('S450_ENTITY_COTCOMPREF_MISMATCH');
    if(clean(data.createdByUid,180)!==actorUid)throw new Error('S450_ENTITY_ACTOR_MISMATCH');
    if(clean(data.origen,100)!=='CotComp')throw new Error('S450_ENTITY_ORIGIN_MISMATCH');
    if(clean(data.id,180)!==command.entityId)throw new Error('S450_ENTITY_ID_MISMATCH');
    return true;
  }
  if(entry.component==='workflow_event'){
    if(data.requestId!==reqId||data.entityId!==command.entityId||data.operation!==command.operation)throw new Error('S450_EVENT_IDENTITY_MISMATCH');
    if(!data.actor||clean(data.actor.uid,180)!==actorUid)throw new Error('S450_EVENT_ACTOR_MISMATCH');
    return true;
  }
  if(entry.component==='workflow_request'){
    if(data.status!=='committed'||data.operation!==command.operation||data.entityId!==command.entityId||data.eventId!==evtId)throw new Error('S450_REQUEST_IDENTITY_MISMATCH');
    return true;
  }
  if(entry.component==='notification_outbox'){
    if(data.status!=='pending_provider'||data.operation!==command.operation||data.entityId!==command.entityId||data.eventId!==evtId)throw new Error('S450_OUTBOX_IDENTITY_MISMATCH');
    if(!Array.isArray(data.targets)||!data.targets.some(t=>t&&t.type==='advisor'&&t.id===TARGET_ADVISOR_ID))throw new Error('S450_OUTBOX_TARGET_MISMATCH');
    return true;
  }
  throw new Error('S450_UNKNOWN_JOURNAL_COMPONENT');
}
async function readJournal(db,journal){
  const out={};
  for(const entry of journal.entries||journal){
    const snap=await db.doc(entry.path).get();
    out[entry.path]={
      exists:snap.exists,
      data:snap.exists?snap.data():null,
      digest:snap.exists?digest(snap.data()):null,
      updateTime:snap.updateTime?snap.updateTime.toDate().toISOString():null,
      component:entry.component,
      operation:entry.operation
    };
  }
  return out;
}
function allAbsent(map){return Object.values(map).every(x=>x.exists===false);}
function exactSnapshot(map){
  return Object.fromEntries(Object.entries(map).map(([path,row])=>[path,{exists:row.exists,digest:row.digest,updateTime:row.updateTime,component:row.component,operation:row.operation}]));
}
async function invokeCallable(idToken,data){
  const url='https://'+REGION+'-'+PROJECT_ID+'.cloudfunctions.net/'+OWNER_CALLABLE;
  const r=await fetch(url,{
    method:'POST',
    headers:{'content-type':'application/json','authorization':'Bearer '+idToken},
    body:JSON.stringify({data})
  });
  let body={};
  try{body=await r.json();}catch{}
  if(r.ok&&body&&body.result)return {ok:true,httpStatus:r.status,result:body.result};
  const e=body&&body.error?body.error:{};
  return {ok:false,httpStatus:r.status,errorStatus:clean(e.status,100),errorMessage:clean(e.message,300)};
}
async function exchangeCustomToken(apiKey,customToken){
  const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+encodeURIComponent(apiKey),{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({token:customToken,returnSecureToken:true})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok||!body.idToken)throw new Error('S450_CUSTOM_TOKEN_EXCHANGE_FAILED_'+r.status);
  return body.idToken;
}
function roleNorm(v){return clean(v,100).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
async function resolveActor(db,auth){
  const snap=await db.collection('tenants').doc(TENANT_ID).collection('members').get();
  const matches=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(row=>clean(row.advisorId||row.asesorId,180)===TARGET_ADVISOR_ID);
  if(matches.length!==1)throw new Error('S450_TARGET_MEMBERSHIP_COUNT_'+matches.length);
  const member=matches[0];
  const status=roleNorm(member.status||member.estado);
  if(member.active===false||member.activo===false||['inactive','inactivo','blocked','bloqueado'].includes(status))throw new Error('S450_TARGET_MEMBERSHIP_INACTIVE');
  const roles=[].concat(member.roles||[],member.activeRole||member.rolActivo||member.role||member.rol||[]).map(roleNorm).filter(Boolean);
  const perms=[].concat(member.permissions||[],member.permisosExtra||[],member.extras||[]).map(roleNorm).filter(Boolean);
  const adminRoles=new Set(['superadmin','admintenant','direccion','admin','operativo']);
  const managePerms=new Set(['ops manage','leads manage','gestiones manage','workflow manage']);
  if(!roles.some(r=>adminRoles.has(r))&&!perms.some(p=>managePerms.has(p)))throw new Error('S450_TARGET_CANNOT_MANAGE_WORKFLOW');
  const uid=clean(member.uid||member.userId||member.id,180);
  if(!uid)throw new Error('S450_TARGET_UID_MISSING');
  const user=await auth.getUser(uid);
  if(user.disabled)throw new Error('S450_TARGET_AUTH_DISABLED');
  return {uid,memberDocId:matches[0].id};
}

async function cleanupExact(db,fixture,actorUid,baseline){
  return db.runTransaction(async tx=>{
    const entries=fixture.journal.entries;
    const snaps=[];
    for(const entry of entries)snaps.push(await tx.get(db.doc(entry.path)));
    for(let i=0;i<entries.length;i++){
      const entry=entries[i],snap=snaps[i];
      if(!snap.exists)throw new Error('S450_CLEANUP_MISSING_'+entry.component+'_'+entry.operation);
      const data=snap.data();
      assertExpectedOwned(entry,data,fixture,actorUid);
      const currentDigest=digest(data);
      if(!baseline[entry.path]||baseline[entry.path].digest!==currentDigest)throw new Error('S450_CLEANUP_DIGEST_MISMATCH_'+entry.component+'_'+entry.operation);
    }
    for(const entry of entries)tx.delete(db.doc(entry.path));
    return {deleted:entries.length};
  });
}

async function runProof(){
  if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID)throw new Error('S450_PROJECT_MISMATCH');
  const proofRunId=clean(process.env.S450_PROOF_RUN_ID,100);
  const apiKey=clean(process.env.S450_FIREBASE_WEB_API_KEY,300);
  if(!apiKey)throw new Error('S450_WEB_API_KEY_REQUIRED');

  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);
  const auth=getAuth(app);
  const fixture=fixtureFor(proofRunId);
  const conflictEntries=conflictJournal(fixture.projection);
  const conflictPaths={entries:conflictEntries};

  const actor=await resolveActor(db,auth);
  const customToken=await auth.createCustomToken(actor.uid,{s450SyntheticProof:true,tenantId:TENANT_ID});
  const idToken=await exchangeCustomToken(apiKey,customToken);

  const initial=await readJournal(db,fixture.journal);
  const initialConflict=await readJournal(db,conflictPaths);
  if(!allAbsent(initial)||!allAbsent(initialConflict))throw new Error('S450_EXPECTED_PATHS_NOT_CLEAN_AT_START');

  let created=false;
  let firstRead=null;
  let receipt=null;
  try{
    const firstResponses=[];
    for(const command of fixture.projection.commands){
      const res=await invokeCallable(idToken,commandEnvelope(command));
      if(!res.ok)throw new Error('S450_FIRST_CALL_FAILED_'+command.operation+'_'+res.httpStatus+'_'+res.errorStatus);
      if(!res.result||res.result.ok!==true||res.result.operation!==command.operation||res.result.entityId!==command.entityId||res.result.requestId!==command.requestId||res.result.storageMode!==STORAGE_MODE)throw new Error('S450_FIRST_RESPONSE_MISMATCH_'+command.operation);
      firstResponses.push({operation:command.operation,httpStatus:res.httpStatus,reused:res.result.reused===true,entityId:res.result.entityId,requestId:res.result.requestId,eventId:res.result.eventId,storageMode:res.result.storageMode});
    }
    created=true;

    firstRead=await readJournal(db,fixture.journal);
    if(Object.values(firstRead).some(x=>!x.exists))throw new Error('S450_FIRST_READBACK_MISSING_DOCUMENT');
    for(const entry of fixture.journal.entries)assertExpectedOwned(entry,firstRead[entry.path].data,fixture,actor.uid);
    const firstSnapshot=exactSnapshot(firstRead);

    const retryResponses=[];
    for(const command of fixture.projection.commands){
      const res=await invokeCallable(idToken,commandEnvelope(command));
      if(!res.ok||!res.result||res.result.reused!==true)throw new Error('S450_RETRY_NOT_REUSED_'+command.operation);
      retryResponses.push({operation:command.operation,httpStatus:res.httpStatus,reused:true,entityId:res.result.entityId,requestId:res.result.requestId,eventId:res.result.eventId,storageMode:res.result.storageMode});
    }
    const afterRetry=await readJournal(db,fixture.journal);
    const retryUnchanged=fixture.journal.entries.every(entry=>{
      const a=firstRead[entry.path],b=afterRetry[entry.path];
      return b.exists===true&&a.digest===b.digest&&a.updateTime===b.updateTime;
    });
    if(!retryUnchanged)throw new Error('S450_RETRY_MUTATED_JOURNAL');

    const conflictResults=[];
    for(const command of fixture.projection.commands){
      const res=await invokeCallable(idToken,conflictEnvelope(command));
      if(res.ok)throw new Error('S450_CONFLICT_NOT_DENIED_'+command.operation);
      if(!['ALREADY_EXISTS','FAILED_PRECONDITION'].includes(res.errorStatus))throw new Error('S450_CONFLICT_UNEXPECTED_STATUS_'+command.operation+'_'+res.errorStatus);
      conflictResults.push({operation:command.operation,httpStatus:res.httpStatus,denied:true,errorStatus:res.errorStatus});
    }
    const conflictArtifacts=await readJournal(db,conflictPaths);
    if(!allAbsent(conflictArtifacts))throw new Error('S450_CONFLICT_CREATED_ARTIFACTS');
    const afterConflict=await readJournal(db,fixture.journal);
    const conflictUnchanged=fixture.journal.entries.every(entry=>{
      const a=firstRead[entry.path],b=afterConflict[entry.path];
      return b.exists===true&&a.digest===b.digest&&a.updateTime===b.updateTime;
    });
    if(!conflictUnchanged)throw new Error('S450_CONFLICT_MUTATED_ORIGINAL_JOURNAL');

    const cleanup=await cleanupExact(db,fixture,actor.uid,firstRead);
    if(cleanup.deleted!==8)throw new Error('S450_CLEANUP_COUNT_INVALID');
    const finalRead=await readJournal(db,fixture.journal);
    const finalConflictRead=await readJournal(db,conflictPaths);
    if(!allAbsent(finalRead)||!allAbsent(finalConflictRead))throw new Error('S450_FINAL_ABSENCE_FAILED');

    receipt={
      schemaVersion:'ays-cotcomp-s450-w2-controlled-write-proof-v1.0',
      version:VERSION,
      projectId:PROJECT_ID,
      region:REGION,
      tenantId:TENANT_ID,
      ownerCallable:OWNER_CALLABLE,
      storageMode:STORAGE_MODE,
      proofRunId,
      syntheticOnly:true,
      actor:{advisorId:TARGET_ADVISOR_ID,uidHash:sha(actor.uid),memberDocIdHash:sha(actor.memberDocId)},
      projection:{
        businessId:fixture.projection.ids.businessId,
        managementId:fixture.projection.ids.managementId,
        businessRequestId:fixture.projection.ids.businessRequestId,
        managementRequestId:fixture.projection.ids.managementRequestId,
        businessEventId:eventId(fixture.projection.ids.businessRequestId),
        managementEventId:eventId(fixture.projection.ids.managementRequestId),
        journalDigest:fixture.journal.journalDigest,
        expectedDocuments:8
      },
      firstCall:{pass:true,responses:firstResponses,createdDocuments:8},
      firstReadback:{pass:true,documentCount:8,snapshot:firstSnapshot},
      retry:{pass:true,writes:0,duplicateCreated:false,journalUnchanged:true,responses:retryResponses},
      conflict:{pass:true,writes:0,originalJournalUnchanged:true,conflictArtifactsCreated:0,results:conflictResults},
      providerDelivery:{executed:false,outboxDocumentCount:2,outboxStatus:'pending_provider'},
      cleanup:{pass:true,deletes:8},
      finalAbsence:{pass:true,documentCount:0,conflictArtifactCount:0},
      writeAccounting:{
        createWrites:8,
        retryWrites:0,
        conflictWrites:0,
        deleteWrites:8,
        totalAppDataMutations:16,
        netPersistentDocuments:0
      },
      boundaries:{
        realClientOrBusinessDataTouched:false,
        productionTouched:false,
        providerDeliveryExecuted:false,
        proposalPersistence:false,
        selectionPersistence:false,
        configMutation:false,
        iamMutation:false
      }
    };
    return receipt;
  }catch(err){
    if(created&&firstRead){
      try{
        await cleanupExact(db,fixture,actor.uid,firstRead);
      }catch(cleanupErr){
        throw new Error('S450_PROOF_FAILED_AND_CLEANUP_FAILED:'+clean(err&&err.message,220)+':'+clean(cleanupErr&&cleanupErr.message,220));
      }
      const postFail=await readJournal(db,fixture.journal);
      if(!allAbsent(postFail))throw new Error('S450_FAILSAFE_CLEANUP_FINAL_ABSENCE_FAILED');
    }
    throw err;
  }
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,TENANT_ID,TARGET_ADVISOR_ID,OWNER_CALLABLE,STORAGE_MODE,
  sha,digest,eventId,conflictRequestId,fixtureFor,conflictJournal,commandEnvelope,conflictEnvelope,
  assertExpectedOwned,readJournal,allAbsent,exactSnapshot,runProof
});

if(require.main===module){
  runProof().then(receipt=>{
    process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
  }).catch(err=>{
    console.error(clean(err&&err.stack||err&&err.message||err,1200));
    process.exit(1);
  });
}
