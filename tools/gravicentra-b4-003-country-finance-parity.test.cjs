'use strict';
// B4-003 country/finance canonical parity. Executes the real browser modules
// before/after source change using synthetic GT/CO fixtures. NO network/writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const oldQuery=execFileSync('git',['show','55acae8c4c933bde47afb018be55e978d9b81cdd'],{encoding:'utf8'});
const oldCobros=execFileSync('git',['show','e47d5463fbd89e556b02aa2ab0f5388a88bad825'],{encoding:'utf8'});
const newQuery=fs.readFileSync('orbit360-platform/core/queries.js','utf8');
const newCobros=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
const {allowRow}=require('../functions/b4-003-scoped-access-boundary');
const ctx={tenantId:'t',scope:'all',country:'CO',collection:'cobros'};
assert.throws(()=>allowRow(ctx,{pais:'CO',tenantId:'t'},[{pais:'CO',tenantId:'t'},{pais:'GT',tenantId:'t'}]),e=>e.code==='COUNTRY_DENIED');
assert.equal(allowRow(ctx,{pais:'CO',tenantId:'t'},[{pais:'CO',tenantId:'t'}]),true);
function evaluate(query,finance,{country='CO',portfolio=true}={}){
 const clients=[{id:'gt',pais:'GT',nombre:'CLIENTE_GT'},{id:'co',pais:'CO',nombre:'CLIENTE_CO'}];
 const policies=[{id:'pCross',pais:'CO',clienteId:'gt',numero:'POL_GT',moneda:'COP'},{id:'pGood',pais:'CO',clienteId:'co',numero:'POL_CO',moneda:'COP'}];
 const cobros=[{id:'cbCross',polizaId:'pCross',clienteId:'gt',pais:'CO',moneda:'COP',estado:'Vencido',monto:700,vence:'2026-01-01'},{id:'cbGood',polizaId:'pGood',clienteId:'co',pais:'CO',moneda:'COP',estado:'Vencido',monto:500,vence:'2026-01-01'}];
 const cartera=portfolio?[{id:'carCross',polizaId:'pCross',clienteId:'gt',pais:'CO',moneda:'COP',estado:'Pendiente',monto:700,vence:'2026-01-01'},{id:'carGood',polizaId:'pGood',clienteId:'co',pais:'CO',moneda:'COP',estado:'Pendiente',monto:500,vence:'2026-01-01'}]:[];
 const data={clientes:clients,polizas:policies,cobros,carteraPrimas:cartera,recibosEsperados:[],vehiculos:[]};
 const U={finiteNumber:x=>Number.isFinite(Number(x))?Number(x):null,daysFromNow:()=>-20,esc:x=>String(x??''),money:(v,c)=>c+' '+v,moneyShort:(v,c)=>v+' '+c,fmtDate:x=>String(x||''),text:x=>String(x||''),today:()=>''};
 const store={all:k=>data[k]||[],get:(k,id)=>(data[k]||[]).find(x=>String(x.id)===String(id))||null,where:(k,f)=>(data[k]||[]).filter(f),find:(k,f)=>(data[k]||[]).find(f),_ensureCollections(){},_productStatus:()=>({serverConfirmedCollections:['clientes','polizas','cobros','recibosEsperados','carteraPrimas'],deniedCollections:[],snapshotErrors:{}})};
 const K={bannerFor:()=>'',kpis:cs=>cs.map(x=>x.label+':'+x.val).join(' | '),filterBar:()=>'',asesorOptions:()=>[],wireFilters(){},clienteCell:id=>'CLIENT_'+id};
 const Orbit={ui:U,store,kit:K,modules:{},pais:country,route:{params:{}},auth:{productUser:{uid:'u',tenantId:'t'},user(){return this.productUser;}},tenant:{get:()=>({tenantId:'t'})},session:{rol:()=>'Dirección',asesorId:()=>''}};
 const sandbox={window:{Orbit},Orbit,location:{hostname:'localhost'},document:{getElementById:()=>null},setTimeout(){},clearTimeout(){},console};
 vm.runInNewContext(query+';'+finance,sandbox);
 const host={innerHTML:'',querySelectorAll:()=>[]};
 Orbit.modules.cobros.render(host);
 const html=host.innerHTML;
 const encoded=html.match(/data-cobros-truth="([^"]*)"/)?.[1];
 const amounts=encoded?JSON.parse(decodeURIComponent(encoded)):{};
 return{hasGT:html.includes('data-row-client-id="gt"'),hasCO:html.includes('data-row-client-id="co"'),warning:html.includes('data-cobros-aging-universe-mismatch='),venc:amounts.COP?.venc??0,coRows:(html.match(/data-row-country="CO"/g)||[]).length};
}
const baseline=evaluate(oldQuery,oldCobros),fixed=evaluate(newQuery,newCobros);
assert.deepEqual(baseline,{hasGT:true,hasCO:true,warning:false,venc:1200,coRows:2},'BASELINE_GT_CO_MISMATCH_NOT_REPRODUCED');
assert.deepEqual(fixed,{hasGT:false,hasCO:true,warning:false,venc:500,coRows:1},'GT_ROW_OR_FINANCE_UNIVERSE_STILL_LEAKS');
const noPortfolio=evaluate(newQuery,newCobros,{portfolio:false});
assert.equal(noPortfolio.warning,true,'ZERO_AGING_WITH_VENCIDO_MUST_NOT_BE_SILENT');
assert.equal(noPortfolio.hasGT,false,'NO_PORTFOLIO_COUNTRY_LEAK');
const todo=evaluate(newQuery,newCobros,{country:'TODOS'});
assert.equal(todo.hasGT,false,'ALL_COUNTRIES_MUST_NOT_BYPASS_INVALID_COUNTRY_RELATION');
assert.equal(todo.hasCO,true,'VALID_CROSS_COUNTRY_GLOBAL_ROW_MUST_SURVIVE');
const map=new Map([['gt',{pais:'GT'}],['co',{pais:'CO'}]]);
const pol=new Map([['good',{id:'good',pais:'CO',clienteId:'co'}],['cross',{id:'cross',pais:'CO',clienteId:'gt'}]]);
const mockU={finiteNumber:x=>Number(x)||0};
const qOrbit={ui:mockU,store:{get:()=>null,all:()=>[]},pais:'CO'};
const qCtx={Orbit:qOrbit,window:{Orbit:qOrbit},Map};
vm.runInNewContext(newQuery,qCtx);
const country=qOrbit.q.policyLinkedCountry;
assert.equal(country({polizaId:'good',clienteId:'co',pais:'CO'},map,pol),'CO');
assert.equal(country({polizaId:'cross',clienteId:'gt',pais:'CO'},map,pol),'REQUIERE_VALIDACION');
assert.equal(country({polizaId:'good',clienteId:'gt',pais:'CO'},map,pol),'REQUIERE_VALIDACION');
assert.equal(country({polizaId:'missing',clienteId:'co',pais:'CO'},map,pol),'REQUIERE_VALIDACION');
assert.equal(country({polizaId:'good',clienteId:'missing',pais:'CO'},map,pol),'REQUIERE_VALIDACION');
// SIGA/CRM source provenance is not payment confirmation. Execute the actual
// confirmation helpers extracted from the changed production sources.
function qaFunction(source,name){
 const start=source.indexOf('function '+name+'(');
 assert.ok(start>=0,'QA_HELPER_PRESENT_'+name);
 const open=source.indexOf('{',start);let depth=0;
 for(let i=open;i<source.length;i++){
  const ch=source[i];
  if(ch==='{')depth++;
  else if(ch==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw new Error('QA_HELPER_UNCLOSED_'+name);
}
const textNorm=v=>String(v||'').trim().toLowerCase();
const receiptPaidQ=vm.runInNewContext('('+qaFunction(newQuery,'receiptHasAppliedPayment')+')',{textNorm});
const receiptPaidCobros=vm.runInNewContext('('+qaFunction(newCobros,'receiptHasAppliedPayment')+')',{});
const confirmedCobroWithNorm=vm.runInNewContext('('+qaFunction(newQuery,'confirmedCobro')+')',{textNorm});
const confirmedWrapper=row=>confirmedCobroWithNorm.call(null,row);
assert.equal(receiptPaidQ({origen:'SIGA',origenPago:'CRM'}),false,'SIGA_ORIGIN_ALONE_NOT_PAID_QUERIES');
assert.equal(receiptPaidCobros({origen:'SIGA',origenPago:'CRM'}),false,'SIGA_ORIGIN_ALONE_NOT_PAID_COBROS');
assert.equal(receiptPaidQ({estado:'Pagado',paymentState:'PAID_REPORTED'}),false,'REPORTED_NOT_PAID_QUERIES');
assert.equal(receiptPaidCobros({estado:'Pagado',paymentState:'PAID_INFERRED'}),false,'INFERRED_NOT_PAID_COBROS');
assert.equal(receiptPaidQ({paymentState:'PAID_DIRECT'}),true,'EXPLICIT_DIRECT_PAYMENT_COUNTS');
assert.equal(receiptPaidCobros({applicationState:'APPLIED_DIRECT'}),true,'EXPLICIT_APPLICATION_COUNTS');
assert.equal(confirmedWrapper({estado:'Pagado',paymentState:'PAID_REPORTED'}),false,'REPORTED_CANONICAL_ROW_DENIED');
assert.equal(confirmedWrapper({estado:'Pagado'}),true,'CANONICAL_PAID_STATE_COUNTS');
assert.ok(newQuery.includes('return receiptHasAppliedPayment(r);'),'REALIZED_ROWS_REQUIRE_EXPLICIT_RECEIPT_CONFIRMATION');
assert.ok(!newQuery.includes("receiptHasAppliedPayment(r) || paymentOriginKind(r) === 'CRM_DIRECT'"),'SIGA_ORIGIN_MUST_NOT_PROJECT_PAID');
console.log('GI_B4_003_SIGA_CONFIRMATION_SOURCE_TEST_PASS source_only_pending reported_inferred_rejected explicit_direct_and_applied_accepted');

console.log('GI_B4_003_COUNTRY_FINANCE_PARITY_SYNTHETIC_PASS checks=12 source=COBROS_AND_QUERIES no_network_no_writes',JSON.stringify({baseline,fixed,noPortfolio,todo}));
