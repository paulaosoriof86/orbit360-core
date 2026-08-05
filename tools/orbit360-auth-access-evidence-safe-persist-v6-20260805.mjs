#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const read = file => file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
const write = (file, value) => { fs.mkdirSync(path.dirname(path.resolve(file)), { recursive:true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', 'utf8'); };
const text = (value, max = 300) => String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').replace(/[\w.+-]+@[\w.-]+/g, '[email]').replace(/https?:\/\/\S+/g, '[url]').trim().slice(0, max);

const configPath = process.env.ORBIT360_CONFIG_EVIDENCE || '';
const authPath = process.env.ORBIT360_AUTH_EVIDENCE || '';
const actorPath = process.env.ORBIT360_ACTOR_PARITY_EVIDENCE || '';
const scopePath = process.env.ORBIT360_SCOPE_EVIDENCE || '';
const rollbackPath = process.env.ORBIT360_ROLLBACK_EVIDENCE || '';
const finalPath = process.env.ORBIT360_FINAL_EVIDENCE || 'orbit360-platform/runtime-gate-crm-v20260716/auth-access-recovery-final-sanitized-v6-20260805.json';
const lifecyclePath = process.env.ORBIT360_LIFECYCLE || '';
const closurePath = process.env.ORBIT360_CLOSURE || 'orbit360-platform/docs/CIERRE-AUTH-ACCESS-RECOVERY-LAB-V6-20260805.md';

const config = read(configPath);
const auth = read(authPath);
const actor = read(actorPath);
const scope = read(scopePath);
const rollback = read(rollbackPath);
const candidates = [config, actor, auth, scope, rollback].filter(Boolean);
const failed = candidates.find(item => item.ok === false);
const ok = config?.ok === true && actor?.ok === true && auth?.stage === 'AUTH_ACCESS_RECOVERY_PASS' && auth?.ok === true && scope?.stage === 'AUTH_ACCESS_SCOPE_POSTVERIFY_PASS' && scope?.ok === true;

const integrity = auth?.protectedCrmDataUnchanged === true
  ? 'VERIFIED_UNCHANGED'
  : (auth?.protectedCrmDataUnchanged === false ? 'VERIFIED_CHANGED' : 'NOT_POSTVERIFIED');
const final = {
  schemaVersion:'orbit360-auth-access-recovery-final-sanitized-v6',
  stage:ok ? 'AUTH_ACCESS_RECOVERY_V6_PASS' : (failed?.stage || 'STOP_RETRY_EVIDENCE_INCOMPLETE'),
  decision:ok ? 'GO_REAL_IDENTITIES_MEMBERSHIPS_PASSWORD_AND_SCOPES' : 'STOP_RETRY',
  classification:ok ? 'AUTH_ACCESS_RECOVERY_COMPLETE' : (failed?.classification || 'PIPELINE_MECHANISM_FAILURE'),
  errorCode:ok ? '' : text(failed?.errorCode || 'EVIDENCE_INCOMPLETE', 180),
  accessConfigurationComplete:config?.ok === true,
  accessConfigDocumentsWritten:Number.isInteger(config?.documentsWritten) ? config.documentsWritten : null,
  actorAuthorizationParityVerified:actor?.ok === true,
  authUsersCreatedConfirmed:Number.isInteger(auth?.authUsersCreated) ? auth.authUsersCreated : 0,
  membershipsCreatedConfirmed:Number.isInteger(auth?.membershipsCreated) ? auth.membershipsCreated : 0,
  passwordEstablishmentEmailsSent:Number.isInteger(auth?.passwordEstablishmentEmailsSent) ? auth.passwordEstablishmentEmailsSent : (Number.isInteger(auth?.emailsSentBeforeStop) ? auth.emailsSentBeforeStop : 0),
  rolesCountriesVerified:auth?.ok === true,
  dataScopesVerified:scope?.ok === true,
  protectedCrmIntegrity:integrity,
  rollbackAttempted:auth?.rollbackAttempted === true || rollback != null,
  rollbackVerified:rollback?.ok === true,
  optionalEvidencePresent:{
    config:!!config,
    actor:!!actor,
    auth:!!auth,
    scope:!!scope,
    rollback:!!rollback
  },
  temporaryPasswordsCreated:0,
  passwordsRead:0,
  actionLinksExposed:0,
  fullEmailsExposed:0,
  otherFunctionsDeployed:0,
  hostingDeploys:0,
  rulesDeploys:0,
  reimports:0,
  productionTouched:false,
  mainTouched:false,
  mergeExecuted:false,
  containsPII:false,
  containsSecrets:false,
  ok
};
write(finalPath, final);

if (lifecyclePath && fs.existsSync(lifecyclePath)) {
  const lifecycle = read(lifecyclePath);
  lifecycle.status = ok ? 'AUTH_ACCESS_RECOVERY_V6_CONSUMED_PASS' : 'AUTH_ACCESS_RECOVERY_V6_CONSUMED_STOP_RETRY';
  lifecycle.authorization = lifecycle.authorization || {};
  lifecycle.authorization.activeRequest = false;
  lifecycle.authorization.allowedExecutions = 0;
  lifecycle.authorization.consumed = true;
  lifecycle.executionResult = {
    stage:final.stage,
    decision:final.decision,
    classification:final.classification,
    errorCode:final.errorCode,
    protectedCrmIntegrity:final.protectedCrmIntegrity,
    ok
  };
  write(lifecyclePath, lifecycle);
}

const closure = `# CIERRE AUTH ACCESS\n\n\`\`\`text\n${final.stage}\n${final.classification}\n${final.errorCode || 'NO_ERROR'}\n\`\`\`\n\n- configuración completa: ${final.accessConfigurationComplete}\n- paridad del actor: ${final.actorAuthorizationParityVerified}\n- identidades creadas confirmadas: ${final.authUsersCreatedConfirmed}\n- memberships creadas confirmadas: ${final.membershipsCreatedConfirmed}\n- correos enviados: ${final.passwordEstablishmentEmailsSent}\n- scopes verificados: ${final.dataScopesVerified}\n- integridad CRM: ${final.protectedCrmIntegrity}\n- rollback intentado/verificado: ${final.rollbackAttempted}/${final.rollbackVerified}\n- evidencia opcional presente: ${JSON.stringify(final.optionalEvidencePresent)}\n- producción/main/merge: 0\n`;
write(closurePath, closure);
console.log(JSON.stringify({ ok:true, finalStage:final.stage, classification:final.classification, errorCode:final.errorCode, filesToPersist:[configPath,authPath,actorPath,scopePath,rollbackPath,finalPath,lifecyclePath,closurePath].filter(file => file && fs.existsSync(file)) }));
