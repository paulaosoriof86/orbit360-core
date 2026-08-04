#!/usr/bin/env node
'use strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REL = 'tools/orbit360-block12-operational-runtime-lab-v20260804.mjs';
const file = path.join(ROOT, REL);
let source = fs.readFileSync(file, 'utf8');
function replaceExact(before, after, code) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`PIPELINE_MECHANISM_FAILURE:${code}`);
  source = source.replace(before, after);
}
replaceExact(
  '  const users = {};\n  for (const def of userDefs) {',
  `  const users = {};
  const state = {
    schemaVersion: 'orbit360-block12-private-state-v1', projectId: PROJECT, realTenantId: REAL_TENANT, tenantId, runId,
    users, ids: fixtureIds, sourceHash: sha(\`${'${tenantId}'}|commission_statement|2026-08\`), webConfig, snapshotBefore: before
  };
  const persistState = () => {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });
  };
  persistState();
  for (const def of userDefs) {`,
  'PRIVATE_STATE_BEFORE_WRITES'
);
replaceExact(
  "    users[def.key] = { uid, token: await auth.createCustomToken(uid, { orbitTenant: tenantId, orbitSyntheticVerification: true }) };\n  }",
  "    users[def.key] = { uid, token: await auth.createCustomToken(uid, { orbitTenant: tenantId, orbitSyntheticVerification: true }) };\n    persistState();\n  }",
  'PRIVATE_STATE_AFTER_EACH_USER'
);
const lateState = `  const state = {
    schemaVersion: 'orbit360-block12-private-state-v1', projectId: PROJECT, realTenantId: REAL_TENANT, tenantId, runId,
    users, ids: fixtureIds, sourceHash: sha(\`${'${tenantId}'}|commission_statement|2026-08\`), webConfig, snapshotBefore: before
  };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });`;
if (source.includes(lateState)) source = source.replace(lateState, '  persistState();');
replaceExact(
  '  const cleanupOk = tenantCollections.length === 0 && legacyCollections.length === 0 && usersRemain === 0 && authDeleted === 3;',
  '  const expectedSyntheticUsers = Object.keys(state.users || {}).length;\n  const cleanupOk = tenantCollections.length === 0 && legacyCollections.length === 0 && usersRemain === 0 && authDeleted === expectedSyntheticUsers;',
  'PARTIAL_AUTH_ROLLBACK_COUNT'
);
const prepareStart = source.indexOf('async function prepare(app)');
const browserStart = source.indexOf('async function browserPhase()');
const prepareSource = source.slice(prepareStart, browserStart);
const stateDeclarations = (prepareSource.match(/\bconst state = \{/g) || []).length;
if (stateDeclarations !== 1) throw new Error(`PIPELINE_MECHANISM_FAILURE:PREPARE_STATE_DECLARATION_COUNT_${stateDeclarations}`);
if (!prepareSource.includes('const persistState = () =>') || !prepareSource.includes('persistState();\n  for (const def') || !source.includes('expectedSyntheticUsers')) throw new Error('PIPELINE_MECHANISM_FAILURE:ROLLBACK_CHECKPOINT_NOT_INSTALLED');
fs.writeFileSync(file, source, 'utf8');
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-rollback-checkpoint-v2',
  status: 'ROLLBACK_CHECKPOINT_MATERIALIZED',
  prepareStateDeclarationCount: stateDeclarations,
  stateBeforeOperationalWrites: true,
  stateAfterEachSyntheticIdentity: true,
  partialPreparationRollbackExact: true,
  realTenantWrites: 0,
  secretAccess: false,
  deployExecuted: false,
  ok: true
}, null, 2));
