'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=process.env.GI_COBRO_BREAKDOWN_REPO||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(repo,'orbit360-platform/modules/cobros.js'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
const finite=v=>v===null||v===undefined||typeof v==='boolean'||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
function render(options={}){
 const c=freeze({id:'qa-cobro',clienteId:'qa-client',polizaId:'qa-policy',reciboId:'qa-receipt',monto:288.4,moneda:'GTQ',
  cuota:'1/10',vence:'2026-12-10',estado:'Pagado',conciliado:true,paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT',...options.cobro});
 const p=freeze({id:'qa-policy',clienteId:'qa-client',moneda:'GTQ',pais:'GT',numero:'QA-POLICY',...options.policy});
 const r=options.noReceipt?null:freeze({id:'qa-receipt',clienteId:'qa-client',polizaId:'qa-policy',moneda:'GTQ',pais:'GT',
  monto:288.4,montoTotal:288.4,primaTotal:288.4,neta:257.5,primaNeta:257.5,iva:30.9,impuestosIVA:30.9,
  gastosEmision:0,gastosExpedicion:0,gastosFinan:0,gastosFinanciamiento:0,otros:0,...options.receipt});
 const client=freeze({id:'qa-client',pais:'GT',nombre:'Cliente sintético'}),records={cobros:[c],polizas:[p],clientes:[client],recibosEsperados:r?[r]:[]};
 const before=copy(records),reads=[],nodes=new Map(),noWrite=()=>{throw Error('PRESENTATION_MUST_NOT_WRITE_OR_SCAN');};
 class Element{
  constructor(){this.style={};this.children=new Map();}
  set innerHTML(value){this.html=value;for(const m of value.matchAll(/\bid="([^"]+)"/g))this.children.set('#'+m[1],{addEventListener(){}});}
  get innerHTML(){return this.html||'';}
  querySelector(sel){return this.children.get(sel)||null;}
  addEventListener(){}
  remove(){nodes.delete(this.id);}
 }
 const document={getElementById:id=>nodes.get(id)||null,createElement:()=>new Element(),body:{appendChild:node=>nodes.set(node.id,node)}};
 const Orbit={modules:{},ui:{finiteNumber:finite,esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
   text:(v,fb)=>v==null||String(v).trim()===''?fb??'—':String(v),money:(v,cur)=>(cur==='USD'?'US$':'Q')+' '+Math.round(Number(v)),fmtDate:v=>String(v||'—'),toast:noWrite},
  q:{aseguradora:()=>null,asesor:()=>null},kit:{},session:{rol:()=>'Operativo'},
  termino:k=>({prima_neta:'Prima neta',recibo:'Recibo'}[k]||k),
  store:{get:(name,id)=>{reads.push([name,id]);return(records[name]||[]).find(row=>row.id===id)||null;},all:noWrite,where:noWrite,
   add:noWrite,update:noWrite,set:noWrite,remove:noWrite,save:noWrite},reconciliationDomain:{applyPayment:noWrite,reconcilePayment:noWrite}};
 const sandbox={Orbit,window:{Orbit},document,location:{hostname:'synthetic.invalid'},console};
 vm.runInNewContext(source,sandbox,{timeout:1000});
 Orbit.modules.cobros.detalle(c.id);
 const html=nodes.get('cob-det')?.innerHTML;assert.ok(html,'actual cobro detail must render');
 assert.deepEqual(copy(records),before,'display must preserve every receipt, payment and policy field');
 const table=html.match(/<table class="vp-dtbl">([\s\S]*?)<\/table>/);assert.ok(table,'actual breakdown table must render');
 const values=Object.fromEntries([...table[1].matchAll(/<tr[^>]*><td>(.*?)<\/td><td class="num">([\s\S]*?)<\/td><\/tr>/g)].map(m=>[m[1],m[2]]));
 return{values,html,reads,c,r};
}
test('exact linked receipt supplies missing net premium and tax without changing the paid record',()=>{
 const x=render();assert.equal(x.values['Prima neta'],'Q 257.50');assert.equal(x.values.IVA,'Q 30.90');
 assert.equal(x.values['Total del recibo'],'Q 288.40');assert.equal(Object.hasOwn(x.c,'neta'),false);assert.equal(Object.hasOwn(x.c,'iva'),false);
 assert.ok(x.reads.some(([name,id])=>name==='recibosEsperados'&&id==='qa-receipt'));
});
test('canonical receipt aliases work when legacy component fields are absent',()=>{
 const x=render({receipt:{neta:undefined,iva:undefined,gastosEmision:undefined,gastosFinan:undefined,
  gastosExpedicion:5.25,gastosFinanciamiento:2.75}});
 assert.equal(x.values['Prima neta'],'Q 257.50');assert.equal(x.values.IVA,'Q 30.90');
 assert.equal(x.values['Gastos de expedición'],'Q 5.25');assert.equal(x.values['Gastos financieros'],'Q 2.75');
});
test('absent components remain unknown rather than total-as-net or invented zero tax',()=>{
 const x=render({receipt:{neta:undefined,primaNeta:undefined,iva:undefined,impuestosIVA:undefined,gastosEmision:undefined,
  gastosExpedicion:undefined,gastosFinan:undefined,gastosFinanciamiento:undefined,otros:undefined}});
 for(const label of ['Prima neta','IVA','Gastos de expedición','Gastos financieros','Otros / asistencias'])assert.match(x.values[label],/No informado/);
 assert.equal(x.values['Total del recibo'],'Q 288.40');
});
test('explicit component values and explicit zeros already on a cobro retain priority',()=>{
 const x=render({cobro:{neta:200.25,iva:0,gastosEmision:0,gastosFinan:1.25,otros:0}});
 assert.equal(x.values['Prima neta'],'Q 200.25');assert.equal(x.values.IVA,'Q 0.00');
 assert.equal(x.values['Gastos financieros'],'Q 1.25');assert.equal(x.values['Otros / asistencias'],'Q 0.00');
});
test('missing or conflicting receipt IDs cannot trigger a guessed lookup',()=>{
 for(const cobro of [{reciboId:'',receiptId:''},{reciboId:'qa-missing'},{receiptId:'qa-other'}]){
  const x=render({cobro});assert.match(x.values['Prima neta'],/No informado/);assert.match(x.values.IVA,/No informado/);
 }
});
test('crossed receipt policy or client and mismatched policy client cannot provide a breakdown',()=>{
 for(const options of [{receipt:{polizaId:'qa-other-policy'}},{receipt:{clienteId:'qa-other-client'}},{policy:{clienteId:'qa-other-client'}}]){
  const x=render(options);assert.match(x.values['Prima neta'],/No informado/);assert.match(x.values.IVA,/No informado/);
 }
});
test('foreign currency or different receipt amount is not presented as this payment breakdown',()=>{
 for(const options of [{receipt:{moneda:'USD'}},{policy:{moneda:'USD'}},{receipt:{primaTotal:300,montoTotal:300,monto:300}},{cobro:{monto:100}}]){
  const x=render(options);assert.match(x.values['Prima neta'],/No informado/);assert.match(x.values.IVA,/No informado/);
 }
});
test('no accessible linked receipt means no fabricated breakdown and no unscoped collection scan',()=>{
 const x=render({noReceipt:true});assert.match(x.values['Prima neta'],/No informado/);assert.match(x.values.IVA,/No informado/);
 assert.equal(x.values['Total del recibo'],'Q 288.40');
});
test('invalid numeric component values are unknown while explicit string zero remains zero',()=>{
 const x=render({noReceipt:true,cobro:{neta:'',iva:false,gastosEmision:'invalid',gastosFinan:Infinity,otros:'0'}});
 for(const label of ['Prima neta','IVA','Gastos de expedición','Gastos financieros'])assert.match(x.values[label],/No informado/);
 assert.equal(x.values['Otros / asistencias'],'Q 0.00');
});
test('receiptId alias follows the same exact read-only binding and preserves all payment facts',()=>{
 const x=render({cobro:{reciboId:undefined,receiptId:'qa-receipt',paidDate:'',applicationDate:'',invoiceNumber:'QA-INVOICE',invoiceDate:'2026-12-01'}});
 assert.equal(x.values['Prima neta'],'Q 257.50');assert.equal(x.c.monto,288.4);assert.equal(x.c.invoiceNumber,'QA-INVOICE');
 assert.equal(x.c.paidDate,'');assert.equal(x.c.applicationDate,'');assert.equal(x.c.paymentState,'PAID_DIRECT');
});
