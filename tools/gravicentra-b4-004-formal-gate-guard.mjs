import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

// Read-only, exact-receipt validation of the scoped B4-004 terminal gate.
// It never replays product commands, mutates operational data, or infers
// Siniestros CRUD acceptance from a no-claims, read-only observation.
const ROOT='artifacts/orbit360-recovery/release-control/';
const CP=ROOT+'CONTROL_PLANE.json';
const LEDGER=ROOT+'I6_FINDINGS_LEDGER_20260924.json';
const REGISTER=ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json';
const STATE='orbit360-platform/docs/recovery/orbit360-recovery-state-v1.json';
const RECEIPT=ROOT+'I6_5_B4_004_FINAL_GATE_SEAL_20261107.json';
const OWNER=ROOT+'OWNER_DECISION_FREEZE_AND_RECONCILIATION_PLAN_20261107.json';
const B4005_RECEIPT=ROOT+'I6_5_B4_005_ENDOSOS_DURABLE_SOURCE_AND_ISOLATED_QA_20261107.json';
const B4005_CAUSAL_RECEIPT=ROOT+'I6_5_B4_005_ENDOSOS_SERVER_SEMANTIC_WRITER_CAUSAL_FIX_20261107.json';
const B4006_VISUAL_RECEIPT=ROOT+'I6_5_B4_006_VISUAL_READONLY_DELTA_DECLARATION_20261108.json';
const B4006_VISUAL_ACTION='B4_006_BUILD_ONE_NEW_IMMUTABLE_PREVIEW_THEN_VISUAL_QA_AND_OWNER_ACCEPTANCE';
const B4006_FINAL_ACTION='B4_006_PAULA_VISUAL_ACCEPTANCE_EXACT_PREVIEW_ARTIFACT_13620896661_THEN_B4_007_SAME_ARTIFACT_LIVE';
const B4006_FINAL_RECEIPT=ROOT+'I6_5_B4_006_VISUAL_EXACT_PREVIEW_QA_20261108.json';
const B4006_OWNER_SOURCE_RECEIPT=ROOT+'I6_5_B4_006_REAL_INSURER_VISUAL_HIERARCHY_SOURCE_SUCCESSOR_20261108.json';
const B4006_OWNER_SOURCE_ACTION='B4_006_SINGLE_VISUAL_SOURCE_SUCCESSOR_BUILD_EXACT_PREVIEW_REAL_INSURER_QA';
const SOURCE='f8fa00e4e2e6627cee66c8c521866874e39bc8da';
const BUILD='gi-i65-b4-f8fa00e4e2e6-57f234755dc1';
const ARTIFACT=13600357541;
const VERSION='sites/ays-orbit-360-lab/versions/439cb977fd4649d1';
const DIGEST='819e36b57ef5042ed37458f80274f9db45303e881b4f268c34dec8d4506c9d56';
const ACTION='B4_004_CLOSED_PASS_NEXT_B4_005_AUTHENTICATED_E2E_MATRIX';
const EVIDENCE={
  preview:ROOT+'I6_5_B4_004_CRONOGRAMA_COUNTRY_FOCAL_PREVIEW_PASS_20261107.json',
  promotion:ROOT+'I6_5_B4_004_CRONOGRAMA_COUNTRY_EXACT_LIVE_PROMOTION_20261107.json',
  cronograma:ROOT+'I6_5_B4_004_CRONOGRAMA_COUNTRY_LIVE_FOCAL_QA_20261107.json',
  siniestros:ROOT+'I6_5_B4_004_SINIESTROS_RETAINED_LIVE_READONLY_20261107.json',
  policyCapture:ROOT+'I6_5_B4_004_POLICY_CAPTURE_FOCAL_LIVE_QA_20261107.json'
};
const need=(value,label)=>{if(!value)throw Error('B4_004_FORMAL_GATE_'+label);};
const sha256=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const prior=(parent,p)=>JSON.parse(git('show',parent+':'+p));
const byId=rows=>new Map(rows.map(x=>[x.id,x]));
function readPinned(path,hash){
  const bytes=fs.readFileSync(path);
  need(blob(bytes)===hash,'RECEIPT_BLOB_'+path);
  need(git('rev-parse','HEAD:'+path)===hash,'RECEIPT_NOT_COMMITTED_'+path);
  return JSON.parse(bytes);
}
function verifyB4006RealInsurerVisualSource(cp,state){
  const p=cp.b4006RealInsurerVisualSuccessor20261108;
  need(p&&same(p,state.b4006RealInsurerVisualSuccessor20261108)&&
    p.status==='USER_REJECTED_PREVIOUS_VISUAL_QA_SINGLE_SOURCE_SUCCESSOR_PREVIEW_PENDING'&&
    p.gate==='I6.5/B4-006'&&p.receiptPath===B4006_OWNER_SOURCE_RECEIPT&&
    p.receiptBlobSha==='6adad3cbc42810e49558e3dae016c7ff92bd6a08'&&p.newStylesBlobSha==='70d15bf172313a43d951af6884e52177d5eca037'&&
    p.previousArtifactId===13620896661&&p.previousSourceCommit==='3e490bff1f12ccef5ccc8d007701245aa9599442'&&
    p.ownerRejectedPreviousVisual===true&&p.ownerAcceptedNewCandidate===false&&
    p.firstIncompleteGate==='B4-006'&&p.lastClosedGate==='B4-005'&&
    p.realDataWrites===0&&p.liveDeploys===0&&p.oneCanonicalPreviewChannel===true,
    'B4006_OWNER_REJECTED_VISUAL_POINTER');
  const r=readPinned(B4006_OWNER_SOURCE_RECEIPT,p.receiptBlobSha);
  need(r.schema==='GRAVICENTRA_I6_5_B4_006_REAL_INSURER_VISUAL_HIERARCHY_SOURCE_SUCCESSOR_V1'&&
    r.gate==='I6.5/B4-006'&&r.status===p.status&&
    r.previousProductSourceCommit===p.previousSourceCommit&&
    r.previousImmutableArtifactId===p.previousArtifactId&&
    r.previousAssistantVisualQaStatus==='SUPERSEDED_BY_OWNER_VISUAL_REJECTION_ON_REAL_INSURER'&&
    r.changedProductPaths?.length===1&&
    r.changedProductPaths[0].path==='orbit360-platform/styles/infra.css'&&
    r.changedProductPaths[0].gitBlobSha===p.newStylesBlobSha&&
    r.strictScope?.onlyInsurerPremiumSection===true&&
    r.strictScope?.editorContractUnchanged===true&&
    r.strictScope?.firestoreDataWrites===0&&
    r.strictScope?.backendDeploys===0&&r.strictScope?.rulesWrites===0&&
    r.strictScope?.reimport===false&&
    r.immutableRule?.includes('one fresh buildId')&&
    r.ownerAccepted===false&&r.realDataWrites===0&&r.liveDeploys===0&&
    r.nextAction===B4006_OWNER_SOURCE_ACTION&&
    git('merge-base',r.sourcePredecessor,'HEAD')===r.sourcePredecessor&&
    git('rev-parse','HEAD:orbit360-platform/styles/infra.css')===p.newStylesBlobSha&&
    blob(fs.readFileSync('orbit360-platform/styles/infra.css'))===p.newStylesBlobSha,
    'B4006_OWNER_VISUAL_SOURCE_RECEIPT');
  return p.newStylesBlobSha;
}

function verifyB4006AssistantVisualQa(cp,state){
  const p=cp.b4006ExactVisualPreviewQa20261108;
  need(p&&same(p,state.b4006ExactVisualPreviewQa20261108)&&
    p.gate==='I6.5/B4-006'&&p.status==='ASSISTANT_VISUAL_PREVIEW_QA_PASS_OWNER_ACCEPTANCE_PENDING'&&
    p.receiptPath===B4006_FINAL_RECEIPT&&p.receiptBlobSha==='e4ba23c9a7db9adf41268747c19172e39e77055b'&&
    p.sourceCommit==='3e490bff1f12ccef5ccc8d007701245aa9599442'&&
    p.buildId==='gi-i65-b4-3e490bff1f12-57f234755dc1'&&
    p.artifactId===13620896661&&p.workflowRunId===42488943178&&
    p.firstIncompleteGate==='B4-006'&&p.lastClosedGate==='B4-005'&&
    p.ownerAccepted===false&&p.noLive===true&&p.realDataWrites===0,
    'B4006_FINAL_VISUAL_POINTER');
  const r=readPinned(B4006_FINAL_RECEIPT,p.receiptBlobSha);
  need(r.schema==='GRAVICENTRA_I6_5_B4_006_ASSISTANT_VISUAL_PREVIEW_QA_V1'&&
    r.status===p.status&&r.gate===p.gate&&r.ownerAccepted===false&&
    r.sourceCommit===p.sourceCommit&&
    r.immutablePreview?.buildId===p.buildId&&
    r.immutablePreview?.artifactId===p.artifactId&&
    r.immutablePreview?.artifactDigest===p.artifactDigest&&
    r.workflow?.id===p.workflowRunId&&r.workflow?.conclusion==='success'&&
    r.immutablePreview?.productFilesReadback?.passed===218&&
    r.immutablePreview?.productFilesReadback?.total===218&&
    r.immutablePreview?.hasProductionPromotion===false&&
    r.governance?.paulaVisualAcceptancePending===true&&
    r.governance?.operationalDataWrites===0&&r.governance?.backendDeploys===0&&
    r.governance?.firestoreRulesWrites===0&&r.governance?.productionLiveUnchanged===true&&
    r.nextAction===B4006_FINAL_ACTION&&
    git('merge-base',r.sourceCommit,'HEAD')===r.sourceCommit,
    'B4006_FINAL_VISUAL_RECEIPT');
  return true;
}

function releaseMatches(x){
  return x?.sourceSha===SOURCE&&x?.buildId===BUILD&&Number(x?.artifactId)===ARTIFACT;
}

// A new B4-005 source CANDIDATE does not change the immutable B4-004 LIVE
// acceptance. Permit precisely its signed four-file delta while still
// rejecting any unrelated source mutation, backend, Rules or false PASS.
export function verifyDeclaredB4005SourceSuccessor(cp=read(CP),state=read(STATE)){
  const corrective=cp.b4005EndososServerSemanticWriterCausalFix20261107;
  if(corrective){
    const mirror=state.b4005EndososServerSemanticWriterCausalFix20261107;
    need(same(corrective,mirror)&&corrective.gate==='I6.5/B4-005'&&
      corrective.status==='CAUSAL_SOURCE_FIX_12_OF_12_ISOLATED_CONTRACT_PASS_REAL_PREVIEW_WRITES_PENDING'&&
      corrective.receiptPath===B4005_CAUSAL_RECEIPT&&corrective.predecessorSourceSha==='ef5baec55057a88720b98ff67fcd138a8f89a5f3'&&
      corrective.isolatedAssertionGroupsPassed===12&&corrective.formalB4005Pass===false&&
      corrective.firstIncompleteGate==='B4-005'&&corrective.realDataWrites===0,
      'B4005_CAUSAL_POINTER_INVALID');
    const bytes=fs.readFileSync(B4005_CAUSAL_RECEIPT),receipt=JSON.parse(bytes);
    need(blob(bytes)===corrective.receiptBlobSha&&sha256(bytes)===corrective.receiptSha256&&
      git('rev-parse','HEAD:'+B4005_CAUSAL_RECEIPT)===corrective.receiptBlobSha,
      'B4005_CAUSAL_RECEIPT_DRIFT');
    need(receipt.schema==='GRAVICENTRA_I6_5_B4_005_ENDOSOS_SERVER_SEMANTIC_WRITER_CAUSAL_FIX_V1'&&
      receipt.gate==='I6.5/B4-005'&&receipt.status===corrective.status&&
      receipt.predecessorSourceSha===corrective.predecessorSourceSha&&
      receipt.isolatedTests?.result==='PASS_IN_MEMORY_NO_FIREBASE'&&
      receipt.isolatedTests?.passedGroups===12&&receipt.isolatedTests?.authenticatedWriteConfirmed===false&&
      receipt.releaseSafety?.formalB4005Pass===false&&receipt.releaseSafety?.liveFrontendUnchanged===true&&
      receipt.releaseSafety?.liveBackendUnchanged===true&&receipt.releaseSafety?.businessWritesBySourceFix===0,
      'B4005_CAUSAL_FALSE_CERTIFICATION');
    // Preserve the sealed B4-005 six-file writer correction. Permit B4-006
    // visual product files only when the exact four Git blobs are declared
    // by a mirrored source receipt; never expand this allowlist implicitly.
    const visual=cp.b4006VisualReadonlyCandidateSource20261108;
    let visualPaths=[];
    if(visual){
      need(same(visual,state.b4006VisualReadonlyCandidateSource20261108)&&
        visual.gate==='I6.5/B4-006'&&
        visual.status==='SOURCE_VISUAL_DELTA_READY_FOR_NEW_IMMUTABLE_PREVIEW'&&
        visual.receiptPath===B4006_VISUAL_RECEIPT&&
        visual.firstIncompleteGate==='B4-006'&&
        visual.ownerAccepted===false&&visual.realDataWrites===0&&visual.liveDeploys===0,
        'B4006_VISUAL_POINTER');
      const bytes=fs.readFileSync(B4006_VISUAL_RECEIPT),r=JSON.parse(bytes);
      need(blob(bytes)===visual.receiptBlobSha&&
        git('rev-parse','HEAD:'+B4006_VISUAL_RECEIPT)===visual.receiptBlobSha&&
        r.schema==='GRAVICENTRA_I6_5_B4_006_VISUAL_READONLY_DELTA_DECLARATION_V1'&&
        r.gate==='I6.5/B4-006'&&r.status===visual.status&&
        r.sourceCommit===visual.sourceCommit&&
        git('merge-base',r.sourceCommit,'HEAD')===r.sourceCommit&&
        r.integrity.editorWriteSelectorsPreserved===true&&
        r.integrity.operationalDataWrites===0&&
        r.integrity.backendChanges===0&&r.integrity.firestoreRulesChanges===0&&
        r.integrity.productionDeploys===0&&r.integrity.reimport===false&&
        r.integrity.ownerAcceptanceInferred===false,
        'B4006_VISUAL_RECEIPT');
      visualPaths=[
        'orbit360-platform/modules/aseguradoras.js',
        'orbit360-platform/styles/infra.css',
        'orbit360-platform/index.html',
        'orbit360-platform/modules/siniestros.js'
      ].sort();
      need(same((r.changedProductPaths||[]).map(x=>x.path).sort(),visualPaths),'B4006_EXACT_VISUAL_PATHS');
      const latestCssBlob=cp.b4006RealInsurerVisualSuccessor20261108 ? verifyB4006RealInsurerVisualSource(cp,state) : null;
      for(const file of r.changedProductPaths){
        const expectedBlob=latestCssBlob&&file.path==='orbit360-platform/styles/infra.css'?latestCssBlob:file.gitBlobSha;
        need(git('rev-parse','HEAD:'+file.path)===expectedBlob&&
          blob(fs.readFileSync(file.path))===expectedBlob,
          'B4006_VISUAL_BLOB:'+file.path);
      }
    }
    const changed=git('diff','--name-only',SOURCE,'HEAD','--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**').split(/\r?\n/).filter(Boolean).sort();
    const expected=[
      'functions/product-ops-leads-domain.js',
      'orbit360-platform/core/endorsement-workflow-v1201.js',
      'orbit360-platform/data/store-firestore-product-operational-p0.js',
      'orbit360-platform/modules/issuance-endosos-v1201-bridge.js',
      'orbit360-platform/modules/issuance-endosos-v1201-refinements.js',
      'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'
    ].concat(visualPaths).sort();
    need(same(changed,expected),'B4005_CAUSAL_UNDECLARED_PRODUCT_CHANGE');
    const declared=receipt.sourceAndTests||[];
    need(declared.length===4&&same(declared.map(x=>x.path).sort(),[
      'functions/product-ops-leads-domain.js',
      'orbit360-platform/core/endorsement-workflow-v1201.js',
      'orbit360-platform/data/store-firestore-product-operational-p0.js',
      'tools/gravicentra-b4-005-endosos-durable-contract.mjs'
    ].sort()),'B4005_CAUSAL_CHANGED_FILES_MISMATCH');
    for(const f of declared)need(git('rev-parse','HEAD:'+f.path)===f.gitBlobSha&&
      blob(fs.readFileSync(f.path))===f.gitBlobSha,'B4005_CAUSAL_CHANGED_BLOB_'+f.path);
    need(git('rev-parse','HEAD:'+B4005_RECEIPT)==='295a73390427c2c907a36f51adc11650bb7a64a4',
      'B4005_HISTORICAL_SOURCE_RECEIPT_REWRITTEN');
    return {paths:expected,status:'CORRECTIVE_SOURCE_PREVIEW_E2E_PENDING',receiptBlobSha:corrective.receiptBlobSha};
  }
  const pointer=cp.b4005EndososDurableSourceAndIsolatedQa20261107;
  if(!pointer)return null;
  const mirror=state.b4005EndososDurableSourceAndIsolatedQa20261107;
  need(pointer.status==='SOURCE_FIX_AND_ISOLATED_10_OF_10_PASS_PREVIEW_AND_AUTHENTICATED_E2E_PENDING'&&
    same(pointer,mirror)&&pointer.receiptPath===B4005_RECEIPT&&pointer.firstIncompleteGate==='B4-005'&&
    pointer.formalB4005Pass===false&&pointer.realDataWrites===0&&pointer.sourceRequiresNewExactBuild===true,
    'B4005_CANDIDATE_POINTER_INVALID');
  const bytes=fs.readFileSync(B4005_RECEIPT),receipt=JSON.parse(bytes);
  need(blob(bytes)===pointer.receiptBlobSha&&sha256(bytes)===pointer.receiptSha256&&
    git('rev-parse','HEAD:'+B4005_RECEIPT)===pointer.receiptBlobSha,
    'B4005_CANDIDATE_RECEIPT_DRIFT');
  need(receipt.schema==='GRAVICENTRA_I6_5_B4_005_ENDOSOS_DURABLE_SOURCE_AND_ISOLATED_QA_V1'&&
    receipt.gate==='I6.5/B4-005'&&
    receipt.status==='SOURCE_FIX_AND_ISOLATED_CONTRACT_QA_PASS_PREVIEW_AND_LIVE_CERTIFICATION_PENDING'&&
    receipt.releaseSafety?.formalB4005Pass===false&&receipt.releaseSafety?.candidatePreviewBuildCreated===false&&
    receipt.releaseSafety?.productionDeployed===false&&receipt.releaseSafety?.businessWrites===0&&
    receipt.releaseSafety?.currentApprovedLiveSourceSha===SOURCE&&
    Number(receipt.releaseSafety?.currentApprovedLiveArtifactId)===ARTIFACT&&
    receipt.isolatedQa?.result==='PASS_IN_MEMORY_NO_FIREBASE'&&
    receipt.isolatedQa?.passedGroups===10&&receipt.isolatedQa?.authenticatedPreview===false&&
    receipt.isolatedQa?.authenticatedLive===false,
    'B4005_CANDIDATE_NOT_CERTIFICATION');
  const paths=[
    'orbit360-platform/core/endorsement-workflow-v1201.js',
    'orbit360-platform/modules/issuance-endosos-v1201-bridge.js',
    'orbit360-platform/modules/issuance-endosos-v1201-refinements.js',
    'orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'
  ];
  need(same((receipt.sourceFiles||[]).map(x=>x.path).sort(),paths.slice().sort()),'B4005_CANDIDATE_EXACT_PATHS');
  for(const file of receipt.sourceFiles){
    const content=fs.readFileSync(file.path);
    need(blob(content)===file.gitBlobSha&&sha256(content)===file.sha256&&
      git('rev-parse','HEAD:'+file.path)===file.gitBlobSha,'B4005_CANDIDATE_BLOB_'+file.path);
  }
  const test=receipt.isolatedQa;
  need(git('rev-parse','HEAD:'+test.testPath)===test.testGitBlobSha&&
    blob(fs.readFileSync(test.testPath))===test.testGitBlobSha&&
    sha256(fs.readFileSync(test.testPath))===test.testSha256,'B4005_CANDIDATE_QA_BLOB');
  const changed=git('diff','--name-only',SOURCE,'HEAD','--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**')
    .split(/\r?\n/).filter(Boolean).sort();
  need(same(changed,paths.slice().sort()),'B4005_CANDIDATE_UNDECLARED_PRODUCT_CHANGE');
  return {paths,status:'SOURCE_ONLY_PREVIEW_PENDING',receiptBlobSha:pointer.receiptBlobSha};
}

export function verifyB4004FormalGate(){
  const cp=read(CP),state=read(STATE),seal=read(RECEIPT);
  const historic=prior(seal.parentHead,CP);
  const oldLedger=prior(seal.parentHead,LEDGER),oldRegister=prior(seal.parentHead,REGISTER);
  const ledger=read(LEDGER),reg=read(REGISTER);
  const owner=readPinned(OWNER,seal.authority.ownerDecisionBlobSha);
  const ref=cp.b4004FormalGateSeal20261107,mirror=state.b4004FormalGateSeal20261107;
  need(seal.schema==='GRAVICENTRA_B4_004_TARGETED_FINAL_GATE_SEAL_V1'&&seal.gate==='I6.5/B4-004'&&seal.formalClosure===true&&seal.status==='CLOSED_PASS_SCOPED_TO_APPROVED_B4_004_DISPOSITIONS','SEAL_SCOPE');
  need(seal.parentHead==='eaa2e95fa2f733ed2708fd7f2c17b1dcb3d092dd'&&git('merge-base',seal.parentHead,'HEAD')===seal.parentHead,'SEAL_PARENT');
  need(cp.branch===seal.branch&&seal.repository==='paulaosoriof86/orbit360-core'&&seal.branch==='recovery/fase-a-clean-20260831','REPO_AND_BRANCH');
  need(releaseMatches(seal.release)&&seal.release.hostingVersionPreview===VERSION&&seal.release.hostingVersionLive===VERSION&&seal.release.hostedPayloadDigest===DIGEST&&seal.release.productFiles===218,'EXACT_RELEASE');
  need(seal.release.rebuildForCloseout===false&&seal.release.newPromotionForCloseout===false,'NO_REBUILD');
  need(ref?.status===seal.status&&mirror?.status===seal.status&&ref.receiptPath===RECEIPT&&mirror.receiptPath===RECEIPT,'POINTER_EXISTS');
  const bytes=fs.readFileSync(RECEIPT);
  need(blob(bytes)===ref.receiptBlobSha&&sha256(bytes)===ref.receiptSha256&&ref.receiptBlobSha===mirror.receiptBlobSha&&ref.receiptSha256===mirror.receiptSha256,'SEAL_HASH');
  need(releaseMatches(ref)&&releaseMatches(mirror)&&ref.hostingVersion===VERSION&&ref.hostedPayloadDigest===DIGEST,'SEAL_RELEASE_POINTER');
  need(ref.lastClosedGate==='B4-004'&&mirror.lastClosedGate==='B4-004'&&ref.firstIncompleteGate==='B4-005'&&mirror.firstIncompleteGate==='B4-005','NEXT_GATE');
  need((cp.nextAction===ACTION&&state.nextAction===ACTION||(cp.nextAction===B4006_VISUAL_ACTION&&state.nextAction===B4006_VISUAL_ACTION&&cp.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&state.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&cp.b4006VisualReadonlyCandidateSource20261108?.status==='SOURCE_VISUAL_DELTA_READY_FOR_NEW_IMMUTABLE_PREVIEW'||cp.nextAction===B4006_FINAL_ACTION&&state.nextAction===B4006_FINAL_ACTION&&cp.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&state.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&verifyB4006AssistantVisualQa(cp,state)||cp.nextAction===B4006_OWNER_SOURCE_ACTION&&state.nextAction===B4006_OWNER_SOURCE_ACTION&&cp.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&state.b4005FormalGateSeal20261107?.status==='CLOSED_PASS_SCOPED_WITH_EXPLICIT_NONBLOCKING_R1509_CARRY'&&verifyB4006RealInsurerVisualSource(cp,state)))&&ref.nextAction===ACTION&&mirror.nextAction===ACTION,'NEXT_ACTION_SYNC');
  need(cp.pendingClosureMasterPlan?.status==='B4_004_CLOSED_PASS_NEXT_B4_005_E2E_NOT_EXECUTED'&&cp.pendingClosureMasterPlan.currentGate==='B4-005'&&cp.pendingClosureMasterPlan.b4004Held===false,'PLAN_CURSOR');
  need(cp.currentB4?.status==='B4_003_CLOSED_PASS_CURRENT42'&&same(cp.currentB4,historic.currentB4),'B4003_FROZEN_POINTER');
  need(cp.b4003ActiveCertificationCursor20261106?.formalLiveAcceptance?.status==='LATEST_APPROVED_VERSION_LIVE_PASS'&&same(cp.b4003ActiveCertificationCursor20261106,historic.b4003ActiveCertificationCursor20261106),'B4003_PRESERVED');
  need(seal.authority.b4003PreservedReceiptBlobSha==='0879188bf245248fa1092fb2014e35e14e802b44'&&owner.preservedRelease?.status==='LATEST_APPROVED_VERSION_LIVE_PASS','B4003_OWNER_RECEIPT');
  const sinDecision=owner.ownerDispositions.find(x=>x.module==='Siniestros');
  need(sinDecision?.status==='OWNER_DEFERRED_NON_BLOCKING_PHASE_A'&&sinDecision.blockingPhaseA===false,'SINI_OWNER_DEFERRED');
  need(owner.ownerDispositions.find(x=>x.module==='Cronograma')?.status==='RETAINED_IN_B4_004_FORENSIC_AUDIT_FIRST','CRONO_OWNER_AUTHORITY');
  const evidence={
    preview:readPinned(EVIDENCE.preview,seal.dispositions.Cronograma.countryPreviewReceiptBlobSha),
    promotion:readPinned(EVIDENCE.promotion,seal.dispositions.Cronograma.promotionReceiptBlobSha),
    cronograma:readPinned(EVIDENCE.cronograma,seal.dispositions.Cronograma.countryLiveReceiptBlobSha),
    siniestros:readPinned(EVIDENCE.siniestros,seal.dispositions.Siniestros.liveReadonlyReceiptBlobSha),
    policyCapture:readPinned(EVIDENCE.policyCapture,seal.dispositions.PolicyCapture.liveReceiptBlobSha)
  };
  const p=evidence.preview,c=evidence.cronograma,m=evidence.promotion,s=evidence.siniestros;
  need(releaseMatches(p.currentBuild)&&p.status==='CRONOGRAMA_COUNTRY_FOCAL_AUTHENTICATED_PREVIEW_PASS_LIVE_PENDING'&&p.authenticatedFocal.status==='FOCAL_SCOPE_PASS'&&p.authenticatedFocal.distinctUid===true&&p.authenticatedFocal.coTaskFilterUi===true&&p.authenticatedFocal.scoped403===0&&p.authenticatedFocal.dataWrites===0,'CRONOGRAMA_PREVIEW');
  need(releaseMatches(m)&&String(m.runId)==='42440178249'&&m.previewVersion===VERSION&&m.fullLiveByteReadback===true&&m.hostedPayloadDigest===DIGEST&&m.businessWrites===0&&m.rebuild===false,'CRONOGRAMA_PROMOTION');
  need(releaseMatches(c.release)&&c.diagnosticStatus==='FOCAL_SCOPE_PASS'&&c.runId==='42440178249_1'&&c.assertions?.distinctUid===true&&c.assertions?.crossCountryTaskUiAbsent===true&&c.assertions?.creatorTaskUiVisible===true&&c.assertions?.peerTaskUiVisible===true&&c.assertions?.noMutations===true&&c.assertions?.writeAttemptZero===true&&c.performance?.cronogramaMs<=6000&&Array.isArray(c.errors)&&c.errors.length===0,'CRONOGRAMA_LIVE');
  need(c.actors.creator.uidSha256!==c.actors.peer.uidSha256&&c.actors.peer.uidSha256===c.actors.countryActor.uidSha256&&c.actors.countryActor.country==='CO'&&c.task.country==='GT','TWO_UID_COUNTRY_FILTER');
  need(seal.dispositions.Cronograma.sourceBlobSha===git('rev-parse','HEAD:orbit360-platform/modules/cronograma.js')&&seal.dispositions.Cronograma.status==='LATEST_APPROVED_VERSION_LIVE_PASS_TARGETED_B4_004','CRONOGRAMA_OWNER');
  need(releaseMatches(s)&&s.status==='SINIESTROS_RETAINED_SOURCE_TWO_UID_LIVE_READONLY_FOCAL_PASS'&&s.hostingVersion===VERSION&&s.operationalWrites===0&&s.writeAttempts===0&&s.checks.length===2&&s.checks.every(x=>x.routeVisible&&x.formOpenedAndCancelled&&x.reloadPass&&x.claimRowsObserved===0&&x.firstRouteRenderMs<=6000&&x.noBusinessWrite&&x.pageErrors.length===0&&x.networkFailures.length===0),'SINIESTROS_READONLY');
  need(s.actors[0].uidHash!==s.actors[1].uidHash&&seal.dispositions.Siniestros.notFullCrudPass===true&&seal.dispositions.Siniestros.status==='OWNER_DEFERRED_NON_BLOCKING_PHASE_A','SINIESTROS_NOT_OVERCERTIFIED');
  need(evidence.policyCapture.status==='FOCAL_AUTHENTICATED_UI_PASS'&&evidence.policyCapture.runId==='42427273254_1'&&Array.isArray(evidence.policyCapture.errors)&&evidence.policyCapture.errors.length===0&&seal.dispositions.PolicyCapture.status==='PREVIOUS_FOCAL_LIVE_PASS_PRESERVED_NOT_REOPENED','POLICY_CAPTURE_PRESERVED');
  const productChanges=git('diff','--name-only',SOURCE,'HEAD','--','functions','orbit360-platform',':(exclude)orbit360-platform/docs/**');
  const declaredB4005=productChanges.length?verifyDeclaredB4005SourceSuccessor(cp,state):null;
  need((productChanges.length===0||!!declaredB4005)&&seal.integrity.noProductSourceChangedAfterAcceptedArtifact===true,'NO_PRODUCT_SOURCE_DRIFT');
  need(seal.integrity.noNewBusinessWrites===true&&seal.integrity.noNewHostingOrBackendDeployment===true&&seal.integrity.noReimport===true&&seal.integrity.notGlobalPhaseAAcceptance===true&&seal.integrity.formalI6ProgressPercentUnchanged===50,'NO_UNSOURCED_EXPANSION');
  need(ledger.findings.length===295&&reg.inventory.length===295&&same([...byId(ledger.findings).keys()].sort(),[...byId(reg.inventory).keys()].sort()),'NO_FINDING_LOSS');
  const row=byId(ledger.findings).get('B4-004'),mirrorRow=byId(reg.inventory).get('B4-004');
  need(row?.status==='CLOSED_PASS'&&row.blocking===false&&same(row,mirrorRow)&&row.closureReceiptBlobSha===ref.receiptBlobSha&&row.closureReceiptSha256===ref.receiptSha256&&row.nextAction===ACTION&&row.siniestros==='OWNER_DEFERRED_NON_BLOCKING_PHASE_A_NOT_FULL_CRUD_PASS','LEDGER_DISPOSITION');
  for(const old of oldLedger.findings)if(old.id!=='B4-004')need(same(old,byId(ledger.findings).get(old.id)),'UNRELATED_FINDING_CHANGED:'+old.id);
  for(const old of oldRegister.inventory)if(old.id!=='B4-004')need(same(old,byId(reg.inventory).get(old.id)),'UNRELATED_REGISTER_CHANGED:'+old.id);
  need(reg.expectedLedgerNextBlobSha===blob(fs.readFileSync(LEDGER))&&cp.findingLedgerBlobSha===reg.expectedLedgerNextBlobSha,'LEDGER_HASH');
  need(cp.continuityRegisterBlobSha===blob(fs.readFileSync(REGISTER))&&cp.findingContinuityControl.registerBlobSha===cp.continuityRegisterBlobSha&&cp.findingContinuityControl.lastLedgerBlobSha===cp.findingLedgerBlobSha,'REGISTER_HASH');
  need(cp.findingContinuityControl.guardBlobSha===git('rev-parse','HEAD:tools/gravicentra-open-findings-continuity-guard-v1.mjs'),'CONTINUITY_GUARD_VERSION');
  need(read(ROOT+'CAPABILITY_STATUS_LEDGER.json').capabilities.length===15,'CAPABILITY_COUNT');
  need(cp.postproductionExitProgress.formalPercent===50&&seal.nextGate==='B4-005'&&seal.nextAction===ACTION,'FORMAL_PROGRESS');
  return {status:'PASS',gate:'I6.5/B4-004',scope:'TARGETED_CRONOGRAMA_LIVE_PLUS_OWNER_DEFERRED_SINIESTROS',sourceSha:SOURCE,artifactId:ARTIFACT,ledgerCount:295,nextGate:'B4-005'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  console.log(JSON.stringify(verifyB4004FormalGate()));
}
