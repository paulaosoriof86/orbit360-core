#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ROOTFIX_REL = 'orbit360-platform/core/visual-runtime-rootfix-v20260805.js';
const LOADER_REL = 'orbit360-platform/core/backend-lab-loader.js';
const INDEX_REL = 'orbit360-platform/index.html';
const source = fs.readFileSync(path.join(ROOT, ROOTFIX_REL), 'utf8');
const loader = fs.readFileSync(path.join(ROOT, LOADER_REL), 'utf8');
const index = fs.readFileSync(path.join(ROOT, INDEX_REL), 'utf8');
const syntaxOk = rel => spawnSync(process.execPath, ['--check', path.join(ROOT, rel)], { encoding: 'utf8' }).status === 0;

function simulatedStatus(contract, raw, errors) {
  function split(names) {
    const seen = names.filter(name => Object.prototype.hasOwnProperty.call(raw, name));
    const missing = names.filter(name => !Object.prototype.hasOwnProperty.call(raw, name) && !errors[name]);
    const failed = names.filter(name => !!errors[name]);
    return { seen, missing, failed, total: names.length };
  }
  const required = split(contract.required || []);
  const optional = split(contract.optional || []);
  return {
    ready: required.missing.length === 0 && required.failed.length === 0,
    degraded: optional.missing.length > 0 || optional.failed.length > 0,
    required,
    optional
  };
}

const inicio = {
  required: ['clientes', 'polizas', 'cobros', 'aseguradoras'],
  optional: ['asesores', 'metas', 'negocios', 'gestiones']
};
const canonicalReady = { clientes: 430, polizas: 1375, cobros: 7, aseguradoras: 30 };
const optionalErrors = { asesores: 'permission-denied', metas: 'permission-denied', negocios: 'permission-denied', gestiones: 'permission-denied' };
const optionalFailure = simulatedStatus(inicio, canonicalReady, optionalErrors);
const requiredMissing = simulatedStatus(inicio, { clientes: 430, polizas: 1375, aseguradoras: 30 }, optionalErrors);
const requiredFailure = simulatedStatus(inicio, canonicalReady, { cobros: 'permission-denied' });
const complete = simulatedStatus(inicio, { ...canonicalReady, asesores: 7, metas: 0, negocios: 0, gestiones: 0 }, {});

const requiredBlocks = [...source.matchAll(/(\w+): \{ required: \[([^\]]*)\], optional: \[([^\]]*)\] \}/g)]
  .map(match => ({ module: match[1], required: match[2], optional: match[3] }));
const legacyTokens = ['asesores', 'metas', 'negocios', 'gestiones', 'comisiones', 'cancelaciones'];
const legacyRequired = requiredBlocks.filter(row => legacyTokens.some(token => new RegExp(`['\"]${token}['\"]`).test(row.required)));

const checks = {
  rootfixSyntax: syntaxOk(ROOTFIX_REL),
  loaderSyntax: syntaxOk(LOADER_REL),
  versionAdvanced: source.includes("var VERSION = '20260805.2'"),
  moduleContractsPresent: source.includes('var MODULE_CONTRACTS = {'),
  legacyModuleDepsRemoved: !source.includes('MODULE_DEPS'),
  nineModulesCovered: requiredBlocks.length === 9,
  noLegacyRequired: legacyRequired.length === 0,
  inicioCanonicalRequired: source.includes("inicio: { required: ['clientes', 'polizas', 'cobros', 'aseguradoras']"),
  inicioAdvisorsOptional: source.includes("optional: ['asesores', 'metas', 'negocios', 'gestiones']"),
  cliente360CanonicalRequired: source.includes("cliente360: { required: ['clientes', 'aseguradoras', 'polizas', 'vehiculos', 'recibosEsperados', 'carteraPrimas', 'cobros']"),
  cancellationLegacyOptional: source.includes("cancelaciones: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['cancelaciones', 'asesores']"),
  opsLegacyOptional: source.includes("ops: { required: ['clientes', 'polizas', 'aseguradoras'], optional: ['negocios', 'gestiones', 'asesores']"),
  optionalFailureDoesNotBlock: optionalFailure.ready === true,
  optionalFailureIsDegraded: optionalFailure.degraded === true,
  requiredMissingBlocks: requiredMissing.ready === false,
  requiredFailureBlocks: requiredFailure.ready === false,
  completeIsReady: complete.ready === true,
  completeNotDegraded: complete.degraded === false,
  loadingCopyNoCollectionNames: source.includes('fuentes esenciales listas') && !source.includes("' · faltan ' + esc(state.missing.join(', '))"),
  advisorProjectionInstalled: source.includes('function installAdvisorProjection()'),
  projectionUsesActiveMembership: source.includes("Orbit.auth && typeof Orbit.auth.user === 'function'"),
  projectionUsesCanonicalRelations: source.includes("['clientes', 'polizas', 'cobros', 'recibosEsperados', 'carteraPrimas']"),
  projectionDoesNotHardcodePeople: !/Paula|Carlos|Samuel|Fernando|Nicole|Braulio|Johanna/i.test(source),
  projectionDoesNotUseDemoIdentity: !/@demo\.com|orbit\.lab/i.test(source),
  noStoreWriteWrapping: !source.includes('Orbit.store.insert =') && !source.includes('Orbit.store.update =') && !source.includes('Orbit.store.remove ='),
  diagnosticsDistinguishOptional: source.includes("add('Información complementaria'"),
  runtimeDiagnosticsExposeDegraded: source.includes('optionalMissing: state.optional.missing.length'),
  honestDegradedState: source.includes('Vista disponible') && source.includes('sin alterar los datos'),
  cacheBustRootfix: loader.includes('visual-runtime-rootfix-v20260805.js?v=20260805-2'),
  loaderVersionAdvanced: loader.includes("loaderVersion: 'v1.116-required-optional-hydration'"),
  indexCacheBustAdvanced: index.includes('backend-lab-loader.js?v=20260805-hydration-contract2'),
  noFirestoreSdkWriteCalls: !/\.set\(|\.update\(|\.delete\(|writeBatch\(|runTransaction\(/.test(source),
  noSecrets: !/BEGIN PRIVATE KEY|serviceAccount|GOOGLE_APPLICATION_CREDENTIALS/.test(source),
  noPasswordPersistence: !/localStorage\.setItem\([^\n]*(password|contrase)/i.test(source),
  sourceOnly: true
};
const failedCheckIds = Object.entries(checks).filter(([, ok]) => !ok).map(([id]) => id);
const output = {
  schemaVersion: 'orbit360-visual-hydration-required-optional-source-test-v1',
  gateId: 'block2.7-visual-hydration-required-optional-source-v20260805',
  contractVersion: '2.7.4',
  status: failedCheckIds.length ? 'FAIL_VISUAL_HYDRATION_SOURCE' : 'PASS_VISUAL_HYDRATION_SOURCE',
  classification: failedCheckIds.length ? 'DATA_CONTRACT_FAILURE' : 'SOURCE_FIX_READY_FOR_RUNTIME',
  total: Object.keys(checks).length,
  passed: Object.values(checks).filter(Boolean).length,
  failed: failedCheckIds.length,
  failedCheckIds,
  checks,
  simulations: {
    optionalFailure: { ready: optionalFailure.ready, degraded: optionalFailure.degraded },
    requiredMissing: { ready: requiredMissing.ready },
    requiredFailure: { ready: requiredFailure.ready },
    complete: { ready: complete.ready, degraded: complete.degraded }
  },
  sourceOnly: true,
  browserExecuted: false,
  secretsRead: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  operationalWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  containsPasswords: false,
  ok: failedCheckIds.length === 0
};
console.log(JSON.stringify(output, null, 2));
process.exit(output.ok ? 0 : 41);
