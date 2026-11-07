#!/usr/bin/env node
/**
 * Draft: exact Hosting version promotion in the existing B4 executor.
 * Dormant until formal exact Preview acceptance, CP authorization, version IDs,
 * fresh read-only Preview preflight, a pinned immutable rollback certificate
 * with current metadata equality, and canonical-head lease all pass.
 * The only product mutations are release POSTs selecting already FINALIZED
 * versions in the existing LIVE channel and a conditional certified rollback.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';

const env=process.env;
const out=path.resolve(env.B4_PREFLIGHT_OUT || '');
const receipt={schema:'B4_003_EXACT_HOSTING_PROMOTION_V1',status:'NOT_STARTED',
  startedAtUtc:new Date().toISOString(),runnerCommit:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
  promotionAttempted:false,rollbackAttempted:false,b4003Closed:['current42-frontend-20261107','policy-capture-20261107'].includes(env.B4_CAUSAL_FRONTEND_SUCCESSOR),
  formalLiveAcceptanceGranted:false,functionsDeployed:0,rulesChanged:false,
  authConfigurationChanged:false,dataWrites:0};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=code=>{throw new Error(code);};
const requireValue=(condition,code)=>{if(!condition)fail(code);};
const exact=(actual,want,code)=>requireValue(actual===want,code);
const requiredEnv=name=>{const v=String(env[name]||'').trim();requireValue(v,'MISSING_ENV_'+name);return v;};
const writeJson=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const safeCode=e=>String(e?.message || 'PROMOTION_ERROR').replace(/[^A-Z0-9_.:-]/gi,'_').slice(0,180);
const persist=()=>writeJson('promotion.json',receipt);
let rollbackPin={versionName:'sites/ays-orbit-360-lab/versions/5d35a2bd0b326e75',
  sourceSha:'4bf67a3738751fe2432a130fd23254a6f1c7d16e',
  buildId:'gi-i65-4bf67a373875-57f234755dc1',fileCount:209,
  digest:'84a74f46498618ca36c142ff844dbfe670df5a64501a1ceca22d5cd069e62767'};
const certificatePin={
  receiptPath:'artifacts/orbit360-recovery/release-control/I6_5_B4_003_RETAINED_ROLLBACK_CERTIFIED_20261107.json',
  receiptBlobSha:'7ba72ca211a9bb2771932f0b5ff95e6857732f9e',
  receiptSha256:'9865d0b2a6dd760a4eb33839a09f330538dce3695c4804d6086421cc70d311c1',
  runId:42320351982,jobId:128243139551,
  runnerCommit:'2d695e72947a9cfa7881f1209a345fb0c9b6a9d5',
  controlBlobSha:'a1e8e48620ffe8f32380a5eb079b06e6c4ae26bb',
  controlSha256:'54af5942dfb679358f603e49813e0ca14930a67600a20bedbbbcc9a98c69e044',
  artifactId:13552453265,
  artifactZipSha256:'0cb605b43c14a695f55a7aa523610459d465a2a16a0946b463e9764b0bae8274'};
const managedInitPaths=['__/firebase/init.js','__/firebase/init.json'];
let binding,authClient,proof,cp,cursor,expectedPreview,expectedRollback,expectedLive;
let causal=null,rollbackCertified;
let releaseAuthClient,releaseAuthClientFactory;
let productionUrl,sentinelOrigins,sentinelsBefore;

// Explicit causal successor mode. The closed current42 acceptance is immutable;
// a new operation cursor supplies only the new artifact and focal Preview seal.
function causalSuccessorContext(control,activeCursor,requireAuthorization=false){
  if(env.B4_CAUSAL_FRONTEND_SUCCESSOR==='policy-capture-20261107')return policyCaptureSuccessorContext(control,activeCursor,requireAuthorization);
  if(!env.B4_CAUSAL_FRONTEND_SUCCESSOR)return null;
  exact(env.B4_CAUSAL_FRONTEND_SUCCESSOR,'current42-frontend-20261107','CAUSAL_MODE_INVALID');
  exact(env.B4_CURSOR_KEY,'b4003CausalFrontendSuccessor20261107','CAUSAL_CURSOR_INVALID');
  const contractPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_CURRENT42_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
  const blob=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  const contractBytes=fs.readFileSync(contractPath);
  exact(blob(contractBytes),'c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f','CAUSAL_CONTRACT_BLOB_CHANGED');
  const contract=JSON.parse(contractBytes);
  const old=control.b4003ActiveCertificationCursor20261106;
  const seal=old?.formalLiveAcceptance;
  requireValue(old?.b4003Closed===true&&seal?.b4003Closed===true,'CURRENT42_ACCEPTANCE_REOPENED');
  exact(seal.status,'LATEST_APPROVED_VERSION_LIVE_PASS','CURRENT42_LIVE_SEAL_NOT_PASS');
  exact(seal.sourceSha,contract.rollback.sourceSha,'CURRENT42_SOURCE_CHANGED');
  exact(seal.buildId,contract.rollback.buildId,'CURRENT42_BUILD_CHANGED');
  exact(Number(seal.artifactId),contract.rollback.artifactId,'CURRENT42_ARTIFACT_CHANGED');
  exact(seal.hostingVersion,contract.rollback.versionName,'CURRENT42_VERSION_CHANGED');
  exact(Number(seal.productFiles),contract.rollback.productFiles,'CURRENT42_COUNT_CHANGED');
  exact(seal.hostedPayloadDigest,contract.rollback.hostedPayloadDigest,'CURRENT42_DIGEST_CHANGED');
  exact(seal.receiptBlobSha,contract.preservedAcceptance.receiptBlobSha,'CURRENT42_SEAL_BLOB_CHANGED');
  exact(blob(fs.readFileSync(seal.receiptPath)),contract.preservedAcceptance.receiptBlobSha,'CURRENT42_SEAL_FILE_CHANGED');
  exact(activeCursor?.schema,'GRAVICENTRA_B4_003_CAUSAL_FRONTEND_SUCCESSOR_CURSOR_V1','CAUSAL_CURSOR_SCHEMA');
  exact(activeCursor.preservedAcceptancePointer,'/b4003ActiveCertificationCursor20261106/formalLiveAcceptance','CAUSAL_PARENT_POINTER');
  exact(activeCursor.sourceContractPath,contractPath,'CAUSAL_SOURCE_CONTRACT_PATH');
  exact(activeCursor.sourceContractBlobSha,'c792b7db1aa3f16ed7ee20cbdffe2b76dc61b97f','CAUSAL_SOURCE_CONTRACT_PIN');
  requireValue(activeCursor.b4003Closed===true&&activeCursor.b4003HistoricalAcceptancePreserved===true&&activeCursor.nextGateExecuted===false,'CAUSAL_CLOSED_B4_REQUIRED');
  requireValue(activeCursor.activeSourceSha!==seal.sourceSha&&Number(activeCursor.activeImmutableArtifactId)!==Number(seal.artifactId),'CAUSAL_CANDIDATE_NOT_NEW');
  requireValue(['EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING','FRONTEND_SUCCESSOR_FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING','FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED'].includes(activeCursor.status),'CAUSAL_CURSOR_STATUS');
  if(requireAuthorization){
    exact(activeCursor.status,'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED','CAUSAL_FOCAL_PREVIEW_NOT_ACCEPTED');
    exact(activeCursor.productionPromotionAuthorized,true,'CAUSAL_PROMOTION_NOT_AUTHORIZED');
    exact(activeCursor.focalAuthenticatedAcceptance?.status,'PASS','CAUSAL_AUTHENTICATED_UAT_NOT_PASS');
    exact(activeCursor.focalAuthenticatedAcceptance?.sourceSha,activeCursor.activeSourceSha,'CAUSAL_UAT_SOURCE_MISMATCH');
    exact(Number(activeCursor.focalAuthenticatedAcceptance?.artifactId),Number(activeCursor.activeImmutableArtifactId),'CAUSAL_UAT_ARTIFACT_MISMATCH');
    requireValue(Array.isArray(activeCursor.focalAuthenticatedAcceptance?.evidencePaths)&&activeCursor.focalAuthenticatedAcceptance.evidencePaths.length>0,'CAUSAL_UAT_EVIDENCE_REQUIRED');
    for(const p of activeCursor.focalAuthenticatedAcceptance.evidencePaths)requireValue(typeof p==='string'&&p.startsWith('artifacts/orbit360-recovery/release-control/')&&!p.includes('..')&&fs.existsSync(p),'CAUSAL_UAT_EVIDENCE_MISSING');
  }
  const rawPath='artifacts/orbit360-recovery/release-control/I6_5_B4_003_RETAINED_HOSTING_LIVE_PROMOTED_20261107.json';
  const rawBytes=fs.readFileSync(rawPath);
  exact(blob(rawBytes),'3e07e1e21192e878af668d03d077c8368837024c','CURRENT42_RAW_CERTIFICATE_CHANGED');
  const raw=JSON.parse(rawBytes),r=contract.rollback;
  exact(raw.schema,'B4_003_RETAINED_HOSTING_LIVE_PROMOTION_DURABLE_CERTIFICATE_BUNDLE_V1','CURRENT42_RAW_SCHEMA');
  exact(raw.liveVersionName,r.versionName,'CURRENT42_RAW_VERSION');
  exact(raw.productSourceSha,r.sourceSha,'CURRENT42_RAW_SOURCE');
  exact(raw.productBuildId,r.buildId,'CURRENT42_RAW_BUILD');
  exact(raw.liveRawDigest,r.hostedPayloadDigest,'CURRENT42_RAW_DIGEST');
  exact(raw.liveRawProductFiles,r.productFiles,'CURRENT42_RAW_COUNT');
  requireValue(raw.liveRawFiles.every(x=>x.status===200&&x.exact===true),'CURRENT42_RAW_BYTES_NOT_EXACT');
  const rows=raw.liveRawFiles.map(x=>({path:x.path,sha256:x.sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const text=rows.map(x=>x.sha256+'  '+x.path).join('\n')+'\n';
  exact(rows.length,r.productFiles,'CURRENT42_RAW_ROW_COUNT');
  exact(sha(text),r.hostedPayloadDigest,'CURRENT42_RAW_MANIFEST_CHANGED');
  return {contract,seal,raw,rawPath,rawBlobSha:'3e07e1e21192e878af668d03d077c8368837024c',
    manifest:{rows,text,fileCount:rows.length,digest:sha(text)},
    pin:{versionName:r.versionName,sourceSha:r.sourceSha,buildId:r.buildId,fileCount:r.productFiles,digest:r.hostedPayloadDigest},
    certified:{sourceSha:r.sourceSha,buildId:r.buildId,previewChannelId:'live',previewUrl:'https://ays-orbit-360-lab.web.app',productionUrl:'https://ays-orbit-360-lab.web.app',hostedFileCount:r.productFiles,hostedPayloadDigest:r.hostedPayloadDigest}};
}

// Bounded successor within the existing retained-version release lane.
// The two preceding certificates remain immutable; rollback selects e503 bytes only.
function policyCaptureSuccessorContext(control,activeCursor,requireAuthorization=false){
  exact(env.B4_CAUSAL_FRONTEND_SUCCESSOR,'policy-capture-20261107','CAPTURE_MODE_INVALID');
  exact(env.B4_CURSOR_KEY,'b4004PolicyCaptureFrontendSuccessor20261107','CAPTURE_CURSOR_INVALID');
  const contractPath='artifacts/orbit360-recovery/release-control/I6_5_B4_004_POLICY_CAPTURE_CAUSAL_FRONTEND_SUCCESSOR_CONTRACT_20261107.json';
  const blob=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  const contractBytes=fs.readFileSync(contractPath);
  exact(blob(contractBytes),'985c1444446e21f17f1eb6462131304e0c6cc413','CAPTURE_CONTRACT_BLOB_CHANGED');
  const contract=JSON.parse(contractBytes),p=contract.preservedAcceptance,r=contract.rollback;
  exact(contract.sourceBaseHead,'932ccaca0a808b2b4ae577c0a3a27fa80220dbe5','CAPTURE_SOURCE_BASE_CHANGED');
  requireValue(contract.scope.b4003Reopened===false&&contract.scope.backendFunctionDeploys===0&&contract.scope.rulesWrites===0&&contract.scope.businessWrites===0&&contract.scope.authIamChanges===0,'CAPTURE_CONTRACT_SCOPE_CHANGED');
  const old=control.b4003ActiveCertificationCursor20261106,seal=old?.formalLiveAcceptance;
  requireValue(old?.b4003Closed===true&&seal?.b4003Closed===true,'CAPTURE_CURRENT42_REOPENED');
  exact(seal.status,'LATEST_APPROVED_VERSION_LIVE_PASS','CAPTURE_CURRENT42_SEAL_STATUS');
  exact(seal.sourceSha,p.sourceSha,'CAPTURE_CURRENT42_SOURCE_CHANGED');
  exact(seal.buildId,p.buildId,'CAPTURE_CURRENT42_BUILD_CHANGED');
  exact(Number(seal.artifactId),p.artifactId,'CAPTURE_CURRENT42_ARTIFACT_CHANGED');
  exact(seal.receiptBlobSha,p.receiptBlobSha,'CAPTURE_CURRENT42_SEAL_PIN_CHANGED');
  const sealBytes=fs.readFileSync(seal.receiptPath);
  exact(blob(sealBytes),p.receiptBlobSha,'CAPTURE_CURRENT42_SEAL_FILE_CHANGED');
  exact(sha(sealBytes),seal.receiptSha256,'CAPTURE_CURRENT42_SEAL_SHA256_CHANGED');
  const sealedReceipt=JSON.parse(sealBytes);
  for(const key of ['sourceSha','buildId','artifactId','hostingVersion','hostedPayloadDigest','productFiles'])
    exact(seal[key],sealedReceipt.release[key],'CAPTURE_CURRENT42_SEAL_CHANGED_'+key);
  const historicalPromotion=sealedReceipt.evidence.promotion;
  const historicalPromotionBytes=fs.readFileSync(historicalPromotion.path);
  exact(blob(historicalPromotionBytes),historicalPromotion.blobSha,'CAPTURE_CURRENT42_PROMOTION_FILE_CHANGED');
  exact(seal.artifactTarDigest,JSON.parse(historicalPromotionBytes).productArchiveSha256,'CAPTURE_CURRENT42_TAR_CHANGED');
  const prior=control.b4003CausalFrontendSuccessor20261107;
  requireValue(prior?.b4003Closed===true&&prior?.b4003HistoricalAcceptancePreserved===true&&prior?.productionPromotionAuthorized===false,'CAPTURE_E503_PARENT_STATE_CHANGED');
  exact(prior.status,'FRONTEND_SUCCESSOR_LIVE_BYTES_PASS_FOCAL_LIVE_PENDING','CAPTURE_E503_PARENT_STATUS_CHANGED');
  exact(prior.activeSourceSha,r.sourceSha,'CAPTURE_E503_SOURCE_CHANGED');
  exact(prior.activeBuildId,r.buildId,'CAPTURE_E503_BUILD_CHANGED');
  exact(Number(prior.activeImmutableArtifactId),r.artifactId,'CAPTURE_E503_ARTIFACT_CHANGED');
  const priorBytes=fs.readFileSync(r.receiptPath);
  exact(blob(priorBytes),r.receiptBlobSha,'CAPTURE_E503_PROMOTION_RECEIPT_CHANGED');
  const promoted=JSON.parse(priorBytes);
  exact(promoted.status,'EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING','CAPTURE_E503_PROMOTION_STATUS');
  requireValue(promoted.promotionAttempted===true&&promoted.rollbackAttempted===false&&promoted.dataWrites===0&&promoted.functionsDeployed===0&&promoted.rulesChanged===false,'CAPTURE_E503_PROMOTION_SCOPE');
  exact(promoted.binding.sourceSha,r.sourceSha,'CAPTURE_E503_PROMOTED_SOURCE');
  exact(promoted.binding.buildId,r.buildId,'CAPTURE_E503_PROMOTED_BUILD');
  exact(Number(promoted.binding.artifactId),r.artifactId,'CAPTURE_E503_PROMOTED_ARTIFACT');
  exact(promoted.liveAfter.channel.versionName,r.versionName,'CAPTURE_E503_PROMOTED_VERSION');
  exact(promoted.liveAfter.hostedPayloadDigest,r.hostedPayloadDigest,'CAPTURE_E503_PROMOTED_DIGEST');
  exact(promoted.liveAfter.hostedFileCount,r.productFiles,'CAPTURE_E503_PROMOTED_COUNT');
  exact(activeCursor?.schema,'GRAVICENTRA_B4_004_POLICY_CAPTURE_SUCCESSOR_CURSOR_V1','CAPTURE_CURSOR_SCHEMA');
  exact(activeCursor.preservedAcceptancePointer,'/b4003ActiveCertificationCursor20261106/formalLiveAcceptance','CAPTURE_CURRENT42_POINTER');
  exact(activeCursor.preservedPriorSuccessorPointer,'/b4003CausalFrontendSuccessor20261107','CAPTURE_E503_POINTER');
  exact(activeCursor.sourceContractPath,contractPath,'CAPTURE_CONTRACT_PATH');
  exact(activeCursor.sourceContractBlobSha,'985c1444446e21f17f1eb6462131304e0c6cc413','CAPTURE_CONTRACT_PIN');
  requireValue(activeCursor.b4003Closed===true&&activeCursor.b4003HistoricalAcceptancePreserved===true&&activeCursor.nextGateAccepted===false,'CAPTURE_ACCEPTANCE_BOUNDARY');
  requireValue(![seal.sourceSha,r.sourceSha].includes(activeCursor.activeSourceSha)&&![Number(seal.artifactId),r.artifactId].includes(Number(activeCursor.activeImmutableArtifactId)),'CAPTURE_CANDIDATE_NOT_NEW');
  requireValue(['EXACT_PREVIEW_TRANSPORT_PASS_FOCAL_UAT_PENDING','FRONTEND_SUCCESSOR_FOCAL_PREVIEW_PASS_PREFLIGHT_PENDING','FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED'].includes(activeCursor.status),'CAPTURE_CURSOR_STATUS');
  const artifactProofs=Object.entries(activeCursor).filter(([k,v])=>/^immutableSuccessor\d+PreviewReadback/.test(k)&&v&&v.sourceSha===activeCursor.activeSourceSha&&Number(v.artifactId)===Number(activeCursor.activeImmutableArtifactId));
  exact(artifactProofs.length,1,'CAPTURE_QA_ARTIFACT_PROOF_COUNT');
  const artifactProof=artifactProofs[0][1];
  for(const key of ['artifactZipSha256','archiveSha256','hostedPayloadDigest'])
    requireValue(/^[a-f0-9]{64}$/.test(artifactProof[key]),'CAPTURE_QA_PROOF_DIGEST_INVALID_'+key);
  // The first read-only preflight discovers Hosting's actual retained version.
  // A release requires that observation to have been frozen into this proof.
  const previewVersionKnown=typeof artifactProof.versionName==='string'&&/^sites\/ays-orbit-360-lab\/versions\/[A-Za-z0-9_-]+$/.test(artifactProof.versionName);
  if(artifactProof.versionName!=null)requireValue(previewVersionKnown,'CAPTURE_PREVIEW_VERSION_INVALID');
  if(activeCursor.productionPromotionAuthorized===true)requireValue(previewVersionKnown,'CAPTURE_PREVIEW_VERSION_PIN_REQUIRED');
  if(requireAuthorization){
    requireValue(previewVersionKnown,'CAPTURE_PREVIEW_VERSION_PIN_REQUIRED');
    exact(activeCursor.status,'FRONTEND_SUCCESSOR_PREVIEW_ACCEPTED_PROMOTION_AUTHORIZED','CAPTURE_PREVIEW_NOT_ACCEPTED');
    exact(activeCursor.productionPromotionAuthorized,true,'CAPTURE_PROMOTION_NOT_AUTHORIZED');
    const a=activeCursor.focalAuthenticatedAcceptance;
    exact(a?.status,'PASS','CAPTURE_AUTHENTICATED_UAT_NOT_PASS');
    exact(a.sourceSha,activeCursor.activeSourceSha,'CAPTURE_UAT_SOURCE_MISMATCH');
    exact(a.buildId,activeCursor.activeBuildId,'CAPTURE_UAT_BUILD_MISMATCH');
    exact(Number(a.artifactId),Number(activeCursor.activeImmutableArtifactId),'CAPTURE_UAT_ARTIFACT_MISMATCH');
    requireValue(Array.isArray(a.evidencePins)&&a.evidencePins.length>0,'CAPTURE_UAT_EVIDENCE_REQUIRED');
    let focalProofs=0;
    for(const item of a.evidencePins){
      requireValue(typeof item.path==='string'&&item.path.startsWith('artifacts/orbit360-recovery/release-control/')&&!item.path.includes('..')&&/^[a-f0-9]{40}$/.test(item.blobSha),'CAPTURE_UAT_EVIDENCE_PATH');
      const evidenceBytes=fs.readFileSync(item.path);
      exact(blob(evidenceBytes),item.blobSha,'CAPTURE_UAT_EVIDENCE_CHANGED');
      const q=JSON.parse(evidenceBytes);
      if(q.schema==='GRAVICENTRA_B4_004_POLICY_CAPTURE_FOCAL_PREVIEW_QA_V1'){
        focalProofs++;
        exact(q.status,'FOCAL_AUTHENTICATED_UI_PASS','CAPTURE_QA_STATUS');
        exact(q.artifact.sourceSha,activeCursor.activeSourceSha,'CAPTURE_QA_SOURCE');
        exact(q.artifact.buildId,activeCursor.activeBuildId,'CAPTURE_QA_BUILD');
        exact(Number(q.artifact.artifactId),Number(activeCursor.activeImmutableArtifactId),'CAPTURE_QA_ARTIFACT');
        for(const key of ['artifactZipSha256','archiveSha256','hostedPayloadDigest']){
          requireValue(/^[a-f0-9]{64}$/.test(q.artifact[key]),'CAPTURE_QA_DIGEST_INVALID_'+key);
          exact(q.artifact[key],artifactProof[key],'CAPTURE_QA_DIGEST_'+key);
        }
        requireValue(q.businessWrites===0&&q.authAccountsCreated===0&&q.membershipWrites===0&&q.syntheticFinalAbsent===true,'CAPTURE_QA_WRITE_SCOPE');
        requireValue(Array.isArray(q.errors)&&q.errors.length===0,'CAPTURE_QA_ERRORS');
        exact(q.cleanup.method,'EXACT_PREDECLARED_IDS_AND_CAPTURED_SERVER_RECEIPTS','CAPTURE_QA_CLEANUP_METHOD');
        exact(q.cleanup.compareAndDeleteTransaction,true,'CAPTURE_QA_CLEANUP_TRANSACTION');
        requireValue(Array.isArray(q.sourceOwners)&&q.sourceOwners.length===contract.productChanges.length&&contract.productChanges.every(e=>q.sourceOwners.some(o=>o.path===e.path&&o.blobSha===e.afterBlobSha)),'CAPTURE_QA_OWNER_BYTES');
        const requiredAssertions=['exactArtifactBeforeWrites','originalAbsenceVerified','advisorCommissionAndScopedAudit','clientFormAndAtomicActivity','policyFormAtomicBatchAndDerivedClientState','receiptEditFormAndAtomicPortfolioActivity','freshProductReloadWithoutAdapter'];
        requireValue(q.assertions&&Object.keys(q.assertions).length===requiredAssertions.length&&requiredAssertions.every(k=>q.assertions[k]===true),'CAPTURE_QA_ASSERTIONS');
      }
    }
    exact(focalProofs,1,'CAPTURE_QA_EXACT_PROOF_REQUIRED');
    requireValue(a.realBusinessWrites===0&&a.exactSyntheticCleanupVerified===true&&a.syntheticIdentityAdaptationDeclared===true,'CAPTURE_UAT_SCOPE_UNPROVEN');
  }
  const rawPath='artifacts/orbit360-recovery/release-control/I6_5_B4_004_E503_ROLLBACK_DURABLE_CERTIFICATE_20261107.json';
  const rawBytes=fs.readFileSync(rawPath);
  exact(blob(rawBytes),'541b1560c18607e523fb3ae99ddd1d762476fb93','CAPTURE_E503_RAW_CERTIFICATE_CHANGED');
  const raw=JSON.parse(rawBytes);
  exact(raw.schema,'B4_003_RETAINED_HOSTING_LIVE_PROMOTION_DURABLE_CERTIFICATE_BUNDLE_V1','CAPTURE_E503_RAW_SCHEMA');
  exact(raw.liveVersionName,r.versionName,'CAPTURE_E503_RAW_VERSION');
  exact(raw.productSourceSha,r.sourceSha,'CAPTURE_E503_RAW_SOURCE');
  exact(raw.productBuildId,r.buildId,'CAPTURE_E503_RAW_BUILD');
  exact(raw.liveRawDigest,r.hostedPayloadDigest,'CAPTURE_E503_RAW_DIGEST');
  exact(raw.liveRawProductFiles,r.productFiles,'CAPTURE_E503_RAW_COUNT');
  exact(String(raw.runId),String(promoted.runId),'CAPTURE_E503_RAW_RUN');
  exact(raw.runnerCommit,promoted.runnerCommit,'CAPTURE_E503_RAW_RUNNER');
  requireValue(raw.liveRawFiles.every(x=>x.status===200&&x.exact===true),'CAPTURE_E503_RAW_BYTES_NOT_EXACT');
  const rows=raw.liveRawFiles.map(x=>({path:x.path,sha256:x.sha256})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  requireValue(new Set(rows.map(x=>x.path)).size===rows.length,'CAPTURE_E503_RAW_DUPLICATE_PATH');
  const text=rows.map(x=>x.sha256+'  '+x.path).join('\n')+'\n';
  exact(rows.length,r.productFiles,'CAPTURE_E503_RAW_ROW_COUNT');
  exact(sha(text),r.hostedPayloadDigest,'CAPTURE_E503_RAW_MANIFEST_CHANGED');
  return {contract,seal,artifactProof,raw,rawPath,rawBlobSha:'541b1560c18607e523fb3ae99ddd1d762476fb93',
    manifest:{rows,text,fileCount:rows.length,digest:sha(text)},
    pin:{versionName:r.versionName,sourceSha:r.sourceSha,buildId:r.buildId,fileCount:r.productFiles,digest:r.hostedPayloadDigest},
    certified:{sourceSha:r.sourceSha,buildId:r.buildId,previewChannelId:'live',previewUrl:'https://ays-orbit-360-lab.web.app',productionUrl:'https://ays-orbit-360-lab.web.app',hostedFileCount:r.productFiles,hostedPayloadDigest:r.hostedPayloadDigest}};
}

function policyCapturePayloadBinding(artifactProof,manifest){
  requireValue(/^[a-f0-9]{64}$/.test(artifactProof?.hostedPayloadDigest),'CAPTURE_PAYLOAD_PROOF_INVALID');
  requireValue(/^[a-f0-9]{64}$/.test(manifest?.digest),'CAPTURE_COMPUTED_PAYLOAD_INVALID');
  exact(artifactProof.hostedPayloadDigest,manifest.digest,'CAPTURE_PAYLOAD_BYTES_MISMATCH');
}

function relativePath(value){
  requireValue(typeof value==='string','HOSTING_PATH_NOT_STRING');
  const result=value.startsWith('/')?value.slice(1):value;
  requireValue(result && !result.startsWith('/') && !result.includes('\\') &&
    !result.includes('\n') && !result.includes('\r') &&
    result.split('/').every(p=>p && p!=='.' && p!=='..'),'HOSTING_PATH_INVALID');
  return result;
}
function hostingFileContract(version,files,manifest){
  // Same exact transport boundary as the retained preflight: all product paths
  // plus precisely these two Firebase-managed SDK auto-configuration resources.
  // https://firebase.google.com/docs/hosting/reserved-urls#sdk_auto-configuration
  const paths=files.map(r=>r.path),retainedPaths=manifest.rows.map(r=>r.path);
  const metadataFileCount=Number(version.fileCount);
  requireValue(Number.isSafeInteger(metadataFileCount) && metadataFileCount>0,'HOSTING_METADATA_FILE_COUNT_INVALID');
  exact(metadataFileCount,files.length,'HOSTING_METADATA_LIST_COUNT_MISMATCH');
  exact(new Set(paths).size,paths.length,'HOSTING_DUPLICATE_PATH');
  exact(manifest.fileCount,retainedPaths.length,'HOSTING_RETAINED_COUNT_MISMATCH');
  exact(new Set(retainedPaths).size,retainedPaths.length,'HOSTING_DUPLICATE_RETAINED_PATH');
  requireValue(files.every(r=>r.status==='ACTIVE'),'HOSTING_FILE_NOT_ACTIVE');
  requireValue(retainedPaths.every(p=>!managedInitPaths.includes(p)),'HOSTING_RETAINED_MANAGED_INIT_COLLISION');
  const managedInitFiles=files.filter(r=>managedInitPaths.includes(r.path));
  const productFiles=files.filter(r=>!managedInitPaths.includes(r.path));
  exact(JSON.stringify(managedInitFiles.map(r=>r.path).sort()),JSON.stringify(managedInitPaths),'HOSTING_MANAGED_INIT_PATH_SET_MISMATCH');
  exact(productFiles.length,manifest.fileCount,'HOSTING_PRODUCT_FILE_COUNT_MISMATCH');
  exact(JSON.stringify(productFiles.map(r=>r.path).sort()),JSON.stringify([...retainedPaths].sort()),'HOSTING_PRODUCT_PATH_SET_MISMATCH');
  return {productFiles,managedInitFiles,metadataFileCount,listedFileCount:files.length,
    retainedProductFileCount:manifest.fileCount,managedInitFileCount:managedInitFiles.length,
    managedInitPaths,productManifestDigest:manifest.digest,anyOtherPathExcluded:false};
}
function releaseOrigins(certifiedProductionUrl,observedOrigins){
  // The preflight's other origin is a stability sentinel, not another release
  // destination. Do not infer a custom-domain mapping from a shared project.
  exact(certifiedProductionUrl,'https://ays-orbit-360-lab.web.app','CANONICAL_PRODUCTION_URL_MISMATCH');
  exact(JSON.stringify(observedOrigins),JSON.stringify([
    'https://ays-orbit-360-lab.web.app','https://app.aysseguros.com'
  ]),'PREFLIGHT_ORIGIN_SET_MISMATCH');
  return {productionUrl:certifiedProductionUrl,
    sentinelOrigins:observedOrigins.filter(base=>base!==certifiedProductionUrl)};
}
async function publicRead(base,rel,nonce){
  const origin=new URL(base).origin;
  const url=base.replace(/\/$/,'')+'/'+rel.split('/').map(encodeURIComponent).join('/')+
    '?b4retained='+encodeURIComponent(nonce);
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{
        headers:{'Accept-Encoding':'identity','Cache-Control':'no-cache, no-store','Pragma':'no-cache'},
        redirect:'follow',signal:AbortSignal.timeout(20000)
      });
      requireValue(new URL(response.url).origin===origin,'PUBLIC_READ_REDIRECTED_ORIGIN');
      const bytes=Buffer.from(await response.arrayBuffer());
      if(response.status>=500 && attempt<2)continue;
      return {status:response.status,sha256:sha(bytes),byteCount:bytes.length,bytes};
    }catch(e){
      if(attempt===2)throw new Error('PUBLIC_READ_FAILED:'+rel);
    }
  }
  fail('PUBLIC_READ_FAILED:'+rel);
}
async function readManifest(base,paths,expectedRows,label,nonce,expectedDigest){
  const rows=new Array(paths.length);
  const deadline=Date.now()+180000;
  const expected=expectedRows?new Map(expectedRows.map(r=>[r.path,r.sha256])):null;
  let marker;
  let lastBad=[];
  let lastDigest;
  for(let attempt=1;attempt<=3;attempt++){
    // Preview retries only discrepant paths. For rollback only the complete
    // certified digest is known, so a retry must reconstruct its full manifest.
    const indices=paths.map((_,i)=>i).filter(i=>!expected || !rows[i]?.exact);
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(8,indices.length)},async()=>{
      while(true){
        const slot=cursor++;
        if(slot>=indices.length)return;
        const i=indices[slot],rel=paths[i];
        if(Date.now()>=deadline){rows[i]={path:rel,status:'READ_DEADLINE',exact:false};continue;}
        try{
          const response=await publicRead(base,rel,nonce+'-attempt-'+attempt);
          const want=expected?.get(rel);
          rows[i]={path:rel,status:response.status,sha256:response.sha256,
            byteCount:response.byteCount,...(want?{expectedSha256:want}:{}),
            exact:response.status===200 && (!expected || response.sha256===want)};
          if(rel==='__recovery__/build.json' && response.status===200){
            try{
              const parsed=JSON.parse(response.bytes.toString('utf8'));
              marker={sourceSha:parsed.sourceSha,buildId:parsed.buildId,gate:parsed.gate};
            }catch{marker={parseError:true};}
          }
        }catch{
          rows[i]={path:rel,status:'READ_ERROR',exact:false};
        }
      }
    }));
    const ordered=[...rows].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
    lastBad=ordered.filter(r=>!r.exact);
    const text=ordered.filter(r=>r.status===200).map(r=>r.sha256+'  '+r.path).join('\n')+'\n';
    lastDigest=sha(text);
    writeJson(label+'-attempt-'+attempt+'-files.json',ordered);
    writeJson(label+'-files.json',ordered);
    fs.writeFileSync(path.join(out,label+'-manifest.sha256'),text);
    if(lastBad.length===0 && lastDigest===expectedDigest){
      return {fileCount:ordered.length,digest:lastDigest,marker,attempts:attempt,
        manifestFile:label+'-manifest.sha256',filesEvidence:label+'-files.json'};
    }
    if(Date.now()>=deadline)break;
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,1500));
  }
  if(lastBad.length)fail(label.toUpperCase()+'_BYTES_MISMATCH_'+lastBad.length);
  fail(label.toUpperCase()+'_MANIFEST_DIGEST_MISMATCH');
}
const apiRoot='https://firebasehosting.googleapis.com/v1beta1/';
async function hostingGet(resource,query={}){
  // Fixed host, fixed API prefix, GET only; no arbitrary outbound URL is accepted.
  requireValue(/^(projects\/-\/sites\/[a-z0-9-]+\/channels\/[a-z0-9-]+|sites\/[a-z0-9-]+\/versions\/[A-Za-z0-9_-]+(?:\/files)?)$/.test(resource),
    'HOSTING_RESOURCE_OUTSIDE_READ_ALLOWLIST');
  const url=new URL(apiRoot+resource);
  for(const [k,v] of Object.entries(query))url.searchParams.set(k,String(v));
  try{
    const response=await authClient.request({url:url.toString(),method:'GET',timeout:30000,retry:false});
    return response.data;
  }catch(e){
    // Never serialize gaxios config, request headers, credentials or tokens.
    throw new Error('HOSTING_GET_'+String(e?.response?.status || e?.code || 'ERROR')+':'+resource);
  }
}
function normalizeVersionResource(raw){
  let name=raw;
  const qualified=typeof raw==='string'?/^projects\/([^/]+)\/(sites\/([^/]+)\/versions\/[A-Za-z0-9_-]+)$/.exec(raw):null;
  if(qualified){
    exact(qualified[1],'646761409743','HOSTING_VERSION_PROJECT_MISMATCH');
    exact(qualified[3],binding.site,'HOSTING_VERSION_SITE_MISMATCH');
    name=qualified[2];
  }
  requireValue(typeof name==='string' &&
    new RegExp('^sites/'+binding.site+'/versions/[A-Za-z0-9_-]+$').test(name),'HOSTING_VERSION_NAME_MISSING_OR_WRONG_SITE');
  return name;
}
function normalizedChannelName(channel){
  const raw=channel?.name;
  requireValue(typeof raw==='string','HOSTING_CHANNEL_NAME_MISSING');
  const name=raw.replace(/^projects\/646761409743\//,'');
  requireValue(new RegExp('^sites/'+binding.site+'/channels/[a-z0-9-]+$').test(name),
    'HOSTING_CHANNEL_PROJECT_OR_SITE_MISMATCH');
  return name;
}
async function getChannel(id){
  const channel=await hostingGet('projects/-/sites/'+binding.site+'/channels/'+id);
  exact(normalizedChannelName(channel),'sites/'+binding.site+'/channels/'+id,'HOSTING_CHANNEL_ID_MISMATCH');
  return channel;
}
function versionName(channel){
  normalizedChannelName(channel);
  return normalizeVersionResource(channel?.release?.version?.name);
}
function compactChannel(channel){
  return {name:channel.name,url:channel.url,versionName:versionName(channel),
    releaseName:channel.release?.name,releaseTime:channel.release?.releaseTime,
    expireTime:channel.expireTime || null};
}
async function listFiles(version){
  const rows=[],seenTokens=new Set();
  let token='';
  do{
    const page=await hostingGet(version+'/files',{status:'ACTIVE',pageSize:1000,...(token?{pageToken:token}:{})});
    requireValue(Array.isArray(page.files),'HOSTING_FILES_RESPONSE_INVALID');
    for(const file of page.files){
      requireValue(file.status==='ACTIVE','HOSTING_FILE_NOT_ACTIVE');
      rows.push({path:relativePath(file.path),hostingHash:file.hash,status:file.status});
    }
    token=page.nextPageToken || '';
    requireValue(!token || !seenTokens.has(token),'HOSTING_FILES_PAGINATION_LOOP');
    if(token)seenTokens.add(token);
    requireValue(rows.length<=20000,'HOSTING_FILES_UNEXPECTED_COUNT');
  }while(token);
  rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  exact(new Set(rows.map(r=>r.path)).size,rows.length,'HOSTING_DUPLICATE_PATH');
  return rows;
}

function readRows(file){
  const text=fs.readFileSync(path.join(out,file),'utf8');
  const rows=text.trimEnd().split('\n').map(line=>{
    const match=/^([a-f0-9]{64})  (.+)$/.exec(line);
    requireValue(match,'INVALID_RETAINED_MANIFEST');
    return {sha256:match[1],path:relativePath(match[2])};
  });
  exact(new Set(rows.map(r=>r.path)).size,rows.length,'RETAINED_MANIFEST_DUPLICATE_PATH');
  requireValue(rows.some(r=>r.path==='__recovery__/build.json'),'RETAINED_MANIFEST_MARKER_MISSING');
  return {rows,fileCount:rows.length,digest:sha(text)};
}
function requireRollbackRawProof(check,manifest,rawFiles,origin){
  // Physical proof belongs to the independently pinned certification run.
  // A current API listing alone never replaces that raw-byte certificate.
  exact(check?.status,'PASS','ROLLBACK_RAW_PROOF_NOT_PASS');
  const evidence=check?.evidence;
  requireValue(evidence && typeof evidence==='object','ROLLBACK_RAW_EVIDENCE_MISSING');
  exact(normalizeVersionResource(evidence.versionName),rollbackPin.versionName,'ROLLBACK_RAW_VERSION_MISMATCH');
  exact(Number(evidence.fileCount),rollbackPin.fileCount,'ROLLBACK_RAW_FILE_COUNT_MISMATCH');
  exact(evidence.digest,rollbackPin.digest,'ROLLBACK_RAW_DIGEST_MISMATCH');
  exact(evidence.certifiedSourceSha,rollbackPin.sourceSha,'ROLLBACK_RAW_CERTIFIED_SOURCE_MISMATCH');
  exact(evidence.certifiedBuildId,rollbackPin.buildId,'ROLLBACK_RAW_CERTIFIED_BUILD_MISMATCH');
  exact(evidence.marker?.sourceSha,rollbackPin.sourceSha,'ROLLBACK_RAW_MARKER_SOURCE_MISMATCH');
  exact(evidence.marker?.buildId,rollbackPin.buildId,'ROLLBACK_RAW_MARKER_BUILD_MISMATCH');
  exact(evidence.rawPayloadDigestVerified,true,'ROLLBACK_RAW_PAYLOAD_NOT_VERIFIED');
  exact(evidence.sourceIdentityVerified,true,'ROLLBACK_RAW_SOURCE_NOT_VERIFIED');
  exact(evidence.preview42RestoredVerified,true,'PREVIEW42_RESTORE_NOT_VERIFIED');
  exact(evidence.liveUnchanged,true,'LIVE_CHANGED_DURING_ROLLBACK_PROOF');
  exact(String(evidence.runId),String(origin?.runId),'ROLLBACK_RAW_CERTIFICATE_RUN_MISMATCH');
  exact(evidence.runnerCommit,origin?.runnerCommit,'ROLLBACK_RAW_CERTIFICATE_RUNNER_MISMATCH');
  exact(evidence.manifestFile,'rollback-manifest.sha256','ROLLBACK_RAW_MANIFEST_FILE_MISMATCH');
  exact(evidence.filesEvidence,'rollback-files.json','ROLLBACK_RAW_FILES_EVIDENCE_MISMATCH');
  exact(manifest.digest,rollbackPin.digest,'ROLLBACK_LOCAL_MANIFEST_DIGEST_MISMATCH');
  exact(manifest.fileCount,rollbackPin.fileCount,'ROLLBACK_LOCAL_MANIFEST_COUNT_MISMATCH');
  requireValue(Array.isArray(rawFiles),'ROLLBACK_RAW_FILES_INVALID');
  exact(rawFiles.length,rollbackPin.fileCount,'ROLLBACK_RAW_FILES_COUNT_MISMATCH');
  exact(new Set(rawFiles.map(r=>r.path)).size,rawFiles.length,'ROLLBACK_RAW_DUPLICATE_PATH');
  const expected=new Map(manifest.rows.map(r=>[r.path,r.sha256]));
  requireValue(rawFiles.every(r=>r.status===200 && r.exact===true &&
    expected.has(r.path) && r.sha256===expected.get(r.path)),'ROLLBACK_RAW_HTTP_OR_BYTES_NOT_EXACT');
  return {versionName:rollbackPin.versionName,fileCount:manifest.fileCount,digest:manifest.digest,
    sourceSha:evidence.marker.sourceSha,buildId:evidence.marker.buildId,runId:evidence.runId,
    runnerCommit:evidence.runnerCommit,rawPayloadDigestVerified:true,sourceIdentityVerified:true,
    preview42RestoredVerified:true,liveUnchanged:true,manifestFile:evidence.manifestFile,
    filesEvidence:evidence.filesEvidence};
}
async function sentinelSnapshot(nonce){
  const origins=[];
  for(const base of sentinelOrigins){
    const probes=[];
    for(const rel of ['index.html','__recovery__/build.json']){
      const response=await publicRead(base,rel,nonce);
      probes.push({path:rel,status:response.status,sha256:response.sha256,byteCount:response.byteCount});
    }
    origins.push({base,probes});
  }
  return origins;
}
function sameSentinels(actual,expected,code){
  // An error response can be a preserved sentinel; it is never a LIVE health PASS.
  const compact=origins=>origins.map(o=>({base:o.base,probes:o.probes.map(r=>({
    path:r.path,status:r.status,sha256:r.sha256,byteCount:r.byteCount}))}));
  exact(JSON.stringify(compact(actual)),JSON.stringify(compact(expected)),code);
}
function stableJson(value){
  const canonical=v=>Array.isArray(v)?v.map(canonical):v && typeof v==='object'?
    Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  return JSON.stringify(canonical(value));
}
function rawManifestFromCertificate(files,label){
  requireValue(Array.isArray(files) && files.length>0,label+'_RAW_FILES_MISSING');
  requireValue(files.every(r=>r.status===200 && r.exact===true && /^[a-f0-9]{64}$/.test(r.sha256)),
    label+'_RAW_HTTP_OR_HASH_INVALID');
  const rows=files.map(r=>({path:relativePath(r.path),sha256:r.sha256}))
    .sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  exact(new Set(rows.map(r=>r.path)).size,rows.length,label+'_RAW_DUPLICATE_PATH');
  requireValue(rows.some(r=>r.path==='__recovery__/build.json'),label+'_RAW_MARKER_MISSING');
  const text=rows.map(r=>r.sha256+'  '+r.path).join('\n')+'\n';
  return {rows,fileCount:rows.length,text,digest:sha(text)};
}
function versionIdentity(version){
  exact(version?.status,'FINALIZED','RETAINED_VERSION_NOT_FINALIZED');
  requireValue(typeof version.config==='object' && version.config!==null,'RETAINED_VERSION_CONFIG_MISSING');
  requireValue(typeof version.createTime==='string' && typeof version.finalizeTime==='string',
    'RETAINED_VERSION_TIMESTAMPS_MISSING');
  return {name:normalizeVersionResource(version.name),status:version.status,config:version.config,
    createTime:version.createTime,finalizeTime:version.finalizeTime,
    fileCount:Number(version.fileCount),versionBytes:String(version.versionBytes)};
}
function hostingFileIdentity(files){
  requireValue(Array.isArray(files),'RETAINED_HOSTING_FILES_MISSING');
  const rows=files.map(r=>({path:relativePath(r.path),hostingHash:r.hostingHash,status:r.status}))
    .sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  requireValue(rows.every(r=>r.status==='ACTIVE' && /^[a-f0-9]{64}$/.test(r.hostingHash)),
    'RETAINED_HOSTING_HASH_OR_STATUS_INVALID');
  exact(new Set(rows.map(r=>r.path)).size,rows.length,'RETAINED_HOSTING_DUPLICATE_PATH');
  return rows;
}
function readPinnedRollbackCertificate(activeCursor){
  const reference=activeCursor.retainedRollbackCertified20261107;
  requireValue(reference && typeof reference==='object','RETAINED_ROLLBACK_CP_PIN_MISSING');
  exact(reference.status,'RETAINED_ROLLBACK_RAW_CERTIFIED_PREVIEW_42_RESTORED_LIVE_UNCHANGED','RETAINED_ROLLBACK_CP_STATUS_MISMATCH');
  for(const [key,want]of Object.entries(certificatePin))exact(reference[key],want,'RETAINED_ROLLBACK_CP_PIN_MISMATCH_'+key);
  exact(reference.rollbackVersionName,rollbackPin.versionName,'RETAINED_ROLLBACK_CP_VERSION_MISMATCH');
  exact(reference.rollbackSourceSha,rollbackPin.sourceSha,'RETAINED_ROLLBACK_CP_SOURCE_MISMATCH');
  exact(reference.rollbackBuildId,rollbackPin.buildId,'RETAINED_ROLLBACK_CP_BUILD_MISMATCH');
  exact(reference.rollbackRawProductFiles,rollbackPin.fileCount,'RETAINED_ROLLBACK_CP_COUNT_MISMATCH');
  exact(reference.rollbackRawDigest,rollbackPin.digest,'RETAINED_ROLLBACK_CP_DIGEST_MISMATCH');
  exact(reference.rollbackHostingTotalFiles,211,'RETAINED_ROLLBACK_CP_HOSTING_COUNT_MISMATCH');
  for(const key of ['preview42RestoredVerified','independentRestoreStepPass','liveUnchanged'])
    exact(reference[key],true,'RETAINED_ROLLBACK_CP_REQUIRED_'+key);
  const bytes=fs.readFileSync(reference.receiptPath);
  exact(sha(bytes),reference.receiptSha256,'RETAINED_ROLLBACK_BUNDLE_SHA256_MISMATCH');
  const gitBlob=crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
  exact(gitBlob,reference.receiptBlobSha,'RETAINED_ROLLBACK_BUNDLE_GIT_BLOB_MISMATCH');
  const bundle=JSON.parse(bytes);
  exact(bundle.schema,'B4_003_RETAINED_ROLLBACK_DURABLE_CERTIFICATE_BUNDLE_V1','RETAINED_ROLLBACK_BUNDLE_SCHEMA_MISMATCH');
  exact(bundle.status,reference.status,'RETAINED_ROLLBACK_BUNDLE_STATUS_MISMATCH');
  for(const key of ['runId','jobId','runnerCommit','controlBlobSha','controlSha256','artifactId','artifactZipSha256'])
    exact(bundle[key],reference[key],'RETAINED_ROLLBACK_BUNDLE_ORIGIN_MISMATCH_'+key);
  const certificate=bundle.rollbackCertification,original=bundle.readOnlyPreflight;
  exact(certificate?.schema,'B4_003_RETAINED_ROLLBACK_TEMPORARY_PREVIEW_CERTIFICATION_V1','RETAINED_CERTIFICATE_SCHEMA_MISMATCH');
  exact(certificate?.status,reference.status,'RETAINED_CERTIFICATE_STATUS_MISMATCH');
  for(const key of ['runId','runnerCommit']){
    exact(String(certificate[key]),String(reference[key]),'RETAINED_CERTIFICATE_ORIGIN_MISMATCH_'+key);
    exact(String(original?.[key]),String(reference[key]),'RETAINED_PREFLIGHT_ORIGIN_MISMATCH_'+key);
  }
  exact(certificate.controlSha256,reference.controlSha256,'RETAINED_CERTIFICATE_ORIGINAL_CP_MISMATCH');
  exact(original.control?.sha256,reference.controlSha256,'RETAINED_PREFLIGHT_ORIGINAL_CP_MISMATCH');
  exact(original.control?.blobSha,reference.controlBlobSha,'RETAINED_PREFLIGHT_ORIGINAL_CP_BLOB_MISMATCH');
  exact(original.control?.recordedPromotionAuthorization,false,'RETAINED_CERTIFICATE_SCOPE_WAS_NOT_PREVIEW_ONLY');
  for(const key of ['rollbackCertified','preview42RestoredVerified','liveUnchanged'])
    exact(certificate[key],true,'RETAINED_CERTIFICATE_REQUIRED_'+key);
  const manifest=rawManifestFromCertificate(bundle.rollbackRawFiles,'ROLLBACK');
  const rawProof=requireRollbackRawProof(certificate.check,manifest,bundle.rollbackRawFiles,reference);
  const observation=bundle.rollbackVersionObservation;
  exact(normalizeVersionResource(observation?.version?.name),rollbackPin.versionName,'RETAINED_OBSERVED_VERSION_MISMATCH');
  const version=versionIdentity(observation.version),files=hostingFileIdentity(observation.files);
  hostingFileContract(observation.version,files,manifest);
  const restored=rawManifestFromCertificate(bundle.restoredPreviewRawFiles,'RESTORED_PREVIEW');
  const restoration=certificate.restoration,independent=bundle.independentRestoration;
  exact(restored.fileCount,reference.previewRawProductFiles,'RETAINED_RESTORE_COUNT_MISMATCH');
  exact(restored.digest,reference.previewRawDigest,'RETAINED_RESTORE_DIGEST_MISMATCH');
  for(const record of [restoration,independent]){
    exact(record?.versionName,reference.previewVersionName,'RETAINED_RESTORE_VERSION_MISMATCH');
    exact(record?.digest,restored.digest,'RETAINED_RESTORE_RECORD_DIGEST_MISMATCH');
    exact(record?.fileCount,restored.fileCount,'RETAINED_RESTORE_RECORD_COUNT_MISMATCH');
    exact(record?.marker?.sourceSha,reference.previewSourceSha,'RETAINED_RESTORE_SOURCE_MISMATCH');
    exact(record?.marker?.buildId,reference.previewBuildId,'RETAINED_RESTORE_BUILD_MISMATCH');
    for(const key of ['rawPayloadDigestVerified','preview42RestoredVerified','liveUnchanged'])
      exact(record?.[key],true,'RETAINED_RESTORE_REQUIRED_'+key);
  }
  exact(independent.status,'EXACT_PREVIEW_42_RESTORED_AND_LIVE_UNCHANGED','RETAINED_INDEPENDENT_RESTORE_NOT_PASS');
  exact(String(independent.runId),String(reference.runId),'RETAINED_INDEPENDENT_RESTORE_RUN_MISMATCH');
  exact(independent.runnerCommit,reference.runnerCommit,'RETAINED_INDEPENDENT_RESTORE_RUNNER_MISMATCH');
  return {reference,certificate,original,manifest,rawProof,version,files,restored};
}

function readCurrent42RollbackCertificate(){
  const check=proof.checks.find(c=>c.name==='certified_rollback_version_and_all_served_bytes');
  exact(check?.status,'PASS','CURRENT42_FRESH_ROLLBACK_PREFLIGHT_REQUIRED');
  const e=check.evidence;
  exact(e.versionName,causal.pin.versionName,'CURRENT42_FRESH_VERSION');
  exact(e.digest,causal.pin.digest,'CURRENT42_FRESH_DIGEST');
  exact(e.fileCount,causal.pin.fileCount,'CURRENT42_FRESH_COUNT');
  exact(e.marker?.sourceSha,causal.pin.sourceSha,'CURRENT42_FRESH_SOURCE');
  exact(e.marker?.buildId,causal.pin.buildId,'CURRENT42_FRESH_BUILD');
  requireValue(e.rawPayloadDigestVerified===true&&e.rawBytesReadInThisRun===true,'CURRENT42_FRESH_RAW_READ_REQUIRED');
  const manifest=readRows('rollback-manifest.sha256');
  exact(manifest.digest,causal.manifest.digest,'CURRENT42_FRESH_MANIFEST_CHANGED');
  const rawFiles=JSON.parse(fs.readFileSync(path.join(out,'rollback-files.json'),'utf8'));
  const fresh=rawManifestFromCertificate(rawFiles,'CURRENT42_FRESH');
  exact(fresh.digest,causal.manifest.digest,'CURRENT42_FRESH_FILES_CHANGED');
  const observed=JSON.parse(fs.readFileSync(path.join(out,'rollback-hosting-version.json'),'utf8'));
  const historical=causal.raw.liveHostingObservation;
  exact(stableJson(versionIdentity(observed.version)),stableJson(versionIdentity(historical.version)),'CURRENT42_VERSION_METADATA_CHANGED');
  exact(stableJson(hostingFileIdentity(observed.files)),stableJson(hostingFileIdentity(historical.files)),'CURRENT42_HOSTING_PATH_HASH_CHANGED');
  const reference={receiptPath:causal.rawPath,receiptBlobSha:causal.rawBlobSha,runId:causal.raw.runId,
    runnerCommit:causal.raw.runnerCommit,controlSha256:causal.raw.controlSha256,
    previewVersionName:expectedPreview,previewSourceSha:binding.sourceSha,previewBuildId:binding.buildId};
  return {reference,manifest:{...manifest,text:causal.manifest.text},
    rawProof:{...e,rawPayloadDigestVerified:true,currentReadRunId:proof.runId,currentReadRunnerCommit:proof.runnerCommit},
    version:versionIdentity(historical.version),files:hostingFileIdentity(historical.files),
    restored:readRows('retained-site-manifest.sha256')};
}

function assertRetainedVersionCurrent(retained,version,files){
  // Firebase defines FINALIZED versions as no longer changeable. Reuse of the
  // pinned raw certificate requires current existence plus identical content
  // metadata/config and every Hosting path/hash/status, including managed init.
  // https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions#VersionStatus
  const current=versionIdentity(version),currentFiles=hostingFileIdentity(files);
  exact(stableJson(current),stableJson(retained.version),'RETAINED_VERSION_METADATA_OR_CONFIG_CHANGED');
  exact(stableJson(currentFiles),stableJson(retained.files),'RETAINED_VERSION_HOSTING_PATH_HASH_OR_STATUS_CHANGED');
  const transport=hostingFileContract(version,currentFiles,retained.manifest);
  return {status:'PINNED_FINALIZED_VERSION_CURRENT_METADATA_AND_FILES_EXACT',
    versionName:current.name,productFileCount:transport.retainedProductFileCount,
    hostingFileCount:transport.metadataFileCount,hostingManagedInitFileCount:2,
    rawCertificateRunId:retained.reference.runId,rawCertificateRunnerCommit:retained.reference.runnerCommit,
    currentVerificationRunId:env.GITHUB_RUN_ID,currentRunnerCommit:env.GITHUB_SHA,
    rawBytesReadInThisRun:!!causal,retainedRawCertificateReused:true,
    originalRawDigest:retained.manifest.digest,metadataSha256:sha(stableJson(current)),
    hostingFileSetSha256:sha(stableJson(currentFiles)),
    immutabilityAuthority:'https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions#VersionStatus'};
}
function validateFreshPreflight(original){
  const requiredChecks=['exact_candidate_and_archive','artifact_run_metadata',
    'reuse_existing_service_account_for_gets','live_before_snapshot',
    'preview_version_and_all_served_bytes','certified_rollback_version_and_all_served_bytes',
    'live_unchanged_after_readonly_preflight'];
  requireValue(Array.isArray(original.checks),'PREFLIGHT_CHECKS_MISSING');
  exact(original.checks.length,requiredChecks.length,'PREFLIGHT_CHECK_COUNT_MISMATCH');
  for(const name of requiredChecks)
    exact(original.checks.filter(c=>c.name===name).length,1,'PREFLIGHT_CHECK_MISSING_OR_DUPLICATED_'+name);
  requireValue(original.checks.every(c=>c.status==='PASS'||c.status==='FAIL'),'PREFLIGHT_CHECK_STATUS_INVALID');
  const failed=original.checks.filter(c=>c.status==='FAIL');
  exact(original.failedCheckCount,failed.length,'PREFLIGHT_FAILED_COUNT_MISMATCH');
  if(failed.length===0){
    exact(original.status,'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS','PREFLIGHT_STATUS_NOT_PASS');
    return {checks:original.checks};
  }
  // Preserve the honest read-only 404. Only the exact expired-channel finding
  // can be resolved using a pinned retained certificate with current equality.
  exact(original.status,'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_FAIL','PREFLIGHT_STATUS_NOT_FAIL');
  requireValue(failed.length===1 && failed[0].name==='certified_rollback_version_and_all_served_bytes' &&
    failed[0].code==='HOSTING_GET_404:projects_-_sites_ays-orbit-360-lab_channels_gi-i5-rb-34723814583',
    'PREFLIGHT_FAILURE_NOT_EXACT_EXPIRED_ROLLBACK_CHANNEL');
  return {checks:original.checks,preservedOriginalFailure:{name:failed[0].name,code:failed[0].code}};
}
function reconcileRetainedPreflight(original,retained,currentMatch){
  const fresh=validateFreshPreflight(original);
  if(causal){
    exact(original.status,'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS','CAUSAL_PREFLIGHT_MUST_FULLY_PASS');
    exact(currentMatch?.status,'PINNED_FINALIZED_VERSION_CURRENT_METADATA_AND_FILES_EXACT','CURRENT42_CURRENT_METADATA_REQUIRED');
    exact(currentMatch.versionName,causal.pin.versionName,'CURRENT42_CURRENT_VERSION_REQUIRED');
    return {checks:fresh.checks,rollbackVersionName:causal.pin.versionName,retainedCertificateUsed:true,preservedOriginalFailure:null,rawBytesReadInThisRun:true};
  }
  requireValue(retained?.rawProof?.rawPayloadDigestVerified===true,'RETAINED_ROLLBACK_RAW_CERTIFICATE_REQUIRED');
  exact(currentMatch?.status,'PINNED_FINALIZED_VERSION_CURRENT_METADATA_AND_FILES_EXACT','CURRENT_RETAINED_VERSION_EQUALITY_REQUIRED');
  exact(currentMatch.versionName,rollbackPin.versionName,'CURRENT_RETAINED_VERSION_MISMATCH');
  const check={name:'certified_rollback_version_and_all_served_bytes',status:'PASS',
    evidence:{...retained.rawProof,certificateReceiptPath:retained.reference.receiptPath,
      certificateReceiptBlobSha:retained.reference.receiptBlobSha,
      certificateReceiptSha256:retained.reference.receiptSha256,
      certificationReusedFromRun:retained.reference.runId,currentMetadataVerification:currentMatch,
      rawBytesReadInThisRun:false}};
  return {checks:fresh.checks.map(c=>c.name===check.name?check:c),
    rollbackVersionName:rollbackPin.versionName,retainedCertificateUsed:true,
    preservedOriginalFailure:fresh.preservedOriginalFailure || null};
}
async function assertCanonicalHead(){
  const response=await fetch('https://api.github.com/repos/paulaosoriof86/orbit360-core/git/ref/heads/recovery/fase-a-clean-20260831',{
    headers:{Authorization:'Bearer '+requiredEnv('GH_TOKEN'),Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    redirect:'error',signal:AbortSignal.timeout(30000)
  });
  requireValue(response.ok,'REMOTE_HEAD_READ_FAILED_'+response.status);
  const ref=await response.json();
  exact(ref.object?.sha,env.GITHUB_SHA,'CANONICAL_HEAD_MOVED_BEFORE_PROMOTION');
  const runResponse=await fetch('https://api.github.com/repos/paulaosoriof86/orbit360-core/actions/runs/'+env.GITHUB_RUN_ID,{
    headers:{Authorization:'Bearer '+requiredEnv('GH_TOKEN'),Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    redirect:'error',signal:AbortSignal.timeout(30000)
  });
  requireValue(runResponse.ok,'RUN_WINDOW_READ_FAILED_'+runResponse.status);
  const run=await runResponse.json(),started=Date.parse(run.run_started_at);
  requireValue(Number.isFinite(started) && Date.now()-started<15*60*1000,'INSUFFICIENT_RUN_WINDOW_FOR_VERIFIED_ROLLBACK');
}
function formalSeal(cp){
  const pointer=requiredEnv('FORMAL_PREVIEW_POINTER');
  requireValue(pointer.startsWith('/'+requiredEnv('B4_CURSOR_KEY')+'/'),'FORMAL_PREVIEW_POINTER_OUTSIDE_ACTIVE_CURSOR');
  let value=cp;
  for(const key of pointer.slice(1).split('/')){
    requireValue(key && Object.prototype.hasOwnProperty.call(value || {},key),'FORMAL_PREVIEW_SEAL_MISSING');
    value=value[key];
  }
  requireValue(value && typeof value==='object','FORMAL_PREVIEW_SEAL_INVALID');
  exact(value.status,'LATEST_APPROVED_VERSION_PREVIEW_PASS','FORMAL_PREVIEW_NOT_PASS');
  exact(value.sourceSha,binding.sourceSha,'FORMAL_PREVIEW_SOURCE_MISMATCH');
  exact(value.buildId,binding.buildId,'FORMAL_PREVIEW_BUILD_MISMATCH');
  exact(Number(value.artifactId),binding.artifactId,'FORMAL_PREVIEW_ARTIFACT_MISMATCH');
  exact(value.archiveSha256,binding.archiveSha256,'FORMAL_PREVIEW_ARCHIVE_MISMATCH');
  return {pointer,status:value.status,sourceSha:value.sourceSha,buildId:value.buildId,
    artifactId:Number(value.artifactId),archiveSha256:value.archiveSha256};
}
function liveReleaseRequest(version,kind){
  requireValue(kind==='promotion' || kind==='rollback','RELEASE_KIND_NOT_ALLOWED');
  exact(version,kind==='promotion'?expectedPreview:expectedRollback,'RELEASE_VERSION_OUTSIDE_EXACT_PINS');
  requireValue(new RegExp('^sites/'+binding.site+'/versions/[A-Za-z0-9_-]+$').test(version),'RELEASE_VERSION_INVALID');
  return {resource:'sites/'+binding.site+'/channels/live/releases',query:{versionName:version},
    data:{message:'B4-003 exact retained Hosting '+kind+'; run '+env.GITHUB_RUN_ID}};
}
async function releaseExistingVersion(version,kind){
  // Same releases.create operation already verified in the retained rollback
  // certification. Selects an existing version; never calls versions.create.
  exact(cursor.productionPromotionAuthorized,true,'PRODUCTION_PROMOTION_NOT_AUTHORIZED');
  const req=liveReleaseRequest(version,kind);
  const url=new URL(apiRoot+req.resource);url.searchParams.set('versionName',req.query.versionName);
  releaseAuthClient ||= await releaseAuthClientFactory();
  receipt[kind+'Attempted']=true;
  receipt[kind+'TargetVersionName']=version;
  receipt[kind+'Method']='POST_EXISTING_VERSION_RELEASE_NO_NEW_VERSION';
  persist(); // Record the attempt before a POST whose remote result may be uncertain.
  let data;
  try{data=(await releaseAuthClient.request({url:url.toString(),method:'POST',data:req.data,
    headers:{'Content-Type':'application/json'},timeout:20000,retry:false})).data;}
  catch(e){throw new Error('HOSTING_RELEASE_POST_'+String(e?.response?.status || e?.code || 'ERROR'));}
  writeJson(kind+'-release.json',data);
  exact(normalizeVersionResource(data?.version?.name),version,'RELEASE_RESPONSE_VERSION_MISMATCH');
  for(let attempt=1;attempt<=10;attempt++){
    const actual=versionName(await getChannel('live'));
    if(actual===version)return;
    requireValue([expectedLive,expectedPreview,expectedRollback].includes(actual),'LIVE_MOVED_TO_UNRELATED_VERSION');
    if(attempt<10)await new Promise(resolve=>setTimeout(resolve,1000));
  }
  fail('LIVE_RELEASE_VERSION_READBACK_TIMEOUT');
}
async function verifyLive(version,manifestFile,expectedSource,expectedBuild,label){
  const channel=compactChannel(await getChannel('live'));
  exact(channel.versionName,version,label.toUpperCase()+'_LIVE_VERSION_MISMATCH');
  exact(channel.url,productionUrl,label.toUpperCase()+'_LIVE_URL_MISMATCH');
  const manifest=readRows(manifestFile),{rows,digest}=manifest;
  const metadata=await hostingGet(version);
  exact(normalizeVersionResource(metadata.name),version,label.toUpperCase()+'_METADATA_VERSION_MISMATCH');
  exact(metadata.status,'FINALIZED',label.toUpperCase()+'_VERSION_NOT_FINALIZED');
  const files=await listFiles(version);
  const transportContract=hostingFileContract(metadata,files,manifest);
  writeJson(label+'-hosting-version.json',{channel,version:metadata,files,transportContract});
  const readback=await readManifest(productionUrl,transportContract.productFiles.map(r=>r.path),rows,
    label+'-canonical-origin',label+'-'+env.GITHUB_RUN_ID,digest);
  exact(readback.marker?.sourceSha,expectedSource,label.toUpperCase()+'_SOURCE_MISMATCH');
  exact(readback.marker?.buildId,expectedBuild,label.toUpperCase()+'_BUILD_MISMATCH');
  const sentinels=await sentinelSnapshot(label+'-sentinel-'+env.GITHUB_RUN_ID);
  writeJson(label+'-sentinels.json',{origins:sentinels,meaning:'UNCHANGED_ONLY_NOT_A_HEALTH_OR_RELEASE_ACCEPTANCE'});
  sameSentinels(sentinels,sentinelsBefore,label.toUpperCase()+'_NON_TARGET_SENTINEL_CHANGED');
  exact(versionName(await getChannel('live')),version,label.toUpperCase()+'_LIVE_MOVED_DURING_READBACK');
  return {channel,hostedFileCount:rows.length,hostedPayloadDigest:digest,
    hostingFileCount:transportContract.metadataFileCount,
    hostingManagedInitFileCount:transportContract.managedInitFileCount,
    hostingManagedInitPaths:transportContract.managedInitPaths,
    origins:[{base:productionUrl,...readback}],nonTargetSentinels:sentinels,
    nonTargetSentinelsUnchanged:true,nonTargetSentinelsHealthCertified:false};
}
async function liveVersionForRecovery(){
  for(let attempt=1;attempt<=3;attempt++){
    try{return versionName(await getChannel('live'));}
    catch(error){
      const transient=/HOSTING_GET_(?:5[0-9][0-9]|429|ETIMEDOUT|ECONNRESET|EAI_AGAIN|ERROR):/.test(String(error?.message));
      if(!transient || attempt===3)throw error;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
  }
  fail('LIVE_RECOVERY_READ_UNAVAILABLE');
}
try{
  requiredEnv('B4_PREFLIGHT_OUT');
  exact(env.GITHUB_REPOSITORY,'paulaosoriof86/orbit360-core','WRONG_REPOSITORY');
  exact(env.GITHUB_REF,'refs/heads/recovery/fase-a-clean-20260831','WRONG_BRANCH');
  proof=JSON.parse(fs.readFileSync(path.join(out,'preflight.json'),'utf8'));
  exact(proof.schema,'B4_003_RETAINED_HOSTING_PREFLIGHT_V1','PREFLIGHT_SCHEMA_MISMATCH');
  exact(proof.runnerCommit,env.GITHUB_SHA,'PREFLIGHT_RUNNER_MISMATCH');
  exact(String(proof.runId),String(env.GITHUB_RUN_ID),'PREFLIGHT_NOT_FROM_THIS_RUN');
  validateFreshPreflight(proof);
  binding=proof.binding;
  exact(binding.site,'ays-orbit-360-lab','WRONG_HOSTING_SITE');
  exact(binding.projectId,binding.site,'WRONG_FIREBASE_PROJECT');
  const control=requiredEnv('CONTROL');
  const controlBytes=fs.readFileSync(control);
  exact(sha(controlBytes),proof.control.sha256,'CONTROL_CHANGED_SINCE_PREFLIGHT');
  cp=JSON.parse(controlBytes);
  cursor=cp[requiredEnv('B4_CURSOR_KEY')];
  requireValue(cursor,'ACTIVE_CURSOR_MISSING');
  exact(cursor.activeSourceSha,binding.sourceSha,'ACTIVE_SOURCE_MISMATCH');
  exact(cursor.activeBuildId,binding.buildId,'ACTIVE_BUILD_MISMATCH');
  exact(Number(cursor.activeImmutableArtifactId),binding.artifactId,'ACTIVE_ARTIFACT_MISMATCH');
  exact(cursor.productionPromotionAuthorized,true,'PRODUCTION_PROMOTION_NOT_AUTHORIZED');
  causal=causalSuccessorContext(cp,cursor,true);
  if(causal){
    rollbackPin=causal.pin;receipt.b4003Closed=true;receipt.b4003HistoricalAcceptancePreserved=true;receipt.causalSuccessor=true;
    exact(proof.status,'EXACT_RETAINED_ARTIFACT_HOSTING_PREFLIGHT_PASS','CAUSAL_PREFLIGHT_MUST_FULLY_PASS');
  }else requireValue(cursor.b4003Closed!==true,'B4003_ALREADY_CLOSED_NO_REPLAY');
  receipt.formalPreviewSeal=formalSeal(cp);
  expectedPreview=requiredEnv('PROMOTE_EXPECTED_PREVIEW_VERSION_NAME');
  expectedRollback=requiredEnv('PROMOTE_EXPECTED_ROLLBACK_VERSION_NAME');
  expectedLive=requiredEnv('PROMOTE_EXPECTED_LIVE_BEFORE_VERSION_NAME');
  exact(expectedRollback,rollbackPin.versionName,'ROLLBACK_VERSION_NOT_RETAINED_CERTIFIED_PIN');
  exact(proof.previewVersionName,expectedPreview,'PREVIEW_VERSION_PIN_MISMATCH');
  exact(proof.liveVersionName,expectedLive,'LIVE_BEFORE_VERSION_PIN_MISMATCH');
  requireValue(expectedPreview!==expectedRollback,'CANDIDATE_EQUALS_ROLLBACK');
  requireValue(expectedPreview!==expectedLive,'CANDIDATE_ALREADY_LIVE_NO_REPLAY');
  rollbackCertified=causal?.certified||cp.certifiedCandidate;
  if(causal)exact(expectedLive,expectedRollback,'CURRENT42_MUST_STILL_BE_LIVE');
  ({productionUrl,sentinelOrigins}=releaseOrigins(rollbackCertified?.productionUrl,binding.liveUrls));
  exact(rollbackCertified?.sourceSha,rollbackPin.sourceSha,'ROLLBACK_CP_SOURCE_MISMATCH');
  exact(rollbackCertified?.buildId,rollbackPin.buildId,'ROLLBACK_CP_BUILD_MISMATCH');
  exact(Number(rollbackCertified?.hostedFileCount),rollbackPin.fileCount,'ROLLBACK_CP_FILE_COUNT_MISMATCH');
  exact(rollbackCertified?.hostedPayloadDigest,rollbackPin.digest,'ROLLBACK_CP_DIGEST_MISMATCH');
  const retained=causal?readCurrent42RollbackCertificate():readPinnedRollbackCertificate(cursor);
  exact(retained.reference.previewVersionName,expectedPreview,'CERTIFICATE_RESTORED_A_DIFFERENT_PREVIEW');
  exact(retained.reference.previewSourceSha,binding.sourceSha,'CERTIFICATE_RESTORED_A_DIFFERENT_SOURCE');
  exact(retained.reference.previewBuildId,binding.buildId,'CERTIFICATE_RESTORED_A_DIFFERENT_BUILD');
  const previewCheck=proof.checks.find(c=>c.name==='preview_version_and_all_served_bytes');
  const candidateManifest=readRows('retained-site-manifest.sha256');
  if(env.B4_CAUSAL_FRONTEND_SUCCESSOR==='policy-capture-20261107')policyCapturePayloadBinding(causal.artifactProof,candidateManifest);
  exact(candidateManifest.digest,previewCheck.evidence.digest,'CANDIDATE_MANIFEST_CHANGED');
  exact(candidateManifest.fileCount,previewCheck.evidence.fileCount,'CANDIDATE_MANIFEST_COUNT_CHANGED');
  exact(candidateManifest.digest,retained.restored.digest,'FRESH_PREVIEW_NOT_CERTIFIED_RESTORED_CANDIDATE');
  exact(candidateManifest.fileCount,218,'FRESH_PREVIEW_PRODUCT_COUNT_NOT_218');
  exact(previewCheck.evidence.marker?.sourceSha,binding.sourceSha,'FRESH_PREVIEW_SOURCE_MISMATCH');
  exact(previewCheck.evidence.marker?.buildId,binding.buildId,'FRESH_PREVIEW_BUILD_MISMATCH');
  const rollbackManifest=retained.manifest;
  // Reconstruct only the expectation used if a LIVE rollback is required. This
  // preserves historical reuse; causal mode also requires full fresh current42 reads.
  fs.writeFileSync(path.join(out,'rollback-manifest.sha256'),rollbackManifest.text);
  receipt.certifiedRollbackRawProof={...retained.rawProof,certificateOrigin:retained.reference,
    rawBytesReadInThisRun:!!causal,retainedRawCertificateReused:true,
    filesEvidence:causal?'rollback-files.json':retained.reference.receiptPath+'#/rollbackRawFiles'};
  const pkg=requiredEnv('FIREBASE_CLI_PACKAGE');
  const requireCli=createRequire(pkg);
  exact(requireCli(pkg).version,'14.10.1','FIREBASE_CLI_VERSION_MISMATCH');
  const {GoogleAuth}=requireCli('google-auth-library');
  // Metadata uses read-only scope. A separate client is created lazily only
  // after every gate passes for the fixed releases.create operation.
  authClient=await new GoogleAuth({keyFile:requiredEnv('GOOGLE_APPLICATION_CREDENTIALS'),
    scopes:['https://www.googleapis.com/auth/firebase.hosting.readonly']}).getClient();
  releaseAuthClientFactory=()=>new GoogleAuth({keyFile:requiredEnv('GOOGLE_APPLICATION_CREDENTIALS'),
    scopes:['https://www.googleapis.com/auth/firebase.hosting']}).getClient();
  const rollbackVersion=await hostingGet(expectedRollback);
  exact(normalizeVersionResource(rollbackVersion.name),expectedRollback,'ROLLBACK_RETAINED_VERSION_MISMATCH');
  exact(rollbackVersion.status,'FINALIZED','ROLLBACK_RETAINED_VERSION_NOT_FINALIZED');
  const rollbackFiles=await listFiles(expectedRollback);
  const currentMatch=assertRetainedVersionCurrent(retained,rollbackVersion,rollbackFiles);
  const effectiveProof=reconcileRetainedPreflight(proof,retained,currentMatch);
  receipt.preflightReconciliation={originalStatus:proof.status,originalReceiptUnchanged:true,
    effectiveChecks:effectiveProof.checks.map(c=>({name:c.name,status:c.status})),
    preservedOriginalFailure:effectiveProof.preservedOriginalFailure,
    certificateOrigin:retained.reference,currentMetadataVerification:currentMatch,
    currentPreflightRunId:proof.runId,currentControlSha256:proof.control.sha256,
    rawCertificateRunId:retained.reference.runId,rawCertificateControlSha256:retained.reference.controlSha256,
    rawBytesReadInThisRun:!!causal,retainedRawCertificateReused:true};
  writeJson('rollback-certificate-reuse.json',receipt.preflightReconciliation);
  const rollbackTransport=hostingFileContract(rollbackVersion,rollbackFiles,rollbackManifest);
  writeJson('rollback-hosting-before-promotion.json',{version:rollbackVersion,files:rollbackFiles,transportContract:rollbackTransport});
  const before={preview:compactChannel(await getChannel(binding.previewChannelId)),
    rollback:{versionName:expectedRollback,status:rollbackVersion.status,
      productFileCount:rollbackTransport.retainedProductFileCount,
      hostingFileCount:rollbackTransport.metadataFileCount,
      source:'PINNED_RAW_CERTIFICATE_WITH_CURRENT_FINALIZED_METADATA_AND_FILES',
      rawCertificateRunId:retained.reference.runId,currentVerificationRunId:env.GITHUB_RUN_ID},
    live:compactChannel(await getChannel('live')),preflightRunId:proof.runId,
    productionUrl,nonTargetSentinelOrigins:sentinelOrigins,
    sourceSha:binding.sourceSha,buildId:binding.buildId,artifactId:binding.artifactId,archiveSha256:binding.archiveSha256};
  exact(before.preview.versionName,expectedPreview,'PREVIEW_MOVED_AFTER_PREFLIGHT');
  exact(before.live.versionName,expectedLive,'LIVE_MOVED_AFTER_PREFLIGHT');
  exact(before.live.url,productionUrl,'LIVE_URL_NOT_CANONICAL_TARGET');
  sentinelsBefore=await sentinelSnapshot('before-promotion-'+env.GITHUB_RUN_ID);
  const preflightOrigins=proof.checks.find(c=>c.name==='live_before_snapshot')?.evidence?.origins;
  requireValue(Array.isArray(preflightOrigins),'PREFLIGHT_ORIGINS_MISSING');
  sameSentinels(sentinelsBefore,preflightOrigins.filter(o=>sentinelOrigins.includes(o.base)),
    'NON_TARGET_SENTINEL_CHANGED_AFTER_PREFLIGHT');
  before.nonTargetSentinels=sentinelsBefore;
  writeJson('promotion-before.json',before);
  await assertCanonicalHead();
  exact(versionName(await getChannel('live')),expectedLive,'LIVE_MOVED_IMMEDIATELY_BEFORE_PROMOTION');
  receipt.status='GATES_PASS_PROMOTING_EXACT_VERSION';
  receipt.binding=binding;
  receipt.previewVersionName=expectedPreview;
  receipt.rollbackVersionName=expectedRollback;
  receipt.liveBeforeVersionName=expectedLive;
  receipt.productionUrl=productionUrl;
  receipt.nonTargetSentinelOrigins=sentinelOrigins;
  persist();
  await releaseExistingVersion(expectedPreview,'promotion');
  receipt.liveAfter=await verifyLive(expectedPreview,'retained-site-manifest.sha256',
    binding.sourceSha,binding.buildId,'promoted');
  writeJson('promotion-after.json',receipt.liveAfter);
  receipt.status='EXACT_HOSTING_VERSION_PROMOTED_LIVE_BYTES_PASS_FUNCTIONAL_LIVE_PENDING';
}catch(error){
  receipt.failureCode=safeCode(error);
  receipt.status=receipt.promotionAttempted?'PROMOTION_OR_LIVE_READBACK_FAILED':'PROMOTION_BLOCKED_BEFORE_MUTATION';
  if(receipt.promotionAttempted){
    try{
      const actual=await liveVersionForRecovery();
      receipt.liveVersionAtFailure=actual;
      if(actual===expectedPreview){
        // Never overwrite an unrelated concurrent deployment. Roll back only
        // the exact candidate this operation attempted to release.
        await releaseExistingVersion(expectedRollback,'rollback');
        receipt.rollbackReadback=await verifyLive(expectedRollback,'rollback-manifest.sha256',
          rollbackCertified.sourceSha,rollbackCertified.buildId,'restored');
        writeJson('rollback-after.json',receipt.rollbackReadback);
        receipt.status='PROMOTION_FAILED_CERTIFIED_ROLLBACK_VERIFIED';
      }else if(actual===expectedLive){
        receipt.status='PROMOTION_FAILED_LIVE_REMAINED_AT_ORIGINAL_VERSION';
      }else if(actual===expectedRollback){
        receipt.rollbackReadback=await verifyLive(expectedRollback,'rollback-manifest.sha256',
          rollbackCertified.sourceSha,rollbackCertified.buildId,'restored');
        writeJson('rollback-after.json',receipt.rollbackReadback);
        receipt.status='PROMOTION_FAILED_CERTIFIED_ROLLBACK_ALREADY_PRESENT_VERIFIED';
      }else{
        receipt.status='PROMOTION_FAILED_UNEXPECTED_LIVE_VERSION_NO_AUTOMATIC_OVERWRITE';
      }
    }catch(rollbackError){
      receipt.rollbackFailureCode=safeCode(rollbackError);
      receipt.status='PROMOTION_FAILED_ROLLBACK_NOT_VERIFIED';
    }
  }
  process.exitCode=1;
}finally{
  receipt.finishedAtUtc=new Date().toISOString();
  persist();
  console.log(JSON.stringify({status:receipt.status,sourceSha:binding?.sourceSha,
    artifactId:binding?.artifactId,promotionAttempted:receipt.promotionAttempted,
    rollbackAttempted:receipt.rollbackAttempted,failureCode:receipt.failureCode,
    rollbackFailureCode:receipt.rollbackFailureCode,b4003Closed:receipt.b4003Closed,b4003HistoricalAcceptancePreserved:receipt.b4003HistoricalAcceptancePreserved}));
}

