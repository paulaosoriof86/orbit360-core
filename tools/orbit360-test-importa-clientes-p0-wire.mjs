import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = {
  window: {},
  document: { addEventListener() {} },
  setTimeout(fn) { fn(); },
  console
};
sandbox.window.Orbit = {
  tenant: {
    paisDefault: 'GT',
    importacionClientes: {
      monedaDefault: 'GTQ',
      aliasesAsesores: { 'Alias': 'Asesor Configurado' },
      asesoresActivos: ['Asesor Configurado'],
      asesorTemporal: 'Asesor Temporal'
    }
  },
  store: {
    rows: [],
    insert(coll, rec) { this.rows.push({ coll, rec }); return rec; },
    update(coll, id, patch) { this.rows.push({ coll, id, rec: patch }); return patch; }
  }
};
sandbox.Orbit = sandbox.window.Orbit;
vm.createContext(sandbox);

for (const file of [
  'orbit360-platform/core/importa-clientes-p0.js',
  'orbit360-platform/core/importa-clientes-p0-wire.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
}

sandbox.Orbit.store.insert('clientes', {
  importado: true,
  nombre: 'Cliente Prueba',
  vendedor: 'Alias',
  correo: '',
  whatsapp: ''
});

const saved = sandbox.Orbit.store.rows[0]?.rec;
if (!saved) throw new Error('No se registró inserción');
if (saved.asesorPrincipal !== 'Asesor Configurado') throw new Error('Alias de asesor no aplicado');
if (saved.estadoOperativo !== 'pendiente_polizas') throw new Error('Estado inicial incorrecto');
if (!Array.isArray(saved.alertasCalidad) || !saved.alertasCalidad.includes('PENDIENTE_POLIZAS')) throw new Error('Calidad no aplicada');
if (saved.pais !== 'GT' || saved.moneda !== 'GTQ') throw new Error('País/moneda no normalizados');
if (!sandbox.Orbit.store.__p0ClientWire) throw new Error('Wire no quedó marcado');

console.log('OK importa-clientes-p0-wire');
