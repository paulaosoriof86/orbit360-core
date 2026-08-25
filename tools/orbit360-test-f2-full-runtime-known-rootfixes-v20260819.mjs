#!/usr/bin/env node
'use strict';
// F2_SEMANTIC_BEHAVIORAL_ONE_SHOT_V15
// Pre-provider semantic audit: current accepted request + durable candidate certification + canonical workflow topology owner.
// Implementation-text literals are not used as behavioral proof.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const REQUEST_PATH=String(process.env.ORBIT360_REQUEST_FILE||'').trim();
const OUT=path.resolve(process.env.ORBIT360_F2_KNOWN_ROOTFIXES_EVIDENCE||path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/f2-full-runtime-known-rootfixes-selftest-v20260819.json'));
const P={
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',
  contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',
  registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',
  workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs'
};
const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3';
const need=(v,c)=>{if(!v)throw new Error(c);};
const A=p=>path.join(ROOT,p);
const json=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const write=p=>{fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(p,null,2)+'\n','utf8');console.log(JSON.stringify(p,null,2));};
const parse=s=>{try{return JSON.parse(String(s||'').trim());}catch{return null;}};
const runJson=(rel,env={})=>{const r=spawnSync(process.execPath,[A(rel)],{cwd:ROOT,encoding:'utf8',env:{...process.env,...env}});return{r,j:parse(r.stdout)};};

try{
  need(REQUEST_PATH&&fs.existsSync(A(REQUEST_PATH)),'VALIDATOR_STALE:F2_RUNTIME_REQUEST_NOT_RESOLVED');
  for(const p of Object.values(P))need(fs.existsSync(A(p)),`PIPELINE_MECHANISM_FAILURE:F2_SEMANTIC_DEPENDENCY_MISSING:${p}`);
  const r=json(REQUEST_PATH),ledger=json(P.ledger),authority=json(P.authority),contract=json(P.contract),registry=json(P.registry),c=ledger.successorCandidate||{},closure=ledger.macro2Closure||{},runId=Number(process.env.GITHUB_RUN_ID||0);
  const certPath=String(authority.candidateCertificationEvidence||'').trim();
  need(certPath&&fs.existsSync(A(certPath)),'VALIDATOR_STALE:F2_CANONICAL_CERTIFICATION_POINTER_MISSING');
  const cert=json(certPath);

  const oneShotAcceptanceBehavioralPass=r.schemaVersion===REQUEST_SCHEMA&&r.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'&&r.approved===true&&r.allowedExecutions===0&&r.consumed===false&&r.authorizationFrozen===true&&r.replayAllowed===false&&r.historical===false&&r.runtimeAttemptAccepted===true&&Number(r.runtimeAttemptCount)===1&&runId>0&&Number(r.runtimeRunId)===runId&&Number(ledger.authorizationBoundary?.runtimeRunId)===runId&&ledger.authorizationBoundary?.runtimeAttemptAccepted===true;
  need(oneShotAcceptanceBehavioralPass,'VALIDATOR_STALE:F2_RUNTIME_REQUEST_IDENTITY_INVALID');
  need(/^[a-f0-9]{64}$/.test(String(r.authorizationIdentityDigest||'')),'VALIDATOR_STALE:F2_RUNTIME_AUTH_IDENTITY_MISSING');
  need(Number(authority.candidate?.artifactId)===Number(c.artifactId)&&authority.candidate?.sourceHead===c.sourceHead&&authority.candidate?.artifactDigest===c.artifactDigest,'VALIDATOR_STALE:F2_AUTHORITY_LEDGER_CANDIDATE_DRIFT');
  need(Number(r.candidateArtifactId)===Number(c.artifactId)&&r.candidateSourceHead===c.sourceHead&&r.candidateArtifactDigest===c.artifactDigest,'VALIDATOR_STALE:F2_RUNTIME_LEDGER_CANDIDATE_MISMATCH');

  const certDelta=Number(cert.deltaCount),certUnchanged=Number(cert.unchangedFileCount),certChecks=Number(cert.checksPassed),fileCount=Number(c.fileCount);
  const dynamicCounts=Number.isInteger(fileCount)&&fileCount>0&&Number.isInteger(certDelta)&&certDelta>=0&&certDelta<=fileCount&&certUnchanged===fileCount-certDelta&&Number.isInteger(certChecks)&&certChecks>0;
  const durableCertificationPass=/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&Number(cert.artifactId)===Number(c.artifactId)&&cert.sourceHead===c.sourceHead&&cert.artifactDigest===c.artifactDigest&&cert.zipSha256===c.zipSha256&&cert.manifestSha256===c.manifestSha256&&Number(cert.fileCount)===fileCount&&dynamicCounts&&cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false&&closure.status==='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS'&&closure.evidencePath===certPath&&Number(closure.runId)===Number(cert.runId)&&Number(closure.checksPassed)===certChecks&&Number(closure.deltaCount)===certDelta&&Number(closure.fileCount)===fileCount&&Number(closure.unchangedFileCount)===certUnchanged;
  need(durableCertificationPass,'VALIDATOR_STALE:F2_MACRO2_DURABLE_CERTIFICATION_CONTRACT_INVALID');

  const semanticContractPass=contract.active===true&&contract.behavioralContractPolicy?.sourceTextMayNotProveBehavior===true&&contract.behavioralContractPolicy?.literalImplementationStringChecksForbidden===true&&contract.behavioralContractPolicy?.behavioralExecutionRequiredForCriticalTransitions===true&&contract.behavioralContractPolicy?.runtimeRunIdentityMustPropagateEndToEnd===true&&contract.behavioralContractPolicy?.runtimeRegisterMustBeReadOnly===true&&contract.behavioralContractPolicy?.runtimeRouterMustSupportF2V3Natively===true&&contract.behavioralSelftestRequirements?.attemptAcceptTransitionTest===true&&contract.behavioralSelftestRequirements?.secondAttemptMustStopRetry===true&&contract.behavioralSelftestRequirements?.preProviderGatePathTest===true&&contract.behavioralSelftestRequirements?.runtimeRunIdBindingSimulation===true&&contract.behavioralSelftestRequirements?.runtimeRegisterReadOnlyBehavioralTest===true&&contract.behavioralSelftestRequirements?.nativeRuntimeRouterBehavioralTest===true;
  need(semanticContractPass,'VALIDATOR_STALE:F2_SEMANTIC_BEHAVIORAL_CONTRACT_INCOMPLETE');
  const registryPass=registry.active===true&&registry.sourceOfTruth===P.ledger&&registry.policies?.behavioralValidatorsUseSemanticContract===true&&registry.policies?.sourceTextBehaviorValidationForbidden===true&&registry.policies?.oneShotBudgetConsumedBeforeRuntimePreflight===true&&registry.policies?.runtimeAttemptBoundToGithubRunId===true&&registry.policies?.stopRetryMechanicallyEnforced===true;
  need(registryPass,'VALIDATOR_STALE:F2_WRITER_REGISTRY_BEHAVIORAL_POLICY_INCOMPLETE');

  const workflowSource=String(process.env.ORBIT360_F2_WORKFLOW_SOURCE_FILE||'').trim();
  const audit=runJson(P.workflowAudit,workflowSource?{ORBIT360_WORKFLOW_SOURCE_FILE:workflowSource}:{});
  const workflowTopologySemanticPass=audit.r.status===0&&audit.j?.ok===true&&audit.j?.status==='WORKFLOW_CONTROL_SURFACE_AUDIT_PASS'&&Number(audit.j?.totalWorkflowFiles)===1&&Number(audit.j?.unauthorizedControlWorkflows)===0&&audit.j?.semanticPolicy?.gateOrderByTechnicalStepIds===true&&audit.j?.semanticPolicy?.providerDependencyRequired===true&&audit.j?.semanticPolicy?.candidateHardcodingForbidden===true&&audit.j?.semanticPolicy?.authorizationHardcodingForbidden===true&&audit.j?.semanticPolicy?.operationalRevisionHardcodingForbidden===true&&audit.j?.semanticPolicy?.singleValidatedPublicationTransactionRequired===true&&audit.j?.semanticPolicy?.regressionReopenStatePredicateSingleOwnerRequired===true;
  need(workflowTopologySemanticPass,'VALIDATOR_STALE:F2_WORKFLOW_TOPOLOGY_SEMANTIC_AUDIT_FAIL');

  write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v15-semantic-behavioral',ok:true,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SEMANTIC_AUDIT_PASS',classification:'PASS',validatorRevision:'F2_SEMANTIC_BEHAVIORAL_ONE_SHOT_V15',candidateArtifactId:Number(r.candidateArtifactId),candidateSourceHead:r.candidateSourceHead,candidateCertificationEvidence:certPath,certificationSchema:cert.schemaVersion,macro2DurableCertificationValidated:true,oneShotAcceptanceBehavioralPass:true,runtimeRunId:runId,runtimeAttemptAccepted:true,allowedExecutions:0,semanticContractPass:true,writerRegistryPass:true,workflowTopologySemanticPass:true,sourceTextBehaviorProofUsed:false,literalImplementationStringChecksUsed:false,behavioralAuthority:'CANONICAL_REQUEST_STATE_PLUS_SEMANTIC_CONTRACT_PLUS_WORKFLOW_TOPOLOGY_OWNER',browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false});
}catch(error){write({schemaVersion:'orbit360-f2-full-runtime-known-rootfixes-selftest-v15-semantic-behavioral',ok:false,status:'F2_FULL_RUNTIME_KNOWN_ROOTFIXES_SEMANTIC_AUDIT_FAIL',classification:String(error?.message||error).split(':')[0]||'VALIDATOR_STALE',error:String(error?.message||error).slice(0,900),sourceTextBehaviorProofUsed:false,literalImplementationStringChecksUsed:false,browserExecuted:false,runtimeExecuted:false,secretAccess:false,firestoreRead:false,writes:0,containsPII:false,containsSecrets:false});process.exitCode=41;}
