import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = rel => fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
const exists = rel => fs.existsSync(path.join(root, rel));
const errors = [];
const warnings = [];
const required = [
  'core/access-scope.js',
  'modules/crm-v1198-operational-bridge.js',
  'modules/portal-v1198-scope-viewer-bridge.js',
  'tools/orbit360-validar-cierre-crm-v1198.mjs'
];
for (const rel of required) if (!exists(rel)) errors.push(`Falta ${rel}`);

const index = read('index.html');
for (const rel of ['core/access-scope.js','modules/crm-v1198-operational-bridge.js','modules/portal-v1198-scope-viewer-bridge.js']) {
  if (!index.includes(rel)) errors.push(`index.html no carga ${rel}`);
}
for (const rel of ['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js','modules/portal-v1142-copyfix.js']) {
  if (!index.includes(rel)) errors.push(`index.html perdió protegido/hotfix ${rel}`);
}

const access = read('core/access-scope.js');
for (const token of ['dataScope','canView','prepareManual','deriveClientState','duplicateCandidates','ingreso_manual_plataforma','REQUIERE_VALIDACION','audit']) {
  if (!access.includes(token)) errors.push(`access-scope no contiene contrato ${token}`);
}
const accessCode = access.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
if (/localStorage|sessionStorage|firebase\.|initializeApp\(/.test(accessCode)) errors.push('access-scope accede a almacenamiento/proveedor directo');
if (/return\s+['"]Dirección['"]/.test(accessCode)) errors.push('access-scope usa fallback administrativo inseguro');

const bridge = read('modules/crm-v1198-operational-bridge.js');
for (const mod of ['cliente360','polizas','cobros','conciliaciones','calidad','renovaciones','cancelaciones','comisiones','historial','portal']) {
  if (!bridge.includes(`'${mod}'`)) errors.push(`bridge CRM no referencia ${mod}`);
}
for (const token of ['Prima neta vigente','Separada por moneda','duplicateCandidates','pendiente_polizas','completeMissingClient','Solicitar gestión']) {
  if (!bridge.includes(token)) errors.push(`bridge CRM no contiene ${token}`);
}
if (/localStorage|sessionStorage|firebase\.|initializeApp\(/.test(bridge.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''))) errors.push('bridge CRM accede a almacenamiento/proveedor directo');
if (bridge.includes('admin@') || bridge.includes('demo123')) errors.push('bridge CRM contiene credenciales demo');
if (!bridge.includes("removeAttribute('onclick')")) errors.push('bridge CRM no neutraliza KPI legacy de Cliente360');

const portalBridge = read('modules/portal-v1198-scope-viewer-bridge.js');
if (!portalBridge.includes('Orbit.documentViewer.open')) errors.push('Portal no usa visor documental transversal');
if (!portalBridge.includes("Orbit.access.can('portal', 'edit')")) errors.push('Portal no condiciona acción administrativa con Orbit.access');
if (/firebase\.|initializeApp\(|localStorage|sessionStorage/.test(portalBridge)) errors.push('Portal bridge accede a proveedor/almacenamiento directo');

const targetModules = ['modules/cliente360.js','modules/polizas.js','modules/cobros.js','modules/conciliaciones.js','modules/calidad.js','modules/renovaciones.js','modules/cancelaciones.js','modules/comisiones.js','modules/historial.js','modules/portal.js'];
for (const rel of targetModules) {
  const raw = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (/firebase\.|getFirestore\(|initializeApp\(/.test(raw)) errors.push(`${rel}: proveedor/backend directo`);
  if (/\blocalStorage\b|\bsessionStorage\b/.test(raw)) warnings.push(`${rel}: almacenamiento navegador directo`);
}

const result = {
  validator: 'orbit360-validar-cierre-crm-v1198',
  timestamp: new Date().toISOString(),
  errors,
  warnings,
  status: errors.length ? 'BLOQUEADO' : (warnings.length ? 'OK_CON_ADVERTENCIAS' : 'OK')
};
const reportDir = path.join(root, '_orbit360_reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'VALIDACION-CIERRE-CRM-V1198.json'), JSON.stringify(result, null, 2), 'utf8');
console.log(`ORBIT360 CRM V1198: ${result.status}`);
console.log(`Errores: ${errors.length} · Advertencias: ${warnings.length}`);
errors.forEach(x => console.error('- ' + x));
warnings.forEach(x => console.warn('- ' + x));
if (errors.length) process.exitCode = 1;
