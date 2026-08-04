#!/usr/bin/env node
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const FUNCTIONS = path.join(ROOT, 'functions');
const runtimeRequire = createRequire(path.join(FUNCTIONS, 'package.json'));
const packageFile = path.join(FUNCTIONS, 'package.json');
const lockFile = path.join(FUNCTIONS, 'package-lock.json');
const fail = code => { throw new Error(code); };

const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
if (pkg.engines?.node !== '22') fail('DATA_CONTRACT_FAILURE:FUNCTIONS_NODE_ENGINE');
for (const dependency of ['firebase-admin', 'firebase-functions', '@google-cloud/secret-manager']) {
  if (!pkg.dependencies?.[dependency]) fail(`DATA_CONTRACT_FAILURE:MISSING_RUNTIME_DEPENDENCY:${dependency}`);
}
if (pkg.dependencies?.['google-auth-library']) fail('DATA_CONTRACT_FAILURE:TOOLING_DEPENDENCY_LEAKED_TO_RUNTIME');
if (!fs.existsSync(lockFile)) fail('DATA_CONTRACT_FAILURE:FUNCTIONS_LOCKFILE_MISSING');

const requiredModules = [
  'firebase-admin/app',
  'firebase-admin/firestore',
  'firebase-functions/v2/https',
  'firebase-functions/v2/options',
  '@google-cloud/secret-manager'
];
const resolved = {};
for (const moduleId of requiredModules) resolved[moduleId] = runtimeRequire.resolve(moduleId);

const exportsLoaded = runtimeRequire('./bootstrap.js');
const exportNames = Object.keys(exportsLoaded || {}).sort();
const requiredExports = [
  'orbit360OpsLeadsCommandLabV20260804',
  'orbit360GetAdvisorOpsInboxLabV20260804',
  'orbit360CobrosReconciliationCommandLabV20260804',
  'orbit360RecurringInsuranceImportLabV20260804'
];
for (const exportName of requiredExports) {
  if (!exportNames.includes(exportName)) fail(`DATA_CONTRACT_FAILURE:MISSING_FUNCTION_EXPORT:${exportName}`);
}

const cacheFiles = Object.keys(runtimeRequire.cache || {});
const broadV2AggregatorLoaded = cacheFiles.some(file => /firebase-functions[/\\]lib[/\\]v2[/\\]index\.js$/.test(file));
const unusedDatabaseProviderLoaded = cacheFiles.some(file => /firebase-functions[/\\]lib[/\\](?:v2[/\\])?providers[/\\]database\.js$/.test(file));
if (broadV2AggregatorLoaded) fail('PIPELINE_MECHANISM_FAILURE:BROAD_V2_AGGREGATOR_STILL_LOADED');
if (unusedDatabaseProviderLoaded) fail('PIPELINE_MECHANISM_FAILURE:UNUSED_DATABASE_PROVIDER_LOADED');

const lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
if (Number(lock.lockfileVersion || 0) < 3) fail('DATA_CONTRACT_FAILURE:LOCKFILE_VERSION');
const rootPackage = lock.packages?.[''] || {};
if (JSON.stringify(rootPackage.dependencies || {}) !== JSON.stringify(pkg.dependencies || {})) {
  fail('DATA_CONTRACT_FAILURE:LOCKFILE_ROOT_DEPENDENCIES');
}
const packages = lock.packages || {};
const versionOf = name => packages[`node_modules/${name}`]?.version || '';
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const report = {
  schemaVersion: 'orbit360-functions-runtime-dependencies-validation-v1',
  status: 'FUNCTIONS_BOOTSTRAP_LOAD_PASS',
  classification: 'GO_SOURCE_REPRODUCIBLE_FUNCTIONS_RUNTIME',
  nodeEngine: pkg.engines.node,
  resolvedModuleCount: Object.keys(resolved).length,
  exportCount: exportNames.length,
  requiredFunctionExports: true,
  broadV2AggregatorLoaded: false,
  unusedDatabaseProviderLoaded: false,
  versions: {
    firebaseAdmin: versionOf('firebase-admin'),
    firebaseFunctions: versionOf('firebase-functions'),
    databaseCompat: versionOf('@firebase/database-compat'),
    firebaseApp: versionOf('@firebase/app'),
    secretManager: versionOf('@google-cloud/secret-manager')
  },
  lockfileVersion: lock.lockfileVersion,
  packageLockSha256: sha256(lockFile),
  secretAccess: false,
  firebaseCommandsExecuted: false,
  firestoreRead: false,
  firestoreWrites: 0,
  authWrites: 0,
  deployExecuted: false,
  productionTouched: false,
  containsPII: false,
  containsSecrets: false,
  ok: true
};

console.log(JSON.stringify(report, null, 2));
