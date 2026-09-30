import fs from 'node:fs';
import vm from 'node:vm';
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const rows={polizas:[],recibosEsperados:[],carteraPrimas:[],cobros:[],clientes:[],vehiculos:[],aseguradoras:[]};
const by=(c,id)=>rows[c].find(x=>String(x.id)===String(id))||null;
const store={
  __productReadOnlyP0:true,
  all:c=>rows[c]||[],
  get:(c,id)=>by(c,id),
  where:(c,p)=>typeof p==='function'?(rows[c]||[]).filter(p):(rows[c]||[]),
  update:(c,id,patch)=>{const x=by(c,id);if(!x)throw new Error('MISSING_'+c+'_'+id);Object.assign(x,patch);return x;},
  insert:(c,row)=>{rows[c].push(row);return row;},
  _productStatus:()=>({tenantId:'alianzas-soluciones',serverConfirmedCollections:['clientes','polizas','recibosEsperados','carteraPrimas','cobros']})
};
global.window={addEventListener(){},Orbit:{}};
global.document={addEventListener(){},getElementById(){return null;},querySelectorAll(){return[];}};
global.CustomEvent=function(){};
global.Orbit=window.Orbit;
Orbit.store=store;
Orbit.access={norm:v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''),tenantId:()=> 'alianzas-soluciones',activeRole:()=> 'Dirección',actorUser:()=>({id:'qa',nombre:'QA'}),currencyFor:()=> 'GTQ'};
Orbit.ui={today:()=> '2026-09-30',money:(v,c)=>c+' '+Number(v||0).toFixed(2),fmtDate:v=>v,esc:v=>String(v??'')};
Orbit.primas={r2:v=>Math.round(Number(v||0)*100)/100};
Orbit.q={clienteResumen:cid=>({cli:{id:cid,nombre:'QA',moneda:'GTQ'},salud:80})};
Orbit.modules={cliente360:{render(){}},polizas:{verDesglose(){}},cobros:{render(){}}};
Orbit.route={params:{}};
Orbit.tenantCanonicalPathsP0={dataCollectionPath:(t,c)=>'tenants/'+t+'/data/'+c+'/items'};
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/policy-receipts-engine.js','utf8'),{filename:'policy-receipts-engine.js'});
const policy={id:'b3004qa_cancel_policy',tenantId:'alianzas-soluciones',clienteId:'b3004qa_client',asesorId:'other-advisor',pais:'GT',moneda:'GTQ',estado:'Cancelada',primaTotal:300};
rows.polizas.push(policy);
rows.clientes.push({id:'b3004qa_client',nombre:'QA Client',pais:'GT',moneda:'GTQ'});
rows.recibosEsperados.push(
 {id:'b3004qa_future',polizaId:policy.id,clienteId:policy.clienteId,asesorId:'other-advisor',estado:'Pendiente',estadoOperativo:'futuro_pendiente',carteraActiva:true,monto:100,fechaLimite:'2026-10-30'},
 {id:'b3004qa_overdue',polizaId:policy.id,clienteId:policy.clienteId,asesorId:'other-advisor',estado:'Vencido',estadoOperativo:'pendiente_vencido',carteraActiva:true,monto:100,fechaLimite:'2026-09-01'},
 {id:'b3004qa_paid',polizaId:policy.id,clienteId:policy.clienteId,asesorId:'other-advisor',estado:'Pagado',estadoOperativo:'pagado',fechaPago:'2026-08-15',carteraActiva:false,monto:100,fechaLimite:'2026-08-30'}
);
for(const r of rows.recibosEsperados)rows.carteraPrimas.push({id:'car_'+r.id,reciboId:r.id,polizaId:policy.id,clienteId:policy.clienteId,asesorId:'other-advisor',carteraActiva:true,estado:'Pendiente',monto:r.monto});
const rr=Orbit.policyReceipts.syncReceipts(policy,{operationId:'b3004qa_cancel'});
need(rr.expected===0,'R8_CANCEL_EXPECTED_RECEIPTS_NOT_ZERO');
need(by('recibosEsperados','b3004qa_future').estado==='Anulado'&&by('recibosEsperados','b3004qa_overdue').estado==='Anulado','R8_CANCEL_OPEN_RECEIPTS_NOT_ANNULLED');
need(by('recibosEsperados','b3004qa_paid').estado==='Pagado'&&by('recibosEsperados','b3004qa_paid').fechaPago==='2026-08-15','R8_CANCEL_PAID_HISTORY_NOT_PRESERVED');
const pr=Orbit.policyReceipts.syncPortfolio(policy,{operationId:'b3004qa_cancel'});
need(rows.carteraPrimas.every(x=>x.carteraActiva===false),'R8_CANCEL_PORTFOLIO_NOT_CLOSED');
need(pr.closed.length===3,'R8_CANCEL_PORTFOLIO_CLOSE_COUNT_INVALID');
// Defend read-model even against stale active flag.
const stale=by('carteraPrimas','car_b3004qa_paid');stale.carteraActiva=true;stale.estado='Pendiente';
vm.runInThisContext(fs.readFileSync('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js','utf8'),{filename:'native-receipts.js'});
need(Orbit.receiptsPortfolioProjection.isHistorical(by('recibosEsperados','b3004qa_paid'))===true,'R8_CANCEL_PAID_RECEIPT_NOT_HISTORICAL');
need(Orbit.q.recibosEsperadosDe(policy.clienteId).length===0,'R8_CANCEL_CURRENT_RECEIPTS_VISIBLE');
need(Orbit.receiptsPortfolioProjection.portfolioSummary(policy.clienteId).active.length===0,'R8_CANCEL_ACTIVE_PORTFOLIO_VISIBLE');
vm.runInThisContext(fs.readFileSync('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js','utf8'),{filename:'cobros-closure.js'});
need(Orbit.cobrosCarteraProjectionAdapter.portfolioRows('').length===0,'R8_CANCEL_GLOBAL_PORTFOLIO_VISIBLE');
console.log(JSON.stringify({schema:'GRAVICENTRA_B3_004_R8_CANCELLED_POLICY_SYNTHETIC_READMODEL_V1',status:'PASS',expectedReceipts:rr.expected,annulled:rr.annulled.length,portfolioClosed:pr.closed.length,paidHistoryPreserved:true,currentOperationalReceipts:0,activePortfolio:0,writes:'IN_MEMORY_SYNTHETIC_ONLY'}));
