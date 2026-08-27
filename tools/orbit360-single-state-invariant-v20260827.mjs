#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {milestoneKind,ACCESS_RECOVERY,assertReleaseMilestoneFrozen,assertFollowupConsistency} from './orbit360-single-state-contract-v20260827.mjs';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const A=p=>path.join(ROOT,p),T=p=>fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''),J=p=>JSON.parse(T(p)),fail=c=>{throw new Error(c);};
const LEDGER='orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json';
const REG='orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json';
const OWNER='tools/orbit360-single-state-ledger-owner-v20260827.mjs';
const STATE='tools/orbit360-single-state-contract-v20260827.mjs';
const SELF='tools/orbit360-single-state-invariant-v20260827.mjs';
const HANDLER='tools/orbit360-post-go-live-access-recovery-v20260827.mjs';
const WF='.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml';
const CAN='orbit360-platform/docs/orbit360-control-plane-canonicality-contract-v20260822.json';
const SEM='orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json';
const TRANS='tools/orbit360-control-plane-transport-contract-v20260826.json';
const PRODUCT_PRES='tools/orbit360-certified-product-preservation-v20260827.mjs';
const PRODUCT_REG='orbit360-platform/docs/orbit360-certified-product-preservation-registry-v20260827.json';
const ASEG_PRES='tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs';
const ASEG_REG='orbit360-platform/docs/orbit360-aseguradoras-preservation-registry-v20260827.json';
const WRITER_SCHEMA='orbit360-continuity-writer-registry-v27-module-lineage-sync';
const PRODUCT_SCHEMA='orbit360-certified-product-preservation-registry-v2-module-lineage';
const PRODUCT_STATUS='ACTIVE_SOURCE_ONLY_FAIL_CLOSED_WITH_HISTORICAL_LINEAGE';
const PRODUCT_CONTRACT='v2-module-lineage';
const VISUAL_SEQUENCE=['aseguradoras','cliente360','polizas'];
const pointers=['orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json','orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json','orbit360-platform/docs/orbit360-live-state-v1.json','orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md','orbit360-platform/docs/CHECKPOINT-CONTROL-PLANE-HARDENING-20260820.md','README.md'];
function stateOf(x,progress,next){return {activeState:{phase:x.phase,status:x.status},progress:{productionRouteProgressPct:progress,f2TerminalPass:true},nextAction:{id:next}};}

try{
  for(const p of [LEDGER,REG,OWNER,STATE,SELF,HANDLER,WF,CAN,SEM,TRANS,PRODUCT_PRES,PRODUCT_REG,ASEG_PRES,ASEG_REG,...pointers]) if(!fs.existsSync(A(p))) fail(`SINGLE_STATE_DEPENDENCY_MISSING:${p}`);
  const L=J(LEDGER),R=J(REG),C=J(CAN),S=J(SEM),Tr=J(TRANS),G=J(PRODUCT_REG),P=J(ASEG_REG),wf=T(WF),h=T(HANDLER),productGuard=T(PRODUCT_PRES),asegGuard=T(ASEG_PRES);

  if(R.schemaVersion!==WRITER_SCHEMA||Number(R.revision)!==40) fail('SINGLE_STATE_WRITER_REGISTRY_VERSION_STALE');
  if(R.sourceOfTruth!==LEDGER||JSON.stringify(R.stateBearingFiles)!==JSON.stringify([LEDGER])||R.projectionTargets?.length!==0) fail('SINGLE_STATE_REGISTRY_STATE_SURFACE_INVALID');
  if(R.transitionOwner!==OWNER||R.singleStateInvariant!==SELF||R.stateContract!==STATE) fail('SINGLE_STATE_SHARED_STATE_CONTRACT_BINDING_INVALID');
  if(C.singleMutableOperationalState!==LEDGER||C.actualPrBodyStateBearing!==false||S.singleMutableOperationalState!==LEDGER||S.dynamicStateMustBeReadFromLedger!==true) fail('SINGLE_STATE_CANONICALITY_INVALID');
  if(Tr.transport!=='EPHEMERAL_EXECUTION_BRANCH_SINGLE_PUSH'||Tr.statePublication!=='LEDGER_ONLY_REMOTE_CAS') fail('SINGLE_STATE_TRANSPORT_INVALID');

  const globalPg=R.preservationGuards?.certifiedProductBaseline;
  if(!globalPg||globalPg.status!==PRODUCT_STATUS||globalPg.validator!==PRODUCT_PRES||globalPg.registry!==PRODUCT_REG||globalPg.registrySchemaVersion!==PRODUCT_SCHEMA||globalPg.expectedPassStatus!=='CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS'||globalPg.expectedContractVersion!==PRODUCT_CONTRACT||Number(globalPg.baselineArtifactId)!==9504702901||globalPg.baselineSourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||globalPg.baselineManifestSha256!=='b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'||Number(globalPg.approvedModuleScriptCount)!==53||globalPg.candidateToHeadPreservationRequired!==true||globalPg.lastApprovedModuleToCandidateIdentityRequired!==true||globalPg.candidatePreservedDoesNotImplyLastApprovedModulePreserved!==true||globalPg.humanVisualEvidenceRequiredForVisualPass!==true||JSON.stringify(globalPg.visualValidationSequenceStartsWith)!==JSON.stringify(VISUAL_SEQUENCE)||globalPg.preflightBeforeIntentInspection!==true||globalPg.productMutationOnFailure!==false||globalPg.dataMutationOnFailure!==false||globalPg.newBaselineRequiresExplicitAcceptance!==true) fail('CERTIFIED_PRODUCT_PRESERVATION_REGISTRY_BINDING_INVALID');

  if(G.schemaVersion!==PRODUCT_SCHEMA||G.status!==PRODUCT_STATUS||G.baseline?.artifactId!==9504702901||G.baseline?.sourceHead!=='8c9668d6d423e82826b0295431ec699390d79b4b'||G.baseline?.manifestSha256!=='b1c98c1faf644b5d83cfe6e6bb1a602927c438cd85b7855cb0b1a6b98c08053c'||G.baseline?.fileCount!==194||G.approvedModuleScriptCount!==53||G.preservationRule?.candidateToHeadPreservationRequired!==true||G.preservationRule?.lastApprovedModuleToCandidateIdentityRequired!==true||G.preservationRule?.candidatePreservedDoesNotImplyLastApprovedModulePreserved!==true||G.preservationRule?.historicalPassPlusSameArtifactMeansNoBusinessReprocess!==true||G.preservationRule?.visualAnomalyDoesNotAuthorizeRebuild!==true||G.preservationRule?.visualAnomalyDoesNotAuthorizeReimport!==true||G.preservationRule?.retiredHypothesisCannotReopenWithoutNewEvidence!==true||G.preservationRule?.productDeltaRequiresNewExplicitlyAcceptedBaseline!==true||G.preservationRule?.productMutationOnGuardFailure!==false||G.preservationRule?.dataMutationOnGuardFailure!==false||G.preservationRule?.goLiveReopenOnGuardFailure!==false||G.sourceFreeze?.expectedChangedFilesSinceBaseline!==0) fail('CERTIFIED_PRODUCT_PRESERVATION_SEMANTIC_REGISTRY_INVALID');
  if(G.lineageSemantics?.candidateToHeadGuardAlreadyProven!==true||G.lineageSemantics?.humanVisualEvidenceRequiredForVisualPass!==true||G.lineageSemantics?.noReprocess!==true||G.lineageSemantics?.noReimport!==true) fail('CERTIFIED_PRODUCT_LINEAGE_SEMANTICS_INVALID');
  if(G.moduleLineage?.aseguradoras?.status!=='LAST_APPROVED_LINEAGE_PRESERVED_SOURCE'||G.moduleLineage?.aseguradoras?.canonicalOwnerId!=='clientInsurerOperationalDirectoryOwner'||G.moduleLineage?.aseguradoras?.canonicalOwnerVersion!=='20260723.2'||G.moduleLineage?.aseguradoras?.rebuildAllowed!==false||G.moduleLineage?.aseguradoras?.reimportAllowed!==false) fail('ASEGURADORAS_MODULE_LINEAGE_INVALID');
  if(G.moduleLineage?.cliente360?.status!=='HISTORICAL_CHAIN_IN_PROGRESS'||G.moduleLineage?.cliente360?.productMutationAllowedBeforeLineageClose!==false||G.moduleLineage?.cliente360?.dataMutationAllowed!==false||G.moduleLineage?.cliente360?.reimportAllowed!==false) fail('CLIENTE360_MODULE_LINEAGE_INVALID');
  if(JSON.stringify((G.visualValidationSequence||[]).slice(0,3))!==JSON.stringify(VISUAL_SEQUENCE)) fail('MODULE_VISUAL_SEQUENCE_INVALID');

  if(!productGuard.includes('CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS')||!productGuard.includes("contractVersion:'v2-module-lineage'")||!productGuard.includes('CANDIDATE_PRESERVED')||!productGuard.includes('MODULE_LINEAGE_CONTRACT_PASS')||!productGuard.includes("git(['diff','--name-only'")||!productGuard.includes('UNAPPROVED_PRODUCT_SOURCE_DELTA')||!productGuard.includes('approvedModuleScriptCount')) fail('CERTIFIED_PRODUCT_PRESERVATION_GUARD_CONTRACT_INCOMPLETE');
  if(!wf.includes('ORBIT360_CERTIFIED_PRODUCT_PRESERVATION: tools/orbit360-certified-product-preservation-v20260827.mjs')||!wf.includes('CERTIFIED_PRODUCT_BASELINE_PRESERVATION_PASS')||!wf.includes('contractVersion=="v2-module-lineage"')||!wf.includes('candidateToHeadStatus=="CANDIDATE_PRESERVED"')||!wf.includes('moduleLineageContractStatus=="MODULE_LINEAGE_CONTRACT_PASS"')||!wf.includes('aseguradorasLineageStatus=="LAST_APPROVED_LINEAGE_PRESERVED_SOURCE"')||!wf.includes('cliente360LineageStatus=="HISTORICAL_CHAIN_IN_PROGRESS"')||!wf.includes('certified-product-preservation.json')) fail('CERTIFIED_PRODUCT_PRESERVATION_WORKFLOW_NOT_BOUND');

  const pg=R.preservationGuards?.aseguradoras;
  if(!pg||pg.status!=='ACTIVE_SOURCE_ONLY_FAIL_CLOSED'||pg.validator!==ASEG_PRES||pg.registry!==ASEG_REG||pg.expectedPassStatus!=='ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS'||pg.expectedOwnerVersion!=='20260723.2'||pg.expectedLineageStatus!=='LAST_APPROVED_LINEAGE_PRESERVED_SOURCE'||pg.preflightBeforeIntentInspection!==true||pg.productMutationOnFailure!==false||pg.dataMutationOnFailure!==false) fail('ASEGURADORAS_PRESERVATION_REGISTRY_BINDING_INVALID');
  if(P.productStatus!=='PASS_PRESERVED_SOURCE'||P.finalOperationalOwner?.version!=='20260723.2'||P.activePreservationValidator?.path!==ASEG_PRES||P.activePreservationValidator?.expectedPassStatus!=='ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS'||P.antiReprocess?.reimportInsurersForDisplayAccessOwnerGateIssues!==false||P.antiReprocess?.reopenHistoricalM1Gate!==false) fail('ASEGURADORAS_PRESERVATION_SEMANTIC_REGISTRY_INVALID');
  if(!asegGuard.includes("const EXPECTED_VERSION = '20260723.2'")||!asegGuard.includes('bankCopyDirect')||!asegGuard.includes('bankRevealDependency')||!asegGuard.includes('reimportsData')||!asegGuard.includes('ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS')) fail('ASEGURADORAS_PRESERVATION_GUARD_CONTRACT_INCOMPLETE');
  if(!wf.includes('ORBIT360_ASEGURADORAS_PRESERVATION: tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs')||!wf.includes('ASEGURADORAS_FINAL_OWNER_PRESERVATION_PASS')||!wf.includes('aseguradoras-preservation.json')) fail('ASEGURADORAS_PRESERVATION_WORKFLOW_NOT_BOUND');

  if(R.policies?.candidateToHeadAndModuleToCandidateMustRemainSeparate!==true||R.policies?.lastApprovedModuleLineageMustBeProvenBeforeVisualPass!==true||R.policies?.visualPassRequiresHumanEvidence!==true||R.policies?.retiredHypothesisCannotReopenWithoutNewEvidence!==true||R.policies?.moduleVisualSequenceIsAseguradorasThenCliente360ThenPolizas!==true) fail('MODULE_LINEAGE_WRITER_POLICIES_INVALID');

  if(!milestoneKind(L)) fail('SINGLE_STATE_LEDGER_CURRENT_MILESTONE_INVALID');
  assertReleaseMilestoneFrozen(L,fail);
  assertFollowupConsistency(L,fail);
  if(L.activeState?.phase==='PRODUCTION_SMOKE_PASS'&&L.activeState?.status==='PRODUCTION_GO_LIVE_PASS'&&Number(L.progress?.productionRouteProgressPct)!==100) fail('GO_LIVE_RELEASE_PROGRESS_REGRESSION');

  const prep=R.executionTransitions?.POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_PREP,run=R.executionTransitions?.POST_GO_LIVE_ACCESS_RECOVERY_RESET_LINK;
  if(!prep||!run) fail('ACCESS_RECOVERY_TRANSITIONS_MISSING');
  if(prep.capabilityClass!=='SOURCE_ONLY'||prep.requiresExplicitUserAuthorization!==false||prep.requiredScope?.runtime!==false||prep.requiredScope?.secrets!==false||prep.requiredScope?.firestoreRead!==false) fail('ACCESS_RECOVERY_SOURCE_PREP_SCOPE_INVALID');
  if(run.capabilityClass!=='AUTH_RECOVERY'||run.requiresExplicitUserAuthorization!==true||run.requiredScope?.runtime!==true||run.requiredScope?.secrets!==true||run.requiredScope?.firestoreRead!==true||run.requiredScope?.authWrites!==false||run.requiredScope?.deploy!==false||run.requiredScope?.production!==false) fail('ACCESS_RECOVERY_RUNTIME_SCOPE_INVALID');
  const rc=run.accessRecoveryContract||{};
  if(rc.historicalGateId!==ACCESS_RECOVERY.gateId||rc.historicalAuthorizationConsumed!==true||rc.historicalAuthorizationReuseAllowed!==false||rc.projectId!==ACCESS_RECOVERY.projectId||rc.tenantId!==ACCESS_RECOVERY.tenantId||rc.targetEmailHash!==ACCESS_RECOVERY.targetEmailHash||rc.forbiddenDemoEmailHash!==ACCESS_RECOVERY.forbiddenDemoEmailHash||rc.targetCount!==1||rc.maxResetLinks!==1||rc.directPasswordSets!==0||rc.authUserMutations!==0||rc.membershipMutations!==0||rc.roleScopeMutations!==0||rc.deploys!==0||rc.goLiveReopenForbidden!==true) fail('ACCESS_RECOVERY_CONTRACT_INVALID');

  for(const [id,s] of Object.entries(R.executionTransitions||{})){
    if(s.handlerReady===true&&!fs.existsSync(A(s.handler))) fail(`SINGLE_STATE_HANDLER_MISSING:${id}`);
    if(s.stateMutation==='CLAIM_TERMINAL'){
      const cp=Number(s.from?.progress),claim=stateOf(s.claimState,cp,s.claimState?.nextAction);
      if(!milestoneKind(claim)) fail(`SINGLE_STATE_CONTRACT_PARITY_CLAIM_FAIL:${id}`);
      for(const t of [s.terminalPassState,s.terminalFailState]) if(t&&!milestoneKind(stateOf(t,Number(t.progress),t.nextAction))) fail(`SINGLE_STATE_CONTRACT_PARITY_TERMINAL_FAIL:${id}:${t.nextAction}`);
    }
  }

  for(const bad of ['updateUser(','setCustomUserClaims(','deleteUser(','createUser(','updatePassword','password=']) if(h.includes(bad)) fail(`ACCESS_RECOVERY_FORBIDDEN_AUTH_MUTATION_TOKEN:${bad}`);
  if(!h.includes('generatePasswordResetLink')||!h.includes('resetLinksGenerated:1')||!h.includes('privateArtifactPrepared:true')||!h.includes('forbiddenDemoIdentityBlocked:true')) fail('ACCESS_RECOVERY_HANDLER_CONTRACT_INCOMPLETE');
  if(!wf.includes("ORBIT360_STATE_CONTRACT: tools/orbit360-single-state-contract-v20260827.mjs")||!wf.includes("ORBIT360_OWNER: tools/orbit360-single-state-ledger-owner-v20260827.mjs")||!wf.includes("ORBIT360_INVARIANT: tools/orbit360-single-state-invariant-v20260827.mjs")||!wf.includes('POST_GO_LIVE_ACCESS_RECOVERY_SOURCE_ONLY_PASS')||!wf.includes('AUTH_RECOVERY')) fail('SINGLE_STATE_WORKFLOW_ACCESS_RECOVERY_NOT_BOUND');

  for(const p of pointers){const t=T(p);if(/"ledgerRevision"|"packageRevision"|productionRouteProgressPct|AWAIT_EXPLICIT_GO_LIVE_AUTHORIZATION|F2_TERMINAL_PASS_AWAITING_AUTHORIZED_GO_LIVE/.test(t)) fail(`SINGLE_STATE_POINTER_CONTAINS_DYNAMIC_STATE:${p}`);}
  if(L.progress?.f2TerminalPass===true){
    const e=L.continuityControl?.latestDurableEvidence;
    if(Number(e?.runId)!==32920087220||e?.type!=='F2_TERMINAL_PASS_ARTIFACT') fail('SINGLE_STATE_LEDGER_TERMINAL_POINTER_INVALID');
    const E=J(e.path);
    if(E.ok!==true||E.classification!=='PASS'||Number(E.firestoreWrites)!==0||Number(E.authWrites)!==0||Number(E.operationalWrites)!==0||E.deployExecuted!==false||E.productionHostingTouched!==false) fail('SINGLE_STATE_TERMINAL_EVIDENCE_INVALID');
  }

  console.log(JSON.stringify({ok:true,status:'SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_PASS',singleMutableOperationalState:LEDGER,stateContract:STATE,writerRegistrySchemaVersion:WRITER_SCHEMA,writerRegistryRevision:40,currentMilestone:milestoneKind(L),stateParityPass:true,postGoLiveAccessRecoveryContractPass:true,certifiedProductPreservationGuardPass:true,productPreservationContractVersion:PRODUCT_CONTRACT,candidateToHeadStatus:'CANDIDATE_PRESERVED',moduleToCandidateLineageContractPass:true,certifiedProductBaselineArtifactId:9504702901,certifiedProductBaselineSourceHead:'8c9668d6d423e82826b0295431ec699390d79b4b',approvedModuleScriptCount:53,aseguradorasPreservationGuardPass:true,aseguradorasExpectedOwnerVersion:'20260723.2',aseguradorasLineageStatus:'LAST_APPROVED_LINEAGE_PRESERVED_SOURCE',cliente360LineageStatus:'HISTORICAL_CHAIN_IN_PROGRESS',visualValidationSequence:VISUAL_SEQUENCE,historicalAuthorizationReuseAllowed:false,goLiveReopenForbidden:true,humanPasswordProofSeparatedFromCustomTokenProof:true,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false},null,2));
}catch(error){
  console.error(JSON.stringify({ok:false,status:'SINGLE_STATE_CONTROL_PLANE_STATIC_INVARIANT_FAIL',classification:'PIPELINE_MECHANISM_FAILURE',code:String(error?.message||error),containsPII:false,containsSecrets:false}));
  process.exit(41);
}
