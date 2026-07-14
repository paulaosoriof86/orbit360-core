import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function loadContract() {
  const contractPath = new URL('../core/product-readonly-smoke-contract-p0.js', import.meta.url);
  const code = fs.readFileSync(contractPath, 'utf8');
  const context = { window: { Orbit: {} }, console, CustomEvent: class CustomEvent {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: 'product-readonly-smoke-contract-p0.js' });
  return context.window.Orbit.productReadOnlySmokeP0;
}

function safeWrite(outputPath, manifest) {
  const absolute = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  const temp = `${absolute}.tmp-${process.pid}`;
  fs.writeFileSync(temp, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, absolute);
  return absolute;
}

function syntheticInput() {
  const tenantId = 'tenant-seguro';
  return {
    readiness: {
      ok: true,
      ready: true,
      writeAuthorized: false,
      version: 'p0-20260713',
      mode: 'product',
      tenantId,
      auth: { uid: 'uid-self-test', email: 'usuario@empresa.com', emailVerified: true },
      membership: {
        uid: 'uid-self-test', tenantId, roles: ['Asesor'], activeRole: 'Asesor',
        status: 'active', countries: ['GT']
      }
    },
    storeStatus: {
      mode: 'product', tenantId, source: 'data/store-firestore-product-readonly-p0.js',
      version: 'p0-20260713', noFallback: true, writeEnabled: false, ready: true,
      status: 'ready-read-only', attachedCollections: ['clientes'], deniedCollections: [],
      snapshotErrors: {}, quarantinedRows: { clientes: [] },
      queryPlans: {
        clientes: {
          ok: true,
          scope: 'own',
          constraints: [
            { field: 'tenantId', op: '==', value: tenantId },
            { field: 'advisorId', op: '==', value: 'asesor-self-test' }
          ]
        }
      },
      lastSnapshotAt: '2026-07-13T20:00:00.000Z'
    },
    requiredCollections: ['clientes'],
    expectedTenantId: tenantId,
    storeMarker: {
      __productReadOnlyP0: true,
      writeErrorCode: 'WRITE_BLOCKED_PRODUCT_READ_ONLY_P0'
    },
    writeProbeExecuted: false,
    source: {
      branch: 'ays/backend-tenant-lab-v99-20260703',
      commit: 'self-test',
      candidateVersion: 'v1.233',
      generatedAt: '2026-07-13'
    }
  };
}

function runSelfTest(contract) {
  const manifest = contract.buildManifest(syntheticInput());
  assert.equal(manifest.ok, true);
  assert.equal(manifest.status, 'PASS');
  assert.equal(manifest.writeAuthorized, false);
  assert.equal(manifest.deployAuthorized, false);
  assert.equal(JSON.stringify(manifest).includes('uid-self-test'), false);
  assert.match(manifest.userRef, /^usr_/);
  console.log(JSON.stringify({ ok: true, selfTest: true, contractVersion: contract.VERSION }, null, 2));
}

const contract = loadContract();

if (process.argv.includes('--self-test')) {
  runSelfTest(contract);
  process.exit(0);
}

const inputPath = argument('--input');
const outputPath = argument('--output');
const allowBlocked = process.argv.includes('--allow-blocked');

if (!inputPath || !outputPath) {
  console.error('Uso: node tools/orbit360-generar-product-readonly-smoke-manifest-p0.mjs --input evidencia.json --output manifiesto.json [--allow-blocked]');
  process.exit(64);
}

let input;
try {
  input = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: 'input_json_invalido', detail: String(error?.message || error) }));
  process.exit(65);
}

const manifest = contract.buildManifest(input);
const savedAt = safeWrite(outputPath, manifest);
console.log(JSON.stringify({
  ok: manifest.ok,
  status: manifest.status,
  output: savedAt,
  writeAuthorized: manifest.writeAuthorized,
  deployAuthorized: manifest.deployAuthorized,
  errorCount: manifest.errors.length
}, null, 2));

if (!manifest.ok && !allowBlocked) process.exit(2);
