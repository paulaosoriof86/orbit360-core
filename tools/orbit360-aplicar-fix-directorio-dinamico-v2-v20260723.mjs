#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const BASE_SCRIPT = 'tools/orbit360-aplicar-fix-directorio-dinamico-v20260723.mjs';
const MODULE = 'orbit360-platform/modules/aseguradoras.js';
const BOOTSTRAP = 'orbit360-platform/core/router-tenant-config-bootstrap.js';
const REPORT = 'orbit360-platform/runtime-gate-crm-v20260716/dynamic-directory-patch-sanitized.json';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, content) { fs.writeFileSync(path.join(ROOT, rel), content, 'utf8'); }
function replaceOnce(source, before, after, id) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`PATCH_V2_SOURCE_MISMATCH:${id}:count=${count}`);
  return source.replace(before, after);
}

const base = spawnSync(process.execPath, [BASE_SCRIPT], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024
});
if (base.error) throw base.error;
if (base.status !== 0) {
  process.stderr.write(base.stderr || '');
  throw new Error(`BASE_PATCH_FAILED:${base.status}`);
}

let bootstrap = read(BOOTSTRAP);
bootstrap = replaceOnce(
  bootstrap,
  '/* Preflight 1.0.40: Router carga CRUD dinámico canónico, persistencia confirmada, credenciales seguras, lectura edit-aware y Academia 1.232.\n',
  '/* Preflight 1.0.40: Router carga CRUD dinámico canónico, persistencia confirmada, credenciales seguras, lectura edit-aware y Academia 1.232. */\n',
  'bootstrap-comment-closure'
);
bootstrap = bootstrap
  .replace(/block1-critical-runtime-20260723-8/g, 'block1-critical-runtime-20260723-9')
  .replace(/visualContractDeliveryRevision: '20260722\.7'/g, "visualContractDeliveryRevision: '20260723.8'");
write(BOOTSTRAP, bootstrap);

let mod = read(MODULE);
mod = replaceOnce(
  mod,
  '      vinculada: false, contactos: [], cuentas: [], portales: [], docs: [], docsRequeridos: [], productos: [], facturacion: {}, actividad: [], creadaEnSesion: true',
  '      vinculada: true, contactos: [], cuentas: [], portales: [], docs: [], docsRequeridos: [], productos: [], facturacion: {}, actividad: [], creadaEnSesion: true',
  'new-insurer-active-default'
);
mod = replaceOnce(
  mod,
  `  async function persistSecureCredentialChanges(insurerId, st) {
    const changes = credentialChanges(st, st.draft);`,
  `  async function secureSourceHash(value) {
    if (!window.crypto || !window.crypto.subtle || typeof TextEncoder === 'undefined') throw new Error('SECURE_HASH_UNAVAILABLE');
    const bytes = new TextEncoder().encode(String(value || ''));
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function persistSecureCredentialChanges(insurerId, st) {
    const changes = credentialChanges(st, st.draft);`,
  'secure-source-hash-helper'
);
mod = replaceOnce(
  mod,
  `    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') throw new Error('SECURE_CREDENTIAL_PROVIDER_UNAVAILABLE');
    const result = await Orbit.secureImport.importInsurerDirectory({
      sourceHash: 'manual-directory-edit-' + insurerId + '-' + Date.now(),`,
  `    if (!Orbit.secureImport || typeof Orbit.secureImport.importInsurerDirectory !== 'function') throw new Error('SECURE_CREDENTIAL_PROVIDER_UNAVAILABLE');
    const sourceHash = await secureSourceHash(insurerId + ':' + Date.now());
    const result = await Orbit.secureImport.importInsurerDirectory({
      sourceHash,`,
  'secure-source-hash-use'
);
mod = mod
  .replace(/Solo Dirección\/Admin puede crear aseguradoras\./g, 'Solo Dirección, Superadmin, Admin u Operativo puede crear aseguradoras.')
  .replace(/Solo Dirección\/Admin puede importar\./g, 'Solo Dirección, Superadmin, Admin u Operativo puede importar.')
  .replace(/Solo Dirección\/Admin puede cambiar la vinculación\./g, 'Solo Dirección, Superadmin, Admin u Operativo puede cambiar la vinculación.');
write(MODULE, mod);

const prior = JSON.parse(read(REPORT));
const report = {
  ...prior,
  schemaVersion: 'orbit360-m1-dynamic-directory-patch-v2',
  status: 'PATCH_V2_APPLIED',
  generatorRevision: 'root-cause-corrected-v2',
  correctedFailure: {
    runId: 30009334105,
    diagnosticRunId: 30009737855,
    cause: 'unterminated_bootstrap_comment_generated_by_replacement',
    bootstrapCommentClosed: true,
    diagnosticShellCaptureIssueIsolated: true
  },
  invariants: {
    ...(prior.invariants || {}),
    newInsurersDefaultActive: true,
    secureCredentialSourceHashSha256: true
  }
};
write(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
