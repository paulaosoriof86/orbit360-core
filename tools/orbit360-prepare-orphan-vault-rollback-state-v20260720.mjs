#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TENANT_ID = 'alianzas-soluciones';
const RUN_ID = String(process.env.ORBIT360_ROLLBACK_TARGET_RUN_ID || process.argv[2] || '').trim();
const OUTPUT = process.env.ORBIT360_ORPHAN_STATE_PATH ||
  'orbit360-platform/runtime-gate-crm-v20260716/importers-e2e-orphan-state.json';

if (!/^\d{6,20}$/.test(RUN_ID)) throw new Error('ROLLBACK_TARGET_RUN_ID_INVALID');

const executionId = `importers_e2e_${RUN_ID}`;
const fixtureId = `asg_gate_${crypto.createHash('sha256').update(executionId).digest('hex').slice(0, 16)}`;
const sheetName = `ORBIT GATE ${RUN_ID.slice(-8)}`;
const portalId = `platform_${sheetName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)}_01`;
const credentialRef = `cred_${crypto.createHash('sha256').update(`${TENANT_ID}|${fixtureId}|${portalId}`).digest('hex').slice(0, 32)}`;

const state = {
  schemaVersion: 'orbit360-importers-e2e-orphan-state-v1',
  runId: RUN_ID,
  executionId,
  tenantId: TENANT_ID,
  fixtureId,
  portalId,
  sheetName,
  credentialRef,
  synthetic: true,
  containsPII: false,
  containsSecrets: false
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
console.log('ORBIT360_ORPHAN_VAULT_ROLLBACK_STATE_READY');
