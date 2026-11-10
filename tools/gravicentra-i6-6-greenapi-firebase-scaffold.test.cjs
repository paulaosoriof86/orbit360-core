'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../functions/greenapi-firebase-bridge.js'), 'utf8');

function loadBridge(env) {
  const events = [];
  const apiCalls = [];
  const stubs = {
    'firebase-admin/app': { getApps: () => [Object.freeze({ test: true })], initializeApp: () => ({}) },
    'firebase-admin/firestore': { getFirestore: () => ({ collection() { apiCalls.push('firestore'); throw Error('Fake DB must remain untouched'); } }), FieldValue: { serverTimestamp: () => 'FAKE_TS' } },
    'firebase-functions/v2/firestore': { onDocumentUpdated: (settings, callback) => { events.push(settings); return callback; } },
    'firebase-functions/v2/https': { onRequest: (settings, callback) => { events.push(settings); return callback; } },
    '@google-cloud/secret-manager': { SecretManagerServiceClient: class { accessSecretVersion() { apiCalls.push('secrets'); throw Error('Do not fetch real secret'); } } }
  };
  const sandbox = {
    require: name => stubs[name] || require(path.join(__dirname, '../functions/', name)),
    process: { env },
    module: { exports: {} },
    exports: {}, Buffer, Date, Set, Object, String, Array, RegExp, JSON, Error
  };
  sandbox.exports = sandbox.module.exports;
  vm.runInNewContext(source, sandbox, { filename: 'greenapi-firebase-bridge.js', timeout: 1000 });
  return { handlers: sandbox.module.exports, events, apiCalls };
}

test('two Functions are registered but default OFF without env/secret', async () => {
  const b = loadBridge({});
  assert.equal(b.events.length, 2);
  assert.equal(typeof b.handlers.orbit360GreenApiOutboxUpdated, 'function');
  assert.equal(typeof b.handlers.orbit360GreenApiDeliveryStatus, 'function');
  assert.equal(b.handlers.__greenApiQa.enabled(), false);
  assert.equal(await b.handlers.orbit360GreenApiOutboxUpdated({ params: { tenantId: 'alianzas-soluciones', eventId: 'evt_123' } }), null);
  assert.deepEqual(b.apiCalls, []);
});
test('disabled webhook gives 503 and does not inspect secrets or data', async () => {
  const b = loadBridge({});
  let statusCode=0, body='';
  const res={ status(n) { statusCode=n; return this; }, send(s) { body=s; return this; } };
  await b.handlers.orbit360GreenApiDeliveryStatus({ method: 'POST' }, res);
  assert.equal(statusCode, 503); assert.equal(body, 'disabled');
  assert.deepEqual(b.apiCalls, []);
});
test('hardcoded GT groups exact and expired instance never selected', () => {
  const b = loadBridge({});
  assert.equal(b.handlers.__greenApiQa.INSTANCE, '710522720868');
  assert.equal(b.handlers.__greenApiQa.GROUPS.operations, '120363420665870658@g.us');
  assert.equal(b.handlers.__greenApiQa.GROUPS.payments, '120363421316253378@g.us');
  assert.equal(b.handlers.__greenApiQa.PAIS, 'GT');
  assert.equal(JSON.stringify(b.handlers.__greenApiQa).includes('7105251326'), false);
});
test('bootstrap ready to register scoped functions on next authorized deploy', () => {
  const bootstrap=fs.readFileSync(path.join(__dirname,'../functions/bootstrap.js'),'utf8');
  assert.match(bootstrap,/require\('\.\/greenapi-firebase-bridge'\)/);
  assert.equal((bootstrap.match(/greenapi-firebase-bridge/g)||[]).length,1);
});
