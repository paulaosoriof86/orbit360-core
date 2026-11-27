'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const repo=process.env.GI_RECEIPT_ORDINAL_REPO||path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(repo,'orbit360-platform/core/backend-lab-receipts-portfolio-native-bridge-v20260801.js'),'utf8');
const renderStart=source.indexOf('  function renderReceipts(cid){'),renderEnd=source.indexOf('\n  function patchCobros(cid){',renderStart);
assert.ok(renderStart>=0&&renderEnd>renderStart,'canonical receipt list renderer is required');
const ordinal=source.match(/  function receiptOrdinalLabel\(r\)\{[^\n]+\}/)?.[0];
assert.ok(ordinal,'the existing detail/editor ordinal owner is required');
const formattingStart=source.indexOf('  function esc(v){'),formattingEnd=source.indexOf('\n  function storeReady(){',formattingStart);
assert.ok(formattingStart>=0&&formattingEnd>formattingStart,'canonical display formatters are required');
const clone=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
function render(overrides){
 const receipts=overrides.map((extra,i)=>freeze({id:'qa-receipt-'+i,clienteId:'qa-client',polizaId:'qa-policy',moneda:'GTQ',
  fechaLimite:'2026-12-10',fechaVencimientoContractual:'2026-12-10',vence:'2026-12-10',monto:288.4,montoTotal:288.4,
  primaTotal:288.4,primaNeta:257.5,impuestosIVA:30.9,estado:'Pagado',...extra}));
 const policy=freeze({id:'qa-policy',clienteId:'qa-client',numero:'QA-POLICY',moneda:'GTQ',estado:'Vigente'});
 const client=freeze({id:'qa-client',moneda:'GTQ'}),before=clone(receipts),attrs={};
 const body={innerHTML:'',setAttribute:(k,v)=>{attrs[k]=v;},removeAttribute:k=>{delete attrs[k];},querySelector:()=>null};
 const records={polizas:[policy],clientes:[client],recibosEsperados:receipts,vehiculos:[]};
 const noWrite=()=>{throw Error('DISPLAY_MUST_NOT_WRITE');};
 const context={window:{},document:{getElementById:id=>id==='c360-body'?body:null},recFilter:{},
  clean:v=>String(v==null?'':v).trim(),num:v=>Number.isFinite(Number(v))?Number(v):0,
  numberOrNull:v=>v==null||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null,
  dueDate:r=>r.fechaLimite||r.fechaVencimientoContractual||'',activePolicy:()=>true,policyLabel:p=>p.numero,
  stateLabel:r=>({c:'ok',t:r.estado}),actionHtml:()=>'',wireReceiptRows:()=>{},
  portfolioSummary:()=>({futureByCurrency:{},dueByCurrency:{},historicalByCurrency:{},active:[],undated:[]}),
  Orbit:{q:{recibosEsperadosDe:()=>receipts,recibosHistoricosDe:()=>[],recibosRevisionDe:()=>[],carteraPrimasDe:()=>[]},
   store:{_productStatus:()=>({serverConfirmedCollections:['recibosEsperados','carteraPrimas']}),
    get:(name,id)=>(records[name]||[]).find(r=>r.id===id),where:(name,predicate)=>(records[name]||[]).filter(predicate),
    add:noWrite,update:noWrite,set:noWrite,remove:noWrite,save:noWrite}}};
 vm.runInNewContext(source.slice(formattingStart,formattingEnd)+'\n'+ordinal+'\n'+source.slice(renderStart,renderEnd)+
  '\nrenderReceipts("qa-client");',context,{timeout:1000});
 assert.deepEqual(clone(receipts),before,'render must preserve every canonical field, including amount, dates and official number');
 const cells=receipts.map(r=>{
  const row=body.innerHTML.match(new RegExp('<tr class="clickable" data-rp-receipt-id="'+r.id+'">([\\s\\S]*?)</tr>'));
  assert.ok(row,'the canonical receipt row must render');
  return [...row[1].matchAll(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/g)].map(m=>m[1]);
 });
 return {receipts,body,cells,attrs};
}
test('receipt list displays the existing installment when series and insurer number are absent',()=>{
 const out=render([{cuota:'1/10',secuencia:1}]);
 assert.equal(out.cells[0][2],'1/10');
 assert.equal(out.attrs['data-rp-receipt-count'],'1');
});
test('an official insurer number remains visible when it is the existing ordinal fallback',()=>{
 const out=render([{numeroReciboFuente:'REQ-QA-001'}]);
 assert.equal(out.cells[0][2],'REQ-QA-001');
 assert.equal(out.receipts[0].numeroReciboFuente,'REQ-QA-001');
});
test('list uses the existing detail owner precedence without replacing any source reference',()=>{
 const out=render([
  {serie:'SERIE-INTERNA',cuota:'1/10',numeroReciboFuente:'REQ-QA-002',secuencia:1},
  {cuota:'1/10',numeroReciboFuente:'REQ-QA-003',secuencia:1}
 ]);
 assert.equal(out.cells[0][2],'SERIE-INTERNA');
 assert.equal(out.cells[1][2],'1/10');
 assert.equal(out.receipts[0].numeroReciboFuente,'REQ-QA-002');
 assert.equal(out.receipts[1].numeroReciboFuente,'REQ-QA-003');
});
test('sequence and unknown numbering retain the established detail fallback semantics',()=>{
 const out=render([{secuencia:2},{}]);
 assert.equal(out.cells[0][2],'2');
 assert.equal(out.cells[1][2],'Numeración pendiente');
});
test('ordinal rendering preserves HTML escaping for an official source label',()=>{
 const out=render([{numeroReciboFuente:'REQ <QA> & "x"'}]);
 assert.equal(out.cells[0][2],'REQ &lt;QA&gt; &amp; &quot;x&quot;');
});
test('display-only ordinal correction leaves canonical amounts, taxes, dates and payment state unchanged',()=>{
 const out=render([{cuota:'1/10',secuencia:1,paymentState:'PAID_DIRECT',applicationState:'APPLIED_DIRECT'}]);
 assert.match(out.cells[0][5],/288\.40/);
 assert.equal(out.cells[0][3],'2026-12-10');assert.equal(out.cells[0][4],'2026-12-10');
 assert.equal(out.receipts[0].primaNeta,257.5);assert.equal(out.receipts[0].impuestosIVA,30.9);
 assert.equal(out.receipts[0].primaTotal,288.4);assert.equal(out.receipts[0].paymentState,'PAID_DIRECT');
 assert.equal(out.receipts[0].applicationState,'APPLIED_DIRECT');
 assert.equal(Object.hasOwn(out.receipts[0],'numeroReciboFuente'),false);
});
