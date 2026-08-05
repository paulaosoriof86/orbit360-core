#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = process.env.ORBIT360_DECISION_OUT || path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/go-lab-candidate-visible-decision-v20260804.json');
const text = (name, fallback = '') => String(process.env[name] ?? fallback).trim();
const integer = (name, fallback = 0) => {
  const parsed = Number.parseInt(text(name, String(fallback)), 10);
  if (!Number.isInteger(parsed)) throw new Error(`PIPELINE_MECHANISM_FAILURE:INVALID_INTEGER_${name}`);
  return parsed;
};
const bool = (name, fallback = false) => {
  const value = text(name, fallback ? 'true' : 'false').toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`PIPELINE_MECHANISM_FAILURE:INVALID_BOOLEAN_${name}`);
};

const functionsVerified = integer('FUNCTIONS_VERIFIED', 0);
if (functionsVerified < 0 || functionsVerified > 4) throw new Error('PIPELINE_MECHANISM_FAILURE:FUNCTIONS_VERIFIED_OUT_OF_RANGE');
const functionsExpected = integer('FUNCTIONS_EXPECTED', 4);
if (functionsExpected !== 4) throw new Error('DATA_CONTRACT_FAILURE:FUNCTIONS_EXPECTED_MUST_BE_FOUR');

const retained = bool('PREVIEW_RETAINED', false);
const previewUrl = retained ? text('PREVIEW_URL') : '';
if (retained && !/^https:\/\/[-A-Za-z0-9.]+\.web\.app$/.test(previewUrl)) throw new Error('DATA_CONTRACT_FAILURE:RETAINED_PREVIEW_URL_INVALID');

const payload = {
  schemaVersion: 'orbit360-go-lab-candidate-visible-decision-v2',
  generatedAt: new Date().toISOString(),
  rcId: 'RC-AYS-LAB-CANONICA-01',
  gateId: 'GO_LAB_CANDIDATE_VISIBLE',
  contractGateId: 'block12-operational-runtime-lab-v20260804',
  contractVersion: '12.0.11',
  requestCommit: text('REQUEST_COMMIT'),
  deployedSourceHead: text('DEPLOYED_SOURCE_HEAD'),
  sourceBaseline: text('SOURCE_BASELINE', '548cffa50cddfd93ad2118f5a06e9bb420699bde'),
  priorFunctionalRunId: 30962756387,
  functionalReplayExecuted: false,
  isolatedSyntheticRunId: 30971707956,
  decision: text('DECISION', 'STOP_LAB_CANDIDATE_REACTIVATION_ROLLED_BACK'),
  classification: text('CLASSIFICATION', 'PIPELINE_OR_INTEGRITY_FAILURE'),
  productAndIntegrityPass: bool('PRODUCT_AND_INTEGRITY_PASS', false),
  visualEvidencePass: bool('VISUAL_EVIDENCE_PASS', false),
  integrityPass: bool('INTEGRITY_PASS', false),
  previewUrl,
  functionsExpected,
  functionsVerified,
  functionsDeployAttempted: bool('FUNCTIONS_DEPLOY_ATTEMPTED', false),
  functionsKept: bool('FUNCTIONS_KEPT', false),
  hostingDeployAttempted: bool('HOSTING_DEPLOY_ATTEMPTED', false),
  hostingPreviewKept: retained,
  manualFrameReviewRequired: bool('MANUAL_FRAME_REVIEW_REQUIRED', false),
  visualExitCode: integer('VISUAL_EXIT_CODE', 99),
  integrityExitCode: integer('INTEGRITY_EXIT_CODE', 99),
  rulesDeployed: false,
  realTenantWrites: 0,
  authWrites: 0,
  realDataReimported: false,
  productionTouched: false,
  mainTouched: false,
  mergeExecuted: false,
  authorizationConsumed: bool('AUTHORIZATION_CONSUMED', false),
  allowedExecutionsRemaining: integer('ALLOWED_EXECUTIONS_REMAINING', 0),
  replayAllowed: false,
  ok: bool('OK', false),
  observedCountersOnly: true,
  containsPII: false,
  containsSecrets: false
};

if (payload.functionsKept && functionsVerified !== functionsExpected) throw new Error('DATA_CONTRACT_FAILURE:FUNCTIONS_KEPT_WITHOUT_FULL_VERIFICATION');
if (payload.hostingPreviewKept && !payload.productAndIntegrityPass) throw new Error('DATA_CONTRACT_FAILURE:PREVIEW_KEPT_WITHOUT_PRODUCT_INTEGRITY_PASS');
if (payload.ok && (!payload.productAndIntegrityPass || !payload.visualEvidencePass || !payload.integrityPass || functionsVerified !== functionsExpected || !retained)) throw new Error('DATA_CONTRACT_FAILURE:GO_DECISION_INCOMPLETE');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(payload, null, 2));
