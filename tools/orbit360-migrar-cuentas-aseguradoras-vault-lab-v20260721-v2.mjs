#!/usr/bin/env node
'use strict';

/*
 * Orquestador de recuperación post-migración — 2026-07-21
 *
 * El nombre se conserva por compatibilidad con el workflow vigente.
 * La ejecución real es:
 *   1. reconciliación read-only Firestore ↔ bóveda;
 *   2. restauración atómica únicamente si el estado exacto es 23/68;
 *   3. verificación idempotente si el estado ya es 91/0;
 *   4. evidencia sanitizada siempre disponible antes del exit del gate.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const RECON_SCRIPT = 'tools/orbit360-reconciliar-referencias-cuentas-aseguradoras-lab-v20260721.mjs';
const REPAIR_SCRIPT = 'tools/orbit360-restaurar-referencias-cuentas-aseguradoras-lab-v20260721.mjs';
const RECON_FILE = path.resolve('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-reference-reconciliation-sanitizado.json');
const REPAIR_FILE = path.resolve('orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-reference-repair-sanitizado.json');
const OUT_FILE = path.resolve('orbit360-platform/lab-bank-account-migration.json');
const EVIDENCE_DIR = path.resolve('orbit360-real-directories-evidence');
const REQUIRED_CONFIRMATION = 'CONFIRM_68_REFERENCE_RESTORE';

function clean(value, max = 180) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, max);
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { return null; }
}

function run(script, extraEnv = {}) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, extraEnv),
    stdio: 'inherit'
  });
  return Number(result.status || 0);
}

function copyEvidence(file, name) {
  try {
    if (!fs.existsSync(file)) return false;
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.copyFileSync(file, path.join(EVIDENCE_DIR, name));
    return true;
  } catch (error) {
    return false;
  }
}

function failure(code, reconciliation = null, repair = null) {
  const inventory = reconciliation && reconciliation.inventory || {};
  return {
    schemaVersion: 'orbit360-bank-account-vault-migration-v2',
    generatedAt: new Date().toISOString(),
    projectId: 'ays-orbit-360-lab',
    tenantId: 'alianzas-soluciones',
    mode: 'controlled_reference_recovery',
    migrationExecuted: false,
    referenceRepairExecuted: !!(repair && repair.repairExecuted),
    idempotent: !!(repair && repair.idempotent),
    before: {
      insurerCount: Number(inventory.insurerCount || 0),
      rawCount: Number(inventory.rawCount || 0),
      refCount: Number(inventory.currentValidRefs || 0)
    },
    after: repair && repair.after || {
      insurerCount: Number(inventory.insurerCount || 0),
      rawCount: Number(inventory.rawCount || 0),
      refCount: Number(inventory.currentValidRefs || 0)
    },
    reconciliationState: reconciliation && reconciliation.state || 'missing',
    repairCount: Number(repair && repair.repairCount || 0),
    rollbackExecuted: !!(repair && repair.rollbackExecuted),
    errorCode: clean(code || 'REFERENCE_RECOVERY_FAILED').replace(/[^A-Za-z0-9_.:-]/g, '_'),
    rollbackModel: repair && repair.rollbackModel || 'no_new_write',
    containsPII: false,
    containsSecrets: false,
    ok: false
  };
}

let finalReport;
try {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const reconExit = run(RECON_SCRIPT);
  const reconciliation = readJson(RECON_FILE);
  copyEvidence(RECON_FILE, 'bank-reference-reconciliation-sanitizado.json');

  if (reconExit !== 0 || !reconciliation || reconciliation.ok !== true) {
    finalReport = failure(reconciliation && reconciliation.errorCode || 'REFERENCE_RECONCILIATION_FAILED', reconciliation);
  } else {
    const repairEnv = reconciliation.state === 'repair_required'
      ? { ORBIT360_APPLY_BANK_REF_RECOVERY: REQUIRED_CONFIRMATION }
      : {};
    const repairExit = run(REPAIR_SCRIPT, repairEnv);
    const repair = readJson(REPAIR_FILE);
    copyEvidence(REPAIR_FILE, 'bank-reference-repair-sanitizado.json');

    if (repairExit !== 0 || !repair || repair.ok !== true) {
      finalReport = failure(repair && repair.errorCode || 'REFERENCE_REPAIR_FAILED', reconciliation, repair);
    } else {
      const before = repair.before || {};
      const after = repair.after || {};
      finalReport = {
        schemaVersion: 'orbit360-bank-account-vault-migration-v2',
        generatedAt: new Date().toISOString(),
        projectId: 'ays-orbit-360-lab',
        tenantId: 'alianzas-soluciones',
        mode: 'controlled_reference_recovery',
        migrationExecuted: false,
        referenceRepairExecuted: repair.repairExecuted === true,
        idempotent: repair.idempotent === true,
        before: {
          insurerCount: Number(before.insurerCount || 0),
          rawCount: Number(before.rawCount || 0),
          refCount: Number(before.validRefs || before.refCount || 0)
        },
        after: {
          insurerCount: Number(after.insurerCount || 0),
          rawCount: Number(after.rawCount || 0),
          refCount: Number(after.validRefs || after.refCount || 0)
        },
        reconciliationState: reconciliation.state,
        repairCount: Number(repair.repairCount || 0),
        rollbackExecuted: repair.rollbackExecuted === true,
        rollbackVersionCreated: repair.rollbackVersionCreated === true,
        rollbackModel: repair.rollbackModel || 'historical_vault_reference_recovery',
        containsPII: false,
        containsSecrets: false,
        ok: Number(after.insurerCount || 0) === 26 && Number(after.rawCount || 0) === 0 && Number(after.validRefs || after.refCount || 0) === 91 && repair.rollbackExecuted !== true
      };
      if (!finalReport.ok) finalReport.errorCode = 'POST_RECOVERY_STATE_INVALID';
    }
  }
} catch (error) {
  finalReport = failure(error && (error.code || error.message) || 'REFERENCE_RECOVERY_ORCHESTRATOR_FAILED');
}

fs.writeFileSync(OUT_FILE, `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');
copyEvidence(OUT_FILE, 'lab-bank-account-migration.json');
console.log(`ORBIT360_BANK_REFERENCE_RECOVERY_ORCHESTRATOR:${JSON.stringify({ ok: finalReport.ok, mode: finalReport.mode, reconciliationState: finalReport.reconciliationState, referenceRepairExecuted: finalReport.referenceRepairExecuted, repairCount: finalReport.repairCount || 0, idempotent: finalReport.idempotent, rollbackExecuted: finalReport.rollbackExecuted, before: finalReport.before || {}, after: finalReport.after || {}, errorCode: finalReport.errorCode || '', containsSecrets: false })}`);

// El workflow copia primero esta evidencia y después evalúa .ok.
process.exit(0);
