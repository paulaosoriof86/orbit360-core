import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

let role = 'Dirección';
const db = { aseguradoras: [], gestiones: [], actividades: [], auditLog: [] };
const store = {
  all(c) { return (db[c] || []).slice(); },
  get(c, id) { return (db[c] || []).find(x => x.id === id) || null; },
  insert(c, row) { (db[c] = db[c] || []).push(row); return row; },
  update(c, id, patch) { const row = this.get(c, id); if (!row) return null; Object.assign(row, patch); return row; }
};
const Orbit = {
  store,
  ui: { today: () => '2026-07-11', toast: () => {} },
  access: {
    activeRole: () => role,
    tenantId: () => 'tenant-a',
    actorUser: () => ({ id: 'u1', nombre: 'Admin', rolActivo: role }),
    actorAdvisor: () => ({}),
    audit: (...args) => { db.auditLog.push(args); }
  },
  importaDryRunP0: {
    buildDryRun(input) {
      const operations = input.operations.map((op, index) => ({
        index, action: op.action, collection: op.collection, id: op.id,
        blocked: op.data.requiereValidacion || op.data.validationStatus !== 'validado',
        errors: op.data.validacionAlertas || [], warnings: [], data: { nombre: '***', pais: op.data.pais }
      }));
      return {
        reportId: 'dry1', sourceType: input.sourceType, sourceFileName: input.sourceFileName,
        sourceHash: input.sourceHash, status: 'dry_run_pendiente_revision',
        totals: {
          operations: operations.length,
          insert: operations.filter(x => x.action === 'insert').length,
          update: operations.filter(x => x.action === 'update').length,
          blocked: operations.filter(x => x.blocked).length,
          warnings: 0
        },
        operations, blockers: [], warnings: []
      };
    }
  }
};
const sandbox = { window: { Orbit }, Orbit, console, Date, Math, JSON, Set, Map, URL, Promise };
vm.runInNewContext(read('core/insurer-directory-import-v1202.js'), sandbox, { filename: 'insurer-directory-import-v1202.js' });

const gt = {
  'ÍNDICE': [['Resumen']],
  'ASEGURADORA UNO': [
    ['ASEGURADORA UNO'], ['Código: C-1 | NIT: N-1'], ['Dirección: Zona 1'],
    ['Nombre','Cargo','Área','Ext','Email','Celular','Observaciones'],
    ['Contacto','Ejecutivo','Comercial','','contacto@example.com','5555',''],
    ['Accesos al sistema en línea'], ['Producto','Link','Usuario','Contraseña'],
    ['Cotizador','https://portal.example.com/login','user-real','secret-real'],
    ['Datos para transferencias'], ['Banco','No. de cuenta','Tipo de cuenta','Notas'],
    ['Banco Uno','123456789','Monetaria','Pago de primas']
  ]
};

let result = Orbit.insurerDirectoryImport.parseMatrices(gt, { country: 'GT', fileName: 'gt.xlsx', sourceHash: 'h', captureSecure: true });
assert(result.candidates.length === 1, 'Debe detectar la aseguradora GT');
assert(result.excluded.length === 1, 'Debe excluir la hoja soporte');
const rec = result.candidates[0].record;
assert(rec.contactos.length === 1, 'Debe extraer contacto');
assert(rec.portales.length === 1 && rec.portales[0].credentialRef === 'backend_required', 'Debe crear credentialRef');
assert(!('usuario' in rec.portales[0]) && !('password' in rec.portales[0]), 'No debe devolver credenciales crudas');
assert(rec.cuentas.length === 1 && rec.cuentas[0].accountRef === 'backend_required', 'Debe crear accountRef');
assert(rec.cuentas[0].numero === '', 'No debe devolver número completo');
let serialized = JSON.stringify(result.report);
assert(!serialized.includes('secret-real') && !serialized.includes('123456789') && !serialized.includes('user-real'), 'El dry-run debe estar sanitizado');

let applied = Orbit.insurerDirectoryImport.applyApproved(result, { approved: true, phrase: 'CONFIRMO DIRECTORIO', reason: 'Carga autorizada', applyValidOnly: true });
assert(applied.ok && db.aseguradoras.length === 1, 'Debe aplicar el registro validado');
serialized = JSON.stringify(db.aseguradoras);
assert(!serialized.includes('secret-real') && !serialized.includes('123456789') && !serialized.includes('user-real'), 'Orbit.store debe quedar sanitizado');

const co = {
  'Indice': [['Resumen']],
  'Synergias': [['Synergias Broker'], ['NIT','1'], ['Nombre','Cargo','Email'], ['Red','Agente','red@example.com']],
  'Solidaria': [['Solidaria Seguros'], ['NIT','2'], ['Nombre','Cargo','Email'], ['Uno','Comercial','uno@example.com']],
  'Solidaria 1.0': [['Solidaria Seguros'], ['NIT','2'], ['Nombre','Cargo','Email'], ['Dos','Comercial','dos@example.com']],
  'Chubb': [['SBS Seguros'], ['NIT','3'], ['Nombre','Cargo','Email'], ['Tres','Comercial','tres@example.com']]
};
result = Orbit.insurerDirectoryImport.parseMatrices(co, { country: 'CO', fileName: 'co.xlsx', sourceHash: 'h2' });
assert(result.candidates.length === 4, 'Debe conservar candidatos CO para revisión');
assert(result.report.totals.blocked === 4, 'Debe bloquear aliado, duplicados e identidad inconsistente');

role = 'Asesor';
applied = Orbit.insurerDirectoryImport.applyApproved(result, { approved: true, phrase: 'CONFIRMO DIRECTORIO', reason: 'Carga', applyValidOnly: true });
assert(!applied.ok && applied.errors.includes('permiso_importacion_denegado'), 'Asesor no debe aplicar directorios');

console.log('ORBIT360 DIRECTORIOS ASEGURADORAS V1202: OK');
console.log('- hojas soporte excluidas');
console.log('- contactos/plataformas/cuentas clasificados');
console.log('- secretos y números completos fuera del dry-run/store');
console.log('- duplicados/aliados/mismatch bloqueados');
console.log('- Asesor sin permiso de aplicación');
