#!/usr/bin/env node
/* Smoke P0 wire runtime — datos ficticios */
import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const memory = { polizas: [], cobros: [], recibosEsperados: [] };
global.window = global;
global.document = { addEventListener() {}, head: { appendChild() {} }, createElement() { return {}; } };
global.Orbit = {
  ui: { today: () => '2026-07-09' },
  store: {
    all(coll) { return memory[coll] || []; },
    get(coll, id) { return (memory[coll] || []).find(x => x.id === id); },
    where(coll, fn) { return (memory[coll] || []).filter(fn); },
    insert(coll, rec) { if (!memory[coll]) memory[coll] = []; memory[coll].push(rec); return rec; },
    update(coll, id, patch) { const row = this.get(coll, id); if (row) Object.assign(row, patch); return row; }
  },
  primas: {
    cuotasDe(freq) { return String(freq || '').toLowerCase().includes('mens') ? 12 : 1; },
    desglose(neta) { return { neta, total: neta, iva: 0, gastosEmision: 0, gastosFinan: 0, otros: 0 }; },
    recibos(d, opts) { return [{ n: 1, total: d.total, neta: d.neta, iva: d.iva, vence: opts.vigenciaInicio, fechaLimite: opts.vigenciaInicio }]; }
  }
};

vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-polizas-p0.js', 'utf8'), { filename: 'importa-polizas-p0.js' });
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/importa-polizas-p0-wire.js', 'utf8'), { filename: 'importa-polizas-p0-wire.js' });

Orbit.store.insert('polizas', {
  id: 'pol_1', importado: true, numero: 'POL-001', aseguradoraNombre: 'Aseguradora Demo', clienteNombre: 'Cliente Demo',
  vigenciaIni: '2026-01-01', vigenciaFin: '2026-12-31', pais: 'GT', moneda: 'GTQ', primaNeta: 1000, formaPago: 'mensual', estadoPol: 'Renovada'
});

assert.equal(memory.polizas.length, 1);
assert.equal(memory.polizas[0].estadoOperativoOrbit, 'vigente_renovada');
assert.equal(memory.recibosEsperados.length, 1);
assert.equal(memory.recibosEsperados[0].estadoCartera, 'recibo_esperado');
assert.equal(memory.cobros.length, 0);

Orbit.store.insert('cobros', { id: 'cob_imp_pol_2_0', importado: true, polizaId: 'pol_2', monto: 100, moneda: 'GTQ', estado: 'Pendiente' });
assert.equal(memory.cobros.length, 0);
assert.equal(memory.recibosEsperados.length, 2);
assert.equal(memory.recibosEsperados[1].estado, 'esperado');
assert.equal(memory.recibosEsperados[1].confirmadoPago, false);

console.log('OK P0 policy wire smoke passed');
