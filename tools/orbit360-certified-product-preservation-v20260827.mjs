#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REG='orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const A=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const fail=(code,detail={})=>{
  const out={ok:false,status:'CERTIFIED_PRODUCT_BASELINE_PRESERVATION_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtime:false,browser:false,secrets:false,firestoreRead:false,writes:false,deploy:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.error(JSON.stringify(out,null,2));
  process.exit(42);
};
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();

try{
  if(!fs.existsSync(A(REG))||!fs.existsSync(A(LEDGER))) fail('PRESERVATION_DEPENDENCY_MISSING');
  const R=json(REG),L=json(LEDGER),B=R.baseline||{},F=R.sourceFreeze||{},P=R.preservationRule||{},LS=R.lineageSemantics||{},ML=R.moduleLineage||{};

  if(R.schemaVersion!=='orbit360-certified-product-preservation-registry-v2-module-lineage'||R.status!=='ACTIVE_SOURCE_ONLY_FAIL_CLOSED_WITH_HISTORICAL_LINEAGE') fail('PRESERVATION_REGISTRY_VERSION_STALE',{schemaVersion:R.schemaVersion,status:R.status});
  if(P.approvedProductBaselineIsReference!==true||P.candidateToHeadPreservationRequired!==true||P.lastApprovedModuleToCandidateIdentityRequired!==true||P.candidatePreservedDoesNotImplyLastApprovedModulePreserved!==true||P.historicalPassPlusSameArtifactMeansNoBusinessReprocess!==true||P.visualAnomalyDoesNotAuthorizeRebuild!==true||P.visualAnomalyDoesNotAuthorizeReimport!==true||P.retiredHypothesisCannotReopenWithoutNewEvidence!==true||P.productDeltaRequiresNewExplicitlyAcceptedBaseline!==true||P.productMutationOnGuardFailure!==false||P.dataMutationOnGuardFailure!==false||P.goLiveReopenOnGuardFailure!==false) fail('PRESERVATION_RULE_INVALID');

  const requiredLineageStates=['LINEAGE_AUDIT_REQUIRED','HISTORICAL_CHAIN_IN_PROGRESS','LAST_APPROVED_LINEAGE_PRESERVED_SOURCE','PROMOTION_OMISSION_CONFIRMED','PASS_PRESERVED_VISUAL'];
  if(!requiredLineageStates.every(s=>Array.isArray(LS.states)&&LS.states.includes(s))||LS.candidateToHeadGuardAlreadyProven!==true||LS.humanVisualEvidenceRequiredForVisualPass!==true||LS.noReprocess!==true||LS.noReimport!==true) fail('MODULE_LINEAGE_SEMANTICS_INVALID');

  if(ML.aseguradoras?.status!=='LAST_APPROVED_LINEAGE_PRESERVED_SOURCE'||ML.aseguradoras?.canonicalOwnerId!=='clientInsurerOperationalDirectoryOwner'||ML.aseguradoras?.canonicalOwnerVersion!=='20260723.2'||ML.aseguradoras?.guardStatus!=='ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS'||Number(ML.aseguradoras?.guardChecks)!==16||Number(ML.aseguradoras?.guardFailedChecks)!==0||ML.aseguradoras?.rebuildAllowed!==false||ML.aseguradoras?.reimportAllowed!==false) fail('ASEGURADORAS_LAST_APPROVED_LINEAGE_INVALID');

  const C=ML.cliente360||{},LC=C.lastApprovedDurableCandidate||{},CC=C.certifiedCandidate||{},IP=C.identityProof||{};
  if(C.status!=='LAST_APPROVED_LINEAGE_PRESERVED_SOURCE'||C.lineageClosureClassification!=='PASS'||Number(LC.artifactId)!==9485621192||LC.sourceHead!=='842f762f199f4c7dbf13062a33ca220d92398c51'||LC.acceptanceStatus!=='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS'||Number(LC.fileCount)!==194||Number(LC.deltaCount)!==9||Number(LC.unchangedFileCount)!==185||Number(LC.checksPassed)!==107||Number(CC.artifactId)!==9504702901||CC.sourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||IP.lastApprovedModulesTree!=='f61c22138107cae5971338ad45c2e6225f72da5b'||IP.certifiedCandidateModulesTree!==IP.lastApprovedModulesTree||IP.lastApprovedCliente360Blob!=='fa50bae659ed03909a220d720fc0305838c75b31'||IP.certifiedCandidateCliente360Blob!==IP.lastApprovedCliente360Blob||IP.v21ClosureCommit!=='ef9e0e1e738ce407025ed159067d8b3cc4d2683b'||IP.v22HeadCommit!=='3fbd3e33bb0530c312e27532d116f53e31b88849'||IP.v21PlatformTree!=='dfae6d6281baa247f8cd52db7a8023f0021567e7'||IP.v22PlatformTree!==IP.v21PlatformTree||Number(IP.v22ProductDeltaCount)!==0||IP.v22Classification!=='VALIDATOR_STALE_VALIDATION_INFRASTRUCTURE_ONLY'||IP.promotionOmissionConfirmed!==false||!Array.isArray(C.historicalChainResolved)||!C.historicalChainResolved.includes('v22 block1 gate scope-universe')||C.productMutationAllowedBeforeLineageClose!==false||C.dataMutationAllowed!==false||C.rebuildAllowed!==false||C.reimportAllowed!==false||C.humanVisualEvidenceRequired!==true||C.visualPass!==false||C.liveVisualStatus==='PASS_PRESERVED_VISUAL') fail('CLIENTE360_LAST_APPROVED_LINEAGE_INVALID');

  if(Number(B.artifactId)!==9504702901||B.sourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||B.manifestSha256!=='b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'||B.zipSha256!=='4a3660a18229a923412aa5a1bffc0817b1d5666c83ba96c81c92cea0fce9491c'||Number(B.fileCount)!==194||Number(R.approvedModuleScriptCount)!==53) fail('PRESERVATION_BASELINE_IDENTITY_INVALID');
  const S=L.successorCandidate||{};
  if(Number(S.artifactId)!==Number(B.artifactId)||String(S.sourceHead||'')!==B.sourceHead||String(S.manifestSha256||'')!==B.manifestSha256||String(S.zipSha256||'')!==B.zipSha256||Number(S.fileCount)!==Number(B.fileCount)) fail('LEDGER_CERTIFIED_BASELINE_DIVERGENCE');

  const sequence=Array.isArray(R.visualValidationSequence)?R.visualValidationSequence:[];
  if(sequence[0]!=='aseguradoras'||sequence[1]!=='cliente360'||sequence[2]!=='polizas') fail('MODULE_VISUAL_SEQUENCE_DIVERGENCE',{sequence:sequence.slice(0,3)});

  const head=git(['rev-parse','HEAD']);
  try{git(['merge-base','--is-ancestor',B.sourceHead,head]);}catch{fail('CERTIFIED_SOURCE_NOT_ANCESTOR',{head,baselineSourceHead:B.sourceHead});}
  try{git(['merge-base','--is-ancestor',LC.sourceHead,B.sourceHead]);}catch{fail('CLIENTE360_LAST_APPROVED_SOURCE_NOT_IN_CERTIFIED_LINEAGE',{lastApprovedSourceHead:LC.sourceHead,baselineSourceHead:B.sourceHead});}

  const lastModules=git(['rev-parse',`${LC.sourceHead}:orbit360-platform/modules`]);
  const certifiedModules=git(['rev-parse',`${B.sourceHead}:orbit360-platform/modules`]);
  const lastCliente=git(['rev-parse',`${LC.sourceHead}:orbit360-platform/modules/cliente360.js`]);
  const certifiedCliente=git(['rev-parse',`${B.sourceHead}:orbit360-platform/modules/cliente360.js`]);
  const v21Platform=git(['rev-parse',`${IP.v21ClosureCommit}:orbit360-platform`]);
  const v22Platform=git(['rev-parse',`${IP.v22HeadCommit}:orbit360-platform`]);
  if(lastModules!==IP.lastApprovedModulesTree||certifiedModules!==IP.certifiedCandidateModulesTree||lastModules!==certifiedModules) fail('CLIENTE360_MODULE_TREE_IDENTITY_DIVERGENCE',{lastModules,certifiedModules});
  if(lastCliente!==IP.lastApprovedCliente360Blob||certifiedCliente!==IP.certifiedCandidateCliente360Blob||lastCliente!==certifiedCliente) fail('CLIENTE360_BLOB_IDENTITY_DIVERGENCE',{lastCliente,certifiedCliente});
  if(v21Platform!==IP.v21PlatformTree||v22Platform!==IP.v22PlatformTree||v21Platform!==v22Platform) fail('CLIENTE360_V22_PRODUCT_OMISSION_ASSUMPTION_INVALID',{v21Platform,v22Platform});

  const pathspecs=Array.isArray(F.paths)?F.paths:[];
  if(!pathspecs.length) fail('PRODUCT_SOURCE_FREEZE_PATHS_MISSING');
  const diff=git(['diff','--name-only',B.sourceHead,'HEAD','--',...pathspecs]);
  const changed=diff?diff.split(/\r?\n/).filter(Boolean):[];
  if(changed.length) fail('UNAPPROVED_PRODUCT_SOURCE_DELTA',{head,baselineSourceHead:B.sourceHead,changedFiles:changed});
  const missing=(R.approvedModuleScripts||[]).filter(p=>!fs.existsSync(A('orbit360-platform/'+p)));
  if(missing.length) fail('APPROVED_MODULE_SCRIPT_MISSING',{missing});

  const out={ok:true,status:'CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS',classification:'PASS',contractVersion:'v2-module-lineage',baselineArtifactId:B.artifactId,baselineSourceHead:B.sourceHead,manifestSha256:B.manifestSha256,zipSha256:B.zipSha256,fileCount:B.fileCount,approvedModuleScriptCount:R.approvedModuleScriptCount,currentHead:head,changedProductFilesSinceBaseline:0,sourceStatus:'PASS_PRESERVED_SOURCE',candidateToHeadStatus:'CANDIDATE_PRESERVED',moduleLineageContractStatus:'MODULE_LINEAGE_CONTRACT_PASS',aseguradorasLineageStatus:ML.aseguradoras.status,cliente360LineageStatus:C.status,cliente360LineageProofStatus:'CLIENTE360_LAST_APPROVED_LINEAGE_PRESERVATION_PASS',cliente360LastApprovedArtifactId:LC.artifactId,cliente360LastApprovedSourceHead:LC.sourceHead,cliente360ModulesTree:certifiedModules,cliente360BlobSha:certifiedCliente,cliente360V22ProductDeltaCount:IP.v22ProductDeltaCount,cliente360VisualPass:false,liveVisualStatus:R.validationSemantics?.liveVisualStatus||'PENDING',noReprocess:true,noReimport:true,sourceOnly:true,runtime:false,browser:false,secrets:false,firestoreRead:false,writes:false,deploy:false,productionTouched:false,containsPII:false,containsSecrets:false};
  console.log(JSON.stringify(out,null,2));
}catch(error){
  fail('CERTIFIED_PRODUCT_PRESERVATION_UNEXPECTED',{detail:String(error?.message||error)});
}
