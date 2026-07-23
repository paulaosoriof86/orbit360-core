#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, 'tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs');
const REPORT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/operational-directory-structural-wrapper-v2-sanitized.json');
const OLD_REQUEST = 'tools/orbit360-m1-operational-directory-static-repair-request-v20260722.json';
const NEW_REQUEST = 'tools/orbit360-m1-operational-directory-static-repair-request-v2-20260722.json';
const OLD_COMMAND = 'node tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs';
const NEW_COMMAND = 'node tools/orbit360-reparar-directorio-operativo-estructural-v2-v20260722.mjs';

function writeReport(payload) {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
function replaceOne(source, before, after, id) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`WRAPPER_SIGNATURE_INVALID:${id}:${count}`);
  return source.replace(before, after);
}

try {
  if (!fs.existsSync(SOURCE)) throw new Error('STRUCTURAL_REPAIR_SOURCE_MISSING');
  let source = fs.readFileSync(SOURCE, 'utf8');

  const oldIndexBlock = `  source = read(files.index);
  source = replaceRegex(source, /aseguradoras-bank-accounts-provider-lab-v20260721\\.js\\?v=[^"']+/, 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2', 'index_bank_cache', 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2');
  source = replaceRegex(source, /academia-v1221-m1-visual-integrity\\.js\\?v=[^"']+/, 'academia-v1221-m1-visual-integrity.js?v=20260722-229', 'index_academy_cache', 'academia-v1221-m1-visual-integrity.js?v=20260722-229');
  write(files.index, source);`;
  const newIndexBlock = `  source = read(files.index);
  if (source.includes('aseguradoras-bank-accounts-provider-lab-v20260721.js')) source = replaceRegex(source, /aseguradoras-bank-accounts-provider-lab-v20260721\\.js\\?v=[^"']+/, 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2', 'index_bank_cache_optional', 'aseguradoras-bank-accounts-provider-lab-v20260721.js?v=20260722-2');
  if (source.includes('academia-v1221-m1-visual-integrity.js')) source = replaceRegex(source, /academia-v1221-m1-visual-integrity\\.js\\?v=[^"']+/, 'academia-v1221-m1-visual-integrity.js?v=20260722-229', 'index_academy_cache_optional', 'academia-v1221-m1-visual-integrity.js?v=20260722-229');
  write(files.index, source);`;
  source = replaceOne(source, oldIndexBlock, newIndexBlock, 'optional_index_cache');
  source = source.split(OLD_REQUEST).join(NEW_REQUEST);
  source = source.split(OLD_COMMAND).join(NEW_COMMAND);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-structural-v2-'));
  const tempScript = path.join(tempDir, 'repair.mjs');
  fs.writeFileSync(tempScript, source, 'utf8');
  const result = spawnSync(process.execPath, [tempScript], { cwd: ROOT, encoding: 'utf8', env: process.env });
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (result.status !== 0) {
    const stderr = String(result.stderr || '').trim();
    const stdout = String(result.stdout || '').trim();
    throw new Error(`STRUCTURAL_REPAIR_V2_FAILED:${(stderr || stdout).slice(-800)}`);
  }

  const payload = {
    schemaVersion: 'orbit360-operational-directory-structural-wrapper-v2',
    generatedAt: new Date().toISOString(),
    ok: true,
    sourceMechanism: 'function-boundary-structural-replacement-v1',
    correction: 'optional_nonowner_index_cache_and_v2_request_binding',
    dataRead: false,
    dataWritten: false,
    secretsRead: false,
    runtimeExecuted: false,
    browserExecuted: false,
    deployExecuted: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(payload);
  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  const payload = {
    schemaVersion: 'orbit360-operational-directory-structural-wrapper-v2',
    generatedAt: new Date().toISOString(),
    ok: false,
    classification: 'PIPELINE_MECHANISM_FAILURE',
    errorCode: String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:=-]/g, '_').slice(0, 900),
    dataRead: false,
    dataWritten: false,
    secretsRead: false,
    containsPII: false,
    containsSecrets: false
  };
  writeReport(payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(41);
}
