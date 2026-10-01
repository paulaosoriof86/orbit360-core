'use strict';

const fs=require('node:fs');
const crypto=require('node:crypto');
const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const data=require('./cotcomp-runtime-data-contract');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');
const proposals=require('./cotcomp-proposal-contracts');
const selection=require('./cotcomp-selection-contract-s455');

const VERSION='ays-cotcomp-s466-w5-realdata-controlled-pilot-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const COUNTRY='GT';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const MAX_EXISTING_RECORDS_SCANNED=8;
const AS_OF='2026-10-15T12:00:00Z';

function clean(v,max=240){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function sha(v){return crypto.createHash('sha256').update(String(v??''),'utf8').digest('hex');}
function normalize(v){
  if(v==null)return v;
  if(v instanceof Date)return v.toISOString();
  if(typeof v.toDate==='function')return v.toDate().toISOString();
  if(Array.isArray(v))return v.map(normalize);
  if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normalize(v[k])]));
  return v;
}
function digest(v){return sha(JSON.stringify(normalize(v)));}
function ms(v){
  try{
    if(v&&typeof v.toMillis==='function')return v.toMillis();
    if(v&&typeof v.toDate==='function')return v.toDate().getTime();
    const n=Date.parse(String(v||'')); return Number.isFinite(n)?n:0;
  }catch{return 0;}
}
function isEligibleRealQuoteCase(row){
  const d=row&&row.data||{};
  const contact=d.contact&&typeof d.contact==='object'?d.contact:{};
  const consents=d.consents&&typeof d.consents==='object'?d.consents:{};
  const captured=d.capturedFields&&typeof d.capturedFields==='object'?d.capturedFields:{};
  const status=clean(d.status,80);
  const source=clean(d.source,100);
  const product=clean(d.riskOrProductCandidate,180).toUpperCase();
  const synthetic=
    d.synthetic===true ||
    !!clean(d.proofRunId,120) ||
    !!(d.provenance&&d.provenance.synthetic===true);

  return !synthetic &&
    clean(d.journeyId,180)===JOURNEY_ID &&
    clean(d.country,8).toUpperCase()===COUNTRY &&
    source==='PUBLIC_WEB' &&
    clean(d.intent,160).toUpperCase()==='COTIZAR' &&
    product.includes('AUTO') &&
    ['SUBMITTED','UNDER_REVIEW','QUOTING','PROPOSALS_AVAILABLE'].includes(status) &&
    !clean(d.selectionId,180) &&
    !clean(d.selectedProposalId,180) &&
    consents.requestManagement===true &&
    !!clean(contact.name,180) &&
    !!clean(contact.whatsapp,80) &&
    !!clean(contact.email,220) &&
    !!clean(captured.brand,180) &&
    !!clean(captured.lineModel,180);
}
function chooseCandidate(rows){
  const eligible=(rows||[]).filter(isEligibleRealQuoteCase);
  eligible.sort((a,b)=>ms(b.data.createdAt||b.data.updatedAt)-ms(a.data.createdAt||a.data.updatedAt)||String(a.id).localeCompare(String(b.id)));
  return {eligibleCount:eligible.length,candidate:eligible[0]||null};
}
function serviceAccountActorCommitment(){
  const p=process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if(!p)throw new Error('S466_CREDENTIAL_PATH_REQUIRED');
  const j=JSON.parse(fs.readFileSync(p,'utf8'));
  const email=clean(j.client_email,320).toLowerCase();
  if(!email)throw new Error('S466_SERVICE_ACCOUNT_EMAIL_REQUIRED');
  return sha('service-account|'+email);
}
function consentCommitment(caseId,d){
  const c=d.consents||{};
  return digest({
    evidenceType:'REQUEST_MANAGEMENT_CONSENT',
    tenantId:TENANT_ID,
    caseId,
    journeyId:d.journeyId,
    requestManagement:c.requestManagement===true,
    marketing: c.marketing===true,
    contactPresence:{
      name:!!(d.contact&&clean(d.contact.name,180)),
      whatsapp:!!(d.contact&&clean(d.contact.whatsapp,80)),
      email:!!(d.contact&&clean(d.contact.email,220))
    },
    createdAt:normalize(d.createdAt||null),
    governancePolicyVersion:data.PII_POLICY.retentionPolicyVersion
  });
}
function ids(runId,caseId){
  const seed=sha(TENANT_ID+'|'+caseId+'|'+runId).slice(0,20);
  return Object.freeze({
    businessId:'w5biz_'+seed,
    managementId:'w5mgmt_'+seed,
    requestV1:'s466-'+runId+'-v1',
    requestV2:'s466-'+runId+'-v2'
  });
}
function w2Paths(i){
  return Object.freeze({
    business:'tenantId/'+TENANT_ID+'/negocios/'+i.businessId,
    management:'tenantId/'+TENANT_ID+'/gestiones/'+i.managementId
  });
}
async function readDocs(db,paths){
  const out={};
  for(const p of paths){
    const s=await db.doc(p).get();
    out[p]={exists:s.exists,data:s.exists?s.data():null,digest:s.exists?digest(s.data()):null};
  }
  return out;
}
function allAbsent(map){return Object.values(map).every(x=>x.exists===false);}
function owned(d,runId){return !!d&&d.w5Pilot===true&&d.pilotRunId===runId;}

async function createW2(db,runId,caseId,caseData,i){
  const p=w2Paths(i);
  const cotcompRef={
    caseId,
    journeyId:JOURNEY_ID,
    correlationId:clean(caseData.correlationId,180),
    country:'GT',
    w5Pilot:true
  };
  const business={
    id:i.businessId,tenantId:TENANT_ID,nombre:'W5 Pilot CotComp',origen:'CotComp',
    estado:'lead_recibido',producto:'AUTO',pais:'GT',cotcompRef,
    w5Pilot:true,pilotRunId:runId,pilotDoNotOperate:true
  };
  const management={
    id:i.managementId,tenantId:TENANT_ID,businessId:i.businessId,
    lista:'Cotizaciones',estado:'Pendiente',origen:'CotComp',cotcompRef,
    w5Pilot:true,pilotRunId:runId,pilotDoNotOperate:true
  };
  await db.runTransaction(async tx=>{
    const br=db.doc(p.business),mr=db.doc(p.management);
    const [bs,ms]=await Promise.all([tx.get(br),tx.get(mr)]);
    if(bs.exists||ms.exists)throw new Error('S466_W2_PATH_COLLISION');
    tx.create(br,business); tx.create(mr,management);
  });
  return {paths:p,writes:2};
}

function proposalCommon(runId,caseId){
  return {
    tenantId:TENANT_ID,caseId,country:'GT',product:'AUTO',currency:'GTQ',
    insurerId:'w5-pilot-no-provider',insurerDisplayName:'W5 Pilot — no provider',
    sourceId:'w5-pilot-controlled',planName:'W5 Controlled Pilot Option',
    premium:2500,coverages:{pilotCoverage:'PILOT_ONLY'},limits:{},sublimits:{},
    deductibles:{},assistance:{},conditions:['PILOT_ONLY_NO_COMMERCIAL_EFFECT'],
    exclusions:[],validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{w5Pilot:true,pilotRunId:runId,realCaseLinked:true,providerOrRaterCall:false},
    validationState:'VALIDATED',validatedBy:'s466-controlled-pilot',validatedAt:'2026-10-01T00:00:00Z'
  };
}
async function commitProposalPlan(db,runId,plan,previousExpected=null){
  const idemOp=plan.operations.find(x=>x.entity==='proposal_version_request');
  const propOp=plan.operations.find(x=>x.entity==='proposal_version');
  const prevOp=plan.operations.find(x=>x.entity==='proposal_previous');
  return db.runTransaction(async tx=>{
    const idemRef=db.doc(idemOp.path),propRef=db.doc(propOp.path);
    const idem=await tx.get(idemRef);
    const prop=await tx.get(propRef);
    if(idem.exists){
      const id=idem.data();
      if(id.requestDigest===plan.requestDigest&&id.status==='COMMITTED'&&prop.exists){
        return {reused:true,writes:0};
      }
      const e=new Error('PROPOSAL_IDEMPOTENCY_CONFLICT');e.code='PROPOSAL_IDEMPOTENCY_CONFLICT';throw e;
    }
    if(prop.exists){const e=new Error('PROPOSAL_VERSION_ALREADY_EXISTS');e.code='PROPOSAL_VERSION_ALREADY_EXISTS';throw e;}
    if(prevOp){
      const prevRef=db.doc(prevOp.path);
      const prev=await tx.get(prevRef);
      if(!prev.exists)throw new Error('S466_PREVIOUS_PROPOSAL_MISSING');
      if(previousExpected&&digest(prev.data())!==digest(previousExpected))throw new Error('S466_PREVIOUS_PROPOSAL_CHANGED');
      if(versioning.digest(prev.data())!==prevOp.expectedBeforeDigest)throw new Error('S466_PREVIOUS_PROPOSAL_DIGEST_CONFLICT');
      tx.update(prevRef,{...prevOp.payload,w5Pilot:true,pilotRunId:runId});
    }
    tx.create(propRef,{...propOp.payload,w5Pilot:true,pilotRunId:runId});
    tx.create(idemRef,{...idemOp.payload,w5Pilot:true,pilotRunId:runId});
    return {reused:false,writes:prevOp?3:2};
  });
}

async function cleanup(db,runId,realCasePath,realCaseBefore,newPaths){
  return db.runTransaction(async tx=>{
    const caseRef=db.doc(realCasePath);
    const caseSnap=await tx.get(caseRef);
    if(!caseSnap.exists)throw new Error('S466_REAL_CASE_MISSING_DURING_ROLLBACK');
    const refs=newPaths.map(p=>db.doc(p));
    const snaps=[];
    for(const r of refs)snaps.push(await tx.get(r));
    for(const s of snaps){
      if(s.exists&&!owned(s.data(),runId))throw new Error('S466_ROLLBACK_OWNERSHIP_MISMATCH');
    }
    if(digest(caseSnap.data())!==digest(realCaseBefore)){
      tx.set(caseRef,realCaseBefore);
    }
    let deletes=0;
    for(let i=0;i<refs.length;i++){
      if(snaps[i].exists){tx.delete(refs[i]);deletes++;}
    }
    return {deleted:deletes,realCaseRestored:digest(caseSnap.data())!==digest(realCaseBefore)};
  });
}

async function run(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)throw new Error('S466_PROJECT_MISMATCH');
  const runId=clean(process.env.S466_PROOF_RUN_ID,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  if(!/^s466-[A-Za-z0-9._:-]{4,90}$/.test(runId))throw new Error('S466_RUN_ID_INVALID');

  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);
  const collectionPath=data.pathFor(TENANT_ID,data.ENTITY.QUOTE_CASE);
  const snap=await db.collection(collectionPath).where('journeyId','==',JOURNEY_ID).limit(MAX_EXISTING_RECORDS_SCANNED).get();
  const scanned=snap.docs.map(d=>({id:d.id,data:d.data()}));
  const selected=chooseCandidate(scanned);

  if(!selected.candidate){
    return {
      schemaVersion:'ays-cotcomp-s466-w5-realdata-pilot-receipt-v1.0',
      version:VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,
      outcome:'BLOCKED_NO_ELIGIBLE_REAL_CASE',pilotExecuted:false,
      discovery:{recordsScanned:scanned.length,eligibleCount:0,maxExistingRecordsScanned:MAX_EXISTING_RECORDS_SCANNED},
      writeAccounting:{writes:0,deletes:0,totalMutations:0},
      boundaries:{realDataRead:true,realDataWrite:false,productionTouched:false,providerOrRaterCallsExecuted:0,issuanceExecuted:false,bindingExecuted:false,paymentExecuted:false}
    };
  }

  const caseId=selected.candidate.id;
  const caseData=selected.candidate.data;
  const realCasePath=collectionPath+'/'+caseId;
  const realCaseBefore=caseData;
  const realCaseBeforeDigest=digest(realCaseBefore);
  const caseCommitment=sha('quoteCasePath|'+realCasePath);
  const actorCommitment=serviceAccountActorCommitment();
  const consentEvidenceCommitment=consentCommitment(caseId,caseData);
  const i=ids(runId,caseId);
  const createdPaths=[];
  let touched=false;

  try{
    // W1: real QuoteCase validation only; no mutation.
    if(!isEligibleRealQuoteCase(selected.candidate))throw new Error('S466_W1_REAL_CASE_VALIDATION_FAILED');

    // W2: create only the two core workflow projection entities. No outbox/provider records.
    const w2=await createW2(db,runId,caseId,caseData,i); touched=true;
    createdPaths.push(w2.paths.business,w2.paths.management);
    const w2Read=await readDocs(db,[w2.paths.business,w2.paths.management]);
    if(Object.values(w2Read).some(x=>!x.exists))throw new Error('S466_W2_READBACK_FAILED');

    // W3: two controlled proposal versions linked to the real case, but no provider/rater calls.
    const common=proposalCommon(runId,caseId);
    const v1=versioning.buildAtomicVersionPlan({...common,versionNumber:1,requestKey:i.requestV1});
    if(!v1.ok)throw new Error('S466_W3_V1_PLAN_'+(v1.code||'INVALID'));
    const r1=await commitProposalPlan(db,runId,v1);
    if(r1.reused||r1.writes!==2)throw new Error('S466_W3_V1_WRITE_INVALID');
    createdPaths.push(
      v1.operations.find(x=>x.entity==='proposal_version').path,
      v1.operations.find(x=>x.entity==='proposal_version_request').path
    );
    const r1Retry=await commitProposalPlan(db,runId,v1);
    if(!r1Retry.reused||r1Retry.writes!==0)throw new Error('S466_W3_V1_RETRY_INVALID');
    let v1Conflict=false;
    try{
      const bad=versioning.buildAtomicVersionPlan({...common,premium:2555,versionNumber:1,requestKey:i.requestV1});
      await commitProposalPlan(db,runId,bad);
    }catch(e){v1Conflict=e&&e.code==='PROPOSAL_IDEMPOTENCY_CONFLICT';}
    if(!v1Conflict)throw new Error('S466_W3_V1_CONFLICT_NOT_DENIED');

    const v1Path=v1.operations.find(x=>x.entity==='proposal_version').path;
    const v1Stored=(await db.doc(v1Path).get()).data();
    const v2=versioning.buildAtomicVersionPlan({
      ...common,premium:2600,versionNumber:2,requestKey:i.requestV2,
      supersedesProposalId:v1.proposal.proposalId,previousProposal:v1Stored
    });
    if(!v2.ok)throw new Error('S466_W3_V2_PLAN_'+(v2.code||'INVALID'));
    const r2=await commitProposalPlan(db,runId,v2,v1Stored);
    if(r2.reused||r2.writes!==3)throw new Error('S466_W3_V2_WRITE_INVALID');
    createdPaths.push(
      v2.operations.find(x=>x.entity==='proposal_version').path,
      v2.operations.find(x=>x.entity==='proposal_version_request').path
    );
    const r2Retry=await commitProposalPlan(db,runId,v2);
    if(!r2Retry.reused||r2Retry.writes!==0)throw new Error('S466_W3_V2_RETRY_INVALID');
    let v2Conflict=false;
    try{
      const badV2=versioning.buildAtomicVersionPlan({
        ...common,premium:2700,versionNumber:2,requestKey:i.requestV2,
        supersedesProposalId:v1.proposal.proposalId,previousProposal:v1Stored
      });
      await commitProposalPlan(db,runId,badV2,v1Stored);
    }catch(e){v2Conflict=e&&e.code==='PROPOSAL_IDEMPOTENCY_CONFLICT';}
    if(!v2Conflict)throw new Error('S466_W3_V2_CONFLICT_NOT_DENIED');

    const proposalRead=await readDocs(db,createdPaths.filter(p=>p.includes('/cotcomp/proposals/')||p.includes('/cotcomp/idempotency/')));
    const v2Path=v2.operations.find(x=>x.entity==='proposal_version').path;
    const v2Stored=proposalRead[v2Path].data;
    const v1After=proposalRead[v1Path].data;
    if(v1After.validationState!=='SUPERSEDED'||v1After.isCurrentVersion!==false)throw new Error('S466_W3_SUPERSESSION_INVALID');
    const validity=versioning.evaluateCurrentValidity(v2Stored.validity,AS_OF);
    const eligible=proposals.evaluateComparisonEligibility(v2Stored,{currentValidityConfirmed:validity.current});
    if(v2Stored.validationState!=='VALIDATED'||v2Stored.isCurrentVersion!==true||validity.current!==true||eligible.eligible!==true)throw new Error('S466_W3_CURRENT_ELIGIBLE_INVALID');

    // W4: create comparison only. Real-user selection must remain blocked because no explicit user choice evidence exists.
    const cmpBase=data.buildComparisonSet({
      tenantId:TENANT_ID,caseId,proposalIds:[v2Stored.proposalId],
      criteriaKeys:['premium','coverages','deductibles'],generatedAt:'2026-10-01T00:00:00Z'
    });
    if(!cmpBase.ok)throw new Error('S466_W4_COMPARISON_PLAN_INVALID');
    const cmp={...cmpBase.value,w5Pilot:true,pilotRunId:runId};
    const cmpPath=data.pathFor(TENANT_ID,data.ENTITY.COMPARISON_SET,cmp.comparisonSetId);
    const cmpRef=db.doc(cmpPath);
    const cmpStart=await cmpRef.get();
    if(cmpStart.exists)throw new Error('S466_W4_COMPARISON_PATH_COLLISION');
    await cmpRef.create(cmp);
    createdPaths.push(cmpPath);

    const blockedSelection=selection.buildAtomicSelectionPlan({
      tenantId:TENANT_ID,caseId,comparisonSetId:cmp.comparisonSetId,proposalId:v2Stored.proposalId,
      selectionRequestKey:runId+'-selection',explicitUserChoice:false,
      comparisonSet:cmp,proposal:v2Stored,quoteCase:realCaseBefore,asOf:AS_OF
    });
    if(blockedSelection.ok!==false||blockedSelection.code!=='EXPLICIT_USER_CHOICE_REQUIRED')throw new Error('S466_W4_MUST_BLOCK_WITHOUT_EXPLICIT_USER_CHOICE');

    const caseDuring=await db.doc(realCasePath).get();
    if(!caseDuring.exists||digest(caseDuring.data())!==realCaseBeforeDigest)throw new Error('S466_REAL_CASE_MUTATED_DURING_PILOT');

    const beforeCleanup=await readDocs(db,createdPaths);
    if(Object.values(beforeCleanup).some(x=>!x.exists))throw new Error('S466_CREATED_DOC_MISSING_BEFORE_ROLLBACK');
    for(const row of Object.values(beforeCleanup))if(!owned(row.data,runId))throw new Error('S466_CREATED_DOC_OWNERSHIP_INVALID');

    const rollback=await cleanup(db,runId,realCasePath,realCaseBefore,createdPaths);
    if(rollback.deleted!==7)throw new Error('S466_ROLLBACK_DELETE_COUNT_'+rollback.deleted);
    const finalCreated=await readDocs(db,createdPaths);
    if(!allAbsent(finalCreated))throw new Error('S466_FINAL_PILOT_DOC_ABSENCE_FAILED');
    const finalCase=await db.doc(realCasePath).get();
    if(!finalCase.exists||digest(finalCase.data())!==realCaseBeforeDigest)throw new Error('S466_REAL_CASE_FINAL_DIGEST_MISMATCH');

    return {
      schemaVersion:'ays-cotcomp-s466-w5-realdata-pilot-receipt-v1.0',
      version:VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,
      outcome:'PASS',pilotExecuted:true,
      discovery:{
        recordsScanned:scanned.length,
        eligibleCount:selected.eligibleCount,
        maxExistingRecordsScanned:MAX_EXISTING_RECORDS_SCANNED,
        selectedRealRecordsTouched:1
      },
      commitments:{
        caseSelectorSha256:caseCommitment,
        actorSelectorSha256:actorCommitment,
        consentEvidenceSha256:consentEvidenceCommitment
      },
      w1:{realQuoteCaseValidated:true,writes:0,beforeDigest:realCaseBeforeDigest},
      w2:{coreProjectionWrites:2,readback:true,providerOutboxCreated:false,providerDeliveryExecuted:false},
      w3:{
        v1Writes:2,v1RetryWrites:0,v1ConflictDenied:true,
        v2Writes:3,v2RetryWrites:0,v2ConflictDenied:true,
        v1Superseded:true,v2ValidatedCurrent:true,providerOrRaterCalls:0
      },
      w4:{
        comparisonSetWrites:1,
        explicitUserChoiceEvidencePresent:false,
        selectionPersistenceBlocked:true,
        blockCode:'EXPLICIT_USER_CHOICE_REQUIRED',
        selectionWrites:0,
        realQuoteCasePatched:false
      },
      rollback:{
        disposition:'ROLLBACK_TO_BEFORE_STATE',
        deletes:7,
        realCaseRestoreWriteRequired:false,
        realCaseFinalDigestMatches:true,
        pilotDocumentsFinalAbsent:true
      },
      writeAccounting:{
        pilotCreateOrUpdateWrites:8,
        realRecordWrites:0,
        rollbackDeletes:7,
        rollbackRealRecordWrites:0,
        totalAppDataMutations:15,
        netPilotDocuments:0
      },
      boundaries:{
        realDataRead:true,
        realDataWrite:false,
        realDataSubjectsTouched:1,
        existingRealRecordsTouched:1,
        productionTouched:false,
        providerOrRaterCallsExecuted:0,
        issuanceExecuted:false,
        bindingExecuted:false,
        paymentExecuted:false,
        healthSensitiveDataTouched:false,
        rawPiiEmittedInReceipt:false
      }
    };
  }catch(err){
    if(touched){
      try{await cleanup(db,runId,realCasePath,realCaseBefore,createdPaths);}catch(cleanErr){
        throw new Error('S466_PILOT_AND_ROLLBACK_FAILED:'+clean(err&&err.message,240)+':'+clean(cleanErr&&cleanErr.message,240));
      }
    }
    throw err;
  }
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,COUNTRY,JOURNEY_ID,MAX_EXISTING_RECORDS_SCANNED,AS_OF,
  sha,digest,isEligibleRealQuoteCase,chooseCandidate,consentCommitment,run
});

if(require.main===module){
  run().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{
    console.error(clean(e&&e.stack||e,1200));
    process.exit(1);
  });
}
