import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const sourcePath = process.argv[2] || new URL('../core/importa-directorio-aseguradoras-contract-p0.js', import.meta.url).pathname;
const source = fs.readFileSync(sourcePath, 'utf8');
const sandbox = { window: { Orbit: {} }, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

const api = sandbox.window.Orbit.importaDirectorioAseguradorasP0;
assert.ok(api, 'Contrato no instalado');
assert.equal(typeof api.buildDryRun, 'function');
assert.equal(api.writeBatch, undefined, 'El contrato P0 no debe exponer escritura');

const trace = {
  fileName: 'directorio.xlsx',
  fileHash: 'a'.repeat(64),
  sheet: 'Aseguradora',
  row: 10
};

const valid = api.validateItem({
  collection: 'plataformasAseguradora',
  action: 'validate',
  record: {
    tenantId: 'tenant-prueba',
    country: 'GT',
    currency: 'GTQ',
    aseguradoraId: 'ins-1',
    name: 'Portal',
    url: 'https://example.invalid',
    sensitiveSourceDetected: true,
    credentialRef: 'credref-gt-ins-1-r10',
    credentialStatus: 'backend_required',
    visibilityPolicy: ['direccion', 'operativo'],
    sourceTrace: trace,
    validationStatus: 'requiere_validacion'
  }
});
assert.equal(valid.ok, true, valid.errors.join(','));

const secret = api.validateItem({
  collection: 'plataformasAseguradora',
  action: 'validate',
  record: {
    tenantId: 'tenant-prueba',
    country: 'GT',
    currency: 'GTQ',
    aseguradoraId: 'ins-1',
    name: 'Portal',
    usuario: 'no-debe-persistirse',
    contrasena: 'no-debe-persistirse',
    sourceTrace: trace,
    validationStatus: 'requiere_validacion'
  }
});
assert.equal(secret.ok, false);
assert.ok(secret.errors.some((error) => error.startsWith('secretos_prohibidos:')));

const mismatch = api.validateItem({
  collection: 'aseguradoras',
  action: 'validate',
  record: {
    tenantId: 'tenant-prueba',
    country: 'CO',
    currency: 'GTQ',
    canonicalName: 'Entidad prueba',
    aliases: [],
    sourceTrace: trace,
    validationStatus: 'requiere_validacion'
  }
});
assert.equal(mismatch.ok, false);
assert.ok(mismatch.errors.includes('country_currency_inconsistente:CO:GTQ'));

const dryRun = api.buildDryRun({
  batchId: 'batch-test',
  tenantId: 'tenant-prueba',
  country: 'GT',
  currency: 'GTQ',
  items: [{
    collection: 'aseguradoras',
    action: 'create',
    record: {
      canonicalName: 'Aseguradora prueba',
      aliases: ['Prueba'],
      sourceTrace: trace,
      validationStatus: 'validado'
    }
  }]
});
assert.equal(dryRun.writeAllowed, false);
assert.equal(dryRun.hasBlockingErrors, false);
assert.equal(dryRun.summary.create, 1);

console.log(JSON.stringify({
  ok: true,
  contract: 'orbit360.insurer-directory-dry-run.v1',
  collections: api.COLLECTIONS.length,
  writeExposed: false,
  secretGate: 'PASS',
  countryCurrencyGate: 'PASS',
  dryRunOnly: 'PASS'
}, null, 2));
