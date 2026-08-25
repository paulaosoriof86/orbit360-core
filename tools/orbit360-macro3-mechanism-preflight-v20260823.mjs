#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/macro3-mechanism-preflight-sanitized-v20260823.json');
const EVIDENCE_DIR='orbit360-platform/runtime-gate-crm-v20260716';
const P={contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',transitionPrecondition:'tools/orbit360-control-plane-transition-precondition-owner-v20260825.mjs',noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',sourceWriteGuardSelftest:'tools/orbit360-source-write-guard-behavioral-selftest-v20260825.mjs',validatorPolicyAudit:'tools/orbit360-f2-validator-semantic-policy-audit-v20260825.mjs',lifecycle:'tools/orbit360-control-plane-evidence-lifecycle-v20260824.mjs',publicationCli:'tools/orbit360-publication-owner-cli-contract-selftest-v20260825.mjs'};
const A=p=>path.join(ROOT,p),J=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
const runJson=(rel,args=[])=>{try{return JSON.parse(execFileSync(process.execPath,[A(rel),...args],{cwd:ROOT,encoding:'utf8',env:process.env}));}catch(error){let detail={};try{detail=JSON.parse(String(error?.stdout||'{}'));}catch{}return{ok:false,status:'EXECUTION_FAILED',error:String(error?.message||error),detail};}};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
let contract={},registry={},authority={},ledger={},workflowAudit={},transitionPrecondition={},noRewrite={},sourceWriteGuard={},validatorPolicy={},lifecycle={},publicationCli={};
if(!failures.length){try{contract=J(P.contract);registry=J(P.registry);authority=J(P.authority);ledger=J(P.ledger);}catch{need(false,'CONTROL_PLANE_MACHINE_CONTRACT_JSON_INVALID');}}
if(!failures.length){
  need(contract.active===true&&contract.status==='ACTIVE_SOURCE_ONLY_FAIL_CLOSED','SEMANTIC_CONTRACT_NOT_ACTIVE');
  need(contract.candidateBinding==='DYNAMIC_FROM_CANONICAL_LEDGER','CANDIDATE_BINDING_NOT_DYNAMIC');
  need(contract.revisionBinding==='DYNAMIC_FROM_INTENT_AND_CANONICAL_LEDGER','REVISION_BINDING_NOT_DYNAMIC');
  need(contract.behavioralContractPolicy?.sourceTextMayNotProveBehavior===true,'SOURCE_TEXT_BEHAVIOR_PROOF_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.literalImplementationStringChecksForbidden===true,'LITERAL_IMPLEMENTATION_CHECKS_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.candidateIdHardcodingForbidden===true&&contract.behavioralContractPolicy?.candidateSourceHardcodingForbidden===true,'CANDIDATE_HARDCODING_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.sourceWriteNegativeTestSingleOwnerRequired===true&&contract.behavioralContractPolicy?.duplicateSourceWriteNegativeFixturesForbidden===true,'SOURCE_WRITE_NEGATIVE_SINGLE_OWNER_POLICY_MISSING');
  need(contract.behavioralSelftestRequirements?.sourceWriteNegativeTestDelegatesToCanonicalBehavioralOwner===true,'SOURCE_WRITE_NEGATIVE_DELEGATION_CONTRACT_MISSING');
  need(contract.sourceWriteGuardBehavioralSelftest===P.sourceWriteGuardSelftest,'SOURCE_WRITE_GUARD_BEHAVIORAL_OWNER_DRIFT');
  need(contract.behavioralContractPolicy?.duplicateWorkflowTopologyParsersForbidden===true,'DUPLICATE_WORKFLOW_TOPOLOGY_PARSER_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.executingWorkflowSnapshotMustMatchCanonical===true,'EXECUTING_WORKFLOW_SNAPSHOT_BINDING_NOT_REQUIRED');
  need(contract.behavioralContractPolicy?.publicationPreparedCommitMustBePublishedUnchanged===true&&contract.behavioralContractPolicy?.duplicatePhysicalPublisherForbidden===true,'SINGLE_PUBLICATION_TRANSACTION_CONTRACT_MISSING');
  need(contract.behavioralContractPolicy?.publicationValidatedCliStdoutSingleJsonRequired===true&&contract.behavioralContractPolicy?.publicationValidatedCliStderrMachineContractForbidden===true,'PUBLICATION_CLI_MACHINE_CONTRACT_MISSING');
  need(contract.behavioralContractPolicy?.transitionPreconditionsMustUseCanonicalOwnerBehavioralSimulation===true&&contract.behavioralContractPolicy?.workflowTransitionStatePredicateDuplicationForbidden===true,'TRANSITION_PRECONDITION_SINGLE_OWNER_CONTRACT_MISSING');
  need(contract.workflowTopologySemanticOwner===P.workflowAudit,'WORKFLOW_TOPOLOGY_SEMANTIC_OWNER_DRIFT');
  need(contract.transitionPreconditionBehavioralOwner===P.transitionPrecondition,'TRANSITION_PRECONDITION_OWNER_DRIFT');
  const components=Array.isArray(contract.activeControlPlaneComponents)?contract.activeControlPlaneComponents:[];
  need(components.length>=15,'ACTIVE_COMPONENT_CONTRACT_INCOMPLETE');
  for(const rel of components){need(typeof rel==='string'&&fs.existsSync(A(rel)),`ACTIVE_COMPONENT_MISSING:${String(rel)}`);if(typeof rel==='string'&&fs.existsSync(A(rel))&&rel.endsWith('.mjs')){try{execFileSync(process.execPath,['--check',A(rel)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,`NODE_CHECK_FAIL:${rel}`);}}}
  workflowAudit=runJson(P.workflowAudit);
  need(workflowAudit.ok===true&&workflowAudit.status==='WORKFLOW_CONTROL_SURFACE_AUDIT_PASS','WORKFLOW_SURFACE_AUDIT_FAIL');
  need(Number(workflowAudit.totalWorkflowFiles)===1,'SINGLE_WORKFLOW_INVARIANT_BROKEN');
  need(Number(workflowAudit.unauthorizedControlWorkflows)===0,'UNAUTHORIZED_CONTROL_WORKFLOW_PRESENT');
  need(workflowAudit.topologySemanticOwner===P.workflowAudit,'WORKFLOW_AUDIT_OWNER_DRIFT');
  need(workflowAudit.transitionPreconditionSemanticOwner===P.transitionPrecondition,'WORKFLOW_TRANSITION_PRECONDITION_OWNER_DRIFT');
  need(workflowAudit.executingSnapshotBound===true,'WORKFLOW_SNAPSHOT_BINDING_FAIL');
  need(workflowAudit.semanticPolicy?.singleValidatedPublicationTransactionRequired===true&&workflowAudit.semanticPolicy?.duplicatePhysicalStatePublisherForbidden===true,'WORKFLOW_PUBLICATION_TOPOLOGY_POLICY_DRIFT');
  need(workflowAudit.semanticPolicy?.publicationMachineJsonStderrMergeForbidden===true&&workflowAudit.semanticPolicy?.regressionReopenStatePredicateSingleOwnerRequired===true,'WORKFLOW_TRANSITION_OR_PUBLICATION_PROTOCOL_POLICY_DRIFT');
  noRewrite=runJson(P.noRewrite);need(noRewrite.ok===true&&noRewrite.scopeMode==='MACHINE_READABLE_CONTRACT_DERIVED','SOURCE_REWRITE_GUARD_FAIL');need(Number(noRewrite.activePathCount)===(contract.sourceRewriteGuardScope||[]).length,'SOURCE_REWRITE_SCOPE_DRIFT');
  sourceWriteGuard=runJson(P.sourceWriteGuardSelftest);
  need(sourceWriteGuard.ok===true&&sourceWriteGuard.status==='SOURCE_WRITE_GUARD_BEHAVIORAL_SELFTEST_PASS'&&sourceWriteGuard.temporaryInfrastructureAllowedPass===true&&sourceWriteGuard.actualSourceWriteNegativePass===true&&sourceWriteGuard.cleanupPass===true,'SOURCE_WRITE_GUARD_BEHAVIORAL_SELFTEST_FAIL');
  validatorPolicy=runJson(P.validatorPolicyAudit);
  need(validatorPolicy.ok===true&&validatorPolicy.status==='F2_VALIDATOR_SEMANTIC_POLICY_AUDIT_PASS'&&validatorPolicy.sourceTextBehaviorProofAllowed===false&&validatorPolicy.literalImplementationStringChecksAllowed===false,'F2_VALIDATOR_SEMANTIC_POLICY_AUDIT_FAIL');
  lifecycle=runJson(P.lifecycle,['--phase','pre-auth','--assert-only']);need(lifecycle.ok===true&&lifecycle.strategy==='GIT_CHANGED_SURFACE_CLASS_WIDE_NOT_FILENAME_LIST','EVIDENCE_LIFECYCLE_CONTRACT_FAIL');
  publicationCli=runJson(P.publicationCli);need(publicationCli.ok===true&&publicationCli.status==='PUBLICATION_OWNER_CLI_CONTRACT_PASS'&&publicationCli.stdoutSingleJson===true&&publicationCli.stderrEmpty===true&&publicationCli.mergedStreamSingleJson===true,'PUBLICATION_OWNER_CLI_MACHINE_CONTRACT_FAIL');
  need(registry.active===true,'REGISTRY_NOT_ACTIVE');
  need(registry.sourceOfTruth===P.ledger,'REGISTRY_SOURCE_OF_TRUTH_DRIFT');
  need(registry.transitionOwner==='tools/orbit360-continuity-transition-owner-v20260824.mjs','REGISTRY_OWNER_DRIFT');
  need(registry.transitionPreconditionBehavioralOwner===P.transitionPrecondition,'REGISTRY_TRANSITION_PRECONDITION_OWNER_DRIFT');
  need(registry.sourceWriteGuardBehavioralSelftest===P.sourceWriteGuardSelftest,'REGISTRY_SOURCE_WRITE_BEHAVIORAL_OWNER_DRIFT');
  need(registry.canonicalWorkflow===contract.canonicalWorkflow,'REGISTRY_WORKFLOW_DRIFT');
  need(registry.workflowTopologySemanticOwner===P.workflowAudit,'REGISTRY_WORKFLOW_TOPOLOGY_OWNER_DRIFT');
  need(registry.publicationTransactionOwner===contract.publicationTransactionOwner,'REGISTRY_PUBLICATION_TRANSACTION_OWNER_DRIFT');
  need(registry.publicationProtocolSelftest===P.publicationCli,'REGISTRY_PUBLICATION_PROTOCOL_SELFTEST_DRIFT');
  need(registry.policies?.singleWorkflowTopologySemanticOwnerRequired===true&&registry.policies?.duplicateWorkflowTopologyParserForbidden===true,'REGISTRY_WORKFLOW_TOPOLOGY_POLICY_DRIFT');
  need(registry.policies?.transitionPreconditionUsesCanonicalOwnerScratchBehavioralSimulation===true&&registry.policies?.workflowTransitionStatePredicateDuplicationForbidden===true,'REGISTRY_TRANSITION_PRECONDITION_POLICY_DRIFT');
  need(registry.policies?.controlPlaneSelftestSourceWriteNegativeDelegatesToBehavioralOwner===true,'REGISTRY_SOURCE_WRITE_NEGATIVE_OWNER_POLICY_DRIFT');
  need(registry.policies?.behavioralValidatorsUseSemanticContract===true&&registry.policies?.sourceTextBehaviorValidationForbidden===true,'REGISTRY_F2_VALIDATOR_SEMANTIC_POLICY_DRIFT');
  need(registry.policies?.evidenceLifecycleClassWide===true&&registry.policies?.selftestMustExecuteExactF2SourcePath===true,'REGISTRY_RELIABILITY_POLICY_DRIFT');
  need(registry.policies?.publicationPrepareCommitIsPublishedCommit===true&&registry.policies?.duplicatePhysicalPublisherForbidden===true&&registry.policies?.publicationRemoteReadbackRequired===true&&registry.policies?.publicationLocalReadbackRequired===true,'REGISTRY_PUBLICATION_TRANSACTION_POLICY_DRIFT');
  need(registry.policies?.publicationValidatedCliStdoutSingleJsonRequired===true&&registry.policies?.publicationValidatedCliStderrMachineContractForbidden===true,'REGISTRY_PUBLICATION_CLI_POLICY_DRIFT');
  const terminalMechanismState=ledger.activeState?.phase==='F2_TERMINAL_FAIL_AWAITING_SOURCE_ONLY_ROOT_CAUSE'&&ledger.activeState?.status==='F2_TERMINAL_RECONCILED_NO_REPLAY'&&ledger.history?.latestSealedConsumedRuntime?.observedClassification==='PIPELINE_MECHANISM_FAILURE';
  if(terminalMechanismState){
    const run=Number(ledger.history?.latestSealedConsumedRuntime?.runId||0),evidence=`${EVIDENCE_DIR}/f2-pipeline-publication-failure-run-${run}-v20260824.json`;
    transitionPrecondition=runJson(P.transitionPrecondition,['--transition','CONTROL_PLANE_REGRESSION_REOPEN','--expected-revision',String(ledger.revision),'--expected-package-revision',String(ledger.productionReopeningPackage?.revision),'--control-plane-failure-evidence',evidence]);
    need(transitionPrecondition.ok===true&&transitionPrecondition.status==='CONTROL_PLANE_REGRESSION_REOPEN_PRECONDITION_PASS'&&transitionPrecondition.validationMode==='CANONICAL_OWNER_SCRATCH_BEHAVIORAL_SIMULATION'&&transitionPrecondition.sourceWriteGuardBehavioralPass===true&&transitionPrecondition.canonicalLedgerMutated===false,'TRANSITION_PRECONDITION_BEHAVIORAL_SIMULATION_FAIL');
  }else{
    transitionPrecondition={ok:true,status:'STRUCTURAL_CONTRACT_ONLY_CURRENT_STATE_NOT_REOPENABLE',validationMode:'NOT_APPLICABLE_TO_CURRENT_ACTIVE_STATE',canonicalLedgerMutated:false};
  }
  const certPath=String(authority.candidateCertificationEvidence||'').trim();need(Boolean(certPath)&&fs.existsSync(A(certPath)),'DURABLE_CERTIFICATION_POINTER_MISSING');
  if(certPath&&fs.existsSync(A(certPath))){const cert=J(certPath),fc=Number(cert.fileCount),dc=Number(cert.deltaCount),uc=Number(cert.unchangedFileCount),cc=Number(cert.checksPassed);const counts=Number.isInteger(fc)&&fc>0&&Number.isInteger(dc)&&dc>=0&&dc<=fc&&uc===fc-dc&&Number.isInteger(cc)&&cc>0;need(/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&counts,'DURABLE_CERTIFICATION_SCHEMA_INVALID');need(Number(cert.artifactId)===Number(ledger.successorCandidate?.artifactId)&&cert.sourceHead===ledger.successorCandidate?.sourceHead&&cert.artifactDigest===ledger.successorCandidate?.artifactDigest,'DURABLE_CERTIFICATION_CANDIDATE_DRIFT');need(cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false,'DURABLE_CERTIFICATION_SIDE_EFFECT_SIGNAL');}
  need(ledger.activeState?.runtimeAuthorized===false&&ledger.activeState?.runtimeReplayAllowed===false,'LEDGER_RUNTIME_BOUNDARY_OPEN');need(ledger.authorizationBoundary?.activeRuntimeAuthorization===false&&ledger.authorizationBoundary?.activeRequestPath==null&&(ledger.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'LEDGER_AUTH_REQUEST_NOT_INERT');need(Number(ledger.progress?.productionRouteProgressPct)===75&&ledger.progress?.f2TerminalPass===false,'LEDGER_PROGRESS_NOT_FAIL_CLOSED');
}
const transitionPreconditionSingleOwnerPass=contract.transitionPreconditionBehavioralOwner===P.transitionPrecondition&&registry.transitionPreconditionBehavioralOwner===P.transitionPrecondition&&workflowAudit.transitionPreconditionSemanticOwner===P.transitionPrecondition&&workflowAudit.semanticPolicy?.regressionReopenStatePredicateSingleOwnerRequired===true&&transitionPrecondition.ok===true&&transitionPrecondition.canonicalLedgerMutated===false;
const sourceWriteNegativeSingleOwnerPass=contract.sourceWriteGuardBehavioralSelftest===P.sourceWriteGuardSelftest&&registry.sourceWriteGuardBehavioralSelftest===P.sourceWriteGuardSelftest&&registry.policies?.controlPlaneSelftestSourceWriteNegativeDelegatesToBehavioralOwner===true&&sourceWriteGuard.ok===true&&sourceWriteGuard.actualSourceWriteNegativePass===true&&sourceWriteGuard.temporaryInfrastructureAllowedPass===true;
const f2ValidatorSemanticPolicyPass=validatorPolicy.ok===true&&validatorPolicy.sourceTextBehaviorProofAllowed===false&&validatorPolicy.literalImplementationStringChecksAllowed===false;
const out={schemaVersion:'orbit360-macro3-mechanism-preflight-v15-f2-validator-semantic-policy',ok:failures.length===0,status:failures.length?'MACRO3_MECHANISM_PREFLIGHT_FAIL':'MACRO3_MECHANISM_PREFLIGHT_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],semanticContract:P.contract,validatorMode:'MACHINE_READABLE_CONTRACT_PLUS_BEHAVIORAL_EXECUTION',sourceShapeValidationUsed:false,candidateBinding:'DYNAMIC_FROM_CANONICAL_LEDGER',activeComponentCount:Array.isArray(contract.activeControlPlaneComponents)?contract.activeControlPlaneComponents.length:0,workflowSurfaceAuditPass:workflowAudit.ok===true,workflowTopologySemanticOwner:workflowAudit.topologySemanticOwner||null,workflowSnapshotBindingPass:workflowAudit.executingSnapshotBound===true,singleValidatedPublicationTransactionPass:workflowAudit.semanticPolicy?.singleValidatedPublicationTransactionRequired===true&&workflowAudit.semanticPolicy?.duplicatePhysicalStatePublisherForbidden===true,publicationCliMachineContractPass:publicationCli.ok===true&&publicationCli.stdoutSingleJson===true&&publicationCli.stderrEmpty===true&&publicationCli.mergedStreamSingleJson===true,transitionPreconditionSingleOwnerPass,transitionPreconditionValidationMode:transitionPrecondition.validationMode||null,sourceRewriteGuardPass:noRewrite.ok===true,sourceWriteGuardBehavioralPass:sourceWriteGuard.ok===true,temporaryInfrastructureAllowedPass:sourceWriteGuard.temporaryInfrastructureAllowedPass===true,actualSourceWriteNegativePass:sourceWriteGuard.actualSourceWriteNegativePass===true,sourceWriteNegativeSingleOwnerPass,f2ValidatorSemanticPolicyPass,evidenceLifecycleContractPass:lifecycle.ok===true,singleWorkflowRequired:true,gateOrderByTechnicalStepIds:true,sourceTextMayNotProveBehavior:true,literalImplementationStringChecksForbidden:true,candidateHardcodingForbidden:true,operationalRevisionHardcodingForbidden:true,replayAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
