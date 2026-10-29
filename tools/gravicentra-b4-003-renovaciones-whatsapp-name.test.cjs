'use strict';
// Existing approved Renovaciones workflow: isolate only WhatsApp message
// composition. Missing client names must not break the board or render Hola ,.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('orbit360-platform/modules/renovaciones.js', 'utf8');
const start = source.indexOf('const waName =');
const end = source.indexOf(';', source.indexOf('const waTxt =', start));
assert.ok(start >= 0 && end > start, 'renewal messaging contract must be maintained');
const compose = source.slice(start, end + 1) + '\nthis.message=decodeURIComponent(waTxt);';

function message(client) {
  const sandbox = {
    cli: client,
    p: { ramo: 'Autos', numero: 'SYNTHETIC', vigenciaFin: '2026-12-01' },
    U: { fmtDate: () => '01/12/2026' },
    encodeURIComponent,
    decodeURIComponent
  };
  vm.runInNewContext(compose, sandbox, { timeout: 1000 });
  return sandbox.message;
}

test('Renovaciones keeps the approved WhatsApp CTA readable with an identified client', () => {
  assert.match(message({ nombre: '  Ana María Osorio  ' }), /^Hola Ana, tu póliza Autos/);
});
test('Renovaciones never emits an empty greeting or throws for incomplete CRM clients', () => {
  for (const client of [null, {}, { nombre: '' }, { nombre: '  ' }]) {
    assert.match(message(client), /^Hola, tu póliza Autos/);
    assert.ok(!message(client).includes('Hola ,'));
  }
});
