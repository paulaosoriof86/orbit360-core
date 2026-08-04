#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENGINE = path.join(ROOT, 'tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs');
const LIFECYCLE = path.join(ROOT, 'tools/orbit360-validator-lifecycle-contract-rc12-rootcause-cumulative-closure-v20260803.json');
const WORKFLOW = path.join(ROOT, '.github/workflows/orbit360-rc12-rootcause-cumulative-closure-v20260803.yml');
const OLD_VALIDATOR = 'tools/orbit360-validar-auth-membership-antiregression-v20260803.mjs';
const NEW_VALIDATOR = 'tools/orbit360-validar-auth-membership-antiregression-rootfix-v20260803.mjs';

function replaceOnce(source, before, after, id) {
  const count = source.split(before).length - 1;
  if (count === 0 && source.includes(after)) return source;
  if (count !== 1) throw new Error(`${id}: expected one match, found ${count}`);
  return source.replace(before, after);
}

let engine = fs.readFileSync(ENGINE, 'utf8');
engine = replaceOnce(engine,
  `const AUTH_GATE = '${OLD_VALIDATOR}';`,
  `const AUTH_GATE = '${NEW_VALIDATOR}';`,
  'ENGINE_AUTH_GATE');
fs.writeFileSync(ENGINE, engine, 'utf8');

const lifecycle = JSON.parse(fs.readFileSync(LIFECYCLE, 'utf8'));
lifecycle.validatorRootFix = {
  classification: 'VALIDATOR_STALE',
  secondaryClassification: 'PIPELINE_MECHANISM_FAILURE',
  failedRuns: [30877460688, 30879185924],
  failedStage: 'auth-antiregression-evidence-observability-before-secrets',
  rootCause: 'path.join(sourceRoot, absoluteOutput) coupled candidate source tree to workspace evidence path',
  owner: NEW_VALIDATOR,
  sourceRootSeparated: true,
  absoluteOutputSupported: true,
  productFrozenDuringFix: true,
  secretsReadInFailedRuns: false,
  firestoreReadInFailedRuns: false,
  authReadInFailedRuns: false,
  deployInFailedRuns: false,
  productionTouchedInFailedRuns: false,
  isolatedProofRequired: true
};
lifecycle.forensicAudit.validatorRootFixRequired = true;
lifecycle.forensicAudit.validatorRootFixOwner = NEW_VALIDATOR;
fs.writeFileSync(LIFECYCLE, JSON.stringify(lifecycle, null, 2) + '\n', 'utf8');

let workflow = fs.readFileSync(WORKFLOW, 'utf8');
const before = `          node --check "$ORBIT360_RC12_ROOT/${OLD_VALIDATOR}"\n          ORBIT360_AUTH_MEMBERSHIP_EVIDENCE="$GITHUB_WORKSPACE/$ORBIT360_EVIDENCE_DIR/rc12-auth-membership-antiregression.json" \\\n            node "$ORBIT360_RC12_ROOT/${OLD_VALIDATOR}"`;
const after = `          node --check ${NEW_VALIDATOR}\n          ORBIT360_AUTH_MEMBERSHIP_SOURCE_ROOT="$ORBIT360_RC12_ROOT" \\\n          ORBIT360_AUTH_MEMBERSHIP_EVIDENCE="$GITHUB_WORKSPACE/$ORBIT360_EVIDENCE_DIR/rc12-auth-membership-antiregression.json" \\\n            node ${NEW_VALIDATOR}`;
workflow = replaceOnce(workflow, before, after, 'WORKFLOW_AUTH_GATE');
fs.writeFileSync(WORKFLOW, workflow, 'utf8');

const checks = {
  engineUsesRootfix: engine.includes(`const AUTH_GATE = '${NEW_VALIDATOR}';`) && !engine.includes(`const AUTH_GATE = '${OLD_VALIDATOR}';`),
  lifecycleDocumentsRootfix: lifecycle.validatorRootFix?.sourceRootSeparated === true && lifecycle.validatorRootFix?.absoluteOutputSupported === true,
  workflowUsesSourceRoot: workflow.includes(`ORBIT360_AUTH_MEMBERSHIP_SOURCE_ROOT="$ORBIT360_RC12_ROOT"`),
  workflowUsesRootfix: workflow.includes(`node ${NEW_VALIDATOR}`) && !workflow.includes(`node "$ORBIT360_RC12_ROOT/${OLD_VALIDATOR}"`)
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ schemaVersion:'orbit360-rootfix-evidence-path-gate713-v1', status:ok?'PASS':'FAIL', checks, secrets:false, firestoreRead:false, authRead:false, writes:false, deploy:false, production:false }, null, 2));
process.exit(ok ? 0 : 41);
