#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const FILE = 'tools/orbit360-auth-access-recovery-lab-v20260805.mjs';
let source = fs.readFileSync(FILE, 'utf8');

const importAnchor = "import { GoogleAuth } from 'google-auth-library';\n";
const importLine = "import { buildOnboardingCallFailure, callableFailureEvidence } from './orbit360-auth-callable-error-contract-v6-20260805.mjs';\n";
if (!source.includes(importLine)) {
  if (!source.includes(importAnchor)) throw new Error('VALIDATOR_STALE:CALLABLE_ERROR_IMPORT_ANCHOR_NOT_FOUND');
  source = source.replace(importAnchor, importAnchor + importLine);
}

const oldCall = `async function callOnboarding(idToken, payload) {
  const response = await fetch(\`https://\${REGION}-\${PROJECT}.cloudfunctions.net/\${FUNCTION}\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: \`Bearer \${idToken}\` },
    body: JSON.stringify({ data: payload })
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok || body.error || body.result?.ok !== true) throw new Error(\`FUNCTIONAL_DEFECT:ONBOARDING_CALL_FAILED_\${text(body.error?.status || response.status, 80)}\`);
  return body.result;
}`;
const newCall = `async function callOnboarding(idToken, payload) {
  const response = await fetch(\`https://\${REGION}-\${PROJECT}.cloudfunctions.net/\${FUNCTION}\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: \`Bearer \${idToken}\` },
    body: JSON.stringify({ data: payload })
  });
  let body = {};
  try { body = await response.json(); } catch {}
  if (!response.ok || body.error || body.result?.ok !== true) {
    throw buildOnboardingCallFailure(response.status, body);
  }
  return body.result;
}`;
if (!source.includes(newCall)) {
  if (!source.includes(oldCall)) throw new Error('VALIDATOR_STALE:CALL_ONBOARDING_BLOCK_NOT_FOUND');
  source = source.replace(oldCall, newCall);
}

const oldCatchHeader = `    const message = safeError(error);
    const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
    const failure = {`;
const newCatchHeader = `    const message = safeError(error);
    const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
    const callableFailure = callableFailureEvidence(error);
    const failure = {`;
if (!source.includes(newCatchHeader)) {
  if (!source.includes(oldCatchHeader)) throw new Error('VALIDATOR_STALE:RECOVER_CATCH_HEADER_NOT_FOUND');
  source = source.replace(oldCatchHeader, newCatchHeader);
}

const oldFailureFields = `      classification,
      errorCode: text(message.split(':')[1] || 'AUTH_ACCESS_RECOVERY_FAILED', 160),
      attemptedTargets:`;
const newFailureFields = `      classification,
      errorCode: callableFailure.errorCode,
      httpStatus: callableFailure.httpStatus,
      callableStatus: callableFailure.callableStatus,
      attemptedTargets:`;
if (!source.includes(newFailureFields)) {
  if (!source.includes(oldFailureFields)) throw new Error('VALIDATOR_STALE:RECOVER_FAILURE_FIELDS_NOT_FOUND');
  source = source.replace(oldFailureFields, newFailureFields);
}

const oldOuter = `  const message = safeError(error);
  const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
  writeJson(sanitizedPath, {`;
const newOuter = `  const message = safeError(error);
  const classification = (message.match(/^(SECURITY_FAILURE|FUNCTIONAL_DEFECT|VALIDATOR_STALE|DATA_CONTRACT_FAILURE|ENVIRONMENT_FAILURE|PIPELINE_MECHANISM_FAILURE)/) || [])[1] || 'PIPELINE_MECHANISM_FAILURE';
  const callableFailure = callableFailureEvidence(error);
  writeJson(sanitizedPath, {`;
if (!source.includes(newOuter)) {
  if (!source.includes(oldOuter)) throw new Error('VALIDATOR_STALE:OUTER_CATCH_HEADER_NOT_FOUND');
  source = source.replace(oldOuter, newOuter);
}

const oldOuterFields = `    classification,
    errorCode: text(message.split(':')[1] || 'AUTH_ACCESS_RECOVERY_FAILED', 160),
    firestoreWrites:`;
const newOuterFields = `    classification,
    errorCode: callableFailure.errorCode,
    httpStatus: callableFailure.httpStatus,
    callableStatus: callableFailure.callableStatus,
    firestoreWrites:`;
if (!source.includes(newOuterFields)) {
  if (!source.includes(oldOuterFields)) throw new Error('VALIDATOR_STALE:OUTER_FAILURE_FIELDS_NOT_FOUND');
  source = source.replace(oldOuterFields, newOuterFields);
}

fs.writeFileSync(FILE, source, 'utf8');
console.log(JSON.stringify({
  ok: true,
  file: FILE,
  contract: 'HTTP_STATUS_CALLABLE_STATUS_ERROR_CODE_V1',
  sourceOnly: true
}));
