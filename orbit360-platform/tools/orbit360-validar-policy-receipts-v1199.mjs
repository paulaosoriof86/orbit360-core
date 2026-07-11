import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'orbit360-platform');
const read=rel=>fs.existsSync(path.join(root,rel))?fs.readFileSync(path.join(root,rel),'utf8'):'';
const errors=[],warnings=[];
const required=[
  'core/access-ceilings-v1199.js',
  'core/policy-receipts-engine.js',
  'modules/policy-receipts-v1199-bridge.js',
  'data/academia-v1199-policy-receipts.js',
  'tools/orbit360-test-policy-receipts-v1199.mjs'
];
required.forEach(rel=>{if(!fs.existsSync(path.join(root,rel)))errors.push('Falta '+rel);});
const index=read('index.html'),engine=read('core/policy-receipts-engine.js'),bridge=read('modules/policy-receipts-v1199-bridge.js'),ceiling=read('core/access-ceilings-v1199.js'),academy=read('data/academia-v1199-policy-receipts.js');
required.slice(0,4).forEach(rel=>{if(!index.includes(rel))errors.push('index.html no carga '+rel);});
const ceilingPos=index.indexOf('core/access-ceilings-v1199.js');
const enginePos=index.indexOf('core/policy-receipts-engine.js');
const bridgePos=index.indexOf('modules/policy-receipts-v1199-bridge.js');
const accessPos=index.indexOf('core/access-scope.js');
const crmPos=index.indexOf('modules/crm-v1198-operational-bridge.js');
if(!(ceilingPos>accessPos))errors.push('Límites de acceso deben cargar después de access-scope');
if(!(enginePos>ceilingPos))errors.push('Motor debe cargar después de límites de acceso');
if(!(bridgePos>crmPos))errors.push('Bridge v1199 debe cargar después del bridge CRM');
['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js'].forEach(rel=>{if(!index.includes(rel))errors.push('index perdió protegido '+rel);});
if(/localStorage|sessionStorage/.test(engine))errors.push('Motor usa almacenamiento navegador');
if(/insert\(['"]finmovs|update\(['"]finmovs/.test(engine))errors.push('Motor escribe finmovs');
if(/remove\(['"]cobros/.test(engine))errors.push('Motor elimina cobros físicamente');
['canonicalPolicyKey','validatePolicy','expectedReceipts','syncReceipts','createPolicy','updatePolicy','applyPayment','createReconciliationProposal'].forEach(token=>{if(!engine.includes(token))errors.push('Motor sin '+token);});
['pagos_existentes_requieren_endoso','plan_pago_reemplazado','poliza_sin_cartera','ingreso_manual_plataforma','pendiente conciliación bancaria','conciliar_recibo_pagado'].forEach(token=>{if(!engine.includes(token))errors.push('Contrato faltante '+token);});
if(!bridge.includes('clientMod.nuevaPoliza'))errors.push('Bridge no reemplaza alta de póliza');
if(!bridge.includes('cob.aplicarPago=openPayment'))errors.push('Bridge no conecta pago seguro');
if(!bridge.includes('cob.conciliarFactura=openReconciliationProposal'))errors.push('Bridge no separa conciliación');
if(!bridge.includes('Separada por moneda'))errors.push('Bridge no corrige KPI multimoneda');
if(!bridge.includes('No se genera un número ficticio'))errors.push('Alta aún permite número ficticio');
if(!ceiling.includes('BLOCKED_ADVISOR_MODULES'))errors.push('No hay límites duros para Asesor');
if(!academy.includes('Pólizas, recibos y recaudo'))errors.push('Academia no fue actualizada');
if(errors.length){console.error('CIERRE POLIZA RECIBOS V1199: BLOQUEADO');errors.forEach(e=>console.error('- '+e));process.exit(1);}
console.log('CIERRE POLIZA RECIBOS V1199: OK');
console.log('- motor idempotente presente'); console.log('- sin borrado físico de cobros'); console.log('- sin finmovs por recaudo'); console.log('- cambios con pagos requieren endoso'); console.log('- conciliación permanece propuesta'); console.log('- KPI separados por moneda');
if(warnings.length)warnings.forEach(w=>console.warn('- '+w));
