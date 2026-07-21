import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const projectId = process.env.FIREBASE_PROJECT_ID || 'ays-orbit-360-lab';
const region = 'us-central1';
const expectedServiceAccount = 'orbit360-secrets-lab@ays-orbit-360-lab.iam.gserviceaccount.com';
const evidencePath = path.resolve(
  'orbit360-platform/runtime-gate-real-insurer-directories-v20260720/bank-functions-inventory-sanitizado.json'
);

const groups = {
  credentials: [
    'orbit360ImportInsurerCredentials',
    'orbit360CredentialStatus',
    'orbit360RevealInsurerCredential',
    'orbit360CopyInsurerCredential'
  ],
  bankAccounts: [
    'orbit360ImportInsurerBankAccounts',
    'orbit360BankAccountStatus',
    'orbit360RevealInsurerBankAccount',
    'orbit360CopyInsurerBankAccount'
  ]
};

function runJson(args) {
  const stdout = execFileSync('gcloud', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    maxBuffer: 20 * 1024 * 1024
  });
  return JSON.parse(stdout || 'null');
}

function lastSegment(value) {
  return String(value || '').split('/').filter(Boolean).pop() || '';
}

function clean(value, max = 240) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function findFunction(rows, expectedName) {
  return rows.find((row) => {
    const deployedName = lastSegment(row && row.name);
    const entryPoint = clean(row && row.buildConfig && row.buildConfig.entryPoint, 160);
    return deployedName === expectedName || entryPoint === expectedName;
  }) || null;
}

function describeRunService(serviceResource) {
  const serviceName = lastSegment(serviceResource);
  if (!serviceName) return null;
  try {
    return runJson([
      'run', 'services', 'describe', serviceName,
      '--region', region,
      '--project', projectId,
      '--format=json'
    ]);
  } catch {
    return null;
  }
}

function trafficPercentForLatest(service, latestReadyRevision) {
  const traffic = Array.isArray(service && service.status && service.status.traffic)
    ? service.status.traffic
    : [];
  return traffic.reduce((total, item) => {
    const revisionMatches = clean(item && item.revisionName, 240) === latestReadyRevision;
    const latestMatches = item && item.latestRevision === true;
    const percent = Number(item && item.percent || 0);
    return total + ((revisionMatches || latestMatches) && Number.isFinite(percent) ? percent : 0);
  }, 0);
}

function inventoryOne(rows, expectedName, group) {
  const fn = findFunction(rows, expectedName);
  if (!fn) {
    return {
      group,
      functionName: expectedName,
      exists: false,
      active: false,
      runtimeReady: false,
      serviceAccountReady: false,
      revisionReady: false,
      trafficReady: false,
      ready: false
    };
  }

  const state = clean(fn.state, 80);
  const runtime = clean(fn.buildConfig && fn.buildConfig.runtime, 80);
  const serviceAccount = clean(fn.serviceConfig && fn.serviceConfig.serviceAccountEmail, 240);
  const serviceResource = clean(fn.serviceConfig && fn.serviceConfig.service, 400);
  const serviceName = lastSegment(serviceResource);
  const service = describeRunService(serviceResource);
  const latestCreatedRevision = clean(service && service.status && service.status.latestCreatedRevisionName, 240);
  const latestReadyRevision = clean(service && service.status && service.status.latestReadyRevisionName, 240);
  const latestTrafficPercent = trafficPercentForLatest(service, latestReadyRevision);

  const active = state === 'ACTIVE';
  const runtimeReady = runtime === 'nodejs22';
  const serviceAccountReady = serviceAccount === expectedServiceAccount;
  const revisionReady = Boolean(latestCreatedRevision && latestCreatedRevision === latestReadyRevision);
  const trafficReady = latestTrafficPercent === 100;

  return {
    group,
    functionName: expectedName,
    entryPoint: clean(fn.buildConfig && fn.buildConfig.entryPoint, 160),
    serviceName,
    exists: true,
    state,
    runtime,
    serviceAccount,
    latestCreatedRevision,
    latestReadyRevision,
    latestTrafficPercent,
    active,
    runtimeReady,
    serviceAccountReady,
    revisionReady,
    trafficReady,
    ready: active && runtimeReady && serviceAccountReady && revisionReady && trafficReady
  };
}

let result;
let exitCode = 1;
try {
  const rows = runJson([
    'functions', 'list',
    '--gen2',
    `--regions=${region}`,
    '--project', projectId,
    '--format=json'
  ]);
  const functions = Object.entries(groups).flatMap(([group, names]) =>
    names.map((name) => inventoryOne(Array.isArray(rows) ? rows : [], name, group))
  );
  const credentialsReady = functions
    .filter((item) => item.group === 'credentials')
    .every((item) => item.ready === true);
  const bankAccountsReady = functions
    .filter((item) => item.group === 'bankAccounts')
    .every((item) => item.ready === true);
  const ok = credentialsReady && bankAccountsReady && functions.length === 8;

  result = {
    schemaVersion: 'orbit360-insurer-functions-inventory-v1',
    generatedAt: new Date().toISOString(),
    projectId,
    region,
    containsPII: false,
    containsSecrets: false,
    mode: 'read_only',
    expectedCount: 8,
    discoveredCount: functions.filter((item) => item.exists).length,
    credentialsReady,
    bankAccountsReady,
    ok,
    functions
  };
  exitCode = ok ? 0 : 1;
} catch (error) {
  result = {
    schemaVersion: 'orbit360-insurer-functions-inventory-v1',
    generatedAt: new Date().toISOString(),
    projectId,
    region,
    containsPII: false,
    containsSecrets: false,
    mode: 'read_only',
    expectedCount: 8,
    discoveredCount: 0,
    credentialsReady: false,
    bankAccountsReady: false,
    ok: false,
    errorClass: clean(error && error.name || 'INVENTORY_ERROR', 80)
  };
}

fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exit(exitCode);
