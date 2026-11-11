'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../orbit360-platform/modules/renovaciones.js'), 'utf8');

function fixture() {
  const clients = Array.from({ length: 800 }, (_, i) => ({
    id: 'client-' + i, nombre: 'Cliente ' + i, pais: i % 2 === 0 ? 'GT' : 'CO', telefono: '50255550000'
  }));
  clients[4].__syntheticQa = true;
  const policies = Array.from({ length: 1600 }, (_, i) => ({
    id: 'policy-' + i, numero: 'POL-' + i, clienteId: 'client-' + (i % 800),
    aseguradoraId: 'ins-1', ramo: 'Autos', producto: 'Auto', moneda: 'GTQ',
    vigenciaInicio: '2025-12-01', vigenciaFin: '2026-12-01', estado: 'Vigente',
    renovable: true, tenantId: 'alianzas-soluciones', prima: 100
  }));
  const insurers = [{ id: 'ins-1', nombre: 'Aseguradora', color: '#345678' }];
  const vehicles = [];
  let getCalls = 0, allCalls = 0;
  const collections = { clientes: clients, polizas: policies, aseguradoras: insurers, vehiculos: vehicles, asesores: [] };
  const store = {
    all(collection) { allCalls++; return (collections[collection] || []).map(row => ({ ...row })); },
    get(collection, id) { getCalls++; return (collections[collection] || []).find(row => row.id === id) || null; },
    where(collection, predicate) { return this.all(collection).filter(predicate); },
    _ensureCollections() {}
  };
  const host = {
    isConnected: true, innerHTML: '',
    querySelector() { return null; }, querySelectorAll() { return []; }
  };
  const Orbit = {
    pais: 'GT', store, auth: { productUser: { uid: 'synthetic-paula' } },
    session: { rol: () => 'Dirección' }, route: { key: 'renovaciones' },
    modules: {}, ui: {
      daysFromNow: () => 20, fmtDate: () => '01/12/2026', esc: s => String(s == null ? '' : s),
      moneyShort: x => String(x)
    }, kit: { bannerFor: () => '', kpis: () => '' },
    q: {
      norm: v => Number(v) || 0, monedaPais: () => 'GTQ',
      aseguradora: id => insurers.find(x => x.id === id),
      isSyntheticQaRecord: row => !!row && row.__syntheticQa === true
    }
  };
  const window = { Orbit, addEventListener() {} };
  vm.runInNewContext(source, {
    window, Orbit, location: { hash: '#/renovaciones' }, Map, Set,
    setTimeout, clearTimeout, encodeURIComponent, Date
  }, { filename: 'renovaciones.js', timeout: 10000 });
  return {
    Orbit, host, clients, policies,
    metrics: () => ({ getCalls, allCalls }),
    reset: () => { getCalls = 0; allCalls = 0; }
  };
}

test('I6.6 Renovaciones: client/provenance/country scope uses bounded indexed reads, never N² get()', () => {
  const f = fixture();
  f.Orbit.modules.renovaciones.render(f.host);
  const { getCalls, allCalls } = f.metrics();
  assert.ok(getCalls < 100, `repeated client get() calls: ${getCalls}`);
  assert.ok(allCalls < 25, `unexpected source-wide snapshot amplification: ${allCalls}`);
  assert.match(f.host.innerHTML, /data-renewal-policy="policy-0"/);
  assert.doesNotMatch(f.host.innerHTML, /data-renewal-policy="policy-1"/,
    'CO policy must remain outside GT selection');
  assert.doesNotMatch(f.host.innerHTML, /data-renewal-policy="policy-4"/,
    'synthetic client provenance remains segregated');
  assert.match(f.host.innerHTML, /data-renewal-bucket-total="798"/,
    'exact GT business universe excludes two QA-linked policies');
  console.log(`I66_RENEWALS_READ_AMPLIFICATION_POSTFIX_GET=${getCalls}; ALL=${allCalls}; GT_BUCKET=798`);
});

test('I6.6 indexed client data cannot remain stale across store refresh', () => {
  const f = fixture();
  f.Orbit.modules.renovaciones.render(f.host);
  assert.match(f.host.innerHTML, /data-renewal-policy="policy-0"/);
  f.clients[0].pais = 'CO';
  f.Orbit.renewalLifecycle.invalidate();
  f.reset();
  f.Orbit.modules.renovaciones.render(f.host);
  assert.doesNotMatch(f.host.innerHTML, /data-renewal-policy="policy-0"/);
  assert.ok(f.metrics().getCalls < 100);
});

test('I6.6 selected country CO preserves its own commercial portfolio and 0 GT cross-leakage', () => {
  const f = fixture();
  f.Orbit.pais = 'CO';
  f.Orbit.modules.renovaciones.render(f.host);
  assert.match(f.host.innerHTML, /data-renewal-bucket-total="800"/);
  assert.match(f.host.innerHTML, /data-renewal-policy="policy-1"/);
  assert.doesNotMatch(f.host.innerHTML, /data-renewal-policy="policy-0"/);
  assert.ok(f.metrics().getCalls < 100);
});
