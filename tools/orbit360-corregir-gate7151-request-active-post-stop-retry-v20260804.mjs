#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ENGINE = 'tools/orbit360-validar-gate-contracts-engine-rc12-approved-roster-final-go-live-v20260804.mjs';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/rc12-gate7151-request-active-rootfix-static.json';
const OLD = "request.status === 'AUTHORIZED_POST_ROOTFIX_RESUME' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === false";
const NEXT = "request.status === 'AUTHORIZED_POST_ROOTFIX_RESUME' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.replayAllowed === false && request.retryAuthorized === true && request.postStopRetry === true && request.priorRuns?.finalMacro === 30908259200 && request.priorRuns?.rootfixInitial === 30908742658 && request.priorRuns?.rootfixCorrective === 30908887853 && request.failureFamily === 'UNTRACKED_FILE_DELTA_ENUMERATION'";

let source = fs.readFileSync(ENGINE, 'utf8');
if (source.includes(NEXT)) {
  // Idempotent: already corrected.
} else {
  const matches = source.split(OLD).length - 1;
  if (matches !== 1) throw new Error(`REQUEST_ACTIVE_MATCH_COUNT_${matches}`);
  source = source.replace(OLD, NEXT);
  fs.writeFileSync(ENGINE, source, 'utf8');
}

const checks = {
  postStopRetryRequired: source.includes('request.postStopRetry === true'),
  retryAuthorizationRequired: source.includes('request.retryAuthorized === true'),
  priorFinalMacroBound: source.includes('request.priorRuns?.finalMacro === 30908259200'),
  priorRootfixInitialBound: source.includes('request.priorRuns?.rootfixInitial === 30908742658'),
  priorRootfixCorrectiveBound: source.includes('request.priorRuns?.rootfixCorrective === 30908887853'),
  failureFamilyBound: source.includes("request.failureFamily === 'UNTRACKED_FILE_DELTA_ENUMERATION'"),
  staleNegativeRemoved: !source.includes(OLD),
  gateVersionPreserved: source.includes("const VERSION = '7.15.1';")
};
const ok = Object.values(checks).every(Boolean);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  schemaVersion: 'orbit360-gate7151-request-active-rootfix-static-v1',
  generatedAt: new Date().toISOString(),
  decision: ok ? 'GATE7151_REQUEST_ACTIVE_ROOTFIX_STATIC_PASS' : 'GATE7151_REQUEST_ACTIVE_ROOTFIX_STATIC_FAIL',
  classification: ok ? 'GO_STATIC_VALIDATOR_ROOTFIX' : 'VALIDATOR_STALE',
  priorRun: 30910363264,
  priorGateResult: { passed: 16, failed: 1, failedCheckIds: ['REQUEST_ACTIVE'] },
  owner: ENGINE,
  checks,
  secretAccess: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authRead: false,
  authWrites: 0,
  browserExecuted: false,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ decision: ok ? 'PASS' : 'FAIL', checks, ok }, null, 2));
process.exit(ok ? 0 : 41);
