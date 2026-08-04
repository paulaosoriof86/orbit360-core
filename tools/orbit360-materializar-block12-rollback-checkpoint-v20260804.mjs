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
replaceExact(
  `  const state = {
    schemaVersion: 'orbit360-block12-private-state-v1', projectId: PROJECT, realTenantId: REAL_TENANT, tenantId, runId,
    users, ids: fixtureIds, sourceHash: sha(\`${'${tenantId}'}|commission_statement|2026-08\`), webConfig, snapshotBefore: before
  };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { encoding: 'utf8', mode: 0o600 });`,
  '  persistState();',
  'REMOVE_LATE_ONLY_STATE'
);
fs.writeFileSync(file, source, 'utf8');
if (!source.includes('const persistState = () =>') || !source.includes('persistState();\n  for (const def')) throw new Error('PIPELINE_MECHANISM_FAILURE:ROLLBACK_CHECKPOINT_NOT_INSTALLED');
console.log(JSON.stringify({
  schemaVersion: 'orbit360-block12-rollback-checkpoint-v1',
  status: 'ROLLBACK_CHECKPOINT_MATERIALIZED',
  stateBeforeOperationalWrites: true,
  stateAfterEachSyntheticIdentity: true,
  realTenantWrites: 0,
  secretAccess: false,
  deployExecuted: false,
  ok: true
}, null, 2));
