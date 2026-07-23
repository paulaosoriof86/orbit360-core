#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ENGINE = path.join(ROOT, 'tools/orbit360-validar-gate-contracts-engine-v20260717.mjs');
const REPORT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/operational-directory-phase-alignment-sanitized.json');
const changes = [];

function count(source, token) { return source.split(token).length - 1; }
function exact(source, before, after, id) {
  const b = count(source, before), a = count(source, after);
  if (b === 1) { changes.push(id); return source.replace(before, after); }
  if (b === 0 && a >= 1) return source;
  throw new Error(`SIGNATURE_INVALID:${id}:${b}:${a}`);
}
function writeReport(value) {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

try {
  let source = fs.readFileSync(ENGINE, 'utf8');
  source = exact(
    source,
    "const ALLOWED_EXECUTION_PHASES = new Set(['STATIC_PREFLIGHT', 'LAB_RUNTIME_GATE', 'LAB_HOSTING_DELIVERY']);",
    "const ALLOWED_EXECUTION_PHASES = new Set(['STATIC_PREFLIGHT', 'LAB_RUNTIME_GATE', 'LAB_HOSTING_DELIVERY', 'LAB_DATA_CONTRACT_REPAIR_DRYRUN', 'LAB_DATA_CONTRACT_REPAIR_APPLY']);",
    'allowed_data_contract_phases'
  );
  const anchor = `if (executionPhase === 'LAB_HOSTING_DELIVERY') {
  check('HOSTING_CAPABILITY', capabilities.secrets === true && capabilities.deploy === true && capabilities.firestoreRead === false && capabilities.writes === false && capabilities.runtime === false && capabilities.browser === false && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === false, JSON.stringify(capabilities));
  check('HOSTING_PROJECT_LOCK_ENABLED', workflowLocks.firebaseProject === true, JSON.stringify(workflowLocks));
  check('HOSTING_CHANNEL_LOCK_ENABLED', workflowLocks.hostingChannel === true, JSON.stringify(workflowLocks));
}`;
  const extended = `${anchor}
if (executionPhase === 'LAB_DATA_CONTRACT_REPAIR_DRYRUN') {
  check('DATA_REPAIR_DRYRUN_CAPABILITY', capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === false && capabilities.runtime === false && capabilities.browser === false && capabilities.deploy === false && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === false, JSON.stringify(capabilities));
  check('DATA_REPAIR_DRYRUN_PROJECT_LOCK_ENABLED', workflowLocks.firebaseProject === true, JSON.stringify(workflowLocks));
  check('DATA_REPAIR_DRYRUN_CHANNEL_LOCK_DISABLED', workflowLocks.hostingChannel === false, JSON.stringify(workflowLocks));
}
if (executionPhase === 'LAB_DATA_CONTRACT_REPAIR_APPLY') {
  check('DATA_REPAIR_APPLY_CAPABILITY', capabilities.secrets === true && capabilities.firestoreRead === true && capabilities.writes === true && capabilities.runtime === false && capabilities.browser === false && capabilities.deploy === false && capabilities.functionsDeploy === false && capabilities.rulesDeploy === false && capabilities.production === false, JSON.stringify(capabilities));
  check('DATA_REPAIR_APPLY_PROJECT_LOCK_ENABLED', workflowLocks.firebaseProject === true, JSON.stringify(workflowLocks));
  check('DATA_REPAIR_APPLY_CHANNEL_LOCK_DISABLED', workflowLocks.hostingChannel === false, JSON.stringify(workflowLocks));
}`;
  source = exact(source, anchor, extended, 'data_contract_phase_capabilities');
  fs.writeFileSync(ENGINE, source, 'utf8');
  const report = {
    schemaVersion: 'orbit360-operational-directory-phase-alignment-v1',
    generatedAt: new Date().toISOString(),
    ok: true,
    changes,
    phases: ['LAB_DATA_CONTRACT_REPAIR_DRYRUN','LAB_DATA_CONTRACT_REPAIR_APPLY'],
    functionsChanged: false,
    rulesChanged: false,
    dataWritten: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(report);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  const report = {
    schemaVersion: 'orbit360-operational-directory-phase-alignment-v1',
    generatedAt: new Date().toISOString(),
    ok: false,
    classification: 'PIPELINE_MECHANISM_FAILURE',
    errorCode: String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:=-]/g, '_').slice(0, 300),
    dataWritten: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(report);
  console.error(JSON.stringify(report, null, 2));
  process.exit(41);
}
