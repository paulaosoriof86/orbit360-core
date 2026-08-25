#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT=process.env.ORBIT360_ROOT?path.resolve(process.env.ORBIT360_ROOT):process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/macro3-mechanism-preflight-sanitized-v20260823.json');
const P={contract:'orbit360-platform/docs/orbit360-control-plane-semantic-contract-v20260824.json',registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json',workflowAudit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',noRewrite:'tools/orbit360-control-plane-no-source-rewrite-guard-v20260824.mjs',lifecycle:'tools/orbit360-control-plane-evidence-lifecycle-v20260824.mjs'};
const A=p=>path.join(ROOT,p),J=p=>JSON.parse(fs.readFileSync(A(p),'utf8').replace(/^\uFEFF/,''));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
const runJson=(rel,args=[])=>{try{return JSON.parse(execFileSync(process.execPath,[A(rel),...args],{cwd:ROOT,encoding:'utf8',env:process.env}));}catch(error){let detail={};try{detail=JSON.parse(String(error?.stdout||'{}'));}catch{}return{ok:false,status:'EXECUTION_FAILED',error:String(error?.message||error),detail};}};
for(const p of Object.values(P))need(fs.existsSync(A(p)),`MISSING:${p}`);
let contract={},registry={},authority={},ledger={},workflowAudit={},noRewrite={},lifecycle={};
if(!failures.length){try{contract=J(P.contract);registry=J(P.registry);authority=J(P.authority);ledger=J(P.ledger);}catch{need(false,'CONTROL_PLANE_MACHINE_CONTRACT_JSON_INVALID');}}
if(!failures.length){
  need(contract.active===true&&contract.status==='ACTIVE_SOURCE_ONLY_FAIL_CLOSED','SEMANTIC_CONTRACT_NOT_ACTIVE');
  need(contract.candidateBinding==='DYNAMIC_FROM_CANONICAL_LEDGER','CANDIDATE_BINDING_NOT_DYNAMIC');
  need(contract.revisionBinding==='DYNAMIC_FROM_INTENT_AND_CANONICAL_LEDGER','REVISION_BINDING_NOT_DYNAMIC');
  need(contract.behavioralContractPolicy?.sourceTextMayNotProveBehavior===true,'SOURCE_TEXT_BEHAVIOR_PROOF_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.literalImplementationStringChecksForbidden===true,'LITERAL_IMPLEMENTATION_CHECKS_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.candidateIdHardcodingForbidden===true&&contract.behavioralContractPolicy?.candidateSourceHardcodingForbidden===true,'CANDIDATE_HARDCODING_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.duplicateWorkflowTopologyParsersForbidden===true,'DUPLICATE_WORKFLOW_TOPOLOGY_PARSER_NOT_FORBIDDEN');
  need(contract.behavioralContractPolicy?.executingWorkflowSnapshotMustMatchCanonical===true,'EXECUTING_WORKFLOW_SNAPSHOT_BINDING_NOT_REQUIRED');
  need(contract.behavioralContractPolicy?.publicationPreparedCommitMustBePublishedUnchanged===true&&contract.behavioralContractPolicy?.duplicatePhysicalPublisherForbidden===true,'SINGLE_PUBLICATION_TRANSACTION_CONTRACT_MISSING');
  need(contract.workflowTopologySemanticOwner===P.workflowAudit,'WORKFLOW_TOPOLOGY_SEMANTIC_OWNER_DRIFT');
  const components=Array.isArray(contract.activeControlPlaneComponents)?contract.activeControlPlaneComponents:[];
  need(components.length>=15,'ACTIVE_COMPONENT_CONTRACT_INCOMPLETE');
  for(const rel of components){need(typeof rel==='string'&&fs.existsSync(A(rel)),`ACTIVE_COMPONENT_MISSING:${String(rel)}`);if(typeof rel==='string'&&fs.existsSync(A(rel))&&rel.endsWith('.mjs')){try{execFileSync(process.execPath,['--check',A(rel)],{cwd:ROOT,stdio:'ignore'});}catch{need(false,`NODE_CHECK_FAIL:${rel}`);}}}
  workflowAudit=runJson(P.workflowAudit);
  need(workflowAudit.ok===true&&workflowAudit.status==='WORKFLOW_CONTROL_SURFACE_AUDIT_PASS','WORKFLOW_SURFACE_AUDIT_FAIL');
  need(Number(workflowAudit.totalWorkflowFiles)===1,'SINGLE_WORKFLOW_INVARIANT_BROKEN');
  need(Number(workflowAudit.unauthorizedControlWorkflows)===0,'UNAUTHORIZED_CONTROL_WORKFLOW_PRESENT');
  need(workflowAudit.topologySemanticOwner===P.workflowAudit,'WORKFLOW_AUDIT_OWNER_DRIFT');
  need(workflowAudit.executingSnapshotBound===true,'WORKFLOW_SNAPSHOT_BINDING_FAIL');
  need(workflowAudit.semanticPolicy?.singleValidatedPublicationTransactionRequired===true&&workflowAudit.semanticPolicy?.duplicatePhysicalStatePublisherForbidden===true,'WORKFLOW_PUBLICATION_TOPOLOGY_POLICY_DRIFT');
  noRewrite=runJson(P.noRewrite);need(noRewrite.ok===true&&noRewrite.scopeMode==='MACHINE_READABLE_CONTRACT_DERIVED','SOURCE_REWRITE_GUARD_FAIL');need(Number(noRewrite.activePathCount)===(contract.sourceRewriteGuardScope||[]).length,'SOURCE_REWRITE_SCOPE_DRIFT');
  lifecycle=runJson(P.lifecycle,['--phase','pre-auth','--assert-only']);need(lifecycle.ok===true&&lifecycle.strategy==='GIT_CHANGED_SURFACE_CLASS_WIDE_NOT_FILENAME_LIST','EVIDENCE_LIFECYCLE_CONTRACT_FAIL');
  need(registry.active===true,'REGISTRY_NOT_ACTIVE');
  need(registry.sourceOfTruth===P.ledger,'REGISTRY_SOURCE_OF_TRUTH_DRIFT');
  need(registry.transitionOwner==='tools/orbit360-continuity-transition-owner-v20260824.mjs','REGISTRY_OWNER_DRIFT');
  need(registry.canonicalWorkflow===contract.canonicalWorkflow,'REGISTRY_WORKFLOW_DRIFT');
  need(registry.workflowTopologySemanticOwner===P.workflowAudit,'REGISTRY_WORKFLOW_TOPOLOGY_OWNER_DRIFT');
  need(registry.publicationTransactionOwner===contract.publicationTransactionOwner,'REGISTRY_PUBLICATION_TRANSACTION_OWNER_DRIFT');
  need(registry.policies?.singleWorkflowTopologySemanticOwnerRequired===true&&registry.policies?.duplicateWorkflowTopologyParserForbidden===true,'REGISTRY_WORKFLOW_TOPOLOGY_POLICY_DRIFT');
  need(registry.policies?.evidenceLifecycleClassWide===true&&registry.policies?.selftestMustExecuteExactF2SourcePath===true,'REGISTRY_RELIABILITY_POLICY_DRIFT');
  need(registry.policies?.publicationPrepareCommitIsPublishedCommit===true&&registry.policies?.duplicatePhysicalPublisherForbidden===true&&registry.policies?.publicationRemoteReadbackRequired===true&&registry.policies?.publicationLocalReadbackRequired===true,'REGISTRY_PUBLICATION_TRANSACTION_POLICY_DRIFT');
  const certPath=String(authority.candidateCertificationEvidence||'').trim();need(Boolean(certPath)&&fs.existsSync(A(certPath)),'DURABLE_CERTIFICATION_POINTER_MISSING');
  if(certPath&&fs.existsSync(A(certPath))){const cert=J(certPath),fc=Number(cert.fileCount),dc=Number(cert.deltaCount),uc=Number(cert.unchangedFileCount),cc=Number(cert.checksPassed);const counts=Number.isInteger(fc)&&fc>0&&Number.isInteger(dc)&&dc>=0&&dc<=fc&&uc===fc-dc&&Number.isInteger(cc)&&cc>0;need(/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true&&counts,'DURABLE_CERTIFICATION_SCHEMA_INVALID');need(Number(cert.artifactId)===Number(ledger.successorCandidate?.artifactId)&&cert.sourceHead===ledger.successorCandidate?.sourceHead&&cert.artifactDigest===ledger.successorCandidate?.artifactDigest,'DURABLE_CERTIFICATION_CANDIDATE_DRIFT');need(cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false,'DURABLE_CERTIFICATION_SIDE_EFFECT_SIGNAL');}
  need(ledger.activeState?.runtimeAuthorized===false&&ledger.activeState?.runtimeReplayAllowed===false,'LEDGER_RUNTIME_BOUNDARY_OPEN');need(ledger.authorizationBoundary?.activeRuntimeAuthorization===false&&ledger.authorizationBoundary?.activeRequestPath==null&&(ledger.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'LEDGER_AUTH_REQUEST_NOT_INERT');need(Number(ledger.progress?.productionRouteProgressPct)===75&&ledger.progress?.f2TerminalPass===false,'LEDGER_PROGRESS_NOT_FAIL_CLOSED');
}
const out={schemaVersion:'orbit360-macro3-mechanism-preflight-v11-semantic-registry-publication-transaction',ok:failures.length===0,status:failures.length?'MACRO3_MECHANISM_PREFLIGHT_FAIL':'MACRO3_MECHANISM_PREFLIGHT_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures:[...new Set(failures)],semanticContract:P.contract,validatorMode:'MACHINE_READABLE_CONTRACT_PLUS_BEHAVIORAL_EXECUTION',sourceShapeValidationUsed:false,candidateBinding:'DYNAMIC_FROM_CANONICAL_LEDGER',activeComponentCount:Array.isArray(contract.activeControlPlaneComponents)?contract.activeControlPlaneComponents.length:0,workflowSurfaceAuditPass:workflowAudit.ok===true,workflowTopologySemanticOwner:workflowAudit.topologySemanticOwner||null,workflowSnapshotBindingPass:workflowAudit.executingSnapshotBound===true,singleValidatedPublicationTransactionPass:workflowAudit.semanticPolicy?.singleValidatedPublicationTransactionRequired===true&&workflowAudit.semanticPolicy?.duplicatePhysicalStatePublisherForbidden===true,sourceRewriteGuardPass:noRewrite.ok===true,evidenceLifecycleContractPass:lifecycle.ok===true,singleWorkflowRequired:true,gateOrderByTechnicalStepIds:true,sourceTextMayNotProveBehavior:true,candidateHardcodingForbidden:true,operationalRevisionHardcodingForbidden:true,replayAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);