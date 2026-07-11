import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'orbit360-platform');
const read=rel=>fs.existsSync(path.join(root,rel))?fs.readFileSync(path.join(root,rel),'utf8'):'';
const required=[
  'core/quote-comparison-contracts-v1203.js',
  'modules/cotizador-v1203-source-gate.js',
  'modules/comparativo-v1203-operational-bridge.js',
  'data/academia-v1203-cotizador-comparativo.js'
];
const errors=[];
for(const rel of required)if(!fs.existsSync(path.join(root,rel)))errors.push('Falta '+rel);
const index=read('index.html');
for(const rel of required)if(!index.includes(rel))errors.push('index.html no carga '+rel);
for(const rel of ['data/store.js','data/store-firestore-lab.local.js','core/backend-lab-loader.js','core/backend-lab-init.js','core/auth.js','core/importa.js','modules/aseguradoras.js','modules/cotizador.js','modules/comparativo.js','core/issuance-workflow-v1201.js'])if(!index.includes(rel))errors.push('index.html perdió baseline/protegido: '+rel);
const pos=rel=>index.indexOf(rel);
if(pos('core/quote-comparison-contracts-v1203.js')<pos('data/store.js'))errors.push('Contrato cotizador carga antes de Orbit.store');
if(pos('core/quote-comparison-contracts-v1203.js')>pos('modules/cotizador-v1203-source-gate.js'))errors.push('Contrato cotizador carga después del bridge');
if(pos('modules/cotizador-v1203-source-gate.js')<pos('modules/cotizador.js'))errors.push('Bridge Cotizador carga antes del módulo base');
if(pos('modules/comparativo-v1203-operational-bridge.js')<pos('modules/comparativo.js'))errors.push('Bridge Comparativo carga antes del módulo base');

const core=read('core/quote-comparison-contracts-v1203.js');
const cot=read('modules/cotizador-v1203-source-gate.js');
const cmp=read('modules/comparativo-v1203-operational-bridge.js');
if(!core.includes("TARIFF_STATES = new Set(['validado_habilitado'])"))errors.push('No aplica default-deny de tarifas');
if(!core.includes('configuracion_tarifa_validada_no_disponible'))errors.push('Falta bloqueo sin configuración validada');
if(!core.includes('normalizeQuote'))errors.push('Falta contrato de cotización');
if(!core.includes('createComparison')||!core.includes('cotizacionIds'))errors.push('Falta comparativo por IDs');
if(!core.includes('confirmacion_humana_requerida'))errors.push('Falta confirmación humana para manual/PDF');
if(!core.includes('primaNeta')||!core.includes('gastos')||!core.includes('impuestos')||!core.includes('primaTotal'))errors.push('Falta separación de prima');
if(!cot.includes('Q.calculateAutomatic')||!cot.includes('Q.persistQuote'))errors.push('Cotizador no usa contrato canónico');
if(!cot.includes("S().insert('quoteTransfers'"))errors.push('Cotizador no persiste transferencia');
if(!cmp.includes('Orbit.issuance.createRequest'))errors.push('Comparativo no conecta solicitud de emisión');
if(!cmp.includes("estado:'ganado'"))errors.push('Comparativo no registra propuesta aceptada');
if(!cmp.includes('Aún no existe una póliza emitida'))errors.push('UI no conserva estado honesto de emisión');
if(/localStorage|sessionStorage|firebase\.|firestore/i.test(core+'\n'+cot+'\n'+cmp))errors.push('Nuevos archivos tocan almacenamiento/proveedor directo');
if(/TASAS_DEF|RECARGO_FRACC/.test(core+cot))errors.push('Nuevo contrato incluye tarifas genéricas');
if(/enviado al cliente|mensaje enviado|WhatsApp enviado/i.test(core+cot+cmp))errors.push('UI afirma entrega sin proveedor');
if(!read('data/academia-v1203-cotizador-comparativo.js').includes('cur_cot_comp_asesor_v1203'))errors.push('Academia no incluye Asesor');

if(errors.length){
  console.error('ORBIT360 COTIZADOR COMPARATIVO V1203: BLOQUEADO');
  errors.forEach(e=>console.error('- '+e));
  process.exit(1);
}
console.log('ORBIT360 COTIZADOR COMPARATIVO V1203: OK');
console.log('- default-deny y fuentes validadas');
console.log('- contratos canónicos persistidos mediante Orbit.store');
console.log('- traslado por IDs y recomendación explicable');
console.log('- aceptación crea Ops, no póliza');
console.log('- backend/protegidos conservados');
