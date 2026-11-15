'use strict';
// Pure synthetic projections: no network, authentication, Firestore or cash writes.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,'orbit360-platform',p),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
  const payable=(id,asesorId,moneda,valor,ordinary)=>({id,asesorId,moneda,valor,pendiente:valor,pagado:0,tipo:'egreso',estado:'pendiente',pais:'GT',periodo:'2026-11',dia:15,
    clase:'Comisiones asesores',schemaVersion:'gravicentra-advisor-commission-payable-v1',beneficiario:'Persona de prueba',concepto:'CxP documental QA',comisionOrdinariaAcreditada:ordinary});
  return {finmovs:[payable('qa-gt','qa-alpha','GTQ',4114.87,5143.61),payable('qa-us','qa-alpha','USD',14.62,18.28),payable('qa-second','qa-beta','GTQ',27.05,38.64)],
    comisiones:[{id:'qa-c1',asesorId:'qa-alpha',clienteId:'qa-cl',polizaId:'qa-p1',aseguradoraId:'qa-ins',monto:5143.61,base:20000,pct:15,moneda:'GTQ',pais:'GT',estado:'Devengada',periodo:'2026-10'},
      {id:'qa-c2',asesorId:'qa-alpha',clienteId:'qa-cl',polizaId:'qa-p2',aseguradoraId:'qa-ins',monto:18.28,base:100,pct:15,moneda:'USD',pais:'GT',estado:'Devengada',periodo:'2026-10'},
      {id:'qa-c3',asesorId:'qa-beta',clienteId:'qa-cl',polizaId:'qa-p1',aseguradoraId:'qa-ins',monto:38.64,base:250,pct:15,moneda:'GTQ',pais:'GT',estado:'Devengada',periodo:'2026-10'}],
    facturas:[],polizas:[{id:'qa-p1',numero:'QA-1',clienteId:'qa-cl',asesorId:'qa-alpha',aseguradoraId:'qa-ins',moneda:'GTQ',pais:'GT',vigenciaInicio:'2026-11-01',primaNeta:20000},
      {id:'qa-p2',numero:'QA-2',clienteId:'qa-cl',asesorId:'qa-alpha',aseguradoraId:'qa-ins',moneda:'USD',pais:'GT',vigenciaInicio:'2026-11-01',primaNeta:100}],
    asesores:[{id:'qa-alpha',nombre:'Asesor Alfa'},{id:'qa-beta',nombre:'Asesor Beta'}],aseguradoras:[{id:'qa-ins',nombre:'Aseguradora de prueba',pais:'GT'}],clientes:[{id:'qa-cl',nombre:'Cliente de prueba',pais:'GT'}],cobros:[],metas:[],presupuesto:[]};
}
function harness(data=fixture(),country='GT'){
  let writes=0;const nodes=new Map(),toasts=[];
  const node=()=>({innerHTML:'',style:{},listeners:{},children:new Map(),addEventListener(name,fn){this.listeners[name]=fn;},querySelector(selector){if(!this.children.has(selector))this.children.set(selector,node());return this.children.get(selector);},querySelectorAll(){return[];},remove(){}});
  const document={body:{appendChild:n=>{if(n.id)nodes.set(n.id,n);}},getElementById:id=>nodes.get(id)||null,createElement:node,addEventListener(){}};
  const store={all:k=>data[k]||[],get:(k,id)=>(data[k]||[]).find(x=>x.id===id),where:(k,fn)=>(data[k]||[]).filter(fn),
    insert(){writes++;throw Error('WRITE_FORBIDDEN');},update(){writes++;throw Error('WRITE_FORBIDDEN');},remove(){writes++;throw Error('WRITE_FORBIDDEN');}};
  // The real legacy U.money rounds to integer units. Projections must bypass it.
  const money=(n,cur)=>cur+' '+Math.round(Number(n));
  const U={NOW:'2026-11-15T12:00:00Z',finiteNumber:v=>v==null||v===''||!Number.isFinite(Number(v))?null:Number(v),money,moneyShort:money,esc:v=>String(v??''),
    today:()=> '2026-11-15',now:()=>new Date('2026-11-15T12:00:00Z'),avatar:()=>'',fmtDate:v=>v,daysFromNow:()=>0,toast:message=>toasts.push(message)};
  const Orbit={store,ui:U,modules:{},pais:country,tenant:{get:()=>({})},session:{rol:()=> 'Dirección'},auth:{user:()=>({rol:'Dirección'})},kit:{kpis:items=>'<kpis>'+JSON.stringify(items)+'</kpis>',bannerFor:()=>'',banner:()=>''},PAISES:[{id:'GT',label:'GT'},{id:'TODOS',label:'Todos'}]};
  const scope=vm.createContext({Orbit,window:{Orbit},document,console,location:{},setInterval(){},setTimeout(){},clearTimeout(){},CustomEvent:function(){}});
  vm.runInContext(read('core/queries.js'),scope);
  let finance=read('modules/finanzas.js');
  finance=finance.replace('  return { render, toggleEstado, lote,','  return { __currencyTest:{movimientos,cxcp,empresa,dashboard,serie,comisionAsesor,moneyBuckets,buckets,drillModal,detLiq,presupuesto,ia,wire,asesores,liquidacionTabla}, render, toggleEstado, lote,');
  vm.runInContext(finance,scope);
  vm.runInContext(read('modules/comisiones.js'),scope);
  Orbit.comeng={conciliarStatement:()=>({rows:data.comisiones.map(c=>({comId:c.id,polizaId:c.polizaId,ref:c.polizaId,base:c.base,esperado:c.monto-1,pagado:c.monto,desv:1,pct:1,periodo:c.periodo})),n:data.comisiones.length,conDesviacion:data.comisiones.length})};
  return {Orbit,finance:Orbit.modules.finanzas.__currencyTest,nodes,node,toasts,get writes(){return writes;}};
}
function kpis(html){return [...html.matchAll(/<kpis>(.*?)<\/kpis>/gs)].flatMap(match=>JSON.parse(match[1]));}
test('native money buckets keep Q4114.87+Q27.05 apart from USD14.62 and never mutate their source',()=>{
  const data=fixture(),before=clone(data),h=harness(data),r=h.Orbit.q.financeCurrencyBuckets(data.finmovs);
  assert.deepEqual(clone(r.amounts),{GTQ:4141.92,USD:14.62});assert.equal(r.unverified,0);assert.deepEqual(data,before);assert.equal(h.writes,0);
});
test('buckets reject missing/invalid currency or amount instead of attributing them to GTQ or zero',()=>{
  const h=harness(),rows=[{valor:14.62},{valor:14.62,moneda:'EUR'},{valor:null,moneda:'USD'},{valor:NaN,moneda:'GTQ'},{valor:true,moneda:'COP'},{valor:'',moneda:'GTQ'}];
  const r=h.Orbit.q.financeCurrencyBuckets(rows);assert.deepEqual(clone(r.amounts),{});assert.equal(r.unverified,6);
});
test('native COP and USD values are independent of legacy norm and active country',()=>{
  for(const country of ['GT','CO','TODOS']){const h=harness(fixture(),country),r=h.Orbit.q.financeCurrencyBuckets([{moneda:'COP',valor:1000},{moneda:'USD',valor:14.62},{moneda:'GTQ',valor:27.05}]);
    assert.deepEqual(clone(r.amounts),{COP:1000,GTQ:27.05,USD:14.62});}
  assert.equal(harness(fixture(),'TODOS').Orbit.q.norm(1000,'COP'),1,'legacy API is deliberately unchanged');
});
test('cent-based native sums preserve zero, reversals and decimal precision within each currency',()=>{
  const h=harness(),r=h.Orbit.q.financeCurrencyBuckets([{moneda:'USD',valor:0.1},{moneda:'USD',valor:0.2},{moneda:'GTQ',valor:-27.05},{moneda:'GTQ',valor:27.05}]);
  assert.deepEqual(clone(r.amounts),{GTQ:0,USD:0.3});assert.equal(r.counts.GTQ,2);
});
test('CxP and net-position KPIs keep two native buckets and do not turn a commitment into paid cash',()=>{
  const h=harness(),cards=kpis(h.finance.cxcp());
  assert.equal(cards.find(c=>c.label==='Por pagar (CxP)').val,'GTQ 4141.92 · USD 14.62');
  assert.equal(cards.find(c=>c.label==='Posición neta').val,'GTQ -4141.92 · USD -14.62');
  assert.equal(h.writes,0);
});
test('CxC invoices and partial/zero CxP balances remain separate by currency',()=>{
  const data=fixture();data.facturas=[{id:'qa-inv-q',estado:'por_cobrar',pais:'GT',moneda:'GTQ',total:6000},{id:'qa-inv-us',estado:'por_cobrar',pais:'GT',moneda:'USD',total:30}];
  data.finmovs[0].pendiente=4000;data.finmovs[2].pendiente=0;
  const h=harness(data),cards=kpis(h.finance.cxcp());
  assert.equal(cards.find(c=>c.label==='Por pagar (CxP)').val,'GTQ 4000.00 · USD 14.62');
  assert.equal(cards.find(c=>c.label==='Posición neta').val,'GTQ 2000.00 · USD 15.38');assert.equal(h.writes,0);
});
test('invalid outgoing amount is not coerced into a one-unit net liability',()=>{
  const data=fixture();data.finmovs=[{...data.finmovs[0],valor:true,pendiente:true}];
  const h=harness(data),cards=kpis(h.finance.cxcp());
  assert.match(cards.find(c=>c.label==='Por pagar (CxP)').val,/sin moneda o valor verificado/);
  assert.match(cards.find(c=>c.label==='Posición neta').val,/sin moneda o valor verificado/);
  assert.doesNotMatch(cards.find(c=>c.label==='Posición neta').val,/-1\.00/);assert.equal(h.writes,0);
});
test('Movimientos KPIs and drilldown never report the false GTQ4156.54 aggregate',()=>{
  const h=harness(),html=h.finance.movimientos(),cards=kpis(html);
  const expense=cards.find(c=>c.label==='Egresos del mes');assert.equal(expense.val,'GTQ 4141.92 · USD 14.62');assert.equal(expense.foot,'— pagado');
  assert.doesNotMatch(html,/GTQ 4156\.54/);h.finance.drillModal('CxP','QA',fixture().finmovs);
  assert.match(h.nodes.get('fin-drill').innerHTML,/GTQ 4141\.92 · USD 14\.62/);assert.equal(h.writes,0);
});
test('company commission totals and invoice presentation use their original currencies',()=>{
  const data=fixture();data.facturas=[{id:'qa-inv-us',numero:'QA-USD',estado:'por_cobrar',pais:'GT',moneda:'USD',total:30}];
  const h=harness(data),html=h.finance.empresa(),cards=kpis(html);
  assert.equal(cards.find(c=>c.label==='Por cobrar').val,'GTQ 5182.25 · USD 18.28');
  assert.match(html,/USD 30\.00/);assert.doesNotMatch(html,/GTQ 5200\.53|GTQ 30\.00/);assert.equal(h.writes,0);
});
test('Dashboard renders independent native-currency sections including chart labels and totals',()=>{
  const h=harness(),html=h.finance.dashboard();
  const gt=html.match(/<section data-fin-currency="GTQ">([\s\S]*?)<\/section>/)[1],usd=html.match(/<section data-fin-currency="USD">([\s\S]*?)<\/section>/)[1];
  assert.equal(kpis(gt).find(c=>c.label==='Utilidad operativa').val,'GTQ -4141.92');assert.equal(kpis(usd).find(c=>c.label==='Utilidad operativa').val,'USD -14.62');
  assert.match(usd,/Egresos: USD 14\.62/);assert.doesNotMatch(usd,/GTQ/);assert.doesNotMatch(gt,/4156\.54/);assert.equal(h.writes,0);
});
test('commission overview and detail keep ordinary insurer amounts separate without changing payment state/actions',()=>{
  const h=harness(),host=h.node();h.Orbit.modules.comisiones.render(host);
  assert.equal(kpis(host.innerHTML).find(c=>c.label==='Comisión generada').val,'GTQ 5182.25 · USD 18.28');
  assert.doesNotMatch(host.innerHTML,/GTQ 5200\.53/);h.Orbit.modules.comisiones.detalle('asesorId','qa-alpha');
  assert.match(h.nodes.get('com-det').innerHTML,/GTQ 5143\.61 · USD 18\.28/);assert.equal(h.writes,0);
});
test('optional documented insurer rate renders its exact value or a dash, never an inferred or undefined percentage',()=>{
  for(const pct of [undefined,null,'',' ']){
    const data=fixture();data.comisiones[0].pct=pct;delete data.comisiones[0].base;data.comisiones[1].pct=17.5;
    const before=clone(data),h=harness(data);h.Orbit.modules.comisiones.detalle('asesorId','qa-alpha');
    const html=h.nodes.get('com-det').innerHTML;
    assert.match(html,/<td class="num">—<\/td>/);assert.match(html,/<td class="num">17\.5%<\/td>/);
    assert.doesNotMatch(html,/undefined%|null%|<td class="num">%<\/td>/);
    assert.match(html,/importe\(s\) sin moneda o valor verificado/,'missing premium remains unverified');
    h.finance.detLiq('asesorId','qa-alpha');const financeHtml=h.nodes.get('fin-detliq').innerHTML;
    assert.match(financeHtml,/<td class="num">—<\/td>/);assert.match(financeHtml,/<td class="num">17\.5%<\/td>/);
    assert.doesNotMatch(financeHtml,/undefined%|null%|<td class="num">%<\/td>/);
    assert.deepEqual(clone(data),before);assert.equal(h.writes,0);
  }
});
test('commission statement differences are recomputed by source currency instead of mixed engine totals',()=>{
  const h=harness(),host=h.node();h.Orbit.modules.comisiones.renderConciliacion(host);
  assert.equal(kpis(host.innerHTML).find(c=>c.label==='Registrada / pagada').val,'GTQ 5182.25 · USD 18.28');
  assert.equal(kpis(host.innerHTML).find(c=>c.label==='Desviación').val,'GTQ 2.00 · USD 1.00');assert.equal(h.writes,0);
});
test('precise native formatter preserves cents independently of the integer legacy UI formatter',()=>{
  const h=harness();assert.equal(h.Orbit.ui.money(14.62,'USD'),'USD 15');
  assert.equal(h.Orbit.q.financeMoneyText(14.62,'USD'),'USD 14.62');
  assert.equal(h.Orbit.q.financeMoneyText(4114.87,'GTQ'),'GTQ 4114.87');
  assert.match(h.Orbit.q.financeMoneyText(14.62,''),/no verificados/);
});
test('GTQ budget realized ignores USD, presents a separate warning and leaves planned rows and payment states unchanged',()=>{
  const data=fixture();data.presupuesto=[{id:'qa-budget',pais:'GT',periodo:'2026-11',categoria:'Comisiones asesores',monto:5000}];
  const before=clone(data),h=harness(data),html=h.finance.presupuesto(),cards=kpis(html);
  assert.equal(cards.find(c=>c.label==='Presupuesto').val,'GTQ 5000.00');
  assert.equal(cards.find(c=>c.label==='Ejecutado').val,'GTQ 4141.92');
  assert.equal(cards.find(c=>c.label==='Disponible').val,'GTQ 858.08');
  assert.match(html,/USD 14\.62/);assert.match(html,/no consumen el presupuesto GTQ/);
  assert.doesNotMatch(html,/4156\.54/);assert.deepEqual(data,before);assert.equal(h.writes,0);
});
test('budget payment badge requires actually paid GTQ expenses in that category, not a pending CxP commitment',()=>{
  const data=fixture();data.presupuesto=[{id:'qa-budget',pais:'GT',periodo:'2026-11',categoria:'Comisiones asesores',monto:4000}];
  const h=harness(data),before=clone(data),pendingHtml=h.finance.presupuesto();
  assert.equal(kpis(pendingHtml).find(c=>c.label==='Ejecutado').val,'GTQ 4141.92');
  assert.doesNotMatch(pendingHtml,/✅ pagado/);assert.deepEqual(data,before);
  data.finmovs[1].estado='pagado';data.finmovs[1].valor=5000;
  assert.doesNotMatch(h.finance.presupuesto(),/✅ pagado/,'USD payment cannot satisfy a GTQ budget');
  data.finmovs[0].estado='pagado';
  assert.match(h.finance.presupuesto(),/✅ pagado/,'verified paid GTQ amount can satisfy the GTQ budget');assert.equal(h.writes,0);
});
test('native AI sections and existing provider prompt never combine USD into GTQ or represent unpaid CxP as cash',async()=>{
  const data=fixture(),before=clone(data),h=harness(data),html=h.finance.ia();
  assert.match(html,/data-fin-ia-currency="GTQ"/);assert.match(html,/data-fin-ia-currency="USD"/);
  assert.equal((html.match(/id="fin-ia-regen"/g)||[]).length,1);
  const host=h.node();h.nodes.set('fin-ia-out',h.node());let prompt='';
  h.Orbit.ia={analisis:async text=>{prompt=text;return 'QA response';}};h.finance.wire(host);
  await host.querySelector('#fin-ia-regen').listeners.click();
  assert.match(prompt,/egresos registrados GTQ 4141\.92 · USD 14\.62/);
  assert.match(prompt,/egresos pagados —; compromisos pendientes GTQ 4141\.92 · USD 14\.62/);
  assert.match(prompt,/No sumes ni conviertas monedas ni equipares compromisos a salida de caja/);
  assert.doesNotMatch(prompt,/4156\.54/);assert.deepEqual(data,before);assert.equal(h.writes,0);
});
test('legacy invoice creation is guarded before any form or write when sources mix currencies or are foreign/unknown',()=>{
  for(const mode of ['mixed','USD','unknown']){const data=fixture();
    if(mode==='USD')data.comisiones=data.comisiones.filter(c=>c.moneda==='USD');
    if(mode==='unknown')data.comisiones=[{...data.comisiones[0],moneda:''}];
    const h=harness(data);h.Orbit.modules.finanzas.facturaAseg('qa-ins');
    assert.equal(h.nodes.has('fin-fac'),false);assert.match(h.toasts[0],/fuentes separadas por moneda/);assert.equal(h.writes,0);
  }
});
test('advisor CxP table and printable liquidation retain exact currencies/cents without changing payment state',()=>{
  const h=harness(),html=h.finance.asesores();assert.match(html,/GTQ 4114\.87/);assert.match(html,/USD 14\.62/);assert.match(html,/GTQ 27\.05/);
  h.Orbit.modules.finanzas.verLiquidacionAsesor('qa-alpha');
  const doc=h.nodes.get('fin-liquidacion-asesor').innerHTML;
  assert.match(doc,/GTQ 4114\.87 · USD 14\.62/);assert.match(doc,/no es comprobante de pago/);assert.equal(h.writes,0);
});
test('Direction accents/case and all privileged canonical labels expose source upload while advisor view stays scoped',()=>{
  for(const role of ['Dirección','Direccion','direccion','DIRECCIÓN','Admin','AdminTenant','admin_tenant','SuperAdmin','super_admin','Finanzas','finance']){
    const h=harness(fixture(),'TODOS');h.Orbit.session.rol=()=>role;
    assert.match(h.finance.asesores(),/Cargar liquidación documentada/,role);assert.equal(h.writes,0);
  }
  const h=harness();h.Orbit.session.rol=()=> 'Asesor';h.Orbit.auth.productUser={advisorId:'qa-alpha'};
  const html=h.finance.asesores();assert.doesNotMatch(html,/Cargar liquidación documentada|Asesor Beta/);assert.match(html,/Asesor Alfa/);assert.equal(h.writes,0);
});
