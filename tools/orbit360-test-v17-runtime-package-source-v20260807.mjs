#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const EXPECTED = '20260807.17-two-phase-runtime';
const REQUEST = '.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json';
const OVERLAY = 'tools/orbit360-validator-lifecycle-overlay-visual-matrix-v8-stop-preflight-v20260806.json';
const SOURCE_EVIDENCE = 'orbit360-platform/runtime-gate-crm-v20260716/v17-advisor-cache-route-readiness-rootfix-source-sanitized-v20260807.json';
const HYDRATION = 'orbit360-platform/core/visual-runtime-hydration-contract-v20260805.js';
const MATRIX = 'tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs';
const SEALER = 'tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs';
const RELAY = '.github/workflows/orbit360-registered-relay-v17-route-readiness-v20260807.yml';
const OLD_RELAY = '.github/workflows/orbit360-registered-relay-v16-hydration-v20260807.yml';

const json = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const text = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const checks = {};

for (const file of [REQUEST,LIFECYCLE,OVERLAY,SOURCE_EVIDENCE,HYDRATION,MATRIX,SEALER,RELAY]) checks['exists:' + file] = fs.existsSync(file);
checks.oldRelayAbsent = !fs.existsSync(OLD_RELAY);

const request = json(REQUEST);
const lifecycle = json(LIFECYCLE);
const overlay = json(OVERLAY);
const evidence = json(SOURCE_EVIDENCE);
const hydration = text(HYDRATION);
const matrix = text(MATRIX);
const sealer = text(SEALER);
const relay = text(RELAY);

const head = execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const parent = execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
const changed = execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r','HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);

checks.exclusiveRequestCommit = changed.length === 1 && changed[0] === REQUEST;
checks.requestActive = request.requestVersion === EXPECTED && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false;
checks.requestParentBound = request.parentHead === parent && request.authorizedBaseHead === parent && head !== parent;
checks.zeroWriteScope = request.scope?.zeroWritesRequired === true && request.scope?.firestoreWrites === false && request.scope?.authWrites === false && request.scope?.operationalWrites === false && request.scope?.functionsDeploy === false && request.scope?.rulesDeploy === false && request.scope?.reimport === false && request.scope?.production === false && request.scope?.main === false && request.scope?.merge === false;
checks.fullVisualScope = request.scope?.precheckRequiredBeforeMatrix === true && request.scope?.directionDesktop === true && request.scope?.operationalTablet === true && request.scope?.advisorMobile === true && request.scope?.viewportCaptureOnly === true && request.scope?.hostingDeploysMaximum === 1;
checks.lifecycleRuntimePending = lifecycle.expectedRequestVersion === EXPECTED && lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && lifecycle.executionAuthorized === true && lifecycle.secretAccessAuthorized === true && lifecycle.firestoreReadAuthorized === true && lifecycle.browserAuthorized === true && lifecycle.hostingDeployAuthorized === true && lifecycle.writeAuthorized === false && lifecycle.productionAuthorized === false;
checks.overlayRuntimePending = overlay.expectedNextRequestVersion === EXPECTED && overlay.runtimeAllowed === true && overlay.runtimeAllowedOnlyWithFreshExclusiveRequest === true && overlay.browserAllowed === true && overlay.hostingAllowed === true && overlay.writesAllowed === false && overlay.productionAllowed === false;
checks.sourceEvidencePass = evidence.ok === true && evidence.status === 'PASS_V17_ADVISOR_CACHE_ROUTE_READINESS_ROOTFIX_SOURCE_ONLY' && evidence.fixture?.advisorLookups === 430 && evidence.fixture?.projectionBuildsBeforeInvalidation === 1;
checks.cacheMarkers = hydration.includes('advisorProjectionCache') && hydration.includes('advisorProjectionBuilds') && hydration.includes("readinessAuthority: 'OrbitHydrationContractDiagnostics'");
checks.routeCheckpointMarkers = matrix.includes("_REQUIRED_HYDRATION', 35000") && matrix.includes("_RENDER_READY', 35000") && matrix.indexOf("_REQUIRED_HYDRATION', 35000") < matrix.indexOf("_RENDER_READY', 35000");
checks.sealerBrowserEvidence = sealer.includes('const browserExecuted =') && sealer.includes('browserExecuted: final.browserExecuted') && sealer.includes('ROLLBACK_RESTORED_AFTER_CURRENT_STOP');
checks.relayExpectedVersion = relay.includes(`ORBIT360_EXPECTED_REQUEST_VERSION: ${EXPECTED}`) && relay.includes('GO_GATE_CONTRACT before secrets') && relay.includes('orbit360-test-v17-runtime-package-source-v20260807.mjs');
checks.sourceValidationBound = request.sourceValidation?.rootfixStatus === 'PASS_V17_ADVISOR_CACHE_ROUTE_READINESS_ROOTFIX_SOURCE_ONLY' && request.sourceValidation?.readinessAuthority === 'OrbitHydrationContractDiagnostics';

const failedCheckIds = Object.entries(checks).filter(([,ok]) => !ok).map(([id]) => id);
const out = {
  status: failedCheckIds.length ? 'STOP_V17_RUNTIME_PACKAGE_SOURCE' : 'PASS_V17_RUNTIME_PACKAGE_SOURCE_ONLY',
  requestVersion: request.requestVersion,
  head,
  parent,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  deployExecuted: false,
  writes: 0,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(out,null,2));
process.exit(out.ok ? 0 : 41);
