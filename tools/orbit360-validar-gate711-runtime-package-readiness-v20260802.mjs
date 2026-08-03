#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-package-readiness-v20260802.json');
const PRODUCT_HEAD = '997fca628f95dd397dba347700a6bc644fe840f0';
const files = {
  staticLifecycle: 'tools/orbit360-validator-lifecycle-contract-gate711-release-critical-static-v20260802.json',
  scope: 'tools/orbit360-gate711-release-critical-scope-v20260802.json',
  runtime: 'tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs',
  requestTemplate: '.github/orbit360-templates/gate711-release-critical-runtime-request-template-v20260802.json',
  lifecycleTemplate: 'tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json',
  workflow: '.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml',
  cloudLedger: 'orbit360-platform/docs/SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md',
  currentReadme: 'orbit360-platform/docs/README-GATE711-CURRENT.md',
  genericPreflight: 'tools/orbit360-validar-gate-contracts-v20260717.mjs',
  genericEngine: 'tools/orbit360-validar-gate-contracts-engine-canonical-runtime-cumulative-visual-lab-v20260801.mjs',
  identity: 'tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs',
  snapshot: 'tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs'
};

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const read = rel => exists(rel) ? fs.readFileSync(abs(rel), 'utf8') : '';
const count = (text, token) => text.split(token).length - 1;
const all = (text, terms) => terms.every(term => typeof term === 'string' ? text.includes(term) : term.test(text));

try {
  Object.entries(files).forEach(([key, rel]) => add('FILE_' + key.toUpperCase(), exists(rel), rel));
  const missing = Object.values(files).filter(rel => !exists(rel));
  if (missing.length) throw new Error('PIPELINE_MECHANISM_FAILURE:MISSING_FILES:' + missing.join(','));

  const staticLifecycle = JSON.parse(read(files.staticLifecycle));
  const scope = JSON.parse(read(files.scope));
  const requestTemplate = JSON.parse(read(files.requestTemplate));
  const lifecycleTemplate = JSON.parse(read(files.lifecycleTemplate));
  const runtime = read(files.runtime);
  const workflow = read(files.workflow);
  const cloudLedger = read(files.cloudLedger);
  const currentReadme = read(files.currentReadme);

  add('STATIC_CLOSURE', staticLifecycle.status === 'GATE711_RELEASE_CRITICAL_STATIC_PASS_CLOSED' && staticLifecycle.closureEvidence?.run === 30771933766 && staticLifecycle.closureEvidence?.checks === '38/38' && staticLifecycle.closureEvidence?.productFreeze === 'PASS');
  add('SCOPE_LOCK', scope.productHead === PRODUCT_HEAD && scope.singleCandidatePolicy?.required === true && scope.singleCandidatePolicy?.parallelCandidateAllowed === false && scope.academiaBoundary?.runtimeContentCompletenessBlocksThisRelease === false);
  add('REQUEST_TEMPLATE_INERT', requestTemplate.status === 'INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION' && requestTemplate.approved === false && requestTemplate.allowedExecutions === 0 && requestTemplate.consumed === true && requestTemplate.authorizedProductHead === PRODUCT_HEAD);
  add('REQUEST_TEMPLATE_SINGLE_SESSION', requestTemplate.executionInvariants?.singleBrowserSession === true && requestTemplate.executionInvariants?.legalOnce === true && requestTemplate.executionInvariants?.microAuthorizations === false && requestTemplate.executionInvariants?.focusedAcademiaRuntime === false);
  add('REQUEST_TEMPLATE_SCOPE', requestTemplate.releaseCriticalScope?.expectedSanitizedScreenshots === 14 && requestTemplate.releaseCriticalScope?.academiaContentCompletenessBlocksRelease === false && Array.isArray(requestTemplate.releaseCriticalScope?.routes) && requestTemplate.releaseCriticalScope.routes.includes('ops') && requestTemplate.releaseCriticalScope.routes.includes('leads'));
  add('LIFECYCLE_TEMPLATE_INERT', lifecycleTemplate.status === 'INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION' && lifecycleTemplate.authorization?.explicit === false && lifecycleTemplate.authorization?.allowedExecutions === 0 && lifecycleTemplate.authorization?.consumed === true && lifecycleTemplate.sourceLock?.productHead === PRODUCT_HEAD);
  add('LIFECYCLE_TEMPLATE_GUARDS', lifecycleTemplate.scope?.singleBrowserSession === true && lifecycleTemplate.scope?.legalOnce === true && lifecycleTemplate.scope?.focusedAcademiaRuntime === false && lifecycleTemplate.scope?.academiaContentCompletenessBlocksRelease === false && lifecycleTemplate.guards?.firestoreDataWritesAllowed === false && lifecycleTemplate.guards?.operationalWritesAllowed === 0 && lifecycleTemplate.guards?.hostingDeployAllowed === false && lifecycleTemplate.guards?.productionAllowed === false);

  add('RUNTIME_IDENTITY', all(runtime, ["status = 'GATE711_RELEASE_CRITICAL_RUNTIME_PASS'", "classification = 'GO_LAB_RELEASE_CRITICAL_CRM_OPS_LEADS'", "authMode: 'existing_custom_token_readonly'"]));
  add('RUNTIME_DATASET', all(runtime, ['clientes: 430', 'aseguradoras: 30', 'polizas: 1373', 'vehiculos: 1032', 'recibosEsperados: 1294', 'carteraPrimas: 673', 'cobros: 5', 'asesores: 7', 'REQUIRED_STORE_API']));
  add('RUNTIME_SINGLE_SESSION', count(runtime, 'chromium.launch') === 1 && count(runtime, 'browser.newContext') === 1 && count(runtime, 'async function settleLegal(page)') === 1 && count(runtime, 'await settleLegal(page);') === 1 && runtime.includes('legalSettledBeforeWriteGuard'));
  add('RUNTIME_ROLE_MATRIX', all(runtime, ["role: 'Dirección'", "role: 'Operativo'", "role: 'Asesor'", "ops: 'restricted'", "#/cliente360", "#/aseguradoras", "#/polizas", "#/ops", "#/leads"]));
  add('RUNTIME_SAFETY', all(runtime, ['RUNTIME_WRITE_GUARD', 'firestoreWrites: 0', 'operationalWrites: 0', 'reimportExecuted: false', 'hostingDeploy: false', 'previewDeploy: false', 'production: false', 'containsPII: false', 'containsSecrets: false']));
  add('RUNTIME_ACADEMIA_BOUNDARY', runtime.includes('focusedRuntimePrerequisite: false') && runtime.includes('contentCompletenessBlocksRelease: false') && !runtime.includes("#/academia") && !runtime.includes('academia_root_fix_ready'));
  add('RUNTIME_SCREENSHOTS', runtime.includes("report.screenshots.length === 14") && runtime.includes('maskedOperationalContent: true'));

  const preflightPos = workflow.indexOf('node tools/orbit360-validar-gate-contracts-v20260717.mjs');
  const credentialPos = workflow.indexOf('Resolver identidad de servicio LAB');
  const identityPos = workflow.indexOf('Preparar identidad existente read-only');
  const snapshotBeforePos = workflow.indexOf('Snapshot canónico inicial');
  const servePos = workflow.indexOf('Servir checkout exacto sin deploy');
  const runtimePos = workflow.indexOf('node tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs');
  const snapshotAfterPos = workflow.indexOf('Snapshot final y comparación exacta');
  add('WORKFLOW_ORDER', preflightPos >= 0 && credentialPos > preflightPos && identityPos > credentialPos && snapshotBeforePos > identityPos && servePos > snapshotBeforePos && runtimePos > servePos && snapshotAfterPos > runtimePos && all(workflow, ['export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"', 'export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"', '.explicitTokenPathHonored==true', '.explicitConfigPathHonored==true']));
  add('WORKFLOW_MANDATORY_PREFLIGHT', all(workflow, ['Gate contractual obligatorio antes de secrets', 'tools/orbit360-validar-gate-contracts-v20260717.mjs', 'GO_GATE_CONTRACT', 'GATE711_RELEASE_CRITICAL_STATIC_PASS']));
  add('WORKFLOW_ONE_RUNTIME', count(workflow, 'node tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs') === 1 && !workflow.includes('node tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs') && !workflow.includes('node tools/orbit360-validar-gate711-ops-leads-runtime-v20260802.mjs'));
  add('WORKFLOW_NO_ACADEMIA_PREREQ', !workflow.includes('academia_root_fix_ready') && !workflow.includes('targeted_rootfix_runtime_readonly') && !workflow.includes('focused Academia'));
  add('WORKFLOW_IMMUTABLE_REQUEST', all(workflow, ['GITHUB_RUN_ATTEMPT', 'git rev-parse HEAD^', 'git diff-tree --no-commit-id --name-only -r HEAD', 'allowedExecutions==1', 'consumed==false']));
  add('WORKFLOW_PRODUCT_FREEZE', workflow.includes('git diff --name-only "$ORBIT360_PRODUCT_HEAD"..HEAD') && workflow.includes("test \"${#PRODUCT_DIFF[@]}\" = '0'"));
  add('WORKFLOW_SNAPSHOTS', all(workflow, ['gate711-release-critical-before-v20260802.json', 'gate711-release-critical-after-v20260802.json', 'sourceSnapshotDigest', 'targetSnapshotDigest']));
  add('WORKFLOW_NO_DEPLOY', !/firebase\s+deploy|gcloud\s+run\s+deploy|firebase\s+hosting:channel:deploy|git\s+push\s+origin\s+main/i.test(workflow));
  add('WORKFLOW_STATUS_OBSERVABLE', workflow.includes('orbit360/gate711-release-critical-runtime') && workflow.includes('STOP_RETRY'));

  add('CLOUD_DOCUMENTED_NOT_SENT', all(cloudLedger, ['NO_ENVIO', 'NO_DEPLOY', 'NO_DATOS_REALES', 'Paquete Claude / Cloud reutilizable', '`NO_ENVIADO`']));
  add('README_FRONTIER', all(currentReadme, ['CRM_OPS_LEADS_RUNTIME_READONLY_PENDING', 'ACADEMIA_CONTENT_RUNTIME_NONBLOCKING', 'CLOUD_CLAUDE_PACKAGE_DOCUMENTED_NOT_SENT', '38/38']));

  const syntax = spawnSync(process.execPath, ['--check', abs(files.runtime)], { encoding: 'utf8' });
  add('RUNTIME_SYNTAX', syntax.status === 0, String(syntax.stderr || syntax.stdout || '').trim().slice(0, 300));

  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion: 'orbit360-gate711-runtime-package-readiness-evidence-v1',
    gateId: 'block7-canonical-runtime-cumulative-visual-lab-v20260801',
    productHead: PRODUCT_HEAD,
    status: failed.length ? 'GATE711_RUNTIME_PACKAGE_READINESS_FAIL' : 'GATE711_RUNTIME_PACKAGE_READINESS_PASS',
    classification: failed.length ? 'DATA_CONTRACT_FAILURE' : 'GO_STATIC_RUNTIME_PACKAGE_CRM_OPS_LEADS',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(check => check.id),
    checks,
    packageInert: true,
    authorizationActive: false,
    secretsAccessed: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    cloudPackageSent: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: failed.length === 0
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(failed.length ? 41 : 0);
} catch (error) {
  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion: 'orbit360-gate711-runtime-package-readiness-evidence-v1',
    gateId: 'block7-canonical-runtime-cumulative-visual-lab-v20260801',
    productHead: PRODUCT_HEAD,
    status: 'GATE711_RUNTIME_PACKAGE_READINESS_FAIL',
    classification: String(error && error.message || error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: Math.max(1, failed.length),
    failedCheckIds: failed.map(check => check.id),
    error: String(error && error.message || error).slice(0, 600),
    packageInert: true,
    authorizationActive: false,
    secretsAccessed: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
    cloudPackageSent: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    ok: false
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
  process.exit(41);
}
