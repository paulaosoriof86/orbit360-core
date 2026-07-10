import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('orbit360-platform/core/importa-clientes-p0.js', 'utf8');
const sandbox = { window: { Orbit: {} }, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const api = sandbox.window.Orbit.importaClientesP0;
if (!api) throw new Error('importaClientesP0 no disponible');

const ctx = {
  defaultCountry: 'GT',
  temporaryAdvisor: 'Asesor temporal',
  activeAdvisors: ['Asesor Uno'],
  advisorAliases: { 'A.U': 'Asesor Uno' }
};

const normalized = api.normalizeClient({
  nombres: 'Cliente',
  apellidoPaterno: 'Prueba',
  correo: '',
  whatsapp: '',
  vendedor: '',
  provincia: '',
  canton: ''
}, ctx);

if (normalized.nombre !== 'Cliente Prueba') throw new Error('nombre no normalizado');
if (normalized.pais !== 'GT' || normalized.moneda !== 'GTQ') throw new Error('pais/moneda incorrectos');
if (normalized.estadoOperativo !== 'pendiente_polizas') throw new Error('estado inicial incorrecto');
if (!normalized.asesorTemporal) throw new Error('asesor temporal no detectado');
if (!normalized.alertasCalidad.includes('PENDIENTE_POLIZAS')) throw new Error('falta alerta pendiente_polizas');
if (!normalized.alertasCalidad.includes('FALTA_DOCUMENTO')) throw new Error('falta alerta documento');
if (!normalized.requiereValidacion) throw new Error('debe requerir validacion');

const legal = api.normalizeClient({ razonSocial: 'Empresa Prueba, S.A.', pais: 'CO', moneda: 'COP', vendedor: 'A.U' }, ctx);
if (legal.tipoPersona !== 'legal') throw new Error('tipo legal no detectado');
if (legal.asesorPrincipal !== 'Asesor Uno') throw new Error('alias asesor no resuelto');
if (legal.asesorTemporal) throw new Error('alias no debe quedar temporal');

const operations = api.buildOperations([{ nombre: 'Uno', pais: 'GT', moneda: 'GTQ', vendedor: 'Asesor Uno' }], ctx);
if (operations.length !== 1 || operations[0].collection !== 'clientes') throw new Error('operaciones clientes invalidas');

console.log('OK importa-clientes-p0');