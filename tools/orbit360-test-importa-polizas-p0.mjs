#!/usr/bin/env node
/* Smoke P0 reglas importacion polizas — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const file = 'orbit360-platform/core/importa-polizas-p0.js';
global.window = global;
global.Orbit = { ui: { today: () => '2026-07-09' } };
vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });

const P0 = global.Orbit.importaPolizasP0;
assert.ok(P0, 'Orbit.importaPolizasP0 debe existir');

const base = {
  numero: 'POL-001',
  aseguradoraNombre: 'Aseguradora Demo',
  clienteNombre: 'Cliente Demo',
  vigenciaIni: '2026-01-01',
  vigenciaFin: '2026-12-31',
  pais: 'GT',
  moneda: 'GTQ',
  primaNeta: '1000',
  gastos: '50',
  iva: '126',
  formaPago: 'mensual'
};

const renovada = P0.normalizePolicy({ ...base, estadoPol: 'Renovada' }, { today: '2026-07-09' });
assert.equal(renovada.estadoOperativoOrbit, 'vigente_renovada');
assert.equal(renovada.estadoCartera, 'genera_recibos_esperados');
assert.equal(renovada.requiereValidacion, false);
assert.ok(P0.shouldGenerateExpectedReceipts(renovada));
assert.ok(renovada._dedupKey.includes('pol 001'));

const vigente = P0.normalizePolicy({ ...base, estadoPol: 'Vigente' }, { today: '2026-07-09' });
assert.equal(vigente.estadoOperativoOrbit, 'vigente_operativa');

const vencida = P0.normalizePolicy({ ...base, vigenciaIni: '2025-01-01', vigenciaFin: '2025-12-31', estadoPol: 'Vencida' }, { today: '2026-07-09' });
assert.equal(vencida.estadoOperativoOrbit, 'historica_vencida');
assert.equal(vencida.estadoCartera, 'recibo_analitico_no_cartera_viva');
assert.equal(P0.shouldGenerateExpectedReceipts(vencida), false);

const cancelada = P0.normalizePolicy({ ...base, estadoPol: 'Cancelada' }, { today: '2026-07-09' });
assert.equal(cancelada.estadoOperativoOrbit, 'cancelada_terminal');
assert.equal(P0.shouldGenerateExpectedReceipts(cancelada), false);

const sinFormaPago = P0.normalizePolicy({ ...base, formaPago: '', frecuencia: '', estadoPol: 'Vigente' }, { today: '2026-07-09' });
assert.equal(sinFormaPago.requiereValidacion, true);
assert.ok(sinFormaPago.motivosValidacion.includes('forma_pago'));

const recibo = P0.expectedReceiptSeed(renovada, { n: 1, total: 1176, neta: 1000, iva: 126, vence: '2026-01-01' }, 0);
assert.equal(recibo.estado, 'esperado');
assert.equal(recibo.estadoCartera, 'recibo_esperado');
assert.equal(recibo.confirmadoPago, false);
assert.equal(recibo.carteraOperativa, false);

console.log('OK P0 policy import rules smoke passed');
