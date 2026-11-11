'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const yaml = fs.readFileSync(path.join(__dirname,
  '../.github/workflows/gravicentra-i66-greenapi-metadata-readonly.yml'), 'utf8');

test('manual protected dispatch only, pinned recovery/project', () => {
  assert.match(yaml, /workflow_dispatch:/);
  assert.doesNotMatch(yaml, /^\s+push:/m);
  assert.match(yaml, /inputs\.scope_confirmation == 'READ_ONLY_NO_SEND'/);
  assert.match(yaml, /github\.ref == 'refs\/heads\/recovery\/fase-a-clean-20260831'/);
  assert.match(yaml, /PROJECT_ID: ays-orbit-360-lab/);
  assert.match(yaml, /REGION: us-central1/);
});
test('only existing project-scoped SA secret references are selected', () => {
  assert.match(yaml, /FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB/);
  assert.match(yaml, /FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB/);
  assert.match(yaml, /row\.get\('project_id'\)=='ays-orbit-360-lab'/);
  assert.match(yaml, /target\.chmod\(0o600\)/);
});
test('metadata queries never access secret payload or call provider', () => {
  assert.match(yaml, /gcloud secrets list/);
  assert.match(yaml, /gcloud secrets versions list/);
  assert.match(yaml, /gcloud functions describe/);
  assert.match(yaml, /gcloud run services describe/);
  const executable = yaml.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
  assert.doesNotMatch(executable, /gcloud\s+secrets\s+versions\s+access\b/);
  assert.doesNotMatch(executable, /https?:\/\/(?:api\.)?green-api/);
  assert.doesNotMatch(executable, /\b(?:curl|wget)\b/);
});
test('never deploy, update, delete, or mutate Firestore', () => {
  const executable = yaml.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
  assert.doesNotMatch(executable, /\b(?:firebase|gcloud)\s+deploy\b/);
  assert.doesNotMatch(executable, /gcloud\s+(?:functions|run|secrets)\s+(?:deploy|update|delete|destroy|add|enable)\b/);
  assert.doesNotMatch(executable, /firestore\.googleapis\.com/);
  assert.doesNotMatch(executable, /\bsendMessage\b/);
});
test('only fixed boolean report fields, no token or identity printed', () => {
  assert.match(yaml, /all\(type\(v\) is bool for v in report\.values\(\)\)/);
  assert.match(yaml, /secretPayloadRead':False/);
  assert.match(yaml, /whatsappMessagesSent':False/);
  assert.match(yaml, /cloudResourcesMutated':False/);
  assert.doesNotMatch(yaml, /print\([^\n]*(?:apiTokenInstance|senderWid|private_key|serviceAccountEmail|webhookBearerToken)/i);
});
test('source pin of exact instance and group IDs remains source-only evidence', () => {
  assert.match(yaml, /activeInstanceIdMatchesApprovedSource/);
  assert.match(yaml, /operationsGroupMatchesApprovedSource/);
  assert.match(yaml, /paymentsGroupMatchesApprovedSource/);
  assert.match(yaml, /providerAuthorizedStateVerifiedNow':False/);
  assert.match(yaml, /providerGroupMembershipVerifiedNow':False/);
});
test('no automatic backfill or delivery enablement', () => {
  assert.doesNotMatch(yaml, /gcloud\s+functions\s+deploy/);
  assert.doesNotMatch(yaml, /ORBIT360_GREENAPI_ENABLED[^\n]*true/);
  assert.match(yaml, /bothFunctionsHaveEnvEnabledFlag/);
});
