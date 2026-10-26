'use strict';
// I6.5/B4-003 — in-memory regression only; no network, Firebase or writes.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const rows = {
  clientes: [{id:'cGT',pais:'GT',moneda:'GTQ',nombre:'Cliente ficticio'}],
  polizas: [
    {id:'pCOP',clienteId:'cGT',pais:'GT',estado:'Vigente',moneda:'COP',primaTotal:900},
    {id:'pGT',clienteId:'cGT',pais:'GT',estado:'Vencida',moneda:'GTQ',primaTotal:150}
  ],
  recibosEsperados: [],
  carteraPrimas: [
    {id:'due1',polizaId:'pCOP',clienteId:'cGT',pais:'GT',moneda:'COP',monto:500,estado:'Pendiente',vence:'2026-01-01',carteraActiva:true,asesorId:'a1'},
    {id:'due2',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:75,estado:'Pendiente',vence:'2026-01-01',carteraActiva:true,asesorId:'a1'},
    {id:'dueUnverified',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',estado:'Pendiente',vence:'2026-01-01',carteraActiva:true,asesorId:'a1'},
    {id:'archived',polizaId:'pGT',clienteId:'cGT',pais:'GT',moneda:'GTQ',monto:1000,estado:'Pendiente',vence:'2026-01-01',carteraActiva:false,asesorId:'a1'}
  ],
  cobros: [{id:'pay1',clienteId:'cGT',polizaId:'pCOP',pais:'GT',moneda:'COP',monto:300,estado:'Pagado'}],
  comisiones: [{id:'com1',clienteId:'cGT',moneda:'COP',monto:30}],
  asesores: [], vehiculos: []
};
const store = {
  all: k => rows[k] || [],
  get: (k,id) => (rows[k]||[]).find(x => x.id === id) || null,
  where: (k,f) => (rows[k]||[]).filter(f),
  find: (k,f) => (rows[k]||[]).find(f) || null,
  _productStatus: () => ({serverConfirmedCollections:Object.keys(rows)})
};
const Orbit = {
  store,modules:{cobros:{render(){}}},pais:'GT',
  ui:{finiteNumber:v=>v==null||v===''?null:(Number.isFinite(Number(v))?Number(v):null),daysFromNow:()=>-1},
  access:{canView:(collection,row)=>row.asesorId==='a1'}
};
const context = vm.createContext({Orbit,window:{Orbit},console,Date,Map,Set});
vm.runInContext(fs.readFileSync('orbit360-platform/core/queries.js','utf8'),context,{filename:'queries.js'});

const summary=Orbit.q.clienteResumen('cGT');
const indexed=Orbit.q.clientesResumenIndex().get('cGT');
for(const candidate of [summary,indexed]){
  assert.equal(candidate.moneda,'GTQ','Client currency retained for identity only');
  assert.equal(candidate.porMoneda.primaAnual.COP,900,'Policy premium keeps policy currency');
  assert.equal(candidate.porMoneda.cobrado.COP,300,'Realized payment keeps source currency');
  assert.equal(candidate.porMoneda.vencido.COP,500);
  assert.equal(candidate.porMoneda.vencido.GTQ,75,'No sum of COP and GTQ in display breakdown');
  assert.equal(candidate.porMoneda.comisionGen.COP,30);
  assert.equal(candidate.carteraVencidaCount,3,'Unknown amount still means overdue obligation');
  assert.equal(candidate.carteraVencidaSinMonto,1,'Unknown amount is flagged, not declared paid');
}

vm.runInContext(fs.readFileSync('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js','utf8'),context,{filename:'cobros-bridge.js'});
const adapter=Orbit.cobrosCarteraProjectionAdapter;
assert.equal(adapter.portfolioRows('').length,3,'Expired policy obligation remains visible');
Orbit.access.canView=()=>false;
assert.equal(adapter.portfolioRows('').length,0,'Unauthorized scope is empty');
Orbit.access.canView=()=>{throw new Error('scope unavailable');};
assert.equal(adapter.portfolioRows('').length,0,'Authorization errors fail closed');
Orbit.access.canView=()=>true;
Orbit.pais='CO';
assert.equal(adapter.portfolioRows('').length,0,'Country does not leak');
Orbit.pais='GT';
rows.carteraPrimas[1].pais='CO';
assert.equal(adapter.portfolioRows('').length,2,'Contradictory linked country is excluded');
rows.carteraPrimas[1].pais='GT';
rows.carteraPrimas[0].carteraActiva=false;
assert.equal(adapter.portfolioRows('').length,2,'Inactive obligation excluded');
rows.cobros.push({id:'forgedCountryPayment',clienteId:'cGT',polizaId:'pCOP',pais:'CO',moneda:'COP',monto:10,estado:'Pagado'});
assert.deepEqual(Array.from(adapter.cobroRows(''),x=>x.id),['pay1'],'Payment country cannot override contrary parent country');
rows.recibosEsperados.push(
  {id:'reportAccepted',clienteId:'cGT',polizaId:'pGT',pais:'GT',estadoOperativo:'pago_reportado'},
  {id:'reportWrongCountry',clienteId:'cGT',polizaId:'pGT',pais:'CO',estadoOperativo:'pago_reportado'}
);
assert.deepEqual(Array.from(adapter.reportedPaymentRows(''),x=>x.id),['reportAccepted'],'Reported receipts must retain canonical parent country');
rows.carteraPrimas.push({id:'forgedClient',polizaId:'pGT',clienteId:'foreignClient',pais:'GT',estado:'Pendiente',carteraActiva:true});
assert.equal(adapter.portfolioRows('').length,2,'Conflicting explicit client binding is denied');
const formerAccess=Orbit.access;
delete Orbit.access;
assert.equal(adapter.portfolioRows('').length,0,'Missing authorization provider fails closed');
Orbit.access=formerAccess;

console.log('GI_B4_003_C360_COBROS_CURRENCY_OVERDUE_SYNTHETIC_PASS checks=26 active_only no_network no_business_writes');
