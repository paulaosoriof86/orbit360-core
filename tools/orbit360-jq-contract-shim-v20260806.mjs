#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const raw = process.argv.slice(2);
const vars = {};
let rawOutput = false;
let exitStatusMode = false;
let expression = '';
let file = '';

for (let i = 0; i < raw.length; i += 1) {
  const token = raw[i];
  if (token === '-r') { rawOutput = true; continue; }
  if (token === '-e') { exitStatusMode = true; continue; }
  if (token === '--arg') {
    const name = raw[++i];
    const value = raw[++i];
    vars[name] = value;
    continue;
  }
  if (!expression) expression = token;
  else file = token;
}

if (!file || !fs.existsSync(file)) {
  console.error('ORBIT360_JQ_SHIM_FILE_MISSING');
  process.exit(2);
}

let value;
try {
  value = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {
  console.error('ORBIT360_JQ_SHIM_INVALID_JSON');
  process.exit(2);
}

const eq = (actual, expected) => actual === expected;
const zero = actual => Number(actual || 0) === 0;
const bool = (actual, expected) => actual === expected;
let supported = true;
let result;

if (expression.trim() === '.project_id // empty') {
  result = value.project_id || '';
} else if (expression.includes('.gateId==$gate') && expression.includes('.status=="PASS_GATE_REGISTRATION"')) {
  result = eq(value.gateId, vars.gate)
    && eq(value.contractVersion, vars.contract)
    && eq(value.status, 'PASS_GATE_REGISTRATION')
    && zero(value.failed)
    && bool(value.ok, true)
    && bool(value.generatorRetired, true)
    && bool(value.secretsRead, false)
    && bool(value.browserExecuted, false)
    && bool(value.deployExecuted, false);
} else if (expression.includes('.status=="GO_GATE_CONTRACT"')) {
  result = eq(value.status, 'GO_GATE_CONTRACT')
    && eq(value.contractVersion, vars.contract)
    && zero(value.failed)
    && bool(value.ok, true)
    && bool(value.executionAuthorized, true)
    && bool(value.secretAccessAuthorized, true)
    && bool(value.firestoreReadAuthorized, true)
    && bool(value.writeAuthorized, false)
    && bool(value.runtimeAuthorized, true)
    && bool(value.browserAuthorized, true)
    && bool(value.hostingDeployAuthorized, true)
    && Number(value.hostingDeploysMaximum) === 1
    && bool(value.hostingBackupCloneAuthorized, true)
    && bool(value.hostingRollbackCloneAuthorizedOnFailure, true)
    && bool(value.functionsDeployAuthorized, false)
    && bool(value.rulesDeployAuthorized, false)
    && bool(value.productionAuthorized, false)
    && zero(value.firestoreWritesAuthorized)
    && zero(value.authWritesAuthorized)
    && zero(value.operationalWritesAuthorized)
    && bool(value.secretAccess, false)
    && bool(value.runtimeExecuted, false)
    && bool(value.browserExecuted, false)
    && bool(value.deployExecuted, false);
} else if (expression.includes('.stage=="PASS_VISUAL_BROWSER_PRECHECK"')) {
  result = eq(value.stage, 'PASS_VISUAL_BROWSER_PRECHECK')
    && eq(value.classification, 'GO_FULL_VISUAL_MATRIX')
    && bool(value.ok, true)
    && eq(value.checkpoint, 'INICIO_READY_PASS')
    && zero(value.firestoreWrites)
    && zero(value.authWrites)
    && zero(value.operationalWrites)
    && bool(value.deployExecuted, false)
    && bool(value.productionTouched, false);
} else if (expression.includes('.status=="PASS_MATRIX_SUPERVISED"')) {
  result = eq(value.status, 'PASS_MATRIX_SUPERVISED')
    && eq(value.classification, 'PASS_VISUAL_POST_AUTH')
    && bool(value.ok, true);
} else if (expression.includes('.stage=="PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX"')) {
  result = eq(value.stage, 'PASS_VISUAL_OBSERVABLE_ROOTFIX_MATRIX')
    && eq(value.classification, 'PASS_VISUAL_POST_AUTH')
    && bool(value.ok, true)
    && zero(value.totalRoleFailures)
    && eq(value.snapshotIntegrity, 'VERIFIED_UNCHANGED')
    && Array.isArray(value.roles) && value.roles.length === 3
    && zero(value.firestoreWrites)
    && zero(value.authWrites)
    && zero(value.operationalWrites)
    && zero(value.functionsDeploys)
    && zero(value.rulesDeploys)
    && bool(value.productionTouched, false);
} else if (expression.includes('.stage=="PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE"')) {
  result = bool(value.ok, true)
    && eq(value.stage, 'PASS_VISUAL_MATRIX_CORRECTED_POST_AUTH_LIVE')
    && eq(value.decision, 'PASS_VISUAL_POST_AUTH')
    && eq(value.checkpoint, 'MATRIX_COMPLETE')
    && eq(value.preflightStatus, 'GO_GATE_CONTRACT')
    && bool(value.hostingDeployAttempted, true)
    && Number(value.hostingDeploys) === 1
    && bool(value.hostingRollbackRequired, false)
    && eq(value.snapshotIntegrity, 'VERIFIED_UNCHANGED')
    && zero(value.totalRoleFailures)
    && zero(value.firestoreWrites)
    && zero(value.authWrites)
    && zero(value.operationalWrites)
    && zero(value.functionsDeploys)
    && zero(value.rulesDeploys)
    && bool(value.productionTouched, false)
    && bool(value.mainTouched, false)
    && bool(value.mergeExecuted, false);
} else {
  supported = false;
}

if (!supported) {
  console.error('ORBIT360_JQ_SHIM_UNSUPPORTED_EXPRESSION');
  process.exit(3);
}

if (rawOutput) {
  process.stdout.write(String(result));
} else {
  process.stdout.write((result ? 'true' : 'false') + '\n');
}

if (exitStatusMode) process.exit(result ? 0 : 1);
process.exit(0);
