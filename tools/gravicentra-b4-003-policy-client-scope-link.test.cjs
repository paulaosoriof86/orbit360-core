'use strict';
// Synthetic read-model regression: no Firebase, browser auth, or writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('orbit360-platform/modules/policy-receipts-v1199-detail-guard.js','utf8');
const element=()=>({innerHTML:'',style:{},classList:{add(){}},appendChild(){},addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}});
const host=element(),document={head:element(),body:element(),getElementById(){return null;},createElement:element,addEventListener(){},querySelectorAll(){return [];}};
const policy={id:'p1',clienteId:'c1',numero:'P-001',estado:'Vigente',pais:'CO',moneda:'COP',ramo:'Vida',producto:'Individual',primaNeta:100,primaTotal:120,vigenciaInicio:'2026-01-01',vigenciaFin:'2027-01-01',asesorId:'a1',aseguradoraId:'i1',asesorNombreVerificado:'Asesora autorizada',aseguradoraNombreVerificado:'Aseguradora autorizada'};
const client={id:'c1',tenantId:'test-tenant',nombre:'Cliente permitido',pais:'CO'};
const data={polizas:[policy],clientes:[client],vehiculos:[],recibosEsperados:[],cobros:[],comisiones:[],asesores:[],aseguradoras:[]};
let allowClient=true,clientConfirmed=true,policyConfirmed=true,vehicleConfirmed=true,deniedCollection='',activeRole='Asesor';
const requestedCollections=[];
const store={
 get:(collection,id)=>(data[collection]||[]).find(row=>row.id===id)||null,
 all:collection=>data[collection]||[],
 _productStatus:()=>({
  serverConfirmedCollections:[...(policyConfirmed?['polizas']:[]),...(clientConfirmed?['clientes']:[]),...(vehicleConfirmed?['vehiculos']:[]),'recibosEsperados'],
  deniedCollections:deniedCollection?[deniedCollection]:[],snapshotErrors:{}
 }),
 _ensureCollections(names){requestedCollections.push(names);},
 insert(){throw Error('WRITE_DENIED');},update(){throw Error('WRITE_DENIED');},remove(){throw Error('WRITE_DENIED');}
};
let legacyRenderCalls=0;
const ctx={console,document,location:{hash:''},setTimeout:fn=>{fn();return 1;},clearTimeout(){},encodeURIComponent};
ctx.window=ctx;ctx.addEventListener=()=>{};
ctx.Orbit={
 store,
 access:{activeRole:()=>activeRole,canView:(collection,row,moduleKey)=>collection==='clientes'&&row.id==='c1'&&moduleKey==='cliente360'&&allowClient},
 ui:{esc:s=>String(s),money:(v,c)=>`${c} ${v}`,fmtDate:s=>String(s),estadoBadge:s=>`<span>${s}</span>`},
 route:{params:{c:'c1',p:'p1'}},
 modules:{cliente360:{render(){legacyRenderCalls++;},verPoliza(){},verVehiculo(){}},cobros:{}},
 q:{}
};
vm.runInNewContext(source,ctx,{filename:'policy-receipts-v1199-detail-guard.js'});
const render=()=>ctx.Orbit.modules.cliente360.render(host);
const clientUrl='href="#/cliente360?c=c1&t=polizas"';
render();
assert.match(host.innerHTML,/data-policy-fullpage="1"/);
assert.ok(requestedCollections.some(names=>names.includes('polizas')&&!names.includes('aseguradoras')&&!names.includes('asesores')),
 'Asesor policy detail must not request confidential insurer or Equipo directories');
requestedCollections.length=0;activeRole='Operativo';render();
assert.ok(requestedCollections.some(names=>names.includes('aseguradoras')&&!names.includes('asesores')),
 'Operativo may request insurer directory but not sensitive Equipo');
requestedCollections.length=0;activeRole='Dirección';render();
assert.ok(requestedCollections.some(names=>names.includes('aseguradoras')&&names.includes('asesores')),
 'Dirección retains both fully authorized directory reads');
activeRole='Asesor';
assert.match(host.innerHTML,/Aseguradora autorizada/,'full-page policy detail uses scoped verified insurer label when directory denied');
assert.match(host.innerHTML,/P-001 · Aseguradora autorizada ·/,'policy hero must show the same verified insurer as the body, not a false pending label');
assert.doesNotMatch(host.innerHTML,/P-001 · Aseguradora pendiente ·/,'hero must not regress to an unverified directory-only name');
assert.match(host.innerHTML,/Asesora autorizada/,'full-page policy detail uses scoped verified adviser label when directory denied');
assert.doesNotMatch(host.innerHTML,/SECRETO|NO_REVELAR/,'public labels must not reveal unrelated directory fields');
assert.match(host.innerHTML,/Abrir ficha del cliente/);
assert.ok(host.innerHTML.includes(clientUrl),'authorized client link preserved');
assert.ok(!host.innerHTML.includes('data-policy-client-scope-note="1"'));
data.clientes=[];
clientConfirmed=false;
render();
assert.match(host.innerHTML,/data-policy-detail-loading="client"/,'unconfirmed client read must remain loading');
assert.doesNotMatch(host.innerHTML,/data-policy-client-scope-note="1"/,'loading must not be called inaccessible');
clientConfirmed=true;
render();
assert.match(host.innerHTML,/data-policy-fullpage="1"/,'policy stays readable');
assert.match(host.innerHTML,/data-policy-client-scope-note="1"/,'confirmed missing client explained');
assert.match(host.innerHTML,/data-policy-client-unavailable="1"/);
assert.ok(host.innerHTML.includes('href="#/polizas"'),'navigation returns to authorized policies');
assert.ok(!host.innerHTML.includes(clientUrl),'no dead client link');
data.clientes=[client];
allowClient=false;
render();
assert.match(host.innerHTML,/data-policy-client-scope-note="1"/,'role-scoped client explained');
assert.ok(!host.innerHTML.includes(clientUrl),'no cross-role deep link');
allowClient=true;
render();
assert.ok(host.innerHTML.includes(clientUrl),'client link restored when authorization allows');
assert.ok(!host.innerHTML.includes('data-policy-client-scope-note="1"'));
data.vehiculos=[{id:'v1',clienteId:'c1',polizaId:'p1',marca:'Vehículo de prueba'}];
ctx.Orbit.route.params={c:'c1',v:'v1'};
render();
assert.match(host.innerHTML,/data-vehicle-fullpage="1"/);
assert.ok(host.innerHTML.includes('href="#/cliente360?c=c1&t=vehiculos"'));
data.clientes=[];
clientConfirmed=false;
render();
assert.match(host.innerHTML,/data-vehicle-detail-loading="client"/,'vehicle must await client read');
clientConfirmed=true;
render();
assert.match(host.innerHTML,/data-vehicle-fullpage="1"/,'vehicle remains accessible');
assert.match(host.innerHTML,/data-vehicle-client-unavailable="1"/);
assert.ok(!host.innerHTML.includes('href="#/cliente360?c=c1&t=vehiculos"'));
assert.ok(host.innerHTML.includes('href="#/polizas"'));
data.clientes=[client];
allowClient=false;
render();
assert.match(host.innerHTML,/data-vehicle-client-unavailable="1"/,'foreign-role client cannot be linked');
assert.ok(!host.innerHTML.includes('href="#/cliente360?c=c1&t=vehiculos"'));
allowClient=true;
render();
assert.ok(host.innerHTML.includes('href="#/cliente360?c=c1&t=vehiculos"'));

// Real cold-route regression: never route a policy/vehicle deep-link into the
// Cliente 360 client loader while its own protected collection is hydrating.
const baselineLegacyCalls=legacyRenderCalls;
data.vehiculos=[]; vehicleConfirmed=false;
ctx.Orbit.route.params={c:'c1',v:'v1'};
render();
assert.match(host.innerHTML,/data-direct-detail-loading="vehicle"/);
assert.equal(legacyRenderCalls,baselineLegacyCalls,'no fallback to client render on cold vehicle URL');
vehicleConfirmed=true;
render();
assert.match(host.innerHTML,/data-direct-detail-unavailable="vehicle"/,'missing/unauthorized vehicle fails closed');
assert.equal(legacyRenderCalls,baselineLegacyCalls);
data.vehiculos=[{id:'v1',clienteId:'c1',polizaId:'p1',marca:'Vehículo de prueba'}];
render();
assert.match(host.innerHTML,/data-vehicle-fullpage="1"/,'vehicle detail recovers on protected hydration');
deniedCollection='vehiculos';
render();
assert.match(host.innerHTML,/data-direct-detail-unavailable="vehicle"/,'server-denied vehicle must not render cached detail');
deniedCollection='';

ctx.Orbit.route.params={c:'c1',p:'p1'};
data.polizas=[];policyConfirmed=false;
render();
assert.match(host.innerHTML,/data-direct-detail-loading="policy"/);
assert.equal(legacyRenderCalls,baselineLegacyCalls,'no fallback to client render on cold policy URL');
policyConfirmed=true;
render();
assert.match(host.innerHTML,/data-direct-detail-unavailable="policy"/,'missing policy fails closed');
data.polizas=[policy];data.clientes=[];clientConfirmed=true;
render();
assert.match(host.innerHTML,/data-policy-fullpage="1"/,'authorized policy recovers without readable client');
assert.match(host.innerHTML,/data-policy-client-unavailable="1"/,'client link remains denied after cold route');
deniedCollection='polizas';
render();
assert.match(host.innerHTML,/data-direct-detail-unavailable="policy"/,'server-denied policy must not render cached detail');
deniedCollection='';
assert.equal(legacyRenderCalls,baselineLegacyCalls);
ctx.Orbit.route.params={};
render();
assert.equal(legacyRenderCalls,baselineLegacyCalls+1,'ordinary Cliente360 route keeps original owner');
console.log('B4_003_POLICY_VEHICLE_CLIENT_LINK_SCOPED_REGRESSION_PASS baselineCases=19 scopedNames=PASS roleBoundDirectory=PASS synthetic_only no_Firebase_no_writes');


