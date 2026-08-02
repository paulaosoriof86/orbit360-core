#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'orbit360-platform/runtime-gate-crm-v20260716/gate711-release-critical-static-v20260802.json');
const GATE_ID = 'block7-canonical-runtime-cumulative-visual-lab-v20260801';
const VERSION = '7.11.1';
const PRODUCT_HEAD = '997fca628f95dd397dba347700a6bc644fe840f0';

const files = {
  scope: 'tools/orbit360-gate711-release-critical-scope-v20260802.json',
  runtimeCore: 'tools/orbit360-validar-canonical-runtime-cumulative-visual-lab-v20260801.mjs',
  runtimeOpsLeads: 'tools/orbit360-validar-gate711-ops-leads-runtime-v20260802.mjs',
  index: 'orbit360-platform/index.html',
  config: 'orbit360-platform/core/config.js',
  ops: 'orbit360-platform/modules/ops.js',
  opsBridge: 'orbit360-platform/modules/ops-workflows-v1201-bridge.js',
  leads: 'orbit360-platform/modules/leads.js',
  cloudLedger: 'orbit360-platform/docs/SINCRONIZACION-CLOUD-CLAUDE-ACUMULADA-20260802.md',
  previousLedger: 'orbit360-platform/docs/SINCRONIZACION-CLAUDE-ACUMULADA-20260731.md'
};

function abs(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(abs(rel), 'utf8') : ''; }
function count(text, needle) { return text.split(needle).length - 1; }
function all(text, patterns) { return patterns.every(pattern => typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)); }

const checks = [];
function add(id, ok, detail = '') { checks.push({ id, ok: Boolean(ok), detail }); }

try {
  Object.entries(files).forEach(([key, rel]) => add('FILE_' + key.toUpperCase(), exists(rel), rel));
  const missing = Object.values(files).filter(rel => !exists(rel));
  if (missing.length) throw new Error('PIPELINE_MECHANISM_FAILURE:MISSING_FILES:' + missing.join(','));

  const scope = JSON.parse(read(files.scope));
  const index = read(files.index);
  const config = read(files.config);
  const ops = read(files.ops);
  const opsBridge = read(files.opsBridge);
  const leads = read(files.leads);
  const runtimeCore = read(files.runtimeCore);
  const runtimeOpsLeads = read(files.runtimeOpsLeads);
  const cloudLedger = read(files.cloudLedger);

  add('SCOPE_IDENTITY', scope.gateId === GATE_ID && scope.gateContractVersion === VERSION && scope.productHead === PRODUCT_HEAD);
  add('SINGLE_CANDIDATE', scope.singleCandidatePolicy?.required === true && scope.singleCandidatePolicy?.parallelCandidateAllowed === false && scope.singleCandidatePolicy?.reducedShellAllowed === false && scope.singleCandidatePolicy?.fragmentedHumanApprovalAllowed === false);
  add('CRITICAL_SCOPE', Array.isArray(scope.releaseCriticalBlockingScope?.crm) && Array.isArray(scope.releaseCriticalBlockingScope?.ops) && Array.isArray(scope.releaseCriticalBlockingScope?.leads));
  add('ACADEMIA_NONBLOCKING', scope.academiaBoundary?.presentInCumulativeCandidate === true && scope.academiaBoundary?.staticIntegrityRequired === true && scope.academiaBoundary?.mustNotBreakGlobalBootstrap === true && scope.academiaBoundary?.runtimeContentCompletenessBlocksThisRelease === false && scope.academiaBoundary?.focusedAcademiaRuntimePrerequisiteRemoved === true);
  add('CLOUD_HONEST_STATE', scope.cloudBoundary?.hostingOrCloudDeployExecuted === false && scope.cloudBoundary?.claudePackageSent === false && scope.cloudBoundary?.reusablePatternsMustBeAccumulated === true);
  add('NO_RISK_PREPARATION', scope.guards?.writesAllowed === false && scope.guards?.reimportAllowed === false && scope.guards?.deployAllowedInStaticPreparation === false && scope.guards?.productionAllowedInStaticPreparation === false && scope.guards?.stopRetryOnRepeatedStageOrFailureFamily === true);

  const cicloPos = index.indexOf('core/ciclo.js');
  const opsPos = index.indexOf('modules/ops.js');
  const leadsPos = index.indexOf('modules/leads.js');
  const bridgePos = index.indexOf('modules/ops-workflows-v1201-bridge.js');
  add('INDEX_OWNERS_ONCE', count(index, 'modules/ops.js') === 1 && count(index, 'modules/leads.js') === 1 && count(index, 'modules/ops-workflows-v1201-bridge.js') === 1);
  add('INDEX_ORDER', cicloPos >= 0 && opsPos > cicloPos && leadsPos > cicloPos && bridgePos > opsPos && bridgePos > leadsPos);

  add('ROLE_DIRECTION', /'Dirección'[\s\S]*modulos:\s*\[[^\]]*'ops'[^\]]*'leads'/.test(config));
  add('ROLE_OPERATIVO', /'Operativo'[\s\S]*modulos:\s*\[[^\]]*'ops'[^\]]*'leads'/.test(config));
  add('ROLE_ADVISOR', /'Asesor'[\s\S]*modulos:\s*\[[^\]]*'leads'/.test(config) && !/'Asesor'[\s\S]*modulos:\s*\[[^\]]*'ops'/.test(config.match(/'Asesor'[\s\S]*?\n\s*};/m)?.[0] || ''));

  add('OPS_OWNER', all(ops, ['Orbit.modules.ops', 'C().opsBoard()', 'Tablero interno del equipo', 'Sincronizado con Orbit Leads', 'ops-toolbar', 'kanban']));
  add('OPS_ROLE_BOUNDARY', all(ops, ['Orbit.session.esAsesor', 'restricted()', "location.hash='#/leads'"]));
  add('OPS_WORKFLOW_BRIDGE', all(opsBridge, [/workflowType\s*===\s*['"]issuance_request['"]/, /\.def\.nombre\s*===\s*['"]Emisiones['"]/, 'Orbit.store.get', 'C.__opsWorkflowsV1201']));
  add('LEADS_OWNER', all(leads, ['Orbit.modules.leads', 'C().leadsBoard()', 'C().metricasLeads()', 'Sincronizado con Orbit Ops', 'kanban']));
  add('SHARED_CYCLE', ops.includes('const U = Orbit.ui, K = Orbit.kit, C = () => Orbit.ciclo') && leads.includes('const U = Orbit.ui, K = Orbit.kit, C = () => Orbit.ciclo'));
  add('NO_PARALLEL_STORAGE', !/\b(?:localStorage|sessionStorage|indexedDB)\b/.test(ops + leads + opsBridge) && !/firebase\.firestore|onSnapshot\s*\(/.test(ops + leads + opsBridge));

  add('CORE_RUNTIME_SCOPE', all(runtimeCore, ["#/cliente360", "#/aseguradoras", "#/polizas", 'writeGuard', 'sanitizedScreenshots']));
  add('CORE_RUNTIME_NOT_ACADEMIA_PREREQ', !runtimeCore.includes('academia_root_fix_ready') && !runtimeCore.includes("#/academia"));
  add('OPS_LEADS_RUNTIME_IDENTITY', all(runtimeOpsLeads, ["gateId: 'block7-canonical-runtime-cumulative-visual-lab-v20260801'", "contractVersion: '7.11.1'", 'existing_custom_token_readonly']));
  add('OPS_LEADS_RUNTIME_MATRIX', all(runtimeOpsLeads, ["role: 'Dirección'", "role: 'Operativo'", "role: 'Asesor'", "ops: 'restricted'", "#/ops", "#/leads"]));
  add('OPS_LEADS_RUNTIME_SAFETY', all(runtimeOpsLeads, ['RUNTIME_WRITE_GUARD', 'firestoreWrites: 0', 'operationalWrites: 0', 'hostingDeploy: false', 'production: false', 'containsPII: false']));

  add('CLOUD_LEDGER_INHERITS', cloudLedger.includes('CL-001') && cloudLedger.includes('CL-060') && cloudLedger.includes('CL-061') && cloudLedger.includes('CL-075'));
  add('CLOUD_LEDGER_NOT_SENT', all(cloudLedger, ['NO_ENVIO', 'NO_DEPLOY', 'NO_DATOS_REALES', 'Paquete Claude / Cloud reutilizable', '`NO_ENVIADO`']));
  add('CLOUD_LEDGER_CLASSIFICATION', all(cloudLedger, ['REPLICABLE_CLAUDE_INMEDIATO', 'ACADEMIA_ACTUALIZAR', 'TENANT_AYS_ONLY', 'BACKEND_PROTEGIDO_NO_CLAUDE', 'SECRETO_DATO_REAL', 'TEMPORAL_RETIRO']));
  add('CLOUD_LEDGER_DISPATCH_GATE', cloudLedger.includes('## 7. Gate de despacho Cloud') && cloudLedger.includes('## 8. Gate de retorno de candidata externa'));

  [files.runtimeOpsLeads, files.runtimeCore].forEach(rel => {
    const syntax = spawnSync(process.execPath, ['--check', abs(rel)], { encoding: 'utf8' });
    add('SYNTAX_' + path.basename(rel).replace(/\W+/g, '_').toUpperCase(), syntax.status === 0, String(syntax.stderr || syntax.stdout || '').trim().slice(0, 300));
  });

  const failed = checks.filter(check => !check.ok);
  const result = {
    schemaVersion: 'orbit360-gate711-release-critical-static-evidence-v1',
    gateId: GATE_ID,
    contractVersion: VERSION,
    productHead: PRODUCT_HEAD,
    status: failed.length ? 'GATE711_RELEASE_CRITICAL_STATIC_FAIL' : 'GATE711_RELEASE_CRITICAL_STATIC_PASS',
    classification: failed.length ? 'DATA_CONTRACT_FAILURE' : 'GO_STATIC_RELEASE_CRITICAL_CRM_OPS_LEADS',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: failed.length,
    failedCheckIds: failed.map(check => check.id),
    checks,
    academiaRuntimePrerequisite: false,
    cloudPackageSent: false,
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
    schemaVersion: 'orbit360-gate711-release-critical-static-evidence-v1',
    gateId: GATE_ID,
    contractVersion: VERSION,
    productHead: PRODUCT_HEAD,
    status: 'GATE711_RELEASE_CRITICAL_STATIC_FAIL',
    classification: String(error && error.message || error).split(':')[0] || 'PIPELINE_MECHANISM_FAILURE',
    total: checks.length,
    passed: checks.length - failed.length,
    failed: Math.max(1, failed.length),
    failedCheckIds: failed.map(check => check.id),
    error: String(error && error.message || error).slice(0, 600),
    academiaRuntimePrerequisite: false,
    cloudPackageSent: false,
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
