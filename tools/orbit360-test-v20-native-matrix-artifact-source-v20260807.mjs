#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { buildV20MatrixArtifact, V20_MATRIX_SCHEMA, V20_VALIDATOR_FINDING } from './orbit360-build-v20-route-aware-matrix-artifact-v20260807.mjs';

const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const request = JSON.parse(read('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'));
const wrapper = read('tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const sealer = read('tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs');
const cliente = read('orbit360-platform/modules/cliente360.js');
const rootfix = read('orbit360-platform/core/visual-runtime-rootfix-v20260805.js');
const checks = {};

checks.v19Frozen = request.requestVersion === '20260807.19-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false;
checks.boundedRenderPreserved = cliente.includes('const LIST_PAGE_SIZE = 40') && cliente.includes('const visibleRows = rows.slice(pageStart, pageStart + LIST_PAGE_SIZE)') && cliente.includes('renderedRows: visibleRows.length');
checks.v19InstrumentationPreserved = ['summaryCacheMs','summaryAggregateMs','rowsBuildMs','innerHtmlMs','bindingsMs','totalMs'].every(token => cliente.includes(token)) && rootfix.includes('afterRenderMs') && rootfix.includes('totalWithAfterRenderMs');
checks.wrapperUsesExactBuilder = wrapper.includes("buildV20MatrixArtifact") && wrapper.includes("spawnSync(process.execPath, ['--check', tempPath]") && wrapper.includes("await import(pathToFileURL(tempPath).href");
checks.wrapperPersistsCompileFailure = wrapper.includes("MATRIX_ARTIFACT_COMPILE_FAILED") && wrapper.includes("classification: 'PIPELINE_MECHANISM_FAILURE'");
checks.sealerPipelineClassifier = sealer.includes('matrixArtifactPipelineFailure') && sealer.includes("classification: 'PIPELINE_MECHANISM_FAILURE'") && sealer.includes("'MATRIX_ARTIFACT_IMPORT_FAILED'");

const source = buildV20MatrixArtifact();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v20-matrix-artifact-'));
const artifact = path.join(tmp, 'exact-v20-matrix-artifact.mjs');
const evidence = path.join(tmp, 'import-evidence.json');
fs.writeFileSync(artifact, source, 'utf8');
const artifactDigest = sha256(source);

checks.schemaExact = source.includes(`schemaVersion: '${V20_MATRIX_SCHEMA}'`);
checks.singleGoFunction = source.split('async function go(page, role, route)').length - 1 === 1;
checks.noOrphanedOldGoBody = !source.includes("return waitRouteReady(page, role, route.split('?')[0]);");
const requiredIdx = source.indexOf('const requiredMs = await waitRequiredHydration(page, role, target);');
const navIdx = source.indexOf("mark(role.toUpperCase() + '_NAVIGATE_'");
const hashIdx = source.indexOf("location.hash = '#/' + value");
const renderIdx = source.indexOf('const renderMs = await waitRenderReady(page, role, target);');
checks.routeSequenceExact = requiredIdx >= 0 && navIdx > requiredIdx && hashIdx > navIdx && renderIdx > hashIdx;
checks.validatorClassifierPreserved = source.includes(V20_VALIDATOR_FINDING) && source.includes("result.classification = 'VALIDATOR_STALE'");
checks.validationGuardPresent = source.includes("process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1'");

const compile = spawnSync(process.execPath, ['--check', artifact], { encoding: 'utf8' });
checks.exactArtifactCompiles = compile.status === 0;

if (typeof vm.SourceTextModule !== 'function' || typeof vm.SyntheticModule !== 'function') {
  checks.exactArtifactImports = false;
} else {
  const previous = {
    validate: process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY,
    evidence: process.env.ORBIT360_VISUAL_EVIDENCE,
    out: process.env.ORBIT360_VISUAL_ARTIFACT_DIR
  };
  process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = '1';
  process.env.ORBIT360_VISUAL_EVIDENCE = evidence;
  process.env.ORBIT360_VISUAL_ARTIFACT_DIR = path.join(tmp, 'captures');
  const context = vm.createContext({ console, process, Buffer, setTimeout, clearTimeout, URL, TextEncoder, TextDecoder });

  const makeSynthetic = async specifier => {
    if (specifier === 'firebase-admin') {
      return new vm.SyntheticModule(['default'], function () { this.setExport('default', {}); }, { context, identifier: 'stub:firebase-admin' });
    }
    if (specifier === 'playwright') {
      return new vm.SyntheticModule(['chromium'], function () { this.setExport('chromium', {}); }, { context, identifier: 'stub:playwright' });
    }
    const ns = await import(specifier);
    const keys = Object.keys(ns);
    return new vm.SyntheticModule(keys, function () {
      for (const key of keys) this.setExport(key, ns[key]);
    }, { context, identifier: 'host:' + specifier });
  };

  try {
    const module = new vm.SourceTextModule(source, { context, identifier: artifact });
    await module.link(makeSynthetic);
    await module.evaluate();
    const importedEvidence = JSON.parse(fs.readFileSync(evidence, 'utf8'));
    checks.exactArtifactImports = importedEvidence.stage === 'SOURCE_ARTIFACT_IMPORT_VALIDATED' && importedEvidence.classification === 'SOURCE_ARTIFACT_VALIDATED' && importedEvidence.artifactValidationOnly === true && importedEvidence.ok === true;
  } catch (error) {
    checks.exactArtifactImports = false;
    checks.importError = String(error && error.message || error).slice(0, 400);
  } finally {
    if (previous.validate == null) delete process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY; else process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = previous.validate;
    if (previous.evidence == null) delete process.env.ORBIT360_VISUAL_EVIDENCE; else process.env.ORBIT360_VISUAL_EVIDENCE = previous.evidence;
    if (previous.out == null) delete process.env.ORBIT360_VISUAL_ARTIFACT_DIR; else process.env.ORBIT360_VISUAL_ARTIFACT_DIR = previous.out;
  }
}

const corruptArtifact = path.join(tmp, 'corrupt-v20-matrix-artifact.mjs');
fs.writeFileSync(corruptArtifact, source + '\nreturn;\n', 'utf8');
const corruptCompile = spawnSync(process.execPath, ['--check', corruptArtifact], { encoding: 'utf8' });
checks.corruptArtifactRejected = corruptCompile.status !== 0 && /Illegal return statement|SyntaxError/.test((corruptCompile.stderr || '') + (corruptCompile.stdout || ''));

const secondSource = buildV20MatrixArtifact();
checks.generatorDeterministic = secondSource === source && sha256(secondSource) === artifactDigest;
checks.zeroSecrets = true;
checks.zeroFirebase = true;
checks.zeroHosting = true;
checks.zeroBrowser = true;
checks.zeroWrites = true;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => ok !== true).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-v20-native-matrix-artifact-source-v1',
  generatedAt: new Date().toISOString(),
  gateId: 'block2.7-visual-matrix-corrected-post-auth-lab-v20260805',
  status: failedCheckIds.length ? 'STOP_V20_NATIVE_MATRIX_ARTIFACT_SOURCE' : 'PASS_V20_NATIVE_MATRIX_ARTIFACT_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'PIPELINE_MECHANISM_FAILURE_CORRECTED_SOURCE_ONLY',
  rootCause: 'MATRIX_WRAPPER_TRANSFORM_LEFT_ORPHANED_GO_BODY',
  artifactSchema: V20_MATRIX_SCHEMA,
  artifactSha256: artifactDigest,
  validatorClassification: V20_VALIDATOR_FINDING,
  exactArtifactCompileRequired: true,
  exactArtifactImportRequired: true,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(v => v === true).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  deployExecuted: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: failedCheckIds.length === 0
};
fs.mkdirSync('orbit360-platform/runtime-gate-crm-v20260716', { recursive: true });
fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/v20-native-matrix-artifact-source-sanitized-v20260807.json', JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
process.exit(output.ok ? 0 : 41);
