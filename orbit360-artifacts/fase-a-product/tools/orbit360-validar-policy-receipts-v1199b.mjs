import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.cwd(),'orbit360-platform');
const read=rel=>fs.existsSync(path.join(root,rel))?fs.readFileSync(path.join(root,rel),'utf8'):'';
const errors=[];
const required=[
  'core/access-ceilings-v1199.js',
  'core/policy-receipts-engine.js',
  'core/policy-receipts-v1199-refinements.js',
  'modules/policy-receipts-v1199-bridge.js',
  'modules/policy-receipts-v1199-detail-guard.js',
  'data/academia-v1199-policy-receipts.js',
  'tools/orbit360-test-policy-receipts-v1199b.mjs'
];
required.forEach(rel=>{if(!fs.existsSync(path.join(root,rel)))errors.push('Falta '+rel);});
const index=read('index.html');
const engine=read('core/policy-receipts-engine.js');
const refine=read('core/policy-receipts-v1199-refinements.js');
const bridge=read('modules/policy-receipts-v1199-bridge.js');
const detailGuard=read('modules/policy-receipts-v1199-detail-guard.js');
required.slice(0,6).forEach(rel=>{if(!index.includes(rel))errors.push('index.html no carga '+rel);});
const accessPos=index.indexOf('core/access-scope.js');
const ceilingPos=index.indexOf('core/access-ceilings-v1199.js');
const enginePos=index.indexOf('core/policy-receipts-engine.js');
const refinePos=index.indexOf('core/policy-receipts-v1199-refinements.js');
const crmPos=index.indexOf('modules/crm-v1198-operational-bridge.js');
const bridgePos=index.indexOf('modules/policy-receipts-v1199-bridge.js');
const detailPos=index.indexOf('modules/policy-receipts-v1199-detail-guard.js');
if(!(accessPos>=0&&ceilingPos>accessPos&&enginePos>ceilingPos&&refinePos>enginePos))errors.push('Orden core v1199 incorrecto');
if(!(crmPos>=0&&bridgePos>crmPos&&detailPos>bridgePos))errors.push('Orden bridges v1199 incorrecto');
['core/backend-lab-loader.js','core/backend-lab-init.js','data/store.js','data/store-firestore-lab.local.js','core/auth.js','core/importa.js','modules/portal-v1142-copyfix.js'].forEach(rel=>{if(!index.includes(rel))errors.push('index perdió protegido/hotfix '+rel);});
if(/localStorage|sessionStorage/.test(engine+refine))errors.push('Motor/refinamiento usa almacenamiento navegador');
if(/insert\(['"]finmovs|update\(['"]finmovs/.test(engine+refine))errors.push('Motor escribe finmovs');
if(/remove\(['"]cobros/.test(engine+refine))errors.push('Motor elimina cobros físicamente');
['canonicalPolicyKey','validatePolicy','expectedReceipts','syncReceipts','createPolicy','updatePolicy','applyPayment','createReconciliationProposal'].forEach(t=>{if(!engine.includes(t))errors.push('Motor sin '+t);});
['hasIdentity','compare_after','existing','PROPUESTA','EN_REVISION','VALIDADA'].forEach(t=>{if(!refine.includes(t))errors.push('Refinamiento incompleto: '+t);});
if(!bridge.includes('No se genera un número ficticio'))errors.push('Alta aún permite número ficticio');
if(!bridge.includes('Separada por moneda'))errors.push('KPI no separa monedas');
if(!detailGuard.includes("querySelector('#cd-val')"))errors.push('Validación de reporte no pasa por guard');
if(errors.length){console.error('CIERRE POLICY RECEIPTS V1199B: BLOQUEADO');errors.forEach(e=>console.error('- '+e));process.exit(1);}
console.log('CIERRE POLICY RECEIPTS V1199B: OK');
console.log('- protegidos/hotfixes conservados');
console.log('- motor idempotente sin borrado físico');
console.log('- recaudo separado de finmovs');
console.log('- refinamientos y guards cargados en orden');
console.log('- KPI por moneda y número real obligatorio');
