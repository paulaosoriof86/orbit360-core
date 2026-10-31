// Exact repair of the environment drift caused by run 41150545623.
// The already deployed product and its immutable Hosting artifact are retained.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
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
  if(json(k.control)[postRestorationContract.key]||fs.existsSync(postRestorationContract.receipt))return collectPostRestorationModel();
  if(json(k.control)[identityContract.key]||fs.existsSync(identityContract.receipt))return collectIdentityModel();
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
  if(m.kind==='INSURER_POST_RESTORATION_READBACK_SUCCESSOR'||m.control?.[postRestorationContract.key])return validatePostRestorationModel(m);
  if(m.kind==='INSURER_REVISION_IDENTITY_SUCCESSOR'||m.control?.[identityContract.key])return validateIdentityModel(m);
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
  const C=json(k.control);
  if(C[postRestorationContract.key]||fs.existsSync(postRestorationContract.receipt))return runPostRestorationGuard();
  if(C[identityContract.key]||fs.existsSync(identityContract.receipt))return runIdentityGuard();if(!C[k.key]&&!fs.existsSync(k.receipt))return false;
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

// A separate, exact six-file successor for the failed identity read. The
// original restoration recipe, original Guard and every product byte remain
// immutable. A short service field is not claimed as the observed root cause.
export const identityContract=Object.freeze({
  parent:'850b156f7c00080d933b0af8ba16837a89f76160',
  parentControlBlob:'02261fe4112dcbd6f28122e5ef665ee5473f8b61',
  guardBlob:'82ccd4e27aa7137ee299799c10885447a6905d8f',
  previousReceiptBlob:'2736c017137490b0a0f6af1f6e4ca16f46b0c6ed',
  key:'b4003InsurerReaderRevisionIdentitySuccessor20261030',
  receipt:D+'I6_5_B4_003_INSURER_READER_REVISION_IDENTITY_SUCCESSOR_20261030.json',
  status:'BOUNDED_REVISION_IDENTITY_COMPATIBILITY_DIAGNOSTIC_RESUME_AUTHORIZED',
  failedRecoveryRunId:41152465200,
  failureReportSha256:'4d8b10abac2c12b0fec1725d8baf29ad0eaaabe5c4e939bbc9121f6fe5bb867b'
});
export const identityAtomicPaths=[k.control,identityContract.receipt,k.validator,k.test,k.repair,k.repairTest].sort();

function collectIdentityModel(){
  const n=identityContract,C=json(k.control),R=json(n.receipt),P=tree(n.parent),head=git('rev-parse','HEAD');
  const sourceCommit=lines(git('log','--all','--format=%H','--',n.receipt)).find(c=>git('rev-parse',c+':'+n.receipt)===hash(n.receipt))||null;
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const deltaPaths=sorted([...new Set([...lines(git('diff','--name-only',n.parent)),...untracked])]);
  const composition=json(k.composition),productPaths=sorted([...new Set([...lines(git('diff','--name-only',composition.certifiedBaseline)),...untracked])].filter(product));
  const all=[...new Set([...deltaPaths,...productPaths,k.guard,k.workflow,k.receipt,k.composition,k.sourceReceipt])];
  const currentBlobs=Object.fromEntries(all.map(p=>[p,fs.existsSync(p)&&fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink()?hash(p):'ABSENT_OR_NONREGULAR']));
  const evidence=fs.existsSync(k.evidencePath)?json(k.evidencePath):null;
  const evidenceCommit=evidence?lines(git('log','--all','--format=%H','--',k.evidencePath)).find(c=>git('rev-parse',c+':'+k.evidencePath)===hash(k.evidencePath))||null:null;
  const transportRef=evidence?.transportSha||(head!==n.parent&&head!==sourceCommit?head:null);
  return {kind:'INSURER_REVISION_IDENTITY_SUCCESSOR',control:C,receipt:R,previousReceipt:json(k.receipt),
    authorityReceiptPath:n.receipt,authorityReceiptBlobSha:currentBlobs[n.receipt],parentTree:P,
    parentControl:JSON.parse(git('show',n.parent+':'+k.control)),sourceControl:sourceCommit?JSON.parse(git('show',sourceCommit+':'+k.control)):C,
    composition,head,sourceCommit,currentBlobs,productPaths,deltaPaths,untracked,parentVerified:git('merge-base',n.parent,head)===n.parent,
    sourceParent:sourceCommit?git('rev-parse',sourceCommit+'^'):null,sourceAncestor:sourceCommit?git('merge-base',sourceCommit,head)===sourceCommit:false,
    sourceTree:sourceCommit?tree(sourceCommit):null,sourceDelta:sourceCommit?sorted(lines(git('diff','--name-only',n.parent,sourceCommit))):deltaPaths,
    transport:transportRef?{sha:transportRef,parent:git('rev-parse',transportRef+'^'),message:git('show','-s','--format=%s',transportRef),
      paths:sorted(lines(git('diff','--name-only',transportRef+'^',transportRef))),workflowBlob:git('rev-parse',transportRef+':'+k.workflow)}:null,
    evidence,evidenceCommit,evidenceParent:evidenceCommit?git('rev-parse',evidenceCommit+'^'):null,
    evidenceDelta:evidenceCommit?sorted(lines(git('diff','--name-only',evidenceCommit+'^',evidenceCommit))):null};
}

function validateIdentityModel(m){
  const n=identityContract,C=m.control,B=m.parentControl,SC=m.sourceControl,R=m.receipt,S=C[n.key];
  need(m.kind==='INSURER_REVISION_IDENTITY_SUCCESSOR'&&m.parentVerified&&m.parentTree[k.control]===n.parentControlBlob&&
    m.currentBlobs[k.guard]===n.guardBlob&&m.parentTree[k.guard]===n.guardBlob,'IDENTITY_EXACT_PARENT_AND_FROZEN_GUARD_REQUIRED');
  const extras=m.evidence?[n.key,k.evidenceKey].sort():[n.key];
  need(Object.keys(B).length===421&&Object.keys(SC).length===422&&Object.keys(C).length===421+extras.length&&
    Object.keys(B).every(p=>same(C[p],B[p])&&same(SC[p],B[p]))&&
    same(sorted(Object.keys(C).filter(p=>!(p in B))),extras)&&same(S,SC[n.key]),'IDENTITY_PRIOR_CONTROL_OR_KEYS_CHANGED');
  need(S?.schema==='GRAVICENTRA_I65_B4003_INSURER_REVISION_IDENTITY_POINTER_V1'&&S.status===n.status&&S.gate==='I6.5/B4-003'&&
    S.parentHead===n.parent&&S.receiptPath===n.receipt&&S.receiptBlobSha===m.currentBlobs[n.receipt]&&
    m.authorityReceiptPath===n.receipt&&m.authorityReceiptBlobSha===S.receiptBlobSha&&
    same(S.atomicCommitPaths,identityAtomicPaths)&&S.existingRestorationScopeUnchanged===true&&
    S.backendCodeRedeployAuthorized===false&&S.hostingRebuildAuthorized===false&&S.authIamRulesChangeAuthorized===false,
    'IDENTITY_CURRENT_AUTHORITY_POINTER_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_READER_REVISION_IDENTITY_SUCCESSOR_V1'&&R.status===n.status&&R.gate===S.gate&&
    R.parentHead===n.parent&&R.repository===C.repository&&R.branch===C.branch&&R.sourceSha===k.source&&
    R.sourceGuardRunId===k.sourceGuardRunId&&R.initialTransportSha===k.parent&&R.initialRunId===k.initialRunId&&
    R.failedRecoveryTransportSha===n.parent&&R.failedRecoveryRunId===n.failedRecoveryRunId&&same(R.atomicCommitPaths,identityAtomicPaths),
    'IDENTITY_RECEIPT_INVALID');
  const F=R.failedRecovery;
  need(F?.error==='REVISION_IDENTITY_MISMATCH'&&F.patchRequests===0&&F.patchAttempted===false&&
    F.failureReportSha256===n.failureReportSha256&&F.observedFailingIdentityFieldKnown===false&&
    F.shortServiceRepresentationConfirmed===false&&F.originalRunReclassifiedAsSuccess===false,
    'IDENTITY_FAILED_READ_MISREPRESENTED');
  need(m.currentBlobs[k.receipt]===n.previousReceiptBlob&&R.previousRecoveryReceipt?.path===k.receipt&&
    R.previousRecoveryReceipt.blobSha===n.previousReceiptBlob&&
    same(R.environmentRestore,m.previousReceipt.environmentRestore)&&same(R.artifacts,k.artifacts)&&
    R.rebuildForbidden===true&&R.redeployBackendCodeForbidden===true,'IDENTITY_PREVIOUS_RECIPE_OR_SCOPE_CHANGED');
  need(m.currentBlobs[k.composition]===k.compositionBlob&&m.currentBlobs[k.sourceReceipt]===k.sourceReceiptBlob&&
    m.productPaths.length===118&&same(m.productPaths,m.composition.productFiles)&&
    m.composition.rows.every(r=>m.currentBlobs[r.path]===r.currentBlob&&m.parentTree[r.path]===r.currentBlob),
    'IDENTITY_PRODUCT_COMPOSITION_CHANGED');
  for(const [name,p] of [['validator',k.validator],['test',k.test],['repair',k.repair],['repairTest',k.repairTest]]){
    const v=R.governanceSources?.[name];need(v?.path===p&&v.beforeBlobSha===m.parentTree[p]&&
      v.blobSha===m.currentBlobs[p]&&sha(v.blobSha)&&v.blobSha!==v.beforeBlobSha,'IDENTITY_CURRENT_TOOL_BINDING_INVALID:'+name);
  }
  const Q=R.identityCompatibility;
  need(Q?.completeRevisionNameStillExact===true&&Q.onlyExactParentServiceShortNameAdded===true&&
    Q.alreadyPinnedProjectNumberAliasUnchanged===true&&Q.absentNullForeignServiceRejected===true&&
    Q.identityDiagnosticBeforeValidation===true&&Q.environmentValuesExported===false&&
    Q.networkEndpointsChanged===false&&Q.hashesMasksAndTargetsUnchanged===true,'IDENTITY_COMPATIBILITY_SCOPE_EXPANDED');
  const P=R.previewTransport;
  need(P?.workflowPath===k.workflow&&sha(P.transportWorkflowAfterBlob)&&P.sourceSha===k.source&&
    P.reuseExistingChannel===true&&P.hostingChannelId==='gi-i65-b4-sr-41066435386'&&
    P.expectedPreviewUrl==='https://ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app'&&
    P.rebuild===false&&P.backendCodeDeploy===false&&P.exactArtifactDigestsRequired===true,'IDENTITY_TRANSPORT_INVALID');
  need(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup','newEndpoints',
    'newWorkflows','newCollections','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted']
    .every(p=>R.boundaries?.[p]===false),'IDENTITY_BOUNDARIES_EXPANDED');
  need(R.allowedEvidenceSuccessor?.controlKey===k.evidenceKey&&R.allowedEvidenceSuccessor.receiptPath===k.evidencePath&&
    same(R.allowedEvidenceSuccessor.exactChangedPaths,[k.control,k.evidencePath].sort())&&
    R.allowedEvidenceSuccessor.priorKeysPreserved===422&&R.allowedEvidenceSuccessor.directChildOfRecoveryTransport===true,
    'IDENTITY_EVIDENCE_SUCCESSOR_INVALID');
  if(m.sourceCommit){
    need(m.sourceParent===n.parent&&m.sourceAncestor&&same(m.sourceDelta,identityAtomicPaths),'IDENTITY_ATOMIC_SOURCE_INVALID');
    need(identityAtomicPaths.filter(p=>!m.evidence||p!==k.control).every(p=>m.currentBlobs[p]===m.sourceTree[p]),'IDENTITY_CURRENT_BYTES_CHANGED');
    if(m.transport){
      need(m.transport.parent===m.sourceCommit&&m.transport.message===k.transportMessage&&same(m.transport.paths,[k.workflow])&&
        m.transport.workflowBlob===P.transportWorkflowAfterBlob&&m.currentBlobs[k.workflow]===P.transportWorkflowAfterBlob&&
        same(m.deltaPaths,sorted([...identityAtomicPaths,k.workflow,...(m.evidence?[k.evidencePath]:[])])),
        'IDENTITY_EXACT_TRANSPORT_REQUIRED');
      if(m.evidence){
        need(m.evidence.failedRecoveryTransportSha===n.parent&&m.evidence.failedRecoveryRunId===n.failedRecoveryRunId&&
          m.control[k.evidenceKey]?.failedRecoveryTransportSha===n.parent&&
          m.control[k.evidenceKey]?.failedRecoveryRunId===n.failedRecoveryRunId,'IDENTITY_FAILED_RECOVERY_LINEAGE_LOST');
        validateResumeEvidence(m);
      }else need(m.head===m.transport.sha,'IDENTITY_TRANSPORT_HEAD_INVALID');
    }else need(m.head===m.sourceCommit&&same(m.deltaPaths,identityAtomicPaths)&&m.currentBlobs[k.workflow]===m.parentTree[k.workflow],
      'IDENTITY_SOURCE_STATE_INVALID');
    need(m.untracked.length===0||(m.evidence&&!m.evidenceCommit&&same(m.untracked,[k.evidencePath])),'IDENTITY_UNTRACKED_FILES');
  }else need(m.head===n.parent&&same(m.deltaPaths,identityAtomicPaths)&&m.currentBlobs[k.workflow]===m.parentTree[k.workflow],
    'IDENTITY_PREPUBLICATION_DELTA_NOT_EXACT');
  return {status:'EXACT_REVISION_IDENTITY_COMPATIBILITY_VALIDATED',productFilesPreserved:118,priorKeysPreserved:421,
    revisionShapeObservedCauseClaimed:false,backendCodeRedeploy:false,hostingRebuild:false,findingsChanged:false};
}

function runIdentityGuard(){
  const n=identityContract,C=json(k.control);need(C[n.key]&&fs.existsSync(n.receipt),'IDENTITY_AUTHORITY_MISSING');
  const mode=(process.argv.find(v=>v.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_INVALID');
  const m=collectIdentityModel(),result=validateIdentityModel(m);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-identity-parent-'));let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,n.parent],{stdio:'pipe',maxBuffer:8*1024*1024});added=true;
    const out=execFileSync(process.execPath,[k.guard],{cwd:dir,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),'IDENTITY_IMMUTABLE_PARENT_GUARD_FAILED');
    console.log('B4_003_INSURER_IDENTITY_PARENT=EXACT_850_SOURCE_AND_ALL_PRIOR_PROOFS_PASS');
  }finally{if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});else fs.rmSync(dir,{recursive:true,force:true});}
  for(const p of [k.repairTest,k.test])execFileSync(process.execPath,p.endsWith('.mjs')?['--test',p]:[p],
    {encoding:'utf8',stdio:'pipe',maxBuffer:8*1024*1024});
  validateIdentityModel(collectIdentityModel());
  console.log('B4_003_INSURER_IDENTITY_CURRENT='+JSON.stringify(result));
  console.log('B4_003_INSURER_ACTIVITY_STATUS='+(m.evidence?.status||n.status));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');console.log('PRODUCT_SOURCE_DRIFT=false');return true;
}

// The one historical configuration PATCH is complete or blocked independently
// of this successor. This authority permits GET-only adjudication and requires
// the original 33 source-file bytes per target before reusing the same Hosting.
export const postRestorationContract=Object.freeze({
  parent:'a4c3d37dc8d9a4bf11451d9b9b61b3a66e439825',
  parentControlBlob:'6dc740531b93d4bbfe6b3e08df79b2fd379702ad',
  guardBlob:'82ccd4e27aa7137ee299799c10885447a6905d8f',
  previousIdentityReceiptBlob:'51447fb7218480832b0b61d619440dea8939d461',
  key:'b4003InsurerPostRestorationReadbackSuccessor20261030',
  receipt:D+'I6_5_B4_003_INSURER_POST_RESTORATION_READBACK_SUCCESSOR_20261030.json',
  helper:'tools/gravicentra-b4-003-insurer-reader-postpatch-readback.cjs',
  helperTest:'tools/gravicentra-b4-003-insurer-reader-postpatch-readback.test.cjs',
  status:'GET_ONLY_OPERATION_BOUND_CONTENT_VERIFICATION_AUTHORIZED',
  authority:'READ_KNOWN_RESTORATION_OPERATION_AND_EXACT_SOURCE_VERIFY_THEN_SAME_HOSTING',
  failedRunId:41153515829,
  operationName:'projects/ays-orbit-360-lab/locations/us-east1/operations/operation-1793408711390-65f18812df446-eb3d2d80-cd121490',
  firstReportSha256:'f674cfb499a98bf0f3a6e75cdf2e5d40c4c51d86b25b64f68593200f0499d60e',
  secondReportSha256:'5746c896933bbaebabc3f826ba346b8e7dfe05a519e061f7b8ae8cc53d95567a',
  manifestSha256:'508cbecd62cba2facd22484a94482ac1fb081fde1e2c3d42fb17fa1d35ba0526',
  initialDeploymentSnapshotSha256:'3c2f7839fed90ec11846750aef00a08415b7df7ab41a2d96798e9d10164827f4',
  baselineServiceConfigSha256:'9cf40283fe806e06350ae094bca9c4e3611311ee098589ab5aed8ffffe6019fc',
  iamSha256:'b9a6087bad291d0bb96d7e1784d459b1521d258707c63f93933d3148c60391cb',
  patchArtifact:{id:13024615471,bytes:16359,digest:'sha256:ba67c529382cdb987612939f4f743cafbd6405c96b84fe967821cdf9ab6e5091'},
  sourceIdentityMeaning:'ALL_33_STAGED_PRODUCT_SOURCE_FILES_PER_TARGET_IDENTICAL_NOT_METADATA_IDENTITY'
});
const p=postRestorationContract;
export const postRestorationAtomicPaths=[k.control,p.receipt,k.validator,k.test,p.helper,p.helperTest].sort();
export const postPatchFailureHistory=[
  {runId:p.failedRunId,attempt:1,transportSha:p.parent,status:'FAILURE',failureCode:'CURRENT_FUNCTION_SOURCE_CHANGED',patchRequests:1,reportSha256:p.firstReportSha256},
  {runId:p.failedRunId,attempt:2,transportSha:p.parent,status:'FAILURE',failureCode:'CURRENT_FUNCTION_SOURCE_CHANGED',patchRequests:0,reportSha256:p.secondReportSha256}
];
const digestBytes=x=>crypto.createHash('sha256').update(x).digest('hex');
const jsonFileDigest=x=>digestBytes(JSON.stringify(x,null,2)+'\n');
function collectPostRestorationModel(){
  const C=json(k.control),R=json(p.receipt),P=tree(p.parent),head=git('rev-parse','HEAD');
  const sourceCommit=lines(git('log','--all','--format=%H','--',p.receipt)).find(c=>git('rev-parse',c+':'+p.receipt)===hash(p.receipt))||null;
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const deltaPaths=sorted([...new Set([...lines(git('diff','--name-only',p.parent)),...untracked])]);
  const composition=json(k.composition),productPaths=sorted([...new Set([...lines(git('diff','--name-only',composition.certifiedBaseline)),...untracked])].filter(product));
  const all=[...new Set([...deltaPaths,...productPaths,k.guard,k.workflow,k.receipt,identityContract.receipt,k.repair,k.repairTest,k.composition,k.sourceReceipt])];
  const currentBlobs=Object.fromEntries(all.map(f=>[f,fs.existsSync(f)&&fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink()?hash(f):'ABSENT_OR_NONREGULAR']));
  const evidence=fs.existsSync(k.evidencePath)?json(k.evidencePath):null;
  const evidenceCommit=evidence?lines(git('log','--all','--format=%H','--',k.evidencePath)).find(c=>git('rev-parse',c+':'+k.evidencePath)===hash(k.evidencePath))||null:null;
  const transportRef=evidence?.transportSha||(head!==p.parent&&head!==sourceCommit?head:null);
  return {kind:'INSURER_POST_RESTORATION_READBACK_SUCCESSOR',control:C,receipt:R,parentTree:P,
    authorityReceiptPath:p.receipt,authorityReceiptBlobSha:currentBlobs[p.receipt],
    parentControl:JSON.parse(git('show',p.parent+':'+k.control)),sourceControl:sourceCommit?JSON.parse(git('show',sourceCommit+':'+k.control)):C,
    composition,head,sourceCommit,currentBlobs,productPaths,deltaPaths,untracked,parentVerified:git('merge-base',p.parent,head)===p.parent,
    sourceParent:sourceCommit?git('rev-parse',sourceCommit+'^'):null,sourceAncestor:sourceCommit?git('merge-base',sourceCommit,head)===sourceCommit:false,
    sourceTree:sourceCommit?tree(sourceCommit):null,sourceDelta:sourceCommit?sorted(lines(git('diff','--name-only',p.parent,sourceCommit))):deltaPaths,
    transport:transportRef?{sha:transportRef,parent:git('rev-parse',transportRef+'^'),message:git('show','-s','--format=%s',transportRef),
      paths:sorted(lines(git('diff','--name-only',transportRef+'^',transportRef))),workflowBlob:git('rev-parse',transportRef+':'+k.workflow)}:null,
    evidence,evidenceCommit,evidenceParent:evidenceCommit?git('rev-parse',evidenceCommit+'^'):null,
    evidenceDelta:evidenceCommit?sorted(lines(git('diff','--name-only',evidenceCommit+'^',evidenceCommit))):null};
}
function validatePostRestorationModel(m){
  const C=m.control,B=m.parentControl,SC=m.sourceControl,R=m.receipt,S=C[p.key];
  need(m.kind==='INSURER_POST_RESTORATION_READBACK_SUCCESSOR'&&m.parentVerified&&m.parentTree[k.control]===p.parentControlBlob&&
    m.currentBlobs[k.guard]===p.guardBlob&&m.parentTree[k.guard]===p.guardBlob,'POST_RESTORATION_FROZEN_PARENT_REQUIRED');
  const extras=m.evidence?[p.key,k.evidenceKey].sort():[p.key];
  need(Object.keys(B).length===422&&Object.keys(SC).length===423&&Object.keys(C).length===422+extras.length&&
    Object.keys(B).every(f=>same(C[f],B[f])&&same(SC[f],B[f]))&&same(sorted(Object.keys(C).filter(f=>!(f in B))),extras)&&same(S,SC[p.key]),
    'POST_RESTORATION_PRIOR_KEYS_CHANGED');
  need(S?.schema==='GRAVICENTRA_I65_B4003_INSURER_POST_RESTORATION_POINTER_V1'&&S.status===p.status&&S.gate==='I6.5/B4-003'&&
    S.parentHead===p.parent&&S.receiptPath===p.receipt&&S.receiptBlobSha===m.currentBlobs[p.receipt]&&
    m.authorityReceiptPath===p.receipt&&m.authorityReceiptBlobSha===S.receiptBlobSha&&same(S.atomicCommitPaths,postRestorationAtomicPaths)&&
    S.readOnlyBackendVerificationAuthorized===true&&S.furtherConfigurationWritesAuthorized===false&&S.backendCodeDeploymentAuthorized===false&&S.authIamRulesChangeAuthorized===false,
    'POST_RESTORATION_AUTHORITY_POINTER_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_POST_RESTORATION_READBACK_SUCCESSOR_V1'&&R.status===p.status&&R.authority===p.authority&&R.gate===S.gate&&
    R.parentHead===p.parent&&R.repository===C.repository&&R.branch===C.branch&&R.sourceSha===k.source&&R.sourceGuardRunId===k.sourceGuardRunId&&
    R.initialTransportSha===k.parent&&R.initialRunId===k.initialRunId&&R.failedRecoveryTransportSha===identityContract.parent&&R.failedRecoveryRunId===identityContract.failedRecoveryRunId&&
    R.postPatchFailureTransportSha===p.parent&&R.postPatchFailureRunId===p.failedRunId&&same(R.atomicCommitPaths,postRestorationAtomicPaths),'POST_RESTORATION_RECEIPT_INVALID');
  need(same(R.postPatchFailureHistory,postPatchFailureHistory)&&Array.isArray(R.failedAttemptReports)&&R.failedAttemptReports.length===2&&
    R.failedAttemptReports.every((x,i)=>x.attempt===i+1&&x.reportSha256===postPatchFailureHistory[i].reportSha256&&jsonFileDigest(x.report)===x.reportSha256),
    'POST_RESTORATION_FAILED_ATTEMPTS_CHANGED');
  need(same(R.patchSubmissionArtifact,p.patchArtifact)&&same(R.artifacts,k.artifacts)&&R.rebuildForbidden===true&&R.redeployBackendCodeForbidden===true,
    'POST_RESTORATION_IMMUTABLE_ARTIFACTS_CHANGED');
  need(m.currentBlobs[identityContract.receipt]===p.previousIdentityReceiptBlob&&m.currentBlobs[k.receipt]===identityContract.previousReceiptBlob&&
    m.currentBlobs[k.repair]===m.parentTree[k.repair]&&m.currentBlobs[k.repairTest]===m.parentTree[k.repairTest],
    'POST_RESTORATION_HISTORICAL_RECIPE_CHANGED');
  need(m.currentBlobs[k.composition]===k.compositionBlob&&m.currentBlobs[k.sourceReceipt]===k.sourceReceiptBlob&&m.productPaths.length===118&&
    same(m.productPaths,m.composition.productFiles)&&m.composition.rows.every(r=>m.currentBlobs[r.path]===r.currentBlob&&m.parentTree[r.path]===r.currentBlob),
    'POST_RESTORATION_PRODUCT_COMPOSITION_CHANGED');
  for(const [name,f]of [['validator',k.validator],['test',k.test],['readback',p.helper],['readbackTest',p.helperTest]]){
    const g=R.governanceSources?.[name];need(g?.path===f&&g.beforeBlobSha===(m.parentTree[f]||null)&&g.blobSha===m.currentBlobs[f]&&sha(g.blobSha)&&g.blobSha!==g.beforeBlobSha,'POST_RESTORATION_TOOL_BINDING_INVALID:'+name);
  }
  const Q=R.readOnlyRecovery;
  need(Q?.operationName===p.operationName&&same(Q.allowedHttpMethods,['GET'])&&Q.operationDoneRequired===true&&Q.operationResponseFunctionMustEqualCurrent===true&&
    Q.maximumFurtherConfigurationWrites===0&&Q.backendCodeDeploymentRequested===false&&Q.originalRepairHelperInvocationForbidden===true&&
    Q.baselineEnvironmentSha256===k.baselineEnvironmentSha256&&Q.baselineServiceConfigNonRevisionSha256===p.baselineServiceConfigSha256&&
    Q.codeHash===k.codeHash&&Q.iamUnchangedRequired===true&&Q.runtimeLabelsAndEntryPointUnchangedRequired===true&&
    same(Q.providerMetadataDifferencesAllowedOnlyAfterOperationBinding,['build','sourceStorage','containerImage'])&&Q.metadataDifferencesMustBeRecorded===true&&
    Q.metadataPassIsSourceBytesPending===true&&Q.exactSourceFilesPerTarget===33&&Q.exactSourceComparisonsRequired===66&&Q.exactSourceBytesBeforeHostingRequired===true&&
    Q.sourceIdentityMeaning===p.sourceIdentityMeaning,'POST_RESTORATION_READ_ONLY_SCOPE_INVALID');
  need(R.backendManifestSha256===p.manifestSha256&&jsonFileDigest(R.backendManifest)===p.manifestSha256&&R.backendManifest.sourceSha===k.source&&
    R.backendManifest.files.length===33,'POST_RESTORATION_ORIGINAL_MANIFEST_CHANGED');
  need(R.initialDeploymentSnapshotSha256===p.initialDeploymentSnapshotSha256&&jsonFileDigest(R.initialDeploymentSnapshot)===p.initialDeploymentSnapshotSha256,
    'POST_RESTORATION_ORIGINAL_DEPLOYMENT_SNAPSHOT_CHANGED');
  const V=R.previewTransport;
  need(V?.workflowPath===k.workflow&&sha(V.transportWorkflowAfterBlob)&&V.sourceSha===k.source&&V.reuseExistingChannel===true&&
    V.hostingChannelId==='gi-i65-b4-sr-41066435386'&&V.expectedPreviewUrl==='https://ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app'&&
    V.rebuild===false&&V.backendCodeDeploy===false&&V.configurationWrite===false&&V.exactArtifactDigestsRequired===true,'POST_RESTORATION_TRANSPORT_INVALID');
  need(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup','newEndpoints','newWorkflows','newCollections',
    'furtherConfigurationWrites','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted'].every(f=>R.boundaries?.[f]===false),'POST_RESTORATION_BOUNDARIES_EXPANDED');
  need(R.allowedEvidenceSuccessor?.controlKey===k.evidenceKey&&R.allowedEvidenceSuccessor.receiptPath===k.evidencePath&&
    same(R.allowedEvidenceSuccessor.exactChangedPaths,[k.control,k.evidencePath].sort())&&R.allowedEvidenceSuccessor.priorKeysPreserved===423&&R.allowedEvidenceSuccessor.directChildOfReadOnlyTransport===true,
    'POST_RESTORATION_EVIDENCE_SUCCESSOR_INVALID');
  if(m.sourceCommit){
    need(m.sourceParent===p.parent&&m.sourceAncestor&&same(m.sourceDelta,postRestorationAtomicPaths),'POST_RESTORATION_ATOMIC_SOURCE_INVALID');
    need(postRestorationAtomicPaths.filter(f=>!m.evidence||f!==k.control).every(f=>m.currentBlobs[f]===m.sourceTree[f]),'POST_RESTORATION_CURRENT_BYTES_CHANGED');
    if(m.transport){
      need(m.transport.parent===m.sourceCommit&&m.transport.message===k.transportMessage&&same(m.transport.paths,[k.workflow])&&
        m.transport.workflowBlob===V.transportWorkflowAfterBlob&&m.currentBlobs[k.workflow]===V.transportWorkflowAfterBlob&&
        same(m.deltaPaths,sorted([...postRestorationAtomicPaths,k.workflow,...(m.evidence?[k.evidencePath]:[])])),'POST_RESTORATION_EXACT_TRANSPORT_REQUIRED');
      if(m.evidence)validatePostRestorationEvidence(m);else need(m.head===m.transport.sha,'POST_RESTORATION_TRANSPORT_HEAD_INVALID');
    }else need(m.head===m.sourceCommit&&same(m.deltaPaths,postRestorationAtomicPaths)&&m.currentBlobs[k.workflow]===m.parentTree[k.workflow],'POST_RESTORATION_SOURCE_STATE_INVALID');
    need(m.untracked.length===0||(m.evidence&&!m.evidenceCommit&&same(m.untracked,[k.evidencePath])),'POST_RESTORATION_UNTRACKED_FILES');
  }else need(m.head===p.parent&&same(m.deltaPaths,postRestorationAtomicPaths)&&m.currentBlobs[k.workflow]===m.parentTree[k.workflow],'POST_RESTORATION_PREPUBLICATION_DELTA_NOT_EXACT');
  return {status:'EXACT_GET_ONLY_POST_RESTORATION_SUCCESSOR_VALIDATED',productFilesPreserved:118,priorKeysPreserved:422,furtherConfigurationWrites:0,backendCodeDeploymentRequested:false,hostingRebuild:false,findingsChanged:false};
}
function validatePostRestorationEvidence(m){
  const E=m.evidence,T=E.technical,P=m.control[k.evidenceKey],R=m.receipt;
  need(E.failedRecoveryTransportSha===identityContract.parent&&E.failedRecoveryRunId===identityContract.failedRecoveryRunId&&
    P?.failedRecoveryTransportSha===identityContract.parent&&P.failedRecoveryRunId===identityContract.failedRecoveryRunId&&
    E.postPatchFailureTransportSha===p.parent&&E.postPatchFailureRunId===p.failedRunId&&P.postPatchFailureTransportSha===p.parent&&P.postPatchFailureRunId===p.failedRunId&&
    same(E.postPatchFailureHistory,postPatchFailureHistory)&&same(E.failedAttemptReports,R.failedAttemptReports),'POST_RESTORATION_EVIDENCE_FAILURE_HISTORY_LOST');
  validateResumeEvidence(m);
  need(T.backendCodeDeploymentRequested===false&&T.currentConfigurationPatchRequests===0&&T.remoteMutationRequests===0,'POST_RESTORATION_EVIDENCE_WRITES_FORBIDDEN');
  if(T.status==='PASS'){
    const H=T.postRestorationReadback;
    need(T.backendSourceContentUnchanged===true&&T.sourceBytesProofCompleted===true&&T.backendSourceComparisons===66&&T.knownOperationDone===true&&
      T.operationResponseBindsCurrent===true&&T.sourceIdentityMeaning===p.sourceIdentityMeaning,'POST_RESTORATION_CONTENT_PASS_INCOMPLETE');
    need(H?.schema==='gravicentra-insurer-reader-postpatch-readback-v1'&&H.status==='EXPECTED_METADATA_PASS_SOURCE_BYTES_PENDING'&&
      H.operationName===p.operationName&&H.operationDone===true&&H.operationResponseBindsCurrent===true&&H.finalOperationResponseBindsCurrent===true&&H.functionStableDuringReadback===true&&
      H.patchRequests===0&&H.remoteMutationRequests===0&&H.sourceBytesProofRequired===true&&H.sourceBytesProofCompleted===false&&
      H.manifestSha256===p.manifestSha256&&H.expectedBackendFileCount===33&&H.iamUnchanged===true&&H.iamSha256===p.iamSha256&&H.finalEnvironmentSha256===k.baselineEnvironmentSha256&&
      H.finalServiceConfigNonRevisionSha256===p.baselineServiceConfigSha256&&H.finalRevision===T.recoveredReaderRevision&&
      same(H.currentFunctionIdentity,H.operationResponseFunctionIdentity)&&same(H.currentFunctionIdentity,H.finalFunctionIdentity),
      'POST_RESTORATION_OPERATION_BOUND_METADATA_REQUIRED');
    const requiredChecks=['name','environment','stateActive','runtime','entryPoint','service','codeHash','labels','baselineEnvironment','baselineServiceConfig','secretReferences','buildInScope','storageInScope','revisionInScope'];
    need([H.currentFunctionComparisons,H.operationResponseFunctionComparisons,H.finalFunctionComparisons].every(c=>requiredChecks.every(f=>c?.[f]===true))&&
      H.operationResponseBinding?.responsePresent===true&&H.operationResponseBinding.responseTypeValid===true&&H.operationResponseBinding.bindsCurrent===true&&
      ['name','state','environment','buildConfig','serviceConfig','labels','updateTime','completeFunction'].every(f=>H.operationResponseBinding.comparisons?.[f]===true),
      'POST_RESTORATION_INVARIANTS_OR_COMPLETE_RESPONSE_MISSING');
    need(['platformBuildChanged','platformStorageChanged','platformImageChanged'].every(f=>typeof H[f]==='boolean'&&T[f]===H[f])&&
      (!Object.hasOwn(T,'containerImageUnchanged')||T.containerImageUnchanged===!H.platformImageChanged),
      'POST_RESTORATION_METADATA_REGENERATION_MISREPORTED');
    const rows=T.functionReadbacks,expected=R.backendManifest.files.map(f=>({path:f.path.replace(/^functions\//,''),sha256:f.sha256}));
    need(Array.isArray(rows)&&rows.length===2&&same(sorted(rows.map(r=>r.target)),['orbit360ProductOperationalCommandPreview','orbit360ScopedPolicyReadPreview'])&&
      rows.every(r=>r.region==='us-east1'&&r.iamUnchanged===true&&r.sourceProof?.status==='DEPLOYED_BACKEND_SOURCE_BYTES_MATCH_EXACT_STAGE'&&
        r.sourceProof.scope==='ALL_STAGED_FUNCTION_FILES'&&same(r.sourceProof.sourceFiles,expected)&&same(r.sourceProof.storageSource,r.after?.sourceStorage)),
      'POST_RESTORATION_ALL_66_CONTENT_COMPARISONS_REQUIRED');
    const reader=rows.find(r=>r.target==='orbit360ScopedPolicyReadPreview'),F=H.currentFunctionIdentity;
    need(['name','state','updateTime','environment','runtime','entryPoint','codeHash','build','sourceStorage','revision','environmentVariablesSha256','serviceConfigNonRevisionSha256']
      .every(f=>same(reader.after[f],F[f]))&&digestBytes(JSON.stringify(stable(reader.after.labels||{})))===F.labelsSha256,
      'POST_RESTORATION_CONTENT_NOT_BOUND_TO_OPERATION_FUNCTION');
    const initialReader=R.initialDeploymentSnapshot.targets.find(r=>r.target==='orbit360ScopedPolicyReadPreview').identity,
      initialWriter=R.initialDeploymentSnapshot.targets.find(r=>r.target==='orbit360ProductOperationalCommandPreview').identity,
      writer=rows.find(r=>r.target==='orbit360ProductOperationalCommandPreview');
    need(['name','state','environment','runtime','entryPoint','codeHash','labels','secretEnvironmentVariablesSha256','service','uri','serviceAccountEmail','ingressSettings'].every(f=>same(reader.after[f],initialReader[f]))&&
      same(writer.after,initialWriter)&&
      F.environmentVariablesSha256===k.baselineEnvironmentSha256&&F.serviceConfigNonRevisionSha256===p.baselineServiceConfigSha256&&
      H.platformBuildChanged===(F.build!==initialReader.build)&&H.platformStorageChanged===!same(F.sourceStorage,initialReader.sourceStorage)&&
      typeof H.currentImage==='string'&&typeof H.deployedImage==='string'&&H.platformImageChanged===(H.currentImage!==H.deployedImage),
      'POST_RESTORATION_FROZEN_TARGETS_OR_METADATA_FACTS_CHANGED');
  }
}
function runPostRestorationGuard(){
  const C=json(k.control);need(C[p.key]&&fs.existsSync(p.receipt),'POST_RESTORATION_AUTHORITY_MISSING');
  const mode=(process.argv.find(v=>v.startsWith('--mode='))||'--mode=governance').slice(7);need(['governance','governance:1','i6'].includes(mode),'MODE_INVALID');
  const m=collectPostRestorationModel(),result=validatePostRestorationModel(m),dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-post-restoration-parent-'));let added=false;
  try{
    execFileSync('git',['worktree','add','--detach',dir,p.parent],{stdio:'pipe',maxBuffer:8*1024*1024});added=true;
    const out=execFileSync(process.execPath,[k.guard],{cwd:dir,env:process.env,encoding:'utf8',maxBuffer:16*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),'POST_RESTORATION_IMMUTABLE_PARENT_GUARD_FAILED');
    console.log('B4_003_INSURER_POST_RESTORATION_PARENT=EXACT_A4_AND_ALL_PRIOR_PROOFS_PASS');
  }finally{if(added)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});else fs.rmSync(dir,{recursive:true,force:true});}
  for(const f of [p.helperTest,k.test])execFileSync(process.execPath,f.endsWith('.mjs')?['--test',f]:[f],{encoding:'utf8',stdio:'pipe',maxBuffer:8*1024*1024});
  validatePostRestorationModel(collectPostRestorationModel());
  console.log('B4_003_INSURER_POST_RESTORATION_CURRENT='+JSON.stringify(result));
  console.log('B4_003_INSURER_ACTIVITY_STATUS='+(m.evidence?.status||p.status));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');console.log('PRODUCT_SOURCE_DRIFT=false');return true;
}
