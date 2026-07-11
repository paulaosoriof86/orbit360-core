import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'orbit360-platform');
const read = rel => fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : '';
const required = [
  'core/issuance-workflow-v1201.js',
  'core/issuance-workflow-v1201-refinements.js',
  'core/endorsement-workflow-v1201.js',
  'modules/issuance-endosos-v1201-bridge.js',
  'modules/issuance-endosos-v1201-refinements.js',
  'modules/renewals-v1201-issued-filter.js',
  'data/academia-v1201-emision-endosos.js'
];
const errors = [], warnings = [];
for (const rel of required) if (!fs.existsSync(path.join(root, rel))) errors.push('Falta ' + rel);
const index = read('index.html');
for (const rel of required) if (!index.includes(rel)) errors.push('index.html no carga ' + rel);
for (const rel of ['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js','core/policy-receipts-engine.js','modules/renewals-v1200-operational-bridge.js']) if (!index.includes(rel)) errors.push('index.html perdió protegido/baseline: ' + rel);
const pos = rel => index.indexOf(rel);
if (pos('core/issuance-workflow-v1201.js') < pos('core/policy-receipts-engine.js')) errors.push('Motor emisión carga antes de policy-receipts');
if (pos('core/issuance-workflow-v1201-refinements.js') < pos('core/issuance-workflow-v1201.js')) errors.push('Refinamiento emisión carga antes del motor');
if (pos('modules/issuance-endosos-v1201-bridge.js') < pos('modules/renewals-v1200-operational-bridge.js')) errors.push('Bridge emisión carga antes de Renovaciones v1200');
if (pos('modules/issuance-endosos-v1201-refinements.js') < pos('modules/issuance-endosos-v1201-bridge.js')) errors.push('Refinamiento UX carga antes del bridge');
if (pos('modules/renewals-v1201-issued-filter.js') < pos('modules/issuance-endosos-v1201-bridge.js')) errors.push('Filtro renovaciones carga antes del vínculo de emisión');

const issuance = read('core/issuance-workflow-v1201.js');
const issuanceRef = read('core/issuance-workflow-v1201-refinements.js');
const endorsement = read('core/endorsement-workflow-v1201.js');
const bridge = read('modules/issuance-endosos-v1201-bridge.js');
const renewedFilter = read('modules/renewals-v1201-issued-filter.js');
const combined = issuance + '\n' + issuanceRef + '\n' + endorsement;
if (!issuance.includes("workflowType: 'issuance_request'")) errors.push('Emisión no usa gestión tipada');
if (!issuance.includes("lista: 'Emisiones'")) errors.push('Emisión no vive en Ops/Emisiones');
if (!issuance.includes('numero_poliza_real_requerido')) errors.push('No exige número real');
if (!issuance.includes('documento_poliza_emitida_requerido')) errors.push('No exige documento emitido');
if (!issuance.includes('renuevaDe') || !issuance.includes('renovadaPor')) errors.push('No vincula póliza nueva/anterior');
if (!issuance.includes('oldPolicyStateUnchanged')) warnings.push('No documenta explícitamente preservación de estado anterior');
if (!issuanceRef.includes('solicitud_no_lista_para_emision') || !issuanceRef.includes('documentos_emision_incompletos')) errors.push('No exige preparación antes de emitir');
if (!issuanceRef.includes('traslape_requiere_regla_tenant')) errors.push('No bloquea traslape sin regla tenant');
if (!endorsement.includes("workflowType: 'endorsement_request'")) errors.push('Endosos no usan gestión tipada');
if (!endorsement.includes("lista: 'Renovaciones / Modif.'")) errors.push('Endosos no viven en Ops');
if (!endorsement.includes('tipo_endoso_requiere_flujo_configurado')) errors.push('No bloquea tipos no configurados');
if (!endorsement.includes("estado: 'Histórico'")) errors.push('Sustitución no conserva vehículo histórico');
if (/\.remove\s*\(/.test(combined)) errors.push('Motor v1201 contiene borrado físico');
if (/localStorage|sessionStorage|firebase\.|firestore/i.test(combined)) errors.push('Motor v1201 toca almacenamiento/proveedor directo');
if (/password\s*:|pass\s*:|clave\s*:|apiKey\s*:/i.test(combined)) errors.push('Motor v1201 contiene campo sensible');
if (!bridge.includes('Registrar opción aceptada') || !bridge.includes('No crea una póliza provisional')) errors.push('Bridge no explica el flujo pre-emisión');
if (!bridge.includes("mod.renovar = function") || !bridge.includes("mod.endoso = function")) errors.push('Bridge no sustituye acciones legacy');
if (!renewedFilter.includes('renovadaPor') || !renewedFilter.includes('renovacionEstado')) errors.push('Pipeline no excluye pólizas ya renovadas');
if (!read('data/academia-v1201-emision-endosos.js').includes('cur_emision_endosos_asesor_v1201')) errors.push('Academia no incluye ruta Asesor');
if (errors.length) {
  console.error('ORBIT360 EMISION/ENDOSOS V1201: BLOQUEADO');
  errors.forEach(e => console.error('- ' + e));
  warnings.forEach(e => console.warn('- AVISO: ' + e));
  process.exit(1);
}
console.log('ORBIT360 EMISION/ENDOSOS V1201: OK');
console.log('- Solicitud de emisión y endosos viven en Ops/gestiones');
console.log('- Póliza requiere número/documento reales');
console.log('- Renovación queda vinculada y sin cierre automático de origen');
console.log('- Pipeline excluye pólizas ya renovadas');
console.log('- Traslape no configurado queda bloqueado');
console.log('- Endosos no configurados permanecen bloqueados');
console.log('- Sin borrado físico ni acceso directo a proveedor');
warnings.forEach(e => console.warn('- AVISO: ' + e));
