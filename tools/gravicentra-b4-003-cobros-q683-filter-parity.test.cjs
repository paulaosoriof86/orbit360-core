'use strict';
// I6.5/B4-003 — the authenticated Chrome failure, reproduced in memory.
// The real Cobros module is rendered with the real queries/calendar utility.
// No network, Firebase, browser credentials or business writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const priorTimezone=process.env.TZ;
process.env.TZ='America/Guatemala';
let checks=0;
const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const rows={
  clientes:[
    {id:'qa-client-gt',nombre:'B4-003 QA Cliente',pais:'GT',moneda:'GTQ'},
    {id:'qa-client-co',nombre:'B4-003 QA Colombia',pais:'CO',moneda:'COP'}
  ],
  polizas:[
    {id:'qa-policy-gt',clienteId:'qa-client-gt',numero:'B4-003-RENEWWRITE-Q683',pais:'GT',moneda:'GTQ',estado:'Vigente',primaTotal:683.20,asesorId:'qa-asesor'},
    {id:'qa-policy-co',clienteId:'qa-client-co',numero:'B4-003-QA-COP',pais:'CO',moneda:'COP',estado:'Vigente',primaTotal:1000,asesorId:'qa-asesor'}
  ],
  recibosEsperados:[
    {id:'receipt-q683',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',estadoOperativo:'futuro_pendiente',cuota:'1/1',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:683.20},
    {id:'receipt-cop',clienteId:'qa-client-co',polizaId:'qa-policy-co',pais:'CO',moneda:'COP',estado:'Pendiente',estadoOperativo:'futuro_pendiente',cuota:'1/1',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:1000},
    {id:'receipt-paid',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pagado',estadoOperativo:'futuro_pendiente',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:42.20},
    {id:'receipt-reported',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',estadoOperativo:'pago_reportado',vence:'2026-10-11',fechaLimite:'2026-10-26',monto:30},
    {id:'receipt-invalid',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',estadoOperativo:'futuro_pendiente',vence:'',fechaLimite:'2026-02-30',monto:12.20},
    {id:'receipt-fallback',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',estadoOperativo:'futuro_pendiente',vence:'2026-10-11',fechaLimite:'bad',fechaVencimiento:'2026-10-27',monto:17.30}
  ],
  carteraPrimas:[
    {id:'portfolio-q683',reciboId:'receipt-q683',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',estadoOperativo:'futuro_pendiente',exigibilidad:'futura',carteraActiva:true,vence:'2026-10-11',fechaLimite:'2026-10-26',monto:683.20},
    {id:'portfolio-cop',reciboId:'receipt-cop',clienteId:'qa-client-co',polizaId:'qa-policy-co',pais:'CO',moneda:'COP',estado:'Pendiente',estadoOperativo:'futuro_pendiente',carteraActiva:true,vence:'2026-10-11',fechaLimite:'2026-10-26',monto:1000},
    {id:'portfolio-paid',reciboId:'receipt-paid',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:true,fechaLimite:'2026-10-26',monto:42.20},
    {id:'portfolio-reported',reciboId:'receipt-reported',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:true,fechaLimite:'2026-10-26',monto:30},
    {id:'portfolio-invalid',reciboId:'receipt-invalid',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:true,vence:'',fechaLimite:'2026-02-30',monto:12.20},
    {id:'portfolio-fallback',reciboId:'receipt-fallback',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',estado:'Pendiente',carteraActiva:true,vence:'2026-10-11',fechaLimite:'bad',fechaVencimiento:'2026-10-27',monto:17.30}
  ],
  cobros:[],comisiones:[],asesores:[],vehiculos:[],aseguradoras:[]
};
const noWrites=()=>{throw Error('FORBIDDEN_BUSINESS_WRITE');};
const store={
  all:k=>rows[k]||[],
  get:(k,id)=>(rows[k]||[]).find(r=>r.id===id)||null,
  where:(k,p)=>(rows[k]||[]).filter(p),
  find:(k,p)=>(rows[k]||[]).find(p)||null,
  insert:noWrites,update:noWrites,delete:noWrites,
  _ensureCollections:()=>{},
  _productStatus:()=>({tenantId:'alianzas-soluciones',serverConfirmedCollections:Object.keys(rows)})
};
const callbacks=new Map();
const host={innerHTML:'',querySelectorAll(selector){
  if(selector!=='[data-cobros-state-value]')return [];
  return ['', 'Vencido', 'Pendiente', 'Requiere validación'].map(value=>({
    getAttribute:name=>name==='data-cobros-state-value'?value:null,
    addEventListener:(name,handler)=>{if(name==='click')callbacks.set(value,handler);}
  }));
}};
const overlays=[];
const document={
  getElementById:id=>id==='host'?host:null,addEventListener:()=>{},querySelectorAll:()=>[],
  createElement:()=>({style:{},innerHTML:'',setAttribute:()=>{},querySelector:()=>({onclick:null}),remove:()=>{}}),
  body:{appendChild:element=>overlays.push(element)}
};
const Orbit={
  store,modules:{},pais:'TODOS',tenant:{demoDate:'2026-10-26',get:()=>({tenantId:'alianzas-soluciones'})},
  route:{params:{}},session:{rol:()=> 'direccion',asesorId:()=> ''},
  auth:{productUser:{uid:'qa-direction',tenantId:'alianzas-soluciones'},user:()=>({uid:'qa-direction',tenantId:'alianzas-soluciones'})},
  access:{canView:()=>true},
  kit:{
    asesorOptions:()=>[],bannerFor:()=>'',
    kpis:()=>'',filterBar:()=>'',wireFilters:()=>{},
    clienteCell:id=>'<span>'+id+'</span>'
  }
};
const window={Orbit,addEventListener:()=>{}};
const context=vm.createContext({window,Orbit,document,location:{hostname:'preview--q683.web.app',hash:'#/cobros'},
  console,Date,Map,Set,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}});
const run=file=>vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file,timeout:5000});
const render=()=>{Orbit.modules.cobros.render(host);return host.innerHTML;};
const row=id=>host.innerHTML.match(new RegExp('<tr[^>]*data-portfolio-receipt="'+id+'"[^>]*>[\\s\\S]*?<\\/tr>'))?.[0]||'';
const filter=value=>{const fn=callbacks.get(value);assert.ok(fn,'Filter handler missing: '+value);fn({preventDefault:()=>{},stopPropagation:()=>{}});return host.innerHTML;};
try{
  run('orbit360-platform/core/ui.js');
  run('orbit360-platform/core/queries.js');
  run('orbit360-platform/modules/cobros-cartera-i65-closure-bridge.js');
  run('orbit360-platform/modules/cobros.js');
  render();
  eq(row('receipt-q683').includes('Q 683.20'),true,'Q683.20 cents visible in global transactional line');
  eq(row('receipt-q683').includes('26 oct 2026'),true,'Global due column uses effective limit');
  eq(row('receipt-q683').includes('11 oct 2026'),false,'Scheduled installment is not substituted as limit');
  eq(row('receipt-q683').includes('>Pendiente<'),true,'Still within limit on 26 October');
  eq(row('receipt-q683').includes('>Vencido<'),false,'A day is not overdue until the next calendar day');
  eq(row('receipt-paid'),'', 'A paid expected receipt cannot become an open portfolio projection');
  eq(row('receipt-reported'),'', 'Reported payment is not falsely projected as ordinary pending receipt');
  eq(row('receipt-invalid').includes('>Requiere validación<'),true,'Unknown date fails closed, not future');
  eq(row('receipt-fallback').includes('27 oct 2026'),true,'Invalid fechaLimite falls back to valid fechaVencimiento');
  filter('Vencido');
  eq(row('receipt-q683'),'', 'Vencido filter excludes limit-day obligation');
  filter('');
  Orbit.tenant.demoDate='2026-10-27';render();
  eq(row('receipt-q683').includes('>Vencido<'),true,'One civil day past limit is overdue despite stale flag');
  eq(row('receipt-q683').includes('Q 683.20'),true,'One day past limit keeps exact cents');
  eq(row('receipt-fallback').includes('>Pendiente<'),true,'Fallback due today is still within limit');
  filter('Vencido');
  eq(row('receipt-q683').includes('>Vencido<'),true,'Vencido filter includes Q683.20 in global Cobros');
  eq(row('receipt-fallback'),'', 'Vencido filter excludes fallback due today');
  filter('Pendiente');
  eq(row('receipt-q683'),'', 'Pendiente filter excludes already overdue Q683.20');
  eq(row('receipt-fallback').includes('>Pendiente<'),true,'Pending filter keeps due-today fallback');
  filter('');
  Orbit.tenant.demoDate='2026-10-28';render();
  eq(row('receipt-q683').includes('>Vencido<'),true,'Two civil days after limit stays overdue');
  eq(row('receipt-fallback').includes('>Vencido<'),true,'Fallback becomes overdue the next day');
  eq(row('receipt-cop').includes('$ 1,000'),true,'COP remains a separate whole-unit transaction');
  eq(row('receipt-cop').includes('Q 1,000'),false,'COP is not relabeled GTQ');
  Orbit.pais='GT';render();
  eq(row('receipt-q683').includes('Q 683.20'),true,'GT filter retains the target obligation');
  eq(row('receipt-cop'),'', 'GT filter excludes CO obligations');
  Orbit.pais='CO';render();
  eq(row('receipt-q683'),'', 'CO filter excludes GT obligation');
  eq(row('receipt-cop').includes('$ 1,000'),true,'CO filter keeps COP');
  Orbit.pais='TODOS';
  Orbit.modules.cobros.kpi('overdue');
  const overdueKpi=overlays.at(-1)?.innerHTML||'';
  eq(overdueKpi.includes('Q 683.20'),true,'Overdue KPI drilldown keeps exact Q683.20');
  eq(overdueKpi.includes('26 oct 2026'),true,'Overdue KPI drilldown uses the effective limit');
  eq(overdueKpi.includes('11 oct 2026'),false,'Overdue KPI drilldown does not substitute scheduled installment');
  rows.carteraPrimas[0].carteraActiva=false;render();
  eq(row('receipt-q683'),'', 'Inactive portfolio never becomes debt');
  rows.carteraPrimas[0].carteraActiva=true;
  rows.carteraPrimas[0].pais='CO';render();
  eq(row('receipt-q683'),'', 'Contradictory source country is excluded');
  rows.carteraPrimas[0].pais='GT';
  rows.recibosEsperados[0].estadoOperativo='requiere_validacion_estado';render();
  eq(row('receipt-q683').includes('>Requiere validación<'),true,'Explicit validation block keeps precedence');
  rows.recibosEsperados[0].estadoOperativo='futuro_pendiente';
  rows.cobros.push({id:'confirmed-q683',reciboId:'receipt-q683',clienteId:'qa-client-gt',polizaId:'qa-policy-gt',pais:'GT',moneda:'GTQ',monto:683.20,estado:'Pagado',paymentState:'PAID_DIRECT',conciliado:true});render();
  eq(row('receipt-q683'),'', 'Applied payment removes open portfolio projection');
  eq(host.innerHTML.includes('Q 683.20'),true,'Paid row keeps cents in global Cobros');
  console.log('GI_B4_003_COBROS_Q683_FILTER_PARITY_SYNTHETIC_PASS checks='+checks+' no_network no_business_writes');
}finally{
  if(priorTimezone===undefined)delete process.env.TZ;else process.env.TZ=priorTimezone;
}
