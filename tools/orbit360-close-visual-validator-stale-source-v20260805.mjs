#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const PLAN = 'orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md';
const PRECHECK = 'tools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs';
const GOVERNING = 'orbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-governing-stop-sanitized-v20260805.json';
const OUT = 'orbit360-platform/runtime-gate-crm-v20260716/visual-validator-stale-source-closure-sanitized-v20260805.json';

const count = (text, token) => text.split(token).length - 1;
const replaceOnce = (source, from, to, id) => {
  if (count(source, from) !== 1) throw new Error('VALIDATOR_STALE_PLAN_ANCHOR_' + id);
  return source.replace(from, to);
};

try {
  let plan = fs.readFileSync(PLAN, 'utf8');
  const precheck = fs.readFileSync(PRECHECK, 'utf8');
  const governing = JSON.parse(fs.readFileSync(GOVERNING, 'utf8'));
  new vm.Script(precheck, { filename: PRECHECK });

  plan = replaceOnce(plan,
    'Última actualización: 2026-08-05 18:35 GT',
    'Última actualización: 2026-08-05 19:08 GT',
    'DATE');

  plan = replaceOnce(plan,
    'El rootfix no está visible todavía en LAB. Requiere una autorización nueva y acotada para un único Hosting LAB deploy y prueba visual.',
    'El rootfix se desplegó una única vez en el run `31061214801`, pero la prueba viva se detuvo antes del primer resultado de rol por un timeout sin checkpoint observable. Hosting LAB fue restaurado exactamente a la versión previa. La clasificación gobernante es `VALIDATOR_STALE`; el rootfix no está visible ni aprobado en LAB.',
    'ROOTFIX_STATUS');

  plan = replaceOnce(plan,
    'Rootfix visual source-only 28/28 PASS. Pendiente un único deploy Hosting LAB y prueba viva por rol/viewport.',
    'Rootfix visual source-only 28/28 PASS. Run vivo `31061214801`: GO_GATE_CONTRACT 20/20, un deploy Hosting, timeout antes del primer rol y rollback PASS. Estado: `STOP_RETRY · VALIDATOR_STALE`.',
    'CARRIL_A');

  plan = replaceOnce(plan,
    '| 2.7C | Hosting LAB + prueba viva | pendiente autorización |',
    '| 2.7C | Hosting LAB + prueba viva | STOP_RETRY · VALIDATOR_STALE · rollback PASS |',
    'STATE_ROW');

  const anchor = '## 16. Regla de actualización';
  const insert = `## 15.1 Cierre gobernante del run visual\n\n\`\`\`text\nrun primario: 31061214801\npreflight: GO_GATE_CONTRACT 20/20\nHosting deploy: 1\nprueba viva: timeout antes del primer resultado de rol\nrollback Hosting: PASS\nsnapshot: VERIFIED_UNCHANGED\nFirestore/Auth/operational writes: 0\nclasificación: VALIDATOR_STALE\n\`\`\`\n\nEl owner obsoleto no persistió el checkpoint de Auth, membresía, ruta o hidratación que estaba esperando. No existe evidencia suficiente para asignar un defecto funcional al producto.\n\nOwner de solución preparado:\n\n\`\`\`text\ntools/orbit360-visual-runtime-rootfix-browser-precheck-v20260805.mjs\n\`\`\`\n\nEl request consumido no se repite. Una nueva ejecución requerirá autorización explícita y deberá ejecutar primero el precheck observable; solo con PASS podrá abrir la matriz completa por roles.\n\nEvidencia:\n\n\`\`\`text\norbit360-platform/runtime-gate-crm-v20260716/visual-runtime-rootfix-governing-stop-sanitized-v20260805.json\n\`\`\`\n\n`;
  if (count(plan, anchor) !== 1) throw new Error('VALIDATOR_STALE_PLAN_ANCHOR_CLOSURE');
  plan = plan.replace(anchor, insert + anchor);
  fs.writeFileSync(PLAN, plan, 'utf8');

  const required = [
    "mark('PAGE_GOTO')",
    "'ROOTFIX_MARKER'",
    "'FIREBASE_AUTH'",
    "mark('CUSTOM_TOKEN_SIGNIN')",
    "'AUTH_INSIDE'",
    "'INICIO_READY'",
    'observedState',
    'snapshotAttachedCount',
    'membershipStatus',
    'runtimeDiagnosticInicio',
    'failureScreenshot',
    'firestoreWrites: 0',
    'authWrites: 0',
    'operationalWrites: 0',
    'deployExecuted: false'
  ];
  const checks = Object.fromEntries(required.map(token => [token, precheck.includes(token)]));
  const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
  const output = {
    schemaVersion: 'orbit360-visual-validator-stale-source-closure-v1',
    status: failedCheckIds.length ? 'FAIL_VISUAL_VALIDATOR_STALE_SOURCE_CLOSURE' : 'PASS_VISUAL_VALIDATOR_STALE_SOURCE_CLOSURE',
    classification: failedCheckIds.length ? 'VALIDATOR_STALE' : 'VALIDATOR_STALE_CLOSED_SOURCE_ONLY',
    governingRunId: '31061214801',
    governingEvidenceOk: governing.status === 'STOP_RETRY_GOVERNING' && governing.classification === 'VALIDATOR_STALE',
    precheckSyntaxOk: true,
    total: required.length,
    passed: Object.values(checks).filter(Boolean).length,
    failed: failedCheckIds.length,
    failedCheckIds,
    checks,
    planUpdated: plan.includes('STOP_RETRY · VALIDATOR_STALE · rollback PASS'),
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
    ok: failedCheckIds.length === 0
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exit(41);
} catch (error) {
  const output = {
    schemaVersion: 'orbit360-visual-validator-stale-source-closure-v1',
    status: 'FAIL_VISUAL_VALIDATOR_STALE_SOURCE_CLOSURE',
    classification: 'VALIDATOR_STALE',
    error: String(error && error.message || error).slice(0, 700),
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
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.error(JSON.stringify(output, null, 2));
  process.exit(41);
}
