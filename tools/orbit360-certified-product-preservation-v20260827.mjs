#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REG='orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const A=p=>path.join(ROOT,p);const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');const json=p=>JSON.parse(read(p));
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024}).trim();
const fail=(code,detail={})=>{console.error(JSON.stringify({ok:false,status:'CERTIFIED_PRODUCT_BASELINE_PRESERVATION_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code,...detail,sourceOnly:true,runtime:false,browser:false,secrets:false,firestoreRead:false,writes:false,deploy:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));process.exit(42);};
function blobOfFile(p){if(!fs.existsSync(A(p)))return'ABSENT';return git(['hash-object','--',p]);}
try{
  if(!fs.existsSync(A(REG))||!fs.existsSync(A(LEDGER)))fail('PRESERVATION_DEPENDENCY_MISSING');
  const R=json(REG),L=json(LEDGER),B=R.baseline||{},F=R.sourceFreeze||{},P=R.preservationRule||{},O=R.activeOverlay||{};
  if(R.schemaVersion!=='orbit360-certified-product-preservation-registry-v4-explicit-overlay'||R.status!=='ACTIVE_EXPLICIT_OVERLAY_PRODUCT_INTEGRITY_FAIL_CLOSED'||R.stateBearing!==false||R.dynamicStateForbidden!==true||R.dynamicOperationalStateAuthority!==LEDGER)fail('PRESERVATION_REGISTRY_STATIC_CONTRACT_INVALID');
  for(const k of ['approvedProductBaselineIsReference','candidateToHeadPreservationRequired','historicalPassPlusSameArtifactMeansNoBusinessReprocess','visualAnomalyDoesNotAuthorizeRebuild','visualAnomalyDoesNotAuthorizeReimport','productDeltaRequiresNewExplicitlyAcceptedBaseline','explicitOverlayRequiredForPostBaselineProductDelta'])if(P[k]!==true)fail('PRESERVATION_RULE_INVALID',{rule:k});
  for(const k of ['productMutationOnGuardFailure','dataMutationOnGuardFailure','goLiveReopenOnGuardFailure'])if(P[k]!==false)fail('PRESERVATION_RULE_INVALID',{rule:k});
  if(P.functionalAcceptanceStateForbiddenHere!==true||P.moduleLineageStateForbiddenHere!==true)fail('PRESERVATION_RULE_INVALID');
  if(Number(B.artifactId)!==9504702901||B.sourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||B.manifestSha256!=='b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'||B.zipSha256!=='4a3660a18229a923412aa5a1bffc0817b1d5666c83ba96c81c92cea0fce9491c'||Number(B.fileCount)!==194||Number(R.approvedModuleScriptCount)!==53)fail('PRESERVATION_HISTORICAL_BASELINE_IDENTITY_INVALID');
  const S=L.successorCandidate||{};if(Number(S.artifactId)!==Number(B.artifactId)||String(S.sourceHead||'')!==B.sourceHead||String(S.manifestSha256||'')!==B.manifestSha256||String(S.zipSha256||'')!==B.zipSha256||Number(S.fileCount)!==Number(B.fileCount))fail('LEDGER_HISTORICAL_BASELINE_DIVERGENCE');
  if(O.schemaVersion!=='orbit360-certified-product-active-overlay-v1'||O.mode!=='HISTORICAL_ARTIFACT_PLUS_EXPLICIT_OVERLAY'||O.baseSourceHead!==B.sourceHead||!Array.isArray(O.acceptedFiles))fail('ACTIVE_OVERLAY_CONTRACT_INVALID');
  const head=git(['rev-parse','HEAD']);try{git(['merge-base','--is-ancestor',B.sourceHead,head]);}catch{fail('CERTIFIED_SOURCE_NOT_ANCESTOR',{head,baselineSourceHead:B.sourceHead});}
  const paths=Array.isArray(F.paths)?F.paths:[];if(!paths.length||!paths.includes('functions/'))fail('PRODUCT_SOURCE_FREEZE_PATHS_INVALID');
  const raw=git(['diff','--name-only',B.sourceHead,'--',...paths]);const actual=raw?raw.split(/\r?\n/).filter(Boolean).sort():[];
  const accepted=[...O.acceptedFiles].map(x=>String(x.path||'')).sort();if(new Set(accepted).size!==accepted.length)fail('ACTIVE_OVERLAY_DUPLICATE_PATH');
  const unexpected=actual.filter(p=>!accepted.includes(p)),missing=accepted.filter(p=>!actual.includes(p));if(unexpected.length||missing.length)fail('UNAPPROVED_PRODUCT_SOURCE_DELTA',{head,baselineSourceHead:B.sourceHead,unexpectedFiles:unexpected,missingAcceptedFiles:missing,actualChangedFiles:actual,acceptedOverlayFiles:accepted});
  for(const row of O.acceptedFiles){if(!row||typeof row.path!=='string'||!row.path||!/^(?:[A-Za-z0-9._/-]+)$/.test(row.path)||!['bootstrap_grandfathered','explicit_acceptance'].includes(String(row.acceptanceKind||'')))fail('ACTIVE_OVERLAY_ROW_INVALID');if(!/^(?:[a-f0-9]{40}|ABSENT)$/.test(String(row.beforeGitBlobSha||''))||!/^[a-f0-9]{40}$/.test(String(row.afterGitBlobSha||'')))fail('ACTIVE_OVERLAY_BLOB_BINDING_INVALID',{path:row.path});const current=blobOfFile(row.path);if(current!==row.afterGitBlobSha)fail('ACTIVE_OVERLAY_CURRENT_BLOB_MISMATCH',{path:row.path,current,expected:row.afterGitBlobSha});}
  const scripts=Array.isArray(R.approvedModuleScripts)?R.approvedModuleScripts:[];if(scripts.length!==Number(R.approvedModuleScriptCount))fail('APPROVED_MODULE_SCRIPT_COUNT_INVALID');const absent=scripts.filter(p=>!fs.existsSync(A('orbit360-platform/'+p)));if(absent.length)fail('APPROVED_MODULE_SCRIPT_MISSING',{missing:absent});
  const forbidden=['moduleLineage','liveVisualStatus','visualPass','openDelta','visualValidationSequence','candidateToHeadLastSuccessfulRunId','candidateWideRecheckRunId','lastCausalGuardRunId'],serialized=JSON.stringify(R),present=forbidden.filter(k=>serialized.includes(`"${k}"`));if(present.length)fail('STATIC_PRODUCT_REGISTRY_CONTAINS_OPERATIONAL_STATE',{present});
  console.log(JSON.stringify({ok:true,status:'CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS',classification:'PASS',contractVersion:'v4-explicit-overlay-integrity',baselineArtifactId:B.artifactId,baselineSourceHead:B.sourceHead,manifestSha256:B.manifestSha256,zipSha256:B.zipSha256,fileCount:B.fileCount,approvedModuleScriptCount:R.approvedModuleScriptCount,currentHead:head,changedProductFilesSinceBaseline:0,unexpectedProductFilesSinceBaseline:0,acceptedOverlayFilesSinceHistoricalBaseline:accepted.length,acceptedOverlayPaths:accepted,sourceStatus:'PASS_PRESERVED_ACTIVE_EXPLICIT_OVERLAY',candidateToHeadStatus:'CANDIDATE_PRESERVED',noReprocess:true,noReimport:true,sourceOnly:true,runtime:false,browser:false,secrets:false,firestoreRead:false,writes:false,deploy:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){fail('CERTIFIED_PRODUCT_PRESERVATION_UNEXPECTED',{detail:String(error?.message||error)});}
