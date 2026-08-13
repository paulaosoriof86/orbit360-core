import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const db = {
  clientes: [{ id: 'cli1', tenantId: 'tenant-a', nombre: 'Cliente Prueba', pais: 'GT', moneda: 'GTQ', asesorId: 'ase1' }],
  aseguradoras: [{ id: 'asg1', nombre: 'Aseguradora Uno', pais: 'GT', vinculada: true }],
  polizas: [{ id: 'pol_old', tenantId: 'tenant-a', numero: 'OLD-100', clienteId: 'cli1', asesorId: 'ase1', aseguradoraId: 'asg1', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', producto: 'Liviano', estado: 'Por renovar', vigenciaInicio: '2025-08-01', vigenciaFin: '2026-08-01', historial: [] }],
  cobros: [], vehiculos: [{ id: 'veh_old', tenantId: 'tenant-a', clienteId: 'cli1', polizaId: 'pol_old', marca: 'Marca A', linea: 'Línea A', placa: 'P001', estado: 'Activo' }],
  gestiones: [], actividades: [], auditLog: []
};
let role = 'Dirección';
let removeCalls = 0;
const store = {
  all(c) { return (db[c] || []).slice(); },
  get(c, id) { return (db[c] || []).find(x => x.id === id) || null; },
  where(c, fn) { return (db[c] || []).filter(fn); },
  insert(c, row) { (db[c] = db[c] || []).push(row); return row; },
  update(c, id, patch) { const row = this.get(c, id); if (!row) return null; Object.assign(row, patch); return row; },
  remove() { removeCalls++; }
};
const audits = [];
const access = {
  tenantId: () => 'tenant-a', activeRole: () => role,
  actorUser: () => ({ id: 'usr1', nombre: 'Usuario Prueba', rolActivo: role, asesorId: 'ase1' }),
  actorAdvisor: () => ({ id: 'ase1', permisosExtra: [], restricciones: [] }),
  currencyFor: country => country === 'CO' ? 'COP' : 'GTQ',
  canView: () => true,
  audit: (...args) => { audits.push(args); return args; }
};
const policyReceipts = {
  createPolicy(raw) {
    if (!raw.numero) return { ok: false, errors: ['numero_poliza_requerido'] };
    const policy = Object.assign({}, raw, { id: 'pol_new', primaTotal: raw.primaNeta + raw.gastosEmision + raw.gastosFinan + raw.otros, historial: [] });
    store.insert('polizas', policy);
    const receipt = { id: 'cob_pol_new_001', polizaId: policy.id, clienteId: policy.clienteId, estado: 'Pendiente', monto: policy.primaTotal, moneda: policy.moneda };
    store.insert('cobros', receipt);
    return { ok: true, policy, receipts: { inserted: [receipt.id] } };
  },
  updatePolicy(id, patch) {
    const paid = store.where('cobros', c => c.polizaId === id && c.estado === 'Pagado');
    if (paid.length) return { ok: false, errors: ['pagos_existentes_requieren_endoso'] };
    return { ok: true, policy: store.update('polizas', id, patch) };
  }
};
const Orbit = { store, access, policyReceipts, PAISES: [{ id: 'GT', moneda: 'GTQ' }, { id: 'CO', moneda: 'COP' }], ui: { today: () => '2026-07-11' }, cat: { get: () => [] } };
const sandbox = { window: { Orbit }, Orbit, console, Date, Math, JSON, Set, Map };
vm.runInNewContext(read('core/issuance-workflow-v1201.js'), sandbox, { filename: 'issuance-workflow-v1201.js' });
vm.runInNewContext(read('core/issuance-workflow-v1201-refinements.js'), sandbox, { filename: 'issuance-workflow-v1201-refinements.js' });
vm.runInNewContext(read('core/endorsement-workflow-v1201.js'), sandbox, { filename: 'endorsement-workflow-v1201.js' });

const issuanceBase = {
  clienteId: 'cli1', sourcePolicyId: 'pol_old', aseguradoraId: 'asg1', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', producto: 'Liviano', requiereInspeccion: true,
  acceptedOffer: { aseguradoraId: 'asg1', pais: 'GT', moneda: 'GTQ', ramo: 'Auto', producto: 'Liviano', primaNeta: 1000, primaTotal: 1120, cuotas: 1, sourceRef: 'COT-REAL-1', documentRef: 'doc_quote_1' }
};

let r = Orbit.issuance.createRequest(Object.assign({}, issuanceBase, { acceptedConfirmed: false }));
assert(!r.ok && r.errors.includes('aceptacion_cliente_requerida'), 'Debe exigir aceptación del cliente');
const policiesBefore = db.polizas.length;
r = Orbit.issuance.createRequest(Object.assign({}, issuanceBase, { acceptedConfirmed: true }));
assert(r.ok && r.request.workflowType === 'issuance_request', 'Debe crear solicitud de emisión tipada');
assert(db.polizas.length === policiesBefore, 'Aceptar propuesta no debe crear póliza');
const requestId = r.request.id;
const repeated = Orbit.issuance.createRequest(Object.assign({}, issuanceBase, { acceptedConfirmed: true }));
assert(repeated.ok && repeated.reused && repeated.request.id === requestId, 'Debe reutilizar solicitud activa');

let issued = Orbit.issuance.issueRequest(requestId, { numero: 'NEW-200', documentRef: 'doc_policy_1', vigenciaInicio: '2026-08-01', vigenciaFin: '2027-08-01' });
assert(!issued.ok && issued.errors.includes('solicitud_no_lista_para_emision'), 'No debe emitir antes de estar lista');
let advanced = Orbit.issuance.advanceRequest(requestId, 'PENDIENTE_EMISION', { documentosCompletos: true });
assert(!advanced.ok && advanced.errors.includes('inspeccion_pendiente'), 'Debe exigir inspección cuando aplica');
advanced = Orbit.issuance.advanceRequest(requestId, 'PENDIENTE_EMISION', { documentosCompletos: true, inspeccionAprobada: true });
assert(advanced.ok && advanced.request.emissionStage === 'PENDIENTE_EMISION', 'Debe avanzar con requisitos verificados');
issued = Orbit.issuance.issueRequest(requestId, { vigenciaInicio: '2026-08-01', vigenciaFin: '2027-08-01', documentRef: 'doc_policy_1' });
assert(!issued.ok && issued.errors.includes('numero_poliza_real_requerido'), 'Debe exigir número real');
issued = Orbit.issuance.issueRequest(requestId, { numero: 'NEW-200', vigenciaInicio: '2026-08-01', vigenciaFin: '2027-08-01' });
assert(!issued.ok && issued.errors.includes('documento_poliza_emitida_requerido'), 'Debe exigir documento emitido');
issued = Orbit.issuance.issueRequest(requestId, { numero: 'NEW-200', documentRef: 'doc_policy_1', vigenciaInicio: '2026-08-01', vigenciaFin: '2027-08-01' });
assert(issued.ok && issued.policy.id === 'pol_new', 'Debe convertir solicitud en póliza real');
assert(store.get('polizas', 'pol_new').renuevaDe === 'pol_old', 'Nueva póliza debe vincular origen');
assert(store.get('polizas', 'pol_old').renovadaPor === 'pol_new', 'Póliza anterior debe vincular nueva');
assert(store.get('polizas', 'pol_old').estado === 'Por renovar', 'Estado anterior no debe cambiar sin regla de traslape');
assert(store.get('gestiones', requestId).emissionStage === 'EMITIDA', 'Solicitud debe quedar emitida');
assert(store.get('cobros', 'cob_pol_new_001'), 'Debe generar recibos de nueva póliza');

role = 'Asesor';
const advisorIssue = Orbit.issuance.createRequest(Object.assign({}, issuanceBase, { sourcePolicyId: '', acceptedConfirmed: true, acceptedOffer: Object.assign({}, issuanceBase.acceptedOffer, { sourceRef: 'COT-2' }) }));
assert(!advisorIssue.ok && advisorIssue.errors.includes('permiso_emision_denegado'), 'Asesor no debe crear emisión directamente');

const policySnapshot = JSON.stringify(store.get('polizas', 'pol_old'));
let endorsement = Orbit.endorsements.createRequest('pol_old', 'cambio_tomador', { nota: 'Cambio solicitado' }, { documentRef: 'doc_req_holder' });
assert(endorsement.ok && endorsement.request.workflowType === 'endorsement_request', 'Asesor puede crear gestión de endoso');
assert(JSON.stringify(store.get('polizas', 'pol_old')) === policySnapshot, 'Solicitud de endoso no modifica póliza');
let applied = Orbit.endorsements.apply(endorsement.request.id, { referenciaAseguradora: 'APR-1', documentRef: 'doc_end_1', fechaEfectiva: '2026-07-20', motivo: 'Aprobado' });
assert(!applied.ok && applied.errors.includes('permiso_endoso_denegado'), 'Asesor no puede aplicar endoso');

role = 'Dirección';
endorsement = Orbit.endorsements.createRequest('pol_old', 'sustitucion_vehiculo', { vehiculoId: 'veh_old', nuevoVehiculo: { marca: 'Marca B', linea: 'Línea B', placa: 'P002', chasis: 'CH2' } }, { documentRef: 'doc_req_vehicle' });
applied = Orbit.endorsements.apply(endorsement.request.id, { referenciaAseguradora: 'END-VEH-1', documentRef: 'doc_end_vehicle', fechaEfectiva: '2026-07-20', motivo: 'Sustitución aprobada' });
assert(applied.ok, 'Debe aplicar sustitución aprobada');
assert(store.get('vehiculos', 'veh_old').estado === 'Histórico', 'Vehículo anterior debe quedar histórico');
const activeVehicle = db.vehiculos.find(v => v.polizaId === 'pol_old' && v.id !== 'veh_old' && v.estado === 'Activo');
assert(activeVehicle && activeVehicle.placa === 'P002', 'Debe crear vehículo nuevo activo');
assert(removeCalls === 0, 'El flujo no debe borrar registros');
assert(audits.length >= 5, 'Debe registrar auditoría de operaciones críticas');

console.log('ORBIT360 EMISION/ENDOSOS V1201: OK');
console.log('- propuesta aceptada no crea póliza');
console.log('- solicitud idempotente en Ops');
console.log('- número/documento/vigencia reales obligatorios');
console.log('- renovación vinculada sin cerrar origen automáticamente');
console.log('- endoso solicitado antes de aplicar');
console.log('- Asesor bloqueado para aplicar');
console.log('- sustitución de vehículo no destructiva');
