'use strict';

const fs=require('node:fs');
const crypto=require('node:crypto');
const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const data=require('./cotcomp-runtime-data-contract');
const proposals=require('./cotcomp-proposal-contracts');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');
const selection=require('./cotcomp-selection-contract-s455');
const intake=require('./cotcomp-pilot-intake-s467');

const VERSION='ays-cotcomp-s468-w5-real-submission-execution-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const REGION='us-central1';
const TENANT_ID='alianzas-soluciones';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const COUNTRY='GT';
const TARGET_ADVISOR_ID='ase-paula-osorio';
const TARGET_EMAIL_HASH='9b663847979724e9491e1c655da32a7cb17a5f6ed26dba352de1eb811254b23f';
const OWNER_CALLABLE='orbit360OpsLeadsCommand';
const MAX_SCAN=8;
const AS_OF='2026-10-15T12:00:00Z';
const CONSENT_TEXT='Autorizo gestionar esta solicitud y contactarme';

function clean(v,max=240){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function stable(v){
  if(v==null)return v;
  if(v instanceof Date)return v.toISOString();
  if(typeof v.toDate==='function')return v.toDate().toISOString();
  if(Array.isArray(v))return v.map(stable);
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function digest(v){return sha(JSON.stringify(stable(v)));}
function eventId(requestId){return 'evt_'+sha(TENANT_ID+'|'+requestId).slice(0,28);}
function roleNorm(v){return clean(v,100).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function iso(v){
  try{
    if(v&&typeof v.toDate==='function')return v.toDate().toISOString();
    const d=new Date(String(v||'')); return Number.isFinite(d.getTime())?d.toISOString():null;
  }catch{return null;}
}
function isSynthetic(d){
  return d&&(
    d.synthetic===true ||
    !!clean(d.proofRunId,120) ||
    !!(d.provenance&&d.provenance.synthetic===true)
  );
}
function contactPresent(d){
  const c=d&&d.contact&&typeof d.contact==='object'?d.contact:{};
  return !!clean(c.name,180)&&!!clean(c.whatsapp,80)&&!!clean(c.email,220);
}
function capturedIsMinimumAuto(d){
  const c=d&&d.capturedFields&&typeof d.capturedFields==='object'?d.capturedFields:{};
  const keys=Object.keys(c).sort();
  return keys.length===2&&keys[0]==='brand'&&keys[1]==='lineModel'&&!!clean(c.brand,180)&&!!clean(c.lineModel,180);
}
function consentValid(d){
  const c=d&&d.consents&&typeof d.consents==='object'?d.consents:{};
  return c.requestManagement===true &&
    clean(c.requestManagementText,220)===CONSENT_TEXT &&
    c.marketing!==true &&
    !!clean(c.requestManagementSource,180) &&
    !!iso(c.requestManagementCapturedAt);
}
function intakeEligible(row){
  const d=row&&row.data||{};
  return !isSynthetic(d) &&
    clean(d.tenantId,180)===TENANT_ID &&
    clean(d.journeyId,180)===JOURNEY_ID &&
    clean(d.country,8).toUpperCase()===COUNTRY &&
    clean(d.source,100)==='PUBLIC_WEB' &&
    clean(d.intent,100).toUpperCase()==='COTIZAR' &&
    clean(d.riskOrProductCandidate,100).toUpperCase()==='AUTO' &&
    clean(d.mode,80).toUpperCase()==='HYBRID' &&
    clean(d.status,80)==='SUBMITTED' &&
    contactPresent(d) &&
    capturedIsMinimumAuto(d) &&
    consentValid(d) &&
    d.pilotIntake&&d.pilotIntake.oneTimeLabPilot===true &&
    d.pilotIntake.participantSubmitted===true &&
    d.pilotIntake.generalPersistenceReleased===false;
}
function healthSensitiveAbsent(d){
  const forbidden=/health|salud|medical|medic|diagnos|disease|condition|dob|birth|age|edad|maternity|pregnan|spouse|dependent/i;
  function walk(v,path=[]){
    if(v==null)return true;
    if(Array.isArray(v))return v.every((x,i)=>walk(x,path.concat(String(i))));
    if(typeof v==='object'){
      for(const [k,val] of Object.entries(v)){
        if(forbidden.test(k))return false;
        if(!walk(val,path.concat(k)))return false;
      }
    }
    return true;
  }
  return walk(d);
}
function caseCommitment(casePath){return sha('W5_CASE_SELECTOR|'+casePath);}
function actorCommitment(actor){return sha('W5_ACTOR_SELECTOR|'+clean(actor.uid,220)+'|'+clean(actor.advisorId,180)+'|'+clean(actor.memberDocId,220));}
function consentCommitment(caseId,d){
  const c=d.consents||{};
  return digest({
    evidenceType:'REQUEST_MANAGEMENT_CONSENT',
    tenantId:TENANT_ID,
    caseSelector:sha(caseId),
    journeyId:JOURNEY_ID,
    text:clean(c.requestManagementText,220),
    requestManagement:c.requestManagement===true,
    requestManagementSource:clean(c.requestManagementSource,180),
    requestManagementCapturedAt:iso(c.requestManagementCapturedAt),
    marketing:c.marketing===true,
    contactPresence:{
      name:!!(d.contact&&clean(d.contact.name,180)),
      whatsapp:!!(d.contact&&clean(d.contact.whatsapp,80)),
      email:!!(d.contact&&clean(d.contact.email,220))
    },
    generalPersistenceReleased:d.pilotIntake&&d.pilotIntake.generalPersistenceReleased===true
  });
}
function deriveProjection(runId,caseId,correlationId,quoteCasePath){
  const seed=sha([TENANT_ID,caseId,correlationId,runId,'S468_W2'].join('|'));
  const businessId='w5biz_'+seed.slice(0,24);
  const managementId='w5mgmt_'+seed.slice(24,48);
  const businessPayload={
    id:businessId,
    nombre:'Cotización web · W5 real pilot',
    tipo:'Cotización',
    etapa:'cotizando',
    pais:'GT',
    moneda:'GTQ',
    canal:'Web pública A&S',
    producto:'AUTO',
    ramo:'AUTO',
    prioridad:'Media',
    origen:'CotComp',
    cotcompRef:{
      caseId,
      journeyId:JOURNEY_ID,
      correlationId,
      quoteCasePath:clean(quoteCasePath,500),
      selectedProposalId:'',
      intakeStatus:'lead_recibido'
    }
  };
  const managementPayload={
    id:managementId,
    lista:'Cotizaciones',
    tipo:'Cotización',
    titulo:'Cotización web · Auto',
    negocioId:businessId,
    estado:'Pendiente',
    prioridad:'Media',
    origen:'CotComp',
    nota:'W5 real pilot · no provider delivery',
    cotcompRef:{
      caseId,
      journeyId:JOURNEY_ID,
      correlationId,
      quoteCasePath:clean(quoteCasePath,500),
      selectedProposalId:'',
      intakeStatus:'lead_recibido'
    }
  };
  const req=(op,id,payload)=>'wf_'+sha(JSON.stringify(stable({tenantId:TENANT_ID,operation:op,entityId:id,payload}))).slice(0,28);
  const businessRequestId=req('create_business',businessId,businessPayload);
  const managementRequestId=req('create_management',managementId,managementPayload);
  return {
    businessId,managementId,businessPayload,managementPayload,
    businessRequestId,managementRequestId,
    businessEventId:eventId(businessRequestId),
    managementEventId:eventId(managementRequestId)
  };
}
function journalPaths(p){
  return [
    'tenantId/'+TENANT_ID+'/negocios/'+p.businessId,
    'tenantId/'+TENANT_ID+'/gestiones/'+p.managementId,
    'tenants/'+TENANT_ID+'/workflowEvents/'+p.businessEventId,
    'tenants/'+TENANT_ID+'/workflowEvents/'+p.managementEventId,
    'tenants/'+TENANT_ID+'/workflowRequests/'+p.businessRequestId,
    'tenants/'+TENANT_ID+'/workflowRequests/'+p.managementRequestId,
    'tenants/'+TENANT_ID+'/notificationOutbox/'+p.businessEventId,
    'tenants/'+TENANT_ID+'/notificationOutbox/'+p.managementEventId
  ];
}
async function readPaths(db,paths){
  const rows=[];
  for(const path of paths){
    const s=await db.doc(path).get();
    rows.push({path,exists:s.exists,digest:s.exists?digest(s.data()):null,updateTime:s.updateTime?iso(s.updateTime):null,data:s.exists?s.data():null});
  }
  return rows;
}
function allAbsent(rows){return rows.every(x=>x.exists===false);}
async function invokeOwner(idToken,envelope){
  const url='https://'+REGION+'-'+PROJECT_ID+'.cloudfunctions.net/'+OWNER_CALLABLE;
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+idToken},body:JSON.stringify({data:envelope})});
  const body=await r.json().catch(()=>({}));
  if(r.ok&&body&&body.result)return {ok:true,httpStatus:r.status,result:body.result};
  const e=body&&body.error?body.error:{};
  return {ok:false,httpStatus:r.status,errorStatus:clean(e.status,100),errorMessage:clean(e.message,240)};
}
async function exchangeCustomToken(apiKey,customToken){
  const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key='+encodeURIComponent(apiKey),{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:customToken,returnSecureToken:true})
  });
  const b=await r.json().catch(()=>({}));
  if(!r.ok||!b.idToken)throw new Error('S468_CUSTOM_TOKEN_EXCHANGE_FAILED');
  return b.idToken;
}
async function resolveActor(db,auth){
  const users=[];let token;
  do{
    const page=await auth.listUsers(1000,token);
    users.push(...page.users);token=page.pageToken;
  }while(token&&users.length<10000);
  const targetUsers=users.filter(u=>u.email&&sha(String(u.email).trim().toLowerCase().replace(/\s+/g,''))===TARGET_EMAIL_HASH);
  if(targetUsers.length!==1)throw new Error('S468_ACTOR_AUTH_COUNT_INVALID');
  const user=targetUsers[0];
  if(user.disabled)throw new Error('S468_ACTOR_DISABLED');
  const snap=await db.collection('tenants').doc(TENANT_ID).collection('members').get();
  const matches=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(row=>{
    const uid=clean(row.uid||row.userId||row.id,180);
    return uid===user.uid&&clean(row.advisorId||row.asesorId,180)===TARGET_ADVISOR_ID;
  });
  if(matches.length!==1)throw new Error('S468_ACTOR_MEMBERSHIP_COUNT_INVALID');
  const m=matches[0];
  const status=roleNorm(m.status||m.estado);
  if(m.active===false||m.activo===false||['inactive','inactivo','blocked','bloqueado'].includes(status))throw new Error('S468_ACTOR_MEMBERSHIP_INACTIVE');
  const roles=[].concat(m.roles||[],m.activeRole||m.rolActivo||m.role||m.rol||[]).map(roleNorm).filter(Boolean);
  const perms=[].concat(m.permissions||[],m.permisosExtra||[],m.extras||[]).map(roleNorm).filter(Boolean);
  const adminRoles=new Set(['superadmin','admintenant','direccion','admin','operativo']);
  const managePerms=new Set(['ops manage','leads manage','gestiones manage','workflow manage']);
  if(!roles.some(r=>adminRoles.has(r))&&!perms.some(p=>managePerms.has(p)))throw new Error('S468_ACTOR_CANNOT_MANAGE_WORKFLOW');
  return {uid:user.uid,memberDocId:m.id,advisorId:TARGET_ADVISOR_ID};
}
function commandEnvelope(op,entityId,requestId,payload){
  return {tenantId:TENANT_ID,operation:op,entityId,requestId,reason:'CotComp S4.68 W5 real controlled pilot',payload};
}
function verifyOwnedJournal(rows,p,actorUid){
  const byPath=Object.fromEntries(rows.map(r=>[r.path,r]));
  for(const row of rows)if(!row.exists)throw new Error('S468_W2_JOURNAL_MISSING');
  const entityBusiness=byPath['tenantId/'+TENANT_ID+'/negocios/'+p.businessId].data;
  const entityManagement=byPath['tenantId/'+TENANT_ID+'/gestiones/'+p.managementId].data;
  if(!entityBusiness.cotcompRef||clean(entityBusiness.cotcompRef.caseId,180)!==clean(p.businessPayload.cotcompRef.caseId,180))throw new Error('S468_W2_BUSINESS_LINK_INVALID');
  if(!entityManagement.cotcompRef||clean(entityManagement.cotcompRef.caseId,180)!==clean(p.managementPayload.cotcompRef.caseId,180))throw new Error('S468_W2_MANAGEMENT_LINK_INVALID');
  if(clean(entityBusiness.createdByUid,180)!==actorUid||clean(entityManagement.createdByUid,180)!==actorUid)throw new Error('S468_W2_ACTOR_INVALID');
  for(const evt of [p.businessEventId,p.managementEventId]){
    const outbox=byPath['tenants/'+TENANT_ID+'/notificationOutbox/'+evt].data;
    if(!outbox||outbox.status!=='pending_provider')throw new Error('S468_W2_OUTBOX_STATE_INVALID');
  }
}
async function cleanupExact(db,paths,baseline){
  return db.runTransaction(async tx=>{
    const snaps=[];
    for(const path of paths)snaps.push(await tx.get(db.doc(path)));
    for(let i=0;i<paths.length;i++){
      if(!snaps[i].exists)throw new Error('S468_ROLLBACK_PATH_MISSING');
      if(digest(snaps[i].data())!==baseline[i].digest)throw new Error('S468_ROLLBACK_DIGEST_MISMATCH');
    }
    for(const path of paths)tx.delete(db.doc(path));
    return {deleted:paths.length};
  });
}
async function cleanupCreatedSubset(db,paths){
  const current=await readPaths(db,paths);
  const present=current.filter(x=>x.exists);
  if(!present.length)return {deleted:0};
  return db.runTransaction(async tx=>{
    const snaps=[];
    for(const row of present)snaps.push({row,snap:await tx.get(db.doc(row.path))});
    for(const item of snaps){
      if(!item.snap.exists)throw new Error('S468_PARTIAL_ROLLBACK_PATH_DISAPPEARED');
      if(digest(item.snap.data())!==item.row.digest)throw new Error('S468_PARTIAL_ROLLBACK_DIGEST_MISMATCH');
    }
    for(const item of snaps)tx.delete(db.doc(item.row.path));
    return {deleted:snaps.length};
  });
}
async function discoverRealCase(db){
  const quotePath=data.pathFor(TENANT_ID,data.ENTITY.QUOTE_CASE);
  const snap=await db.collection(quotePath).where('journeyId','==',JOURNEY_ID).limit(MAX_SCAN).get();
  const rows=snap.docs.map(d=>({id:d.id,data:d.data(),ref:d.ref}));
  const intakeRows=rows.filter(r=>r.data&&r.data.pilotIntake&&r.data.pilotIntake.oneTimeLabPilot===true);
  const eligible=intakeRows.filter(intakeEligible);
  return {quotePath,rows,intakeRows,eligible};
}
async function countPreexistingWorkflowProjection(db,caseId){
  const business=await db.collection('tenantId').doc(TENANT_ID).collection('negocios').where('cotcompRef.caseId','==',caseId).limit(MAX_SCAN).get();
  const management=await db.collection('tenantId').doc(TENANT_ID).collection('gestiones').where('cotcompRef.caseId','==',caseId).limit(MAX_SCAN).get();
  return {business:business.size,management:management.size};
}
async function discoverExistingRealProposals(db,caseId){
  const proposalPath=data.pathFor(TENANT_ID,data.ENTITY.PROPOSAL);
  const snap=await db.collection(proposalPath).where('caseId','==',caseId).limit(MAX_SCAN).get();
  const rows=snap.docs.map(d=>({id:d.id,data:d.data()})).filter(r=>!isSynthetic(r.data)&&!(r.data.provenance&&r.data.provenance.w5Pilot===true));
  const eligible=[];
  for(const r of rows){
    const d=r.data||{};
    const validity=versioning.evaluateCurrentValidity(d.validity,AS_OF);
    const e=proposals.evaluateComparisonEligibility(d,{currentValidityConfirmed:validity.current===true});
    if(d.isCurrentVersion===true&&d.validationState==='VALIDATED'&&validity.current===true&&e.eligible===true)eligible.push(r);
  }
  return {count:rows.length,eligibleCount:eligible.length};
}
async function run(){
  if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID)throw new Error('S468_PROJECT_MISMATCH');
  const runId=clean(process.env.S468_PROOF_RUN_ID,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  const apiKey=clean(process.env.S468_FIREBASE_WEB_API_KEY,400);
  const privatePath=clean(process.env.S468_PRIVATE_STATE_PATH,600);
  if(!/^s468-[A-Za-z0-9._:-]{4,90}$/.test(runId))throw new Error('S468_RUN_ID_INVALID');
  if(!apiKey)throw new Error('S468_WEB_API_KEY_REQUIRED');
  if(!privatePath)throw new Error('S468_PRIVATE_STATE_PATH_REQUIRED');

  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);
  const auth=getAuth(app);

  const intakeStateSnap=await db.doc(intake.STATE_PATH).get();
  if(!intakeStateSnap.exists)throw new Error('S468_INTAKE_STATE_MISSING');
  const intakeState=intakeStateSnap.data()||{};
  if(intakeState.used!==true)throw new Error('S468_INTAKE_NOT_CONSUMED');
  if(intakeState.tokenSha256!==intake.TOKEN_SHA256)throw new Error('S468_INTAKE_TOKEN_HASH_MISMATCH');
  const usedAt=iso(intakeState.usedAt);
  if(!usedAt)throw new Error('S468_USED_AT_MISSING');

  const found=await discoverRealCase(db);
  if(found.intakeRows.length!==1)throw new Error('S468_INTAKE_CASE_COUNT_'+found.intakeRows.length);
  if(found.eligible.length!==1)throw new Error('S468_ELIGIBLE_CASE_COUNT_'+found.eligible.length);
  const row=found.eligible[0];
  const caseId=row.id, caseData=row.data;
  const casePath=found.quotePath+'/'+caseId;
  if(clean(intakeState.quoteCaseId,220)!==caseId||clean(intakeState.quoteCasePath,600)!==casePath)throw new Error('S468_STATE_CASE_LINK_MISMATCH');
  if(!healthSensitiveAbsent(caseData))throw new Error('S468_HEALTH_SENSITIVE_DATA_PRESENT');
  const caseBeforeDigest=digest(caseData);

  const preProjection=await countPreexistingWorkflowProjection(db,caseId);
  if(preProjection.business!==0||preProjection.management!==0)throw new Error('S468_PREEXISTING_WORKFLOW_PROJECTION_DETECTED');

  const actor=await resolveActor(db,auth);
  const commitments={
    caseSelectorSha256:caseCommitment(casePath),
    actorSelectorSha256:actorCommitment(actor),
    consentEvidenceSha256:consentCommitment(caseId,caseData)
  };
  for(const value of Object.values(commitments))if(!/^[a-f0-9]{64}$/.test(value))throw new Error('S468_COMMITMENT_INVALID');

  const projection=deriveProjection(runId,caseId,clean(caseData.correlationId,180),casePath);
  const paths=journalPaths(projection);
  const initial=await readPaths(db,paths);
  if(!allAbsent(initial))throw new Error('S468_W2_TARGET_PATHS_NOT_CLEAN');

  const customToken=await auth.createCustomToken(actor.uid,{s468W5Pilot:true,tenantId:TENANT_ID});
  const idToken=await exchangeCustomToken(apiKey,customToken);
  let writesStarted=false;
  let baseline=null;
  try{
    const calls=[
      {op:'create_business',entityId:projection.businessId,requestId:projection.businessRequestId,payload:projection.businessPayload},
      {op:'create_management',entityId:projection.managementId,requestId:projection.managementRequestId,payload:projection.managementPayload}
    ];
    const first=[];
    for(const c of calls){
      const r=await invokeOwner(idToken,commandEnvelope(c.op,c.entityId,c.requestId,c.payload));
      if(!r.ok||!r.result||r.result.ok!==true)throw new Error('S468_W2_FIRST_CALL_FAILED');
      writesStarted=true;
      first.push({operation:c.op,reused:r.result.reused===true,httpStatus:r.httpStatus});
    }
    baseline=await readPaths(db,paths);
    verifyOwnedJournal(baseline,projection,actor.uid);

    const retry=[];
    for(const c of calls){
      const r=await invokeOwner(idToken,commandEnvelope(c.op,c.entityId,c.requestId,c.payload));
      if(!r.ok||!r.result||r.result.reused!==true)throw new Error('S468_W2_RETRY_NOT_REUSED');
      retry.push({operation:c.op,reused:true,httpStatus:r.httpStatus});
    }
    const afterRetry=await readPaths(db,paths);
    for(let i=0;i<paths.length;i++){
      if(afterRetry[i].digest!==baseline[i].digest||afterRetry[i].updateTime!==baseline[i].updateTime)throw new Error('S468_W2_RETRY_MUTATED');
    }

    const proposalState=await discoverExistingRealProposals(db,caseId);
    const w3=proposalState.eligibleCount>0
      ? {status:'PASS_READ_ONLY',realProposalCount:proposalState.count,eligibleCurrentValidatedCount:proposalState.eligibleCount,proposalWrites:0,providerOrRaterCalls:0}
      : {status:'DEPENDENCY',code:'EXPLICIT_REAL_PROPOSAL_REQUIRED',realProposalCount:proposalState.count,eligibleCurrentValidatedCount:0,proposalWrites:0,providerOrRaterCalls:0};

    const w4Probe=selection.buildAtomicSelectionPlan({explicitUserChoice:false});
    if(w4Probe.ok!==false||w4Probe.code!=='EXPLICIT_USER_CHOICE_REQUIRED')throw new Error('S468_W4_EXPLICIT_CHOICE_CONTROL_FAILED');

    const caseDuring=await db.doc(casePath).get();
    if(!caseDuring.exists||digest(caseDuring.data())!==caseBeforeDigest)throw new Error('S468_REAL_CASE_MUTATED');

    const cleanup=await cleanupExact(db,paths,baseline);
    if(cleanup.deleted!==8)throw new Error('S468_ROLLBACK_COUNT_INVALID');

    const finalJournal=await readPaths(db,paths);
    if(!allAbsent(finalJournal))throw new Error('S468_FINAL_W2_ABSENCE_FAILED');
    const finalCase=await db.doc(casePath).get();
    if(!finalCase.exists||digest(finalCase.data())!==caseBeforeDigest)throw new Error('S468_FINAL_CASE_DIGEST_MISMATCH');
    const finalIntake=await db.doc(intake.STATE_PATH).get();
    if(!finalIntake.exists||finalIntake.data().used!==true||finalIntake.data().tokenSha256!==intake.TOKEN_SHA256)throw new Error('S468_FINAL_INTAKE_STATE_INVALID');

    fs.writeFileSync(privatePath,JSON.stringify({
      casePath,
      caseId,
      intakeStatePath:intake.STATE_PATH,
      w2Paths:paths,
      caseBeforeDigest,
      tokenSha256:intake.TOKEN_SHA256
    }),{mode:0o600});

    return {
      schemaVersion:'ays-cotcomp-s468-w5-real-submission-receipt-v1.0',
      version:VERSION,
      projectId:PROJECT_ID,
      tenantId:TENANT_ID,
      outcome:'PASS_TO_REAL_LIMIT',
      submission:{
        classification:'SUBMISSION_SUCCESS_SINGLE_CASE',
        intakeConsumed:true,
        usedAt,
        intakeCasesObserved:found.intakeRows.length,
        eligibleRealQuoteCases:found.eligible.length,
        tenantCorrect:true,
        journeyCorrect:true,
        oneDataSubject:true,
        consentValid:true,
        marketingFalse:caseData.consents&&caseData.consents.marketing!==true,
        healthSensitiveDataAbsent:true,
        generalPersistenceReleased:false,
        preexistingWorkflowProjectionCount:preProjection.business+preProjection.management
      },
      exactlyOne:{
        atomicRuntimeContract:true,
        stateAndCaseLinked:true,
        duplicatePrevention:'ALREADY_EXISTS',
        gracefulResponseReplay:'LIMITATION_NON_BLOCKING',
        bearerConsumed:true,
        secondCaseAllowedByCurrentState:false
      },
      commitments:{
        caseSelector:'PASS',
        actorSelector:'PASS',
        consentEvidence:'PASS',
        caseSelectorSha256:commitments.caseSelectorSha256,
        actorSelectorSha256:commitments.actorSelectorSha256,
        consentEvidenceSha256:commitments.consentEvidenceSha256
      },
      w1:{
        status:'PASS',
        quoteCaseValidated:true,
        writes:0,
        digestUnchanged:true
      },
      w2:{
        status:'PASS',
        ownerCallable:OWNER_CALLABLE,
        firstCalls:first,
        createdDocuments:8,
        exactReadback:true,
        retry,
        retryWrites:0,
        duplicateCreated:false,
        providerOutboxDocuments:2,
        providerOutboxStatus:'pending_provider',
        providerDeliveryExecuted:false
      },
      w3,
      w4:{
        status:'CONTROL_PASS',
        explicitUserChoiceEvidencePresent:false,
        blockCode:'EXPLICIT_USER_CHOICE_REQUIRED',
        selectionCreated:false,
        selectionWrites:0
      },
      rollback:{
        disposition:'ROLLBACK_TO_BEFORE_STATE',
        deletedPilotDocuments:8,
        realCaseRestoreWriteRequired:false,
        realCaseFinalDigestMatches:true,
        intakeConsumedStatePreserved:true,
        pilotDocumentsFinalAbsent:true
      },
      mutationAccounting:{
        creates:8,
        updates:0,
        deletes:8,
        retryWrites:0,
        conflictWrites:0,
        realRecordWrites:0,
        totalMutations:16,
        netPilotDocuments:0
      },
      security:{
        exactOneByAtomicIntakeTransaction:true,
        usedStatePersistent:true,
        rawBearerInReceipt:false,
        rawIdsInReceipt:false,
        piiInReceipt:false,
        providerDeliveryExecuted:false
      },
      s467:{
        state:'INERT',
        retirementCandidate:true,
        reusablePatternPromoted:false
      },
      boundaries:{
        realDataRead:true,
        realDataWrite:false,
        realDataSubjectsTouched:1,
        existingRealRecordsTouched:1,
        healthSensitiveDataTouched:false,
        providerOrRaterCallsExecuted:0,
        productionTouched:false,
        issuanceExecuted:false,
        bindingExecuted:false,
        paymentExecuted:false,
        generalPersistenceReleased:false
      }
    };
  }catch(e){
    if(writesStarted){
      try{
        if(baseline)await cleanupExact(db,paths,baseline);
        else await cleanupCreatedSubset(db,paths);
        const afterFailureCleanup=await readPaths(db,paths);
        if(!allAbsent(afterFailureCleanup))throw new Error('S468_PARTIAL_ROLLBACK_FINAL_ABSENCE_FAILED');
      }catch(_){
        throw new Error('S468_EXECUTION_AND_ROLLBACK_FAILED');
      }
    }
    throw e;
  }
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,REGION,TENANT_ID,JOURNEY_ID,COUNTRY,TARGET_ADVISOR_ID,OWNER_CALLABLE,MAX_SCAN,AS_OF,CONSENT_TEXT,
  clean,sha,digest,eventId,intakeEligible,healthSensitiveAbsent,caseCommitment,actorCommitment,consentCommitment,
  deriveProjection,journalPaths,allAbsent,cleanupCreatedSubset,run
});

if(require.main===module){
  run().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{
    console.error(clean(e&&e.message||e,300));
    process.exit(1);
  });
}
