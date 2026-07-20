#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const groupIndex = args.indexOf('--group');
const group = groupIndex >= 0 ? String(args[groupIndex + 1] || '') : '';
const root = path.resolve(args.find((value, index) => value !== '--group' && index !== groupIndex + 1) || path.join(process.cwd(), 'orbit360-platform'));
const allowed = new Set(['access','import','copy','quarantine','alias','ux','migration','academy','technical']);
if (!allowed.has(group)) {
  console.error(JSON.stringify({ validator:'orbit360-validar-aseguradoras-op2-group-v1221', error:'grupo_invalido', group }));
  process.exit(2);
}

const validator = path.join(path.resolve(root, '..'), 'tools', 'orbit360-validar-aseguradoras-op2-v1220.mjs');
const run = spawnSync(process.execPath, [validator, root], { encoding:'utf8' });
let payload;
try { payload = JSON.parse(String(run.stdout || '').trim()); }
catch (error) {
  console.error(JSON.stringify({
    validator:'orbit360-validar-aseguradoras-op2-group-v1221', group,
    error:'salida_no_json', stderr:String(run.stderr || '').trim(), stdout:String(run.stdout || '').slice(-2000)
  }, null, 2));
  process.exit(2);
}

function groupFor(id) {
  const value = String(id || '');
  if (/^(?:FILE_(?:ACCESS|VISIBILITY|OPERATIONALACCESS)|ACCESS_|ROLE_|BANK_POLICY|CREDENTIAL_POLICY|RESTRICTIONS_)/.test(value)) return 'access';
  if (/^(?:FILE_IMPORTER$|IMPORT_|CANONICAL_IMPORT_)/.test(value)) return 'import';
  if (/^(?:FILE_IMPORTERSECURITY|WRITE_GUARD|FRIENDLY_ERRORS|SAFE_VISIBLE_COPY|NO_HTML_INJECTION)/.test(value)) return 'copy';
  if (/^(?:FILE_QUARANTINE|QUARANTINE_)/.test(value)) return 'quarantine';
  if (/^(?:FILE_(?:SOURCEGUARD|IMPORTUI)|ALIAS_|PROBABLE_UPDATE|UI_)/.test(value)) return 'alias';
  if (/^(?:FILE_(?:UX|RESOURCES|OPERATIONALRESOURCES)|UX_|DOCUMENT_VIEWER|RATE_HONESTY|BANK_OPERATIONAL|CREDENTIAL_OPERATIONAL|CREDENTIAL_TEMPORARY|PROVIDER_CONTEXT)/.test(value)) return 'ux';
  if (/^(?:FILE_(?:CLOSURE|PERMISSION)|STORE_GUARD|NEW_RESOURCES_SANITIZED|LEGACY_NON_DESTRUCTIVE|NO_PREMATURE_MIGRATION|DIRECT_ENTRY_GUARD)/.test(value)) return 'migration';
  if (/^(?:FILE_(?:ACADEMY|STYLES)|ACADEMY_|RESPONSIVE)/.test(value)) return 'academy';
  return 'technical';
}

const staleIds = new Set(['UI_REVIEW_NO_CAPTURE','UI_FAIL_CLOSED']);
const allFailures = Array.isArray(payload.fail) ? payload.fail : [];
const failures = allFailures.filter(item => !staleIds.has(String(item.id || '')) && groupFor(item.id) === group);
const importUiPath = path.join(root, 'core', 'aseguradoras-op2-import-ui-guard.js');
const importUi = fs.existsSync(importUiPath) ? fs.readFileSync(importUiPath, 'utf8') : '';
function requireToken(id, ok, message) { if (!ok) failures.push({ id, message, file:'core/aseguradoras-op2-import-ui-guard.js' }); }

if (group === 'import' || group === 'alias') {
  requireToken('CANONICAL_IMPORT_SINGLE_OWNER', importUi.includes('owner visual canónico v1.221') && importUi.includes('singleFileRead: true'), 'El flujo real debe tener un solo owner y una sola lectura del Excel');
  requireToken('CANONICAL_IMPORT_DIRECT_EXCEL', importUi.includes('accept=".xlsx,.xls"') && importUi.includes('parseFile(file.files[0], { country: country })') && !importUi.includes('captureSecure:false'), 'La plataforma debe leer directamente Excel GT/CO una sola vez');
  requireToken('CANONICAL_IMPORT_VALID_DIFF', importUi.includes('function validOps(result)') && importUi.includes("validationStatus === 'validado'") && importUi.includes('Dry-run y diff'), 'El diff debe separar registros validados y retenidos');
  requireToken('CANONICAL_IMPORT_CONTROLLED_WRITE', importUi.includes('Orbit.importaWriteP0.writeBatch') && importUi.includes('CONFIRMO ESCRITURA CONTROLADA') && importUi.includes('Number(write.written || 0) !== batch.operations.length'), 'La escritura debe usar el contrato canónico y validar conteo exacto');
  requireToken('CANONICAL_IMPORT_READBACK', importUi.includes('async function waitWritten') && importUi.includes('importBatchId') && importUi.includes('sourceHash') && importUi.includes('lectura_posterior_incompleta'), 'El cierre debe exigir lectura posterior trazable');
  requireToken('CANONICAL_IMPORT_PROTECTED_CONFIRMATION', importUi.includes('eligibleProtectedCount(result)') && importUi.includes('applySecureOnly(result') && importUi.includes('confirmacion_protegida_incompleta'), 'Los accesos protegidos deben confirmarse antes del éxito');
  requireToken('CANONICAL_IMPORT_ROLLBACK', importUi.includes('Orbit.importaWriteP0.rollback') && importUi.includes('CONFIRMO ROLLBACK') && importUi.includes('rollbackApplied: true'), 'El directorio debe tener rollback automático y reforzado');
  requireToken('CANONICAL_IMPORT_HONEST_BANK_GAP', importUi.includes('accountResourcesPending') && importUi.includes('Cuentas pendientes') && importUi.includes('accountProviderPending: true'), 'La falta de proveedor protegido para cuentas debe permanecer visible');
}

const result = {
  validator:'orbit360-validar-aseguradoras-op2-group-v1221',
  generatedAt:new Date().toISOString(), group, root,
  validatorStaleIdsRetired:Array.from(staleIds),
  canonicalSummary:payload.summary || {},
  summary:{ fail:failures.length }, fail:failures
};
console.log(JSON.stringify(result, null, 2));
process.exit(failures.length ? 1 : 0);
