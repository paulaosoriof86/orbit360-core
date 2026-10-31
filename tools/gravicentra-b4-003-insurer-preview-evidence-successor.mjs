// Protected retrospective technical Preview evidence; no functional or LIVE authority.
// Current predecessor is immutable and verified with its own exact historical guard.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT='artifacts/orbit360-recovery/release-control/';
export const insurerPreviewEvidenceContract=Object.freeze({
  baseHead:'42dc7e6e5648d0bf8da710c791889d54ff2651c7',
  baseControlBlob:'b34414963b1883d32e54c8882340ceda8981d899',
  baseGuardBlob:'33118affeace82d8fca93b12a842e3a2065b3c1e',
  sourceControlBlob:'769d32ec0a90567a920f4178f5f183ca64cebf50',
  evidenceBlob:'e7b858c5360621d05a2427b8fd247f52374ebf05',
  sourceSha:'bcb54435788e1ace50325f347d1d9c0ee4a222e5',
  transportSha:'2cea88d4fd2de841c6e5e81a51a85afdd66f84e6',
  previewRunId:41222963524,
  previewJobId:124601153348,
  artifactId:13050682964,
  artifactSha256:'f1f3c84da0fbf55de5939bd659d2b0aa4e069136f7850878386590f6d34258a5',
  liveArtifactId:13050841951,
  liveArtifactSha256:'c699fd0f891ac82ad626b611a7ea6c5362d39afd087e88a49e1fa3bd0397dfc9',
  buildId:'gi-i65-b4-bcb54435788e-57f234755dc1',
  bundleDigest:'a0638f7d7f5134093275aa4f0c39e6983e0c075033db77af1b4463c91bb6ebf0',
  backendSourceDigest:'75be18bd0c56cc29c8786207a4bd0358221c06308be9a776000b6b893acfc012',
  hostedPayloadDigest:'6f7615bd187dbfce6c15340f5db9332fe672b38380130396cb01cfde975ad217',
  key:'b4003InsurerActivityPreviewEvidence20261030',
  control:ROOT+'CONTROL_PLANE.json',
  evidence:ROOT+'I6_5_B4_003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_20261030.json',
  guardReceipt:ROOT+'I6_5_B4_003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_GUARD_SUCCESSOR_20261031.json',
  guard:'tools/gravicentra-i6-control-plane-guard-v1.mjs',
  validator:'tools/gravicentra-b4-003-insurer-preview-evidence-successor.mjs',
  test:'tools/gravicentra-b4-003-insurer-preview-evidence-successor.test.mjs',
  ledger:ROOT+'I6_FINDINGS_LEDGER_20260924.json',
  carry:ROOT+'I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json',
  composition:ROOT+'I6_CANONICAL_ACCUMULATIVE_COMPOSITION_LOCK_20260924.json',
  master:ROOT+'I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json'
});
const k=insurerPreviewEvidenceContract;
export const insurerPreviewEvidenceSourcePaths=[k.control,k.evidence].sort();
export const insurerPreviewEvidenceGuardPaths=[k.guard,k.guardReceipt,k.validator,k.test].sort();
export const insurerPreviewEvidenceGuardPrefix=
  "import {runInsurerPreviewEvidenceGuard} from './gravicentra-b4-003-insurer-preview-evidence-successor.mjs';\n"+
  "if (runInsurerPreviewEvidenceGuard()) process.exit(0);\n\n";

const fail=code=>{throw Error('B4_003_INSURER_PREVIEW_EVIDENCE_'+code);};
const need=(ok,code)=>{if(!ok)fail(code);};
const sha=x=>/^[0-9a-f]{40}$/.test(String(x||''));
const sha256=x=>/^[0-9a-f]{64}$/.test(String(x||''));
const stable=x=>x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(stable):
  Object.fromEntries(Object.keys(x).sort().map(name=>[name,stable(x[name])]));
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const sortedLines=x=>String(x||'').split(/\r?\n/).filter(Boolean).sort();
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const show=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8',maxBuffer:64*1024*1024});
const blob=(ref,file)=>git('rev-parse',ref+':'+file);
const hash=file=>git('hash-object',file);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));

export function validateInsurerPreviewEvidenceData({before,current,receipt,guardReceipt,
  evidenceBlob,sourceControlBlob,baseControlBlob,baseGuardBlob,
  guardBlob,validatorBlob,testBlob,ledgerBlob,carryBlob,compositionBlob,masterBlob}) {
  need(Object.keys(before).length===427&&Object.keys(current).length===428,
    'CONTROL_KEY_COUNTS_INVALID');
  need(Object.keys(before).every(name=>same(before[name],current[name]))&&
    same(Object.keys(current).filter(name=>!(name in before)),[k.key]),
    'FROZEN_CONTROL_CHANGED');
  const p=current[k.key],t=receipt.technicalPreview||{},e=receipt.artifactEvidence||{};
  need(p?.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_POINTER_V1'&&
    p.status==='TECHNICAL_EXACT_PREVIEW_PASS_SCOPED_UAT_SEPARATE_B4_003_HOLD'&&
    p.recordType==='ADDITIVE_RETROSPECTIVE_PROTECTED_TECHNICAL_EVIDENCE'&&
    p.parentHead===k.baseHead&&p.sourceCommit===k.sourceSha&&p.transportCommit===k.transportSha&&
    p.previewRunId===k.previewRunId&&p.gate==='I6.5/B4-003'&&
    p.receiptPath===k.evidence&&p.receiptBlobSha===evidenceBlob&&
    sourceControlBlob===k.sourceControlBlob&&evidenceBlob===k.evidenceBlob&&
    p.previousControlKeysPreserved===427&&p.technicalPreviewPass===true&&
    p.authenticatedUatFullyAccepted===false&&p.fullInsurerCapabilityAccepted===false&&
    p.findingClosed===false&&p.b4003Closed===false&&p.productionAccepted===false&&
    p.newReleaseAuthority===false,'CONTROL_POINTER_INVALID');
  need(receipt.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_RETROSPECTIVE_V1'&&
    receipt.status===p.status&&receipt.repository===current.repository&&
    receipt.branch===current.branch&&receipt.gate===p.gate&&
    receipt.parentControlHead===k.baseHead&&receipt.parentControlBlob===k.baseControlBlob&&
    receipt.sourceCommit===k.sourceSha&&receipt.transportCommit===k.transportSha&&
    receipt.recordType==='ADDITIVE_PROTECTED_TECHNICAL_READBACK_NO_RELEASE_AUTHORITY'&&
    receipt.authorization===p.authorization&&
    receipt.recordedDate==='2026-10-31','EVIDENCE_IDENTITY_INVALID');
  need(t.runId===k.previewRunId&&t.jobId===k.previewJobId&&t.conclusion==='success'&&
    t.resultSchema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_EXACT_BACKEND_HOSTING_PREVIEW_RESULT_V1'&&
    t.resultStatus==='TECHNICAL_EXACT_BACKEND_HOSTING_READBACK_PASS_AUTHENTICATED_UAT_PENDING'&&
    t.sourceGuardRunId===41150390700&&
    t.buildId===k.buildId&&t.bundleDigest===k.bundleDigest&&
    t.backendSourceDigest===k.backendSourceDigest&&
    t.hostedPayloadDigest===k.hostedPayloadDigest&&
    sha256(t.bundleDigest)&&sha256(t.backendSourceDigest)&&sha256(t.hostedPayloadDigest)&&
    t.backendSourceComparisons===66&&t.backendSourceContentUnchanged===true&&
    t.sourceBytesProofCompleted===true&&t.operationResponseBindsCurrent===true&&
    t.knownOperationDone===true&&t.previewChannelReused===true&&t.hostingRebuilt===false&&
    t.backendCodeRedeployed===false&&t.liveDeployment===false&&t.liveFunctionsDeployed===false&&
    t.rulesAuthIamMutationRequested===false&&t.businessDataWrites===0&&
    t.syntheticWrites===0&&t.currentCapabilityAcceptances===0,
    'PREVIEW_TECHNICAL_PROOF_INVALID');
  need(e.combinedPreviewArtifactId===k.artifactId&&
    e.combinedPreviewZipSha256===k.artifactSha256&&e.combinedPreviewZipBytes===36739&&
    e.combinedPreviewZipDigestIndependentlyChecked===true&&
    e.combinedPreviewArchiveEntryCount===12&&
    e.liveIdentityArtifactId===k.liveArtifactId&&
    e.liveIdentityZipSha256===k.liveArtifactSha256&&e.liveIdentityZipBytes===4641&&
    e.liveIdentityEvidenceBasis==='WORKFLOW_PASS_AND_GITHUB_ARTIFACT_METADATA_NOT_ZIP_CONTENT_READ'&&
    e.historicalSubreadbackStatus==='EXPECTED_METADATA_PASS_SOURCE_BYTES_PENDING'&&
    e.historicalSubreadbackSourceBytesProofCompleted===false&&
    e.finalProofComesFromCombinedPreviewResult===true,
    'ARTIFACT_EVIDENCE_SCOPE_INVALID');
  const human=receipt.humanEvidence||{},limits=receipt.boundaries||{};
  need(human.fullInsurerCapabilityAccepted===false&&human.findingClosed===false&&
    human.b4003Closed===false&&human.formalI6ProgressPercent===50&&
    human.priorityP0Closed===1&&human.priorityP0Total===6&&
    human.globalImplementationPercent===null&&
    ['functionalCodeChange','backendDeployment','productionPromotion','authIamRulesChange',
      'businessDataMutation','newEndpoint','newWorkflow','cleanup','findingClosure',
      'gateClosure','newReleaseAuthority','sourceProofBypass'].every(x=>limits[x]===false),
    'SCOPE_OR_GATE_EXPANDED');
  need(guardReceipt.schema==='GRAVICENTRA_I65_B4003_INSURER_ACTIVITY_PREVIEW_EVIDENCE_GUARD_SUCCESSOR_V1'&&
    guardReceipt.status==='EXACT_RETROSPECTIVE_TECHNICAL_READBACK_PROTECTED'&&
    guardReceipt.baseHead===k.baseHead&&guardReceipt.baseControlBlob===baseControlBlob&&
    guardReceipt.baseGuardBlob===baseGuardBlob&&
    guardReceipt.sourceControlBlob===sourceControlBlob&&
    guardReceipt.evidenceBlob===evidenceBlob&&
    same(guardReceipt.sourcePaths,insurerPreviewEvidenceSourcePaths)&&
    same(guardReceipt.guardPaths,insurerPreviewEvidenceGuardPaths)&&
    guardReceipt.governanceBlobs?.[k.guard]===guardBlob&&
    guardReceipt.governanceBlobs?.[k.validator]===validatorBlob&&
    guardReceipt.governanceBlobs?.[k.test]===testBlob&&
    guardReceipt.frozenBlobs?.[k.ledger]===ledgerBlob&&
    guardReceipt.frozenBlobs?.[k.carry]===carryBlob&&
    guardReceipt.frozenBlobs?.[k.composition]===compositionBlob&&
    guardReceipt.frozenBlobs?.[k.master]===masterBlob&&
    guardReceipt.currentFormalI6Percent===50&&
    guardReceipt.currentP0Closed===1&&guardReceipt.currentP0Total===6&&
    guardReceipt.newReleaseAuthority===false&&
    ['functionalCodeChange','backendDeployment','productionPromotion','authIamRulesChange',
      'businessDataMutation','newEndpoint','newWorkflow','cleanup','findingClosure',
      'gateClosure','newReleaseAuthority','sourceProofBypass'].every(
        x=>guardReceipt.boundaries?.[x]===false),
    'GUARD_RECEIPT_INVALID');
  need(sha(baseControlBlob)&&sha(baseGuardBlob)&&sha(sourceControlBlob)&&
    sha(evidenceBlob)&&sha(guardBlob)&&sha(validatorBlob)&&sha(testBlob)&&
    [ledgerBlob,carryBlob,compositionBlob,masterBlob].every(sha),
    'PHYSICAL_GIT_BLOB_INVALID');
  return {technicalPreviewReadback:'PASS',backendSourceComparisons:66,priorControlKeys:427,
    currentControlKeys:428,formalI6Percent:50,p0Closed:1,p0Total:6,
    clientEditorChanged:false,productionAccepted:false,capabilityClosed:false};
}

function validatePhysicalSuccessor() {
  const head=git('rev-parse','HEAD'),source=git('rev-parse','HEAD^');
  need(head!==source&&git('rev-parse','HEAD^^')===k.baseHead&&
    git('merge-base',k.baseHead,head)===k.baseHead,'EXACT_TWO_COMMIT_LINEAGE_REQUIRED');
  need(same(sortedLines(git('diff','--name-only',k.baseHead,source)),insurerPreviewEvidenceSourcePaths)&&
    same(sortedLines(git('diff','--name-only',source,head)),insurerPreviewEvidenceGuardPaths),
    'EXACT_DOCUMENT_AND_GUARD_DELTAS_REQUIRED');
  need(blob(k.baseHead,k.control)===k.baseControlBlob&&
    blob(k.baseHead,k.guard)===k.baseGuardBlob&&
    blob(source,k.guard)===k.baseGuardBlob&&
    fs.readFileSync(k.guard,'utf8')===insurerPreviewEvidenceGuardPrefix+show(source,k.guard),
    'FROZEN_GUARD_CHANGED');
  const before=JSON.parse(show(k.baseHead,k.control));
  const current=json(k.control),receipt=json(k.evidence),guardReceipt=json(k.guardReceipt);
  const sourceControlBlob=blob(source,k.control),evidenceBlob=hash(k.evidence);
  need(blob(source,k.evidence)===evidenceBlob&&
    sourceControlBlob===hash(k.control)&&
    blob(source,k.control)===hash(k.control),'DOCUMENT_SOURCE_BYTES_CHANGED');
  const frozen=[k.ledger,k.carry,k.composition,k.master];
  for(const file of frozen)need(blob(k.baseHead,file)===hash(file)&&
    blob(source,file)===hash(file),'FROZEN_EVIDENCE_CHANGED:'+file);
  const result=validateInsurerPreviewEvidenceData({before,current,receipt,guardReceipt,
    evidenceBlob,sourceControlBlob,baseControlBlob:k.baseControlBlob,
    baseGuardBlob:k.baseGuardBlob,guardBlob:hash(k.guard),
    validatorBlob:hash(k.validator),testBlob:hash(k.test),
    ledgerBlob:hash(k.ledger),carryBlob:hash(k.carry),
    compositionBlob:hash(k.composition),masterBlob:hash(k.master)});
  need(!sortedLines(git('ls-files','--others','--exclude-standard')).length,
    'UNTRACKED_FILES_FORBIDDEN');
  return result;
}

function verifyFrozenPredecessor() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gi-insurer-preview-evidence-parent-'));
  let attached=false;
  try {
    execFileSync('git',['worktree','add','--detach',dir,k.baseHead],{stdio:'pipe'});
    attached=true;
    const output=execFileSync(process.execPath,[k.guard,'--mode=governance'],
      {cwd:dir,encoding:'utf8',maxBuffer:24*1024*1024});
    need(output.includes('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS')&&
      output.includes('PRODUCT_SOURCE_DRIFT=false'),'FROZEN_PREDECESSOR_GUARD_FAILED');
  } finally {
    if(attached)execFileSync('git',['worktree','remove','--force',dir],{stdio:'pipe'});
    else fs.rmSync(dir,{recursive:true,force:true});
  }
}

export function runInsurerPreviewEvidenceGuard() {
  const control=json(k.control);
  if(!control[k.key]&&!fs.existsSync(k.evidence)&&!fs.existsSync(k.guardReceipt))return false;
  need(control[k.key]&&fs.existsSync(k.evidence)&&fs.existsSync(k.guardReceipt),
    'POINTER_AND_BOTH_RECEIPTS_REQUIRED');
  const mode=(process.argv.find(x=>x.startsWith('--mode='))||'--mode=governance').slice(7);
  need(['governance','governance:1','i6'].includes(mode),'MODE_NOT_AUTHORIZED');
  const result=validatePhysicalSuccessor();
  verifyFrozenPredecessor();
  execFileSync(process.execPath,['--test',k.test],{stdio:'pipe',maxBuffer:16*1024*1024});
  validatePhysicalSuccessor();
  console.log('B4_003_INSURER_PREVIEW_EVIDENCE='+JSON.stringify(result));
  console.log('GRAVICENTRA_I6_CONTROL_PLANE_GUARD=PASS');
  console.log('PRODUCT_SOURCE_DRIFT=false');
  return true;
}
