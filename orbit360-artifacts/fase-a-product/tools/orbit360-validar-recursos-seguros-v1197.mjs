import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const required = [
  'core/backend-resource-contracts.js',
  'core/document-viewer.js',
  'core/credential-vault.js',
  'modules/aseguradoras-v1197-ux-bridge.js',
  'data/academia-v1197-bridge.js',
  'styles/v1197-empalme.css'
];
const errors = [];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) errors.push(`Falta ${rel}`);
const indexPath = path.join(root, 'index.html');
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
for (const rel of required) if (!index.includes(rel)) errors.push(`index.html no carga ${rel}`);
for (const rel of ['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js','modules/portal-v1142-copyfix.js']) if (!index.includes(rel)) errors.push(`index.html perdió protegido/hotfix: ${rel}`);
if (index.includes("localStorage.getItem('orbit360_sbhide')")) errors.push('Sidebar volvió a localStorage');
if (!index.includes("Orbit.store.pref('orbit360_sbhide'")) errors.push('Sidebar no usa Orbit.store.pref');
const vault = fs.existsSync(path.join(root, 'core/credential-vault.js')) ? fs.readFileSync(path.join(root, 'core/credential-vault.js'), 'utf8') : '';
const vaultCode = vault.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
if (/localStorage|sessionStorage/.test(vaultCode)) errors.push('credential-vault usa almacenamiento navegador');
if (!vault.includes('secureResources')) errors.push('credential-vault no usa contrato seguro');
const bridge = fs.existsSync(path.join(root, 'modules/aseguradoras-v1197-ux-bridge.js')) ? fs.readFileSync(path.join(root, 'modules/aseguradoras-v1197-ux-bridge.js'), 'utf8') : '';
if (!bridge.includes('const engine = base._fuentes')) errors.push('Bridge no conserva _fuentes');
if (/password\s*:|pass\s*:|clave\s*:/.test(bridge)) errors.push('Bridge contiene campo secreto');
if (errors.length) { console.error('ORBIT360 V1197: BLOQUEADO'); errors.forEach(e => console.error('- ' + e)); process.exit(1); }
console.log('ORBIT360 V1197: OK');
console.log('- contratos recursos seguros presentes');
console.log('- backend LAB/protegidos conservados en index');
console.log('- sidebar por Orbit.store');
console.log('- motor _fuentes preservado');
console.log('- sin almacenamiento navegador en bóveda');
