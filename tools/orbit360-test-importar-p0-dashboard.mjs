#!/usr/bin/env node
/* Smoke P0 tablero importadores — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = {
  polizas: [{ id: 'pol_1', estadoOperativoOrbit: 'vigente_renovada', primaNeta: 1000, moneda: 'GTQ' }],
  recibosEsperados: [{ id: 'rec_1', estado: 'esperado', monto: 100, moneda: 'GTQ' }],
  carteraPrimas: [{ id: 'car_1', estado: 'pendiente_real_reportado_aseguradora', monto: 200, moneda: 'GTQ', requiereValidacion: true }],
  cxcComisiones: [{ id: 'cxc_1', estado: 'recaudo_probable_pendiente_confirmacion', monto: 300, moneda: 'GTQ' }],
  conciliacionBancaria: [{ id: 'con_1', estado: 'match_probable_pendiente_confirmacion', monto: 300, moneda: 'GTQ' }]
};

global.window = global;
global.Orbit = {
  ui: { esc: s => String(s == null ? '' : s), money: (n, c) => `${c || ''} ${Number(n || 0).toFixed(2)}` },
  store: { all(coll) { return memory[coll] || []; } }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/modules/importar-p0-dashboard.js', 'utf8'), { filename: 'importar-p0-dashboard.js' });

assert.ok(Orbit.importarP0Dashboard, 'Orbit.importarP0Dashboard debe existir');
assert.ok(Orbit.importarP0Dashboard.LAYERS.length >= 10, 'debe cubrir capas P0 principales');
const cartera = Orbit.importarP0Dashboard.LAYERS.find(x => x.id === 'carteraPrimas');
const s = Orbit.importarP0Dashboard.layerStats(cartera);
assert.equal(s.totalRows, 1);
assert.equal(s.warn, 1);
assert.equal(s.pending, 1);
assert.equal(s.amount, 200);

console.log('OK P0 dashboard smoke passed');
