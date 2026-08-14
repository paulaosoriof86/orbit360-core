#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const LIVE = path.join(ROOT, 'orbit360-platform/docs/orbit360-live-state-v1.json');
const README = path.join(ROOT, 'README.md');
const ADDENDUM = path.join(ROOT, 'orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md');
const SOURCES = path.join(ROOT, 'orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md');
const E2E = path.join(ROOT, 'orbit360-platform/docs/ORBIT360-PRUEBAS-FUNCIONALES-AUTOMATIZADAS-E2E-PRE-POST-GOLIVE-20260812.md');
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/continuidad-documental-preflight-v20260814.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function exists(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile();
}
function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function save(report) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

const checks = [];
function check(id, ok, detail = '') {
  checks.push({ id, ok: !!ok, detail: String(detail || '') });
}

let live = null;
let effectiveProductSourceHead = '';
let error = '';
try {
  [LIVE, README, ADDENDUM, SOURCES, E2E].forEach((file) => check('FILE:' + path.relative(ROOT, file), exists(file)));
  live = JSON.parse(read(LIVE));
  const readme = read(README);
  const addendum = read(ADDENDUM);
  const sources = read(SOURCES);
  const e2e = read(E2E);

  effectiveProductSourceHead = String(live.productSourceHead || live.canonicalFunctionalBaselineHead || '').trim();

  check('LIVE_SCHEMA', live.schemaVersion === 'orbit360-live-state-v1', live.schemaVersion);
  check('STATE_VERSION', typeof live.stateVersion === 'string' && live.stateVersion.length >= 10, live.stateVersion);
  check('PHASE', typeof live.phase === 'string' && live.phase.length > 0, live.phase);
  check('PRODUCT_SOURCE_HEAD_FORMAT', /^[0-9a-f]{40}$/i.test(effectiveProductSourceHead), effectiveProductSourceHead);
  check(
    'PRODUCT_SOURCE_HEAD_SCHEMA_COMPAT',
    !!String(live.productSourceHead || '').trim() || !!String(live.canonicalFunctionalBaselineHead || '').trim(),
    live.productSourceHead ? 'productSourceHead' : live.canonicalFunctionalBaselineHead ? 'canonicalFunctionalBaselineHead' : ''
  );
  check('LAST_EVIDENCE_RUN', Number(live?.lastEvidence?.runId) > 0, live?.lastEvidence?.runId);
  check('NEXT_ACTION_EXACT', typeof live?.nextActionExact?.action === 'string' && live.nextActionExact.action.length >= 20);

  const sameFamilyFailureLimit = Number(live?.iterationBudget?.sameFamilyFailureLimit);
  const explicitNoThirdAttempt = live?.iterationBudget?.thirdSameFamilyAttemptAllowed === false;
  const legacyNoFifthIteration = live?.iterationBudget?.fifthSameFamilyIterationAllowed === false;
  check(
    'ITERATION_LIMIT',
    sameFamilyFailureLimit === 2 && (explicitNoThirdAttempt || legacyNoFifthIteration),
    explicitNoThirdAttempt ? 'thirdSameFamilyAttemptAllowed=false' : legacyNoFifthIteration ? 'legacy fifthSameFamilyIterationAllowed=false' : ''
  );
  check('STOP_RETRY_LIMIT', sameFamilyFailureLimit === 2, sameFamilyFailureLimit);

  check('README_POINTS_LIVE', readme.includes('orbit360-live-state-v1.json'));
  check('README_STATE_VERSION', readme.includes(String(live.stateVersion || '')));
  check('ADDENDUM_POINTS_LIVE', addendum.includes('orbit360-live-state-v1.json'));
  check('SOURCES_POINTS_LIVE', sources.includes('orbit360-live-state-v1.json'));
  check('E2E_POINTS_LIVE', e2e.includes('orbit360-live-state-v1.json'));
  check('ADDENDUM_ANTI_LOOP', addendum.includes('STOP_RETRY') && addendum.includes('una sola frontera larga'));
  check('E2E_CURRENT_ROUTE', e2e.includes('R1 observabilidad') && e2e.includes('R7 pruebas de aislamiento/reutilización'));

  try {
    git('cat-file', '-e', `${effectiveProductSourceHead}^{commit}`);
    check('PRODUCT_SOURCE_HEAD_EXISTS', true);
    execFileSync('git', ['merge-base', '--is-ancestor', effectiveProductSourceHead, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
    check('PRODUCT_SOURCE_HEAD_IS_ANCESTOR', true);
  } catch (gitError) {
    check('PRODUCT_SOURCE_HEAD_EXISTS_OR_ANCESTOR', false, String(gitError?.message || gitError));
  }

  const currentBranch = process.env.GITHUB_REF_NAME || (() => { try { return git('branch', '--show-current'); } catch { return ''; } })();
  if (currentBranch) check('BRANCH_MATCH', currentBranch === live.branch, currentBranch);
} catch (e) {
  error = String(e?.message || e);
}

const failed = checks.filter((c) => !c.ok);
const report = {
  schemaVersion: 'orbit360-continuidad-documental-preflight-v1',
  ok: !error && failed.length === 0,
  status: !error && failed.length === 0 ? 'PASS_CONTINUIDAD_DOCUMENTAL' : 'FAIL_CONTINUIDAD_DOCUMENTAL',
  stateVersion: live?.stateVersion || '',
  phase: live?.phase || '',
  productSourceHead: effectiveProductSourceHead,
  productSourceHeadField: live?.productSourceHead ? 'productSourceHead' : live?.canonicalFunctionalBaselineHead ? 'canonicalFunctionalBaselineHead' : '',
  nextActionOwner: live?.nextActionExact?.owner || '',
  failed: failed.length,
  failedCheckIds: failed.map((c) => c.id),
  checks,
  error,
  secretAccess: false,
  dataAccess: false,
  runtimeExecuted: false,
  browserExecuted: false,
  deployExecuted: false,
  operationalWrites: 0,
  productionTouched: false
};

save(report);
if (!report.ok) process.exitCode = 42;
