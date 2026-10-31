// Exact repair of the environment drift caused by run 41150545623.
// The already deployed product and its immutable Hosting artifact are retained.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const D='artifacts/orbit360-recovery/release-control/';
export const insurerResumeContract=Object.freeze({
  parent:'7b1c13c507aba0787ee385483c7256033043af44',
  parentGuardBlob:'46355685181589c49ab056e723250bae8232a72f',
  parentControlBlob:'3586e5d211f233ddf979a7f561e64f06efa141d1',
  source:'bcb54435788e1ace50325f347d1d9c0ee4a222e5',sourceGuardRunId:41150390700,initialRunId:41150545623,
  control:D+'CONTROL_PLANE.json',key:'b4003InsurerPreviewEnvironmentRestoreResume20261030',
  receipt:D+'I6_5_B4_003_INSURER_PREVIEW_ENV_RESTORE_AND_HOSTING_RESUME_20261030.json',
  composition:D+'I6_5_B4_003_INSURER_ACTIVITY_CURRENT_COMPOSITION_20261030.json',
  compositionBlob:'bcb79e7b7af565e63bf2dc646401a9c380d92b97',
  sourceReceipt:D+'I6_5_B4_003_INSURER_ACTIVITY_SOURCE_SUCCESSOR_20261030.json',
  sourceReceiptBlob:'5d1750e260b50f9bfbd213235cd110683298d514',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-insurer-preview-resume.mjs',
  test:'tools/gravicentra-b4-003-insurer-preview-resume.test.mjs',
  repair:'tools/gravicentra-b4-003-insurer-reader-env-repair.cjs',
  repairTest:'tools/gravicentra-b4-003-insurer-reader-env-repair.test.cjs',
  workflow:'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml',
  transportMessage:'build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only',
  status:'EXACT_READER_ENV_RESTORE_AND_IMMUTABLE_HOSTING_RESUME_AUTHORIZED',
  evidenceKey:'b4003InsurerActivityPreviewEvidence20261030',
  evidencePath:D+'I6_5_B4_003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_20261030.json',
  baselineEnvironmentSha256:'1e10a234c2e389484714e5f55f394f0ec816d146180dbcee1e34dfae4cce069b',
  driftEnvironmentSha256:'36ca53029bfbf51b6b7053a22426acc64622dcc4b3bdb1b72b50620b2d9641e6',
  baselineRevision:'orbit360scopedpolicyreadpreview-00066-rur',
  deployedRevision:'orbit360scopedpolicyreadpreview-00067-pib',
  codeHash:'dc40ebe72b3ea545313ff3771b9d6dae71b11c5b',
  sourceGeneration:'1793406873066093',
  artifacts:{
    hosting:{id:13023285501,digest:'sha256:6f9ecc3e254be0cefcb86964e00ce74b3abd54223a8774e87bdcfd2cede4b2ba'},
    backend:{id:13023370282,digest:'sha256:97e730f44d6a4045b9d75f76c435dc97845505889699b44bcabbe5d6c3e87c7c'},
    snapshots:{id:13023550013,digest:'sha256:df0deeb1363e2182d81045da821970e500d5fb0cad0207f7b26ac05d93101325'}
  }
});
const k=insurerResumeContract;
export const insurerResumePrefix="import {runInsurerPreviewResumeGuard} from './gravicentra-b4-003-insurer-preview-resume.mjs';\nif (runInsurerPreviewResumeGuard()) process.exit(0);\n\n";
export const insurerResumeAtomicPaths=[k.control,k.receipt,k.guard,k.validator,k.test,k.repair,k.repairTest].sort();
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(p=>[p,stable(v[p])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(ok,code)=>{if(!ok)throw Error('B4_003_INSURER_RESUME_'+code);};
const sorted=v=>v.slice().sort(),lines=s=>s.split(/\r?\n/).filter(Boolean),sha=s=>/^[0-9a-f]{40}$/.test(String(s||''));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const hash=p=>git('hash-object',p),json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const tree=ref=>Object.fromEntries(lines(git('ls-tree','-r',ref)).map(l=>{const [meta,p]=l.split('\t');return[p,meta.split(' ')[2]];}));
const product=p=>!['.github/workflows/gravicentra-','.github/i6-ephemeral/','tools/gravicentra-',D,'artifacts/orbit360-recovery/project-sources-v2/'].some(prefix=>p.startsWith(prefix));

export function collectInsurerPreviewResumeModel(){
  const control=json(k.control),receipt=json(k.receipt),composition=json(k.composition),parentTree=tree(k.parent);
  const parentControl=JSON.parse(git('show',k.parent+':'+k.control)),head=git('rev-parse','HEAD');
  const sourceCommit=lines(git('log','--all','--format=%H','--',k.receipt)).find(c=>git('rev-parse',c+':'+k.receipt)===hash(k.receipt))||null;
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const deltaPaths=sorted([...new Set([...lines(git('diff','--name-only',k.parent)),...untracked])]);
  const productPaths=sorted([...new Set([...lines(git('diff','--name-only',composition.certifiedBaseline)),...untracked])].filter(product));
  const paths=[...new Set([...deltaPaths,...productPaths,k.workflow,k.composition,k.sourceReceipt])];
  const currentBlobs=Object.fromEntries(paths.map(p=>[p,fs.existsSync(p)&&fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink()?hash(p):'ABSENT_OR_NONREGULAR']));
  const evidence=fs.existsSync(k.evidencePath)?json(k.evidencePath):null;
  const evidenceCommit=evidence?lines(git('log','--all','--format=%H','--',k.evidencePath)).find(c=>git('rev-parse',c+':'+k.evidencePath)===hash(k.evidencePath))||null:null;
  const transportRef=evidence?.transportSha||(head!==k.parent&&head!==sourceCommit?head:null);
  return {control,receipt,composition,parentTree,parentControl,head,sourceCommit,currentBlobs,productPaths,deltaPaths,untracked,
    parentVerified:git('merge-base',k.parent,head)===k.parent,
    sourceControl:sourceCommit?JSON.parse(git('show',sourceCommit+':'+k.control)):control,
    sourceParent:sourceCommit?git('rev-parse',sourceCommit+'^'):null,
    sourceAncestor:sourceCommit?git('merge-base',sourceCommit,head)===sourceCommit:false,
    sourceTree:sourceCommit?tree(sourceCommit):null,
    sourceDelta:sourceCommit?sorted(lines(git('diff','--name-only',k.parent,sourceCommit))):deltaPaths,
    currentGuard:fs.readFileSync(k.guard,'utf8'),parentGuard:execFileSync('git',['show',k.parent+':'+k.guard],{encoding:'utf8'}),
    transport:transportRef?{sha:transportRef,parent:git('rev-parse',transportRef+'^'),message:git('show','-s','--format=%s',transportRef),
      paths:sorted(lines(git('diff','--name-only',transportRef+'^',transportRef))),workflowBlob:git('rev-parse',transportRef+':'+k.workflow)}:null,
    evidence,evidenceCommit,evidenceParent:evidenceCommit?git('rev-parse',evidenceCommit+'^'):null,
    evidenceDelta:evidenceCommit?sorted(lines(git('diff','--name-only',evidenceCommit+'^',evidenceCommit))):null};
}

export function validateInsurerPreviewResumeModel(m){
  const C=m.control,B=m.parentControl,SC=m.sourceControl,R=m.receipt,S=C[k.key];
  need(m.parentVerified&&m.parentTree[k.guard]===k.parentGuardBlob&&m.parentTree[k.control]===k.parentControlBlob,
    'EXACT_FAILED_TRANSPORT_PARENT_REQUIRED');
  const extras=m.evidence?[k.key,k.evidenceKey].sort():[k.key];
  need(Object.keys(B).length===420&&Object.keys(SC).length===421&&Object.keys(C).length===420+extras.length&&
    Object.keys(B).every(p=>same(C[p],B[p])&&same(SC[p],B[p]))&&
    same(sorted(Object.keys(C).filter(p=>!(p in B))),extras)&&same(S,SC[k.key]),'PRIOR_CONTROL_OR_NEW_KEYS_CHANGED');
  need(C.repository==='paulaosoriof86/orbit360-core'&&C.branch==='recovery/fase-a-clean-20260831'&&
    S?.schema==='GRAVICENTRA_I65_B4003_INSURER_PREVIEW_RESUME_POINTER_V1'&&S.status===k.status&&S.gate==='I6.5/B4-003'&&
    S.parentHead===k.parent&&S.receiptPath===k.receipt&&S.receiptBlobSha===m.currentBlobs[k.receipt]&&
    same(S.atomicCommitPaths,insurerResumeAtomicPaths)&&S.environmentRestoreAuthorized===true&&
    S.existingHostingResumeAuthorized===true&&S.backendCodeRedeployAuthorized===false&&S.hostingRebuildAuthorized===false&&
    S.authIamRulesChangeAuthorized===false&&S.realBusinessWritesAuthorized===false&&S.productionPromotionAuthorized===false,
    'POINTER_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_PREVIEW_ENV_RESTORE_AND_HOSTING_RESUME_V1'&&R.status===k.status&&
    R.gate===S.gate&&R.parentHead===k.parent&&R.sourceSha===k.source&&R.sourceGuardRunId===k.sourceGuardRunId&&
    R.initialTransportSha===k.parent&&R.initialRunId===k.initialRunId&&
    R.repository===C.repository&&R.branch===C.branch&&same(R.atomicCommitPaths,insurerResumeAtomicPaths)&&
    R.cause==='EXISTING_READER_ENVIRONMENT_CHANGED_BY_OWN_PREVIEW_DEPLOYMENT','RECEIPT_IDENTITY_INVALID');
  need(R.driftEvidence?.failedStep==='Verify both target source generations and unchanged other functions'&&
    R.driftEvidence.error==='TARGET_NON_SOURCE_CONFIGURATION_CHANGED:orbit360ScopedPolicyReadPreview:environmentVariablesSha256'&&
    R.driftEvidence.beforeSnapshotSha256==='d2867dec1adc78290de19bcfb541e7cff3bd6d9e03bc16bab4c85aa9d830b2f3'&&
    R.driftEvidence.afterSnapshotSha256==='3c2f7839fed90ec11846750aef00a08415b7df7ab41a2d96798e9d10164827f4'&&
    R.driftEvidence.deploymentStepSucceeded===true&&R.driftEvidence.hostingStepSkipped===true&&
    R.driftEvidence.originalRunReclassifiedAsSuccess===false,'ORIGINAL_FAILURE_EVIDENCE_INVALID');
  need(m.currentBlobs[k.composition]===k.compositionBlob&&m.currentBlobs[k.sourceReceipt]===k.sourceReceiptBlob&&
    m.productPaths.length===118&&same(m.productPaths,m.composition.productFiles)&&
    m.composition.rows.every(r=>m.currentBlobs[r.path]===r.currentBlob&&m.parentTree[r.path]===r.currentBlob),
    'PRODUCT_OR_ORIGINAL_COMPOSITION_CHANGED');
  need(m.currentGuard===insurerResumePrefix+m.parentGuard,'PARENT_GUARD_BODY_CHANGED');
  for(const [name,p] of [['guard',k.guard],['validator',k.validator],['test',k.test],['repair',k.repair],['repairTest',k.repairTest]]){
    const q=R.governanceSources?.[name];need(q?.path===p&&q.blobSha===m.currentBlobs[p]&&sha(q.blobSha),
      'CURRENT_GOVERNANCE_BLOB_INVALID:'+name);
  }
  const E=R.environmentRestore;
  need(E?.project==='ays-orbit-360-lab'&&E.region==='us-east1'&&E.function==='orbit360ScopedPolicyReadPreview'&&
    E.baselineRevision===k.baselineRevision&&E.expectedCurrentRevision===k.deployedRevision&&
    E.baselineEnvironmentSha256===k.baselineEnvironmentSha256&&E.observedEnvironmentSha256===k.driftEnvironmentSha256&&
    E.expectedCodeHash===k.codeHash&&E.sourceGeneration===k.sourceGeneration&&
    E.patchMask==='serviceConfig.environmentVariables'&&E.recoverMapFromExactHistoricalRevision===true&&
    E.exactBaselineMapHashRequiredBeforePatch===true&&E.codeStorageAndImageMustRemainUnchanged===true&&
    E.onlyExistingReaderEnvironmentRestore===true&&E.exportEnvironmentValues===false&&E.iamPolicyMutation===false,
    'ENVIRONMENT_RESTORE_SCOPE_INVALID');
  need(same(R.artifacts,k.artifacts)&&R.rebuildForbidden===true&&R.redeployBackendCodeForbidden===true,
    'IMMUTABLE_ARTIFACT_REUSE_INVALID');
  const P=R.previewTransport;
  need(P?.workflowPath===k.workflow&&sha(P.transportWorkflowAfterBlob)&&
    P.hostingChannelId==='gi-i65-b4-sr-41066435386'&&P.expectedPreviewUrl==='https://ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app'&&
    P.reuseExistingChannel===true&&P.sourceSha===k.source&&P.rebuild===false&&P.backendCodeDeploy===false&&
    P.exactArtifactDigestsRequired===true,'RESUME_TRANSPORT_INVALID');
  need(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup','newEndpoints',
    'newWorkflows','newCollections','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted']
      .every(p=>R.boundaries?.[p]===false),'SCOPE_EXPANDED');
  need(R.allowedEvidenceSuccessor?.controlKey===k.evidenceKey&&R.allowedEvidenceSuccessor.receiptPath===k.evidencePath&&
    same(R.allowedEvidenceSuccessor.exactChangedPaths,[k.control,k.evidencePath].sort())&&
    R.allowedEvidenceSuccessor.directChildOfRecoveryTransport===true&&R.allowedEvidenceSuccessor.priorKeysPreserved===421,
    'EVIDENCE_SUCCESSOR_BOUNDARY_INVALID');
  if(m.sourceCommit){
    need(m.sourceParent===k.parent&&m.sourceAncestor&&same(m.sourceDelta,insurerResumeAtomicPaths),
      'EXACT_RESUME_SOURCE_COMMIT_REQUIRED');
    need(insurerResumeAtomicPaths.filter(p=>!m.evidence||p!==k.control).every(p=>m.currentBlobs[p]===m.sourceTree[p]),
      'CURRENT_RESUME_BYTES_CHANGED');
    if(m.transport){
      need(m.transport.parent===m.sourceCommit&&m.transport.message===k.transportMessage&&same(m.transport.paths,[k.workflow])&&
        m.transport.workflowBlob===P.transportWorkflowAfterBlob&&m.currentBlobs[k.workflow]===P.transportWorkflowAfterBlob&&
        same(m.deltaPaths,sorted([...insurerResumeAtomicPaths,k.workflow,...(m.evidence?[k.evidencePath]:[])])),
        'EXACT_RESUME_TRANSPORT_REQUIRED');
      if(m.evidence)validateResumeEvidence(m);
      else need(m.head===m.transport.sha,'TRANSPORT_HEAD_REQUIRED');
    }else need(m.head===m.sourceCommit&&same(m.deltaPaths,insurerResumeAtomicPaths)&&
      m.currentBlobs[k.workflow]===m.parentTree[k.workflow],'RESUME_SOURCE_STATE_INVALID');
    need(m.untracked.length===0||(m.evidence&&!m.evidenceCommit&&same(m.untracked,[k.evidencePath])),
      'UNEXPECTED_UNTRACKED_FILES');
  }else need(m.head===k.parent&&same(m.deltaPaths,insurerResumeAtomicPaths)&&
    m.currentBlobs[k.workflow]===m.parentTree[k.workflow],'PREPUBLICATION_DELTA_NOT_EXACT');
  return {status:'EXACT_ENVIRONMENT_RESTORE_RESUME_VALIDATED',productFilesPreserved:118,priorKeysPreserved:420,
    backendCodeRedeploy:false,hostingRebuild:false,findingsChanged:false};
}

function validateResumeEvidence(m){
  const E=m.evidence,P=m.control[k.evidenceKey],T=E.technical,U=E.authenticatedUat;
  need(P?.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EVIDENCE_POINTER_V1'&&
    P.receiptPath===k.evidencePath&&P.receiptBlobSha===m.currentBlobs[k.evidencePath]&&P.gate==='I6.5/B4-003'&&
    P.status===E.status&&P.sourceSha===k.source&&P.transportSha===m.transport.sha&&P.sourceGuardRunId===k.sourceGuardRunId&&
    P.transportRunId===E.transportRunId&&P.previewUrl===E.previewUrl&&P.buildId===E.buildId&&P.currentCapabilityAcceptances===0&&
    P.recoverySourceSha===E.recoverySourceSha&&P.recoveryTransportSha===E.recoveryTransportSha&&
    P.recoveryGuardRunId===E.recoveryGuardRunId&&P.recoveryRunId===E.recoveryRunId,'EVIDENCE_POINTER_INVALID');
  need(E.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_V1'&&E.gate===P.gate&&
    E.sourceSha===k.source&&E.sourceGuardRunId===k.sourceGuardRunId&&E.initialTransportSha===k.parent&&E.initialRunId===k.initialRunId&&
    E.transportSha===m.transport.sha&&E.parentHead===m.transport.sha&&E.recoverySourceSha===m.sourceCommit&&
    E.recoveryTransportSha===m.transport.sha&&E.transportRunId===E.recoveryRunId&&
    [E.recoveryGuardRunId,E.recoveryRunId].every(n=>Number.isSafeInteger(n)&&n>0)&&
    E.previewUrl===m.receipt.previewTransport.expectedPreviewUrl&&
    ['TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS','TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_BLOCKED',
      'TECHNICAL_PREVIEW_PARTIAL_UAT_NOT_ACCEPTED','TECHNICAL_PREVIEW_FAILED_UAT_NOT_RUN'].includes(E.status),
    'EVIDENCE_IDENTITY_INVALID');
  need(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup',
    'findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted'].every(p=>E.boundaries?.[p]===false),
    'EVIDENCE_SCOPE_EXPANDED');
  need(T&&T.newFunctionsCreated===0&&T.backendCodeRedeployed===false&&T.hostingRebuilt===false&&
    same(T.targetFunctions,[{name:'orbit360ProductOperationalCommandPreview',region:'us-east1'},
      {name:'orbit360ScopedPolicyReadPreview',region:'us-east1'}]),'EVIDENCE_TARGETS_INVALID');
  if(E.status==='TECHNICAL_PREVIEW_FAILED_UAT_NOT_RUN')need(T.status==='FAILED'&&U?.status==='NOT_RUN','FAILED_RESUME_CANNOT_ACCEPT_UAT');
  else if(E.status==='TECHNICAL_PREVIEW_PARTIAL_UAT_NOT_ACCEPTED')need(T.status==='PARTIAL'&&U?.status==='NOT_ACCEPTED','PARTIAL_RESUME_CANNOT_ACCEPT_UAT');
  else{
    need(T.status==='PASS'&&T.backendExactSourceReadback===true&&T.hostingBytesExact===true&&T.liveIdentityUnchanged===true&&
      T.iamUnchanged===true&&T.recoveryEnvironmentRestored===true&&T.recoveredEnvironmentSha256===k.baselineEnvironmentSha256&&
      T.initialBackendSourceUnchanged===true&&typeof T.recoveredReaderRevision==='string'&&
      /^orbit360scopedpolicyreadpreview-\d{5}-[a-z0-9]+$/.test(T.recoveredReaderRevision)&&
      T.recoveredReaderRevision!==k.deployedRevision&&typeof E.buildId==='string'&&
      E.buildId.startsWith('gi-i65-b4-'+k.source.slice(0,12)+'-'),'TECHNICAL_RESUME_PASS_INCOMPLETE');
    if(E.status==='TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS'){
      const names=['Carlos Castro','Carlos Arturo Castro Casallas'];
      need(U?.status==='PASS'&&U.fixtureId==='b4003qa_human_insurer_r20'&&names.includes(U.actor)&&U.role==='Operativo'&&
        U.country==='GT'&&U.buildId===E.buildId&&U.syntheticWrites===2&&U.restored===true&&U.priorActivityRetained===true&&
        U.newAuditRowsAfterReload===2&&U.observationsRestoredExactly===true&&U.otherVisibleFieldsCompared===12&&
        U.otherVisibleFieldsUnchanged===true&&Array.isArray(U.auditRows)&&U.auditRows.length===2&&
        same(sorted(U.auditRows.map(r=>r.phase)),['edit','restore'])&&new Set(U.auditRows.map(r=>r.rowDigestSha256)).size===2&&
        new Set(U.auditRows.map(r=>r.reason)).size===2&&U.auditRows.every(r=>names.includes(r.visibleActor)&&
          String(r.visibleRole||'').trim().toLowerCase()==='operativo'&&r.matchesSubmittedReason===true&&
          typeof r.reason==='string'&&r.reason.trim().length>4&&same(r.changedFields,['observaciones'])&&
          /^[0-9a-f]{64}$/.test(String(r.rowDigestSha256||''))&&/\d{1,2}\/\d{1,2}\/\d{4}/.test(String(r.dateTimeText||''))&&
          /\d{1,2}:\d{2}/.test(r.dateTimeText)),'AUTHENTICATED_AUDIT_PASS_INCOMPLETE');
    }else need(U?.status==='BLOCKED','BLOCKED_STATUS_REQUIRES_BLOCKED_UAT');
  }
  if(m.evidenceCommit)need(m.head===m.evidenceCommit&&m.evidenceParent===m.transport.sha&&
    same(m.evidenceDelta,[k.control,k.evidencePath].sort()),'EXACT_TWO_FILE_EVIDENCE_COMMIT_REQUIRED');
  else need(m.head===m.transport.sha,'EVIDENCE_PREPUBLICATION_PARENT_REQUIRED');
}

function frozenParentGuard(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-resume-parent-'));let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,k.parent],{stdio:'pipe',maxBuffer:8*1024*1024});added=true;
    // The immutable 7b validator already selects TAP for its own c3 child.
    // Adding a second reporter here would be an invalid Node configuration.
    const out=execFileSync(process.execPath,[k.guard],{cwd:dir,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),'IMMUTABLE_PARENT_GUARD_FAILED');
    console.log('B4_003_INSURER_RESUME_PARENT=EXACT_7B_SOURCE_AND_ALL_PRIOR_PROOFS_PASS');
  }finally{if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});else fs.rmSync(dir,{recursive:true,force:true});}
}
export function runInsurerPreviewResumeGuard(){
  const C=json(k.control);if(!C[k.key]&&!fs.existsSync(k.receipt))return false;
  need(C[k.key]&&fs.existsSync(k.receipt),'POINTER_OR_RECEIPT_MISSING');
  const mode=(process.argv.find(v=>v.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_INVALID');
  const m=collectInsurerPreviewResumeModel(),result=validateInsurerPreviewResumeModel(m);
  frozenParentGuard();
  for(const p of [k.repairTest,k.test])execFileSync(process.execPath,p.endsWith('.mjs')?['--test',p]:[p],
    {encoding:'utf8',stdio:'pipe',maxBuffer:8*1024*1024});
  validateInsurerPreviewResumeModel(collectInsurerPreviewResumeModel());
  console.log('B4_003_INSURER_RESUME_CURRENT='+JSON.stringify(result));
  console.log('B4_003_INSURER_ACTIVITY_STATUS='+(m.evidence?.status||k.status));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');console.log('PRODUCT_SOURCE_DRIFT=false');return true;
}
