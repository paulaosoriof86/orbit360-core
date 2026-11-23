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
