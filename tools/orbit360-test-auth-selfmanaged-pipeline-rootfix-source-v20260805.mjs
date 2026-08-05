#!/usr/bin/env node
'use strict';

import fs from 'node:fs';

const files = {
  validator:'tools/orbit360-validar-gate-contracts-engine-auth-selfmanaged-credentials-runtime-v20260805.mjs',
  owner:'tools/orbit360-auth-selfmanaged-source-stage-owner-v20260805.mjs',
  sealer:'tools/orbit360-auth-selfmanaged-final-sealer-v20260805.mjs',
  runtimeWorkflow:'.github/workflows/orbit360-auth-selfmanaged-credentials-runtime-v20260805.yml',
  sourceWorkflow:'.github/workflows/orbit360-auth-selfmanaged-pipeline-rootfix-source-v20260805.yml'
};
const read = p => fs.readFileSync(p, 'utf8');
const content = Object.fromEntries(Object.entries(files).map(([k,p]) => [k, read(p)]));
const checks = [];
const add = (id, ok) => checks.push({ id, ok:Boolean(ok) });
const index = (source, token) => source.indexOf(token);
const deployLines = content.runtimeWorkflow.split(/\r?\n/).map(x => x.trim()).filter(x => /(?:npx\s+)?firebase\s+deploy\b/.test(x));

add('VALIDATOR_NO_GLOBAL_PRODUCTION_WORD_SCAN', !content.validator.includes("!workflow.includes('production')") && content.validator.includes('deployLines'));
add('VALIDATOR_DEPLOY_DESTINATION_SCAN', content.validator.includes('hasForbiddenDestination') && content.validator.includes('WORKFLOW_NO_OTHER_DEPLOYS'));
add('OWNER_INVALIDATES_STALE_EVIDENCE', content.owner.includes('STALE_FILES') && content.owner.includes('staleEvidenceInvalidated: true'));
add('OWNER_LEDGER_STARTED_PASS_FAIL', content.owner.includes("status: 'started'") && content.owner.includes("step.status = 'pass'") && content.owner.includes("step.status = 'fail'"));
add('OWNER_SINGLE_SOURCE_PIPELINE', ['apply_sourcefix','syntax','fixtures','register_gate','canonical_gate'].every(x => content.owner.includes(`'${x}'`)));
add('SEALER_CURRENT_RUN_ONLY', content.sealer.includes('ledger?.runId === runId') && content.sealer.includes('currentRead = name => currentRun'));
add('SEALER_REJECTS_STALE_COUNTS', content.sealer.includes('const n = currentRun ?') && content.sealer.includes('staleEvidenceRejected:!currentRun'));
add('WORKFLOW_DYNAMIC_NEW_REQUEST', content.runtimeWorkflow.includes('auth-selfmanaged-credentials-runtime-*.json') && content.runtimeWorkflow.includes('ORBIT360_REQUEST_FILE=$REQUEST_FILE'));
add('WORKFLOW_OWNER_BEFORE_SECRET', index(content.runtimeWorkflow,'Ejecutar owner source-only con ledger') >= 0 && index(content.runtimeWorkflow,'Ejecutar owner source-only con ledger') < index(content.runtimeWorkflow,'Resolver credencial LAB'));
add('WORKFLOW_ONLY_TWO_LAB_DEPLOYS', deployLines.length === 2 && deployLines.every(line => line.includes('--project "$ORBIT360_PROJECT_ID"')) && deployLines.some(line => line.includes('functions:orbit360ProvisionTeamAccess')) && deployLines.some(line => /--only hosting\b/.test(line)));
add('WORKFLOW_NO_RULES_DEPLOY', !deployLines.some(line => line.includes('firestore:rules')));
add('SOURCE_WORKFLOW_NO_SECRETS', !content.sourceWorkflow.includes('secrets.') && !content.sourceWorkflow.includes('firebase deploy') && !content.sourceWorkflow.includes('GOOGLE_APPLICATION_CREDENTIALS'));
add('SOURCE_WORKFLOW_STATIC_ONLY', content.sourceWorkflow.includes('node --check') && content.sourceWorkflow.includes('pipeline-rootfix-source-v20260805.mjs'));

const failed = checks.filter(x => !x.ok);
const result = {
  schemaVersion:'orbit360-auth-selfmanaged-pipeline-rootfix-source-test-v1',
  status:failed.length ? 'STOP_RETRY' : 'PASS_AUTH_PIPELINE_ROOTFIX_SOURCE_ONLY',
  classification:failed.length ? 'PIPELINE_MECHANISM_FAILURE' : 'SOURCE_ONLY_ROOTFIX_VERIFIED',
  total:checks.length,
  passed:checks.length - failed.length,
  failed:failed.length,
  failedCheckIds:failed.map(x => x.id),
  checks,
  secretsRead:false,
  firebaseExecuted:false,
  firestoreReads:0,
  firestoreWrites:0,
  authReads:0,
  authWrites:0,
  deploys:0,
  productionTouched:false,
  containsPII:false,
  containsSecrets:false,
  containsPasswords:false,
  ok:failed.length === 0
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 41);
