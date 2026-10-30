#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const GUARD='tools/gravicentra-i6-control-plane-guard-v1.mjs';
const RECEIPT='artifacts/orbit360-recovery/release-control/I6_5_B4_003_INSTITUTIONAL_GOALS_EXACT_PREVIEW_PASS_20261030.json';
const SOURCE_SHA='eb9ce731832d236fedc545185ec7c66bd10849bb';
const TRANSPORT_HEAD='bf9106ac28787b06da0465eb7f99fe3f131a4f4b';
const RUN_ID=41066435386;
const PREVIEW_URL='https://ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app/';
const BUILD_ID='gi-i65-b4-eb9ce731832d-57f234755dc1';
const HOSTED_FILE_COUNT=218;
const HOSTED_PAYLOAD_DIGEST='93d05a09035a044d400fe0f0e04759bd8c15e111bae93608dff0babdfa883a0a';
const BUNDLE_DIGEST='9e63077a08b3ef86aa85f5ccd83c866326f708734c33f97e9d4e778e4d2b05ee';
const BACKEND_SOURCE_DIGEST='3ac3bf7bc777460d7d181bc3241efcc02e420ccfd54ba22b0e91762456c4dd4e';
const ARTIFACT_ID=12982792336;
const ARTIFACT_ZIP_SHA256='62edb540b49d199c2f100335e9677a3f544627a538a35964150e54145302ba52';
const LIVE_IDENTITY_ARTIFACT_ID=12983501089;
const LIVE_IDENTITY_ARTIFACT_SHA256='570beb0c5779c6ea7e38d407a7a406f37c9d7e0b51c34af164273fda64a42759';
const EQUIPO_BLOB='5ce317a0641709e1a405e61435578de934fa194d';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const need=(ok,code)=>{if(!ok)throw new Error(code);};

need(git('merge-base',SOURCE_SHA,'HEAD')===SOURCE_SHA,'INSTITUTIONAL_SOURCE_NOT_ANCESTOR');
need(git('merge-base',TRANSPORT_HEAD,'HEAD')===TRANSPORT_HEAD,'INSTITUTIONAL_TRANSPORT_NOT_ANCESTOR');
need(git('rev-parse',`${SOURCE_SHA}:orbit360-platform/modules/equipo.js`)===EQUIPO_BLOB,'INSTITUTIONAL_EQUIPO_BLOB_MISMATCH');

const receipt={
  schema:'GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_EXACT_PREVIEW_PASS_V1',
  gate:'I6.5/B4-003',
  status:'EXACT_PREVIEW_BUILD_BYTE_READBACK_PASS_AUTHENTICATED_UAT_PENDING',
  repository:'paulaosoriof86/orbit360-core',
  branch:'recovery/fase-a-clean-20260831',
  sourceSha:SOURCE_SHA,
  transportHead:TRANSPORT_HEAD,
  runId:RUN_ID,
  previewUrl:PREVIEW_URL,
  buildId:BUILD_ID,
  hostedFileCount:HOSTED_FILE_COUNT,
  buildBoundAssetCount:138,
  reachableProductFiles:214,
  hostedPayloadDigest:HOSTED_PAYLOAD_DIGEST,
  bundleDigest:BUNDLE_DIGEST,
  backendSourceDigest:BACKEND_SOURCE_DIGEST,
  artifact:{id:ARTIFACT_ID,zipSha256:ARTIFACT_ZIP_SHA256,retainedUntil:'2026-11-06'},
  liveIdentityReadback:{
    artifactId:LIVE_IDENTITY_ARTIFACT_ID,
    artifactDigest:`sha256:${LIVE_IDENTITY_ARTIFACT_SHA256}`,
    labLiveRootExact:true,
    ownerRuntimeExact:true,
    ownerRootStructuralExact:true
  },
  exactProductBlobs:{'orbit360-platform/modules/equipo.js':EQUIPO_BLOB},
  proof:{
    guardBeforeBuildPass:true,
    institutionalRegressionChecks:15,
    closeoutRegressionCases:8,
    lifecycleRegressionCases:18,
    exactServedBytes:true,
    liveRootsUnchanged:true,
    ownerCustomDomainRuntimeUnchanged:true,
    ownerCustomDomainStructuralIdentityUnchanged:true
  },
  boundaries:{
    previewOnly:true,
    livePromotion:false,
    functionsDeploy:false,
    rulesAuthIamMutation:false,
    operationalWrites:false,
    dataImport:false,
    externalMessages:false,
    securityB4003StillHold:true,
    acceptanceGranted:false
  },
  pending:[
    'AUTHENTICATED_CHROME_UAT_EQUIPO_METAS',
    'CONTROLLED_SYNTHETIC_WRITE_SERVER_READBACK_RELOAD_AUDIT_RESTORE',
    'INDEPENDENT_CARLOS_UID_UAT',
    'PARALLEL_REMAINING_P0_DISPOSITION'
  ]
};
fs.writeFileSync(RECEIPT,JSON.stringify(receipt,null,2)+'\n');
const receiptBlob=git('hash-object',RECEIPT);

const C=JSON.parse(fs.readFileSync(CONTROL,'utf8'));
const source=C.b4003InstitutionalGoalsSourceSuccessor20261029;
need(source&&source.afterBlob===EQUIPO_BLOB&&source.status==='SOURCE_SUCCESSOR_ATOMIC_PREVIEW_PENDING_AUTHENTICATED_UAT','INSTITUTIONAL_SOURCE_AUTHORITY_MISMATCH');
Object.assign(source,{
  previewState:receipt.status,
  previewReceiptPath:RECEIPT,
  previewReceiptBlobSha:receiptBlob,
  previewSourceSha:SOURCE_SHA,
  previewTransportHead:TRANSPORT_HEAD,
  previewRunId:RUN_ID,
  previewUrl:PREVIEW_URL,
  buildId:BUILD_ID,
  hostedPayloadDigest:HOSTED_PAYLOAD_DIGEST,
  bundleDigest:BUNDLE_DIGEST
});
C.b4003InstitutionalGoalsExactPreview20261030={
  status:receipt.status,
  gate:receipt.gate,
  sourceSha:SOURCE_SHA,
  transportHead:TRANSPORT_HEAD,
  runId:RUN_ID,
  previewUrl:PREVIEW_URL,
  buildId:BUILD_ID,
  hostedFileCount:HOSTED_FILE_COUNT,
  hostedPayloadDigest:HOSTED_PAYLOAD_DIGEST,
  bundleDigest:BUNDLE_DIGEST,
  backendSourceDigest:BACKEND_SOURCE_DIGEST,
  artifactId:ARTIFACT_ID,
  artifactZipSha256:ARTIFACT_ZIP_SHA256,
  liveIdentityArtifactId:LIVE_IDENTITY_ARTIFACT_ID,
  liveIdentityArtifactSha256:LIVE_IDENTITY_ARTIFACT_SHA256,
  receiptPath:RECEIPT,
  receiptBlobSha:receiptBlob,
  productBlobs:{'orbit360-platform/modules/equipo.js':EQUIPO_BLOB},
  liveRootsUnchanged:true,
  currentCapabilityAcceptances:0,
  securityB4003StillHold:true,
  nextAction:'AUTHENTICATED_EQUIPO_METAS_WRITE_READBACK_RELOAD_AUDIT_RESTORE_AND_PARALLEL_P0_CLOSEOUT'
};
C.nextAction='I6_5_B4_003_AUTHENTICATED_EXACT_PREVIEW_UAT_AND_P0_CLOSEOUT';
fs.writeFileSync(CONTROL,JSON.stringify(C,null,2)+'\n');

let guard=fs.readFileSync(GUARD,'utf8');
const old=` console.log('B4_003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR=EQUIPO_METAS_DURABLE_OWNER_SOURCE_QA_PASS_PREVIEW_UAT_PENDING');\n need(COMP.productFileCount===COMP.productFiles.length,'I6_CANONICAL_COMPOSITION_COUNT_DRIFT');`;
const block=` console.log('B4_003_INSTITUTIONAL_GOALS_SOURCE_SUCCESSOR=EQUIPO_METAS_DURABLE_OWNER_SOURCE_QA_PASS_PREVIEW_UAT_PENDING');\n const institutionalPreview=C.b4003InstitutionalGoalsExactPreview20261030;\n const institutionalPreviewReceiptPath='${RECEIPT}';\n const institutionalPreviewReceipt=readJson(institutionalPreviewReceiptPath);\n need(institutionalPreview?.status==='EXACT_PREVIEW_BUILD_BYTE_READBACK_PASS_AUTHENTICATED_UAT_PENDING'&&\n  institutionalPreview.gate==='I6.5/B4-003'&&institutionalPreview.sourceSha==='${SOURCE_SHA}'&&\n  institutionalPreview.transportHead==='${TRANSPORT_HEAD}'&&institutionalPreview.runId===${RUN_ID}&&\n  institutionalPreview.previewUrl==='${PREVIEW_URL}'&&institutionalPreview.buildId==='${BUILD_ID}'&&\n  institutionalPreview.hostedFileCount===${HOSTED_FILE_COUNT}&&institutionalPreview.hostedPayloadDigest==='${HOSTED_PAYLOAD_DIGEST}'&&\n  institutionalPreview.bundleDigest==='${BUNDLE_DIGEST}'&&institutionalPreview.backendSourceDigest==='${BACKEND_SOURCE_DIGEST}'&&\n  institutionalPreview.artifactId===${ARTIFACT_ID}&&institutionalPreview.artifactZipSha256==='${ARTIFACT_ZIP_SHA256}'&&\n  institutionalPreview.liveIdentityArtifactId===${LIVE_IDENTITY_ARTIFACT_ID}&&institutionalPreview.liveIdentityArtifactSha256==='${LIVE_IDENTITY_ARTIFACT_SHA256}'&&\n  institutionalPreview.receiptPath===institutionalPreviewReceiptPath&&institutionalPreview.receiptBlobSha===physicalGit('hash-object',institutionalPreviewReceiptPath)&&\n  institutionalPreview.productBlobs?.['orbit360-platform/modules/equipo.js']==='${EQUIPO_BLOB}'&&\n  physicalGit('rev-parse',institutionalPreview.sourceSha+':orbit360-platform/modules/equipo.js')===institutionalPreview.productBlobs['orbit360-platform/modules/equipo.js']&&\n  physicalGit('merge-base',institutionalPreview.sourceSha,current)===institutionalPreview.sourceSha&&\n  physicalGit('merge-base',institutionalPreview.transportHead,current)===institutionalPreview.transportHead&&\n  institutionalPreviewReceipt.schema==='GRAVICENTRA_I65_B4003_INSTITUTIONAL_GOALS_EXACT_PREVIEW_PASS_V1'&&\n  institutionalPreviewReceipt.status===institutionalPreview.status&&institutionalPreviewReceipt.sourceSha===institutionalPreview.sourceSha&&\n  institutionalPreviewReceipt.transportHead===institutionalPreview.transportHead&&institutionalPreviewReceipt.runId===institutionalPreview.runId&&\n  institutionalPreviewReceipt.buildId===institutionalPreview.buildId&&institutionalPreviewReceipt.proof?.guardBeforeBuildPass===true&&\n  institutionalPreviewReceipt.proof?.institutionalRegressionChecks===15&&institutionalPreviewReceipt.proof?.exactServedBytes===true&&\n  institutionalPreviewReceipt.proof?.liveRootsUnchanged===true&&institutionalPreviewReceipt.proof?.ownerCustomDomainRuntimeUnchanged===true&&\n  institutionalPreviewReceipt.proof?.ownerCustomDomainStructuralIdentityUnchanged===true&&\n  institutionalPreviewReceipt.boundaries?.previewOnly===true&&institutionalPreviewReceipt.boundaries?.livePromotion===false&&\n  institutionalPreviewReceipt.boundaries?.operationalWrites===false&&institutionalPreviewReceipt.boundaries?.rulesAuthIamMutation===false&&\n  institutionalPreviewReceipt.boundaries?.securityB4003StillHold===true&&institutionalPreview.currentCapabilityAcceptances===0&&\n  institutionalPreview.securityB4003StillHold===true,\n  'B4_003_INSTITUTIONAL_GOALS_EXACT_PREVIEW_BINDING_INVALID');\n console.log('B4_003_INSTITUTIONAL_GOALS_EXACT_PREVIEW=BUILD_BYTE_READBACK_PASS_AUTH_UAT_PENDING');\n need(COMP.productFileCount===COMP.productFiles.length,'I6_CANONICAL_COMPOSITION_COUNT_DRIFT');`;
need(guard.split(old).length-1===1,'INSTITUTIONAL_PREVIEW_GUARD_MARKER_DRIFT');
guard=guard.replace(old,block);
fs.writeFileSync(GUARD,guard);
execFileSync(process.execPath,['--check',GUARD],{stdio:'inherit'});
execFileSync(process.execPath,[GUARD],{stdio:'inherit'});
console.log(JSON.stringify({status:'INSTITUTIONAL_GOALS_EXACT_PREVIEW_AUTHORITY_PASS',sourceSha:SOURCE_SHA,transportHead:TRANSPORT_HEAD,runId:RUN_ID,previewUrl:PREVIEW_URL,buildId:BUILD_ID,receiptBlob},null,2));
