#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.cwd();
const A=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,'');
const json=p=>JSON.parse(read(p));
const writeJson=(p,x)=>fs.writeFileSync(A(p),JSON.stringify(x,null,2)+'\n','utf8');
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8'}).trim();
const WR='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const WF='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const INV='tools/orbit360-single-state-invariant-v20260827.mjs';
const FROZEN='orbit360-platform/docs/orbit360-control-plane-frozen-baseline-v20260827.json';
const SR='orbit360-platform/docs/orbit360-post-go-live-successor-source-registry-v20260828.json';
const ROOTFIX='tools/orbit360-validar-aseguradoras-credentials-rootfix-v20260828.mjs';

for(const p of [WR,WF,INV,FROZEN,SR,ROOTFIX])if(!fs.existsSync(A(p)))throw new Error(`BOOTSTRAP_SYNC_MISSING:${p}`);

const R=json(WR);R.schemaVersion='orbit360-continuity-writer-registry-v36-explicit-product-overlay';R.revision=49;
const G=R.preservationGuards?.certifiedProductBaseline;if(!G)throw new Error('BOOTSTRAP_SYNC_PRESERVATION_GUARD_MISSING');
Object.assign(G,{status:'ACTIVE_EXPLICIT_OVERLAY_PRODUCT_INTEGRITY_FAIL_CLOSED',registrySchemaVersion:'orbit360-certified-product-preservation-registry-v4-explicit-overlay',expectedContractVersion:'v4-explicit-overlay-integrity',explicitOverlayAcceptanceRequired:true,functionsSourceIncluded:true});
const S=R.executionTransitions?.POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE;if(!S)throw new Error('BOOTSTRAP_SYNC_STAGE_TRANSITION_MISSING');
S.successorSourceContract={registry:SR,candidateBinding:'GIT_COMMIT_PLUS_PER_FILE_BLOBS_PLUS_DIFF_DIGEST',candidateWorkspace:'GIT_WORKTREE_TEMP_ONLY',mutatesCertifiedBaseline:false,baselineAcceptanceSeparate:true,automaticAcceptanceForbidden:true,automaticDeployForbidden:true};
const C=R.executionTransitions?.POST_GO_LIVE_PRODUCT_SUCCESSOR_ACCEPT_SOURCE_ONLY;if(!C)throw new Error('BOOTSTRAP_SYNC_ACCEPT_TRANSITION_MISSING');
C.successorAcceptanceContract={registry:SR,requiresStagePass:true,stageRunBindingRequired:true,gitCandidateBindingRequired:true,perFileBeforeAfterBindingRequired:true,transactionalApplyRequired:true,preservationRegistryPromotionRequired:true,rollbackBeforePublicationRequired:true,terminalPublicationExactSurfaceRequired:true,sourceOnly:true};
R.policies={...(R.policies||{}),postGoLiveSuccessorAcceptancePromotesExplicitOverlay:true,productSourceMutationRequiresGitBoundAcceptance:true,runtimeCapabilitySourcePassCannotCloseVisibleDefect:true};
writeJson(WR,R);

let wf=read(WF);
wf=wf.replaceAll('v3-static-product-integrity','v4-explicit-overlay-integrity');
wf=wf.replace('.changedProductFilesSinceBaseline==0 and .noReprocess==true','.changedProductFilesSinceBaseline==0 and .unexpectedProductFilesSinceBaseline==0 and .noReprocess==true');
fs.writeFileSync(A(WF),wf,'utf8');

let inv=read(INV);
const start=inv.indexOf('function assertSuccessorSource(R,SR){');
const end=inv.indexOf('\nfunction structural(){',start);
if(start<0||end<0)throw new Error('BOOTSTRAP_SYNC_INVARIANT_SUCCESSOR_BLOCK_NOT_FOUND');
const replacement=`function assertSuccessorSource(R,SR){
  if(R.successorSourceRegistry!==SUCCESSOR_REG)throw new Error('SUCCESSOR_SOURCE_REGISTRY_BINDING_INVALID');
  if(SR.schemaVersion!=='orbit360-post-go-live-successor-source-registry-v4-git-bound-overlay'||Number(SR.contractRevision)!==4||SR.status!=='ACTIVE_SOURCE_ONLY_GIT_BOUND_EXPLICIT_BASELINE_ACCEPTANCE'||SR.transitionId!=='POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE'||SR.sourceOnly!==true||SR.runtimeAllowed!==false||SR.browserAllowed!==false||SR.secretAccessAllowed!==false||SR.firestoreReadAllowed!==false||SR.dataWritesAllowed!==false||SR.deployAllowed!==false||SR.productionAllowed!==false||SR.mutatesCertifiedBaseline!==false||SR.baselineAcceptanceSeparate!==true||SR.automaticAcceptanceForbidden!==true||SR.automaticDeployForbidden!==true||SR.handler!==SUCCESSOR_HANDLER||SR.containsPII!==false||SR.containsSecrets!==false)throw new Error('SUCCESSOR_SOURCE_REGISTRY_STATIC_CONTRACT_INVALID');
  if(SR.certifiedBaseline?.sourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||SR.certifiedBaseline?.manifestSha256!=='b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'||Number(SR.certifiedBaseline?.artifactId)!==9504702901)throw new Error('SUCCESSOR_SOURCE_BASELINE_BINDING_INVALID');
  const s=R.executionTransitions?.POST_GO_LIVE_PRODUCT_SUCCESSOR_SOURCE_STAGE;if(!s||s.capabilityClass!=='SOURCE_ONLY'||s.stateMutation!=='CLAIM_TERMINAL'||s.handler!==SUCCESSOR_HANDLER||s.handlerReady!==true||s.requiresExplicitUserAuthorization!==false||s.freezeProductDuringClaim!==true||s.freezeDataDuringClaim!==true||s.successorSourceContract?.registry!==SUCCESSOR_REG||s.successorSourceContract?.candidateBinding!=='GIT_COMMIT_PLUS_PER_FILE_BLOBS_PLUS_DIFF_DIGEST'||s.successorSourceContract?.baselineAcceptanceSeparate!==true||s.successorSourceContract?.automaticAcceptanceForbidden!==true||s.successorSourceContract?.automaticDeployForbidden!==true)throw new Error('SUCCESSOR_SOURCE_TRANSITION_INVALID');for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(s.requiredScope?.[k]!==false)throw new Error(\`SUCCESSOR_SOURCE_TRANSITION_SCOPE_INVALID:\${k}\`);
  const ac=SR.acceptanceContract||{},a=R.executionTransitions?.POST_GO_LIVE_PRODUCT_SUCCESSOR_ACCEPT_SOURCE_ONLY;
  if(ac.transitionId!=='POST_GO_LIVE_PRODUCT_SUCCESSOR_ACCEPT_SOURCE_ONLY'||ac.handler!==SUCCESSOR_ACCEPT_HANDLER||ac.sourceOnly!==true||ac.requiresStagePass!==true||ac.stageRunBindingRequired!==true||ac.candidateHeadBindingRequired!==true||ac.diffDigestBindingRequired!==true||ac.perFileBeforeAfterBindingRequired!==true||ac.transactionalApplyRequired!==true||ac.preservationRegistryPromotionRequired!==true||ac.rollbackBeforePublicationRequired!==true||ac.terminalPublicationExactSurfaceRequired!==true)throw new Error('SUCCESSOR_ACCEPTANCE_REGISTRY_CONTRACT_INVALID');
  if(!a||a.capabilityClass!=='SOURCE_ONLY'||a.stateMutation!=='CLAIM_TERMINAL'||a.handler!==SUCCESSOR_ACCEPT_HANDLER||a.handlerReady!==true||a.requiresExplicitUserAuthorization!==false||a.freezeProductDuringClaim!==true||a.freezeDataDuringClaim!==true||a.successorAcceptanceContract?.registry!==SUCCESSOR_REG||a.successorAcceptanceContract?.gitCandidateBindingRequired!==true||a.successorAcceptanceContract?.transactionalApplyRequired!==true||a.successorAcceptanceContract?.preservationRegistryPromotionRequired!==true||a.successorAcceptanceContract?.terminalPublicationExactSurfaceRequired!==true)throw new Error('SUCCESSOR_ACCEPTANCE_TRANSITION_INVALID');for(const k of ['runtime','browser','secrets','firestoreRead','deploy','production','firestoreWrites','authWrites','operationalWrites','dataWrites','main','merge'])if(a.requiredScope?.[k]!==false)throw new Error(\`SUCCESSOR_ACCEPTANCE_SCOPE_INVALID:\${k}\`);
  if(!fs.existsSync(A('tools/orbit360-validar-aseguradoras-credentials-rootfix-v20260828.mjs')))throw new Error('SUCCESSOR_PROFILE_VALIDATOR_MISSING');
  const publisher=T(PUBLISHER);if(!publisher.includes('SUCCESSOR_ACCEPTANCE_PUBLICATION_SURFACE_INCOMPLETE')||!publisher.includes('acceptedTargetPaths')||!publisher.includes('preservationRegistry'))throw new Error('SUCCESSOR_ACCEPTANCE_PUBLICATION_FAIL_CLOSED_MISSING');
}`;
inv=inv.slice(0,start)+replacement+inv.slice(end);
inv=inv.replace("P.schemaVersion!=='orbit360-certified-product-preservation-registry-v3-static-integrity'","P.schemaVersion!=='orbit360-certified-product-preservation-registry-v4-explicit-overlay'");
inv=inv.replace("if(!wf.includes('CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS')||!wf.includes('v3-static-product-integrity')||!wf.includes('SINGLE_STATE_ANTI_STALE_SELFTEST_PASS'))","if(!wf.includes('CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS')||!wf.includes('v4-explicit-overlay-integrity')||!wf.includes('unexpectedProductFilesSinceBaseline')||!wf.includes('SINGLE_STATE_ANTI_STALE_SELFTEST_PASS'))");
fs.writeFileSync(A(INV),inv,'utf8');

const B=json(FROZEN);B.schemaVersion='orbit360-control-plane-frozen-baseline-v17-explicit-product-overlay';
B.semanticSingleStateRules={...(B.semanticSingleStateRules||{}),explicitProductOverlayBaselinePromotion:true,productSourceAcceptanceBoundToGitCandidate:true,successorPublicationSurfaceDerivedFromAcceptedTargetPaths:true,runtimeCapabilitySourcePassCannotCloseVisibleDefect:true};
B.sourceIdentities={...(B.sourceIdentities||{}),[ROOTFIX]:''};
for(const p of Object.keys(B.sourceIdentities)){if(!fs.existsSync(A(p)))throw new Error(`BOOTSTRAP_SYNC_FROZEN_SOURCE_MISSING:${p}`);B.sourceIdentities[p]=git(['hash-object','--',p]);}
writeJson(FROZEN,B);

console.log(JSON.stringify({ok:true,status:'ORBIT360_BOOTSTRAP_OVERLAY_CONSUMER_SYNC_PASS',classification:'PASS',writerRevision:R.revision,preservationContract:G.expectedContractVersion,successorRegistrySchema:json(SR).schemaVersion,frozenSchema:B.schemaVersion,sourceIdentityCount:Object.keys(B.sourceIdentities).length,containsPII:false,containsSecrets:false},null,2));
