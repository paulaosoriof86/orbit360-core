import fs from 'node:fs';
import vm from 'node:vm';

const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>fs.readFileSync(p,'utf8');

const files={
  client:read('orbit360-platform/modules/cliente360.js'),
  insurers:read('orbit360-platform/modules/aseguradoras.js'),
  crmBridge:read('orbit360-platform/modules/crm-v1198-operational-bridge.js'),
  accessScope:read('orbit360-platform/core/access-scope.js'),
  bridge:read('orbit360-platform/modules/policy-receipts-v1199-bridge.js'),
  engine:read('orbit360-platform/core/policy-receipts-engine.js'),
  refinements:read('orbit360-platform/core/policy-receipts-v1199-refinements.js'),
  issuance:read('orbit360-platform/core/issuance-workflow-v1201.js'),
  issuanceRefinements:read('orbit360-platform/core/issuance-workflow-v1201-refinements.js'),
  issuanceBridge:read('orbit360-platform/modules/issuance-endosos-v1201-bridge.js'),
  receiptsProjection:read('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js'),
  detail:read('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'),
  academia:read('orbit360-platform/modules/academia.js'),
  academiaCatalog:read('orbit360-platform/data/academia-product-catalog-v1.js'),
  academiaOwner:read('orbit360-platform/core/academia-product-catalog-p0.js'),
  runtimeConfig:read('orbit360-platform/product-runtime-config.js'),
  accessPolicy:read('orbit360-platform/core/tenant-access-policy-contract-p0.js'),
  config:read('orbit360-platform/core/config.js'),
  router:read('orbit360-platform/core/router.js'),
  productApp:read('orbit360-platform/core/product-app-p0.js'),
  index:read('orbit360-platform/index.html')
};

need(files.client.includes("Usa Guardar cambios o Cancelar"),'B2_CLIENT_EDIT_BACKDROP_GUARD_MISSING');
need(!files.insurers.includes("title: 'Orbit Aseguradoras'")&&files.insurers.includes("title: 'Aseguradoras'"),'B2_ASEGURADORAS_VISIBLE_ORBIT_BRAND_REMAINS');
need(!files.client.includes('<b>Orbit Finanzas</b>'),'B2_CLIENT360_VISIBLE_ORBIT_FINANZAS_REMAINS');
need(files.client.includes("Usa Crear cliente o Cancelar"),'B2_CLIENT_CREATE_BACKDROP_GUARD_MISSING');
need(files.client.includes("await S().batchDurable"),'B2_CLIENT_DURABLE_SAVE_MISSING');
new Function(files.crmBridge);
need(!files.crmBridge.includes("\\`")&&!files.crmBridge.includes("\\${"),'B2_CRM_V1198_ESCAPED_TEMPLATE_LITERAL_REGRESSION');
need(files.accessScope.includes("return { exact: exact, probable: probable };"),'B2_DUPLICATE_PRODUCER_CONTRACT_MISSING');
need(!files.crmBridge.includes("dup.filter(")&&!files.crmBridge.includes("if (dup.length)"),'B2_DUPLICATE_ARRAY_CONSUMER_REGRESSION');
need(files.crmBridge.includes("Array.isArray(dup.exact)")&&files.crmBridge.includes("Array.isArray(dup.probable)")&&files.crmBridge.includes("const probable = dup.probable;"),'B2_DUPLICATE_CONSUMER_CONTRACT_MISSING');
need(files.crmBridge.includes("No fue posible validar duplicados; no se creó el cliente."),'B2_DUPLICATE_CONTRACT_FAIL_CLOSED_MISSING');
need(files.crmBridge.includes("mod.nuevoCliente = openNewClient"),'B2_ACTIVE_CLIENT_MODAL_OWNER_MISSING');
const activeClientOwner=(files.crmBridge.match(/function openNewClient\(\)\s*\{[\s\S]*?\n  function [A-Za-z0-9_]+\(/)||[])[0]||'';
need(activeClientOwner,'B2_ACTIVE_CLIENT_OWNER_SLICE_MISSING');
need(activeClientOwner.includes("await store.batchDurable"),'B2_ACTIVE_CLIENT_CREATE_DURABLE_SAVE_MISSING');
need(activeClientOwner.includes("Usa Crear cliente o Cancelar"),'B2_ACTIVE_CLIENT_CREATE_BACKDROP_GUARD_MISSING');
need(!activeClientOwner.includes("if (e.target === back) close();"),'B2_ACTIVE_CLIENT_CREATE_BACKDROP_CLOSE_STILL_PRESENT');
need(files.crmBridge.includes("Identidad y contacto")&&files.crmBridge.includes("Contexto y seguimiento"),'B2_ACTIVE_CLIENT_MODAL_VISUAL_HIERARCHY_MISSING');
need(files.bridge.includes('data-advisor'),'B2_POLICY_ADVISOR_SELECTOR_MISSING');
need(files.bridge.includes('gi-form-section-title')&&files.bridge.includes('gi-policy-preview'),'B2_POLICY_EDITOR_VISUAL_HIERARCHY_MISSING');
need(files.bridge.includes('data-client-search'),'B2_POLICY_CLIENT_SEARCH_MISSING');
need(files.bridge.includes('syncInstallments'),'B2_POLICY_FREQUENCY_UI_SYNC_MISSING');
need(files.engine.includes('function installmentsForFrequency'),'B2_POLICY_FREQUENCY_ENGINE_RULE_MISSING');
need(files.detail.includes('gi-policy-hero')&&files.detail.includes('gi-detail-kpis'),'B2_POLICY_FULLPAGE_VISUAL_HIERARCHY_MISSING');
need(files.detail.includes('gi-receipt-detail'),'B2_RECEIPT_DETAIL_VISUAL_HIERARCHY_MISSING');
need(files.detail.includes('✏️ Editar póliza'),'B2_POLICY_EDIT_ACTION_MISSING');
need(files.detail.includes('Completar vehículo'),'B2_MISSING_VEHICLE_REPAIR_ACTION_MISSING');
for(const marker of ['data-vbrand','data-vline','data-vplate','data-vyear','data-vuse','data-vcolor','data-vvin','data-vchasis','data-vmotor'])need(files.bridge.includes(marker),'B2_VEHICLE_FIELD_MISSING:'+marker);
need(files.bridge.includes("save.textContent = 'Guardando…'"),'B2_POLICY_SAVE_PENDING_STATE_MISSING');
need(!files.bridge.includes("if (e.target === b) close();"),'B2_POLICY_BACKDROP_CLOSE_STILL_PRESENT');
need(files.engine.includes("action:prior?'update':'insert',collection:'vehiculos'"),'B2_VEHICLE_UPSERT_MISSING');
need(files.issuance.includes('async function createRequest')&&files.issuance.includes("await S().insertDurable('gestiones', request)"),'B2_ISSUANCE_CREATE_NOT_DURABLE');
need(files.issuance.includes('async function advanceRequest')&&files.issuance.includes("await S().updateDurable('gestiones', id, next)"),'B2_ISSUANCE_ADVANCE_NOT_DURABLE');
need(files.issuanceRefinements.includes('I.advanceRequest = async function')&&files.issuanceRefinements.includes('return await originalAdvance')&&files.issuanceRefinements.includes('I.issueRequest = async function')&&files.issuanceRefinements.includes('return await originalIssue'),'B2_ISSUANCE_REFINEMENTS_NOT_ASYNC');
need(files.issuanceBridge.includes('await I.createRequest')&&files.issuanceBridge.includes('await I.advanceRequest'),'B2_ISSUANCE_UI_CREATE_ADVANCE_NOT_AWAITED');
need(files.issuance.includes('async function issueRequest'),'B2_ISSUANCE_NOT_ASYNC');
need(files.issuance.includes('await P().createPolicy'),'B2_ISSUANCE_CREATE_NOT_AWAITED');
need(files.issuance.includes("await S().updateDurable('polizas', source.id")&&files.issuance.includes("await S().updateDurable('gestiones', request.id")&&files.issuance.includes("renovadaPor: policy.id")&&files.issuance.includes("policyCreatedId: policy.id"),'B2_RENEWAL_DURABLE_CLOSURE_MISSING');
need(!files.issuance.includes("S().update('polizas', source.id"),'B2_RENEWAL_SOURCE_LINK_FIRE_AND_FORGET_REMAINS');
need(files.issuanceBridge.includes("onclick = async"),'B2_ISSUANCE_UI_NOT_ASYNC');
need(files.issuanceBridge.includes('await I.issueRequest'),'B2_ISSUANCE_UI_NOT_AWAITED');
need(files.receiptsProjection.includes('Orbit.receiptsPortfolioProjection=Orbit.receiptsPortfolioProjectionV920'),'B2_RECEIPTS_CANONICAL_PROJECTION_MISSING');
need(files.detail.includes('Editar vehículo'),'B2_VEHICLE_EDIT_ACTION_MISSING');
need(files.runtimeConfig.includes("'cursos'")&&files.runtimeConfig.includes("'academyProgress'"),'B2_ACADEMIA_RUNTIME_HYDRATION_MISSING');
need(files.accessPolicy.includes("cursos: { module: 'academia'")&&files.accessPolicy.includes("academyProgress: { module: 'academia'")&&files.accessPolicy.includes("field: 'uid'"),'B2_ACADEMIA_READ_POLICY_MISSING');
need(files.academiaCatalog.includes("cur_p_clientes")&&files.academiaCatalog.includes("cur_p_aseg_cotiz")&&files.academiaCatalog.includes("automaticWrites:false"),'B2_ACADEMIA_APPROVED_CATALOG_MISSING');
need(files.academiaOwner.includes("catalogManagementDurable:false")&&files.academiaOwner.includes("ACADEMIA_PRODUCT_CATALOG_READ_ONLY")&&!files.academiaOwner.includes("Orbit.store.insert"),'B2_ACADEMIA_READONLY_OWNER_INVALID');
need(files.productApp.includes("academyOwner.install(Orbit.store)")&&files.productApp.includes("ACADEMIA_PRODUCT_CATALOG_NOT_READY"),'B2_ACADEMIA_OWNER_NOT_COMPOSED');
need(files.academia.includes("title: 'Academia de Gravicentra'"),'B2_ACADEMIA_VISIBLE_BRAND_MISSING');
need(!files.academia.includes("title: 'Orbit Academia'")&&!files.academia.includes("asesorId: 'ase001'")&&!files.academia.includes("Academia Orbit 360"),'B2_ACADEMIA_VISIBLE_OR_HARDCODE_REGRESSION');
const operativoRole=(files.config.match(/'Operativo':\s*\{[\s\S]*?\n\s*'Asesor':/)||[])[0]||'';
const asesorRole=(files.config.match(/'Asesor':\s*\{[\s\S]*?\n\s*'Asistente':/)||[])[0]||'';
need(operativoRole.includes("'academia'"),'B2_ACADEMIA_OPERATIVO_ROLE_DEFAULT_MISSING');
need(asesorRole.includes("'academia'"),'B2_ACADEMIA_ASESOR_ROLE_DEFAULT_MISSING');
need(files.config.includes("label: 'Academia'")&&files.config.includes("title: 'Academia de Gravicentra'")&&!files.config.includes("label: 'Orbit Academia'")&&!files.config.includes("title: 'Orbit Academia'"),'B2_ACADEMIA_CONFIG_BRAND_MISSING');
need(!/label: 'Orbit |title: 'Orbit |label: 'Orbit CRM'/.test(files.config),'B2_VISIBLE_ORBIT_CONFIG_BRANDING_REMAINS');
need(files.router.includes('Gravicentra Insurance')&&!files.router.includes('Marca de producto <b style="color:#fff">Orbit 360</b>'),'B2_VISIBLE_ORBIT_SHELL_BRANDING_REMAINS');
for(const role of ['Dirección','Admin','Comercial','Finanzas','Marketing','Operativo','Asesor','Asistente']){
  const pos=files.config.indexOf("'"+role+"':");
  const next=files.config.indexOf("\n  '",pos+3);
  const slice=files.config.slice(pos,next>pos?next:files.config.indexOf("\n};",pos));
  need(slice.includes("'academia'"),'B2_ACADEMIA_ALL_ROLE_DEFAULT_MISSING:'+role);
}
new Function(files.academiaCatalog);new Function(files.academiaOwner);new Function(files.academia);
for(const marker of ['core/config.js?v=20260923-b2a3','data/academia-product-catalog-v1.js?v=20260923-b2a1','core/academia-product-catalog-p0.js?v=20260923-b2a1','product-runtime-config.js?v=20260923-b2a1','core/tenant-access-policy-contract-p0.js?v=20260923-b2a1','modules/academia.js?v=20260923-b2a1','core/product-app-p0.js?v=20260923-b2a1','core/access-scope.js?v=20260921-b1r12','core/policy-receipts-engine.js?v=20260923-b2v2','core/policy-receipts-v1199-refinements.js?v=20260923-b2a3','core/issuance-workflow-v1201.js?v=20260924-b2a6','modules/cliente360.js?v=20260924-b2a7','modules/aseguradoras.js?v=20260924-b2a7','modules/crm-v1198-operational-bridge.js?v=20260923-b2v4','modules/policy-receipts-v1199-bridge.js?v=20260923-b2v2','modules/policy-receipts-v1199-detail-guard.js?v=20260923-b2v2','modules/issuance-endosos-v1201-bridge.js?v=20260924-b2a6'])need(files.index.includes(marker),'B2_CACHE_KEY_MISSING:'+marker);

global.window=global;
const rows={
  clientes:[{id:'cli-b2',nombre:'Cliente B2',pais:'GT',moneda:'GTQ',asesorId:'ase-b2',estado:'activo',estadoOperativo:'activo'}],
  asesores:[{id:'ase-b2',nombre:'Asesor B2'}],
  aseguradoras:[{id:'asg-b2',nombre:'Aseguradora B2',pais:'GT',paises:['GT'],vinculada:true}],
  polizas:[],vehiculos:[],recibosEsperados:[],carteraPrimas:[],cobros:[],actividades:[],gestiones:[]
};
const clone=v=>JSON.parse(JSON.stringify(v));
const find=(c,id)=>rows[c]?.find(x=>x.id===id)||null;
const applyMutation=m=>{
  rows[m.collection]=rows[m.collection]||[];
  if(m.action==='insert'){
    if(find(m.collection,m.id))throw new Error('DUPLICATE_INSERT:'+m.collection+':'+m.id);
    rows[m.collection].push(clone(Object.assign({},m.payload,{id:m.id||m.payload?.id})));
  }else if(m.action==='update'){
    const x=find(m.collection,m.id); if(!x)throw new Error('UPDATE_MISSING:'+m.collection+':'+m.id);
    Object.assign(x,clone(m.payload||{}));
  }else if(m.action==='remove'){
    const i=rows[m.collection].findIndex(x=>x.id===m.id);if(i>=0)rows[m.collection].splice(i,1);
  }else throw new Error('UNKNOWN_MUTATION:'+m.action);
};
let lastBatch=[];
const store={
  all:c=>(rows[c]||[]),
  get:(c,id)=>find(c,id),
  where:(c,p)=>(rows[c]||[]).filter(p),
  find:(c,p)=>(rows[c]||[]).find(p),
  insert:(c,row)=>{rows[c]=rows[c]||[];const x=clone(row);rows[c].push(x);return x;},
  insertDurable:async(c,row)=>{rows[c]=rows[c]||[];const x=clone(row);if(!x.id)throw new Error('INSERT_DURABLE_ID_REQUIRED:'+c);if(find(c,x.id))throw new Error('INSERT_DURABLE_DUPLICATE:'+c+':'+x.id);rows[c].push(x);return clone(x);},
  update:(c,id,patch)=>{const x=find(c,id);if(!x)return false;Object.assign(x,clone(patch));return true;},
  updateDurable:async(c,id,patch)=>{const x=find(c,id);if(!x)throw new Error('UPDATE_DURABLE_MISSING:'+c+':'+id);Object.assign(x,clone(patch));return clone(x);},
  remove:(c,id)=>{const a=rows[c]||[],i=a.findIndex(x=>x.id===id);if(i<0)return false;a.splice(i,1);return true;},
  batchDurable:async mutations=>{lastBatch=clone(mutations);for(const m of mutations)applyMutation(m);return{ok:true,readback:true};}
};
global.Orbit={
  store,
  ui:{today:()=> '2026-09-20'},
  PAISES:[{id:'GT',moneda:'GTQ'},{id:'CO',moneda:'COP'}],
  access:{
    activeRole:()=> 'Operativo',
    actorAdvisor:()=> rows.asesores[0],
    actorUser:()=>({id:'u-b2',nombre:'Operador B2',asesorId:'ase-b2',rolActivo:'Operativo'}),
    tenantId:()=> 'alianzas-soluciones',
    currencyFor:p=>p==='CO'?'COP':'GTQ',
    norm:v=>String(v??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''),
    deriveClientState:()=> 'activo',
    audit:()=>true
  },
  primas:{
    FRECUENCIAS:{Contado:1,Semestral:2,Mensual:12},
    FORMAS_PAGO:['Transferencia'],
    CONDUCTOS:['Cobro directo del intermediario','Cobro de la aseguradora'],
    cuotasDe:f=>f==='Mensual'?12:f==='Semestral'?2:1,
    r2:n=>Math.round((+n||0)*100)/100,
    desglose:(neta,pais,opt={})=>{
      const n=+neta||0,g=+opt.gastosEmision||0,o=+opt.otros||0,gf=n*((+opt.recargoFinPct||0)/100),base=n+g+o+gf,iva=base*(pais==='GT'?0.12:0);
      return{neta:n,gastosEmision:g,otros:o,gastosFinan:gf,baseGravable:base,ivaPct:pais==='GT'?12:0,iva,total:base+iva,recargoPct:+opt.recargoFinPct||0};
    },
    recibos:(d,opt={})=>{
      const count=Math.max(1,+opt.cuotas||1),total=+d.total||0,out=[];
      for(let i=0;i<count;i++){
        const amt=i===count-1?Math.round((total-out.reduce((s,x)=>s+x.total,0))*100)/100:Math.round((total/count)*100)/100;
        const month=String(i+1).padStart(2,'0');
        out.push({n:i+1,neta:Math.round((d.neta/count)*100)/100,gastosEmision:0,gastosFinan:0,otros:0,iva:Math.round((d.iva/count)*100)/100,total:amt,comAseguradora:0,comVendedor:0,vence:'2026-'+month+'-28',fechaLimite:'2026-'+month+'-28'});
      }
      return out;
    }
  }
};
vm.runInThisContext(files.engine,{filename:'policy-receipts-engine.js'});
need(!!Orbit.policyReceipts,'B2_ENGINE_LOAD_FAILED');

const create=await Orbit.policyReceipts.createPolicy({
  id:'pol-b2-a',numero:'B2-001',clienteId:'cli-b2',asesorId:'ase-b2',aseguradoraId:'asg-b2',pais:'GT',moneda:'GTQ',
  ramo:'Autos',subramo:'Auto individual',producto:'Auto individual',estado:'Vigente',vigenciaInicio:'2026-09-20',vigenciaFin:'2027-09-20',
  frecuencia:'Semestral',formaPago:'Transferencia',conducto:'Cobro directo del intermediario',cuotas:10,primaNeta:1000,gastosEmision:50,otros:0,
  vehiculo:{marca:'Toyota',linea:'Corolla',placa:'B2TEST',anio:'2026',uso:'Particular',color:'Blanco',vin:'VIN-B2',chasis:'CH-B2',motor:'MO-B2'}
},{motivo:'B2 controlled proof',operationId:'b2-create'});
need(create.ok===true,'B2_POLICY_CREATE_FAILED:'+JSON.stringify(create.errors||[]));
need(create.policy.cuotas===2,'B2_FIXED_FREQUENCY_DID_NOT_OVERRIDE_INCONSISTENT_RECEIPT_COUNT:'+create.policy.cuotas);
const monthlyPrepared=Orbit.policyReceipts.preparePolicy({clienteId:'cli-b2',asesorId:'ase-b2',aseguradoraId:'asg-b2',pais:'GT',moneda:'GTQ',numero:'B2-MONTHLY',ramo:'Autos',producto:'Auto individual',estado:'Vigente',vigenciaInicio:'2026-09-20',vigenciaFin:'2027-09-20',frecuencia:'Mensual',cuotas:7,primaNeta:1000},null,'b2-monthly');
need(monthlyPrepared.cuotas===7,'B2_MONTHLY_CUSTOM_RECEIPT_COUNT_NOT_PRESERVED:'+monthlyPrepared.cuotas);
const createCollections=lastBatch.map(x=>x.collection);
need(createCollections.includes('polizas'),'B2_POLICY_MUTATION_MISSING');
need(createCollections.includes('vehiculos'),'B2_VEHICLE_INSERT_MISSING');
need(createCollections.filter(x=>x==='recibosEsperados').length===2,'B2_EXPECTED_RECEIPT_COUNT_INVALID');
need(createCollections.filter(x=>x==='carteraPrimas').length===2,'B2_PORTFOLIO_COUNT_INVALID');
need(!createCollections.includes('cobros')&&rows.cobros.length===0,'B2_POLICY_CREATED_CONFIRMED_COBRO');
need(rows.vehiculos[0]?.color==='Blanco'&&rows.vehiculos[0]?.chasis==='CH-B2'&&rows.vehiculos[0]?.motor==='MO-B2','B2_COMPLETE_VEHICLE_CREATE_FAILED');

const update=await Orbit.policyReceipts.updatePolicy('pol-b2-a',{
  vehiculo:{id:rows.vehiculos[0].id,marca:'Toyota',linea:'Corolla',placa:'B2TEST',anio:'2026',uso:'Particular',color:'Azul',vin:'VIN-B2',chasis:'CH-B2',motor:'MO-B2'}
},{motivo:'B2 controlled vehicle edit',operationId:'b2-update'});
need(update.ok===true,'B2_POLICY_UPDATE_FAILED:'+JSON.stringify(update.errors||[]));
need(lastBatch.some(x=>x.collection==='vehiculos'&&x.action==='update'),'B2_VEHICLE_WAS_NOT_UPDATED');
need(rows.vehiculos.length===1&&rows.vehiculos[0].color==='Azul','B2_VEHICLE_UPDATE_DUPLICATED_OR_FAILED');
need(!lastBatch.some(x=>x.collection==='cobros'),'B2_POLICY_EDIT_CREATED_CONFIRMED_COBRO');

rows.gestiones.push({
 id:'ges-b2-ren',tenantId:'alianzas-soluciones',workflowType:'issuance_request',emissionStage:'PENDIENTE_EMISION',estado:'Pendiente',
 clienteId:'cli-b2',asesorId:'ase-b2',aseguradoraId:'asg-b2',pais:'GT',moneda:'GTQ',ramo:'Autos',producto:'Auto individual',
 sourcePolicyId:'pol-b2-a',renewalManagementId:'ren-b2',acceptedOffer:{frecuencia:'Semestral',formaPago:'Transferencia',conducto:'Cobro directo del intermediario',primaNeta:1100,gastosEmision:55,cuotas:2},
 checklist:[{t:'Número real y póliza emitida',done:false}]
});
rows.gestiones.push({id:'ren-b2',tipo:'Renovación',estado:'Pendiente',polizaId:'pol-b2-a'});
vm.runInThisContext(files.issuance,{filename:'issuance-workflow-v1201.js'});
need(!!Orbit.issuance,'B2_ISSUANCE_LOAD_FAILED');
const issued=await Orbit.issuance.issueRequest('ges-b2-ren',{
 numero:'B2-002',documentRef:'doc-b2',vigenciaInicio:'2027-09-20',vigenciaFin:'2028-09-20',
 frecuencia:'Semestral',cuotas:2,formaPago:'Transferencia',conducto:'Cobro directo del intermediario',primaNeta:1100,gastosEmision:55
},{motivo:'B2 controlled renewal issuance',operationId:'b2-renew'});
need(issued.ok===true,'B2_RENEWAL_ISSUANCE_FAILED:'+JSON.stringify(issued.errors||[]));
need(issued.policy&&issued.policy.renuevaDe==='pol-b2-a','B2_RENEWAL_LINK_MISSING');
need(rows.polizas.find(x=>x.id==='pol-b2-a')?.renovadaPor===issued.policy.id,'B2_SOURCE_POLICY_RENEWAL_LINK_MISSING');
need(rows.recibosEsperados.filter(x=>x.polizaId===issued.policy.id&&String(x.estado).toLowerCase()!=='anulado').length===2,'B2_RENEWAL_RECEIPTS_MISSING');
need(rows.carteraPrimas.filter(x=>x.polizaId===issued.policy.id&&x.carteraActiva!==false).length===2,'B2_RENEWAL_PORTFOLIO_MISSING');
need(rows.cobros.length===0,'B2_RENEWAL_CREATED_CONFIRMED_COBRO');

console.log('I65_B2_FUNCTIONAL=PASS');
console.log('I65_B2_CLIENT_DURABLE=true');
console.log('I65_B2_ACTIVE_CLIENT_MODAL_OWNER=CRM_V1198_DURABLE_PROTECTED');
console.log('I65_B2_POLICY_ADVISOR=true');
console.log('I65_B2_POLICY_VISUAL_HIERARCHY_SOURCE=true');
console.log('I65_B2_ACADEMIA_SOURCE=true');
console.log('I65_B2_ACADEMIA_REQUIRED_COURSES=true');
console.log('I65_B2_ACADEMIA_AUTOMATIC_WRITES=0');
console.log('I65_B2_FIXED_FREQUENCY_RECEIPTS=true');
console.log('I65_B2_MONTHLY_CUSTOM_RECEIPTS=true');
console.log('I65_B2_VEHICLE_CREATE_EDIT=true');
console.log('I65_B2_RECEIPTS_PROJECTION=V920');
console.log('I65_B2_RENEWAL_ASYNC_AWAIT=true');
console.log('I65_B2_RENEWAL_RECEIPTS='+rows.recibosEsperados.filter(x=>x.polizaId===issued.policy.id&&String(x.estado).toLowerCase()!=='anulado').length);
console.log('I65_B2_RENEWAL_PORTFOLIO='+rows.carteraPrimas.filter(x=>x.polizaId===issued.policy.id&&x.carteraActiva!==false).length);
console.log('I65_B2_CONFIRMED_COBROS='+rows.cobros.length);
console.log('I65_B2_DATA_WRITES=0');
