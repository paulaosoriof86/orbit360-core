#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'orbit360-platform/runtime-gate-crm-v20260716/macro3-mechanism-preflight-sanitized-v20260823.json');
const P={
  workflow:'.github/workflows/orbit360-continuity-canonical-source-only-v20260820.yml',
  owner:'tools/orbit360-continuity-transition-owner-v20260820.mjs',
  engine:'tools/orbit360-validar-gate-contracts-engine-f2-productive-acceptance-v20260819.mjs',
  register:'tools/orbit360-register-f2-productive-acceptance-runtime-v20260819.mjs',
  validator:'tools/orbit360-f2-exact-candidate-source-validator-v20260819.mjs',
  selftest:'tools/orbit360-test-f2-full-runtime-known-rootfixes-v20260819.mjs',
  audit:'tools/orbit360-workflow-operational-surface-audit-v20260820.mjs',
  registry:'orbit360-platform/docs/orbit360-continuity-writer-registry-v20260820.json',
  convergence:'tools/orbit360-control-plane-evidence-convergence-v20260822.mjs',
  authority:'tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json',
  ledger:'orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json'
};
const t=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),j=p=>JSON.parse(t(p));
const failures=[],need=(v,c)=>{if(!v)failures.push(c);};
for(const p of Object.values(P))need(fs.existsSync(path.join(ROOT,p)),`MISSING:${p}`);

if(!failures.length){
  const wf=t(P.workflow),owner=t(P.owner),engine=t(P.engine),register=t(P.register),validator=t(P.validator),selftest=t(P.selftest),audit=t(P.audit),registry=j(P.registry),convergence=t(P.convergence),authority=j(P.authority),L=j(P.ledger);
  const certPath=String(authority.candidateCertificationEvidence||'').trim();
  need(certPath&&fs.existsSync(path.join(ROOT,certPath)),'DURABLE_CERTIFICATION_POINTER_MISSING');
  const cert=certPath&&fs.existsSync(path.join(ROOT,certPath))?j(certPath):{};
  const dir=path.join(ROOT,'.github/workflows');
  const workflows=fs.readdirSync(dir).filter(x=>/\.ya?ml$/i.test(x)).sort();
  need(workflows.length===1&&workflows[0]===path.basename(P.workflow),'MULTIPLE_OR_NONCANONICAL_WORKFLOWS');
  need(wf.includes('MACRO3_INLINE_F2_V1'),'INLINE_F2_MARKER_MISSING');
  need(!/^\s*workflow_dispatch\s*:/mi.test(wf),'WORKFLOW_DISPATCH_EVENT_FORBIDDEN');
  need(!/^\s*workflow_run\s*:/mi.test(wf),'WORKFLOW_RUN_CHAINING_FORBIDDEN');
  need(!wf.includes('/dispatches'),'REST_WORKFLOW_DISPATCH_FORBIDDEN');
  need(!wf.includes('gh workflow run'),'CLI_WORKFLOW_DISPATCH_FORBIDDEN');
  need(!/permissions\s*:[\s\S]{0,500}?actions\s*:\s*write\b/i.test(wf),'ACTIONS_WRITE_FORBIDDEN');
  need(!wf.includes('git pull --rebase'),'REBASE_FORBIDDEN');
  need(wf.includes('F2_RUNTIME_ATTEMPT_ACCEPT'),'ATTEMPT_ACCEPT_STEP_MISSING');
  need(wf.includes('allowedExecutions==0')&&wf.includes('runtimeAttemptAccepted'),'ONE_SHOT_BUDGET_NOT_ENFORCED_IN_WORKFLOW');
  need(wf.includes('Reconcile terminal exactly once through canonical owner'),'TERMINAL_REDUCER_NOT_WIRED');

  const lines=wf.split(/\r?\n/),triggerPaths=[];let inPaths=false;
  for(const line of lines){if(/^\s{4}paths\s*:\s*$/.test(line)){inPaths=true;continue;}if(inPaths&&/^\s{0,2}[A-Za-z_-][^:]*:\s*$/.test(line)){inPaths=false;}if(inPaths){const m=line.match(/^\s*-\s*['"]?([^'"]+)['"]?\s*$/);if(m)triggerPaths.push(m[1]);}}
  const selfTriggerForbidden=['orbit360-platform/docs/orbit360-continuity-ledger-v20260820.json','orbit360-platform/docs/orbit360-production-reopening-package-v20260820.json','orbit360-platform/docs/orbit360-f2-runtime-authorization-boundary-v20260820.json','orbit360-platform/docs/orbit360-live-state-v1.json','orbit360-platform/docs/ORBIT360-CURRENT-DOCUMENTATION-INDEX-v1.json','orbit360-platform/docs/ORBIT360-PR5-CURRENT-STATE.md','orbit360-platform/docs/CHECKPOINT-CONTROL-PLANE-HARDENING-20260820.md','README.md','orbit360-platform/CHANGELOG.md','tools/orbit360-gate-contract-f2-productive-acceptance-v20260820.json','tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-runtime-v20260819.json','tools/orbit360-validator-lifecycle-contract-f2-productive-acceptance-source-v20260819.json','orbit360-platform/runtime-gate-crm-v20260716/f2-runtime-terminal-inline-*'];
  for(const p of selfTriggerForbidden)need(!triggerPaths.includes(p),`INTERNAL_STATE_PUBLICATION_MAY_RETRIGGER:${p}`);

  need(owner.includes("transition==='F2_RUNTIME_ATTEMPT_ACCEPT'"),'OWNER_ATTEMPT_ACCEPT_MISSING');
  need(owner.includes('RUNTIME_ATTEMPT_ALREADY_ACCEPTED_STOP_RETRY'),'OWNER_STOP_RETRY_MISSING');
  need(owner.includes('auth.allowedExecutions!==0')&&owner.includes('req.allowedExecutions!==0'),'TERMINAL_REDUCER_NOT_BOUND_TO_ACCEPTED_BUDGET');
  need(owner.includes('TERMINAL_RUNTIME_RUN_ID_MISMATCH'),'TERMINAL_RUN_BINDING_MISSING');
  need(engine.includes('runtimeAttemptAccepted===true')&&engine.includes('allowedExecutions===0'),'ENGINE_ONE_SHOT_ACCEPT_GUARD_MISSING');
  need(engine.includes('CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY')&&engine.includes('macro2DurableCertificationValidated'),'ENGINE_DURABLE_CERTIFICATION_CONTRACT_MISSING');
  need(!engine.includes("cert.ok===true&&cert.classification==='PASS'"),'ENGINE_IMAGINARY_CERTIFICATION_SCHEMA_PRESENT');
  need(register.includes('runtimeAttemptAccepted===true')&&register.includes('allowedExecutions===0'),'REGISTER_ONE_SHOT_ACCEPT_GUARD_MISSING');
  need(validator.includes("const REQUEST_SCHEMA='orbit360-f2-productive-acceptance-runtime-browser-readonly-request-v3'")&&validator.includes("r.status==='RUNTIME_ATTEMPT_ACCEPTED_PREFLIGHT_PENDING'")&&validator.includes('r.allowedExecutions===0')&&validator.includes('r.runtimeAttemptAccepted===true'),'EXACT_VALIDATOR_V3_ACCEPTED_REQUEST_CONTRACT_MISSING');
  need(validator.includes('CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY')&&validator.includes('macro2DurableCertificationValidated:true'),'EXACT_VALIDATOR_DURABLE_CERTIFICATION_CONTRACT_MISSING');
  need(!validator.includes('F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V2')&&!validator.includes('F2_V2_REQUEST_NOT_ACTIVE')&&!validator.includes('r.allowedExecutions===1'),'EXACT_VALIDATOR_V2_CONTRACT_PRESENT');
  need(selftest.includes('F2_INLINE_ONE_SHOT_ACCEPT_V13'),'SELFTEST_INLINE_CONTRACT_V13_MISSING');
  need(selftest.includes('F2_CANDIDATE_VALIDATOR_V2_CONTRACT_REINTRODUCED'),'SELFTEST_V2_REGRESSION_GUARD_MISSING');
  need(audit.includes('Cross-workflow dispatch, workflow_run chaining and actions:write are forbidden'),'WORKFLOW_AUDIT_ANTI_CHAINING_RULE_MISSING');
  need(convergence.includes('runtimeAttemptAccepted')&&convergence.includes('ATTEMPT_BUDGET_NOT_ZERO')&&convergence.includes('INERT_BOUNDARY_HAS_ACTIVE_BINDING'),'CONVERGENCE_NOT_MACRO3_DYNAMIC');

  need(/^orbit360-macro2-candidate-artifact-metadata-v\d+$/.test(String(cert.schemaVersion||''))&&cert.status==='CANDIDATE_ARTIFACT_PUBLISHED_SOURCE_ONLY'&&cert.sourcePublished===true,'DURABLE_CERTIFICATION_SCHEMA_INVALID');
  need(Number(cert.artifactId)===Number(L.successorCandidate?.artifactId)&&cert.sourceHead===L.successorCandidate?.sourceHead&&cert.artifactDigest===L.successorCandidate?.artifactDigest,'DURABLE_CERTIFICATION_CANDIDATE_DRIFT');
  need(cert.runtimeExecuted===false&&cert.browserExecuted===false&&cert.secretAccess===false&&cert.firestoreRead===false&&Number(cert.writes)===0&&cert.deployExecuted===false&&cert.productionTouched===false,'DURABLE_CERTIFICATION_SIDE_EFFECT_SIGNAL');
  need(L.macro2Closure?.status==='TRANSVERSAL_SOURCE_ACCEPTANCE_PASS'&&L.macro2Closure?.evidencePath===certPath&&Number(L.macro2Closure?.runId)===Number(cert.runId)&&Number(L.macro2Closure?.checksPassed)===107,'LEDGER_MACRO2_CERTIFICATION_DRIFT');

  need(registry.canonicalWorkflow===P.workflow,'REGISTRY_CANONICAL_WORKFLOW_DRIFT');
  need(registry.canonicalWorkflowMode==='INLINE_MACRO3_SOURCE_GATE_ONE_SHOT_ACCEPT_READONLY_RUNTIME_TERMINAL_REDUCER','REGISTRY_MODE_DRIFT');
  need(Array.isArray(registry.workflowClasses?.solePhysicalWorkflow)&&registry.workflowClasses.solePhysicalWorkflow.length===1&&registry.workflowClasses.solePhysicalWorkflow[0]===P.workflow,'REGISTRY_SINGLE_WORKFLOW_DRIFT');
  need(registry.policies?.crossWorkflowDispatchForbidden===true&&registry.policies?.workflowRunChainingForbidden===true&&registry.policies?.actionsWritePermissionForbidden===true,'REGISTRY_CHAINING_POLICY_OPEN');
  need(registry.policies?.oneShotBudgetConsumedBeforeRuntimePreflight===true&&registry.policies?.runtimeAttemptBoundToGithubRunId===true&&registry.policies?.terminalReductionRequiredInSameCanonicalRun===true,'REGISTRY_ONE_SHOT_POLICY_DRIFT');
  need(registry.policies?.internalStatePublicationMustNotRetriggerWorkflow===true,'REGISTRY_SELF_TRIGGER_POLICY_MISSING');
  need(registry.publicationGuard?.workflowDispatchAllowed===false&&registry.publicationGuard?.workflowRunChainingAllowed===false&&registry.publicationGuard?.actionsWriteAllowed===false,'REGISTRY_DISPATCH_GUARD_OPEN');
  need(registry.publicationGuard?.runtimeMayExecuteBeforeAttemptAccept===false&&registry.publicationGuard?.runtimeMayExecuteAfterAttemptAccept===true&&registry.publicationGuard?.runtimeReadOnly===true,'REGISTRY_RUNTIME_BOUNDARY_INVALID');
  need(registry.publicationGuard?.writesMayExecute===false&&registry.publicationGuard?.deployMayExecute===false&&registry.publicationGuard?.productionMayBeTouched===false&&registry.publicationGuard?.mainMayBeTouched===false&&registry.publicationGuard?.mergeMayExecute===false,'REGISTRY_FORBIDDEN_CAPABILITY_OPEN');

  const awaiting=L.nextAction?.id==='AWAIT_EXPLICIT_F2_RUNTIME_AUTHORIZATION_ONE_SHOT';
  if(awaiting){need(L.authorizationBoundary?.activeRuntimeAuthorization===false,'LEDGER_AUTH_ALREADY_ACTIVE_BEFORE_PREFLIGHT');need(L.authorizationBoundary?.activeRequestPath==null,'LEDGER_REQUEST_ALREADY_ACTIVE_BEFORE_PREFLIGHT');need((L.authorizationBoundary?.runtimeAttemptAccepted??false)===false,'LEDGER_ATTEMPT_ALREADY_ACCEPTED_BEFORE_PREFLIGHT');need(L.productionReopeningPackage?.firstIncompleteStep==='F2-RUNTIME-AUTHORIZATION','UNEXPECTED_FIRST_INCOMPLETE_STEP');}
  need(L.activeState?.runtimeAuthorized===false,'LEDGER_RUNTIME_ALREADY_AUTHORIZED_BEFORE_PREFLIGHT');
  need(L.activeState?.runtimeReplayAllowed===false,'LEDGER_REPLAY_NOT_CLOSED');
  need(L.productionReopeningPackage?.status==='CLOSED_PASS','PACKAGE_NOT_CLOSED_PASS');
}
const out={schemaVersion:'orbit360-macro3-mechanism-preflight-v3',ok:failures.length===0,status:failures.length?'MACRO3_MECHANISM_PREFLIGHT_FAIL':'MACRO3_MECHANISM_PREFLIGHT_PASS',classification:failures.length?'PIPELINE_MECHANISM_FAILURE':'PASS',failures,singleWorkflowRequired:true,workflowDispatchForbidden:true,workflowRunChainingForbidden:true,actionsWriteForbidden:true,internalStateSelfTriggerForbidden:true,durableCertificationContractRequired:true,exactCandidateValidatorV3Required:true,selftestV13Required:true,oneShotAcceptedBeforeRuntime:true,allowedExecutionsAfterAccept:0,terminalReducerRequired:true,replayAllowed:false,runtimeExecuted:false,browserExecuted:false,secretAccess:false,firestoreRead:false,firestoreWrites:0,authWrites:0,operationalWrites:0,deployExecuted:false,productionTouched:false,containsPII:false,containsSecrets:false};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(out,null,2)+'\n','utf8');console.log(JSON.stringify(out,null,2));if(!out.ok)process.exit(41);
