'use strict';

const {getApps,initializeApp,applicationDefault}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const data=require('./cotcomp-runtime-data-contract');
const selectionContract=require('./cotcomp-selection-contract-s455');

const VERSION='ays-cotcomp-s456-w4-controlled-write-v1.0';
const PROJECT_ID='ays-orbit-360-lab';
const TENANT_ID='alianzas-soluciones';
const AS_OF='2026-10-15T12:00:00Z';

function clean(v,max=220){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function owned(d,runId){return !!d&&typeof d==='object'&&d.synthetic===true&&d.proofRunId===runId;}
async function readPaths(db,paths){
  const out={};
  for(const p of paths){
    const s=await db.doc(p).get();
    out[p]={exists:s.exists,data:s.exists?s.data():null,updateTime:s.updateTime?s.updateTime.toDate().toISOString():null};
  }
  return out;
}
function digestMap(map){return Object.fromEntries(Object.entries(map).map(([p,r])=>[p,r.exists?selectionContract.digest(r.data):null]));}
function allAbsent(map){return Object.values(map).every(r=>r.exists===false);}

function fixture(runId){
  runId=clean(runId,100).replace(/[^A-Za-z0-9._:-]/g,'_');
  if(!/^s456-[A-Za-z0-9._:-]{4,90}$/.test(runId))throw new Error('S456_PROOF_RUN_ID_INVALID');

  const caseId='qcase_'+runId;
  const quoteCase={...data.buildQuoteCase({
    tenantId:TENANT_ID,caseId,journeyId:'GT_AUTO_MOTO_HYBRID',correlationId:'corr_'+runId,
    country:'GT',source:'PUBLIC_WEB',intent:'COTIZAR',riskOrProductCandidate:'AUTO',status:'PROPOSALS_AVAILABLE'
  }).value,synthetic:true,proofRunId:runId};

  const proposal={
    schemaVersion:'synthetic',tenantId:TENANT_ID,proposalId:'proposal_'+runId,caseId,
    country:'GT',product:'AUTO',currency:'GTQ',insurerId:'insurer_'+runId,
    insurerDisplayName:'Synthetic Insurer',planName:'Synthetic Plan',sourceId:'source_'+runId,
    premium:2600,coverages:{collision:'COVERED'},limits:{},sublimits:{},deductibles:{},
    assistance:{},conditions:[],exclusions:[],
    validity:{validFrom:'2026-10-01T00:00:00Z',validUntil:'2026-10-31T23:59:59Z'},
    provenance:{synthetic:true,proofRunId:runId},validationState:'VALIDATED',
    validatedBy:'s456-physical-proof',validatedAt:'2026-10-01T00:00:00Z',
    proposalSeriesId:'pseries_'+runId,versionNumber:2,isCurrentVersion:true,
    supersedesProposalId:'proposal_prior_'+runId,supersededByProposalId:'',
    synthetic:true,proofRunId:runId
  };

  const cmpBase=data.buildComparisonSet({
    tenantId:TENANT_ID,caseId,proposalIds:[proposal.proposalId],
    criteriaKeys:['premium','coverages','deductibles'],generatedAt:'2026-10-01T00:00:00Z'
  });
  if(!cmpBase.ok)throw new Error('S456_COMPARISONSET_BUILD_FAILED');
  const comparisonSet={...cmpBase.value,synthetic:true,proofRunId:runId};

  const selectionRequestKey=runId+'-selection';
  const plan=selectionContract.buildAtomicSelectionPlan({
    tenantId:TENANT_ID,caseId,comparisonSetId:comparisonSet.comparisonSetId,
    proposalId:proposal.proposalId,selectionRequestKey,explicitUserChoice:true,
    comparisonSet,proposal,quoteCase,asOf:AS_OF,createdAt:'2026-10-01T00:00:00Z'
  });
  if(!plan.ok)throw new Error('S456_PLAN_INVALID_'+(plan.code||plan.reasons||''));

  const selection={...plan.selection,synthetic:true,proofRunId:runId};
  const idemOp=plan.operations.find(x=>x.entity==='selectionRequest');
  const idempotency={...idemOp.payload,synthetic:true,proofRunId:runId};

  const paths={
    quoteCase:data.pathFor(TENANT_ID,data.ENTITY.QUOTE_CASE,caseId),
    proposal:data.pathFor(TENANT_ID,data.ENTITY.PROPOSAL,proposal.proposalId),
    comparisonSet:data.pathFor(TENANT_ID,data.ENTITY.COMPARISON_SET,comparisonSet.comparisonSetId),
    selection:data.pathFor(TENANT_ID,data.ENTITY.SELECTION,selection.selectionId),
    idempotency:data.pathFor(TENANT_ID,data.ENTITY.IDEMPOTENCY,plan.selectionRequestId)
  };

  return {runId,caseId,quoteCase,proposal,comparisonSet,selectionRequestKey,plan,selection,idempotency,paths,allPaths:Object.values(paths)};
}

async function setup(db,fx){
  return db.runTransaction(async tx=>{
    const refs=[db.doc(fx.paths.quoteCase),db.doc(fx.paths.proposal),db.doc(fx.paths.comparisonSet)];
    const snaps=[];
    for(const r of refs)snaps.push(await tx.get(r));
    if(snaps.some(s=>s.exists))throw new Error('S456_SETUP_PATH_NOT_EMPTY');
    tx.create(refs[0],fx.quoteCase);
    tx.create(refs[1],fx.proposal);
    tx.create(refs[2],fx.comparisonSet);
    return {writes:3};
  });
}

async function commitSelection(db,fx,plan,selectionDoc,idempotencyDoc){
  return db.runTransaction(async tx=>{
    const refs={
      idem:db.doc(fx.paths.idempotency),
      sel:db.doc(fx.paths.selection),
      qc:db.doc(fx.paths.quoteCase),
      cmp:db.doc(data.pathFor(TENANT_ID,data.ENTITY.COMPARISON_SET,plan.selection.comparisonSetId)),
      prop:db.doc(data.pathFor(TENANT_ID,data.ENTITY.PROPOSAL,plan.selection.proposalId))
    };
    const idem=await tx.get(refs.idem);
    const sel=await tx.get(refs.sel);
    const qc=await tx.get(refs.qc);

    if(idem.exists){
      const d=idem.data();
      if(d.requestDigest===plan.requestDigest&&d.selectionId===plan.selection.selectionId&&sel.exists&&qc.exists){
        const selected=sel.data(),q=qc.data();
        if(selectionContract.digest(selected)===selectionContract.digest(selectionDoc) &&
           q.selectedProposalId===plan.selection.proposalId &&
           q.selectedComparisonSetId===plan.selection.comparisonSetId &&
           q.selectionId===plan.selection.selectionId &&
           q.status==='USER_SELECTED'){
          return {reused:true,writes:0};
        }
      }
      const e=new Error('SELECTION_IDEMPOTENCY_CONFLICT');e.code='SELECTION_IDEMPOTENCY_CONFLICT';throw e;
    }

    if(sel.exists){const e=new Error('SELECTION_ALREADY_EXISTS');e.code='SELECTION_ALREADY_EXISTS';throw e;}

    const cmp=await tx.get(refs.cmp);
    const prop=await tx.get(refs.prop);
    if(!qc.exists||!cmp.exists||!prop.exists)throw new Error('S456_PREREQUISITE_MISSING');

    const q=qc.data(),c=cmp.data(),p=prop.data();
    const checked=selectionContract.validatePrerequisites({
      tenantId:TENANT_ID,caseId:fx.caseId,comparisonSet:c,proposal:p,quoteCase:q,asOf:AS_OF
    });
    if(!checked.ok)throw new Error('S456_PREREQUISITE_INVALID_'+checked.reasons.join(','));

    const readSet=new Map(plan.prerequisiteReadSet.map(x=>[x.entity,x.expectedDigest]));
    if(selectionContract.digest(q)!==readSet.get('quoteCase'))throw new Error('S456_QUOTECASE_DIGEST_CONFLICT');
    if(selectionContract.digest(c)!==readSet.get('comparisonSet'))throw new Error('S456_COMPARISONSET_DIGEST_CONFLICT');
    if(selectionContract.digest(p)!==readSet.get('proposal'))throw new Error('S456_PROPOSAL_DIGEST_CONFLICT');

    const patchOp=plan.operations.find(x=>x.entity==='quoteCase');
    tx.create(refs.sel,selectionDoc);
    tx.create(refs.idem,idempotencyDoc);
    tx.update(refs.qc,patchOp.patch);
    return {reused:false,writes:3};
  });
}

async function cleanup(db,fx){
  return db.runTransaction(async tx=>{
    const refs=fx.allPaths.map(p=>db.doc(p));
    const snaps=[];
    for(const r of refs)snaps.push(await tx.get(r));
    for(const s of snaps){
      if(s.exists&&!owned(s.data(),fx.runId))throw new Error('S456_CLEANUP_OWNERSHIP_MISMATCH');
    }
    let deletes=0;
    for(let i=0;i<refs.length;i++)if(snaps[i].exists){tx.delete(refs[i]);deletes++;}
    return {deletes};
  });
}

async function run(){
  const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT||PROJECT_ID;
  if(project!==PROJECT_ID)throw new Error('S456_PROJECT_MISMATCH');
  const fx=fixture(process.env.S456_PROOF_RUN_ID);
  const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:PROJECT_ID});
  const db=getFirestore(app);

  const initial=await readPaths(db,fx.allPaths);
  if(!allAbsent(initial))throw new Error('S456_PATHS_NOT_CLEAN_AT_START');

  let touched=false;
  try{
    const setupResult=await setup(db,fx); touched=true;
    if(setupResult.writes!==3)throw new Error('S456_SETUP_COUNT_INVALID');

    const setupRead=await readPaths(db,[fx.paths.quoteCase,fx.paths.proposal,fx.paths.comparisonSet]);
    if(Object.values(setupRead).some(x=>!x.exists))throw new Error('S456_SETUP_READBACK_MISSING');

    const first=await commitSelection(db,fx,fx.plan,fx.selection,fx.idempotency);
    if(first.reused||first.writes!==3)throw new Error('S456_FIRST_SELECTION_INVALID');

    const selectedRead=await readPaths(db,fx.allPaths);
    if(Object.values(selectedRead).some(x=>!x.exists))throw new Error('S456_SELECTION_READBACK_MISSING');
    const baselineDigests=digestMap(selectedRead);

    const sel=selectedRead[fx.paths.selection].data;
    const qc=selectedRead[fx.paths.quoteCase].data;
    if(sel.status!=='USER_SELECTED_FOR_CONTINUATION'||sel.issuanceState!=='NOT_ISSUED'||sel.bindingState!=='NOT_BOUND'||sel.coverageState!=='NOT_CONFIRMED')throw new Error('S456_SELECTION_TRUTH_INVALID');
    if(qc.status!=='USER_SELECTED'||qc.selectedProposalId!==fx.proposal.proposalId||qc.selectedComparisonSetId!==fx.comparisonSet.comparisonSetId||qc.selectionId!==sel.selectionId)throw new Error('S456_QUOTECASE_PATCH_INVALID');

    const retry=await commitSelection(db,fx,fx.plan,fx.selection,fx.idempotency);
    if(!retry.reused||retry.writes!==0)throw new Error('S456_RETRY_INVALID');
    const afterRetry=await readPaths(db,fx.allPaths);
    if(JSON.stringify(digestMap(afterRetry))!==JSON.stringify(baselineDigests))throw new Error('S456_RETRY_MUTATED_STATE');

    let conflictDenied=false;
    const alternateComparisonSet={...fx.comparisonSet,comparisonSetId:'cmp_conflict_'+fx.runId};
    const conflictPlan=selectionContract.buildAtomicSelectionPlan({
      tenantId:TENANT_ID,caseId:fx.caseId,comparisonSetId:alternateComparisonSet.comparisonSetId,
      proposalId:fx.proposal.proposalId,selectionRequestKey:fx.selectionRequestKey,explicitUserChoice:true,
      comparisonSet:alternateComparisonSet,proposal:fx.proposal,quoteCase:fx.quoteCase,asOf:AS_OF,
      createdAt:'2026-10-01T00:00:00Z'
    });
    if(!conflictPlan.ok)throw new Error('S456_CONFLICT_PLAN_INVALID');
    const conflictSelection={...conflictPlan.selection,synthetic:true,proofRunId:fx.runId};
    const conflictIdem={...conflictPlan.operations.find(x=>x.entity==='selectionRequest').payload,synthetic:true,proofRunId:fx.runId};
    try{await commitSelection(db,fx,conflictPlan,conflictSelection,conflictIdem);}
    catch(e){conflictDenied=e&&e.code==='SELECTION_IDEMPOTENCY_CONFLICT';}
    if(!conflictDenied)throw new Error('S456_CONFLICT_NOT_DENIED');

    const afterConflict=await readPaths(db,fx.allPaths);
    if(JSON.stringify(digestMap(afterConflict))!==JSON.stringify(baselineDigests))throw new Error('S456_CONFLICT_MUTATED_STATE');

    const cleanupResult=await cleanup(db,fx);
    if(cleanupResult.deletes!==5)throw new Error('S456_CLEANUP_COUNT_INVALID');
    const final=await readPaths(db,fx.allPaths);
    if(!allAbsent(final))throw new Error('S456_FINAL_ABSENCE_FAILED');

    return {
      schemaVersion:'ays-cotcomp-s456-w4-controlled-write-receipt-v1.0',
      version:VERSION,projectId:PROJECT_ID,tenantId:TENANT_ID,proofRunId:fx.runId,syntheticOnly:true,
      identifiers:{
        caseId:fx.caseId,proposalId:fx.proposal.proposalId,comparisonSetId:fx.comparisonSet.comparisonSetId,
        selectionId:fx.selection.selectionId,selectionRequestId:fx.plan.selectionRequestId
      },
      setup:{writes:3,readback:true},
      selection:{writes:3,readback:true,reused:false},
      retry:{writes:0,reused:true,stateUnchanged:true},
      conflict:{writes:0,denied:true,stateUnchanged:true},
      truth:{status:sel.status,issuanceState:sel.issuanceState,bindingState:sel.bindingState,coverageState:sel.coverageState},
      quoteCase:{status:qc.status,selectedProposalId:qc.selectedProposalId,selectedComparisonSetId:qc.selectedComparisonSetId,selectionId:qc.selectionId},
      cleanup:{deletes:5,finalAbsence:true},
      readback:{documentCount:5,digests:baselineDigests},
      writeAccounting:{setupWrites:3,selectionWrites:3,retryWrites:0,conflictWrites:0,cleanupDeletes:5,totalAppDataMutations:11,netPersistentDocuments:0},
      boundaries:{realDataTouched:false,productionTouched:false,providerOrRaterCallsExecuted:0,issuanceExecuted:false,bindingExecuted:false}
    };
  }catch(err){
    if(touched){
      try{await cleanup(db,fx);}catch(cleanErr){throw new Error('S456_PROOF_AND_CLEANUP_FAILED:'+clean(err&&err.message)+':'+clean(cleanErr&&cleanErr.message));}
    }
    throw err;
  }
}

module.exports=Object.freeze({VERSION,PROJECT_ID,TENANT_ID,AS_OF,fixture,setup,commitSelection,cleanup,run});

if(require.main===module){
  run().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n')).catch(e=>{console.error(clean(e&&e.stack||e,1200));process.exit(1);});
}
