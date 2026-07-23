#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LIFECYCLE = path.join(ROOT, 'tools/orbit360-validator-lifecycle-contract-v20260722.json');
const REPORT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/operational-directory-request-v2-alignment-sanitized.json');
const OLD_REQUEST = 'tools/orbit360-m1-operational-directory-repair-dryrun-request-v20260722.json';
const NEW_REQUEST = 'tools/orbit360-m1-operational-directory-repair-dryrun-request-v2-20260722.json';

function writeReport(payload) {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

try {
  const lifecycle = JSON.parse(fs.readFileSync(LIFECYCLE, 'utf8'));
  const contracts = lifecycle?.canonicalOverlayPatch?.runtimeVersionContracts || [];
  const workflow = contracts.find(item => item.path === '.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml');
  if (!workflow) throw new Error('WORKFLOW_CONTRACT_MISSING');
  workflow.requiredTokens = (workflow.requiredTokens || []).map(token => token === OLD_REQUEST ? NEW_REQUEST : token);
  if (!workflow.requiredTokens.includes(NEW_REQUEST)) throw new Error('WORKFLOW_REQUEST_V2_TOKEN_MISSING');
  lifecycle.canonicalOverlayPatch.requiredFiles = [...new Set([...(lifecycle.canonicalOverlayPatch.requiredFiles || []), 'tools/orbit360-alinear-solicitud-dryrun-v2-v20260722.mjs'])];
  fs.writeFileSync(LIFECYCLE, `${JSON.stringify(lifecycle, null, 2)}\n`, 'utf8');
  const payload = {
    schemaVersion: 'orbit360-operational-directory-request-v2-alignment-v1',
    generatedAt: new Date().toISOString(),
    ok: true,
    oldRequestRetired: OLD_REQUEST,
    newRequest: NEW_REQUEST,
    dataWritten: false,
    secretsRead: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(payload);
  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  const payload = {
    schemaVersion: 'orbit360-operational-directory-request-v2-alignment-v1',
    generatedAt: new Date().toISOString(),
    ok: false,
    classification: 'PIPELINE_MECHANISM_FAILURE',
    errorCode: String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:=-]/g, '_').slice(0, 300),
    dataWritten: false,
    secretsRead: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
}
