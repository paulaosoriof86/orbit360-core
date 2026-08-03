#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gate711-runtime-chain-static-v20260802.json');
const PRODUCT_HEAD = '997fca628f95dd397dba347700a6bc644fe840f0';
const BRANCH = 'ays/backend-tenant-lab-v99-20260703';
const GATE = 'block7-canonical-runtime-cumulative-visual-lab-v20260801';

const files = {
  workflow: '.github/workflows/orbit360-gate711-release-critical-runtime-v20260802.yml',
  packageReadiness: 'tools/orbit360-validar-gate711-runtime-package-readiness-v20260802.mjs',
  identity: 'tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs',
  snapshot: 'tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs',
  runtime: 'tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs',
  loader: 'orbit360-platform/core/backend-lab-loader.js',
  index: 'orbit360-platform/index.html',
  requestTemplate: '.github/orbit360-templates/gate711-release-critical-runtime-request-template-v20260802.json',
  lifecycleTemplate: 'tools/orbit360-gate711-release-critical-runtime-lifecycle-template-v20260802.json',
  currentReadme: 'orbit360-platform/docs/README-GATE711-CURRENT.md'
};

const checks = [];
const add = (id, ok, detail = '') => checks.push({ id, ok: Boolean(ok), detail });
const abs = rel => path.join(ROOT, rel);
const exists = rel => fs.existsSync(abs(rel));
const read = rel => exists(rel) ? fs.readFileSync(abs(rel), 'utf8') : '';
const count = (text, token) => text.split(token).length - 1;
const includesAll = (text, terms) => terms.every(term => text.includes(term));
const position = (text, token) => text.indexOf(token);

function syntax(rel) {
  const result = spawnSync(process.execPath, ['--check', abs(rel)], { encoding: 'utf8' });
  return { ok: result.status === 0, detail: String(result.stderr || result.stdout || '').trim().slice(0, 300) };
}

try {
  for (const [key, rel] of Object.entries(files)) add('FILE_' + key.toUpperCase(), exists(rel), rel);
  const missing = Object.values(files).filter(rel => !exists(rel));
  if (missing.length) throw new Error('PIPELINE_MECHANISM_FAILURE:MISSING_FILES:' + missing.join(','));

  const workflow = read(files.workflow);
  const packageReadiness = read(files.packageReadiness);
  const identity = read(files.identity);
  const snapshot = read(files.snapshot);
  const runtime = read(files.runtime);
  const loader = read(files.loader);
  const index = read(files.index);
  const requestTemplate = JSON.parse(read(files.requestTemplate));
  const lifecycleTemplate = JSON.parse(read(files.lifecycleTemplate));
  const currentReadme = read(files.currentReadme);

  add('REQUEST_TEMPLATE_INERT', requestTemplate.status === 'INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION' && requestTemplate.approved === false && requestTemplate.allowedExecutions === 0 && requestTemplate.consumed === true && requestTemplate.authorizedProductHead === PRODUCT_HEAD);
  add('LIFECYCLE_TEMPLATE_INERT', lifecycleTemplate.status === 'INERT_TEMPLATE_PENDING_EXPLICIT_AUTHORIZATION' && lifecycleTemplate.authorization?.explicit === false && lifecycleTemplate.authorization?.allowedExecutions === 0 && lifecycleTemplate.authorization?.consumed === true && lifecycleTemplate.sourceLock?.productHead === PRODUCT_HEAD);
  add('LIFECYCLE_ROUTER_REVISION', lifecycleTemplate.validatorLifecycleRevision === 'phase-capability-contract-v1');
  add('LIFECYCLE_EXACT_CAPABILITIES', JSON.stringify(lifecycleTemplate.intendedExecutionProfileAfterAuthorization?.capabilities || {}) === JSON.stringify({secrets:true,firestoreRead:true,writes:false,runtime:true,browser:true,deploy:false,functionsDeploy:false,rulesDeploy:false,production:false}));

  const authPos = position(workflow, 'Verificar autorización inmutable y freeze antes de secrets');
  const preflightPos = position(workflow, 'Gate contractual obligatorio antes de secrets');
  const dependenciesPos = position(workflow, 'Instalar dependencias controladas');
  const servicePos = position(workflow, 'Resolver identidad de servicio LAB');
  const identityPos = position(workflow, 'Preparar identidad existente read-only');
  const snapshotBeforePos = position(workflow, 'Snapshot canónico inicial');
  const servePos = position(workflow, 'Servir checkout exacto sin deploy');
  const runtimePos = position(workflow, 'Ejecutar una sola sesión CRM Ops Leads');
  const snapshotAfterPos = position(workflow, 'Snapshot final y comparación exacta');
  const artifactPos = position(workflow, 'Guardar evidencia sanitizada');
  const cleanupPos = position(workflow, 'Limpiar archivos temporales');
  const finalStatusPos = position(workflow, 'Publicar estado observable final');
  add('WORKFLOW_TOTAL_ORDER', [authPos,preflightPos,dependenciesPos,servicePos,identityPos,snapshotBeforePos,servePos,runtimePos,snapshotAfterPos,artifactPos,cleanupPos,finalStatusPos].every((value,index,array)=>value>=0&&(index===0||value>array[index-1])));
  add('WORKFLOW_SINGLE_RUNTIME', count(workflow, 'node tools/orbit360-validar-gate711-release-critical-runtime-v20260802.mjs') === 1);
  add('WORKFLOW_SINGLE_SNAPSHOT_PRODUCER', count(workflow, 'node tools/orbit360-revalidar-policies-full-canonical-readonly-v20260801.mjs') === 2);
  add('WORKFLOW_NO_RETRY', workflow.includes('test "$GITHUB_RUN_ATTEMPT" = \'1\'') && workflow.includes('STOP_RETRY') && workflow.includes('cancel-in-progress: false'));
  add('WORKFLOW_PRODUCT_FREEZE', includesAll(workflow, ['ORBIT360_PRODUCT_HEAD: ' + PRODUCT_HEAD, 'git diff --name-only "$ORBIT360_PRODUCT_HEAD"..HEAD', 'test "${#PRODUCT_DIFF[@]}" = \'0\'']));
  add('WORKFLOW_BRANCH_LOCK', workflow.includes('ORBIT360_BRANCH: ' + BRANCH) && workflow.includes('test "$GITHUB_REF_NAME" = "$ORBIT360_BRANCH"'));
  add('WORKFLOW_GATE_LOCK', workflow.includes('ORBIT360_GATE_ID: ' + GATE));

  add('IDENTITY_ENV_EXPORT_BEFORE_HELPER', position(workflow, 'export ORBIT360_CUSTOM_TOKEN_FILE="$TOKEN_FILE"') < position(workflow, 'node tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs') && position(workflow, 'export ORBIT360_LOCAL_FIREBASE_CONFIG_FILE="$CONFIG_FILE"') < position(workflow, 'node tools/orbit360-preparar-identidad-browser-canonica-readonly-v20260801.mjs'));
  add('IDENTITY_POSTCHECK_EXPLICIT_PATHS', includesAll(workflow, ['explicitTokenPathHonored==true', 'explicitConfigPathHonored==true', 'test -s "$TOKEN_FILE"', 'test -s "$CONFIG_FILE"']));
  add('IDENTITY_PRODUCER_CONSUMER_TOKEN', identity.includes('process.env.ORBIT360_CUSTOM_TOKEN_FILE') && workflow.includes('echo "ORBIT360_CUSTOM_TOKEN_FILE=$TOKEN_FILE" >> "$GITHUB_ENV"') && runtime.includes("process.env.ORBIT360_CUSTOM_TOKEN_FILE"));
  add('IDENTITY_PRODUCER_CONSUMER_CONFIG', identity.includes('process.env.ORBIT360_LOCAL_FIREBASE_CONFIG_FILE') && workflow.includes('echo "ORBIT360_LOCAL_FIREBASE_CONFIG_FILE=$CONFIG_FILE" >> "$GITHUB_ENV"') && loader.includes("'core/auth-firebase.config.local.js'"));
  add('IDENTITY_READONLY_GUARDS', includesAll(identity, ['existingOnly', 'authWrites:0', 'firestoreWrites:0', 'operationalWrites:0', 'createCustomToken']));

  const snapshotOutput = 'orbit360-platform/runtime-gate-crm-v20260716/policies-full-canonical-revalidation-readonly-v20260801.json';
  add('SNAPSHOT_OUTPUT_MATCH', snapshot.includes(snapshotOutput) && workflow.includes('$EVIDENCE_DIR/policies-full-canonical-revalidation-readonly-v20260801.json'));
  add('SNAPSHOT_ENV_MATCH', includesAll(snapshot, ['ORBIT360_PRODUCT_PROJECT_ID', 'ORBIT360_PRODUCT_TENANT_ID', 'GOOGLE_APPLICATION_CREDENTIALS']) && includesAll(workflow, ['GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE', 'ORBIT360_PRODUCT_PROJECT_ID=$ORBIT360_PROJECT_ID', 'ORBIT360_PRODUCT_TENANT_ID=$ORBIT360_TENANT_ID']));
  add('SNAPSHOT_BEFORE_AFTER_FILES', includesAll(workflow, ['gate711-release-critical-before-v20260802.json', 'gate711-release-critical-after-v20260802.json']));
  add('SNAPSHOT_DIGEST_FIELDS_PRODUCED', includesAll(snapshot, ['sourceSnapshotDigest', 'targetSnapshotDigest', 'canonicalDigestSealed']));
  add('SNAPSHOT_DIGEST_FIELDS_CONSUMED', includesAll(workflow, ["'.digests.sourceSnapshotDigest'", "'.digests.targetSnapshotDigest'", '19e1927d39f6b713ee12504f8762bc42ead9de6e365bb0f12162d2a0c8f8469b']));
  add('SNAPSHOT_READONLY_GUARDS', includesAll(snapshot, ['firestoreWrites:0', 'operationalWrites:0', 'reimportExecuted:false', 'productionTouched:false']));

  add('SERVER_DIRECTORY_MATCH', workflow.includes('python3 -m http.server 4173 --directory orbit360-platform'));
  add('SERVER_HEALTHCHECK_MATCH', includesAll(workflow, ['http://127.0.0.1:4173/index.html', 'curl -fsS']));
  add('SERVER_BASE_URL_EXPORTED', workflow.includes('ORBIT360_BASE_URL=http://127.0.0.1:4173/index.html?orbitBackend=firestore-lab&tenant=alianzas-soluciones#/inicio'));
  add('SERVER_RUNTIME_BASE_URL_CONSUMED', runtime.includes("process.env.ORBIT360_BASE_URL") && runtime.includes("requireState(/^https?:\\/\\//.test(BASE_URL), 'BASE_URL_INVALID')"));
  add('LOCAL_CONFIG_LOADER_MATCH', loader.includes("var configSource = isFirebaseHosting ? '/__/firebase/init.js' : 'core/auth-firebase.config.local.js'") && workflow.includes('orbit360-platform/core/auth-firebase.config.local.js'));
  add('INDEX_LOADER_ORDER', position(index, 'core/backend-lab-loader.js') >= 0 && position(index, 'core/backend-lab-loader.js') < position(index, 'core/backend-lab-init.js') && position(index, 'core/backend-lab-init.js') < position(index, 'data/store-firestore-lab.local.js'));

  add('RUNTIME_OUTPUT_MATCH', runtime.includes("gate711-release-critical-runtime-v20260802.json") && workflow.includes('$EVIDENCE_DIR/gate711-release-critical-runtime-v20260802.json'));
  add('RUNTIME_SCREENSHOT_DIR_MATCH', runtime.includes("visual-sanitized-gate711-release-critical-v20260802") && workflow.includes('visual-sanitized-gate711-release-critical-v20260802/*.png'));
  add('RUNTIME_SCREENSHOT_COUNT_MATCH', runtime.includes('report.screenshots.length === 14') && workflow.includes('(.screenshots|length)==14'));
  add('RUNTIME_SINGLE_BROWSER_CONTEXT', count(runtime, 'chromium.launch') === 1 && count(runtime, 'browser.newContext') === 1 && count(runtime, 'context.newPage') === 1);
  add('RUNTIME_LEGAL_ONCE', count(runtime, 'await settleLegal(page);') === 1 && runtime.includes('legalSettledBeforeWriteGuard'));
  add('RUNTIME_WRITE_GUARD', includesAll(runtime, ["['insert', 'update', 'remove', 'setPref']", 'RUNTIME_WRITE_GUARD', 'final.writeCalls.length === 0']));
  add('RUNTIME_EXPECTED_COUNTS', includesAll(runtime, ['clientes: 430','aseguradoras: 30','polizas: 1373','vehiculos: 1032','recibosEsperados: 1294','carteraPrimas: 673','cobros: 5','asesores: 7']));
  add('RUNTIME_ROLE_MATRIX', includesAll(runtime, ["role: 'Dirección'", "role: 'Operativo'", "role: 'Asesor'", "ops: 'restricted'", "#/cliente360", "#/aseguradoras", "#/polizas", "#/ops", "#/leads"]));
  add('RUNTIME_FAILURE_EVIDENCE_ALWAYS_SAVED', runtime.includes('finally {') && runtime.includes('save();') && runtime.includes('process.exit(report.ok ? 0 : 41)'));

  add('ARTIFACT_CONTAINS_ALL_EVIDENCE', includesAll(workflow, ['preflight-sanitizado.json','gate711-release-critical-static-v20260802.json','canonical-browser-identity-readonly-v20260801.json','gate711-release-critical-before-v20260802.json','gate711-release-critical-runtime-v20260802.json','gate711-release-critical-after-v20260802.json','visual-sanitized-gate711-release-critical-v20260802/*.png']));
  add('ARTIFACT_ALWAYS', /- name: Guardar evidencia sanitizada[\s\S]*?if: always\(\)/.test(workflow));
  add('CLEANUP_ALWAYS', /- name: Limpiar archivos temporales[\s\S]*?if: always\(\)/.test(workflow));
  add('CLEANUP_SERVER', workflow.includes('kill "$ORBIT360_SERVER_PID"'));
  add('CLEANUP_SECRETS_AND_TEMP', workflow.includes('rm -f "${ORBIT360_TEMP_KEY_FILE:-}" "${ORBIT360_CUSTOM_TOKEN_FILE:-}" "${ORBIT360_LOCAL_FIREBASE_CONFIG_FILE:-}"'));
  add('FINAL_STATUS_ALWAYS', /- name: Publicar estado observable final[\s\S]*?if: always\(\)/.test(workflow));
  add('NO_DEPLOY_COMMANDS', !/firebase\s+deploy|firebase\s+hosting:channel:deploy|gcloud\s+run\s+deploy|git\s+push\s+origin\s+main|gh\s+pr\s+merge/i.test(workflow));
  add('NO_ACADEMIA_RUNTIME', !workflow.includes('academia_root_fix_ready') && !runtime.includes("#/academia"));
  add('README_PENDING_RUNTIME_HONEST', currentReadme.includes('CRM_OPS_LEADS_RUNTIME_READONLY_PENDING_NEW_AUTHORIZATION') || currentReadme.includes('CRM_OPS_LEADS_RUNTIME_READONLY_PENDING'));
  add('PACKAGE_READINESS_COVERS_PATHS', includesAll(packageReadiness, ['WORKFLOW_IDENTITY_PATH_CONTRACT', 'explicitTokenPathHonored', 'explicitConfigPathHonored']));

  for (const rel of [files.packageReadiness, files.identity, files.snapshot, files.runtime]) {
    const result = syntax(rel);
    add('SYNTAX_' + path.basename(rel).replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(), result.ok, result.detail);
  }

  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion: 'orbit360-gate711-runtime-chain-static-evidence-v1',
    gateId: GATE,
    productHead: PRODUCT_HEAD,
    branch: BRANCH,
    status: failed.length ? 'GATE711_RUNTIME_CHAIN_STATIC_FAIL' : 'GATE711_RUNTIME_CHAIN_STATIC_PASS',
    classification: failed.length ? 'PIPELINE_MECHANISM_FAILURE' : 'GO_STATIC_RUNTIME_CHAIN_END_TO_END',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(check => check.id),
    checks,
    productFilesChanged: 0,
    secretsAccessed: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
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
    schemaVersion: 'orbit360-gate711-runtime-chain-static-evidence-v1',
    gateId: GATE,
    productHead: PRODUCT_HEAD,
    branch: BRANCH,
    status: 'GATE711_RUNTIME_CHAIN_STATIC_FAIL',
    classification: String(error && error.message || error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: Math.max(1, failed.length),
    failedCheckIds: failed.map(check => check.id),
    error: String(error && error.message || error).slice(0, 700),
    productFilesChanged: 0,
    secretsAccessed: false,
    firestoreReads: 0,
    firestoreWrites: 0,
    operationalWrites: 0,
    runtimeExecuted: false,
    browserExecuted: false,
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
