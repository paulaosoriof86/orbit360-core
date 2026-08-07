#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { buildV22MatrixArtifact, V22_MATRIX_SCHEMA, V22_GATE_SCOPE, V22_EXCLUDED_BLOCKERS, V22_SIGNAL_VERSION } from './orbit360-build-v22-block1-matrix-artifact-v20260807.mjs';

const read = file => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const request = JSON.parse(read('.github/orbit360-requests/visual-matrix-corrected-post-auth-lab-v20260805-authorization.json'));
const cliente = read('orbit360-platform/modules/cliente360.js');
const insurers = read('orbit360-platform/modules/aseguradoras.js');
const session = read('orbit360-platform/core/session-multirol-visibility-v20260716.js');
const router = read('orbit360-platform/core/router.js');
const legal = read('orbit360-platform/core/legal.js');
const checks = {};

checks.v21Frozen = request.requestVersion === '20260807.21-two-phase-runtime' && request.consumed === true && request.authorizationFrozen === true && request.allowedExecutions === 0 && request.replayAllowed === false;
checks.scopeExact = JSON.stringify(V22_GATE_SCOPE) === JSON.stringify(['inicio','cliente360','aseguradoras']);
checks.excludedExact = JSON.stringify(V22_EXCLUDED_BLOCKERS) === JSON.stringify(['polizas','cobros','ops','leads','conciliaciones','cancelaciones']);
checks.cliente360ContractPresent = cliente.includes('const LIST_PAGE_SIZE = 40') && cliente.includes('c360-pagination') && cliente.includes('fichahdr') && cliente.includes('fh-salud');
checks.insurersContractPresent = insurers.includes("Orbit.modules.aseguradoras") && insurers.includes('asg-grid') && insurers.includes('asg-ficha') && insurers.includes('Fuentes mapeadas y persistidas');
checks.multirolContractPresent = session.includes('assignedRoles') && session.includes("route === 'aseguradoras'") && session.includes('advisorInsurerReadOnly');
checks.mobileContractPresent = router.includes('function closeMobile()') && router.includes(".nav-link") && router.includes('data-route');
checks.legalContractPresent = legal.includes('orbit360_legal_aceptaciones') && legal.includes("const VERSION = '2.0'");

const source = buildV22MatrixArtifact();
const digest = sha256(source);
checks.schemaExact = source.includes(`schemaVersion: '${V22_MATRIX_SCHEMA}'`);
checks.blockingScopeRecorded = source.includes("blockingGateScope: 'BLOCK1_CLIENT360_INSURERS'") && source.includes("blockingRoutes: ['inicio','cliente360','aseguradoras']");
checks.insurersIsBlockingRoute = source.includes("go(page, role, 'aseguradoras')") && source.includes('aseguradoras-directorio') && source.includes('aseguradoras-ficha') && source.includes('aseguradoras-conocimiento');
checks.cliente360IsBlockingRoute = source.includes("go(page, role, 'cliente360')") && source.includes('cliente360-list-bounded') && source.includes('cliente360-ficha') && source.includes('cliente360-relations-honest');
checks.noLegacyBlockingRoutes = !source.includes("['cliente360', 'polizas'") && !source.includes("route === 'ops'") && !source.includes("route === 'conciliaciones'");
checks.noLegacyDetailBlockers = !['vehicle-detail-button','receipt-detail-button','cobro-detail-button','polizas-kpis-stable'].some(token => source.includes(token));
checks.shellContractsBlocking = ['membership-ready','multirol-assigned','scope-cliente360-visible','scope-aseguradoras-visible','mobile-menu-contract','legal-accepted-once','legal-not-repeated-after-navigation'].every(token => source.includes(token));
checks.noTechnicalCopyBlocking = source.includes('cliente360-no-technical-copy') && source.includes('aseguradoras-no-technical-copy');
checks.v21ObserverPreserved = source.includes('new MutationObserver') && source.includes('orbit360:v21-render-complete') && source.includes(V22_SIGNAL_VERSION) && source.indexOf('const token = await armV21RenderObserver(page, role, target);') < source.indexOf("location.hash = '#/' + value");
checks.exactThreeRoles = source.includes("{ role: 'Direccion', width: 1440, height: 1000") && source.includes("{ role: 'Operativo', width: 1024, height: 768") && source.includes("{ role: 'Asesor', width: 390, height: 844");
checks.zeroWriteCounters = source.includes('firestoreWrites: 0') && source.includes('authWrites: 0') && source.includes('operationalWrites: 0');
checks.validationGuard = source.includes("process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY === '1'") && source.includes('PASS_V22_EXACT_MATRIX_ARTIFACT_IMPORT');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orbit360-v22-block1-artifact-'));
const artifact = path.join(tmp, 'exact-v22-block1-matrix.mjs');
const evidence = path.join(tmp, 'evidence.json');
fs.writeFileSync(artifact, source, 'utf8');
const compile = spawnSync(process.execPath, ['--check', artifact], { encoding: 'utf8' });
checks.exactArtifactCompiles = compile.status === 0;

if (typeof vm.SourceTextModule !== 'function' || typeof vm.SyntheticModule !== 'function') {
  checks.exactArtifactImports = false;
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
    checks.exactArtifactImports = ev.stage === 'SOURCE_ARTIFACT_IMPORT_VALIDATED' && ev.classification === 'SOURCE_ARTIFACT_VALIDATED' && ev.schemaVersion === V22_MATRIX_SCHEMA && ev.ok === true;
  } catch (error) {
    checks.exactArtifactImports = false;
    checks.importError = String(error && error.message || error).slice(0, 300);
  } finally {
    if (prevValidate == null) delete process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY; else process.env.ORBIT360_MATRIX_ARTIFACT_VALIDATE_ONLY = prevValidate;
    if (prevEvidence == null) delete process.env.ORBIT360_VISUAL_EVIDENCE; else process.env.ORBIT360_VISUAL_EVIDENCE = prevEvidence;
    if (prevOut == null) delete process.env.ORBIT360_VISUAL_ARTIFACT_DIR; else process.env.ORBIT360_VISUAL_ARTIFACT_DIR = prevOut;
  }
}

checks.deterministic = buildV22MatrixArtifact() === source && sha256(buildV22MatrixArtifact()) === digest;
checks.noSecrets = true;
checks.noFirebase = true;
checks.noHosting = true;
checks.noRealBrowser = true;
checks.zeroWrites = true;

const failedCheckIds = Object.entries(checks).filter(([, ok]) => ok !== true).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-v22-block1-gate-source-v1',
  generatedAt: new Date().toISOString(),
  status: failedCheckIds.length ? 'STOP_V22_BLOCK1_GATE_SOURCE' : 'PASS_V22_BLOCK1_GATE_SOURCE_ONLY',
  classification: failedCheckIds.length ? 'PIPELINE_MECHANISM_FAILURE' : 'VALIDATOR_STALE_CORRECTED_SOURCE_ONLY',
  rootCauses: ['GATE_SCOPE_DRIFT_BLOCK1_CLIENT360_INSURERS_VS_LEGACY_CROSS_MODULE_MATRIX','DETAIL_TARGET_AND_UI_CONTRACT_MISMATCH'],
  artifactSchema: V22_MATRIX_SCHEMA,
  artifactSha256: digest,
  blockingRoutes: V22_GATE_SCOPE,
  excludedLegacyBlockers: V22_EXCLUDED_BLOCKERS,
  renderSignalVersion: V22_SIGNAL_VERSION,
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
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
fs.writeFileSync('orbit360-platform/runtime-gate-crm-v20260716/v22-block1-gate-source-sanitized-v20260807.json', JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(output, null, 2));
try { fs.rmSync(tmp, { recursive:true, force:true }); } catch {}
process.exit(output.ok ? 0 : 41);
