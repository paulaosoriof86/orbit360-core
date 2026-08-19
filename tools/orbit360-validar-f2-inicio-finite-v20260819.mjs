import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const repoRoot = process.cwd();
const queriesPath = path.join(repoRoot, 'orbit360-platform/core/queries.js');
const inicioPath = path.join(repoRoot, 'orbit360-platform/modules/inicio.js');

for (const file of [queriesPath, inicioPath]) {
  assert.ok(fs.existsSync(file), `missing_source:${path.relative(repoRoot, file)}`);
}

const rows = {
  clientes: [{ id: 'c1', nombre: 'Cliente sintético', pais: 'GT', moneda: 'GTQ', asesorId: 'a1' }],
  polizas: [{ id: 'p1', clienteId: 'c1', asesorId: 'a1', estado: 'Vigente', prima: 1000, moneda: 'GTQ' }],
  cobros: [],
  comisiones: [],
  cancelaciones: [],
  vehiculos: [],
  metas: [],
  negocios: [],
  // Contrato real de degradación productiva: `asesores` es opcional y puede
  // exponerse como proyección canónica sin `metaPrima`.
  asesores: [{
    id: 'a1',
    nombre: 'Asesor Proyectado',
    activo: true,
    estado: 'activo',
    projectionOnly: true,
    projectionSource: 'active-membership-and-canonical-relations'
  }]
};

const cloneRows = collection => (rows[collection] || []).map(row => ({ ...row }));
const store = {
  all: cloneRows,
  get(collection, id) {
    return (rows[collection] || []).find(row => row && row.id === id) || null;
  },
  where(collection, predicate) {
    return cloneRows(collection).filter(predicate);
  },
  find(collection, predicate) {
    return cloneRows(collection).find(predicate) || null;
  }
};

const ui = {
  monthKey: () => '2026-08',
  monthLabel: () => 'agosto 2026',
  now: () => new Date('2026-08-19T12:00:00-06:00'),
  moneyShort: n => `Q${Math.round(Number(n))}`,
  money: n => `Q${Math.round(Number(n))}`,
  esc: s => String(s ?? ''),
  avatar: name => `<span>${String(name ?? '')}</span>`,
  daysFromNow: () => null
};

const context = { console };
context.window = context;
context.Orbit = {
  store,
  ui,
  pais: 'GT',
  modules: {},
  kit: { banner: () => '' },
  ciclo: null
};
vm.createContext(context);

vm.runInContext(fs.readFileSync(queriesPath, 'utf8'), context, { filename: 'core/queries.js' });
vm.runInContext(fs.readFileSync(inicioPath, 'utf8'), context, { filename: 'modules/inicio.js' });

const board = context.Orbit.q.leaderboard();
assert.equal(board.length, 1, 'leaderboard_projection_count');
assert.equal(board[0].pct, 0, 'missing_optional_meta_must_degrade_to_zero_finite_pct');
assert.equal(board[0].metaDisponible, false, 'missing_optional_meta_must_be_explicit');
assert.ok(Number.isFinite(board[0].pct), 'leaderboard_pct_must_be_finite');

const host = { innerHTML: '' };
context.Orbit.modules.inicio.render(host);
assert.doesNotMatch(host.innerHTML, /(^|[^A-Za-z])(undefined|NaN)([^A-Za-z]|$)/, 'Inicio must not render undefined/NaN');

console.log(JSON.stringify({
  ok: true,
  code: 'PASS_F2_INICIO_FINITE_OPTIONAL_ADVISOR_META',
  projectionOnly: true,
  metaDisponible: board[0].metaDisponible,
  pct: board[0].pct,
  visibleUndefinedNaN: false
}));
