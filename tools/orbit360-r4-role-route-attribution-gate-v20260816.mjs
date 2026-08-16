#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EVIDENCE_DIR = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716');
const SELF = path.join(EVIDENCE_DIR, 'r4-certified-validator-rootfix-source-v20260815.json');
const OUT = path.resolve(process.env.ORBIT360_R4_ROLE_ROUTE_GATE_OUT || path.join(EVIDENCE_DIR, 'r4-role-route-attribution-gate-v20260816.json'));

function write(payload) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: 'orbit360-r4-role-route-attribution-gate-v1',
    browserExecuted: false,
    secretAccess: false,
    dataAccess: false,
    deployExecuted: false,
    packageRebuilt: false,
    productionTouched: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    containsPII: false,
    containsSecrets: false,
    ...payload
  }, null, 2) + '\n', 'utf8');
}

if (!fs.existsSync(SELF)) {
  write({ ok: false, status: 'R4_ROLE_ROUTE_ATTRIBUTION_GATE_FAIL', classification: 'PIPELINE_MECHANISM_FAILURE', failureFamily: 'R4_ROLE_ROUTE_SELFTEST_EVIDENCE_MISSING' });
  process.exit(41);
}

const e = JSON.parse(fs.readFileSync(SELF, 'utf8'));
const checks = {
  baseSelfTestPass: e.ok === true && e.status === 'R4_CERTIFIED_VALIDATOR_ROOTFIX_SOURCE_PASS',
  cumulativeRoleGroupRemoved: e.cumulativeRoleGroupRemoved === true,
  roleActivationStagesBound: e.roleActivationStagesBound === true,
  perRouteStagesBound: e.perRouteStagesBound === true,
  independentStageBudgetsBound: e.independentStageBudgetsBound === true,
  swallowedRouteWaitRemoved: e.swallowedRouteWaitRemoved === true,
  routeReadinessFailurePropagates: e.routeReadinessFailurePropagates === true,
  roleTimeoutAttributionSplit: e.roleTimeoutAttributionSplit === true,
  partialRoleEvidenceBound: e.partialRoleEvidenceBound === true,
  syntaxPass: e.patchedHarnessSyntaxPass === true,
  browserFrozen: e.browserExecuted === false && e.secretAccess === false && e.dataAccess === false && e.productionTouched === false,
  zeroWrites: Number(e.firestoreWrites || 0) === 0 && Number(e.authWrites || 0) === 0 && Number(e.operationalWrites || 0) === 0
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const ok = failed.length === 0;
write({
  ok,
  status: ok ? 'R4_ROLE_ROUTE_ATTRIBUTION_GATE_PASS' : 'R4_ROLE_ROUTE_ATTRIBUTION_GATE_FAIL',
  classification: ok ? 'VALIDATOR_STALE_ROOTFIX_PASS' : 'VALIDATOR_STALE',
  failureFamily: ok ? '' : 'CUMULATIVE_ROLE_GROUP_BUDGET_AND_ROUTE_ATTRIBUTION_NOT_CLOSED',
  owner: 'tools/orbit360-r4-certified-product-smoke-wrapper-v20260815.mjs',
  checks,
  failedCheckIds: failed
});
if (!ok) process.exitCode = 41;
