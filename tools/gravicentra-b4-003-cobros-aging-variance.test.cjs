'use strict';
// I6.5 B4-003: detects the UAT6 CO/TODOS overdue display gap using only
// in-memory synthetic data. No Firebase/network, no QA write, no inference.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const BASE='6b3892ab83ef7974fbae20e0b1ee15b32d62f08f';
const before=execFileSync('git',['show',BASE],{encoding:'utf8'});
const after=fs.readFileSync('orbit360-platform/modules/cobros.js','utf8');
function render(src,{portfolio=true,copOverdue=0,country='TODOS',financialReady=true}={}){
 const policies=[{id:'pCO',pais:'CO',clienteId:'clientCO',moneda:'COP',numero:'QA-CO'}];
 const clients=[{id:'clientCO',pais:'CO',nombre:'Synthetic client'}];
 const car=portfolio?Array.from({length:3},(_,i)=>({id:'car'+i,reciboId:'rec'+i,clienteId:'clientCO',polizaId:'pCO',pais:'CO',moneda:'COP',monto:100,estado:'Pagado',estadoOperativo:'pendiente_vencido',vence:'2026-01-01'})):[];
 const rec=car.map((c,i)=>({id:'rec'+i,clienteId:c.clienteId,polizaId:c.polizaId,pais:'CO',moneda:'COP',estado:'Pendiente',estadoOperativo:'pendiente_vencido',monto:100}));
 const cob=portfolio?[]:Array.from({length:3},(_,i)=>({id:'direct'+i,clienteId:'clientCO',polizaId:'pCO',pais:'CO',moneda:'COP',estado:'Vencido',monto:100,vence:'2026-01-01'}));
 const rows={clientes:clients,polizas:policies,cobros:cob,carteraPrimas:car,recibosEsperados:rec,vehiculos:[]};
 const confirmed=financialReady?['clientes','polizas','cobros','carteraPrimas','recibosEsperados']:['clientes','polizas','cobros'];
 const S={_ensureCollections(){},_productStatus:()=>({serverConfirmedCollections:confirmed,deniedCollections:[],snapshotErrors:{}}),all:k=>rows[k]||[],get:(k,id)=>(rows[k]||[]).find(v=>v.id===id)||null};
 const U={esc:x=>String(x??''),money:(n,cur)=>cur+' '+n,moneyShort:(n,cur)=>cur+' '+n,finiteNumber:n=>Number.isFinite(Number(n))?Number(n):null,text:x=>String(x??''),fmtDate:x=>String(x??''),today:()=>''};
 const K={bannerFor:()=>'',kpis:xs=>xs.map(x=>x.val).join(' | '),filterBar:()=>'',asesorOptions:()=>[],wireFilters(){},clienteCell:()=>''};
 const q={policyLinkedCountry:r=>r?.pais||'',carteraGlobalPorMoneda:()=>({byCurrency:{GTQ:{venc:10098,alDia:0,pend:0},COP:{venc:copOverdue,alDia:0,pend:0}},currencies:['GTQ','COP'],porConciliarCount:0,confirmedCount:0,reconciledCount:0,country}),agingVencidoPorMoneda:()=>({byCurrency:{},currencies:[],country})};
 const Orbit={modules:{},store:S,ui:U,kit:K,q,pais:country,auth:{productUser:{uid:'u',tenantId:'t'},user(){return this.productUser}},tenant:{get:()=>({tenantId:'t'})},session:{rol:()=>'Operativo',asesorId:()=>'advisor'},route:{params:{}}};
 vm.runInNewContext(src,{window:{Orbit},Orbit,document:{getElementById:()=>null},location:{hostname:'localhost'},navigator:{},setTimeout(){},clearTimeout(){},console},{filename:'cobros.js'});
 const host={innerHTML:'',querySelectorAll:()=>[]};Orbit.modules.cobros.render(host);
 const html=host.innerHTML,warning=html.match(/data-cobros-aging-universe-mismatch="(\d+)"/);
 return {warning:!!warning,count:warning?Number(warning[1]):0,currencies:html.match(/data-cobros-aging-mismatch-currencies="([^"]*)"/)?.[1]||'',projectionRows:(html.match(/data-portfolio-receipt=/g)||[]).length,financialState:html.match(/data-cobros-financial-readiness="([^"]*)"/)?.[1]};
}
const previous=render(before),fixed=render(after),co=render(after,{country:'CO'}),positive=render(after,{copOverdue:1500}),other=render(after,{country:'GT'}),direct=render(after,{portfolio:false}),pending=render(after,{financialReady:false});
assert.equal(previous.projectionRows,3);
assert.equal(previous.warning,false,'BASELINE_DISCRIMINANT_MISSING');
assert.equal(fixed.projectionRows,3);
assert.equal(fixed.warning,true,'PROJECTED_OVERDUE_WAS_NOT_INCLUDED');
assert.equal(fixed.count,3);
assert.equal(fixed.currencies,'COP','GTQ_AMOUNT_CANNOT_MASK_COP_OVERDUE_VARIANCE');
assert.equal(co.warning,true,'COUNTRY_CO_VARIANCE_VISIBLE');
assert.equal(positive.warning,false,'REAL_COP_CARTEIRA_AMOUNT_MUST_NOT_WARN');
assert.equal(other.warning,false,'COUNTRY_GT_MUST_NOT_DISPLAY_CO_ROWS');
assert.equal(direct.warning,true,'DIRECT_OVERDUE_COBROS_COUNTED');
assert.equal(direct.count,3);
assert.equal(pending.warning,false,'PENDING_FINANCE_MUST_NOT_ASSERT_VARIANCE');
assert.equal(pending.financialState,'pending');
console.log('GI_B4_003_COBROS_AGING_VARIANCE_SYNTHETIC_PASS checks=12 no_network no_business_writes '+JSON.stringify({previous,fixed,co,positive,other,direct,pending}));
