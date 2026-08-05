#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const dir = process.env.ORBIT360_EVIDENCE_DIR || 'orbit360-platform/runtime-gate-crm-v20260716';
const finalPath = process.env.ORBIT360_FINAL_EVIDENCE || `${dir}/auth-selfmanaged-credentials-runtime-final-sanitized-v20260805.json`;
const lifecyclePath = process.env.ORBIT360_LIFECYCLE || 'tools/orbit360-validator-lifecycle-contract-auth-selfmanaged-credentials-runtime-v20260805.json';
const closurePath = process.env.ORBIT360_CLOSURE || 'orbit360-platform/docs/CIERRE-AUTH-SELFMANAGED-CREDENTIALS-RUNTIME-20260805.md';
const ledgerPath = `${dir}/auth-selfmanaged-source-stage-ledger-sanitized-v20260805.json`;
const runId = String(process.env.GITHUB_RUN_ID || '');
const read = p => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;

const ledger = read(ledgerPath);
const currentRun = !!runId && ledger?.runId === runId;
const currentRead = name => currentRun ? read(`${dir}/${name}`) : null;
const pre = currentRead('preflight-sanitizado.json');
const identityPlan = currentRead('auth-selfmanaged-identity-plan-sanitized-v20260805.json');
const identityApply = currentRead('auth-selfmanaged-identity-apply-sanitized-v20260805.json');
const census = currentRead('auth-dynamic-team-census-sanitized-v20260805.json');
const foundation = currentRead('auth-dynamic-team-apply-sanitized-v20260805.json');
const membershipSessions = currentRead('auth-dynamic-team-sessions-sanitized-v20260805.json');
const passwords = currentRead('auth-selfmanaged-passwords-sanitized-v20260805.json');
const verify = currentRead('auth-selfmanaged-final-verify-sanitized-v20260805.json');
const containment = currentRead('auth-selfmanaged-containment-sanitized-v20260805.json');
const runtimeEvidence = [identityPlan, identityApply, census, foundation, membershipSessions, passwords, verify, containment];
const failedRuntime = runtimeEvidence.find(item => item?.ok === false);
const sourcePassed = currentRun && ledger?.status === 'pass' && ledger?.classification === 'SOURCE_ONLY_ROOTFIX_PASS';
const ok = sourcePassed && pre?.ok === true && identityPlan?.ok === true && identityApply?.ok === true && census?.ok === true && foundation?.ok === true && membershipSessions?.ok === true && passwords?.ok === true && verify?.ok === true && process.env.FUNCTION_DEPLOYED === 'true' && process.env.HOSTING_DEPLOYED === 'true';
const n = currentRun ? (verify?.activeUsers || passwords?.activeUsers || census?.activeUsersObserved || 0) : 0;
const sourceFailure = currentRun && ledger?.status === 'fail';
const stage = ok
  ? 'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_PASS'
  : sourceFailure
    ? `STOP_RETRY_SOURCE_ONLY_${String(ledger.failedStepId || 'UNKNOWN').toUpperCase()}`
    : (failedRuntime?.stage || 'STOP_RETRY_EVIDENCE_INCOMPLETE');
const classification = ok
  ? 'AUTH_SELFMANAGED_CREDENTIALS_COMPLETE'
  : sourceFailure
    ? (ledger.classification || 'PIPELINE_MECHANISM_FAILURE')
    : (failedRuntime?.classification || 'PIPELINE_MECHANISM_FAILURE');
const errorCode = sourceFailure ? (ledger.errorCode || '') : (failedRuntime?.errorCode || '');

const final = {
  schemaVersion:'orbit360-auth-selfmanaged-credentials-runtime-final-v1',
  runId,
  currentRunLedgerVerified:currentRun,
  staleEvidenceRejected:!currentRun,
  sourceStageStatus:currentRun ? (ledger?.status || 'missing') : 'missing_or_stale',
  sourceFailedStepId:currentRun ? (ledger?.failedStepId || '') : '',
  stage,
  decision:ok?'GO_AUTH_SELFMANAGED_CREDENTIALS_COMPLETE':'STOP_RETRY',
  classification,
  errorCode,
  activeUsers:n,
  identityOverridesApplied:identityApply?.overridesWritten || 0,
  identitiesVerified:verify?.identitiesVerified || 0,
  membershipsVerified:verify?.membershipsVerified || 0,
  teamLinksVerified:verify?.teamLinksVerified || 0,
  temporaryPasswordsAssigned:passwords?.passwordsAssigned || 0,
  passwordLoginsVerified:verify?.passwordLoginsVerified || passwords?.passwordLoginsVerified || 0,
  forcedPasswordChangesVerified:verify?.forcedPasswordChangesVerified || 0,
  adminCanReplaceTemporaryPassword:verify?.adminCanReplaceTemporaryPassword === true,
  userCanChangeOwnPassword:verify?.userCanChangeOwnPassword === true,
  emailAndNameSyncSupported:verify?.emailAndNameSyncSupported === true,
  currentPasswordReadable:false,
  passwordPolicy:'FIRST_NAME_123_STAR',
  plaintextPasswordsPersisted:0,
  passwordHashesPersisted:0,
  functionDeploys:process.env.FUNCTION_DEPLOYED === 'true' ? 1 : 0,
  otherFunctionsDeployed:0,
  hostingDeploys:process.env.HOSTING_DEPLOYED === 'true' ? 1 : 0,
  rulesDeploys:0,
  reimports:0,
  crmIntegrity:verify?.crmIntegrity || 'NOT_POSTVERIFIED',
  rollbackAttempted:process.env.ROLLBACK_OUTCOME === 'success',
  containmentAttempted:process.env.CONTAINMENT_OUTCOME === 'success',
  passwordRollbackExact:false,
  productionTouched:false,
  mainTouched:false,
  mergeExecuted:false,
  containsPII:false,
  containsSecrets:false,
  containsPasswords:false,
  ok
};

fs.writeFileSync(finalPath, JSON.stringify(final, null, 2) + '\n', 'utf8');
const lifecycle = read(lifecyclePath);
if (!lifecycle) throw new Error('PIPELINE_MECHANISM_FAILURE:LIFECYCLE_MISSING');
lifecycle.status = ok ? 'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_CONSUMED_PASS' : 'AUTH_SELFMANAGED_CREDENTIALS_RUNTIME_CONSUMED_STOP_RETRY';
lifecycle.authorization.activeRequest = false;
lifecycle.authorization.allowedExecutions = 0;
lifecycle.authorization.consumed = true;
lifecycle.executionResult = { stage, decision:final.decision, classification, errorCode, activeUsers:n, crmIntegrity:final.crmIntegrity, ok };
fs.writeFileSync(lifecyclePath, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');
fs.writeFileSync(closurePath, `# CIERRE AUTH AUTOADMINISTRABLE\n\n\`\`\`text\n${stage}\n${classification}\nusuarios activos: ${n}\nidentidades: ${final.identitiesVerified}/${n}\nmemberships: ${final.membershipsVerified}/${n}\nEquipo vinculado: ${final.teamLinksVerified}/${n}\ncontraseñas temporales: ${final.temporaryPasswordsAssigned}/${n}\nlogins verificados: ${final.passwordLoginsVerified}/${n}\ncambio obligatorio: ${final.forcedPasswordChangesVerified}/${n}\nCRM: ${final.crmIntegrity}\n\`\`\`\n\n- ledger del run actual: ${currentRun}\n- evidencia previa rechazada: ${!currentRun}\n- patrón inicial: PrimerNombre123*\n- contraseña actual visible: no\n- administración desde Equipo: ${final.adminCanReplaceTemporaryPassword}\n- cambio personal en primer ingreso: ${final.userCanChangeOwnPassword}\n- Function deploys: ${final.functionDeploys}\n- Hosting LAB deploys: ${final.hostingDeploys}\n- Rules/reimportación/producción/main/merge: 0\n`, 'utf8');
console.log(JSON.stringify(final, null, 2));
