import fs from 'node:fs';
import vm from 'node:vm';

const need=(ok,code)=>{if(!ok)throw new Error(code);};
const read=p=>fs.readFileSync(p,'utf8');

const files={
  client:read('orbit360-platform/modules/cliente360.js'),
  bridge:read('orbit360-platform/modules/policy-receipts-v1199-bridge.js'),
  engine:read('orbit360-platform/core/policy-receipts-engine.js'),
  issuance:read('orbit360-platform/core/issuance-workflow-v1201.js'),
  issuanceBridge:read('orbit360-platform/modules/issuance-endosos-v1201-bridge.js'),
  receiptsProjection:read('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js'),
  detail:read('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js'),
  index:read('orbit360-platform/index.html')
};

need(files.client.includes("Usa Guardar cambios o Cancelar"),'B2_CLIENT_EDIT_BACKDROP_GUARD_MISSING');
need(files.client.includes("Usa Crear cliente o Cancelar"),'B2_CLIENT_CREATE_BACKDROP_GUARD_MISSING');
need(files.client.includes("await S().batchDurable"),'B2_CLIENT_DURABLE_SAVE_MISSING');
need(files.bridge.includes('data-advisor'),'B2_POLICY_ADVISOR_SELECTOR_MISSING');
for(const marker of ['data-vbrand','data-vline','data-vplate','data-vyear','data-vuse','data-vcolor','data-vvin','data-vchasis','data-vmotor'])need(files.bridge.includes(marker),'B2_VEHICLE_FIELD_MISSING:'+marker);
need(files.bridge.includes("save.textContent = 'Guardando…'"),'B2_POLICY_SAVE_PENDING_STATE_MISSING');
need(!files.bridge.includes("if (e.target === b) close();"),'B2_POLICY_BACKDROP_CLOSE_STILL_PRESENT');
need(files.engine.includes("action:prior?'update':'insert',collection:'vehiculos'"),'B2_VEHICLE_UPSERT_MISSING');
need(files.issuance.includes('async function issueRequest'),'B2_ISSUANCE_NOT_ASYNC');
need(files.issuance.includes('await P().createPolicy'),'B2_ISSUANCE_CREATE_NOT_AWAITED');
need(files.issuanceBridge.includes("onclick = async"),'B2_ISSUANCE_UI_NOT_ASYNC');
need(files.issuanceBridge.includes('await I.issueRequest'),'B2_ISSUANCE_UI_NOT_AWAITED');
need(files.receiptsProjection.includes('Orbit.receiptsPortfolioProjection=Orbit.receiptsPortfolioProjectionV920'),'B2_RECEIPTS_CANONICAL_PROJECTION_MISSING');
need(files.detail.includes('Editar vehículo'),'B2_VEHICLE_EDIT_ACTION_MISSING');
for(const marker of ['core/access-scope.js?v=20260920-b1r9','core/policy-receipts-engine.js?v=20260920-b2','core/issuance-workflow-v1201.js?v=20260920-b2','modules/cliente360.js?v=20260920-b2','modules/policy-receipts-v1199-bridge.js?v=20260920-b2','modules/policy-receipts-v1199-detail-guard.js?v=20260920-b2','modules/issuance-endosos-v1201-bridge.js?v=20260920-b2'])need(files.index.includes(marker),'B2_CACHE_KEY_MISSING:'+marker);

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
  update:(c,id,patch)=>{const x=find(c,id);if(!x)return false;Object.assign(x,clone(patch));return true;},
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
  frecuencia:'Semestral',formaPago:'Transferencia',conducto:'Cobro directo del intermediario',cuotas:2,primaNeta:1000,gastosEmision:50,otros:0,
  vehiculo:{marca:'Toyota',linea:'Corolla',placa:'B2TEST',anio:'2026',uso:'Particular',color:'Blanco',vin:'VIN-B2',chasis:'CH-B2',motor:'MO-B2'}
},{motivo:'B2 controlled proof',operationId:'b2-create'});
need(create.ok===true,'B2_POLICY_CREATE_FAILED:'+JSON.stringify(create.errors||[]));
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
console.log('I65_B2_POLICY_ADVISOR=true');
console.log('I65_B2_VEHICLE_CREATE_EDIT=true');
console.log('I65_B2_RECEIPTS_PROJECTION=V920');
console.log('I65_B2_RENEWAL_ASYNC_AWAIT=true');
console.log('I65_B2_RENEWAL_RECEIPTS='+rows.recibosEsperados.filter(x=>x.polizaId===issued.policy.id&&String(x.estado).toLowerCase()!=='anulado').length);
console.log('I65_B2_RENEWAL_PORTFOLIO='+rows.carteraPrimas.filter(x=>x.polizaId===issued.policy.id&&x.carteraActiva!==false).length);
console.log('I65_B2_CONFIRMED_COBROS='+rows.cobros.length);
console.log('I65_B2_DATA_WRITES=0');
