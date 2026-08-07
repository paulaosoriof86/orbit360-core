#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildV21MatrixArtifact } from './orbit360-build-v21-event-driven-matrix-artifact-v20260807.mjs';
import { V22_MATRIX_SCHEMA, V22_GATE_SCOPE, V22_EXCLUDED_BLOCKERS, V22_SIGNAL_VERSION } from './orbit360-build-v22-block1-matrix-artifact-v20260807.mjs';

export { V22_MATRIX_SCHEMA, V22_GATE_SCOPE, V22_EXCLUDED_BLOCKERS, V22_SIGNAL_VERSION };
const here = path.dirname(fileURLToPath(import.meta.url));
const prototypePath = path.join(here, 'orbit360-build-v22-block1-matrix-artifact-v20260807.mjs');

function replacementFromPrototype(name) {
  const src = fs.readFileSync(prototypePath, 'utf8');
  const marker = `const ${name} = \``;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`PIPELINE_MECHANISM_FAILURE_V22_REPLACEMENT_MISSING:${name}`);
  const bodyStart = start + marker.length;
  const end = src.indexOf('\`;\n', bodyStart);
  if (end < 0) throw new Error(`PIPELINE_MECHANISM_FAILURE_V22_REPLACEMENT_END_MISSING:${name}`);
  const raw = src.slice(bodyStart, end);
  if (raw.includes('${')) throw new Error(`PIPELINE_MECHANISM_FAILURE_V22_DYNAMIC_TEMPLATE_FORBIDDEN:${name}`);
  return Function(`"use strict"; return \`${raw}\`;`)();
}

function replaceBetween(source, startToken, endToken, replacement, code) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0 || end <= start) throw new Error(`PIPELINE_MECHANISM_FAILURE_V22_${code}_BOUNDARY_NOT_FOUND`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function count(source, token) { return source.split(token).length - 1; }

export function buildV22MatrixArtifact() {
  const entityReplacement = replacementFromPrototype('entityTargetsReplacement');
  const roleReplacement = replacementFromPrototype('testRoleReplacement');
  let source = buildV21MatrixArtifact();
  source = replaceBetween(source, 'async function entityTargets(db) {', 'async function browserState(page) {', entityReplacement, 'ENTITY_TARGET');
  source = replaceBetween(source, 'async function testRole(browser, matrix, member, targets) {', 'let browser;', roleReplacement, 'TEST_ROLE');
  source = source.replace('orbit360-visual-observable-rootfix-matrix-v21-event-driven-render-gated', V22_MATRIX_SCHEMA);
  source = source.replace(
    "readinessAuthority: 'OrbitHydrationContractDiagnostics',",
    "readinessAuthority: 'OrbitHydrationContractDiagnostics',\n  blockingGateScope: 'BLOCK1_CLIENT360_INSURERS',\n  blockingRoutes: ['inicio','cliente360','aseguradoras'],\n  excludedLegacyBlockers: ['polizas','cobros','ops','leads','conciliaciones','cancelaciones'],"
  );
  source = source.replace('PASS_V21_EXACT_MATRIX_ARTIFACT_IMPORT', 'PASS_V22_EXACT_MATRIX_ARTIFACT_IMPORT');

  const forbidden = ["['cliente360', 'polizas'", 'vehicle-detail-button', 'receipt-detail-button', 'cobro-detail-button', 'polizas-kpis-stable'];
  const required = ["go(page, role, 'cliente360')", "go(page, role, 'aseguradoras')", 'BLOCK1_CLIENT360_INSURERS', 'aseguradoras-directorio', 'aseguradoras-ficha', 'aseguradoras-conocimiento', 'cliente360-list-bounded', 'cliente360-ficha', 'mobile-menu-contract', 'legal-accepted-once', 'new MutationObserver', 'orbit360:v21-render-complete'];
  if (forbidden.some(token => source.includes(token)) || required.some(token => !source.includes(token)) || count(source, 'async function testRole(browser, matrix, member, targets)') !== 1 || !source.includes(`schemaVersion: '${V22_MATRIX_SCHEMA}'`)) {
    throw new Error('PIPELINE_MECHANISM_FAILURE_V22_BLOCK1_SCOPE_INVARIANT_FAILED');
  }
  return source;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error('V22_MATRIX_ARTIFACT_OUTPUT_PATH_REQUIRED');
  const source = buildV22MatrixArtifact();
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(path.resolve(out), source, 'utf8');
  console.log(JSON.stringify({ status: 'PASS_V22_MATRIX_ARTIFACT_V2_GENERATED', output: path.resolve(out), bytes: Buffer.byteLength(source), ok: true }));
}
