'use strict';

const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const versioning=require('./cotcomp-proposal-versioning-contract-s452');
const proposals=require('./cotcomp-proposal-contracts');

const VERSION='ays-cotcomp-s453-w3-controlled-write-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const AS_OF='2026-10-15T12:00:00Z';

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function owned(data,runId){
  if(!data||typeof data!=='object')return false;
  if(data.provenance&&data.provenance.synthetic===true&&data.provenance.proofRunId===runId)return true;
  if(data.proofRunId===runId&&data.synthetic===true)return true;
  return false;
}
async function readPaths(db,paths){
  const out={};
  for(const p of paths){
    const s=await db.doc(p).get();
    out[p]={exists:s.exists,data:s.exists?s.data():null,updateTime:s.updateTime?s.updateTime.toDate().toISOString():null};
  }
  return out;
}
function digests(map){
  return Object.fromEntries(Object.entries(map).map(([p,r])=>[p,r.exists?versioning.digest(r.data):null]));
}
function allAbsent(map){return Object.values(map).every(r=>r.exists===false);}

function fixture(runId){
  runId=clean(runId,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  if(!/^s453-[A-Za-z0-9._:-]{4,90}$/.test(runId))throw new Error('S453_PROOF_RUN_ID_INVALID');
  const common={
    tenantId:TENANT_ID,
    caseId:'qcase_'+runId,
    country:'GT',product:'AUTO',currency:'GTQ',
    insurerId:'insurer_'+runId,
    insurerDisplayName:'Synthetic Insurer',
    sourceId:'source_'+runId,
    planName:'Synthetic Plan',
    premium:2500,
    coverages:{collision:'COVERED'},limits:{},sublimits:{},deductibles:{},assistance:{},
    conditions:[],exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{synthetic:true,proofRunId:runId},
    validationState:'VALIDATED',
    validatedBy:'s453-physical-proof',
    validatedAt:'2026-10-01T00:00:00Z'
  };
  const v1=versioning.buildAtomicVersionPlan({...common,versionNumber:1,requestKey:runId+'-v1'});
  if(!v1.ok)throw new Error('S453_V1_PLAN_'+v1.code);
  const v2=versioning.buildAtomicVersionPlan({...common,premium:2600,versionNumber:2,requestKey:runId+'-v2',supersedesProposalId:v1.proposal.proposalId,previousProposal:v1.proposal});
  if(!v2.ok)throw new Error('S453_V2_PLAN_'+v2.code);
  const paths={
    v1:versioning.pathForProposal(TENANT_ID,v1.proposal.proposalId),
    idem1:versioning.pathForIdempotency(TENANT_ID,v1.requestId),
    v2:versioning.pathForProposal(TENANT_ID,v2.proposal.proposalId),
    idem2:versioning.pathForIdempotency(TENANT_ID,v2.requestId)
  };
  return {runId,common,v1,v2,paths,allPaths:Object.values(paths)};
}

async function commitV1(db,fx,plan){
  return db.runTransaction(async tx=>{
    const idemRef=db.doc(fx.paths.idem1), propRef=db.doc(fx.paths.v1);
    const [idem,prop]=await Promise.all([tx.get(idemRef),tx.get(propRef)]);
    if(idem.exists){
      const d=idem.data();
      if(d.requestDigest===plan.requestDigest&&d.proposalId===plan.proposal.proposalId&&prop.exists&&versioning.digest(prop.data())===versioning.digest(plan.proposal)){
        return {reused:true,writes:0};
      }
      throw Object.assign(new Error('PROPOSAL_IDEMPOTENCY_CONFLICT'),{code:'PROPOSAL_IDEMPOTENCY_CONFLICT'});
    }
    if(prop.exists)throw Object.assign(new Error('PROPOSAL_VERSION_ALREADY_EXISTS'),{code:'PROPOSAL_VERSION_ALREADY_EXISTS'});
    tx.create(propRef,plan.proposal);
    const idemPayload={...plan.operations.find(x=>x.entity==='proposal_version_request').payload,proofRunId:fx.runId,synthetic:true};
    tx.create(idemRef,idemPayload);
    return {reused:false,writes:2};
  });
}

async function commitV2(db,fx,plan){
  return db.runTransaction(async tx=>{
    const idemRef=db.doc(fx.paths.idem2), prevRef=db.doc(fx.paths.v1), nextRef=db.doc(fx.paths.v2);
    const [idem,prev,next]=await Promise.all([tx.get(idemRef),tx.get(prevRef),tx.get(nextRef)]);
    if(idem.exists){
      const d=idem.data();
      if(d.requestDigest===plan.requestDigest&&d.proposalId===plan.proposal.proposalId&&prev.exists&&next.exists){
        const prevExpected=plan.operations.find(x=>x.entity==='proposal_previous').payload;
        if(versioning.digest(prev.data())===versioning.digest(prevExpected)&&versioning.digest(next.data())===versioning.digest(plan.proposal))return {reused:true,writes:0};
      }
      throw Object.assign(new Error('PROPOSAL_IDEMPOTENCY_CONFLICT'),{code:'PROPOSAL_IDEMPOTENCY_CONFLICT'});
    }
    if(!prev.exists)throw new Error('PREVIOUS_PROPOSAL_MISSING');
    if(next.exists)throw Object.assign(new Error('PROPOSAL_VERSION_ALREADY_EXISTS'),{code:'PROPOSAL_VERSION_ALREADY_EXISTS'});
    const prevOp=plan.operations.find(x=>x.entity==='proposal_previous');
    if(versioning.digest(prev.data())!==prevOp.expectedBeforeDigest)throw Object.assign(new Error('PREVIOUS_PROPOSAL_DIGEST_CONFLICT'),{code:'PREVIOUS_PROPOSAL_DIGEST_CONFLICT'});
    tx.update(prevRef,prevOp.payload);
    tx.create(nextRef,plan.proposal);
    const idemPayload={...plan.operations.find(x=>x.entity==='proposal_version_request').payload,proofRunId:fx.runId,synthetic:true};
    tx.create(idemRef,idemPayload);
    return {reused:false,writes:3};
  });
}

async function cleanup(db,fx){
  return db.runTransaction(async tx=>{
    const refs=fx.allPaths.map(p=>db.doc(p));
    const snaps=[];
    for(const ref of refs)snaps.push(await tx.get(ref));
    for(const s of snaps){
      if(s.exists&&!owned(s.data(),fx.runId))throw new Error('S453_CLEANUP_OWNERSHIP_MISMATCH');
    }
    let deletes=0;
    for(let i=0;i<snaps.length;i++)if(snaps[i].exists){tx.delete(refs[i]);deletes++;}
    return {deletes};
  });
}

async function run(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)throw new Error('S453_PROJECT_MISMATCH');
  const fx=fixture(process.env.S453_PROOF_RUN_ID);
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);
  const initial=await readPaths(db,fx.allPaths);
  if(!allAbsent(initial))throw new Error('S453_PATHS_NOT_CLEAN_AT_START');

  let touched=false;
  try{
    const firstV1=await commitV1(db,fx,fx.v1); touched=true;
    if(firstV1.reused||firstV1.writes!==2)throw new Error('S453_V1_FIRST_WRITE_INVALID');
    const v1Read=await readPaths(db,[fx.paths.v1,fx.paths.idem1]);
    if(Object.values(v1Read).some(x=>!x.exists))throw new Error('S453_V1_READBACK_MISSING');
    const v1DigestBefore=versioning.digest(v1Read[fx.paths.v1].data);

    const retryV1=await commitV1(db,fx,fx.v1);
    if(!retryV1.reused||retryV1.writes!==0)throw new Error('S453_V1_RETRY_INVALID');
    let conflictV1Denied=false;
    try{
      const bad={...fx.common,premium:2555,versionNumber:1,requestKey:fx.runId+'-v1'};
      const badPlan=versioning.buildAtomicVersionPlan(bad);
      await commitV1(db,fx,badPlan);
    }catch(e){conflictV1Denied=e&&e.code==='PROPOSAL_IDEMPOTENCY_CONFLICT';}
    if(!conflictV1Denied)throw new Error('S453_V1_CONFLICT_NOT_DENIED');

    const beforeV2=(await db.doc(fx.paths.v1).get()).data();
    const v2Plan=versioning.buildAtomicVersionPlan({...fx.common,premium:2600,versionNumber:2,requestKey:fx.runId+'-v2',supersedesProposalId:fx.v1.proposal.proposalId,previousProposal:beforeV2});
    if(!v2Plan.ok)throw new Error('S453_V2_RUNTIME_PLAN_'+v2Plan.code);

    const firstV2=await commitV2(db,fx,v2Plan);
    if(firstV2.reused||firstV2.writes!==3)throw new Error('S453_V2_FIRST_WRITE_INVALID');
    const afterV2=await readPaths(db,fx.allPaths);
    if(Object.values(afterV2).some(x=>!x.exists))throw new Error('S453_V2_READBACK_MISSING');
    const v1After=afterV2[fx.paths.v1].data, v2After=afterV2[fx.paths.v2].data;
    if(v1After.validationState!=='SUPERSEDED'||v1After.isCurrentVersion!==false||v1After.supersededByProposalId!==v2After.proposalId)throw new Error('S453_SUPERSESSION_INVALID');
    if(v2After.validationState!=='VALIDATED'||v2After.isCurrentVersion!==true||v2After.supersedesProposalId!==v1After.proposalId)throw new Error('S453_V2_CURRENT_INVALID');

    const retryV2=await commitV2(db,fx,v2Plan);
    if(!retryV2.reused||retryV2.writes!==0)throw new Error('S453_V2_RETRY_INVALID');
    let conflictV2Denied=false;
    try{
      const badV2=versioning.buildAtomicVersionPlan({...fx.common,premium:2700,versionNumber:2,requestKey:fx.runId+'-v2',supersedesProposalId:fx.v1.proposal.proposalId,previousProposal:beforeV2});
      await commitV2(db,fx,badV2);
    }catch(e){conflictV2Denied=e&&e.code==='PROPOSAL_IDEMPOTENCY_CONFLICT';}
    if(!conflictV2Denied)throw new Error('S453_V2_CONFLICT_NOT_DENIED');

    const validity=versioning.evaluateCurrentValidity(v2After.validity,AS_OF);
    const v1Eligible=proposals.evaluateComparisonEligibility(v1After,{currentValidityConfirmed:versioning.evaluateCurrentValidity(v1After.validity,AS_OF).current});
    const v2Eligible=proposals.evaluateComparisonEligibility(v2After,{currentValidityConfirmed:validity.current});
    if(validity.current!==true||v1Eligible.eligible!==false||v2Eligible.eligible!==true)throw new Error('S453_CURRENT_VALIDITY_OR_ELIGIBILITY_INVALID');

    const beforeCleanup=await readPaths(db,fx.allPaths);
    const cleanupResult=await cleanup(db,fx);
    if(cleanupResult.deletes!==4)throw new Error('S453_CLEANUP_COUNT_INVALID');
    const final=await readPaths(db,fx.allPaths);
    if(!allAbsent(final))throw new Error('S453_FINAL_ABSENCE_FAILED');

    return {
      schemaVersion:'ays-cotcomp-s453-w3-controlled-write-receipt-v1.0',
      version:VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,proofRunId:fx.runId,syntheticOnly:true,
      identifiers:{proposalSeriesId:v2After.proposalSeriesId,v1ProposalId:v1After.proposalId,v2ProposalId:v2After.proposalId,v1RequestId:fx.v1.requestId,v2RequestId:v2Plan.requestId},
      v1:{firstWrite:{writes:2,reused:false},readback:true,retry:{writes:0,reused:true},conflictDenied:true,digestBeforeV2:v1DigestBefore},
      v2:{firstWrite:{writes:3,reused:false},readback:true,retry:{writes:0,reused:true},conflictDenied:true},
      supersession:{v1ValidationState:v1After.validationState,v1IsCurrentVersion:v1After.isCurrentVersion,v1SupersededByProposalId:v1After.supersededByProposalId,v2IsCurrentVersion:v2After.isCurrentVersion,v2SupersedesProposalId:v2After.supersedesProposalId},
      validity:{asOf:AS_OF,v2Current:validity.current,v2Reason:validity.reason,v1ComparisonEligible:v1Eligible.eligible,v2ComparisonEligible:v2Eligible.eligible},
      readback:{documentCount:4,digests:digests(beforeCleanup)},
      cleanup:{deletes:4,finalAbsence:true},
      writeAccounting:{v1Writes:2,v1RetryWrites:0,v1ConflictWrites:0,v2Writes:3,v2RetryWrites:0,v2ConflictWrites:0,cleanupDeletes:4,totalAppDataMutations:9,netPersistentDocuments:0},
      boundaries:{providerOrRaterCallsExecuted:0,realDataTouched:false,productionTouched:false,selectionPersistence:false}
    };
  }catch(err){
    if(touched){
      try{await cleanup(db,fx);}catch(cleanErr){throw new Error('S453_PROOF_AND_CLEANUP_FAILED:'+clean(err&&err.message)+':'+clean(cleanErr&&cleanErr.message));}
    }
    throw err;
  }
}

module.exports=Object.freeze({VERSION,PROJECT_ID,TENANT_ID,AS_OF,fixture,commitV1,commitV2,cleanup,run});

if(require.main===module){
  run().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{console.error(clean(e&&e.stack||e,1200));process.exit(1);});
}
