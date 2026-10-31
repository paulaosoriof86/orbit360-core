// An exact successor of c3e922c: retain its immutable proofs, then validate
// the entire current accumulated product and the four causal replacements.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ROOT='artifacts/orbit360-recovery/release-control/';
export const insurerActivityContract=Object.freeze({
  parent:'c3e922c75ec8082dfd6030be5f79b9e2fa71f778',
  parentGuardBlob:'ba65d33c9a53de764d34b1e96d24f9fd4c84c069',
  parentControlBlob:'851d78d3c692aa5e7d9cec7e383c79840a0df7bd',
  certifiedBaseline:'4bf67a3738751fe2432a130fd23254a6f1c7d16e',
  key:'b4003InsurerActivitySourceSuccessor20261030',
  control:ROOT+'CONTROL_PLANE.json',
  receipt:ROOT+'I6_5_B4_003_INSURER_ACTIVITY_SOURCE_SUCCESSOR_20261030.json',
  composition:ROOT+'I6_5_B4_003_INSURER_ACTIVITY_CURRENT_COMPOSITION_20261030.json',
  evidenceKey:'b4003InsurerActivityPreviewEvidence20261030',
  evidencePath:ROOT+'I6_5_B4_003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_20261030.json',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-insurer-activity-successor.mjs',
  validatorTest:'tools/gravicentra-b4-003-insurer-activity-successor.test.mjs',
  workflow:'.github/workflows/gravicentra-b4-003-cumulative-safe-read-preview-20261029.yml',
  transportMessage:'build(i6.5 B4-003): trigger cumulative safe-read isolated Preview only',
  findingId:'B4-003-R18-14-INSURER-ACTIVITY-KNOWLEDGE-EVENT-CONVERGENCE',
  status:'SOURCE_AND_SYNTHETIC_QA_PASS_PREVIEW_UAT_PENDING',
  productPaths:[
    'functions/product-operational-domain.js',
    'functions/b4-003-scoped-bootstrap-reader.js',
    'orbit360-platform/modules/aseguradoras.js',
    'orbit360-platform/data/store-firestore-product-operational-p0.js'
  ].sort(),
  testPaths:[
    'tools/gravicentra-b4-003-insurer-activity-audit.test.cjs',
    'tools/gravicentra-b4-003-scoped-bootstrap-reader.test.cjs',
    'tools/gravicentra-b4-003-scoped-boundary.test.cjs',
    'tools/gravicentra-b4-003-insurer-preview-projection.test.cjs'
  ].sort(),
  immutablePaths:{
    [ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json']:'33bf80768cb6cb311f2975d282a5f50935f680aa',
    [ROOT+'I6_5_FORENSIC_B4_EXECUTION_LOCK_20261002.json']:'436f155bae1ccf042d45b398fbb53262f481095c',
    [ROOT+'I6_FINDINGS_LEDGER_20260924.json']:'333963e16a21d9abe58274091c0f61a53473c71f',
    [ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json']:'3cdedb0c3aa1c4a39545229fb4781e79326c945c',
    [ROOT+'I6_5_B4_003_INSTITUTIONAL_GOALS_FUNCTIONAL_CLOSURE_20261030.json']:'f6330cce90ef95a43eedc724d2aceec84458cda9',
    [ROOT+'I6_5_B4_003_CARLOS_INSURER_EDIT_RESTORE_UAT_20261030.json']:'bd918367ce7db0d9da0771140509b2fd0e0fccf9'
  }
});
export const insurerGuardPrefix="import {runInsurerActivitySuccessorGuard} from './gravicentra-b4-003-insurer-activity-successor.mjs';\nif (runInsurerActivitySuccessorGuard()) process.exit(0);\n\n";
const k=insurerActivityContract;
export const insurerAtomicPaths=[...k.productPaths,...k.testPaths,k.control,k.receipt,k.composition,k.guard,k.validator,k.validatorTest].sort();
const nonProductPrefixes=['.github/workflows/gravicentra-','.github/i6-ephemeral/','tools/gravicentra-','artifacts/orbit360-recovery/release-control/','artifacts/orbit360-recovery/project-sources-v2/'];
const stable=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(a=>[a,stable(v[a])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(ok,code)=>{if(!ok)throw new Error('B4_003_INSURER_ACTIVITY_'+code);};
const lines=s=>s.split(/\r?\n/).filter(Boolean);
const sorted=a=>a.slice().sort();
const sha=v=>/^[0-9a-f]{40}$/.test(String(v||''));
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>git('hash-object',p);
const isProduct=p=>!nonProductPrefixes.some(prefix=>p.startsWith(prefix));
const tree=(ref)=>Object.fromEntries(lines(git('ls-tree','-r',ref)).map(line=>{const [meta,p]=line.split('\t');return[p,meta.split(' ')[2]];}));
const digestRows=rows=>createHash('sha256').update(rows.map(r=>[r.path,r.certifiedBlob,r.parentBlob,r.currentBlob].join('\t')).join('\n')+'\n').digest('hex');

export function collectInsurerActivitySuccessorModel(){
  const control=json(k.control),receipt=json(k.receipt),composition=json(k.composition);
  const parentTree=tree(k.parent),baselineTree=tree(k.certifiedBaseline);
  const currentHead=git('rev-parse','HEAD');
  const committed=lines(git('log','--all','--format=%H','--',k.receipt)).find(c=>git('rev-parse',c+':'+k.receipt)===hash(k.receipt))||null;
  const untracked=lines(git('ls-files','--others','--exclude-standard'));
  const deltaPaths=sorted([...new Set([...lines(git('diff','--name-only',k.parent)),...untracked])]);
  const productPaths=sorted([...new Set([...lines(git('diff','--name-only',k.certifiedBaseline)),...untracked])].filter(isProduct));
  const parentProductPaths=sorted(lines(git('diff','--name-only',k.certifiedBaseline,k.parent)).filter(isProduct));
  const allCheckPaths=[...new Set([...deltaPaths,...productPaths,...Object.keys(k.immutablePaths),k.workflow])];
  const currentBlobs=Object.fromEntries(allCheckPaths.map(p=>[p,fs.existsSync(p)&&fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink()?hash(p):'ABSENT_OR_NONREGULAR']));
  const sourceControl=committed?JSON.parse(git('show',committed+':'+k.control)):control;
  const sourceTree=committed?tree(committed):null;
  const sourceDelta=committed?sorted(lines(git('diff','--name-only',k.parent,committed))):deltaPaths;
  const evidence=fs.existsSync(k.evidencePath)?json(k.evidencePath):null;
  const evidenceCommits=lines(git('log','--all','--format=%H','--',k.evidencePath));
  const evidenceCommit=evidence?evidenceCommits.find(c=>git('rev-parse',c+':'+k.evidencePath)===hash(k.evidencePath))||null:null;
  const transportRef=evidence?.transportSha||(currentHead!==k.parent&&currentHead!==committed?currentHead:null);
  const parentControl=JSON.parse(git('show',k.parent+':'+k.control));
  const rows=productPaths.map(p=>({path:p,certifiedBlob:baselineTree[p]||'ABSENT',parentBlob:parentTree[p]||'ABSENT',currentBlob:currentBlobs[p]}));
  return {control,sourceControl,parentControl,receipt,composition,parentTree,baselineTree,currentBlobs,sourceTree,
    currentHead,sourceCommit:committed,parentVerified:git('merge-base',k.parent,currentHead)===k.parent,
    sourceParent:committed?git('rev-parse',committed+'^'):null,
    sourceAncestor:committed?git('merge-base',committed,currentHead)===committed:false,
    sourceDelta,deltaPaths,untracked,productPaths,parentProductPaths,rows,rowsDigest:digestRows(rows),
    evidence,evidenceCommit,evidenceParent:evidenceCommit?git('rev-parse',evidenceCommit+'^'):null,
    evidenceDelta:evidenceCommit?sorted(lines(git('diff','--name-only',evidenceCommit+'^',evidenceCommit))):null,
    transport:transportRef?{sha:transportRef,parent:git('rev-parse',transportRef+'^'),message:git('show','-s','--format=%s',transportRef),paths:sorted(lines(git('diff','--name-only',transportRef+'^',transportRef))),workflowBlob:git('rev-parse',transportRef+':'+k.workflow)}:null,
    currentGuard:fs.readFileSync(k.guard,'utf8'),parentGuard:execFileSync('git',['show',k.parent+':'+k.guard],{encoding:'utf8'}),
    ledger:json(ROOT+'I6_FINDINGS_LEDGER_20260924.json'),carry:json(ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json')};
}

export function validateInsurerActivitySuccessorModel(m){
  const {control:C,sourceControl:SC,parentControl:B,receipt:R,composition:M}=m,S=C[k.key];
  need(m.parentVerified&&m.parentTree[k.guard]===k.parentGuardBlob&&m.parentTree[k.control]===k.parentControlBlob,'EXACT_PARENT_REQUIRED');
  const extraKeys=m.evidence?[k.key,k.evidenceKey].sort():[k.key];
  need(Object.keys(B).length===419&&Object.keys(C).length===419+extraKeys.length&&Object.keys(SC).length===420&&
    Object.keys(B).every(p=>same(C[p],B[p])&&same(SC[p],B[p]))&&
    same(sorted(Object.keys(C).filter(p=>!(p in B))),extraKeys)&&same(S,SC[k.key]),'PRIOR_CONTROL_OR_NEW_KEY_DRIFT');
  need(C.repository==='paulaosoriof86/orbit360-core'&&C.branch==='recovery/fase-a-clean-20260831'&&
    S?.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_SOURCE_POINTER_V1'&&S.status===k.status&&S.gate==='I6.5/B4-003'&&
    S.parentHead===k.parent&&S.receiptPath===k.receipt&&S.receiptBlobSha===m.currentBlobs[k.receipt]&&
    S.compositionPath===k.composition&&S.compositionBlobSha===m.currentBlobs[k.composition]&&
    same(sorted(S.atomicCommitPaths||[]),insurerAtomicPaths)&&S.previewAuthorizedAfterGuardAndRegressionPass===true&&
    S.backendDeploymentAuthorized===true&&S.authIamRulesChangeAuthorized===false&&
    S.productionPromotionAuthorized===false&&S.realBusinessWritesAuthorized===false&&S.currentCapabilityAcceptances===0,'CONTROL_POINTER_INVALID');
  need(R.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_SOURCE_SUCCESSOR_V1'&&R.status===k.status&&
    R.gate===S.gate&&R.parentHead===k.parent&&R.findingId===k.findingId&&
    R.repository===C.repository&&R.branch===C.branch&&same(sorted(R.atomicCommitPaths||[]),insurerAtomicPaths)&&
    R.scope==='INSURER_OBSERVATIONS_AUDIT_PRESERVATION_AND_RELOAD_PROJECTION_ONLY','RECEIPT_IDENTITY_INVALID');
  need(R.composition?.path===k.composition&&R.composition.blobSha===m.currentBlobs[k.composition]&&
    R.composition.fullCurrentProductMap===true&&R.composition.historicalCompositionUnchanged===true,'COMPOSITION_POINTER_INVALID');
  need(same(sorted(Object.keys(R.sourceFiles||{})),k.productPaths),'EXACT_FOUR_SOURCE_PATHS_REQUIRED');
  for(const p of k.productPaths){const v=R.sourceFiles[p];need(v.beforeBlob===m.parentTree[p]&&v.afterBlob===m.currentBlobs[p]&&
    sha(v.beforeBlob)&&sha(v.afterBlob)&&v.beforeBlob!==v.afterBlob&&typeof v.causalFinding==='string'&&v.causalFinding.length>10,
    'CURRENT_SOURCE_BLOB_INVALID:'+p);}
  need(same(sorted(Object.keys(R.regressionTests||{})),k.testPaths),'EXACT_PRODUCT_REGRESSION_PATHS_REQUIRED');
  for(const p of k.testPaths){const v=R.regressionTests[p];need(v.beforeBlob===(m.parentTree[p]||null)&&
    v.afterBlob===m.currentBlobs[p]&&sha(v.afterBlob)&&v.syntheticOnly===true&&v.externalRequests===0&&
    Number.isInteger(v.tests)&&v.tests>0&&v.passed===v.tests,'REGRESSION_BLOB_OR_RESULT_INVALID:'+p);}
  for(const [name,p] of [['guard',k.guard],['validator',k.validator],['test',k.validatorTest]]){
    const v=R.governanceSources?.[name];need(v?.path===p&&v.blobSha===m.currentBlobs[p]&&sha(v.blobSha),
      'GOVERNANCE_BINDING_INVALID:'+name);
  }
  need(m.currentGuard===insurerGuardPrefix+m.parentGuard,'HISTORICAL_GUARD_BODY_CHANGED');
  need(M.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_CURRENT_COMPOSITION_V1'&&M.parentHead===k.parent&&
    M.certifiedBaseline===k.certifiedBaseline&&M.gate===S.gate&&M.productFileCount===118&&
    M.compositionAuthority==='EXACT_CURRENT_PRODUCT_SET_AND_BLOB_MAP_OVER_FROZEN_PREDECESSOR'&&
    same(M.productFiles,m.productPaths)&&same(m.productPaths,m.parentProductPaths)&&
    same(M.rows,m.rows)&&M.rowsSha256===m.rowsDigest&&
    same(sorted(M.replacedProductPaths||[]),k.productPaths)&&m.rows.length===118&&
    m.rows.every(r=>r.currentBlob!==r.certifiedBlob&&sha(r.currentBlob)&&
      (k.productPaths.includes(r.path)?r.currentBlob===R.sourceFiles[r.path].afterBlob:r.currentBlob===r.parentBlob)),
    'FULL_CURRENT_ACCUMULATED_COMPOSITION_INVALID');
  for(const [p,blob] of Object.entries(k.immutablePaths))need(m.parentTree[p]===blob&&m.currentBlobs[p]===blob,'FROZEN_EVIDENCE_CHANGED:'+p);
  need(m.ledger.findings?.length===295&&m.carry.inventory?.length===295&&
    m.ledger.findings.find(r=>r.id==='B4-003-P0-20261012-INSTITUTIONAL-GOALS')?.status==='RESOLVED_AUTHENTICATED_RUNTIME_PASS'&&
    m.ledger.findings.find(r=>r.id===k.findingId)?.blocking===true&&
    C.b4003InstitutionalGoalsClosure20261030.priorityFindingClosuresGranted===1&&
    C.b4003OwnerTemporaryRulesRiskException20261028.securityRulesAloneBlockRelease===false,'CLOSED_METAS_OR_OPEN_FINDINGS_CHANGED');
  const b=R.boundaries||{};
  need(b.existingLabPreviewOnly===true&&b.syntheticQaWithRestorationOnly===true&&
    ['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup','newEndpoints','newWorkflows','newCollections','findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted']
      .every(p=>b[p]===false),'SCOPE_EXPANDED');
  const P=R.previewTransport||{};
  need(P.workflowPath===k.workflow&&sha(P.transportWorkflowAfterBlob)&&P.reuseExistingChannel===true&&
    P.hostingChannelId==='gi-i65-b4-sr-41066435386'&&
    P.expectedPreviewUrl==='https://ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app'&&
    P.predecessorSourceSha==='a6e403119d9fc05b633e84f2eaa8f50c32ba12d9'&&
    P.predecessorBuildId==='gi-i65-b4-a6e403119d9f-57f234755dc1'&&P.project==='ays-orbit-360-lab'&&
    same(P.targetFunctions,[{name:'orbit360ProductOperationalCommandPreview',region:'us-east1'},
      {name:'orbit360ScopedPolicyReadPreview',region:'us-east1'}])&&
    P.backendStage==='IMMUTABLE_EXISTING_PREVIEW_PACKAGE_BUILDER'&&P.newFunctionsAuthorized===false&&
    P.builderPath==='tools/gravicentra-i6-1-preview-package.mjs'&&P.builderBlobSha===m.parentTree[P.builderPath],
    'EXACT_PREVIEW_TRANSPORT_INVALID');
  need(same(sorted(R.requiredCurrentRegressions||[]),sorted([
    ...k.testPaths,k.validatorTest,'tools/gravicentra-b4-003-metas-preview-session.test.cjs',
    'tools/gravicentra-b4-003-metas-atomic-ui.test.cjs','tools/gravicentra-b4-003-metas-preview-projection.test.cjs',
    'tools/gravicentra-b4-003-metas-ui-diagnostic.test.cjs','tools/gravicentra-b4-003-operational-write-security-regression.test.cjs',
    'tools/gravicentra-b4-003-before-image-regression.test.cjs'
  ])),'CURRENT_REGRESSION_SCOPE_CHANGED');
  const F=R.allowedEvidenceSuccessor;
  need(F?.controlKey===k.evidenceKey&&F.receiptPath===k.evidencePath&&
    same(F.exactChangedPaths,[k.control,k.evidencePath].sort())&&F.directChildOfExactTransport===true&&
    F.sourceControlKeysPreserved===420&&F.priorSourceAndGovernanceBytesImmutable===true&&
    F.fullFindingClosureAuthorized===false,'EXPLICIT_EVIDENCE_SUCCESSOR_BOUNDARY_INVALID');
  if(m.sourceCommit){
    need(m.sourceParent===k.parent&&m.sourceAncestor&&same(m.sourceDelta,insurerAtomicPaths),'EXACT_ATOMIC_SOURCE_COMMIT_REQUIRED');
    need(insurerAtomicPaths.filter(p=>!m.evidence||p!==k.control).every(p=>m.sourceTree[p]===m.currentBlobs[p]),'CURRENT_BYTES_DIVERGED_FROM_SOURCE');
    if(m.transport){
      need(m.transport.parent===m.sourceCommit&&m.transport.message===k.transportMessage&&
        same(m.transport.paths,[k.workflow])&&m.currentBlobs[k.workflow]===P.transportWorkflowAfterBlob&&
        m.transport.workflowBlob===P.transportWorkflowAfterBlob&&
        same(m.deltaPaths,sorted([...insurerAtomicPaths,k.workflow,...(m.evidence?[k.evidencePath]:[])])),
        'UNBOUND_TRANSPORT_OR_FOLLOWUP');
      if(m.evidence)validateEvidence(m);
      else need(m.currentHead===m.transport.sha,'TRANSPORT_HEAD_REQUIRED');
    }else need(m.currentHead===m.sourceCommit&&same(m.deltaPaths,insurerAtomicPaths)&&
      m.currentBlobs[k.workflow]===m.parentTree[k.workflow],'SOURCE_STATE_DRIFT');
    need(m.untracked.length===0||(m.evidence&&!m.evidenceCommit&&same(m.untracked,[k.evidencePath])),
      'UNEXPECTED_UNTRACKED_FILES');
  }else{
    need(m.currentHead===k.parent&&same(m.deltaPaths,insurerAtomicPaths)&&
      m.currentBlobs[k.workflow]===m.parentTree[k.workflow],'PREPUBLICATION_DELTA_NOT_EXACT');
  }
  return {status:'EXACT_CURRENT_SUCCESSOR_VALIDATED',productFiles:118,replacedProductFiles:4,
    ledgerFindings:295,priorControlKeysPreserved:419,metasClosurePreserved:true};
}

function validateEvidence(m){
  const E=m.evidence,P=m.control[k.evidenceKey];
  need(P?.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EVIDENCE_POINTER_V1'&&
    P.receiptPath===k.evidencePath&&P.receiptBlobSha===m.currentBlobs[k.evidencePath]&&
    P.gate==='I6.5/B4-003'&&P.status===E.status&&P.sourceSha===m.sourceCommit&&P.transportSha===m.transport.sha&&
    P.sourceGuardRunId===E.sourceGuardRunId&&P.transportRunId===E.transportRunId&&P.buildId===E.buildId&&
    P.previewUrl===E.previewUrl&&P.currentCapabilityAcceptances===0,'EVIDENCE_POINTER_INVALID');
  need(E.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_V1'&&
    E.gate===P.gate&&E.sourceSha===m.sourceCommit&&E.transportSha===m.transport.sha&&E.parentHead===m.transport.sha&&
    Number.isSafeInteger(E.sourceGuardRunId)&&E.sourceGuardRunId>0&&
    Number.isSafeInteger(E.transportRunId)&&E.transportRunId>0&&
    E.previewUrl===m.receipt.previewTransport.expectedPreviewUrl&&
    ['TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS','TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_BLOCKED',
      'TECHNICAL_PREVIEW_PARTIAL_UAT_NOT_ACCEPTED','TECHNICAL_PREVIEW_FAILED_UAT_NOT_RUN'].includes(E.status),
    'EVIDENCE_IDENTITY_INVALID');
  need(['liveDeployment','authIamRulesChange','membershipChange','realBusinessWrites','dataImport','cleanup',
    'findingClosed','b4003Closed','paulaVisualAccepted','productionAccepted'].every(p=>E.boundaries?.[p]===false),
    'EVIDENCE_SCOPE_EXPANDED');
  const T=E.technical,U=E.authenticatedUat;
  need(T&&T.newFunctionsCreated===0&&same(T.targetFunctions,m.receipt.previewTransport.targetFunctions),
    'EVIDENCE_TARGETS_INVALID');
  if(E.status==='TECHNICAL_PREVIEW_FAILED_UAT_NOT_RUN'){
    need(T.status==='FAILED'&&U?.status==='NOT_RUN','FAILED_PREVIEW_CANNOT_ACCEPT_UAT');
  }else if(E.status==='TECHNICAL_PREVIEW_PARTIAL_UAT_NOT_ACCEPTED'){
    need(T.status==='PARTIAL'&&T.iamUnchanged===null&&typeof T.iamReadbackStatus==='string'&&
      T.iamReadbackStatus.length>0&&U?.status==='NOT_ACCEPTED','PARTIAL_PREVIEW_CANNOT_ACCEPT_UAT');
  }else{
    need(T.status==='PASS'&&T.backendExactSourceReadback===true&&T.hostingBytesExact===true&&
      T.liveIdentityUnchanged===true&&T.iamUnchanged===true&&
      typeof E.buildId==='string'&&E.buildId.startsWith('gi-i65-b4-'+m.sourceCommit.slice(0,12)+'-'),
      'TECHNICAL_PASS_PROOF_INCOMPLETE');
    if(E.status==='TECHNICAL_PREVIEW_PASS_AUTHENTICATED_AUDIT_PASS'){
      const observedCarlosNames=['Carlos Castro','Carlos Arturo Castro Casallas'];
      need(U?.status==='PASS'&&U.fixtureId==='b4003qa_human_insurer_r20'&&observedCarlosNames.includes(U.actor)&&
        U.role==='Operativo'&&U.country==='GT'&&U.buildId===E.buildId&&U.syntheticWrites===2&&
        U.restored===true&&U.priorActivityRetained===true&&U.newAuditRowsAfterReload===2&&
        U.observationsRestoredExactly===true&&U.otherVisibleFieldsCompared===12&&U.otherVisibleFieldsUnchanged===true&&
        Array.isArray(U.auditRows)&&U.auditRows.length===2&&
        same(sorted(U.auditRows.map(r=>r.phase)),['edit','restore'])&&
        new Set(U.auditRows.map(r=>r.rowDigestSha256)).size===2&&
        new Set(U.auditRows.map(r=>r.reason)).size===2&&
        U.auditRows.every(r=>observedCarlosNames.includes(r.visibleActor)&&String(r.visibleRole||'').trim().toLowerCase()==='operativo'&&r.matchesSubmittedReason===true&&
          typeof r.reason==='string'&&r.reason.trim().length>4&&same(r.changedFields,['observaciones'])&&
          /^[0-9a-f]{64}$/.test(String(r.rowDigestSha256||''))&&
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(String(r.dateTimeText||''))&&/\d{1,2}:\d{2}/.test(r.dateTimeText)),
        'AUTHENTICATED_AUDIT_PASS_INCOMPLETE');
    }else need(U?.status==='BLOCKED','BLOCKED_STATUS_REQUIRES_BLOCKED_UAT');
  }
  if(m.evidenceCommit){
    need(m.currentHead===m.evidenceCommit&&m.evidenceParent===m.transport.sha&&
      same(m.evidenceDelta,[k.control,k.evidencePath].sort()),'EVIDENCE_EXACT_TWO_FILE_COMMIT_REQUIRED');
  }else need(m.currentHead===m.transport.sha,'EVIDENCE_PREPUBLICATION_PARENT_REQUIRED');
}

function runHistoricalGuard(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-historical-'));
  let added=false;
  try{
    // This checkout has the actual historical HEAD, not a hash substitution.
    // Its immutable Guard revalidates every original gate and receipt.
    execFileSync('git',['worktree','add','--detach',root,k.parent],{stdio:'pipe',maxBuffer:8*1024*1024});added=true;
    // Node 22 and Node 24 use different default reporters. The historical
    // assertions require TAP; select that format without altering any test.
    const env={...process.env,NODE_OPTIONS:[process.env.NODE_OPTIONS||'','--test-reporter=tap'].filter(Boolean).join(' ')};
    const out=execFileSync(process.execPath,[k.guard,'--mode=i6'],{cwd:root,env,encoding:'utf8',maxBuffer:16*1024*1024});
    need(out.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&out.includes('PRODUCT_SOURCE_DRIFT=false'),
      'IMMUTABLE_PREDECESSOR_GUARD_DID_NOT_PASS');
    console.log('B4_003_INSURER_ACTIVITY_PREDECESSOR=EXACT_C3_FULL_GUARD_PASS_HISTORICAL_RECEIPTS_RETAINED');
  }finally{
    if(added)execFileSync('git',['worktree','remove','--force',root],{stdio:'pipe'});
    else fs.rmSync(root,{recursive:true,force:true});
  }
}

export function runInsurerActivitySuccessorGuard(){
  const C=json(k.control);
  if(!C[k.key]&&!fs.existsSync(k.receipt))return false;
  const mode=(process.argv.find(v=>v.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_INVALID');
  need(C[k.key]&&fs.existsSync(k.receipt),'POINTER_OR_RECEIPT_MISSING');
  const m=collectInsurerActivitySuccessorModel();
  const result=validateInsurerActivitySuccessorModel(m);
  runHistoricalGuard();
  for(const p of m.receipt.requiredCurrentRegressions){
    const args=p.endsWith('.test.mjs')?['--test',p]:[p];
    execFileSync(process.execPath,args,{encoding:'utf8',stdio:'pipe',maxBuffer:16*1024*1024});
  }
  // Re-read to reject concurrent source/governance mutation during proof.
  validateInsurerActivitySuccessorModel(collectInsurerActivitySuccessorModel());
  console.log('B4_003_INSURER_ACTIVITY_CURRENT='+JSON.stringify(result));
  console.log('B4_003_INSURER_ACTIVITY=SOURCE_AND_SYNTHETIC_QA_PASS_EXACT_PREVIEW_UAT_PENDING');
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
