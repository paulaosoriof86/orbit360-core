#!/usr/bin/env node
/**
 * Orbit 360 A&S — validador matriz roles/permisos v1330.
 * No usa red. No escribe Firestore. No modifica archivos.
 */
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PATH = 'orbit360-platform/docs/MATRIZ-ROLES-PERMISOS-V1330.json';
const ROOT = process.cwd();
const matrixPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, DEFAULT_PATH);

const REQUIRED_ROLES = [
  'Direccion', 'AdminTenant', 'ITSeguridad', 'Finanzas', 'Cobros', 'Operativo', 'Asesor', 'Marketing', 'AcademiaAdmin', 'ClientePortal', 'AuditorSoloLectura'
];
const REQUIRED_MODULES = [
  'dashboard', 'cliente360', 'polizas', 'cobros', 'finanzas', 'm5_conciliaciones', 'documentos', 'portal_cliente', 'equipo', 'configuracion', 'academia', 'integraciones', 'auditoria'
];
const REQUIRED_ACTIONS = [
  'equipo.inactivar_usuario',
  'equipo.reset_permisos',
  'configuracion.cambiar_plan',
  'configuracion.reset_configuracion',
  'cobros.rechazar_reporte',
  'cobros.validar_reporte_no_aplicado',
  'cobros.aplicar_pago_autorizado',
  'm5.validar_conciliacion',
  'm5.anular_conciliacion',
  'documentos.aplicar_diff',
  'integraciones.activar_canal'
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function uniq(arr) { return Array.from(new Set(arr)); }

const errors = [];
const warnings = [];

if (!fs.existsSync(matrixPath)) {
  console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: [`No existe matriz: ${matrixPath}`], warnings: [] }, null, 2));
  process.exit(1);
}

let matrix;
try { matrix = readJson(matrixPath); }
catch (e) {
  console.log(JSON.stringify({ ok: false, status: 'bloqueado', errors: [`JSON inválido: ${e.message}`], warnings: [] }, null, 2));
  process.exit(1);
}

if (matrix.tenantScoped !== true) errors.push('tenantScoped debe ser true.');
if (!Array.isArray(matrix.roles)) errors.push('roles debe ser array.');
if (!matrix.modules || typeof matrix.modules !== 'object') errors.push('modules debe ser objeto.');
if (!matrix.sensitiveActions || typeof matrix.sensitiveActions !== 'object') errors.push('sensitiveActions debe ser objeto.');

const roles = Array.isArray(matrix.roles) ? matrix.roles : [];
const modules = matrix.modules || {};
const actions = matrix.sensitiveActions || {};

for (const r of REQUIRED_ROLES) if (!roles.includes(r)) errors.push(`Falta rol requerido: ${r}`);
if (roles.length !== uniq(roles).length) errors.push('Hay roles duplicados.');

for (const [moduleId, allowedRoles] of Object.entries(modules)) {
  if (!Array.isArray(allowedRoles)) errors.push(`Módulo ${moduleId} debe listar roles.`);
  else {
    for (const r of allowedRoles) if (!roles.includes(r)) errors.push(`Módulo ${moduleId} referencia rol no declarado: ${r}`);
  }
}
for (const m of REQUIRED_MODULES) if (!modules[m]) errors.push(`Falta módulo requerido en matriz: ${m}`);

if (!modules.equipo?.includes('AdminTenant')) errors.push('AdminTenant debe tener acceso a equipo.');
if (!modules.configuracion?.includes('AdminTenant')) errors.push('AdminTenant debe tener acceso a configuracion.');
if (!modules.auditoria?.includes('AuditorSoloLectura')) errors.push('AuditorSoloLectura debe acceder a auditoria.');
if (!modules.portal_cliente?.includes('ClientePortal')) errors.push('ClientePortal debe acceder a portal_cliente.');
if (modules.finanzas?.includes('ClientePortal')) errors.push('ClientePortal no debe acceder a finanzas.');
if (modules.equipo?.includes('ClientePortal')) errors.push('ClientePortal no debe acceder a equipo.');
if (modules.configuracion?.includes('ClientePortal')) errors.push('ClientePortal no debe acceder a configuracion.');

for (const a of REQUIRED_ACTIONS) if (!actions[a]) errors.push(`Falta acción sensible requerida: ${a}`);
for (const [actionId, cfg] of Object.entries(actions)) {
  if (!cfg || typeof cfg !== 'object') { errors.push(`Acción ${actionId} debe ser objeto.`); continue; }
  if (cfg.motivo !== true) errors.push(`Acción ${actionId} debe exigir motivo.`);
  if (cfg.audit !== true) errors.push(`Acción ${actionId} debe registrar auditoría.`);
  if (/anular|reset|aplicar_pago|aplicar_diff|activar_canal|enviar_masivo|cerrar_periodo|inactivar_usuario/.test(actionId) && cfg.confirmacion !== true) {
    errors.push(`Acción ${actionId} debe exigir confirmación reforzada.`);
  }
}

const guards = matrix.businessGuards || {};
for (const g of ['noTenantWithoutAdmin', 'noPaymentFromSupportOnly', 'noValidatedConciliationAsAppliedPayment', 'noDocumentToMasterWithoutDiff', 'noIntegrationActiveWithoutProvider', 'noRawCurrencyMix', 'gtRequiresGTQ', 'coRequiresCOP']) {
  if (guards[g] !== true) errors.push(`Falta businessGuard=true: ${g}`);
}

if (!modules.academia?.includes('AcademiaAdmin')) warnings.push('AcademiaAdmin debería tener acceso a academia.');
if (!modules.documentos?.includes('ITSeguridad')) warnings.push('ITSeguridad debería tener acceso a documentos por seguridad/Storage.');

const status = errors.length ? 'bloqueado' : warnings.length ? 'ok_con_warnings' : 'ok';
const result = {
  ok: errors.length === 0,
  status,
  matrixPath: path.relative(ROOT, matrixPath),
  roles: roles.length,
  modules: Object.keys(modules).length,
  sensitiveActions: Object.keys(actions).length,
  errors,
  warnings
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
