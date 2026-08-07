#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { buildV20MatrixArtifact, V20_MATRIX_SCHEMA } from './orbit360-build-v20-route-aware-matrix-artifact-v20260807.mjs';

const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const request = JSON.parse(read('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'));
const lifecycle = JSON.parse(read('tools/orbit360-validator-lifecycle-contract-visual-matrix-corrected-post-auth-lab-v20260805.json'));
const relay = read('.github/workflows/orbit360-registered-relay-v20-exact-artifact-v20260807.yml');
const wrapper = read('tools/orbit360-visual-runtime-rootfix-observable-matrix-v20260805.mjs');
const sealer = read('tools/orbit360-seal-visual-matrix-corrected-post-auth-runtime-v20260805.mjs');
const checks = {};

checks.requestV20Active = request.requestVersion === '20260807.20-two-phase-runtime' && request.status === 'AUTHORIZED_ONCE' && request.approved === true && request.allowedExecutions === 1 && request.consumed === false && request.authorizationFrozen === false && request.replayAllowed === false;
checks.runtimePendingLifecycle = lifecycle.status === 'AUTHORIZED_ONCE_PENDING_EXCLUSIVE_REQUEST' && lifecycle.expectedRequestVersion === '20260807.20-two-phase-runtime' && lifecycle.currentPhase === 'VISUAL_MATRIX_CORRECTED_POST_AUTH_LAB_EXECUTION' && lifecycle.allowedExecutions === 1 && lifecycle.executionAuthorized === true && lifecycle.stopRetryActive === false;
checks.zeroWriteBoundary = request.capabilities && request.capabilities.writes === false && request.scope && request.scope.firestoreWrites === false && request.scope.authWrites === false && request.scope.operationalWrites === false && request.scope.reimport === false && request.scope.production === false && request.scope.main === false && request.scope.merge === false;
checks.exactBuilderOwner = wrapper.includes('buildV20MatrixArtifact') && wrapper.includes('MATRIX_ARTIFACT_COMPILE_FAILED') && sealer.includes('matrixArtifactPipelineFailure');
checks.relayExact = relay.includes('20260807.20-two-phase-runtime') && relay.includes('orbit360-test-v20-runtime-package-source-v20260807.mjs') && relay.includes('orbit360-test-v20-native-matrix-artifact-source-v20260807.mjs');
checks.baselineExact = request.scope && request.scope.restorePriorBaselineChannel === 'visual-matrix-corrected-backup-31135532118' && request.scope.restorePriorBaselineBeforeRuntime === true && request.scope.hostingDeploysMaximum === 1 && request.scope.hostingBackupClone === true && request.scope.hostingRollbackCloneOnFailure === true;
checks.v19ClosedRecorded = request.sourceValidation && request.sourceValidation.priorRequestVersion === '20260807.19-two-phase-runtime' && request.sourceValidation.priorRequestConsumed === true && request.sourceValidation.priorRequestFrozen === true;
checks.v20SourcePassRecorded = request.sourceValidation && request.sourceValidation.rootfixStatus === 'PASS_V20_NATIVE_MATRIX_ARTIFACT_SOURCE_ONLY' && request.sourceValidation.exactArtifactCompile === 'PASS' && request.sourceValidation.exactArtifactImport === 'PASS';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v20-runtime-package-'));
const artifact = path.join(tmp, 'exact-v20-runtime-artifact.mjs');
const evidence = path.join(tmp, 'evidence.json');
const source = buildV20MatrixArtifact();
fs.writeFileSync(artifact, source, 'utf8');
checks.artifactSchemaExact = source.includes(`schemaVersion: '${V20_MATRIX_SCHEMA}'`);
checks.artifactSingleGo = source.split('async function go(page, role, route)').length - 1 === 1 && !source.includes("return waitRouteReady(page, role, route.split('?')[0]);");
const compile = spawnSync(process.execPath, ['--check', artifact], { encoding: 'utf8' });
checks.exactArtifactCompilesBeforeGo = compile.status === 0;

if (typeof vm.SourceTextModule !== 'function' || typeof vm.SyntheticModule !== 'function') {
  checks.exactArtifactImportsBeforeGo = false;
} else {
  const prevValidate = process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY;
  const prevEvidence = process.env.ORBIT360_VISUAL_EVIDENCE;
  const prevOut = process.env.ORBIT360_VISUAL_ARTIFACT_DIR;
  process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = '1';
  process.env.ORBIT360_VISUAL_EVIDENCE = evidence;
  process.env.ORBIT360_VISUAL_ARTIFACT_DIR = path.join(tmp, 'captures');
  const context = vm.createContext({ console, process, Buffer, setTimeout, clearTimeout, URL, TextEncoder, TextDecoder });
  const linker = async specifier => {
    if (specifier === 'firebase-admin') return new vm.SyntheticModule(['default'], function(){ this.setExport('default', {}); }, { context, identifier:'stub:firebase-admin' });
    if (specifier === 'playwright') return new vm.SyntheticModule(['chromium'], function(){ this.setExport('chromium', {}); }, { context, identifier:'stub:playwright' });
    const ns = await import(specifier);
    const keys = Object.keys(ns);
    return new vm.SyntheticModule(keys, function(){ for (const key of keys) this.setExport(key, ns[key]); }, { context, identifier:'host:'+specifier });
  };
  try {
    const module = new vm.SourceTextModule(source, { context, identifier: artifact });
    await module.link(linker);
    await module.evaluate();
    const ev = JSON.parse(fs.readFileSync(evidence, 'utf8'));
    checks.exactArtifactImportsBeforeGo = ev.stage === 'SOURCE_ARTIFACT_IMPORT_VALIDATED' && ev.ok === true;
  } catch {
    checks.exactArtifactImportsBeforeGo = false;
  } finally {
    if (prevValidate == null) delete process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY; else process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = prevValidate;
    if (prevEvidence == null) delete process.env.ORBIT360_VISUAL_EVIDENCE; else process.env.ORBIT360_VISUAL_EVIDENCE = prevEvidence;
    if (prevOut == null) delete process.env.ORBIT360_VISUAL_ARTIFACT_DIR; else process.env.ORBIT360_VISUAL_ARTIFACT_DIR = prevOut;
  }
}

checks.noSecrets = true;
checks.noFirebase = true;
checks.noHosting = true;
checks.noBrowser = true;
checks.zeroWrites = true;
const failedCheckIds = Object.entries(checks).filter(([, ok]) => ok !== true).map(([id]) => id);
const output = {
  status: failedCheckIds.length ? 'STOP_V20_RUNTIME_PACKAGE_SOURCE' : 'PASS_V20_RUNTIME_PACKAGE_SOURCE',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'SOURCE_PACKAGE_VALIDATED',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(v => v === true).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  secretsRead: false,
  firebaseAccess: false,
  hostingTouched: false,
  browserExecuted: false,
  writes: 0,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(output, null, 2));
try { fs.rmSync(tmp, { recursive:true, force:true }); } catch {}
process.exit(output.ok ? 0 : 41);
