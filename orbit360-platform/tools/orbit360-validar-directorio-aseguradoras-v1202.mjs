import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = rel => fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
const required = [
  'core/importa-dryrun-p0.js',
  'core/insurer-directory-import-v1202.js',
  'core/insurer-directory-import-v1202-security.js',
  'core/secure-resource-fields-v1202.js',
  'modules/aseguradoras-v1202-import-bridge.js',
  'modules/aseguradoras-v1202-resources-bridge.js',
  'data/academia-v1202-directorios-aseguradoras.js'
];
const errors = [];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) errors.push('Falta ' + rel);
const index = read('index.html');
for (const rel of required) if (!index.includes(rel)) errors.push('index.html no carga ' + rel);
for (const rel of ['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js','core/backend-resource-contracts.js','modules/aseguradoras.js','modules/aseguradoras-v1197-ux-bridge.js']) if (!index.includes(rel)) errors.push('index.html perdió protegido/baseline: ' + rel);
const pos = rel => index.indexOf(rel);
if (pos('core/insurer-directory-import-v1202.js') < pos('core/importa-dryrun-p0.js')) errors.push('Parser carga antes del contrato dry-run');
if (pos('core/insurer-directory-import-v1202-security.js') < pos('core/insurer-directory-import-v1202.js')) errors.push('Guard carga antes del parser');
if (pos('core/secure-resource-fields-v1202.js') < pos('core/backend-resource-contracts.js')) errors.push('Campos sensibles cargan antes del contrato base');
if (pos('modules/aseguradoras-v1202-import-bridge.js') < pos('modules/aseguradoras-v1197-ux-bridge.js')) errors.push('Bridge importación carga antes del bridge UX v1197');
if (pos('modules/aseguradoras-v1202-resources-bridge.js') < pos('modules/aseguradoras-v1202-import-bridge.js')) errors.push('Bridge recursos carga antes del importador v1202');

const parser = read('core/insurer-directory-import-v1202.js');
const security = read('core/insurer-directory-import-v1202-security.js');
const fields = read('core/secure-resource-fields-v1202.js');
const bridge = read('modules/aseguradoras-v1202-import-bridge.js');
const resources = read('modules/aseguradoras-v1202-resources-bridge.js');
if (!parser.includes("SOURCE_TYPE = 'directorio_aseguradoras'")) errors.push('Fuente separada incorrecta');
if (!parser.includes("CONFIRM_PHRASE = 'CONFIRMO DIRECTORIO'")) errors.push('Falta confirmación reforzada');
if (!parser.includes('importaDryRunP0')) errors.push('No usa contrato dry-run P0');
if (!parser.includes("credentialRef: ref") || !parser.includes("accountRef: accountValue ? 'backend_required'")) errors.push('No usa referencias seguras');
if (!parser.includes('secureSession.delete')) errors.push('No limpia payload sensible de sesión');
if (!parser.includes('applyValidOnly')) errors.push('No permite aplicar solo filas validadas');
if (!parser.includes("collection: 'aseguradoras'")) errors.push('No limita operación principal a aseguradoras');
if (/S\(\)\.insert\('(clientes|polizas|cobros|finmovs|usuarios|roles|permisos)'/.test(parser)) errors.push('Parser escribe colección prohibida');
if (/localStorage|sessionStorage|firebase\.|firestore/i.test(parser + '\n' + bridge + '\n' + resources)) errors.push('Importador/ficha toca almacenamiento o proveedor directo');
if (!security.includes('backend_operativo_requerido_para_aplicar_datos_reales')) errors.push('No bloquea escritura real sin backend');
if (!security.includes('state.noFallback !== false')) errors.push('Guard no verifica fallback');
if (!security.includes("replacement.disabled = true")) errors.push('UI no deshabilita aplicación local');
if (!fields.includes('registerFieldProvider') || !fields.includes('revealField') || !fields.includes('copyField')) errors.push('Falta contrato para cuentas/campos sensibles');
if (!resources.includes('accountRef') || !resources.includes('data-field-view') || !resources.includes('data-field-copy')) errors.push('Ficha no usa accountRef para ver/copiar');
if (!resources.includes('Importar contactos o accesos no habilita tarifas')) errors.push('Ficha no conserva default-deny de Cotizador');
if (!bridge.includes("if (!country) return toast('Selecciona el país.')")) errors.push('Alta manual no exige país');
if (!bridge.includes('duplicate(name, country)')) errors.push('Alta manual no valida duplicado país/nombre');
if (!bridge.includes('ingreso_manual_plataforma')) errors.push('Alta manual sin fuente canónica');
if (!bridge.includes("host.querySelector('[data-new-asg]')")) errors.push('No sustituye alta legacy del directorio');
if (!read('data/academia-v1202-directorios-aseguradoras.js').includes('cur_dir_aseg_asesor_v1202')) errors.push('Academia no incluye ruta Asesor');

if (errors.length) {
  console.error('ORBIT360 DIRECTORIOS ASEGURADORAS V1202: BLOQUEADO');
  errors.forEach(e => console.error('- ' + e));
  process.exit(1);
}
console.log('ORBIT360 DIRECTORIOS ASEGURADORAS V1202: OK');
console.log('- fuente separada y dry-run P0');
console.log('- referencias seguras y limpieza de sesión');
console.log('- escritura real requiere backend sin fallback');
console.log('- contraseñas y cuentas revelables/copiables solo por proveedor seguro');
console.log('- directorio no habilita tarifas por sí solo');
console.log('- alta manual con país/duplicado/trazabilidad');
console.log('- backend protegido conservado');
