'use strict';
// I6.5/B4-003 — isolated calendar / portfolio parity. No network or writes.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const originalTimezone=process.env.TZ;
process.env.TZ='America/Guatemala';
let clock='2026-10-26T18:00:00-06:00', checks=0;
const eq=(actual,expected,reason)=>{assert.equal(actual,expected,reason);checks++;};
class ClockDate extends Date {
  constructor(...args){super(...(args.length?args:[clock]));}
  static now(){return new Date(clock).getTime();}
}
const rows={
  clientes:[{id:'qa-client-GT',pais:'GT',moneda:'GTQ',nombre:'Cliente QA'}],
  polizas:[
    {id:'qa-policy-GT',clienteId:'qa-client-GT',pais:'GT',moneda:'GTQ',estado:'Vigente',cuotas:1,primaTotal:683.20},
    {id:'qa-policy-COP',clienteId:'qa-client-GT',pais:'GT',moneda:'COP',estado:'Vigente',cuotas:1,primaTotal:1000}
  ],
  recibosEsperados:[
    {id:'qa-receipt-683',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',serie:'1/1',estado:'Pendiente',estadoOperativo:'futuro_pendiente',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:683.20},
    {id:'qa-receipt-COP',polizaId:'qa-policy-COP',clienteId:'qa-client-GT',moneda:'COP',serie:'1/1',estado:'Pendiente',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:1000},
    {id:'qa-receipt-paid',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',serie:'1/1',estado:'Pagado',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:50},
    {id:'qa-receipt-reported',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',serie:'1/1',estado:'Pendiente',estadoOperativo:'pago_reportado',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:30}
  ],
  carteraPrimas:[
    {id:'qa-car-683',reciboId:'qa-receipt-683',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',estado:'Pendiente',estadoOperativo:'futuro_pendiente',exigibilidad:'futura',carteraActiva:true,vence:'2026-10-11',fechaLimite:'2026-10-26',monto:683.20},
    {id:'qa-car-COP',reciboId:'qa-receipt-COP',polizaId:'qa-policy-COP',clienteId:'qa-client-GT',moneda:'COP',estado:'Pendiente',exigibilidad:'futura',carteraActiva:true,vence:'2026-10-11',fechaLimite:'2026-10-26',monto:1000},
    {id:'qa-car-paid',reciboId:'qa-receipt-paid',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',estado:'Pagado',carteraActiva:true,fechaLimite:'2026-10-26',monto:50},
    {id:'qa-car-inactive',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:false,fechaLimite:'2026-10-26',monto:800},
    {id:'qa-car-undated',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:true,fechaLimite:'fecha-invalida',monto:40},
    {id:'qa-car-historical',polizaId:'qa-policy-GT',clienteId:'qa-client-GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:true,historicalExigible:true,fechaLimite:'2026-10-26',monto:20}
  ],
  cobros:[],comisiones:[],asesores:[],vehiculos:[],aseguradoras:[]
};
const store={
  __productReadOnlyP0:true,
  all:k=>rows[k]||[],
  get:(k,id)=>(rows[k]||[]).find(r=>r.id===id)||null,
  where:(k,p)=>(rows[k]||[]).filter(p),
  find:(k,p)=>(rows[k]||[]).find(p)||null,
  _productStatus:()=>({tenantId:'alianzas-soluciones',serverConfirmedCollections:Object.keys(rows)})
};
const body={innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},querySelector:()=>null,querySelectorAll:()=>[]};
const document={getElementById:id=>id==='c360-body'?body:null,addEventListener:()=>{},querySelectorAll:()=>[]};
const Orbit={store,pais:'GT',tenant:{},route:{params:{c:'qa-client-GT'}},auth:{productUser:{tenantId:'alianzas-soluciones'}},
  tenantCanonicalPathsP0:{dataCollectionPath:(t,c)=>'tenants/'+t+'/data/'+c+'/items'},
  modules:{cliente360:{render:()=>true},polizas:{verDesglose:()=>true}}};
const window={Orbit,addEventListener:()=>{}};
const context=vm.createContext({Orbit,window,document,location:{hash:'#/cliente360'},Date:ClockDate,Map,Set,
  console,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}});
const run=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:3000});
try {
  run('orbit360-platform/core/ui.js');
  eq(Orbit.ui.today(),'2026-10-26','The current local calendar date does not roll at UTC midnight');
  eq(Orbit.ui.daysFromNow('2026-10-26'),0,'At 18:00 the due date remains today');
  eq(Orbit.ui.daysFromNow('2026-02-30'),null,'Invalid calendar date is rejected');
  eq(Orbit.ui.daysFromNow('invalid'),null,'Invalid date is not future');
  eq(Orbit.ui.daysFromNow('2026-10-26T23:30:00Z'),0,'A timestamp uses its local calendar day');
  clock='2026-10-27T00:00:00-06:00';
  eq(Orbit.ui.today(),'2026-10-27','Open session updates its calendar day at midnight');
  eq(Orbit.ui.daysFromNow('2026-10-26'),-1,'Calendar aging advances without reloading the app');
  clock='2026-10-28T12:00:00-06:00';
  eq(Orbit.ui.daysFromNow('2026-10-26'),-2,'Two calendar days after limit');
  Orbit.tenant.demoDate='2026-10-26';
  eq(Orbit.ui.daysFromNow('2026-10-26'),0,'Approved fixed QA anchor remains available');
  delete Orbit.tenant.demoDate;
  run('orbit360-platform/core/queries.js');
  run('orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js');
  const q=Orbit.q,p=Orbit.receiptsPortfolioProjection,main=rows.carteraPrimas[0],rec=rows.recibosEsperados[0];
  eq(q.portfolioDue(main),'2026-10-26','Effective date is fechaLimite, not vence');
  eq(main.vence,'2026-10-11','Contractual installment date remains untouched');
  eq(main.fechaLimite,'2026-10-26','Existing limit remains untouched');
  Orbit.tenant.demoDate='2026-10-26';
  eq(q.portfolioClassification(main).overdue,false,'Q683.20 is not exigible during the limit date');
  eq(p.isFuture(main),true,'Future projection is consistent on the limit date');
  Orbit.tenant.demoDate='2026-10-27';
  eq(q.portfolioClassification(main).daysOverdue,1,'Q683.20 has one exigible calendar day');
  eq(q.expectedReceiptIsOverdue(rec),true,'Expected receipt uses the same effective limit');
  eq(p.isFuture(main),false,'Stale future flags do not overrule the due date');
  eq(p.stateLabel(rec,{}).t,'Vencido','Visible receipt state uses canonical classification');
  eq(p.portfolioSummary('qa-client-GT').dueByCurrency.GTQ,683.20,'GTQ amount is preserved to cents');
  eq(p.portfolioSummary('qa-client-GT').dueByCurrency.COP,1000,'COP is a separate amount');
  eq(p.portfolioSummary('qa-client-GT').dueAmount,null,'Mixed currencies have no additive scalar');
  eq(p.portfolioSummary('qa-client-GT').undated.length,1,'Missing date is not silently treated as future');
  eq(p.portfolioSummary('qa-client-GT').active.length,3,'Paid, inactive and historical rows stay outside active portfolio');
  eq(q.portfolioClassification(rows.carteraPrimas[2]).open,false,'Paid obligation is closed');
  eq(q.portfolioClassification({...rows.carteraPrimas[2],estadoCartera:'futuro_pendiente'}).open,false,'A stale cartera state cannot mask confirmed payment');
  eq(q.portfolioClassification(rows.carteraPrimas[3]).open,false,'Inactive obligation is excluded');
  eq(q.portfolioClassification(rows.carteraPrimas[4]).unknownDate,true,'Unknown date requires review');
  p.renderReceipts('qa-client-GT');
  eq(body.innerHTML.includes('Q 683.20 GTQ'),true,'Receipt presentation preserves exact GTQ cents');
  eq(body.innerHTML.includes('$ 1,000.00 COP'),true,'Receipt presentation separates COP');
  eq(body.innerHTML.includes('Q 1,683.20'),false,'No sum of distinct currencies');
  eq(body.innerHTML.includes('Vencimiento de cuota'),true,'Scheduled due date is visibly distinct');
  eq(body.innerHTML.includes('Fecha límite'),true,'Effective limit has its own label');
  eq(body.innerHTML.includes('data-rp-unknown-date="1"'),true,'Undated obligations are disclosed');
  eq(p.stateLabel(rows.recibosEsperados[3],{}).t,'Origen de pago por confirmar','Reported payment is not confirmed');
  const fallback={carteraActiva:true,estado:'Pendiente',fechaLimite:'2026-02-30',fechaVencimiento:'2026-10-27',vence:'2026-10-11'};
  eq(q.portfolioDue(fallback),'2026-10-27','Invalid first choice falls back to a valid fechaVencimiento');
  eq(q.portfolioClassification(fallback).overdue,false,'Fallback is not overdue on its limit day');
  Orbit.tenant.demoDate='2026-10-28';
  eq(q.portfolioClassification(main).daysOverdue,2,'Q683.20 has two exigible calendar days');
  eq(q.portfolioClassification(fallback).daysOverdue,1,'Fallback aging uses the actual valid date');
  const lastFallback={carteraActiva:true,estado:'Pendiente',fechaLimite:'bad',fechaVencimiento:'',vence:'2026-10-11'};
  eq(q.portfolioDue(lastFallback),'2026-10-11','Last fallback preserves installment date');
  const collision={carteraActiva:true,estado:'Pendiente',fechaLimite:'2026-10-26',moneda:'COP',polizaId:'qa-policy-GT',monto:50};
  rows.carteraPrimas.push(collision);
  eq(p.portfolioSummary('qa-client-GT').dueByCurrency.SIN_MONEDA,undefined,'No unrelated client row without client ID included');
  collision.clienteId='qa-client-GT';
  eq(p.portfolioSummary('qa-client-GT').dueByCurrency.SIN_MONEDA,50,'Conflicting source currency is not silently relabelled');
  console.log('GI_B4_003_Q683_CALENDAR_PARITY_SYNTHETIC_PASS checks='+checks+' no_network no_business_writes');
} finally {
  if(originalTimezone===undefined)delete process.env.TZ;else process.env.TZ=originalTimezone;
}
