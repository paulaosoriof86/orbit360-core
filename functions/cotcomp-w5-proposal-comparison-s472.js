'use strict';

const fs=require('node:fs');
const crypto=require('node:crypto');
const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');

const data=require('./cotcomp-runtime-data-contract');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');
const intake=require('./cotcomp-pilot-intake-s467');
const s468=require('./cotcomp-w5-real-submission-s468');
const s470=require('./cotcomp-owner-proposal-evidence-s470');
const s471=require('./cotcomp-pilot-proposal-validation-s471');

const VERSION='ays-cotcomp-s472-real-proposal-comparison-rollback-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const JOURNEY_ID='GT_AUTO_MOTO_HYBRID';
const COUNTRY='GT';
const PRODUCT='AUTO';
const VALIDATION_STATE_PATH=s471.STATE_PATH;
const MAX_PROPOSALS=3;
const MAX_COMPARISON_SETS=1;
const EXPECTED_TEMP_DOCS=7;

function clean(v,max=300){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
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
function iso(v){
  try{
    if(v&&typeof v.toDate==='function')return v.toDate().toISOString();
    const d=new Date(String(v||''));return Number.isFinite(d.getTime())?d.toISOString():null;
  }catch{return null;}
}
function norm(v){
  return clean(v,220).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
}
function allAbsent(rows){return rows.every(x=>x.exists===false);}
async function readPaths(db,paths){
  const rows=[];
  for(const path of paths){
    const s=await db.doc(path).get();
    rows.push({path,exists:s.exists,digest:s.exists?digest(s.data()):null,data:s.exists?s.data():null,updateTime:s.updateTime?iso(s.updateTime):null});
  }
  return rows;
}
function verifyValidationState(state){
  if(!state||typeof state!=='object')throw new Error('S472_VALIDATION_STATE_MISSING');
  if(state.used!==true)throw new Error('S472_VALIDATION_NOT_USED');
  if(state.ownerHumanValidation!==true)throw new Error('S472_OWNER_HUMAN_VALIDATION_MISSING');
  if(state.secondControlledExecutionAuthorized!==true)throw new Error('S472_SECOND_EXECUTION_AUTH_MISSING');
  if(state.containsPii!==false||state.rawBearerStored!==false)throw new Error('S472_VALIDATION_PRIVACY_STATE_INVALID');
  if(Number(state.sourceDocumentCount)!==2||Number(state.documentaryAlternativeCount)!==3)throw new Error('S472_VALIDATION_EVIDENCE_COUNT_INVALID');
  if(clean(state.caseMatchCommitmentSha256,80)!==s470.CASE_MATCH_COMMITMENT_SHA256)throw new Error('S472_CASE_MATCH_COMMITMENT_MISMATCH');
  if(state.scope==null||typeof state.scope!=='object')throw new Error('S472_SCOPE_MISSING');
  const scope=state.scope;
  if(clean(scope.projectId,180)!==PROJECT_ID||clean(scope.tenantId,180)!==TENANT_ID)throw new Error('S472_SCOPE_PROJECT_TENANT_INVALID');
  if(Number(scope.maxProposals)!==3||Number(scope.maxComparisonSets)!==1)throw new Error('S472_SCOPE_COUNTS_INVALID');
  for(const key of ['providerOrRater','production','issuance','binding','payment','generalPersistenceRelease','explicitSelection']){
    if(scope[key]!==false)throw new Error('S472_SCOPE_'+key.toUpperCase()+'_MUST_BE_FALSE');
  }
  if(scope.rollbackRequired!==true)throw new Error('S472_SCOPE_ROLLBACK_REQUIRED');

  const validatedAt=iso(state.validatedAt);
  if(!validatedAt)throw new Error('S472_VALIDATED_AT_INVALID');
  const expected=s471.buildState(validatedAt);
  for(const key of ['ownerAttestationSha256','secondExecutionAuthorizationSha256','sourceBundleDigestSha256','alternativesDigestSha256','caseMatchCommitmentSha256']){
    if(clean(state[key],80)!==clean(expected[key],80))throw new Error('S472_VALIDATION_COMMITMENT_MISMATCH_'+key);
  }
  if(state.secondExecutionStatus)throw new Error('S472_SECOND_EXECUTION_ALREADY_CONSUMED');
  return {
    validatedAt,
    ownerAttestationSha256:state.ownerAttestationSha256,
    secondExecutionAuthorizationSha256:state.secondExecutionAuthorizationSha256,
    sourceBundleDigestSha256:state.sourceBundleDigestSha256,
    alternativesDigestSha256:state.alternativesDigestSha256
  };
}
function prepareExecution({caseId,ownerAttestationSha256,validatedAt,generatedAt}={}){
  const now=iso(generatedAt);
  if(!now)return {ok:false,code:'S472_GENERATED_AT_REQUIRED'};
  const built=s470.buildSourceOnlyCandidates({
    caseId:clean(caseId,180),
    ownerAttestationSha256:clean(ownerAttestationSha256,80),
    validatedAt,
    asOf:now
  });
  if(!built.ok)return built;
  if(built.candidates.length!==MAX_PROPOSALS)return {ok:false,code:'S472_PROPOSAL_COUNT_INVALID'};

  const proposalDocs=[];
  const requestDocs=[];
  const proposalIds=[];
  const proposalValues=[];
  for(const c of built.candidates){
    if(c.eligibleForRealW3!==true)return {ok:false,code:'S472_PROPOSAL_NOT_ELIGIBLE'};
    if(c.plan.proposal.validationState!=='VALIDATED'||c.plan.proposal.isCurrentVersion!==true)return {ok:false,code:'S472_PROPOSAL_STATE_INVALID'};
    const pOp=c.plan.operations.find(x=>x.entity==='proposal_version');
    const rOp=c.plan.operations.find(x=>x.entity==='proposal_version_request');
    if(!pOp||!rOp)return {ok:false,code:'S472_PLAN_OPERATIONS_INVALID'};
    proposalDocs.push({path:pOp.path,payload:pOp.payload,requestDigest:c.plan.requestDigest,requestPath:rOp.path});
    requestDocs.push({path:rOp.path,payload:rOp.payload,requestDigest:c.plan.requestDigest});
    proposalIds.push(c.plan.proposal.proposalId);
    proposalValues.push(c.plan.proposal);
  }
  if(new Set(proposalIds).size!==3)return {ok:false,code:'S472_PROPOSAL_IDS_NOT_UNIQUE'};

  const comparison=data.buildComparisonSet({
    tenantId:TENANT_ID,
    caseId:clean(caseId,180),
    proposalIds,
    criteriaKeys:['premium','coverages','limits','sublimits','deductibles','assistance','conditions','exclusions'],
    generatedAt:now
  });
  if(!comparison.ok)return comparison;
  if(comparison.value.rankingPolicy!=='NONE_BY_DEFAULT'||comparison.value.silentWeighting!==false||comparison.value.missingSemantics!=='MISSING_IS_NOT_NOT_COVERED'){
    return {ok:false,code:'S472_COMPARISON_TRUTH_INVALID'};
  }
  const comparisonPath=data.pathFor(TENANT_ID,data.ENTITY.COMPARISON_SET,comparison.value.comparisonSetId);
  const tempDocs=[
    ...proposalDocs.map(x=>({path:x.path,payload:x.payload,kind:'PROPOSAL'})),
    ...requestDocs.map(x=>({path:x.path,payload:x.payload,kind:'IDEMPOTENCY'})),
    {path:comparisonPath,payload:comparison.value,kind:'COMPARISON_SET'}
  ];
  if(tempDocs.length!==EXPECTED_TEMP_DOCS||new Set(tempDocs.map(x=>x.path)).size!==EXPECTED_TEMP_DOCS){
    return {ok:false,code:'S472_TEMP_JOURNAL_INVALID'};
  }
  const dto=data.buildPublicComparisonDto({caseId,comparisonSet:comparison.value,proposals:proposalValues});
  if(!dto||dto.alternatives.length!==3||dto.rankingPolicy!=='NONE_BY_DEFAULT'||dto.silentWeighting!==false){
    return {ok:false,code:'S472_PUBLIC_DTO_INVALID'};
  }
  const w4=data.buildSelection({
    tenantId:TENANT_ID,
    caseId:clean(caseId,180),
    comparisonSetId:comparison.value.comparisonSetId,
    proposalId:proposalIds[0],
    selectionRequestKey:'s472-no-user-choice',
    explicitUserChoice:false,
    createdAt:now
  });
  if(w4.ok!==false||w4.code!=='EXPLICIT_USER_CHOICE_REQUIRED')return {ok:false,code:'S472_EXPLICIT_CHOICE_CONTROL_INVALID'};

  return Object.freeze({
    ok:true,
    generatedAt:now,
    candidates:built.candidates,
    proposalDocs:Object.freeze(proposalDocs),
    requestDocs:Object.freeze(requestDocs),
    proposalIds:Object.freeze(proposalIds),
    proposalValues:Object.freeze(proposalValues),
    comparison:Object.freeze(comparison.value),
    comparisonPath,
    tempDocs:Object.freeze(tempDocs),
    publicDto:Object.freeze(dto),
    w4:Object.freeze(w4)
  });
}
async function claimExecution(db,runCommitmentSha256,expectedCommitments){
  const ref=db.doc(VALIDATION_STATE_PATH);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw new Error('S472_VALIDATION_STATE_MISSING_AT_CLAIM');
    const state=snap.data()||{};
    verifyValidationState(state);
    if(clean(state.ownerAttestationSha256,80)!==clean(expectedCommitments.ownerAttestationSha256,80))throw new Error('S472_OWNER_COMMITMENT_CHANGED');
    if(clean(state.secondExecutionAuthorizationSha256,80)!==clean(expectedCommitments.secondExecutionAuthorizationSha256,80))throw new Error('S472_AUTH_COMMITMENT_CHANGED');
    tx.update(ref,{
      secondExecutionStatus:'IN_PROGRESS',
      secondExecutionRunCommitmentSha256:runCommitmentSha256,
      secondExecutionClaimedAt:new Date().toISOString()
    });
  });
}
async function finalizeExecution(db,runCommitmentSha256,outcome,receiptSha256){
  const ref=db.doc(VALIDATION_STATE_PATH);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw new Error('S472_VALIDATION_STATE_MISSING_AT_FINALIZE');
    const state=snap.data()||{};
    if(state.secondExecutionStatus!=='IN_PROGRESS')throw new Error('S472_EXECUTION_NOT_IN_PROGRESS');
    if(clean(state.secondExecutionRunCommitmentSha256,80)!==runCommitmentSha256)throw new Error('S472_RUN_COMMITMENT_MISMATCH');
    tx.update(ref,{
      secondExecutionStatus:outcome,
      secondExecutionConsumed:true,
      secondExecutionCompletedAt:new Date().toISOString(),
      secondExecutionReceiptSha256:receiptSha256
    });
  });
}
async function createTempDocsAtomic(db,tempDocs){
  await db.runTransaction(async tx=>{
    const snaps=[];
    for(const d of tempDocs)snaps.push(await tx.get(db.doc(d.path)));
    if(snaps.some(s=>s.exists))throw new Error('S472_TEMP_PATH_ALREADY_EXISTS');
    for(const d of tempDocs)tx.create(db.doc(d.path),d.payload);
  });
}
async function cleanupExact(db,baseline){
  await db.runTransaction(async tx=>{
    const snaps=[];
    for(const row of baseline)snaps.push(await tx.get(db.doc(row.path)));
    for(let i=0;i<baseline.length;i++){
      if(!snaps[i].exists)throw new Error('S472_ROLLBACK_PATH_MISSING');
      if(digest(snaps[i].data())!==baseline[i].digest)throw new Error('S472_ROLLBACK_DIGEST_MISMATCH');
    }
    for(const row of baseline)tx.delete(db.doc(row.path));
  });
}
async function cleanupExpected(db,expected){
  const rows=await readPaths(db,expected.map(x=>x.path));
  const present=rows.filter(x=>x.exists);
  if(!present.length)return {deleted:0};
  const expectedByPath=Object.fromEntries(expected.map(x=>[x.path,x]));
  for(const row of present){
    const exp=expectedByPath[row.path];
    if(!exp||row.digest!==exp.digest)throw new Error('S472_RECOVERY_DIGEST_MISMATCH');
  }
  await db.runTransaction(async tx=>{
    const snaps=[];
    for(const row of present)snaps.push({row,snap:await tx.get(db.doc(row.path))});
    for(const x of snaps){
      if(!x.snap.exists||digest(x.snap.data())!==expectedByPath[x.row.path].digest)throw new Error('S472_RECOVERY_RECHECK_MISMATCH');
    }
    for(const x of snaps)tx.delete(db.doc(x.row.path));
  });
  return {deleted:present.length};
}
async function run(){
  if((process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID)!==PROJECT_ID)throw new Error('S472_PROJECT_MISMATCH');
  const privatePath=clean(process.env.S472_PRIVATE_STATE_PATH,600);
  const receiptPath=clean(process.env.S472_RECEIPT_PATH,600);
  const runId=clean(process.env.S472_RUN_ID,120);
  const sourceSha=clean(process.env.S472_SOURCE_SHA,80);
  if(!privatePath||!receiptPath||!runId||!sourceSha)throw new Error('S472_ENV_REQUIRED');
  const runCommitmentSha256=sha(['S472',runId,sourceSha,TENANT_ID].join('|'));

  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);

  const validationSnap=await db.doc(VALIDATION_STATE_PATH).get();
  if(!validationSnap.exists)throw new Error('S472_VALIDATION_STATE_MISSING');
  const validation=verifyValidationState(validationSnap.data()||{});

  const intakeSnap=await db.doc(intake.STATE_PATH).get();
  if(!intakeSnap.exists)throw new Error('S472_INTAKE_STATE_MISSING');
  const intakeState=intakeSnap.data()||{};
  if(intakeState.used!==true||!clean(intakeState.quoteCaseId,220)||!clean(intakeState.quoteCasePath,600))throw new Error('S472_INTAKE_STATE_INVALID');

  const caseId=clean(intakeState.quoteCaseId,220);
  const casePath=clean(intakeState.quoteCasePath,600);
  const caseSnap=await db.doc(casePath).get();
  if(!caseSnap.exists)throw new Error('S472_QUOTECASE_MISSING');
  const caseData=caseSnap.data()||{};
  if(!s468.intakeEligible({data:caseData})||!s468.healthSensitiveAbsent(caseData))throw new Error('S472_QUOTECASE_NOT_ELIGIBLE');
  const expectedCasePath=data.pathFor(TENANT_ID,data.ENTITY.QUOTE_CASE,caseId);
  if(casePath!==expectedCasePath)throw new Error('S472_QUOTECASE_PATH_INVALID');
  const brand=norm(caseData.capturedFields&&caseData.capturedFields.brand);
  const line=norm(caseData.capturedFields&&caseData.capturedFields.lineModel);
  if(brand!=='TOYOTA'||!line.includes('YARIS'))throw new Error('S472_W5_RISK_FAMILY_MISMATCH');
  const caseBeforeDigest=digest(caseData);

  const existingProposals=await db.collection(data.pathFor(TENANT_ID,data.ENTITY.PROPOSAL)).where('caseId','==',caseId).limit(8).get();
  const existingComparisons=await db.collection(data.pathFor(TENANT_ID,data.ENTITY.COMPARISON_SET)).where('caseId','==',caseId).limit(8).get();
  if(existingProposals.size!==0||existingComparisons.size!==0)throw new Error('S472_PREEXISTING_W3_DOCS_DETECTED');

  const generatedAt=new Date().toISOString();
  const prepared=prepareExecution({
    caseId,
    ownerAttestationSha256:validation.ownerAttestationSha256,
    validatedAt:validation.validatedAt,
    generatedAt
  });
  if(!prepared.ok)throw new Error(prepared.code||'S472_PREPARATION_FAILED');

  const expected=prepared.tempDocs.map(d=>({path:d.path,digest:digest(d.payload),kind:d.kind}));
  const initial=await readPaths(db,expected.map(x=>x.path));
  if(!allAbsent(initial))throw new Error('S472_TEMP_PATHS_NOT_CLEAN');

  fs.writeFileSync(privatePath,JSON.stringify({
    projectId:PROJECT_ID,
    tenantId:TENANT_ID,
    validationStatePath:VALIDATION_STATE_PATH,
    casePath,
    caseBeforeDigest,
    runCommitmentSha256,
    expected
  }),{mode:0o600});

  let claimed=false,created=false,baseline=null;
  try{
    await claimExecution(db,runCommitmentSha256,validation);
    claimed=true;

    await createTempDocsAtomic(db,prepared.tempDocs);
    created=true;

    baseline=await readPaths(db,expected.map(x=>x.path));
    if(baseline.length!==EXPECTED_TEMP_DOCS||baseline.some(x=>!x.exists))throw new Error('S472_TEMP_READBACK_COUNT_INVALID');
    for(let i=0;i<baseline.length;i++)if(baseline[i].digest!==expected[i].digest)throw new Error('S472_TEMP_READBACK_DIGEST_INVALID');

    const proposals=baseline.filter(x=>x.path.includes('/proposals/items/'));
    const requests=baseline.filter(x=>x.path.includes('/idempotency/items/'));
    const comparisons=baseline.filter(x=>x.path.includes('/comparisonSets/items/'));
    if(proposals.length!==3||requests.length!==3||comparisons.length!==1)throw new Error('S472_TEMP_TYPES_INVALID');

    for(const row of proposals){
      const p=row.data||{};
      if(clean(p.caseId,180)!==caseId||p.validationState!=='VALIDATED'||p.isCurrentVersion!==true||Number(p.versionNumber)!==1)throw new Error('S472_PROPOSAL_READBACK_INVALID');
      if(!p.provenance||p.provenance.humanValidated!==true||p.provenance.providerOrRaterCallsExecuted!==0||p.provenance.rawDocumentStoredInCotComp!==false||p.provenance.piiCopiedToProposal!==false)throw new Error('S472_PROPOSAL_PROVENANCE_INVALID');
      const validity=versioning.evaluateCurrentValidity(p.validity,generatedAt);
      if(validity.current!==true)throw new Error('S472_PROPOSAL_NOT_CURRENT');
    }
    for(const d of prepared.requestDocs){
      const row=baseline.find(x=>x.path===d.path);
      const decision=versioning.retryDecision(row.data,{requestDigest:d.requestDigest});
      if(decision.action!=='REUSE'||decision.writes!==0)throw new Error('S472_IDEMPOTENCY_RETRY_INVALID');
    }
    const comparisonRow=comparisons[0];
    const cmp=comparisonRow.data||{};
    if(clean(cmp.caseId,180)!==caseId||!Array.isArray(cmp.proposalIds)||cmp.proposalIds.length!==3)throw new Error('S472_COMPARISON_READBACK_INVALID');
    if(cmp.rankingPolicy!=='NONE_BY_DEFAULT'||cmp.silentWeighting!==false||cmp.missingSemantics!=='MISSING_IS_NOT_NOT_COVERED'||cmp.eligibility!=='VALIDATED_AND_CURRENT_ONLY')throw new Error('S472_COMPARISON_POLICY_INVALID');

    const dto=data.buildPublicComparisonDto({caseId,comparisonSet:cmp,proposals:proposals.map(x=>x.data)});
    if(dto.alternatives.length!==3||dto.rankingPolicy!=='NONE_BY_DEFAULT'||dto.silentWeighting!==false||dto.missingSemantics!=='MISSING_IS_NOT_NOT_COVERED')throw new Error('S472_DTO_READBACK_INVALID');

    const w4=data.buildSelection({tenantId:TENANT_ID,caseId,comparisonSetId:cmp.comparisonSetId,proposalId:cmp.proposalIds[0],selectionRequestKey:'s472-no-explicit-choice',explicitUserChoice:false,createdAt:generatedAt});
    if(w4.ok!==false||w4.code!=='EXPLICIT_USER_CHOICE_REQUIRED')throw new Error('S472_W4_CONTROL_INVALID');

    const caseDuring=await db.doc(casePath).get();
    if(!caseDuring.exists||digest(caseDuring.data())!==caseBeforeDigest)throw new Error('S472_QUOTECASE_MUTATED');

    await cleanupExact(db,baseline);
    const finalTemp=await readPaths(db,expected.map(x=>x.path));
    if(!allAbsent(finalTemp))throw new Error('S472_FINAL_TEMP_ABSENCE_FAILED');
    const finalCase=await db.doc(casePath).get();
    if(!finalCase.exists||digest(finalCase.data())!==caseBeforeDigest)throw new Error('S472_FINAL_QUOTECASE_DIGEST_MISMATCH');

    const sanitizedReceipt={
      schemaVersion:'ays-cotcomp-s472-real-proposal-comparison-receipt-v1.0',
      version:VERSION,
      projectId:PROJECT_ID,
      tenantId:TENANT_ID,
      outcome:'PASS_ROLLBACK_COMPLETE',
      authorization:{
        ownerHumanValidationVerified:true,
        secondControlledExecutionAuthorizationVerified:true,
        ownerAttestationCommitment:'PASS',
        secondExecutionAuthorizationCommitment:'PASS',
        sourceBundleCommitment:'PASS',
        alternativesCommitment:'PASS',
        oneExecutionClaimed:true
      },
      case:{
        existingRealQuoteCaseRead:true,
        capturedRiskFamilyMatch:true,
        sourceRiskReferenceHumanValidated:true,
        insuredValueWasNotCapturedByOriginalIntake:true,
        quoteCaseWrites:0,
        digestUnchanged:true
      },
      w3:{
        status:'PASS',
        realDocumentaryProposalCount:3,
        validatedCurrentProposalCount:3,
        proposalVersion:1,
        proposalCreates:3,
        idempotencyCreates:3,
        idempotencyRetryWrites:0,
        providerOrRaterCalls:0
      },
      comparison:{
        status:'PASS',
        comparisonSetCreates:1,
        alternatives:3,
        rankingPolicy:'NONE_BY_DEFAULT',
        silentWeighting:false,
        missingSemantics:'MISSING_IS_NOT_NOT_COVERED',
        publicDtoAlternatives:3
      },
      w4:{
        status:'CONTROL_PASS',
        explicitUserChoiceEvidencePresent:false,
        blockCode:'EXPLICIT_USER_CHOICE_REQUIRED',
        selectionCreated:false,
        selectionWrites:0
      },
      rollback:{
        disposition:'ROLLBACK_TO_BEFORE_STATE',
        temporaryDocumentsCreated:7,
        temporaryDocumentsDeleted:7,
        finalTemporaryDocuments:0,
        quoteCaseRestoreWriteRequired:false,
        quoteCaseFinalDigestMatches:true
      },
      mutationAccounting:{
        temporaryCreates:7,
        temporaryDeletes:7,
        temporaryNetDocuments:0,
        authorizationControlUpdates:2,
        realBusinessRecordWrites:0,
        selectionWrites:0
      },
      boundaries:{
        realDataRead:true,
        realDataSubjectsTouched:1,
        healthSensitiveDataTouched:false,
        providerOrRaterCalls:0,
        productionTouched:false,
        issuance:false,
        binding:false,
        payment:false,
        generalPersistenceReleased:false
      },
      security:{
        rawIdsInReceipt:false,
        piiInReceipt:false,
        rawPdfInCotComp:false,
        noCrossRiskMixing:true,
        executionRunCommitmentSha256:runCommitmentSha256
      }
    };
    const receiptSha256=digest(sanitizedReceipt);
    await finalizeExecution(db,runCommitmentSha256,'PASS_ROLLBACK_COMPLETE',receiptSha256);
    sanitizedReceipt.authorization.secondExecutionConsumed=true;
    sanitizedReceipt.authorization.executionStatus='PASS_ROLLBACK_COMPLETE';
    sanitizedReceipt.receiptSha256=receiptSha256;
    fs.writeFileSync(receiptPath,JSON.stringify(sanitizedReceipt,null,2));
    return sanitizedReceipt;
  }catch(e){
    let rollbackComplete=false;
    try{
      if(created){
        if(baseline)await cleanupExact(db,baseline);
        else await cleanupExpected(db,expected);
      }else{
        await cleanupExpected(db,expected);
      }
      const final=await readPaths(db,expected.map(x=>x.path));
      rollbackComplete=allAbsent(final);
      const finalCase=await db.doc(casePath).get();
      if(!finalCase.exists||digest(finalCase.data())!==caseBeforeDigest)rollbackComplete=false;
    }catch(_){
      rollbackComplete=false;
    }
    if(claimed){
      try{
        const ref=db.doc(VALIDATION_STATE_PATH);
        await db.runTransaction(async tx=>{
          const snap=await tx.get(ref);
          if(!snap.exists)return;
          const state=snap.data()||{};
          if(state.secondExecutionStatus==='IN_PROGRESS'&&clean(state.secondExecutionRunCommitmentSha256,80)===runCommitmentSha256){
            tx.update(ref,{
              secondExecutionStatus:rollbackComplete?'FAILED_ROLLBACK_COMPLETE':'FAILED_ROLLBACK_UNVERIFIED',
              secondExecutionConsumed:true,
              secondExecutionCompletedAt:new Date().toISOString()
            });
          }
        });
      }catch(_){}
    }
    throw e;
  }
}
async function recover(){
  const privatePath=clean(process.env.S472_PRIVATE_STATE_PATH,600);
  const readbackPath=clean(process.env.S472_INDEPENDENT_READBACK_PATH,600);
  if(!privatePath||!readbackPath)throw new Error('S472_RECOVERY_ENV_REQUIRED');
  if(!fs.existsSync(privatePath)){
    fs.writeFileSync(readbackPath,JSON.stringify({schemaVersion:'ays-cotcomp-s472-independent-readback-v1.0',privateStatePresent:false,recoveryRequired:false},null,2));
    return;
  }
  const p=JSON.parse(fs.readFileSync(privatePath,'utf8'));
  if(p.projectId!==PROJECT_ID||p.tenantId!==TENANT_ID||p.validationStatePath!==VALIDATION_STATE_PATH)throw new Error('S472_PRIVATE_STATE_SCOPE_INVALID');
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);

  const recovery=await cleanupExpected(db,p.expected||[]);
  const after=await readPaths(db,(p.expected||[]).map(x=>x.path));
  if(!allAbsent(after))throw new Error('S472_INDEPENDENT_FINAL_ABSENCE_FAILED');
  const caseSnap=await db.doc(p.casePath).get();
  if(!caseSnap.exists||digest(caseSnap.data())!==p.caseBeforeDigest)throw new Error('S472_INDEPENDENT_CASE_DIGEST_FAILED');

  const stateSnap=await db.doc(VALIDATION_STATE_PATH).get();
  if(!stateSnap.exists)throw new Error('S472_INDEPENDENT_VALIDATION_STATE_MISSING');
  const state=stateSnap.data()||{};
  if(state.secondExecutionStatus==='IN_PROGRESS'&&clean(state.secondExecutionRunCommitmentSha256,80)===clean(p.runCommitmentSha256,80)){
    await db.doc(VALIDATION_STATE_PATH).update({
      secondExecutionStatus:'FAILED_ROLLBACK_COMPLETE',
      secondExecutionConsumed:true,
      secondExecutionCompletedAt:new Date().toISOString()
    });
  }
  const finalState=(await db.doc(VALIDATION_STATE_PATH).get()).data()||{};
  fs.writeFileSync(readbackPath,JSON.stringify({
    schemaVersion:'ays-cotcomp-s472-independent-readback-v1.0',
    projectId:PROJECT_ID,
    tenantId:TENANT_ID,
    recoveryDeletedDocuments:recovery.deleted,
    temporaryDocumentsChecked:(p.expected||[]).length,
    finalTemporaryDocuments:0,
    quoteCasePresent:true,
    quoteCaseDigestUnchanged:true,
    secondExecutionConsumed:finalState.secondExecutionConsumed===true,
    secondExecutionStatus:clean(finalState.secondExecutionStatus,80),
    authorizationControlPresent:true,
    independentWrites:recovery.deleted>0?recovery.deleted:0,
    piiInReceipt:false,
    rawIdsInReceipt:false,
    productionTouched:false
  },null,2));
}

module.exports=Object.freeze({
  VERSION,PROJECT_ID,TENANT_ID,JOURNEY_ID,COUNTRY,PRODUCT,VALIDATION_STATE_PATH,
  MAX_PROPOSALS,MAX_COMPARISON_SETS,EXPECTED_TEMP_DOCS,
  clean,sha,digest,norm,verifyValidationState,prepareExecution,allAbsent,run,recover
});

if(require.main===module){
  const mode=clean(process.env.S472_MODE,40)||'run';
  const fn=mode==='recover'?recover:run;
  Promise.resolve(fn()).then(r=>{if(r)process.stdout.write(JSON.stringify(r,null,2)+'\n');}).catch(e=>{
    console.error(clean(e&&e.message||e,400));
    process.exit(1);
  });
}
