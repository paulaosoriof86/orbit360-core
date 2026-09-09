import fs from 'node:fs';

const CONTROL='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const INTENT='artifacts/orbit360-recovery/release-control/I4A_PREVIEW_FUNCTION_REMEDIATION_INTENT.json';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const C=read(CONTROL), I=read(INTENT), B=C.i4aPreviewInfrastructureBoundary||{}, R=C.certifiedCandidate||{}, A=C.i4aCausalFindings?.aseguradoras||{};
const mode=String(I.mode||'DEPLOY_IF_ABSENT');

need(C.status==='I4A_IN_PROGRESS','PREVIEW_REMEDIATION_I4A_NOT_ACTIVE');
need(C.gateState?.gates?.I3?.status==='PASS','PREVIEW_REMEDIATION_I3_NOT_PASS');
need(C.gateState?.gates?.I4A?.status==='IN_PROGRESS','PREVIEW_REMEDIATION_I4A_GATE_INVALID');
need(['DEPLOY_IF_ABSENT','POST_DEPLOY_READBACK_ONLY'].includes(mode),'PREVIEW_REMEDIATION_MODE_INVALID');
need(B.authorizationScope==='PREVIEW_ONLY_SAME_FIREBASE_PROJECT','PREVIEW_REMEDIATION_SCOPE_INVALID');
need(B.targetFunction==='orbit360ProductInsurerCredentialCommandPreview','PREVIEW_REMEDIATION_TARGET_INVALID');
need(B.targetRegion==='us-east1','PREVIEW_REMEDIATION_REGION_INVALID');
need(B.certifiedSourceSha===R.sourceSha,'PREVIEW_REMEDIATION_SOURCE_MISMATCH');
need(B.certifiedBackendSourceDigest===R.backendSourceDigest,'PREVIEW_REMEDIATION_BACKEND_DIGEST_MISMATCH');
need(B.previewImportEnabled===false,'PREVIEW_REMEDIATION_IMPORT_MUST_BE_DISABLED');
for(const k of ['operationalWritesAuthorized','hostingMutationAuthorized','firestoreRulesMutationAuthorized','storageRulesMutationAuthorized','canonicalProductionCallableMutationAuthorized','productionHostingMutationAuthorized','dataMutationAuthorized']) need(B[k]===false,'PREVIEW_REMEDIATION_FORBIDDEN_AUTHORIZATION:'+k);
need(A.cloudFunctionsHttpBeforeRemediation===404,'PREVIEW_REMEDIATION_FUNCTION_ABSENCE_NOT_PROVEN');
need(A.cloudRunHttpBeforeRemediation===404,'PREVIEW_REMEDIATION_RUN_ABSENCE_NOT_PROVEN');
need(A.previewFunction===B.targetFunction&&A.region===B.targetRegion,'PREVIEW_REMEDIATION_CAUSAL_TARGET_MISMATCH');
need(A.productSourceChangeRequired===false,'PREVIEW_REMEDIATION_PRODUCT_SOURCE_CHANGE_FORBIDDEN');
need(C.environmentState?.productionTouchedByRecovery===false,'PREVIEW_REMEDIATION_PRODUCTION_ALREADY_TOUCHED');
need(C.environmentState?.dataTouchedByRecovery===false,'PREVIEW_REMEDIATION_DATA_ALREADY_TOUCHED');
need(C.environmentState?.writesExecuted===0,'PREVIEW_REMEDIATION_WRITES_ALREADY_NONZERO');

if(mode==='DEPLOY_IF_ABSENT'){
  need(B.status==='AUTHORIZED_CAUSAL_REMEDIATION','PREVIEW_REMEDIATION_NOT_AUTHORIZED');
  need(C.environmentState?.previewOnlyInfrastructureTouchedByRecovery===false,'PREVIEW_REMEDIATION_ALREADY_EXECUTED');
}
if(mode==='POST_DEPLOY_READBACK_ONLY'){
  need(B.status==='POST_DEPLOY_READBACK_REQUIRED','PREVIEW_REMEDIATION_READBACK_STATE_NOT_AUTHORIZED');
  need(C.environmentState?.previewOnlyInfrastructureTouchedByRecovery===true,'PREVIEW_REMEDIATION_READBACK_REQUIRES_PREVIEW_MUTATION');
  need(B.latestRemediation?.functionDeployReportedSuccessful===true,'PREVIEW_REMEDIATION_DEPLOY_SUCCESS_NOT_RECORDED');
  need(B.latestRemediation?.readbackPerformed===false,'PREVIEW_REMEDIATION_READBACK_ALREADY_RECORDED');
  need(Number(I.causalDeployEvidenceRunId)===Number(B.latestRemediation?.runId),'PREVIEW_REMEDIATION_READBACK_CAUSAL_RUN_MISMATCH');
}

need(I.schemaVersion==='gravicentra-i4a-preview-function-remediation-intent-v1','PREVIEW_REMEDIATION_INTENT_SCHEMA_INVALID');
need(I.nonAuthoritative===true,'PREVIEW_REMEDIATION_INTENT_MUST_BE_NONAUTHORITATIVE');
need(I.gate==='I4A','PREVIEW_REMEDIATION_INTENT_GATE_INVALID');
need(I.controlPlaneStatusExpected==='I4A_IN_PROGRESS','PREVIEW_REMEDIATION_INTENT_STATE_INVALID');
need(I.certifiedSourceSha===R.sourceSha,'PREVIEW_REMEDIATION_INTENT_SOURCE_MISMATCH');
need(I.certifiedBackendSourceDigest===R.backendSourceDigest,'PREVIEW_REMEDIATION_INTENT_BACKEND_MISMATCH');
need(I.targetFunction===B.targetFunction&&I.targetRegion===B.targetRegion,'PREVIEW_REMEDIATION_INTENT_TARGET_MISMATCH');
need(I.productionMutationAuthorized===false,'PREVIEW_REMEDIATION_INTENT_PRODUCTION_FORBIDDEN');
need(I.operationalDataWritesAuthorized===false,'PREVIEW_REMEDIATION_INTENT_WRITES_FORBIDDEN');
need(I.hostingMutationAuthorized===false,'PREVIEW_REMEDIATION_INTENT_HOSTING_FORBIDDEN');

for(const [k,v] of Object.entries({SOURCE_SHA:R.sourceSha,BACKEND_SOURCE_DIGEST:R.backendSourceDigest,TARGET_FUNCTION:B.targetFunction,TARGET_REGION:B.targetRegion})){
  if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`${k}=${v}\n`);
  if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`${k.toLowerCase()}=${v}\n`);
}
if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`REMEDIATION_MODE=${mode}\n`);
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`remediation_mode=${mode}\n`);
console.log('GRAVICENTRA_I4A_PREVIEW_FUNCTION_REMEDIATION_GUARD=PASS');
console.log('MODE='+mode);
console.log('TARGET='+B.targetFunction+'@'+B.targetRegion);
console.log('SOURCE_SHA='+R.sourceSha);
console.log('BACKEND_SOURCE_DIGEST='+R.backendSourceDigest);
console.log('PRODUCTION_MUTATION_AUTHORIZED=false');
console.log('OPERATIONAL_DATA_WRITES_AUTHORIZED=false');
