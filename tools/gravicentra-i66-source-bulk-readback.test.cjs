'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const repo=process.env.I66_BULK_TEST_REPO||path.resolve(__dirname,'..');
const original=path.join(repo,'tools/gravicentra-i66-source-bulk-live.cjs');
const m=new Module(original,module);m.filename=original;m.paths=Module._nodeModulePaths(path.dirname(original));
m._compile(fs.readFileSync(path.join(__dirname,'gravicentra-i66-source-bulk-live.cjs'),'utf8'),original);
const diagnose=m.exports.paymentPortfolioHoldDiagnostics;
const select=m.exports.selectReadbackCase;
const row={caseId:'sample',policy:'91-4143471',insurer:'ROBLE',requirement:'5693797',due:'2026-11-21',grossCents:33437};
const hold={caseId:'sample',code:'PAYMENT_OR_PORTFOLIO_EXCEPTION'};
const fixture=()=>({policy:{id:'pol-a',numero:'91-4143471',vigenciaInicio:'2026-09-21',vigenciaFin:'2027-09-21'},
 receipts:[{id:'rec-3',numeroReciboFuente:'5693797',primaTotal:334.37,estado:'PAGADO',fechaPago:'2026-11-23',insuredName:'PRIVATE_NAME'}],
 portfolio:[{id:'car-3',reciboId:'rec-3',carteraActiva:true,primaTotal:334.37}],
 cobros:[{id:'cash-1',reciboId:'rec-1',monto:334.18},{id:'cash-2',reciboId:'rec-2',monto:334.37},
 {id:'cash-3',reciboId:'rec-3',monto:334.37,confirmado:true,sourceType:'DIRECT_PAYMENT',requestId:'audit-real'}]});
test('explains the third receipt payment without attributing the first two payments',()=>{
 const g=fixture(),before=JSON.stringify(g),out=diagnose([row],[g],[hold]);
 const r=out[0].editions[0].receipts[0];
 assert.equal(r.receiptId,'rec-3');assert.equal(r.status.paidByCanonicalPredicate,true);
 assert.equal(r.activePortfolioCount,1);assert.equal(r.cobroLinksCountedByPlanner,1);
 assert.deepEqual(r.cobros.map(c=>c.id),['cash-3']);assert.equal(r.cobros[0].amountsCents.monto,33437);
 assert.equal(r.cobros[0].auditReferences.requestId,'audit-real');assert.equal(out[0].writes,0);
 assert.equal(JSON.stringify(g),before);assert.ok(!JSON.stringify(out).includes('PRIVATE_NAME'));
});
test('separates duplicate or inactive portfolio from an actual payment',()=>{
 const g=fixture();g.receipts[0].estado='Pendiente';delete g.receipts[0].fechaPago;g.cobros=[];
 g.portfolio.push({id:'car-4',reciboId:'rec-3',carteraActiva:true},{id:'car-old',reciboId:'rec-3',carteraActiva:false});
 const r=diagnose([row],[g],[hold])[0].editions[0].receipts[0];
 assert.equal(r.status.paidByCanonicalPredicate,false);assert.equal(r.activePortfolioCount,2);assert.equal(r.cobros.length,0);
});
test('reports no unheld case and labels legacy receipt links separately',()=>{
 const g=fixture();g.cobros=[{id:'legacy-cash',reciboEsperadoId:'rec-3',monto:334.37}];
 assert.deepEqual(diagnose([row],[g],[{caseId:'sample',code:'RECEIPT_NOT_IDENTIFIED'}]),[]);
 const r=diagnose([row],[g],[hold])[0].editions[0].receipts[0];
 assert.equal(r.cobroLinksCountedByPlanner,0);assert.equal(r.cobros[0].reciboEsperadoId,'rec-3');
});
test('scoped readback admits the single exact existing source case and rejects a changed amount, identity or duplicate',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(repo,'artifacts/orbit360-recovery/source-batches/I6_6_SOURCE_BULK_20261120_MULTI_302.json')));
 const rows=manifest.rows,selected=select(rows,'ROBLE_NOV20_0043');
 assert.equal(selected.length,1);assert.equal(selected[0].requirement,'5693797');assert.equal(selected[0].grossCents,33437);
 assert.throws(()=>select(rows,'ROBLE_NOV20_0044'),/NOT_AUTHORIZED/);
 assert.throws(()=>select([...rows,selected[0]],'ROBLE_NOV20_0043'),/NOT_UNIQUE/);
 assert.throws(()=>select([{...selected[0],grossCents:33438}],'ROBLE_NOV20_0043'));
});
test('requested readback still returns snapshot flags after the existing hold has changed and never fabricates a HOLD',()=>{
 const g=fixture(),out=diagnose([row],[g],[],['sample']);
 assert.equal(out[0].code,'REQUESTED_CASE_READBACK');assert.equal(out[0].writes,0);
 assert.equal(out[0].editions[0].receipts[0].cobroLinksCountedByPlanner,1);
});
test('the real protected writer rejects a case-readback receipt even if it describes an eligible row',async()=>{
 const writer=require(path.join(repo,'tools/gravicentra-i66-source-bulk-apply.cjs'));
 const gate={environment:'gravicentra-live-data-writes',reviewerEvidence:true,
  repository:'paulaosoriof86/orbit360-core',ref:'refs/heads/recovery/fase-a-clean-20260831',
  project:'ays-orbit-360-lab',sourceManifestSha256:'a'.repeat(64)};
 const receipt={status:'BULK_SOURCE_CASE_READBACK_ONLY_NO_WRITES',readOnly:true,
  inputRows:1,readyCount:1,writes:0,chunks:[]};
 let accessed=false;
 await assert.rejects(writer.applyProtectedBatch({collection(){accessed=true;throw Error('WRITE_OR_READ_FORBIDDEN');}},receipt,gate),
  /ENVIRONMENT_OR_PLAN_NOT_APPROVED/);
 assert.equal(accessed,false);
});

const mapfre=require(path.join(repo,'tools/gravicentra-i66-financial-identity-readback.cjs'));
const hash=value=>require('node:crypto').createHash('sha256').update(value).digest('hex');
function mapfreFixture(){
 const binding=mapfre.mapfreBinding(),s=binding.preflight.scope;
 const name='PRIVATE FIXTURE HOLDER ONLY',nameHash=hash(name.replace(/ /g,''));
 binding.holder.sources.forEach(w=>{w.issuedPdfNormalizedHolderSha256=nameHash;});
 const wrap=(id,data)=>({id,exists:true,updateTime:{seconds:1,nanoseconds:2},data});
 const collections={polizas:[wrap(s.policyId,{numero:s.policyNumber,clienteId:s.clientId,aseguradoraId:s.insurerId,
  pais:'GT',moneda:'GTQ',vigenciaInicio:s.issuedTerm[0],vigenciaFin:s.issuedTerm[1]})],
  aseguradoras:[wrap(s.insurerId,{nombre:'MAPFRE Seguros'})],recibosEsperados:[],carteraPrimas:[],cobros:[]};
 for(const t of binding.preflight.twoCases){
  const common={polizaId:s.policyId,clienteId:s.clientId,aseguradoraId:s.insurerId,moneda:'GTQ',
   primaTotal:127.76,serie:t.installment+'/12',fechaLimite:t.historicalOnlyBaseline.dates.fechaLimite,
   numeroReciboFuente:t.receiptId,estadoOperativo:'futuro_pendiente'};
  collections.recibosEsperados.push(wrap(t.receiptId,{...common,primaNeta:79.62}));
  collections.carteraPrimas.push(wrap(t.portfolioId,{...common,reciboId:t.receiptId}));
 }
 for(const t of binding.preflight.preservedPayments){
  collections.recibosEsperados.push(wrap(t.receiptId,{polizaId:s.policyId,primaTotal:t.amountCents/100,estado:'Pagado'}));
  collections.cobros.push(wrap(t.cobroId,{polizaId:s.policyId,reciboId:t.receiptId,monto:t.amountCents/100,estado:'Pagado'}));
 }
 const snapshot={complete:true,collections,client:wrap(s.clientId,{nombre:name,pais:'GT'}),requests:[],observedAtUtc:'2026-11-24T00:00:00Z'};
 const originals=binding.preflight.originalDocumentPins.map(p=>({fileId:p.driveFileId,sha256:p.sha256,status:'ORIGINAL_BYTES_VERIFIED'}));
 return {binding,snapshot,originals};
}
const reviewMapfre=f=>mapfre.mapfreReview(f.binding,f.snapshot,f.originals);
test('MAPFRE fresh preflight preserves actual paid source classes, all money and nine existing payments',()=>{
 const f=mapfreFixture(),before=JSON.stringify(f),r=reviewMapfre(f);
 assert.equal(r.correctionEligibleCount,2);assert.equal(r.paymentWriteEligibleCount,0);assert.equal(r.writes,0);
 assert.deepEqual(r.targets.map(t=>t.sourceState),['COMMISSION_ANCHOR','PAID']);
 assert.equal(r.privatePreimages.filter(e=>e.collection==='cobros').length,9);
 assert.ok(r.targets.every(t=>t.matched.recibosEsperados.varianceCents===1&&t.matched.carteraPrimas.varianceCents===1));
 assert.equal(r.annualVarianceCents,3);assert.equal(r.maxApprovedGtqVarianceCents,5);
 assert.equal(JSON.stringify(f),before,'preflight never corrects source, money, dates or customer names');
 assert.ok(!JSON.stringify(r.holderEvidence).includes('PRIVATE FIXTURE'));
});
test('MAPFRE refuses originals, holder identity, country and duplicate policy edition defects independently',()=>{
 for(const mutate of [f=>f.originals[0].status='ORIGINAL_HTTP_HOLD',f=>f.snapshot.client.data.nombre='OTHER PERSON',
  f=>f.snapshot.client.data.pais='CO',f=>f.snapshot.collections.polizas[0].data.moneda='USD',
  f=>f.snapshot.collections.polizas.push({...f.snapshot.collections.polizas[0],id:'duplicate'})]){
  const f=mapfreFixture();mutate(f);const r=reviewMapfre(f);assert.equal(r.correctionEligibleCount,0);assert.ok(r.globalHolds.length);
 }
});
test('MAPFRE does not use a small amount variance to cross a paid, partial, reported, reversed or duplicate receipt',()=>{
 const patches=[{estado:'Pagado'},{fechaPagoReportada:'2026-10-01'},{applicationState:'APPLIED_DIRECT'},
  {partialPayment:true},{reversed:true},{primaTotal:127.70},{moneda:'USD'},{serie:'9/12'}];
 for(const patch of patches){const f=mapfreFixture();Object.assign(f.snapshot.collections.recibosEsperados[0].data,patch);
  const r=reviewMapfre(f);assert.equal(r.correctionEligibleCount,1);assert.ok(r.targets[0].localHolds.length);}
 const dup=mapfreFixture();dup.snapshot.collections.recibosEsperados.push({...dup.snapshot.collections.recibosEsperados[0],id:'duplicate-receipt'});
 assert.equal(reviewMapfre(dup).correctionEligibleCount,1);
});
test('MAPFRE current cobro or canonical request prevents another payment plan',()=>{
 for(const kind of ['cobro','request']){
  const f=mapfreFixture(),t=f.binding.preflight.twoCases[0];
  if(kind==='cobro')f.snapshot.collections.cobros.push({id:'existing',exists:true,data:{reciboId:t.receiptId,monto:127.77}});
  else f.snapshot.requests.push({id:t.pendingConditionalCanonicalCall.requestId,exists:true,data:{status:'committed'}});
  const r=reviewMapfre(f);assert.equal(r.correctionEligibleCount,1);assert.ok(r.targets[0].localHolds.includes('MAPFRE_EXISTING_PAYMENT_OR_REQUEST_REVIEW'));
 }
});
test('MAPFRE requires the nine current prior payments before any correction',()=>{
 const f=mapfreFixture();f.snapshot.collections.cobros.pop();
 const r=reviewMapfre(f);assert.equal(r.correctionEligibleCount,0);
 assert.ok(r.globalHolds.includes('MAPFRE_PRIOR_PAYMENT_PRESERVATION_REQUIRES_REVIEW'));
});
test('MAPFRE original access rejects changed bytes and failed media without exposing document bodies',async()=>{
 const binding=mapfre.mapfreBinding(),payload=Buffer.from('offline pinned original fixture');
 const mockBinding=JSON.parse(JSON.stringify(binding));
 mockBinding.preflight.originalDocumentPins.forEach(ref=>ref.sha256=hash(payload));
 const ok=await mapfre.mapfreOriginals(mockBinding,async()=>({ok:true,status:200,arrayBuffer:async()=>payload}),{});
 assert.ok(ok.every(x=>x.status==='ORIGINAL_BYTES_VERIFIED'));
 const changed=await mapfre.mapfreOriginals(mockBinding,async()=>({ok:true,status:200,arrayBuffer:async()=>Buffer.from('changed')}),{});
 assert.ok(changed.every(x=>x.status==='ORIGINAL_DIGEST_HOLD'));
 const failed=await mapfre.mapfreOriginals(mockBinding,async()=>({ok:false,status:403}),{});
 assert.ok(failed.every(x=>x.status==='ORIGINAL_HTTP_HOLD'));
 assert.ok(!JSON.stringify(ok).includes(payload.toString()));
});
