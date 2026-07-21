#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';

await import('./orbit360-aplicar-correccion-cuentas-importador-v20260721-v2.mjs');

const root = path.resolve(process.cwd());
const registryPath = path.join(root, 'tools/orbit360-gate-contract-registry-extension-v20260720.json');
const overlayPath = path.join(root, 'tools/orbit360-gate-contract-overlay-importers-v20260720.json');
const reportPath = path.join(root, 'orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-contract-patch-sanitizado.json');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function replaceToken(tokens, before, after) {
  const source = [].concat(tokens || []);
  const beforeCount = source.filter((item) => item === before).length;
  const afterCount = source.filter((item) => item === after).length;
  if (beforeCount === 1) return source.map((item) => item === before ? after : item);
  if (beforeCount === 0 && afterCount === 1) return source;
  throw new Error(`TOKEN_ALIGNMENT_INVALID:${before}:${beforeCount}:${afterCount}`);
}

try {
  const registry = readJson(registryPath);
  const academyOwner = registry.canonicalOwners.find((item) => item.id === 'realInsurerDirectoryAcademy');
  if (!academyOwner) throw new Error('ACADEMY_OWNER_MISSING');
  academyOwner.requiredTokens = replaceToken(academyOwner.requiredTokens, 'Academia profunda Aseguradoras OP-2 v1.221', 'Academia profunda Aseguradoras OP-2 v1.222');
  academyOwner.requiredTokens = replaceToken(academyOwner.requiredTokens, "version:'1.221'", "version:'1.222'");

  const gate = registry.gates.find((item) => item.gateId === 'block1-real-insurer-directories-lab-v20260720');
  if (!gate) throw new Error('GATE_MISSING');
  const academyRuntime = gate.runtimeVersionContracts.find((item) => item.path === 'orbit360-platform/data/academia-v1217-aseguradoras-op2.js');
  if (!academyRuntime) throw new Error('ACADEMY_RUNTIME_CONTRACT_MISSING');
  academyRuntime.requiredTokens = replaceToken(academyRuntime.requiredTokens, "version:'1.221'", "version:'1.222'");
  if (!academyRuntime.requiredTokens.includes('next._cv = 1222')) academyRuntime.requiredTokens.push('next._cv = 1222');
  writeJson(registryPath, registry);

  const overlay = readJson(overlayPath);
  if (overlay.gateId !== gate.gateId) throw new Error('OVERLAY_GATE_MISMATCH');
  overlay.issuedAt = '2026-07-21';
  overlay.classification = 'SECURITY_FAILURE';
  overlay.diagnosticRevision = 'secure-bank-provider-and-legacy-migration-v1';
  overlay.contractRevision = '1.1.0-secure-bank-provider-v1';
  overlay.gatePatch.contractVersion = '1.1.0';
  overlay.gatePatch.diagnosticRevision = 'secure-bank-provider-and-legacy-migration-v1';
  overlay.gatePatch.runtimeVersion = '20260721-1';
  overlay.gatePatch.status = 'ACTIVE_SECURITY_ROOT_CAUSE_FIX';
  overlay.gatePatch.staticValidationStatus = 'PENDING_SECURITY_ROOT_CAUSE_GATE';
  overlay.gatePatch.executionBudget.type = 'secure_legacy_bank_migration_then_two_source_acceptance';
  overlay.gatePatch.executionBudget.exhaustionPolicy = 'Run preflight first. Deploy only the LAB bank provider, migrate the 91 legacy accounts once, confirm zero raw values and protected read, then process Guatemala once and Colombia once. Stop after two failures in the same stage.';
  overlay.gatePatch.executionBudget.acceptancePolicy = 'Close only with sanitized evidence of 26 canonical insurers, zero unmasked sensitive values in operational storage, at least 91 opaque bank references, one protected reveal confirmation, direct platform upload, separate GT and CO dry-runs, exact identity control, read-after-write and rollback.';
  writeJson(overlayPath, overlay);

  const report = fs.existsSync(reportPath) ? readJson(reportPath) : {};
  report.schemaVersion = 'orbit360-secure-bank-contract-patch-v3';
  report.overlayAligned = true;
  report.academyOwnerVersion = '1.222';
  report.contractVersion = '1.1.0';
  report.ok = true;
  writeJson(reportPath, report);
  console.log(JSON.stringify({ ok:true, contractVersion:'1.1.0', academyOwnerVersion:'1.222', containsPII:false, containsSecrets:false }));
} catch (error) {
  const report = { schemaVersion:'orbit360-secure-bank-contract-patch-v3', generatedAt:new Date().toISOString(), containsPII:false, containsSecrets:false, ok:false, errorCode:String(error && (error.code || error.message) || error).replace(/[^A-Za-z0-9_.:-]/g,'_').slice(0,240) };
  writeJson(reportPath, report);
  console.error(JSON.stringify(report));
  process.exit(1);
}
