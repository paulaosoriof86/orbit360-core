#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

const PLAN = 'orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md';
const FINAL = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-final-sanitized-v20260805.json';
const PRECHECK = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-precheck-sanitized-v20260805.json';
const LIFECYCLE = 'tools/orbit360-validator-lifecycle-contract-visual-observable-rootfix-lab-v20260805.json';
const GOVERNING = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-governing-stop-sanitized-v20260805.json';
const CLOSURE = 'orbit360-platform/docs/CIERRE-VISUAL-OBSERVABLE-ROOTFIX-LAB-20260805.md';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootcause-closure-sanitized-v20260805.json';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const count = (text, token) => text.split(token).length - 1;
const replaceOnce = (source, from, to, id) => {
  if (count(source, from) !== 1) throw new Error('PLAN_ANCHOR_' + id);
  return source.replace(from, to);
};
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
};

try {
  const final = read(FINAL);
  const precheck = read(PRECHECK);
  const lifecycle = read(LIFECYCLE);
  let plan = fs.readFileSync(PLAN, 'utf8');

  const observed = precheck.observedState || {};
  const lab = observed.lab || {};
  const raw = Array.isArray(lab.rawCountKeys) ? lab.rawCountKeys : [];
  const errors = Array.isArray(lab.snapshotErrorKeys) ? lab.snapshotErrorKeys : [];
  const evidenceChecks = {
    runId: final.runId === '31063000137',
    stopped: final.decision === 'STOP_RETRY' && final.ok === false,
    checkpoint: final.checkpoint === 'INICIO_READY_TIMEOUT' && precheck.checkpoint === 'INICIO_READY_TIMEOUT',
    authReady: observed.authStage === 'inside' && observed.firebaseUser === true && observed.productUserReady === true,
    membershipReady: observed.membershipReady === true && observed.membershipTenantBound === true && observed.membershipStatus === 'ready',
    routeInicio: observed.route === 'inicio',
    rootfixLoaded: observed.rootfixLoaded === true,
    canonicalReady: ['clientes','aseguradoras','polizas','vehiculos','recibosEsperados','carteraPrimas','cobros'].every(name => raw.includes(name)),
    asesoresFailed: errors.includes('asesores') && !raw.includes('asesores'),
    loadingBlocked: observed.loadingVisible === true,
    rollback: final.hostingRollbackRequired === true && final.hostingRollbackRestored === true,
    writesZero: final.firestoreWrites === 0 && final.authWrites === 0 && final.operationalWrites === 0,
    productionZero: final.functionsDeploys === 0 && final.rulesDeploys === 0 && final.productionTouched === false
  };
  const evidenceFailed = Object.entries(evidenceChecks).filter(([, ok]) => !ok).map(([id]) => id);
  if (evidenceFailed.length) throw new Error('EVIDENCE_CONTRACT_' + evidenceFailed.join(','));

  const rootCause = {
    classification: 'DATA_CONTRACT_FAILURE',
    checkpoint: 'INICIO_READY_TIMEOUT',
    owner: 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js',
    functions: ['MODULE_DEPS.inicio', 'hydrationStatus', 'wrapModule'],
    problem: 'The visual rootfix declares the legacy asesores collection as a mandatory hydration dependency for Inicio. The LAB runtime completed the seven canonical snapshots but asesores and the other legacy paths remained in snapshotErrors. wrapModule therefore replaced the original Inicio render with a permanent blocking state.',
    proof: {
      auth: 'READY',
      membership: 'READY_AND_TENANT_BOUND',
      route: 'inicio',
      rootfix: 'LOADED',
      canonicalCollectionsReady: 7,
      snapshotAttachedCount: Number(lab.snapshotAttachedCount || 0),
      missingRequiredDependency: 'asesores',
      screenshotCopy: '4 de 5 fuentes listas · faltan asesores'
    },
    whyNotAuth: 'Firebase user, product user, membership projection and tenant binding were all ready before the timeout.',
    whyNotEnvironment: 'The rootfix loaded, the route was inside the product and the canonical snapshots were attached.',
    solution: [
      'Split hydration dependencies into required canonical and optional legacy sources.',
      'For Inicio require clientes, polizas, cobros and aseguradoras; do not block the module on asesores.',
      'Provide a client-only asesor projection from active memberships/Equipo when advisor presentation is needed, without writing Firestore.',
      'Render advisor leaderboard and goals as an honest degraded/empty state when the optional projection is unavailable.',
      'Apply the same required/optional contract to Cliente 360, Polizas, Cobros, Ops, Leads, Conciliaciones and Cancelaciones before another runtime authorization.'
    ],
    retryProhibited: true,
    newRuntimeAuthorizationRequiredAfterSourcePass: true
  };

  final.classification = 'DATA_CONTRACT_FAILURE';
  final.productStatus = 'ROOTFIX_NOT_LIVE_AND_NOT_VISUALLY_APPROVED';
  final.rootCause = rootCause;
  final.snapshotIntegrity = 'PRECHECK_READONLY_NO_OPERATIONAL_WRITES';
  writeJson(FINAL, final);

  lifecycle.classification = 'DATA_CONTRACT_FAILURE';
  lifecycle.currentPhase = 'CONSUMED_STOP_RETRY_ROOT_CAUSE_CLOSED';
  lifecycle.runtimeResult.classification = 'DATA_CONTRACT_FAILURE';
  lifecycle.runtimeResult.checkpoint = 'INICIO_READY_TIMEOUT';
  lifecycle.runtimeResult.rootCauseOwner = rootCause.owner;
  lifecycle.nextAction = 'PREPARE_REQUIRED_OPTIONAL_HYDRATION_CONTRACT_SOURCE_ONLY_BEFORE_ANY_NEW_RUNTIME_AUTHORIZATION';
  writeJson(LIFECYCLE, lifecycle);

  const governing = {
    schemaVersion: 'orbit360-visual-observable-rootfix-governing-stop-v1',
    gateId: 'block2.7-visual-observable-rootfix-lab-v20260805',
    contractVersion: '2.7.3',
    status: 'STOP_RETRY_GOVERNING',
    classification: 'DATA_CONTRACT_FAILURE',
    runId: '31063000137',
    checkpoint: 'INICIO_READY_TIMEOUT',
    preflight: 'GO_GATE_CONTRACT_24_OF_24',
    hostingBackupClone: true,
    hostingDeploys: 1,
    precheck: 'FAIL_AT_INICIO_READY',
    matrixExecuted: false,
    hostingRollbackRestored: true,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    functionsDeploys: 0,
    rulesDeploys: 0,
    productionTouched: false,
    rootCause,
    protectedState: {
      currentLabRestoredToPreviousVersion: true,
      rootfixHostingLive: false,
      passVisualPostAuth: false,
      cobros41RemainsPaused: true
    },
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  writeJson(GOVERNING, governing);

  plan = replaceOnce(plan,
    'Última actualización: 2026-08-05 19:08 GT',
    'Última actualización: 2026-08-05 19:40 GT',
    'DATE');

  const matrixAnchor = '### 4.4 Matriz de revalidación';
  const executionSection = `### 4.4 Ejecución observable 2.7.3 — STOP_RETRY\n\n\`\`\`text\nrun: 31063000137\npreflight: GO_GATE_CONTRACT 24/24\nbackup Hosting: PASS\nHosting LAB deploy: 1\nprecheck: FAIL en INICIO_READY_TIMEOUT\nmatriz completa: no ejecutada\nrollback Hosting: PASS\nFirestore/Auth/operational writes: 0\nFunctions/Rules/producción: 0\nclasificación: DATA_CONTRACT_FAILURE\n\`\`\`\n\nAuth, membresía, tenant, ruta y las siete fuentes canónicas estaban listos. El rootfix bloqueó \`Inicio\` porque declaró la colección legacy \`asesores\` como dependencia obligatoria. La captura mostró \`4 de 5 fuentes listas · faltan asesores\`.\n\nOwner exacto:\n\n\`\`\`text\norbit360-platform/core/visual-runtime-rootfix-v20260805.js\nMODULE_DEPS.inicio\nhydrationStatus\nwrapModule\n\`\`\`\n\nSolución requerida antes de otra ejecución:\n\n1. separar dependencias canónicas obligatorias y fuentes legacy opcionales;\n2. no bloquear Inicio por \`asesores\`;\n3. proyectar asesores visualmente desde memberships/Equipo, sin escritura;\n4. mostrar estado degradado honesto para leaderboard/metas;\n5. revisar el mismo contrato en Cliente 360, Pólizas, Cobros, Ops, Leads, Conciliaciones y Cancelaciones.\n\nEl request está consumido y no se repite.\n\n### 4.5 Matriz de revalidación`;
  plan = replaceOnce(plan, matrixAnchor, executionSection, 'EXECUTION_SECTION');

  plan = replaceOnce(plan,
    'Rootfix visual source-only 28/28 PASS. Run vivo `31061214801`: GO_GATE_CONTRACT 20/20, un deploy Hosting, timeout antes del primer rol y rollback PASS. Estado: `STOP_RETRY · VALIDATOR_STALE`.',
    'Rootfix visual source-only 28/28 PASS. Run observable `31063000137`: GO_GATE_CONTRACT 24/24, un deploy Hosting, precheck detenido en `INICIO_READY_TIMEOUT`, matriz no ejecutada y rollback PASS. Estado: `STOP_RETRY · DATA_CONTRACT_FAILURE`.',
    'CARRIL_A');

  plan = replaceOnce(plan,
    '| 2.7C | Hosting LAB + prueba viva | STOP_RETRY · VALIDATOR_STALE · rollback PASS |',
    '| 2.7C | Hosting LAB + prueba viva | STOP_RETRY · DATA_CONTRACT_FAILURE · INICIO_READY_TIMEOUT · rollback PASS |',
    'STATE_ROW');

  const oldNext = `\`\`\`text\n1. precheck observable source-only: preparado y validado estructuralmente 15/15\n2. esperar nueva autorización explícita para un único Hosting LAB deploy\n3. ejecutar primero precheck Auth/membresía/ruta/hidratación\n4. solo con PASS abrir la matriz Dirección/Operativo/Asesor\n5. cerrar PASS_VISUAL_POST_AUTH o STOP_RETRY con checkpoint exacto\n6. preparar gate CRUD sintético con rollback para Cliente 360/Pólizas/Recibos/Cobros/Ops/Leads\n7. retomar Bloque 4.1 y correcciones críticas de pólizas\n8. cerrar RC operativa y solicitar go-live\n\`\`\``;
  const newNext = `\`\`\`text\n1. congelar nuevas ejecuciones visuales y conservar Hosting LAB restaurado\n2. preparar source-only el contrato required/optional de hidratación\n3. proyectar asesores desde memberships/Equipo sin escritura y sin hardcode\n4. validar estáticamente Inicio y los demás módulos contra fuentes canónicas disponibles\n5. solo con PASS source-only solicitar una nueva autorización runtime\n6. ejecutar precheck observable y después la matriz por roles\n7. con PASS_VISUAL_POST_AUTH preparar gate CRUD sintético con rollback\n8. retomar Cobros 4.1 y correcciones críticas de pólizas\n\`\`\``;
  plan = replaceOnce(plan, oldNext, newNext, 'NEXT_ACTION');

  const ruleAnchor = '## 16. Regla de actualización';
  const closureSection = `## 15.2 Cierre gobernante del run observable\n\nEvidencias:\n\n\`\`\`text\norbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-final-sanitized-v20260805.json\norbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootfix-governing-stop-sanitized-v20260805.json\norbit360-platform/runtime-gate-crm-v20260716/visual-observable-rootcause-closure-sanitized-v20260805.json\n\`\`\`\n\nLa causa cerrada es un contrato de hidratación incompatible con el estado vivo del runtime, no un defecto de autenticación. El producto visible permanece en la versión previa por rollback.\n\n`;
  if (count(plan, ruleAnchor) !== 1) throw new Error('PLAN_ANCHOR_RULE');
  plan = plan.replace(ruleAnchor, closureSection + ruleAnchor);
  fs.writeFileSync(PLAN, plan, 'utf8');

  const closureLines = [
    '# CIERRE VISUAL OBSERVABLE ROOTFIX LAB — 2026-08-05', '',
    '```text',
    'run: 31063000137',
    'stage: STOP_RETRY_VISUAL_OBSERVABLE_ROOTFIX',
    'classification: DATA_CONTRACT_FAILURE',
    'checkpoint: INICIO_READY_TIMEOUT',
    'preflight: GO_GATE_CONTRACT · 24/24',
    'Hosting deploys: 1',
    'rollback restored: true',
    'precheck: FAIL_VISUAL_BROWSER_PRECHECK',
    'matrix: NOT_EXECUTED',
    'Firestore/Auth/operational writes: 0',
    'Functions/Rules/production: 0',
    '```', '',
    'Causa raíz: `MODULE_DEPS.inicio` exigió `asesores` como dependencia obligatoria aunque el runtime solo completó las fuentes canónicas y dejó las rutas legacy en error.', '',
    'Salida: `STOP_RETRY`; no se autoriza otra ejecución hasta cerrar source-only el contrato required/optional de hidratación.'
  ];
  fs.writeFileSync(CLOSURE, closureLines.join('\n') + '\n', 'utf8');

  const output = {
    schemaVersion: 'orbit360-visual-observable-rootcause-closure-v1',
    status: 'PASS_ROOT_CAUSE_CLOSURE',
    classification: 'DATA_CONTRACT_FAILURE',
    runId: '31063000137',
    checkpoint: 'INICIO_READY_TIMEOUT',
    total: Object.keys(evidenceChecks).length,
    passed: Object.values(evidenceChecks).filter(Boolean).length,
    failed: 0,
    evidenceChecks,
    owner: rootCause.owner,
    planUpdated: plan.includes('STOP_RETRY · DATA_CONTRACT_FAILURE · INICIO_READY_TIMEOUT · rollback PASS'),
    lifecycleUpdated: lifecycle.classification === 'DATA_CONTRACT_FAILURE',
    finalEvidenceUpdated: final.classification === 'DATA_CONTRACT_FAILURE',
    governingEvidenceWritten: true,
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: true
  };
  writeJson(OUT, output);
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  const output = {
    schemaVersion: 'orbit360-visual-observable-rootcause-closure-v1',
    status: 'FAIL_ROOT_CAUSE_CLOSURE',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    error: String(error && error.message || error).slice(0, 900),
    secretsRead: false,
    firestoreRead: false,
    firestoreWrites: 0,
    authWrites: 0,
    operationalWrites: 0,
    browserExecuted: false,
    deployExecuted: false,
    productionTouched: false,
    containsPII: false,
    containsSecrets: false,
    containsPasswords: false,
    ok: false
  };
  writeJson(OUT, output);
  console.error(JSON.stringify(output, null, 2));
  process.exit(41);
}
