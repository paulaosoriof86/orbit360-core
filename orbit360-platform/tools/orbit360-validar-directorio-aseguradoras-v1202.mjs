import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = rel => fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
const required = [
  'core/importa-dryrun-p0.js',
  'core/insurer-directory-import-v1202.js',
  'modules/aseguradoras-v1202-import-bridge.js',
  'data/academia-v1202-directorios-aseguradoras.js'
];
const errors = [];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) errors.push('Falta ' + rel);
const index = read('index.html');
for (const rel of required) if (!index.includes(rel)) errors.push('index.html no carga ' + rel);
for (const rel of ['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js','modules/aseguradoras.js','modules/aseguradoras-v1197-ux-bridge.js']) if (!index.includes(rel)) errors.push('index.html perdió protegido/baseline: ' + rel);
const pos = rel => index.indexOf(rel);
if (pos('core/insurer-directory-import-v1202.js') < pos('core/importa-dryrun-p0.js')) errors.push('Parser carga antes del contrato dry-run');
if (pos('modules/aseguradoras-v1202-import-bridge.js') < pos('modules/aseguradoras-v1197-ux-bridge.js')) errors.push('Bridge v1202 carga antes del bridge UX v1197');

const parser = read('core/insurer-directory-import-v1202.js');
const bridge = read('modules/aseguradoras-v1202-import-bridge.js');
if (!parser.includes("SOURCE_TYPE = 'directorio_aseguradoras'")) errors.push('Fuente separada incorrecta');
if (!parser.includes("CONFIRM_PHRASE = 'CONFIRMO DIRECTORIO'")) errors.push('Falta confirmación reforzada');
if (!parser.includes("allowed") && !parser.includes('importaDryRunP0')) errors.push('No usa contrato dry-run P0');
if (!parser.includes("credentialRef: ref") || !parser.includes("accountRef: accountValue ? 'backend_required'")) errors.push('No usa referencias seguras');
if (!parser.includes('secureSession.delete')) errors.push('No limpia payload sensible de sesión');
if (!parser.includes('applyValidOnly')) errors.push('No permite aplicar solo filas validadas');
if (!parser.includes("collection: 'aseguradoras'")) errors.push('No limita operación principal a aseguradoras');
if (/S\(\)\.insert\('(clientes|polizas|cobros|finmovs|usuarios|roles|permisos)'/.test(parser)) errors.push('Parser escribe colección prohibida');
if (/localStorage|sessionStorage|firebase\.|firestore/i.test(parser + '\n' + bridge)) errors.push('Importador toca almacenamiento/proveedor directo');
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
console.log('- solo aseguradoras/gestiones/actividades');
console.log('- alta manual con país/duplicado/trazabilidad');
console.log('- backend protegido conservado');
