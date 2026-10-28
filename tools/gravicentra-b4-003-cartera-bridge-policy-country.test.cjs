'use strict';
// B4-003: policy-linked finance belongs to its verified policy country even
// when the client's present domicile differs. Synthetic, offline, read-only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js','utf8');
const data={
  clientes:[{id:'gt-client',pais:'GT'},{id:'co-client',pais:'CO'}],
  polizas:[{id:'co-cross',pais:'CO',clienteId:'gt-client'},{id:'co-normal',pais:'CO',clienteId:'co-client'}],
  carteraPrimas:[
    {id:'correct-cross',reciboId:'calendar-cross',polizaId:'co-cross',clienteId:'gt-client',pais:'CO',monto:700,fechaLimite:'2026-10-28',carteraActiva:true},
    {id:'correct-normal',polizaId:'co-normal',clienteId:'co-client',pais:'CO',monto:500,carteraActiva:true},
    {id:'missing-country-cross',polizaId:'co-cross',clienteId:'gt-client',monto:100,carteraActiva:true},
    {id:'forged-child-country',polizaId:'co-cross',clienteId:'gt-client',pais:'GT',monto:999,carteraActiva:true},
    {id:'wrong-parent-client',polizaId:'co-cross',clienteId:'co-client',pais:'CO',monto:999,carteraActiva:true},
    {id:'missing-parent',polizaId:'nonexistent',clienteId:'gt-client',pais:'GT',monto:999,carteraActiva:true},
    {id:'inactive',polizaId:'co-cross',clienteId:'gt-client',pais:'CO',monto:999,carteraActiva:false}
  ],
  cobros:[
    {id:'payment-cross',polizaId:'co-cross',clienteId:'gt-client',pais:'CO',monto:125},
    {id:'payment-forged',polizaId:'co-cross',clienteId:'gt-client',pais:'GT',monto:999}
  ],
  recibosEsperados:[
    {id:'calendar-cross',polizaId:'co-cross',clienteId:'gt-client',pais:'CO',estadoOperativo:'pendiente'},
    {id:'reported-cross',polizaId:'co-cross',clienteId:'gt-client',pais:'CO',estadoOperativo:'pago_reportado'},
    {id:'reported-forged',polizaId:'co-cross',clienteId:'co-client',pais:'CO',estadoOperativo:'pago_reportado'}
  ],
  vehiculos:[]
};
const store={
  all:col=>data[col]||[],
  _productStatus:()=>({serverConfirmedCollections:['clientes','polizas','recibosEsperados','carteraPrimas','cobros']})
};
const mod={render(){}};
const Orbit={modules:{cobros:mod},store,access:{canView:()=>true},pais:'CO'};
const context={window:{Orbit},Orbit};
vm.runInNewContext(source,context,{filename:'cobros-cartera-i65-closure-bridge.js'});
assert.ok(mod.__i65GlobalPortfolioAdapter,'BRIDGE_REGISTERED');
const adapter=mod.__i65GlobalPortfolioAdapter;
assert.equal(adapter.confirmed(),true,'ALL_REQUIRED_COLLECTIONS_CONFIRMED');
const ids=rows=>Array.from(rows,x=>x.id).sort();
assert.deepEqual(ids(adapter.portfolioRows('')),['correct-cross','correct-normal','missing-country-cross'],'POLICY_COUNTRY_PRESERVES_VALID_COP_WITH_GT_CLIENT_AND_DENIES_FORGED_RELATIONS');
assert.deepEqual(ids(adapter.cobroRows('')),['payment-cross'],'PAYMENT_CROSS_COUNTRY_POLICY_AUTHORIZED_ONLY');
assert.deepEqual(ids(adapter.reportedPaymentRows('')),['reported-cross'],'REPORTED_PAYMENT_VERIFIED_PARENT_ONLY');
assert.equal(adapter.snapshot('').ready,true,'SNAPSHOT_READY');

Orbit.pais='GT';
assert.deepEqual(ids(adapter.portfolioRows('')),[],'GT_FILTER_MUST_NOT_OBSERVE_CO_POLICY_WITH_GT_DOMICILE');
assert.deepEqual(ids(adapter.cobroRows('')),[],'GT_FILTER_MUST_NOT_OBSERVE_CO_PAYMENT');
assert.deepEqual(ids(adapter.reportedPaymentRows('')),[],'GT_FILTER_MUST_NOT_OBSERVE_CO_REPORTED');

Orbit.pais='TODOS';
assert.deepEqual(ids(adapter.portfolioRows('')),['correct-cross','correct-normal','missing-country-cross'],'ALL_COUNTRIES_STILL_REJECTS_FORGED_OR_UNVERIFIED_ROWS');
assert.deepEqual(ids(adapter.cobroRows('')),['payment-cross'],'ALL_COUNTRIES_STILL_REJECTS_FORGED_PAYMENT');

// Cronograma must consume the verified policy-country reader and must not
// silently re-filter a valid CO obligation by the client's GT domicile.
const renewal={id:'co-cross',clienteId:'gt-client',vigenciaFin:'2026-10-28',numero:'CO-REN-001'};
Orbit.ui={NOW:new Date('2026-10-28T12:00:00-06:00'),esc:value=>String(value)};
Orbit.kit={banner:()=>''};
Orbit.q={recibosEsperadosDe:()=>[],renovacionesProximas:()=>['CO','TODOS'].includes(Orbit.pais)?[renewal]:[]};
Orbit.modules.cliente360={verPoliza:()=>{}};
const calendarSource=fs.readFileSync('orbit360-platform/modules/cronograma.js','utf8');
vm.runInNewContext(calendarSource,context,{filename:'cronograma.js'});
function calendarHtml(country){
  Orbit.pais=country;
  const host={innerHTML:'',querySelector:()=>({addEventListener:()=>{}}),querySelectorAll:()=>[]};
  Orbit.modules.cronograma.render(host);
  return host.innerHTML;
}
const calendarCO=calendarHtml('CO');
assert.match(calendarCO,/Recibo pendiente/,'CO_POLICY_OBLIGATION_VISIBLE_WITH_GT_DOMICILE');
assert.match(calendarCO,/CO-REN-001/,'CO_POLICY_RENEWAL_VISIBLE_WITH_GT_DOMICILE');
const calendarGT=calendarHtml('GT');
assert.doesNotMatch(calendarGT,/Recibo pendiente/,'GT_CALENDAR_EXCLUDES_CO_OBLIGATION');
assert.doesNotMatch(calendarGT,/CO-REN-001/,'GT_CALENDAR_EXCLUDES_CO_RENEWAL');
console.log('GI_B4_003_CARTERA_BRIDGE_POLICY_COUNTRY_SYNTHETIC_PASS checks=14 offline no_business_writes');
